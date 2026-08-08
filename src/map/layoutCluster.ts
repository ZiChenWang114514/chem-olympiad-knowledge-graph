import type { Discipline, GraphEdge, GraphNode } from '../types'

export type NodePosition = { x: number; y: number }

function hashAngle(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 1000) / 1000
}

function matchDiscipline(node: GraphNode, d: Discipline): boolean {
  return (
    node.displayDisciplineId === d.id ||
    node.discipline === d.id ||
    node.discipline === d.name ||
    node.id === d.id ||
    node.label === d.name
  )
}

/**
 * Deterministic cluster layout: discipline hubs on a ring, members in
 * golden-angle spirals. Avoids the slow/messy cose result on 600+ nodes.
 */
export function buildClusterPositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  disciplines: Discipline[],
  opts: { compact?: boolean; expanded?: boolean } = {},
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>()
  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) || 0) + 1)
    degree.set(e.target, (degree.get(e.target) || 0) + 1)
  }

  const hubRadius = opts.expanded ? 560 : opts.compact ? 380 : 480
  // Prefer graph hub nodes (type=discipline), fall back to taxonomy order
  const hubNodes = nodes.filter(n => n.type === 'discipline')
  const hubs: { d: Discipline; node: GraphNode; index: number }[] = []

  if (hubNodes.length) {
    hubNodes.forEach((node, index) => {
      const d =
        disciplines.find(x => matchDiscipline(node, x) || x.name === node.label || x.id === node.id) ||
        ({ id: node.id, name: node.label, color: '#5575b8' } as Discipline)
      hubs.push({ d, node, index })
    })
  } else {
    disciplines.forEach((d, index) => {
      const node = nodes.find(n => matchDiscipline(n, d))
      if (node) hubs.push({ d, node, index })
    })
  }

  const hubCount = Math.max(hubs.length, 1)
  hubs.forEach((h, idx) => {
    const angle = (idx / hubCount) * Math.PI * 2 - Math.PI / 2
    positions.set(h.node.id, {
      x: Math.cos(angle) * hubRadius,
      y: Math.sin(angle) * hubRadius,
    })
  })

  const assigned = new Set(positions.keys())

  for (const h of hubs) {
    const center = positions.get(h.node.id)!
    const members = nodes
      .filter(n => n.type !== 'discipline' && matchDiscipline(n, h.d) && !assigned.has(n.id))
      .sort((a, b) => {
        const da = degree.get(a.id) || 0
        const db = degree.get(b.id) || 0
        return db - da || (b.importance || 0) - (a.importance || 0) || a.label.localeCompare(b.label, 'zh')
      })

    const ringScale = opts.expanded ? 30 : opts.compact ? 20 : 24
    const base = opts.expanded ? 88 : 72

    members.forEach((m, i) => {
      const golden = i * 2.399963229728653
      const jitter = (hashAngle(m.id) - 0.5) * 0.35
      const ring = base + Math.sqrt(i + 1) * ringScale
      const angle = golden + jitter
      positions.set(m.id, {
        x: center.x + Math.cos(angle) * ring,
        y: center.y + Math.sin(angle) * ring,
      })
      assigned.add(m.id)
    })
  }

  // Leftovers (unknown discipline / isolates): compact lattice below ring
  const rest = nodes.filter(n => !assigned.has(n.id))
  if (rest.length) {
    const cols = Math.max(8, Math.ceil(Math.sqrt(rest.length * 1.6)))
    const gap = opts.compact ? 28 : 34
    const startY = hubRadius + (opts.expanded ? 220 : 180)
    rest.forEach((n, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      positions.set(n.id, {
        x: (col - (cols - 1) / 2) * gap,
        y: startY + row * gap,
      })
    })
  }

  return positions
}

export function shouldUseClusterLayout(nodeCount: number): boolean {
  return nodeCount >= 80
}
