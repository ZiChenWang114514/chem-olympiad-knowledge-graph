import type { Discipline, GraphEdge, GraphNode, Problem } from '../types'

export type NeighborItem = {
  edgeId: string
  relation: string
  other: GraphNode
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
  if (type === 'skill') return '技能'
  return '概念'
}

export function nodeSize(node: GraphNode): number {
  if (node.type === 'discipline') return 46
  const importance = node.importance ?? 3
  return Math.min(38, Math.max(28, 26 + importance * 2))
}

export function groupNodesByDiscipline(nodes: GraphNode[], disciplines: Discipline[]) {
  const order = disciplines.map(d => d.id)
  const groups = disciplines.map(d => ({
    discipline: d,
    nodes: nodes
      .filter(n => n.discipline === d.id)
      .sort((a, b) => {
        if (a.type === 'discipline' && b.type !== 'discipline') return -1
        if (b.type === 'discipline' && a.type !== 'discipline') return 1
        return (b.importance || 0) - (a.importance || 0) || a.label.localeCompare(b.label, 'zh')
      }),
  }))
  const known = new Set(order)
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
  return disciplines.find(d => d.id === disciplineId)?.color || '#5575b8'
}
