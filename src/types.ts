export type Discipline = { id: string; name: string; color: string }
export type Relation = { id: string; name: string; predicate: string }
export type GraphNode = {
  id: string
  label: string
  type: string
  discipline: string
  importance?: number
  /** 以下字段仅用于浏览器中的显示图，不写入公开业务数据。 */
  displayDisciplineId?: string
  sourceDiscipline?: string
  virtual?: boolean
}
export type GraphEdge = { id: string; source: string; target: string; relation: string; virtual?: boolean }
export type DisplayTopic = { id: string; name: string; sourceDisciplineId: string }
export type DisplayDiscipline = {
  id: string
  name: string
  color: string
  sourceDisciplineIds: string[]
  topics: DisplayTopic[]
}
export type MapViewState = { disciplineId?: string; nodeId?: string; relation?: string }
export type VisibleGraph = GraphData & {
  totalNodes: number
  totalEdges: number
  truncated: boolean
  topicNodeSources: Record<string, string>
}
export type Problem = {
  id: string
  examId: string
  number: string
  title: string
  disciplines: string[]
  /** 节点级知识映射；缺省或空数组表示尚未标注到具体节点 */
  nodeIds?: string[]
  difficulty: number
  mappingCount: number
  rightsState: string
  summary: string
  sourceDocumentId?: string
  sourceLabel?: string
  sourceVersion?: string
  page?: number
  /** 是否有可加载题干（由 stems/index 填充，非年包必填字段） */
  hasStem?: boolean
  partMappings?: {
    partId: string
    parentId?: string
    label: string
    nodeIds: string[]
    mappings: { nodeId: string; mappingRole: 'assesses' | 'requires' | 'context_only'; evidenceBasis: string; evidencePages: number[]; importance: number }[]
  }[]
}

/** 题干块模型 — 规范见 docs/problem-stem-format.md */
export type StemBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'formula'; latex: string; display?: boolean }
  | { type: 'chem'; latex: string; display?: boolean }
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'subpart'; localRef?: string; partId?: string; label: string; score?: number; prompt?: string; blocks: StemBlock[] }
  | { type: 'figure'; src: string; alt: string; label?: string; caption?: string; assetId?: string; displayWidth?: number }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { type: 'callout'; tone?: 'info' | 'warn'; text: string }
  | { type: 'layout'; minWidth?: number; columns: { span: number; blocks: StemBlock[] }[] }

export type ProblemStem = {
  schemaVersion: 2
  problemId: string
  rightsState: 'stem_public' | 'fulltext_authorized'
  language: string
  title: string
  number: string
  examYear?: number
  examStage?: string
  source: {
    sourceDocumentId?: string
    sourceLabel: string
    pages: number[]
    transcriptionMethod: 'manual' | 'ocr_reviewed' | 'deepseek_polished'
    transcribedAt?: string
  }
  blocks: StemBlock[]
  renderingHints?: { mhchem?: boolean; katexTrust?: boolean }
}

export type StemIndexItem = {
  problemId: string
  path: string
  rightsState: ProblemStem['rightsState']
  title?: string
}

export type StemIndex = {
  schemaVersion: number
  items: StemIndexItem[]
}
export type Exam = {
  id: string
  year: number
  stage: string
  session: string
  title: string
  rightsState: string
  problemCount: number
  sourceDocumentId?: string
  sourceLabel: string
  sourceVersion?: string
  page?: number
}
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] }
export type Manifest = { dataVersion: string; schemaVersion: number; generatedAt: string; releaseSequence: number }
export type Stats = {
  totalExams: number
  totalProblems: number
  totalNodes: number
  disciplineCounts: { name: string; value: number; color: string }[]
  yearCounts: { year: number; value: number }[]
  note: string
}
export type SearchItem = { id: string; kind: 'knowledge' | 'problem'; title: string; subtitle: string; text: string }
