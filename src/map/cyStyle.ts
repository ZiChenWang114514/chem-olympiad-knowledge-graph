import type cytoscape from 'cytoscape'
import type { AppData } from '../lib/data'
import { disciplineColor, nodeSize } from '../lib/graph'
import type { GraphNode } from '../types'

/** Dark-canvas molecular graph styles */
export function buildCyStyle(data: AppData) {
  const colorOf = (id: string) => disciplineColor(data.taxonomy.disciplines, id)
  return [
    {
      selector: 'node',
      style: {
        'background-color': (el: cytoscape.NodeSingular) => colorOf(el.data('discipline')),
        'background-opacity': 0.96,
        label: 'data(label)',
        color: '#e8f0f2',
        'font-size': 11,
        'font-family': 'Noto Sans SC, system-ui, sans-serif',
        'font-weight': 500,
        'text-wrap': 'wrap',
        'text-max-width': 72,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 9,
        'text-background-color': '#121a1e',
        'text-background-opacity': 0.72,
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle',
        'text-border-width': 0,
        width: (el: cytoscape.NodeSingular) => nodeSize(el.data() as GraphNode),
        height: (el: cytoscape.NodeSingular) => nodeSize(el.data() as GraphNode),
        'border-width': 2,
        'border-color': 'rgba(255,255,255,0.22)',
        'overlay-opacity': 0,
        'shadow-blur': 14,
        'shadow-color': 'rgba(0,0,0,0.45)',
        'shadow-offset-x': 0,
        'shadow-offset-y': 3,
        'shadow-opacity': 0.55,
        'min-zoomed-font-size': 7,
        'text-opacity': 1,
      },
    },
    {
      selector: 'node[type = "discipline"]',
      style: {
        'font-weight': 700,
        'font-size': 12,
        color: '#ffffff',
        'text-valign': 'center',
        'text-margin-y': 0,
        'text-background-opacity': 0,
        'border-width': 2.5,
        'border-color': 'rgba(255,255,255,0.45)',
        'shadow-blur': 22,
        'shadow-color': 'rgba(100, 200, 210, 0.35)',
        'shadow-opacity': 0.65,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.15,
        'line-color': 'rgba(160, 185, 195, 0.38)',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': 'rgba(160, 185, 195, 0.38)',
        'curve-style': 'bezier',
        'arrow-scale': 0.65,
        opacity: 0.9,
      },
    },
    {
      selector: 'edge[relation = "prerequisite"]',
      style: {
        width: 1.55,
        'line-color': 'rgba(200, 170, 120, 0.55)',
        'target-arrow-color': 'rgba(200, 170, 120, 0.55)',
      },
    },
    {
      selector: 'edge[relation = "belongs_to"], edge[relation = "belongs"]',
      style: {
        width: 1,
        'line-color': 'rgba(140, 160, 170, 0.28)',
        'target-arrow-color': 'rgba(140, 160, 170, 0.28)',
        opacity: 0.7,
      },
    },
    {
      selector: 'node.faded, edge.faded',
      style: { opacity: 0.12 },
    },
    {
      selector: 'node.neighbor-node',
      style: {
        'border-width': 3,
        'border-color': '#3ec9c4',
        opacity: 1,
        'shadow-blur': 20,
        'shadow-color': 'rgba(62, 201, 196, 0.45)',
        'shadow-opacity': 0.7,
        'text-opacity': 1,
      },
    },
    {
      selector: 'edge.neighbor-edge',
      style: {
        width: 2.4,
        'line-color': '#5ec4c0',
        'target-arrow-color': '#5ec4c0',
        opacity: 1,
      },
    },
    {
      selector: 'node.map-selected, node:selected',
      style: {
        'border-width': 4,
        'border-color': '#f0a060',
        'background-blacken': -0.08,
        opacity: 1,
        'font-weight': 700,
        'text-opacity': 1,
        'text-background-opacity': 0.85,
        'shadow-blur': 28,
        'shadow-color': 'rgba(240, 160, 96, 0.55)',
        'shadow-opacity': 0.85,
      },
    },
  ]
}

export function defaultLayoutOptions(compact: boolean, expanded = false, nodeCount = 0) {
  const loose = expanded ? 1.2 : 1
  const large = nodeCount > 120
  return {
    name: 'cose' as const,
    animate: false,
    padding: compact ? 36 : expanded ? 64 : 48,
    nodeRepulsion: () => (compact ? 12000 : large ? 16000 : 13000) * loose,
    idealEdgeLength: () => (compact ? 88 : expanded ? 120 : 104) * loose,
    gravity: large ? 0.55 : expanded ? 0.62 : 0.7,
    componentSpacing: compact ? 36 : large ? (expanded ? 56 : 44) : expanded ? 80 : 68,
    nestingFactor: 1.1,
    numIter: large ? 1600 : expanded ? 1400 : 1200,
    randomize: false,
  }
}
