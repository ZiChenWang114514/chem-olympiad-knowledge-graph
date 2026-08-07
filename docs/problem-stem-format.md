# 题目题干（Problem Stem）公开内容格式规范

**版本：** `stem.schemaVersion = 1`  
**适用范围：** 公开站 `public/data/stems/`、私有仓审后导出、录入/OCR 后结构化转写  
**目标：** 点开真题档案卡片后，展示**经过审定与排版渲染的题干**（非整卷扫描 PDF、不含答案/评分）。

---

## 1. 总原则

| 原则 | 说明 |
|------|------|
| **权限优先** | 仅当来源 `rights_state` 为 `fulltext_authorized`（已获全文授权）或本站明确标记的 `stem_demo`（排版演示）时，才允许发布题干文件。`metadata_public` / `internal_only` **不得**发布题干。 |
| **只含题干** | 禁止答案、评分细则、解题步骤、阅卷说明、内部审核备注、原始 PDF 路径、OCR 未审校原文。 |
| **结构化优先** | 不直接塞整段 HTML；使用 **blocks 块模型**，便于 KaTeX/化学式渲染、无障碍与后续编辑。 |
| **可追溯** | 必须绑定 `problemId`，并记录转写方法、来源页码与审定说明。 |
| **禁止摘要字段** | 业务层仍禁止 `hash`/`sha256`/`md5`/`checksum`/`digest` 及十六进制摘要值。 |

---

## 2. 端到端流程（如何实现）

```
原始 PDF / 扫描件
    │
    ├─(1) 权限登记：source.rights_state
    │      · fulltext_authorized → 可进入题干流水线
    │      · 其它 → 仅元数据
    │
    ├─(2) 提取：OCR / PDF 文本层 / 人工录入
    │
    ├─(3) 结构化转写 → ProblemStem JSON（本规范）
    │      · 分段、小问、公式、化学式、图表引用
    │      · 人工校对（公式、下标、单位、题号）
    │
    ├─(4) 审核：内容正确性 + 无答案泄漏 + 版权
    │
    ├─(5) 导出到公开包
    │      public/data/stems/{problemId}.json
    │      public/data/stems/index.json  （索引）
    │
    └─(6) 前端按需 fetch → StemRenderer（KaTeX + mhchem）渲染
```

**为何必须转化格式？**

| 原始形态 | 问题 | 结构化后 |
|----------|------|----------|
| PDF 扫描 | 体积大、无法检索、排版依赖浏览器 PDF | 轻量 JSON + 受控资源 |
| 纯 OCR 长文 | 公式乱码、无小问结构 | blocks 分公式/段落/小问 |
| 任意 HTML | XSS、样式污染、难审计 | 白名单 block 类型 |
| Markdown  alone | 化学式/`\ce{}` 支持不一 | 明确 formula/chem 块 |

---

## 3. 文件布局

```text
public/data/
  stems/
    index.json                 # 可用题干索引（前端先读此文件）
    problem-000011.json        # 单题题干（一题一文件，按需加载）
    assets/                    # 可选：题内插图（仅授权图）
      problem-000011-fig1.webp
```

**索引 `stems/index.json`：**

```json
{
  "schemaVersion": 1,
  "items": [
    {
      "problemId": "problem-000011",
      "path": "data/stems/problem-000011.json",
      "rightsState": "stem_demo",
      "title": "钙钛矿衍生结构"
    }
  ]
}
```

**单题文件命名：** 必须与业务 ID 一致：`problem-XXXXXX.json`。

---

## 4. 根对象：`ProblemStem`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `schemaVersion` | `1` | ✓ | 固定为 1 |
| `problemId` | string | ✓ | 如 `problem-000011`，必须与档案元数据一致 |
| `rightsState` | enum | ✓ | `stem_public` \| `stem_demo` \| `fulltext_authorized` |
| `language` | string | ✓ | 默认 `zh-CN` |
| `title` | string | ✓ | 展示题目标题（可与元数据 title 对齐） |
| `number` | string | ✓ | 卷面题号，如 `Q6`、`1` |
| `examYear` | number | | 年份，便于页眉 |
| `examStage` | string | | `preliminary` / `final` |
| `source` | object | ✓ | 见下表 |
| `blocks` | StemBlock[] | * | 无小问时的扁平正文 |
| `parts` | StemPart[] | * | 有小问时使用；与 `blocks` 可并存（blocks 为总述） |
| `provenanceNote` | string | | 面向读者的说明（如「演示排版，非官方电子卷」） |
| `renderingHints` | object | | `{ "mhchem": true }` 等 |

\* `blocks` 与 `parts` **至少其一非空**。

### 4.1 `source`

| 字段 | 必填 | 说明 |
|------|------|------|
| `sourceDocumentId` | | 如 `source-000057` |
| `sourceLabel` | ✓ | 可读来源名，如 `2021-35-CChO-chusai.pdf` |
| `page` | | 题干起始页 |
| `transcriptionMethod` | ✓ | `manual` \| `ocr_reviewed` \| `synthetic_demo` |
| `transcribedAt` | | ISO-8601 日期 |

### 4.2 `rightsState` 语义

| 值 | 含义 | 是否允许上线 |
|----|------|----------------|
| `stem_demo` | 为展示渲染链路而写的样例/改写题干 | 可（须在 UI 标明演示） |
| `stem_public` | 已获权公开**题干**（仍无答案） | 可 |
| `fulltext_authorized` | 来源已登记全文授权，导出题干子集 | 可 |

**永远不得出现在 stem 文件中的字段名（示例）：**  
`answer`、`answerText`、`solution`、`solutionSteps`、`rubric`、`scoreDetail`、`ocrRaw`、`fullText`（未结构化长文）、内部路径类字段。

---

## 5. 块类型：`StemBlock`

所有块必须有 `type`。未知 `type` 前端应跳过并记日志，不得当作 HTML 注入。

### 5.1 `paragraph`

```json
{ "type": "paragraph", "text": "已知钙钛矿通式为 $ABX_3$，其中……" }
```

- `text` 可含行内数学：`$...$` 或 `\(...\)`  
- **不要**在 paragraph 里写裸 HTML  
- 化学式优先用独立 `chem` 块或 `$\ce{...}$`（需 mhchem）

### 5.2 `formula`

```json
{ "type": "formula", "latex": "E = E^\\circ - \\frac{RT}{nF}\\ln Q", "display": true }
```

- `display: true` → 独立公式行；`false` → 行内（少用，优先 paragraph 行内）

### 5.3 `chem`

```json
{ "type": "chem", "latex": "CaTiO3 + 4HF -> CaF2 + TiF4 + 2H2O", "display": true }
```

- 内容为 **mhchem 表达式**（可不写外层 `\ce{}`，渲染器自动包裹）

### 5.4 `heading`

```json
{ "type": "heading", "level": 3, "text": "数据与条件" }
```

- `level`：2–4

### 5.5 `list`

```json
{
  "type": "list",
  "ordered": true,
  "items": [
    "写出晶体的空间群符号。",
    "计算理想密堆积下的半径比。"
  ]
}
```

- `items[]` 同 paragraph，可含 `$...$`

### 5.6 `subpart`（嵌套小问，可选）

```json
{
  "type": "subpart",
  "label": "(1)",
  "prompt": "计算……",
  "blocks": [
    { "type": "paragraph", "text": "……" }
  ]
}
```

### 5.7 `figure`

```json
{
  "type": "figure",
  "src": "data/stems/assets/problem-000011-fig1.webp",
  "alt": "钙钛矿单胞示意图",
  "caption": "图 1 理想立方钙钛矿结构示意"
}
```

- `src` 必须相对站点 `BASE_URL`，且位于 `data/stems/assets/`  
- 禁止外链未知域名（公开站仅允许同源相对路径）

### 5.8 `table`

```json
{
  "type": "table",
  "caption": "表 1 晶胞参数",
  "headers": ["参数", "数值"],
  "rows": [["a / Å", "3.90"], ["Z", "1"]]
}
```

- 单元格字符串规则同 paragraph

### 5.9 `callout`

```json
{ "type": "callout", "tone": "info", "text": "本题配图为示意，不作为精确键长依据。" }
```

### 5.10 小问容器：`parts[]`（推荐竞赛卷）

```json
{
  "id": "part-000001",
  "label": "(1)",
  "score": 6,
  "blocks": [
    { "type": "paragraph", "text": "……" }
  ]
}
```

- `id` 遵循 `part-` + 六位序号（若已有业务 part id 则复用）  
- `score` 可选；**不要**放评分细则文字

---

## 6. 完整示例（节选）

见仓库内 `public/data/stems/problem-000011.json`。

---

## 7. 渲染约定（前端）

1. 按 `blocks` 顺序渲染；若有 `parts`，先渲染根级 `blocks`（总述），再按 `parts` 顺序渲染小问标题 + 内部 blocks。  
2. 数学：KaTeX；化学：`katex` + `mhchem`。  
3. 渲染失败时显示原始 LaTeX 源码占位，不得空白崩溃。  
4. `rightsState === 'stem_demo'` 时 UI **必须**显示「演示题干 / 排版样例」提示。  
5. 无索引项时：保持「题文暂不公开」元数据提示（现有行为）。

---

## 8. 校验清单（发布前）

- [ ] `problemId` 存在于 `exams/*.json`  
- [ ] `rightsState` 合法且与来源授权一致  
- [ ] 无答案/评分/内部路径字段  
- [ ] 公式经 KaTeX 试渲染通过  
- [ ] 图片仅同源 assets  
- [ ] 已写入 `stems/index.json`  
- [ ] `npm run audit:public` 通过  

---

## 9. 与元数据层的关系

| 层 | 路径 | 内容 |
|----|------|------|
| 元数据 | `data/exams/{year}.json` | 题号、标题、映射、来源摘要、`rightsState` |
| 题干 | `data/stems/{id}.json` | 结构化题干 blocks |
| 索引 | `data/stems/index.json` | 哪些题「有可渲染题干」 |

元数据 **不内嵌** 大段题干，避免年包膨胀；详情页 **按需加载** 题干 JSON。

---

## 10. 私有仓导出约定（摘要）

私有项目在 `fulltext_authorized` 时，可额外生成 `stems/` 目录并入发布包；公开站 `import:release` 仅在字段符合本规范时复制。详见私有仓 `docs/stem-export.md`（若已同步）。
