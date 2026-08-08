from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path


SITE_ROOT = Path(r"D:\打工2\projects\化学竞赛知识图谱-public")
WORK_ROOT = SITE_ROOT / "_stem_pipeline" / "executor-work"
OUT_STEMS = SITE_ROOT / "_stem_pipeline" / "out" / "stems"
OUT_ASSETS = SITE_ROOT / "_stem_pipeline" / "out" / "assets"
PUBLIC_ASSETS = SITE_ROOT / "public" / "data" / "stems" / "assets"

FORBIDDEN_KEYS = {
    "answer",
    "answerText",
    "solution",
    "solutionSteps",
    "rubric",
    "score",
    "scoreDetail",
    "ocrRaw",
    "fullText",
    "internalPath",
    "sourceInternalPath",
}
PLACEHOLDER_PATTERNS = (
    "待人工补全",
    "仅保留题目标题",
    "未能补全正文",
    "占位",
)


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def figure_blocks(stem: dict) -> list[dict]:
    figures: list[dict] = []
    for item in walk(stem):
        if item.get("type") == "figure":
            figures.append(item)
    return figures


def files_equal(left: Path, right: Path) -> bool:
    if left.stat().st_size != right.stat().st_size:
        return False
    with left.open("rb") as a, right.open("rb") as b:
        while True:
            chunk_a = a.read(1024 * 1024)
            chunk_b = b.read(1024 * 1024)
            if chunk_a != chunk_b:
                return False
            if not chunk_a:
                return True


def validate_task(task: dict, executor_root: Path) -> list[str]:
    errors: list[str] = []
    problem_id = task["problemId"]
    stem_path = Path(task["outputStem"])
    latex_path = Path(task["outputLatex"])
    if not stem_path.is_file():
        return [f"{problem_id}: 缺少stem JSON"]
    if not latex_path.is_file():
        errors.append(f"{problem_id}: 缺少LaTeX")
    try:
        stem = json.loads(stem_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"{problem_id}: JSON无法读取: {exc}"]

    if stem.get("problemId") != problem_id:
        errors.append(f"{problem_id}: problemId不一致")
    if stem.get("source", {}).get("page") not in (None,) and (
        not isinstance(stem["source"]["page"], int) or stem["source"]["page"] <= 0
    ):
        errors.append(f"{problem_id}: source.page必须为正整数或null")
    if stem.get("source", {}).get("transcriptionMethod") != "deepseek_polished":
        errors.append(f"{problem_id}: transcriptionMethod不正确")

    serialized = json.dumps(stem, ensure_ascii=False)
    if re.search(r"[A-Za-z]:\\", serialized):
        errors.append(f"{problem_id}: 含内部绝对路径")
    for pattern in PLACEHOLDER_PATTERNS:
        if pattern in serialized:
            errors.append(f"{problem_id}: 仍含占位内容 {pattern}")

    for item in walk(stem):
        forbidden = FORBIDDEN_KEYS.intersection(item)
        if forbidden:
            errors.append(f"{problem_id}: 含禁止字段 {sorted(forbidden)}")

    expected_sources: list[str] = []
    for index, source_value in enumerate(task["images"], start=1):
        source_path = Path(source_value)
        suffix = source_path.suffix.lower()
        asset_name = f"{problem_id}-figure-{index:03d}{suffix}"
        expected_sources.append(f"data/stems/assets/{asset_name}")
        copied = executor_root / "output" / "assets" / asset_name
        if not copied.is_file():
            errors.append(f"{problem_id}: 缺少图片 {asset_name}")
        elif not files_equal(source_path, copied):
            errors.append(f"{problem_id}: 图片内容不一致 {asset_name}")

    figures = figure_blocks(stem)
    actual_sources = [item.get("src") for item in figures]
    if any(not item.get("src") for item in figures):
        errors.append(f"{problem_id}: figure缺少src")
    if any(not str(item.get("alt", "")).strip() for item in figures):
        errors.append(f"{problem_id}: figure缺少alt")
    if sorted(actual_sources) != sorted(expected_sources):
        errors.append(
            f"{problem_id}: 图片引用不一致 expected={len(expected_sources)} actual={len(actual_sources)}"
        )
    for src in actual_sources:
        if src and re.search(r"[0-9a-f]{32,}", Path(src).name, re.I):
            errors.append(f"{problem_id}: 图片仍使用长十六进制名称")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--promote", action="store_true")
    args = parser.parse_args()

    all_tasks: list[tuple[dict, Path]] = []
    assignment_ids: list[str] = []
    reports: list[str] = []
    for executor_id in ("01", "02", "03"):
        executor_root = WORK_ROOT / executor_id
        tasks = json.loads((executor_root / "tasks.json").read_text(encoding="utf-8"))
        all_tasks.extend((task, executor_root) for task in tasks)
        assignment_ids.extend(task["problemId"] for task in tasks)
        if not (executor_root / "report.json").is_file():
            reports.append(f"executor {executor_id}: 缺少report.json")

    if len(assignment_ids) != 457:
        reports.append(f"任务总数异常：{len(assignment_ids)}")
    if len(set(assignment_ids)) != len(assignment_ids):
        reports.append("任务清单存在重复problemId")

    errors = list(reports)
    for task, executor_root in all_tasks:
        errors.extend(validate_task(task, executor_root))

    result = {
        "assigned": len(assignment_ids),
        "unique": len(set(assignment_ids)),
        "images": sum(len(task["images"]) for task, _ in all_tasks),
        "errors": errors,
        "accepted": not errors,
    }
    (WORK_ROOT / "acceptance-report.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, ensure_ascii=False))
    if errors:
        raise SystemExit(1)

    if args.promote:
        OUT_STEMS.mkdir(parents=True, exist_ok=True)
        OUT_ASSETS.mkdir(parents=True, exist_ok=True)
        PUBLIC_ASSETS.mkdir(parents=True, exist_ok=True)
        for task, executor_root in all_tasks:
            stem_path = Path(task["outputStem"])
            shutil.copy2(stem_path, OUT_STEMS / stem_path.name)
            for index, source_value in enumerate(task["images"], start=1):
                suffix = Path(source_value).suffix.lower()
                asset_name = f"{task['problemId']}-figure-{index:03d}{suffix}"
                source_asset = executor_root / "output" / "assets" / asset_name
                shutil.copy2(source_asset, OUT_ASSETS / asset_name)
                shutil.copy2(source_asset, PUBLIC_ASSETS / asset_name)
        print("Executor成果已复制到统一输出目录。")


if __name__ == "__main__":
    main()
