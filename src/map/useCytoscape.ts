import { useEffect, useRef } from 'react'
import cytoscape, { type Core, type EventObject } from 'cytoscape'
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
  else cy.animate({ fit: { eles, padding } }, { duration: 280 })
}

type Options = {
  data: AppData
  selectedId?: string | null
  onSelect: (nodeId: string | null) => void
  className?: string
}

export function useCytoscape({ data, selectedId = null, onSelect }: Options) {
  const container = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
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
      layout: defaultLayoutOptions(compact),
      minZoom: 0.3,
      maxZoom: 2.4,
      wheelSensitivity: 0.22,
    })
    cyRef.current = cy

    const onTapNode = (event: EventObject) => {
      onSelectRef.current(event.target.id())
    }
    const onTapBackground = (event: EventObject) => {
      if (event.target === cy) onSelectRef.current(null)
    }
    cy.on('tap', 'node', onTapNode)
    cy.on('tap', onTapBackground)

    return () => {
      cy.removeListener('tap', 'node', onTapNode)
      cy.removeListener('tap', onTapBackground)
      cyRef.current = null
      cy.destroy()
    }
  }, [data])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    applySelection(cy, selectedId, reduceMotion)
  }, [selectedId, reduceMotion, data])

  const resetView = () => {
    onSelectRef.current(null)
    const cy = cyRef.current
    if (!cy) return
    cy.elements().removeClass('faded neighbor-node neighbor-edge map-selected')
    cy.nodes().unselect()
    const padding = isCompactViewport() ? 28 : 48
    if (reduceMotion) cy.fit(undefined, padding)
    else cy.animate({ fit: { eles: cy.elements(), padding } }, { duration: 240 })
  }

  const selectLocal = (node: GraphNode) => onSelectRef.current(node.id)

  return { container, cyRef, resetView, selectLocal, reduceMotion }
}

export { isCompactViewport }
