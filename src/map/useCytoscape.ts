import { useEffect, useRef } from 'react'
import cytoscape, { type Core, type EventObject } from 'cytoscape'
import { useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'
import type { GraphNode } from '../types'
import { buildCyStyle, defaultLayoutOptions } from './cyStyle'

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
  const padding = isCompactViewport() ? 28 : 56
  if (reduceMotion) cy.fit(eles, padding)
  else cy.animate({ fit: { eles, padding } }, { duration: 320 })
}

type Options = {
  data: AppData
  selectedId?: string | null
  onSelect: (nodeId: string | null) => void
  expanded?: boolean
}

export function useCytoscape({ data, selectedId = null, onSelect, expanded = false }: Options) {
  const container = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const navigate = useNavigate()
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!container.current) return
    const compact = isCompactViewport()
    const cy = cytoscape({
      container: container.current,
      elements: [
        ...data.graph.nodes.map(node => ({ data: { ...node } })),
        ...data.graph.edges.map(edge => ({ data: { ...edge } })),
      ],
      style: buildCyStyle(data) as cytoscape.StylesheetStyle[],
      layout: defaultLayoutOptions(compact, expanded, data.graph.nodes.length),
      minZoom: 0.22,
      maxZoom: 2.8,
      wheelSensitivity: 0.18,
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
      if (id) navigate(`/knowledge/${id}`)
    }

    cy.on('tap', 'node', onTapNode)
    cy.on('tap', onTapBackground)
    cy.on('dbltap', 'node', onDblTap)

    // Zoom-aware labels: hide non-discipline labels when zoomed out (large graphs)
    const updateLabels = () => {
      const z = cy.zoom()
      const threshold = data.graph.nodes.length > 120 ? 0.85 : 0.7
      cy.batch(() => {
        cy.nodes().forEach(n => {
          const isDisc = n.data('type') === 'discipline'
          const show = isDisc || z >= threshold || n.hasClass('map-selected') || n.hasClass('neighbor-node')
          n.style('text-opacity', show ? 1 : 0)
        })
      })
    }
    cy.on('zoom', updateLabels)
    updateLabels()

    return () => {
      cy.removeListener('tap', 'node', onTapNode)
      cy.removeListener('tap', onTapBackground)
      cy.removeListener('dbltap', 'node', onDblTap)
      cy.removeListener('zoom', updateLabels)
      cyRef.current = null
      cy.destroy()
    }
  }, [data, expanded, navigate])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    applySelection(cy, selectedId, reduceMotion)
    const z = cy.zoom()
    const threshold = data.graph.nodes.length > 120 ? 0.85 : 0.7
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
  }, [selectedId, reduceMotion, data])

  const resetView = () => {
    onSelectRef.current(null)
    const cy = cyRef.current
    if (!cy) return
    cy.elements().removeClass('faded neighbor-node neighbor-edge map-selected')
    cy.nodes().unselect()
    const padding = isCompactViewport() ? 28 : 48
    if (reduceMotion) cy.fit(undefined, padding)
    else cy.animate({ fit: { eles: cy.elements(), padding } }, { duration: 260 })
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
