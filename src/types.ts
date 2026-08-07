export type Discipline = { id: string; name: string; color: string }
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
  sourcePage?: number
}
export type Exam = {
  id: string
  year: number
  stage: string
  session: string
  title: string
  rightsState: string
  problemCount: number
  sourceLabel: string
  sourceSha256?: string
  syntheticDemo?: boolean
}
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[]; syntheticDemo?: boolean }
export type Stats = {
  totalExams: number
  totalProblems: number
  totalNodes: number
  disciplineCounts: { name: string; value: number; color: string }[]
  yearCounts: { year: number; value: number }[]
  note: string
}
export type SearchItem = { id: string; kind: 'knowledge' | 'problem'; title: string; subtitle: string; text: string }
