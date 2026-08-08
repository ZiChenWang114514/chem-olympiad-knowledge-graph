import { DISPLAY_DISCIPLINES, displayDisciplineForNode, displayTopicForNode } from './displayTaxonomy'
import type { GraphData, GraphEdge, GraphNode, VisibleGraph } from '../types'

export type VisibleGraphOptions = { disciplineId?: string; topicId?: string; nodeId?: string; relation?: string }

const MAX_VISIBLE = 180

function degreeMap(edges: GraphEdge[]) {
  const degree = new Map<string, number>()
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
  }
  return degree
}

function rankNodes(nodes: GraphNode[], degree: Map<string, number>) {
  return [...nodes].sort((a, b) => (b.importance || 0) - (a.importance || 0) || (degree.get(b.id) || 0) - (degree.get(a.id) || 0) || a.label.localeCompare(b.label, 'zh'))
}

function originalEdgesFor(nodes: GraphNode[], edges: GraphEdge[]) {
  const ids = new Set(nodes.map(node => node.id))
  return edges.filter(edge => ids.has(edge.source) && ids.has(edge.target))
}

export function buildVisibleGraph(graph: GraphData, options: VisibleGraphOptions = {}): VisibleGraph {
  const filteredEdges = options.relation ? graph.edges.filter(edge => edge.relation === options.relation) : graph.edges
  const degree = degreeMap(filteredEdges)
  const chosen = new Map<string, GraphNode>()
  const topicNodeSources: Record<string, string> = {}
  const byId = new Map(graph.nodes.map(node => [node.id, node]))
  const add = (node?: GraphNode) => {
    if (!node || chosen.size >= MAX_VISIBLE) return
    const display = displayDisciplineForNode(node, graph)
    chosen.set(node.id, { ...node, displayDisciplineId: display.id, sourceDiscipline: node.discipline })
  }

  if (options.nodeId) {
    const selected = byId.get(options.nodeId)
    if (selected) {
      add(selected)
      let frontier = new Set([selected.id])
      const visited = new Set(frontier)
      for (let depth = 0; depth < 2; depth += 1) {
        const next = new Set<string>()
        for (const edge of filteredEdges) {
          if (frontier.has(edge.source) && !visited.has(edge.target)) next.add(edge.target)
          if (frontier.has(edge.target) && !visited.has(edge.source)) next.add(edge.source)
        }
        const ranked = rankNodes(graph.nodes.filter(node => next.has(node.id)), degree)
        const accepted = new Set<string>()
        for (const node of ranked) {
          if (chosen.size >= MAX_VISIBLE) break
          add(node)
          visited.add(node.id)
          accepted.add(node.id)
        }
        frontier = accepted
      }
      const display = displayDisciplineForNode(selected, graph)
      add(graph.nodes.find(node => node.type === 'discipline' && node.label === display.id))
      const topic = displayTopicForNode(selected.id, graph)
      if (topic) add(byId.get(topic.id))
    }
  }

  if (!chosen.size) {
    const active = DISPLAY_DISCIPLINES.find(item => item.id === options.disciplineId)
    const groups = active ? [active] : DISPLAY_DISCIPLINES
    for (const display of groups) {
      const root = graph.nodes.find(node => node.type === 'discipline' && node.label === display.id)
      add(root)
      for (const topic of display.topics) {
        const node = byId.get(topic.id)
        add(node)
        if (node) topicNodeSources[node.id] = topic.name
      }

      if (options.topicId) {
        const childIds = new Set(graph.edges.filter(edge => edge.relation === 'belongs_to' && edge.target === options.topicId).map(edge => edge.source))
        rankNodes(graph.nodes.filter(node => childIds.has(node.id)), degree).slice(0, 72).forEach(add)
      } else {
        const topicIds = new Set(display.topics.map(topic => topic.id))
        const topicChildren = new Set(graph.edges.filter(edge => edge.relation === 'belongs_to' && topicIds.has(edge.target)).map(edge => edge.source))
        const candidates = graph.nodes.filter(node => node.type !== 'discipline' && node.type !== 'topic' && displayDisciplineForNode(node, graph).id === display.id && !topicChildren.has(node.id))
        rankNodes(candidates, degree).slice(0, active ? 6 : 5).forEach(add)
      }
    }
  }

  const nodes = [...chosen.values()]
  return {
    nodes,
    edges: originalEdgesFor(nodes, filteredEdges),
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    truncated: nodes.length < graph.nodes.length,
    topicNodeSources,
  }
}
