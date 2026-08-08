from __future__ import annotations

import csv
import json
import re
from pathlib import Path


SITE_ROOT = Path(r"D:\打工2\projects\化学竞赛知识图谱-public")
QUESTION_ROOT = Path(r"D:\打工2\CChO__逐题拆分工作区_20260808")
STEM_ROOT = SITE_ROOT / "public" / "data" / "stems"
WORK_ROOT = SITE_ROOT / "_stem_pipeline" / "executor-work"


def normalize_question_number(value: object) -> str:
    text = str(value or "").strip().upper()
    text = re.sub(r"^(?:Q|第)", "", text)
    text = re.sub(r"题$", "", text)
    match = re.search(r"\d+", text)
    return str(int(match.group())) if match else text


def normalize_source_name(value: object) -> str:
    text = Path(str(value or "")).stem.lower()
    text = text.replace("（", "(").replace("）", ")")
    text = re.sub(r"\s+", "", text)
    for suffix in ("答案及评分细则", "试题答案", "资料"):
        text = text.replace(suffix, "")
    return text


def stage_name(value: str) -> str:
    return {"初赛": "preliminary", "决赛": "final"}.get(value, value)


def source_images(markdown_path: Path, image_refs: str) -> list[str]:
    refs = [item.strip() for item in image_refs.split(";") if item.strip()]
    images: list[str] = []
    for ref in refs:
        clean = ref.strip().split()[0].strip("<>")
        if clean.startswith(("http://", "https://", "data:")):
            continue
        image_path = (markdown_path.parent / clean).resolve()
        if not image_path.is_file():
            raise FileNotFoundError(f"题目图片不存在：{image_path}")
        images.append(str(image_path))
    return images


def load_rows() -> list[dict[str, str]]:
    with (QUESTION_ROOT / "index.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def choose_row(stem: dict, rows: list[dict[str, str]], used_markdown: set[str]) -> dict[str, str]:
    source_name = normalize_source_name(stem.get("source", {}).get("sourceLabel"))
    candidates = [
        row
        for row in rows
        if int(row["year"]) == int(stem.get("examYear") or 0)
        and stage_name(row["stage"]) == stem.get("examStage")
        and normalize_question_number(row["question_number"]) == normalize_question_number(stem.get("number"))
        and row["markdown"] not in used_markdown
    ]
    exact = [
        row
        for row in candidates
        if normalize_source_name(row["original_pdf"]) == source_name
        or normalize_source_name(row["exam"]) == source_name
    ]
    if len(exact) == 1:
        return exact[0]
    if len(candidates) == 1:
        return candidates[0]
    detail = [(row["exam"], row["question_number"]) for row in candidates]
    raise RuntimeError(f"无法唯一匹配 {stem['problemId']}：{detail}")


def main() -> None:
    rows = load_rows()
    stem_paths = sorted(STEM_ROOT.glob("problem-*.json"))
    if len(rows) != 457 or len(stem_paths) != 457:
        raise RuntimeError(f"题目数量异常：index={len(rows)} stems={len(stem_paths)}")

    used_markdown: set[str] = set()
    tasks: list[dict] = []
    for stem_path in stem_paths:
        stem = json.loads(stem_path.read_text(encoding="utf-8"))
        row = choose_row(stem, rows, used_markdown)
        used_markdown.add(row["markdown"])
        markdown_path = Path(row["markdown"])
        images = source_images(markdown_path, row["image_refs"])
        tasks.append(
            {
                "problemId": stem["problemId"],
                "year": int(row["year"]),
                "stage": stage_name(row["stage"]),
                "exam": row["exam"],
                "questionNumber": row["question_number"],
                "currentStem": str(stem_path.resolve()),
                "markdown": str(markdown_path.resolve()),
                "images": images,
                "weight": 1 + len(images),
            }
        )

    if len(used_markdown) != 457:
        raise RuntimeError(f"Markdown 映射数量异常：{len(used_markdown)}")

    bins = [{"id": index, "weight": 0, "tasks": []} for index in range(1, 4)]
    for task in sorted(tasks, key=lambda item: (-item["weight"], item["problemId"])):
        target = min(bins, key=lambda item: (item["weight"], len(item["tasks"]), item["id"]))
        target["tasks"].append(task)
        target["weight"] += task["weight"]

    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    summary = {"totalQuestions": len(tasks), "totalImages": sum(len(item["images"]) for item in tasks), "executors": []}
    for group in bins:
        executor_root = WORK_ROOT / f"{group['id']:02d}"
        output_root = executor_root / "output"
        for name in ("stems", "assets", "latex"):
            (output_root / name).mkdir(parents=True, exist_ok=True)
        prepared: list[dict] = []
        for task in sorted(group["tasks"], key=lambda item: item["problemId"]):
            item = dict(task)
            item.pop("weight")
            item["outputStem"] = str((output_root / "stems" / f"{item['problemId']}.json").resolve())
            item["outputAssets"] = str((output_root / "assets").resolve())
            item["outputLatex"] = str((output_root / "latex" / f"{item['problemId']}.tex").resolve())
            prepared.append(item)
        (executor_root / "tasks.json").write_text(
            json.dumps(prepared, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        summary["executors"].append(
            {
                "id": f"{group['id']:02d}",
                "questions": len(prepared),
                "images": sum(len(item["images"]) for item in prepared),
                "weight": group["weight"],
            }
        )

    (WORK_ROOT / "assignment-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
