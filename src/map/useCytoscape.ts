import { useEffect, useRef } from 'react'
import cytoscape, { type Core, type EventObject } from 'cytoscape'
import { useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'
import type { GraphData, GraphNode } from '../types'
import { displayTaxonomyDisciplines } from '../lib/displayTaxonomy'
import { buildCyStyle, defaultLayoutOptions } from './cyStyle'
import { buildClusterPositions, shouldUseClusterLayout } from './layoutCluster'

function isCompactViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)').matches
}

export function applySelection(cy: Core, nodeId: string | null, reduceMotion: boolean) {
  cy.batch(() => {
    cy.elements().removeClass('faded neighbor-node neighbor-edge map-selected')
    if (!nodeId) {
      cy.nodes().unselect()
      return
    }
    const node = cy.getElementById(nodeId)
    if (node.empty()) return
    const neighborhood = node.closedNeighborhood()
    cy.elements().difference(neighborhood).addClass('faded')
    node.neighborhood('node').addClass('neighbor-node')
    node.neighborhood('edge').addClass('neighbor-edge')
    node.addClass('map-selected')
    cy.nodes().unselect()
    node.select()
  })
  if (!nodeId) return
  const node = cy.getElementById(nodeId)
  if (node.empty()) return
  const eles = node.closedNeighborhood()
  const padding = isCompactViewport() ? 36 : 72
  if (reduceMotion) cy.fit(eles, padding)
  else cy.animate({ fit: { eles, padding } }, { duration: 340 })
}

function applyLabelVisibility(cy: Core, nodeCount: number, selectedId?: string | null) {
  const z = cy.zoom()
  const threshold = nodeCount > 200 ? 1.05 : nodeCount > 120 ? 0.9 : 0.7
  cy.batch(() => {
    cy.nodes().forEach(n => {
      const isDisc = n.data('type') === 'discipline'
      const show =
        isDisc ||
        z >= threshold ||
        n.id() === selectedId ||
        n.hasClass('neighbor-node') ||
        n.hasClass('map-selected')
      n.style('text-opacity', show ? 1 : 0)
    })
  })
}

type Options = {
  data: AppData
  graph: GraphData
  selectedId?: string | null
  onSelect: (nodeId: string | null) => void
  expanded?: boolean
}

export function useCytoscape({ data, graph, selectedId = null, onSelect, expanded = false }: Options) {
  const container = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const navigate = useNavigate()
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!container.current) return
    const compact = isCompactViewport()
    const nodeCount = graph.nodes.length
    const useCluster = shouldUseClusterLayout(nodeCount)

    const positions = useCluster
      ? buildClusterPositions(graph.nodes, graph.edges, displayTaxonomyDisciplines(), {
          compact,
          expanded,
        })
      : null

    const degree = new Map<string, number>()
    for (const e of graph.edges) {
      degree.set(e.source, (degree.get(e.source) || 0) + 1)
      degree.set(e.target, (degree.get(e.target) || 0) + 1)
    }

    const cy = cytoscape({
      container: container.current,
      elements: [
        ...graph.nodes.map(node => ({
          data: {
            ...node,
            isolate: node.type !== 'discipline' && (degree.get(node.id) || 0) === 0 ? 1 : 0,
          },
          ...(positions ? { position: positions.get(node.id) } : {}),
        })),
        ...graph.edges.map(edge => ({ data: { ...edge } })),
      ],
      style: buildCyStyle(data, nodeCount) as cytoscape.StylesheetStyle[],
      layout: useCluster
        ? { name: 'preset', fit: true, padding: compact ? 28 : expanded ? 48 : 40 }
        : defaultLayoutOptions(compact, expanded, nodeCount),
      minZoom: 0.15,
      maxZoom: 3.2,
      textureOnViewport: nodeCount > 200,
      hideEdgesOnViewport: nodeCount > 400,
      pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
    })
    cyRef.current = cy

    const onTapNode = (event: EventObject) => {
      onSelectRef.current(event.target.id())
    }
    const onTapBackground = (event: EventObject) => {
      if (event.target === cy) onSelectRef.current(null)
    }
    const onDblTap = (event: EventObject) => {
      const id = event.target.id()
      if (id && !event.target.data('virtual')) navigate(`/knowledge/${id}`)
    }
    const onMouseOver = (event: EventObject) => {
      event.target.addClass('is-hover')
    }
    const onMouseOut = (event: EventObject) => {
      event.target.removeClass('is-hover')
    }
    const onZoom = () => applyLabelVisibility(cy, nodeCount, selectedRef.current)

    cy.on('tap', 'node', onTapNode)
    cy.on('tap', onTapBackground)
    cy.on('dbltap', 'node', onDblTap)
    cy.on('mouseover', 'node', onMouseOver)
    cy.on('mouseout', 'node', onMouseOut)
    cy.on('zoom', onZoom)
    applyLabelVisibility(cy, nodeCount, selectedRef.current)

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            cy.resize()
          })
        : null
    if (ro && container.current) ro.observe(container.current)

    return () => {
      ro?.disconnect()
      cy.removeListener('tap', 'node', onTapNode)
      cy.removeListener('tap', onTapBackground)
      cy.removeListener('dbltap', 'node', onDblTap)
      cy.removeListener('mouseover', 'node', onMouseOver)
      cy.removeListener('mouseout', 'node', onMouseOut)
      cy.removeListener('zoom', onZoom)
      cyRef.current = null
      cy.destroy()
    }
  }, [data, graph, expanded, navigate])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    applySelection(cy, selectedId, reduceMotion)
    applyLabelVisibility(cy, graph.nodes.length, selectedId)
  }, [selectedId, reduceMotion, graph])

  const resetView = () => {
    onSelectRef.current(null)
    const cy = cyRef.current
    if (!cy) return
    cy.elements().removeClass('faded neighbor-node neighbor-edge map-selected is-hover')
    cy.nodes().unselect()
    const padding = isCompactViewport() ? 28 : 44
    if (reduceMotion) cy.fit(undefined, padding)
    else cy.animate({ fit: { eles: cy.elements(), padding } }, { duration: 280 })
    applyLabelVisibility(cy, graph.nodes.length, null)
  }

  const focusNeighborhood = () => {
    const cy = cyRef.current
    if (!cy || !selectedId) return
    applySelection(cy, selectedId, reduceMotion)
  }

  const selectLocal = (node: GraphNode) => onSelectRef.current(node.id)

  return { container, cyRef, resetView, focusNeighborhood, selectLocal, reduceMotion }
}

export { isCompactViewport }
