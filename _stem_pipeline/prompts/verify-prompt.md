# 验收：Stem 格式检查 + 写入公开站

工作目录：`D:\打工2\projects\化学竞赛知识图谱-public`

## 步骤

1. 读取 `docs/problem-stem-format.md` 与 schema
2. 扫描 `_stem_pipeline/out/stems/*.json`
3. 对每个文件校验：
   - JSON 合法
   - schemaVersion === 1
   - problemId 与文件名一致
   - rightsState ∈ stem_public|stem_demo|fulltext_authorized
   - 存在 blocks 或 parts
   - 无 answer/solution/rubric/ocrRaw/fullText 等禁止字段
   - 无 hash/sha256 类字段
4. 对照 `public/data/exams/**` 确认 problemId 存在
5. 写出报告：`_stem_pipeline/logs/verify-report.json`  
   `{ total, passed, failed:[{file,errors[]}], copied }`

## 写入网页（仅通过项）

对每个 **passed** 的 stem：

1. 复制到 `public/data/stems/{problemId}.json`
2. 重建 `public/data/stems/index.json`：
```json
{
  "schemaVersion": 1,
  "items": [
    { "problemId": "...", "path": "data/stems/....json", "rightsState": "...", "title": "..." }
  ]
}
```
3. 更新 `public/data/manifest.json` 的 `files` 列表与字节数（所有 `public/data/**/*.json`），`recordCounts.stems` 为题干文件数
4. 运行：`npm run audit:public`；若失败则修复 notice/manifest 后重跑
5. 可选：`npm test`（至少保证 build 可通过）

## 注意

- 覆盖已有 demo stem（problem-000011 等）若新文件更好
- 不要提交 git push（由主控决定）
- 写 `_stem_pipeline/logs/VERIFY-DONE.txt` 含通过数

开始验收并写入。
