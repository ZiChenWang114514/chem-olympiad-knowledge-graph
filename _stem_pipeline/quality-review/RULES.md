# 化学竞赛题干与知识图谱联合审核规则

本目录用于 457 道题的逐题复核。每道题必须同时核对原卷版面、结构化题干与知识图谱数据。PDF 是题文、页码、公式、图表和排列关系的最终依据；Markdown、内容列表和版面坐标用于定位与辅助提取。

## 一、题干输出

每题输出一个 `schemaVersion: 2` 的 JSON。根级仅使用有序 `blocks`，禁止使用旧版根级 `parts`。

- `source.pages` 使用原卷从 1 开始的页码数组，至少包含一个正整数。
- 题目正文按原卷顺序排列。卷面小问写为 `subpart`，候选阶段填写 `localRef`，正式编号由主流程分配。
- 分栏、并排图组或局部宽表使用 `layout`。`layout.columns` 依原卷从左到右排列；`minWidth` 只用于确有宽版面需求的区域。
- 每个图片引用必须对应一个 `figure`，并保存原图标签、显示比例与准确的替代文本。图片位置必须与原卷图文关系一致。
- 表格优先转为结构化 `table`；结构式、装置图、复杂示意图保留为图片。
- 数学公式使用 KaTeX 可接受的 LaTeX；化学式和反应式优先使用 `chem` 块或正文中的 `\ce{}`。
- 保留原题数据、条件、符号、题号和小问次序，不增加原题没有的内容。
- 题干不得包含答案、评分文字、解题提示、处理过程说明和内部文件路径。

## 二、格式检查

每题必须检查：

1. Unicode 替换字符、私用字符、兼容部首字形和无法解释的 ASCII 问号。
2. 拆散的数字、温度、指数、同位素数、百分数及单位。
3. 数学定界符配对；禁止无意义的 `array`、`normalfont` 和空样式命令。
4. 离子、电荷、同位素、反应式与变量的准确写法。
5. 小问标签唯一且与原卷一致；每个实质小问都形成独立 `subpart`。
6. 图片数量、标签、先后顺序、相邻题文和版面关系。
7. 题名、题号、年份、比赛阶段、来源文件和 PDF 页码。

发现无法从原卷可靠恢复的内容时，在审核记录中列出，不能自行补写。

## 三、知识节点与映射

一级学科只能是：无机、有机、物理、分析、结构、实验。材料、电化学、配位、晶体等属于专题。

节点类型：

- `discipline`：仅六个一级学科。
- `topic`：可复用专题。
- `concept`：可以独立定义和考查的概念。
- `method`：计算、判断或研究方法。
- `lab_skill`：可观察的实验操作技能。
- `reaction_model`：可复用的反应或机理模型。
- `common_error`：具有题目或教学证据的典型误区。

临时编号、具体未知物和一次性题面叙述不得建立知识节点。优先复用已有节点；确需新增时使用题内 `localRef`，不得自行分配正式 ID。

每条现有映射必须判定 `keep`、`replace` 或 `remove`。保留或新增的映射具有：

- `mappingRole`: `assesses`、`requires` 或 `context_only`。
- `evidenceBasis`: `question`、`official_answer`、`grading_material` 或 `expert_inference`。
- `targetRef`: 整题 ID 或小问 `localRef`。
- `knowledgeNodeId` 或 `newNodeLocalRef`，两者只填一项。
- `evidencePages`、`importance`、`explanation` 与 `reviewState: accepted`。

同一目标和节点只能有一种映射角色。整题只保留少量总体专题；具体概念和方法尽量连接相应小问。每个实质小问至少有一条 `assesses`。

## 四、节点关系

关系类型限定为：

- `belongs_to`：子节点指向直接上级专题或学科。
- `prerequisite`：基础知识指向后续知识，不能由共同出现推定。
- `derives`：推导依据指向所得结论。
- `applies`：方法或模型指向应用对象。
- `contrasts`：同一维度的对照，只保存一次。
- `co_assessed`：至少三道独立题目稳定共同考查，且有审核依据。

与本题相关的现有关系必须判定 `keep`、`replace` 或 `remove`。保留或新增关系必须给出解释、证据类型、证据页和 `reviewState: accepted`。禁止自指、重复关系和先修循环。

## 五、每题交付文件

- `stems/{problemId}.json`：schemaVersion 2 题干。
- `graph-patches/{problemId}.json`：映射、节点和关系修订建议。
- `audit/{problemId}.json`：格式、内容、来源和图谱审核记录。
- `progress.jsonl`：每完成一题追加一行。
- `report.json`：分片汇总。

Executor 只允许修改自己的输出目录，不修改 SQLite、公开数据、网页源码、规范文件、任务清单或其他 Executor 的目录。
