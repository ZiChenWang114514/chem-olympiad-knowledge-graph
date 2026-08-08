import type { Discipline, GraphEdge, GraphNode, Problem } from '../types'

export type NeighborItem = {
  edgeId: string
  relation: string
  other: GraphNode
}

/** 学科色兜底：taxonomy 缺色时仍保持六色可辨 */
const DISCIPLINE_PALETTE: Record<string, string> = {
  物理化学: '#d36b4b',
  无机化学: '#2c7a7b',
  有机化学: '#a15c9f',
  分析化学: '#bc8a2f',
  结构化学: '#5575b8',
  实验化学: '#5b8c5a',
  physical: '#d36b4b',
  inorganic: '#2c7a7b',
  organic: '#a15c9f',
  analytical: '#bc8a2f',
  structural: '#5575b8',
  experiment: '#5b8c5a',
}

const RELATION_LABELS: Record<string, string> = {
  prerequisite: '先修于',
  belongs_to: '属于',
  belongs: '属于',
  applied_in: '用于解释',
  examined_with: '综合考查',
  confused_with: '容易混淆',
}

/** prerequisite 约定：source 先修于 target（应先学 source，再学 target） */
export function getNeighbors(nodeId: string, edges: GraphEdge[], nodes: GraphNode[]): NeighborItem[] {
  const byId = new Map(nodes.map(n => [n.id, n]))
  return edges
    .filter(edge => edge.source === nodeId || edge.target === nodeId)
    .map(edge => {
      const otherId = edge.source === nodeId ? edge.target : edge.source
      const other = byId.get(otherId)
      return other ? { edgeId: edge.id, relation: edge.relation, other } : null
    })
    .filter((item): item is NeighborItem => Boolean(item))
}

/** 建议先学：指向当前节点的 prerequisite 边的 source */
export function getPrerequisites(nodeId: string, edges: GraphEdge[], nodes: GraphNode[]): GraphNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]))
  return edges
    .filter(edge => edge.relation === 'prerequisite' && edge.target === nodeId)
    .map(edge => byId.get(edge.source))
    .filter((node): node is GraphNode => Boolean(node))
}

/** 可继续学习：从当前节点出发的 prerequisite 边的 target */
export function getFollowOns(nodeId: string, edges: GraphEdge[], nodes: GraphNode[]): GraphNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]))
  return edges
    .filter(edge => edge.relation === 'prerequisite' && edge.source === nodeId)
    .map(edge => byId.get(edge.target))
    .filter((node): node is GraphNode => Boolean(node))
}

/** 仅依据节点级 nodeIds；无字段或空数组表示未标注 */
export function getRelatedProblems(nodeId: string, problems: Problem[]): Problem[] {
  return problems.filter(problem => Array.isArray(problem.nodeIds) && problem.nodeIds.includes(nodeId))
}

export function hasNodeMappings(problem: Problem): boolean {
  return Array.isArray(problem.nodeIds) && problem.nodeIds.length > 0
}

export function nodeTypeLabel(type: string): string {
  if (type === 'discipline') return '学科'
  if (type === 'method') return '方法'
  if (type === 'skill' || type === 'lab_skill') return '技能'
  return '概念'
}

export function relationLabel(relation: string, taxonomyName?: string): string {
  if (taxonomyName && !/^[a-z_]+$/i.test(taxonomyName)) return taxonomyName
  return RELATION_LABELS[relation] || taxonomyName || relation
}

export function nodeSize(node: GraphNode): number {
  if (node.type === 'discipline') return 48
  const importance = node.importance ?? 3
  return Math.min(32, Math.max(18, 16 + importance * 2.2))
}

export function groupNodesByDiscipline(nodes: GraphNode[], disciplines: Discipline[]) {
  const order = disciplines.map(d => d.id)
  const groups = disciplines.map(d => ({
    discipline: d,
    nodes: nodes
      .filter(n => n.discipline === d.id || n.discipline === d.name)
      .sort((a, b) => {
        if (a.type === 'discipline' && b.type !== 'discipline') return -1
        if (b.type === 'discipline' && a.type !== 'discipline') return 1
        return (b.importance || 0) - (a.importance || 0) || a.label.localeCompare(b.label, 'zh')
      }),
  }))
  const known = new Set([...order, ...disciplines.map(d => d.name)])
  const rest = nodes.filter(n => !known.has(n.discipline))
  if (rest.length) {
    groups.push({
      discipline: { id: 'other', name: '其他', color: '#7a8f94' },
      nodes: rest,
    })
  }
  return groups.filter(g => g.nodes.length > 0)
}

export function disciplineColor(disciplines: Discipline[], disciplineId: string): string {
  const found = disciplines.find(d => d.id === disciplineId || d.name === disciplineId)
  if (found?.color && found.color.toLowerCase() !== '#5575b8') return found.color
  return DISCIPLINE_PALETTE[disciplineId] || found?.color || DISCIPLINE_PALETTE[found?.name || ''] || '#5575b8'
}

