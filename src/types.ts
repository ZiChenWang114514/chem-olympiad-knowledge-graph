export type Discipline = { id: string; name: string; color: string }
export type Relation = { id: string; name: string; predicate: string }
export type GraphNode = { id: string; label: string; type: string; discipline: string; importance?: number }
export type GraphEdge = { id: string; source: string; target: string; relation: string }
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
}

/** 题干块模型 — 规范见 docs/problem-stem-format.md */
export type StemBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'formula'; latex: string; display?: boolean }
  | { type: 'chem'; latex: string; display?: boolean }
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'subpart'; label: string; prompt?: string; blocks: StemBlock[] }
  | { type: 'figure'; src?: string; alt: string; caption?: string; assetId?: string }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { type: 'callout'; tone?: 'info' | 'warn'; text: string }

export type StemPart = {
  id: string
  label: string
  score?: number
  blocks: StemBlock[]
}

export type ProblemStem = {
  schemaVersion: 1
  problemId: string
  rightsState: 'stem_public' | 'stem_demo' | 'fulltext_authorized'
  language: string
  title: string
  number: string
  examYear?: number
  examStage?: string
  source: {
    sourceDocumentId?: string
    sourceLabel: string
    page?: number
    transcriptionMethod: 'manual' | 'ocr_reviewed' | 'synthetic_demo'
    transcribedAt?: string
  }
  blocks?: StemBlock[]
  parts?: StemPart[]
  provenanceNote?: string
  renderingHints?: { mhchem?: boolean; katexTrust?: boolean }
}

export type StemIndexItem = {
  problemId: string
  path: string
  rightsState: ProblemStem['rightsState']
  title?: string
}

export type StemIndex = {
  schemaVersion: 1
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
