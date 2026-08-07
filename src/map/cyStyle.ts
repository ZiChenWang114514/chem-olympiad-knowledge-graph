import type cytoscape from 'cytoscape'
import type { AppData } from '../lib/data'
import { disciplineColor, nodeSize } from '../lib/graph'
import type { GraphNode } from '../types'

export function buildCyStyle(data: AppData) {
  const colorOf = (id: string) => disciplineColor(data.taxonomy.disciplines, id)
  return [
    {
      selector: 'node',
      style: {
        'background-color': (el: cytoscape.NodeSingular) => colorOf(el.data('discipline')),
        'background-opacity': 0.97,
        label: 'data(label)',
        color: '#0f2a36',
        'font-size': 11,
        'font-family': 'Noto Sans SC, sans-serif',
        'font-weight': 500,
        'text-wrap': 'wrap',
        'text-max-width': 78,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 8,
        'text-background-color': '#f7fbfa',
        'text-background-opacity': 0.88,
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle',
        width: (el: cytoscape.NodeSingular) => nodeSize(el.data() as GraphNode),
        height: (el: cytoscape.NodeSingular) => nodeSize(el.data() as GraphNode),
        'border-width': 2.5,
        'border-color': 'rgba(255,255,255,0.95)',
        'overlay-opacity': 0,
        'shadow-blur': 10,
        'shadow-color': 'rgba(15,42,54,0.16)',
        'shadow-offset-x': 0,
        'shadow-offset-y': 2,
        'shadow-opacity': 0.4,
        'min-zoomed-font-size': 8,
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
        'text-outline-width': 0,
        'border-width': 3,
        'border-color': 'rgba(255,255,255,0.92)',
        'shadow-blur': 14,
        'shadow-opacity': 0.45,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.25,
        'line-color': '#c5d2d4',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#c5d2d4',
        'curve-style': 'bezier',
        'arrow-scale': 0.7,
        opacity: 0.85,
      },
    },
    {
      selector: 'edge[relation = "prerequisite"]',
      style: {
        width: 1.55,
        'line-color': '#8fa6aa',
        'target-arrow-color': '#8fa6aa',
      },
    },
    {
      selector: 'edge[relation = "belongs_to"], edge[relation = "belongs"]',
      style: {
        width: 1.05,
        'line-color': '#d5e0e1',
        'target-arrow-color': '#d5e0e1',
        opacity: 0.65,
      },
    },
    {
      selector: 'node.faded, edge.faded',
      style: { opacity: 0.16 },
    },
    {
      selector: 'node.neighbor-node',
      style: {
        'border-width': 3.5,
        'border-color': '#0a6b72',
        opacity: 1,
        'shadow-blur': 16,
        'shadow-color': 'rgba(10,107,114,0.3)',
        'shadow-opacity': 0.55,
      },
    },
    {
      selector: 'edge.neighbor-edge',
      style: {
        width: 2.5,
        'line-color': '#4f858c',
        'target-arrow-color': '#4f858c',
        opacity: 1,
      },
    },
    {
      selector: 'node.map-selected, node:selected',
      style: {
        'border-width': 4.5,
        'border-color': '#c45a28',
        'background-blacken': -0.06,
        opacity: 1,
        'font-weight': 700,
        'text-background-opacity': 0.94,
        'shadow-blur': 18,
        'shadow-color': 'rgba(196,90,40,0.35)',
        'shadow-opacity': 0.6,
      },
    },
  ]
}

export function defaultLayoutOptions(compact: boolean) {
  return {
    name: 'cose' as const,
    animate: false,
    padding: compact ? 36 : 56,
    nodeRepulsion: () => (compact ? 9000 : 11000),
    idealEdgeLength: () => (compact ? 96 : 120),
    gravity: 0.75,
    componentSpacing: compact ? 40 : 72,
    nestingFactor: 1.15,
    numIter: 1200,
  }
}
