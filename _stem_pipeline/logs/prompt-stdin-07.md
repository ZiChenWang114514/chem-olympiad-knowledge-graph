# 任务：MinerU MD → ProblemStem JSON（化学竞赛题干）

你是流水线 worker。工作目录是公开站仓库：

`D:\打工2\projects\化学竞赛知识图谱-public`

## 必读规范

1. `docs/problem-stem-format.md`
2. `docs/schemas/problem-stem.schema.json`
3. 本 shard 任务文件：`_stem_pipeline/shards/shard-07/tasks.json`（XX 为你的编号）

## 目标

对 tasks.json 中每一份 `full.md`（整卷 MinerU 转写）：

1. 阅读 MD 全文（路径在 task.md）
2. 按卷面题号切分题目
3. 与 task.problems[] 中的 `id` / `number` / `title` **对齐**
4. 为每道题写出 **ProblemStem JSON**
5. 同时写出该题的 **LaTeX 题干片段**（仅题干，无答案）

## 输出路径（必须）

- Stem：`_stem_pipeline/out/stems/{problemId}.json`
- LaTeX：`_stem_pipeline/out/latex/{problemId}.tex`
- 进度：`_stem_pipeline/logs/shard-07-progress.jsonl`（每完成一题一行 JSON）

## Stem 硬性要求

```json
{
  "schemaVersion": 1,
  "problemId": "problem-000xxx",
  "rightsState": "stem_public",
  "language": "zh-CN",
  "title": "与元数据一致或卷面主题",
  "number": "卷面题号",
  "examYear": 2006,
  "examStage": "preliminary|final",
  "source": {
    "sourceLabel": "来自元数据 sourceLabel",
    "page": 0,
    "transcriptionMethod": "ocr_reviewed",
    "transcribedAt": "2026-08-08"
  },
  "provenanceNote": "由 MinerU MD 结构化转写；公式已整理为 LaTeX/mhchem。",
  "renderingHints": { "mhchem": true },
  "blocks": [],
  "parts": []
}
```

### 转换规则

- MD 中的 `$\mathrm{...}$` / `$$...$$` → `formula` 或 paragraph 内 `$...$`
- 化学式优先 `chem` 块（mhchem 表达式）
- 小问 `(1)(2)` / `1-1` / `Q6` 等 → `parts[]`
- **禁止**写入答案、评分、解析、内部路径
- **禁止** hash/sha256/md5/checksum/digest 字段
- 图片：若 MD 有 `![](images/...)`，figure.src 写相对原 MD 目录的说明即可；公开站 assets 可先省略 src，保留 caption/alt 文本描述
- OCR 乱码尽量根据化学上下文修正；无法确定则保留原文并在 callout 标明「OCR 存疑」
- 一张试卷多个 exam 对应同一 year-stage 时：按题号顺序匹配 problems 列表；题量不一致时优先匹配 number，剩余题写到 `_stem_pipeline/logs/shard-07-unmatched.md`

## LaTeX 文件

每个 `{problemId}.tex` 仅含题干正文（section 标题 + 内容），使用 `amsmath`/`mhchem` 风格命令即可，不要写 documentclass 全模板。

## 完成标准

1. 本 shard 所有 problems 都有 stem 文件（除非 unmatched 记录原因）
2. 每个 stem 可被 `JSON.parse`
3. `schemaVersion===1` 且 `problemId` 文件名一致
4. 在 progress jsonl 写入 `{problemId, ok:true}` 或 `{problemId, ok:false, error}`

## 工作方式

- 使用 shell 读写文件
- 可并行处理本 shard 内多卷，但务必写完所有题
- 不要修改 `public/data`（验收 worker 会统一写入）
- 完成后在 `_stem_pipeline/logs/shard-07-DONE.txt` 写一行 `OK papers=N problems=M`

现在开始：读取你的 `tasks.json` 并执行。

---
RUNTIME (ASCII paths):
- site workdir: D:\ccho-site-public
- exam MD root: D:\ccho-exams-link\MinerU_MD
- shard tasks: _stem_pipeline/shards/shard-07/tasks.json
- stems out: _stem_pipeline/out/stems/{problemId}.json
- latex out: _stem_pipeline/out/latex/{problemId}.tex
- done marker: _stem_pipeline/logs/shard-07-DONE.txt
If tasks.json still lists Chinese absolute paths under D:\鎵撳伐2\..., rewrite them to D:\ccho-exams-link\... when reading.