from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(r"D:\打工2\projects\化学竞赛知识图谱-public\_stem_pipeline\quality-review")
GROUPS = ("01", "02", "03")


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> None:
    issues: list[str] = []
    all_node_ids: set[str] = set()
    all_decisions: list[dict] = []
    for group in GROUPS:
        tasks_path = ROOT / f"executor-{group}" / "global-tasks.json"
        review_path = ROOT / f"executor-{group}" / "global-review.json"
        if not review_path.is_file():
            issues.append(f"executor-{group}: missing global-review.json")
            continue
        tasks = read(tasks_path)
        review = read(review_path)
        task_nodes = {item["id"] for item in tasks.get("existingNodes", [])}
        task_edges = {item["id"] for item in tasks.get("relatedEdges", [])}
        decisions = review.get("nodeDecisions", [])
        edge_decisions = review.get("edgeDecisions", [])
        reviewed_nodes = [item.get("nodeId") for item in decisions]
        reviewed_edges = [item.get("edgeId") for item in edge_decisions]
        if len(reviewed_nodes) != len(set(reviewed_nodes)):
            issues.append(f"executor-{group}: duplicate node decision")
        if len(reviewed_edges) != len(set(reviewed_edges)):
            issues.append(f"executor-{group}: duplicate edge decision")
        if task_nodes - set(reviewed_nodes):
            issues.append(f"executor-{group}: node coverage missing={sorted(task_nodes-set(reviewed_nodes))}")
        if task_edges != set(reviewed_edges):
            issues.append(f"executor-{group}: edge coverage missing={sorted(task_edges-set(reviewed_edges))} extra={sorted(set(reviewed_edges)-task_edges)}")
        for item in decisions:
            if item.get("decision") not in {"keep", "rename", "merge", "retire"} or not item.get("reason"):
                issues.append(f"executor-{group}: invalid node decision {item}")
            if item.get("decision") == "rename" and not item.get("preferredLabel"):
                issues.append(f"executor-{group}: rename without preferredLabel {item.get('nodeId')}")
            if item.get("decision") == "merge" and not item.get("mergeIntoNodeId"):
                issues.append(f"executor-{group}: merge without target {item.get('nodeId')}")
        for item in edge_decisions:
            if item.get("decision") not in {"keep", "remove", "replace"} or not item.get("reason"):
                issues.append(f"executor-{group}: invalid edge decision {item}")
        all_node_ids.update(task_nodes)
        all_decisions.extend(decisions)
    for item in all_decisions:
        if item.get("decision") == "merge" and item.get("mergeIntoNodeId") not in all_node_ids:
            issues.append(f"merge target does not exist: {item}")
    report = {"reviewedNodes": len({item.get('nodeId') for item in all_decisions}), "issues": issues}
    (ROOT / "global-validation-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"reviewedNodes": report["reviewedNodes"], "issues": len(issues)}, ensure_ascii=False))
    if issues:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
