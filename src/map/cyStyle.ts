import type cytoscape from 'cytoscape'
import type { AppData } from '../lib/data'
import { disciplineColor, nodeSize } from '../lib/graph'
import type { GraphNode } from '../types'

/** Dark-canvas molecular graph styles */
export function buildCyStyle(data: AppData, nodeCount = 0) {
  const colorOf = (id: string) => disciplineColor(data.taxonomy.disciplines, id)
  const large = nodeCount > 200
  return [
    {
      selector: 'node',
      style: {
        'background-color': (el: cytoscape.NodeSingular) => colorOf(el.data('discipline')),
        'background-opacity': 0.94,
        label: 'data(label)',
        color: '#e8f0f2',
        'font-size': large ? 10 : 11,
        'font-family': 'Noto Sans SC, system-ui, sans-serif',
        'font-weight': 500,
        'text-wrap': 'wrap',
        'text-max-width': large ? 64 : 72,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 8,
        'text-background-color': '#0e1519',
        'text-background-opacity': 0.78,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        'text-border-width': 0,
        width: (el: cytoscape.NodeSingular) => {
          const base = nodeSize(el.data() as GraphNode)
          return large ? Math.max(14, base * 0.82) : base
        },
        height: (el: cytoscape.NodeSingular) => {
          const base = nodeSize(el.data() as GraphNode)
          return large ? Math.max(14, base * 0.82) : base
        },
        'border-width': large ? 1.5 : 2,
        'border-color': 'rgba(255,255,255,0.2)',
        'overlay-opacity': 0,
        'shadow-blur': large ? 8 : 14,
        'shadow-color': 'rgba(0,0,0,0.4)',
        'shadow-offset-x': 0,
        'shadow-offset-y': 2,
        'shadow-opacity': large ? 0.35 : 0.5,
        'min-zoomed-font-size': 8,
        'text-opacity': 1,
      },
    },
    {
      selector: 'node[type = "discipline"]',
      style: {
        'font-weight': 700,
        'font-size': 13,
        color: '#ffffff',
        'text-valign': 'center',
        'text-margin-y': 0,
        'text-background-opacity': 0,
        'border-width': 2.5,
        'border-color': 'rgba(255,255,255,0.5)',
        'shadow-blur': 26,
        'shadow-color': 'rgba(100, 200, 210, 0.4)',
        'shadow-opacity': 0.7,
        width: large ? 46 : 52,
        height: large ? 46 : 52,
      },
    },
    {
      selector: 'edge',
      style: {
        width: large ? 0.9 : 1.15,
        'line-color': 'rgba(160, 185, 195, 0.32)',
        'target-arrow-shape': large ? 'none' : 'triangle',
        'target-arrow-color': 'rgba(160, 185, 195, 0.32)',
        'curve-style': 'haystack',
        'haystack-radius': 0.55,
        'arrow-scale': 0.55,
        opacity: large ? 0.55 : 0.85,
      },
    },
    {
      selector: 'edge[relation = "prerequisite"]',
      style: {
        width: large ? 1.2 : 1.55,
        'line-color': 'rgba(200, 170, 120, 0.5)',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': 'rgba(200, 170, 120, 0.5)',
        'curve-style': 'bezier',
        opacity: 0.85,
      },
    },
    {
      selector: 'edge[relation = "belongs_to"], edge[relation = "belongs"]',
      style: {
        width: large ? 0.7 : 1,
        'line-color': 'rgba(140, 160, 170, 0.22)',
        'target-arrow-shape': 'none',
        opacity: large ? 0.4 : 0.65,
      },
    },
    {
      selector: 'node[isolate = 1]',
      style: {
        opacity: 0.38,
        width: large ? 10 : 12,
        height: large ? 10 : 12,
        'border-width': 1,
        'shadow-opacity': 0.15,
        'text-opacity': 0,
      },
    },
    {
      selector: 'node.faded, edge.faded',
      style: { opacity: 0.08 },
    },
    {
      selector: 'node.is-hover',
      style: {
        'border-width': 3,
        'border-color': 'rgba(255,255,255,0.65)',
        'shadow-blur': 18,
        'shadow-opacity': 0.65,
        'z-index': 999,
      },
    },
    {
      selector: 'node.neighbor-node',
      style: {
        'border-width': 3,
        'border-color': '#3ec9c4',
        opacity: 1,
        'shadow-blur': 18,
        'shadow-color': 'rgba(62, 201, 196, 0.45)',
        'shadow-opacity': 0.7,
        'text-opacity': 1,
        'z-index': 990,
      },
    },
    {
      selector: 'edge.neighbor-edge',
      style: {
        width: 2.2,
        'line-color': '#5ec4c0',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#5ec4c0',
        'curve-style': 'bezier',
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
        'text-background-opacity': 0.9,
        'shadow-blur': 28,
        'shadow-color': 'rgba(240, 160, 96, 0.55)',
        'shadow-opacity': 0.85,
        'z-index': 1000,
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
