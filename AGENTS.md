# 化学竞赛知识图谱公开站：Agent 执行规范

本仓库只接收已经通过私有项目自动检查并允许公开的脱敏发布包。新 Agent 开始工作前阅读本文件和 `README.md`；没有明确的发布记录时，不得把私有题目资料复制到此处。

## 1. 公开业务数据的字段要求

公开 JSON、TypeScript 类型、API 数据、搜索索引、统计文件、网页文字和资源文件名中，业务层严禁出现摘要校验类字段、值、显示内容或 ID 生成逻辑，包括 `hash`、`sha`、`sha256`、`md5`、`checksum`、`digest` 及其变体。Git 对象、Git 提交记录和 Vite 构建工具自动生成的内部文件名属于工具内部机制，可以存在于构建过程；不得写入公开业务数据或界面。

公开来源信息使用可读字段：

```json
{
  "source_document_id": "source-000001",
  "source_version": "1.0",
  "source_file_name": "2025-39-CChO-chusai.pdf",
  "source_size_bytes": 4839201,
  "source_page_count": 29,
  "source_modified_at": "2026-08-08T10:30:00+08:00"
}
```

仅发布来源明确允许公开的字段；原始文件路径、**未授权**题文、答案、评分细则、OCR 未审校原文和内部审核备注不得进入 `public/data`、搜索索引或界面。

允许：

```json
{"id":"problem-000001","source_document_id":"source-000001","source_version":"1.0","source_file_name":"2025-39-CChO-chusai.pdf","source_page_count":29}
```

禁止：

```json
{"source_sha256":"...","file_digest":"...","id":"md5(source_filename)","label":"SHA-256: ..."}
```

### 1.1 结构化题干（Problem Stem）— 可选公开层

在**版权与审校通过**的前提下，可为单题发布结构化题干，供详情页渲染（KaTeX / mhchem）。规范全文：

- `docs/problem-stem-format.md`（内容标准与流程）
- `docs/schemas/problem-stem.schema.json`（机器可读 schema）

**允许的题干权利状态：** `stem_public` · `stem_demo` · `fulltext_authorized`（仅导出题干子集）  
**禁止写入题干文件：** 答案、评分细则、解题步骤、内部路径、摘要校验字段。

**落盘位置：**

```text
public/data/stems/index.json
public/data/stems/problem-XXXXXX.json
public/data/stems/assets/*   # 可选插图
```

元数据年包（`exams/{year}.json`）**不内嵌**大段题干；前端按 `stems/index.json` 按需加载。  
`stem_demo` 仅用于渲染演示，界面必须标注「演示排版」。

## 2. 公开业务 ID

新建考试、题目、小问、知识节点、资源和发布记录均采用“分类前缀 + 六位顺序号”，例如：

```text
exam-000001
problem-000001
part-000001
kn-concept-000001
ent-species-000001
rel-000001
evidence-000001
asset-000001
release-000001
```

六位顺序号在同一分类内递增且不得重用；编号不得来自文件内容、时间、随机数或摘要校验值。当前发布数据和新增记录均必须遵循本规则。

## 3. 发布与重复检查

发布前由私有项目确认来源、权限、版本号和脱敏结果。疑似重复来源先按文件大小筛选，再对大小相同的文件逐字节比较；只有逐字节一致才判定内容相同。公开仓库只记录可读文件名、大小、页数、修改时间和人工结论，不保存摘要校验值。

Agent 不得绕过导入脚本直接复制私有目录，不得手工把未审核文件放入 `public/data`。发现导入器或类型定义仍要求禁止字段时，记录具体位置并暂停发布，等待维护者更新规范。

## 4. 新 Agent 上手流程

1. 阅读本文件和 `README.md`，确认任务属于公开站及其允许的目录。
2. 获取已审核的私有发布包和发布记录，确认仅含获准字段。
3. 检查来源可读字段与业务 ID，确认分类前缀和六位顺序号没有冲突。
4. 运行 `npm test`、`npm run build` 及公开数据审查脚本；检查生成的 JSON、搜索索引和界面文字。
5. 复查业务数据中没有摘要校验类字段、值、显示文字或 ID 生成逻辑，再提交改动。

Agent 只修改任务指定文件和公开数据目录中的获准内容；遇到并发改动先重新读取文件并保留他人修改。构建产物中的工具内部文件名不复制回业务数据，也不在发布说明中展示。
