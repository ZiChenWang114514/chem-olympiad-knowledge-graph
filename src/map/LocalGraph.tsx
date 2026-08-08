import { useEffect, useMemo, useState } from 'react'
import type { AppData } from '../lib/data'
import { useCytoscape } from './useCytoscape'

export function LocalGraph({ data, nodeId }: { data: AppData; nodeId: string }) {
  const [selectedId, setSelectedId] = useState(nodeId)
  useEffect(() => setSelectedId(nodeId), [nodeId])

  const graph = useMemo(() => {
    const adjacent = data.graph.edges.filter(edge => edge.source === nodeId || edge.target === nodeId)
    const ids = new Set([nodeId])
    adjacent.forEach(edge => { ids.add(edge.source); ids.add(edge.target) })
    const center = data.graph.nodes.find(node => node.id === nodeId)
    const neighbors = data.graph.nodes.filter(node => node.id !== nodeId && ids.has(node.id)).slice(0, 23)
    const nodes = center ? [center, ...neighbors] : neighbors
    const visibleIds = new Set(nodes.map(node => node.id))
    return {
      nodes,
      edges: adjacent.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).slice(0, 36),
    }
  }, [data.graph, nodeId])

  const { container, resetView } = useCytoscape({
    data,
    graph,
    selectedId,
    onSelect: id => setSelectedId(id || nodeId),
  })

  return (
    <div className="local-graph-wrap">
      <div ref={container} className="local-graph" aria-label="局部知识关系图" />
      <button type="button" className="text-action" onClick={resetView}>复位局部图</button>
    </div>
  )
}
