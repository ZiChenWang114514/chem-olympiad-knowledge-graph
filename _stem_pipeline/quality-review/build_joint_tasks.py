from __future__ import annotations

import csv
import json
import re
import shutil
import sqlite3
from pathlib import Path
from typing import Any


SITE_ROOT = Path(r"D:\打工2\projects\化学竞赛知识图谱-public")
PRIVATE_ROOT = Path(r"D:\打工2\projects\化学竞赛知识图谱")
QUESTION_ROOT = Path(r"D:\打工2\CChO__逐题拆分工作区_20260808")
STEM_ROOT = SITE_ROOT / "public" / "data" / "stems"
WORK_ROOT = SITE_ROOT / "_stem_pipeline" / "quality-review"
DATABASE = PRIVATE_ROOT / "database" / "knowledge.sqlite"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_question_number(value: object) -> str:
    text = str(value or "").strip().upper()
    text = re.sub(r"^(?:Q|第)", "", text)
    text = re.sub(r"题$", "", text)
    match = re.search(r"\d+", text)
    return str(int(match.group())) if match else text


def normalize_source_name(value: object) -> str:
    text = Path(str(value or "")).stem.lower().replace("（", "(").replace("）", ")")
    return re.sub(r"\s+", "", text)


def stage_name(value: str) -> str:
    return {"初赛": "preliminary", "决赛": "final"}.get(value, value)


def choose_row(stem: dict[str, Any], rows: list[dict[str, str]], used: set[str]) -> dict[str, str]:
    candidates = [
        row for row in rows
        if int(row["year"]) == int(stem.get("examYear") or 0)
        and stage_name(row["stage"]) == stem.get("examStage")
        and normalize_question_number(row["question_number"]) == normalize_question_number(stem.get("number"))
        and row["markdown"] not in used
    ]
    source_name = normalize_source_name(stem.get("source", {}).get("sourceLabel"))
    exact = [row for row in candidates if normalize_source_name(row["original_pdf"]) == source_name or normalize_source_name(row["exam"]) == source_name]
    if len(exact) == 1:
        return exact[0]
    if len(candidates) == 1:
        return candidates[0]
    raise RuntimeError(f"无法唯一匹配 {stem['problemId']}: {[(r['exam'], r['question_number']) for r in candidates]}")


def image_paths(markdown: Path, refs: str) -> list[Path]:
    result: list[Path] = []
    for item in refs.split(";"):
        clean = item.strip().split()[0].strip("<>") if item.strip() else ""
        if clean and not clean.startswith(("http://", "https://", "data:")):
            path = (markdown.parent / clean).resolve()
            if not path.is_file():
                raise FileNotFoundError(path)
            result.append(path)
    return result


def load_graph() -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    nodes = {row["id"]: dict(row) for row in connection.execute("SELECT * FROM knowledge_node")}
    edges = [dict(row) for row in connection.execute("SELECT * FROM knowledge_edge")]
    result: dict[str, list[dict[str, Any]]] = {}
    for row in connection.execute("SELECT * FROM problem_mapping ORDER BY target_id,id"):
        item = dict(row)
        item["knowledgeNode"] = nodes.get(item["knowledge_node_id"])
        related_ids = {item["knowledge_node_id"]}
        item["relatedEdges"] = [edge for edge in edges if edge["source_node_id"] in related_ids or edge["target_node_id"] in related_ids]
        result.setdefault(item["target_id"], []).append(item)
    taxonomy = list(nodes.values())
    connection.close()
    return result, taxonomy


def format_findings(stem: dict[str, Any]) -> list[str]:
    raw = json.dumps(stem, ensure_ascii=False)
    findings: list[str] = []
    if "?" in raw:
        findings.append("unexplained_ascii_question_mark")
    if re.search(r"(?<!\d)\d(?:\s+\d){2,}(?:\s*\.\s*\d+)?", raw):
        findings.append("split_number")
    if "\\normalfont" in raw or "\\begin{array}" in raw:
        findings.append("unnecessary_latex_structure")
    if re.search(r"[⼀-⿕]", raw):
        findings.append("compatibility_radical")
    blocks = stem.get("blocks") or []
    if any(block.get("type") == "paragraph" and re.search(r"(?:^|\s)\d+-\d+(?:\s|$)", block.get("text", "")) for block in blocks):
        findings.append("subparts_embedded_in_paragraph")
    figures = [block for block in blocks if block.get("type") == "figure"]
    if figures and all(block.get("type") == "figure" for block in blocks[-len(figures):]):
        findings.append("figures_grouped_at_end")
    if any("题目配图第" in block.get("alt", "") for block in figures):
        findings.append("generic_figure_alt")
    if not stem.get("source", {}).get("page"):
        findings.append("missing_source_page")
    return findings


def candidate_references(row: dict[str, str]) -> list[str]:
    year = row["year"]
    stage_word = "初赛" if row["stage"] == "初赛" else "决赛"
    roots = Path(r"D:\打工2\初赛&决赛")
    matches: list[str] = []
    for path in roots.rglob("*.pdf"):
        name = path.name
        if year in name and stage_word in str(path) and any(token in name for token in ("grading", "guide", "答案", "评分")):
            if path.resolve() != Path(row["original_pdf"]).resolve():
                matches.append(str(path.resolve()))
    return sorted(set(matches))


def source_metadata_paths(row: dict[str, str]) -> tuple[Path, Path]:
    source_dir = Path(row["source_full_md"]).parent
    content_candidates = sorted(source_dir.glob("*_content_list.json"))
    if not content_candidates:
        content_candidates = sorted(source_dir.glob("*content_list*.json"))
    if not content_candidates:
        raise FileNotFoundError(f"缺少内容列表: {source_dir}")
    layout = source_dir / "layout.json"
    if not layout.is_file():
        raise FileNotFoundError(layout)
    safe_dir = WORK_ROOT / "inputs" / "source-metadata"
    safe_dir.mkdir(parents=True, exist_ok=True)
    safe_content = safe_dir / f"{row['exam']}-content-list.json"
    safe_layout = safe_dir / f"{row['exam']}-layout.json"
    if not safe_content.exists():
        shutil.copyfile(content_candidates[0], safe_content)
    if not safe_layout.exists():
        shutil.copyfile(layout, safe_layout)
    return safe_content, safe_layout


def main() -> None:
    with (QUESTION_ROOT / "index.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    stem_paths = sorted(STEM_ROOT.glob("problem-*.json"))
    if len(rows) != 457 or len(stem_paths) != 457:
        raise RuntimeError(f"题目数量异常: index={len(rows)} stems={len(stem_paths)}")
    mappings, taxonomy = load_graph()
    used: set[str] = set()
    tasks: list[dict[str, Any]] = []
    safe_asset_root = WORK_ROOT / "inputs" / "assets"
    safe_asset_root.mkdir(parents=True, exist_ok=True)
    for stem_path in stem_paths:
        stem = read_json(stem_path)
        row = choose_row(stem, rows, used)
        used.add(row["markdown"])
        markdown = Path(row["markdown"])
        safe_images: list[str] = []
        for index, source in enumerate(image_paths(markdown, row["image_refs"]), 1):
            destination = safe_asset_root / f"{stem['problemId']}-source-figure-{index:03d}{source.suffix.lower()}"
            if not destination.exists() or destination.stat().st_size != source.stat().st_size:
                shutil.copyfile(source, destination)
            safe_images.append(str(destination.resolve()))
        current_mappings = mappings.get(stem["problemId"], [])
        markdown_text = markdown.read_text(encoding="utf-8")
        subparts = len(set(re.findall(r"(?m)(?:^|\s)(\d+[.\-]\d+(?:[.\-]\d+)*)", markdown_text)))
        formula_count = markdown_text.count("$") // 2 + markdown_text.count("\\ce{")
        findings = format_findings(stem)
        content_list, layout = source_metadata_paths(row)
        pages = sorted({int(value) + 1 for value in re.findall(r'"page_idx"\s*:\s*(\d+)', content_list.read_text(encoding="utf-8"))})
        cross_page = 1 if len(pages) > 1 else 0
        weight = 1 + len(safe_images) + subparts + min(formula_count, 10) + len(current_mappings) + len(findings) * 2 + cross_page * 3
        tasks.append({
            "problemId": stem["problemId"], "year": int(row["year"]), "stage": stage_name(row["stage"]),
            "exam": row["exam"], "questionNumber": row["question_number"], "currentStem": str(stem_path.resolve()),
            "markdown": str(markdown.resolve()), "sourceFullMarkdown": str(Path(row["source_full_md"]).resolve()),
            "contentList": str(content_list.resolve()),
            "layout": str(layout.resolve()),
            "originalPdf": str(Path(row["original_pdf"]).resolve()),
            "originalPdfPages": int(row["original_pdf_pages"]) if row["original_pdf_pages"].strip().isdigit() else None,
            "images": safe_images, "referenceMaterials": candidate_references(row), "currentMappings": current_mappings,
            "detectedFormatIssues": findings, "estimatedSubparts": subparts, "estimatedFormulaCount": formula_count,
            "weight": weight,
        })
    bins = [{"id": i, "weight": 0, "tasks": []} for i in range(1, 4)]
    for task in sorted(tasks, key=lambda item: (-item["weight"], item["problemId"])):
        target = min(bins, key=lambda item: (item["weight"], len(item["tasks"]), item["id"]))
        target["tasks"].append(task)
        target["weight"] += task["weight"]
    taxonomy_path = WORK_ROOT / "taxonomy-snapshot.json"
    taxonomy_path.write_text(json.dumps({"disciplines": ["无机", "有机", "物理", "分析", "结构", "实验"], "nodes": taxonomy}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary: dict[str, Any] = {"totalQuestions": len(tasks), "totalImages": sum(len(t["images"]) for t in tasks), "executors": []}
    for group in bins:
        root = WORK_ROOT / f"executor-{group['id']:02d}"
        output = root / "output"
        for name in ("stems", "graph-patches", "audit", "assets"):
            (output / name).mkdir(parents=True, exist_ok=True)
        prepared = []
        for task in sorted(group["tasks"], key=lambda item: item["problemId"]):
            item = dict(task)
            item.pop("weight")
            pid = item["problemId"]
            item.update({
                "outputStem": str((output / "stems" / f"{pid}.json").resolve()),
                "outputGraphPatch": str((output / "graph-patches" / f"{pid}.json").resolve()),
                "outputAudit": str((output / "audit" / f"{pid}.json").resolve()),
                "outputAssets": str((output / "assets").resolve()),
            })
            prepared.append(item)
        (root / "tasks.json").write_text(json.dumps(prepared, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        summary["executors"].append({"id": f"{group['id']:02d}", "questions": len(prepared), "images": sum(len(t["images"]) for t in prepared), "weight": group["weight"]})
    (WORK_ROOT / "assignment-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
