from __future__ import annotations

import json
import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(r"D:\打工2\projects\化学竞赛知识图谱-public\_stem_pipeline\quality-review")
DATABASE = Path(r"D:\打工2\projects\化学竞赛知识图谱\database\knowledge.sqlite")
GROUPS = ("01", "02", "03")


def normalized(value: str) -> str:
    return re.sub(r"[\s·・—–_()（）]+", "", value).lower()


def owner(discipline: str) -> str:
    if discipline in {"无机", "结构", "无机化学", "结构化学", "材料化学", "晶体化学", "配位化学", "超分子化学", "纳米材料"}:
        return "01"
    if discipline in {"有机", "有机化学", "高分子化学", "有机硅化学", "生物化学"}:
        return "02"
    return "03"


def main() -> None:
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    existing = [dict(row) for row in connection.execute("SELECT id,name,aliases_json,discipline,node_type,description,status FROM knowledge_node")]
    edges = [dict(row) for row in connection.execute("SELECT * FROM knowledge_edge")]
    connection.close()
    proposals: list[dict[str, Any]] = []
    for group in GROUPS:
        graph_root = ROOT / f"executor-{group}" / "output" / "graph-patches"
        for path in graph_root.glob("problem-*.json"):
            patch = json.loads(path.read_text(encoding="utf-8"))
            for node in patch.get("proposedNodes", []):
                proposals.append({**node, "problemId": patch["problemId"], "executor": group})
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for node in existing:
        by_name[normalized(node["name"])].append({"kind": "existing", **node})
    for node in proposals:
        by_name[normalized(node["preferredLabel"])].append({"kind": "proposal", **node})
    conflicts = [items for items in by_name.values() if len(items) > 1]
    assignments: dict[str, dict[str, Any]] = {group: {"existingNodes": [], "proposedNodes": [], "conflicts": [], "relatedEdges": []} for group in GROUPS}
    for node in existing:
        assignments[owner(node["discipline"])]["existingNodes"].append(node)
    for node in proposals:
        assignments[owner(node.get("discipline", ""))]["proposedNodes"].append(node)
    for items in conflicts:
        sample = items[0]
        discipline = sample.get("discipline", "")
        assignments[owner(discipline)]["conflicts"].append(items)
    node_owner = {node["id"]: owner(node["discipline"]) for node in existing}
    for edge in edges:
        group = node_owner.get(edge["source_node_id"], node_owner.get(edge["target_node_id"], "03"))
        assignments[group]["relatedEdges"].append(edge)
    for group, payload in assignments.items():
        (ROOT / f"executor-{group}" / "global-tasks.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "executor-03" / "cross-conflicts.json").write_text(json.dumps({"conflicts": conflicts, "allProposedNodes": proposals}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {group: {key: len(value) for key, value in payload.items()} for group, payload in assignments.items()}
    (ROOT / "global-assignment-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
