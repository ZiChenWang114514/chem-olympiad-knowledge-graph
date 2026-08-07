import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { MapPanel } from './MapPanel'
import { isCompactViewport, useCytoscape } from './useCytoscape'

export function OverviewMap({ data }: { data: AppData }) {
  const panelRef = useRef<HTMLElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('node')
  const selected = data.graph.nodes.find(n => n.id === selectedId) || null
  const skipScrollRef = useRef(true)

  const onSelect = (id: string | null) => {
    if (id) setSearchParams({ node: id }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  const { container, resetView, reduceMotion } = useCytoscape({
    data,
    selectedId,
    onSelect,
  })

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false
      return
    }
    if (!selectedId || !panelRef.current) return
    if (isCompactViewport()) {
      panelRef.current.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }, [selectedId, reduceMotion])

  return (
    <section className="map-workspace" data-testid="home-map">
      <div className="map-toolbar">
        <div className="map-toolbar-row">
          <p className="map-hint">点节点查看相邻知识、相关题目与学习次序。</p>
          <div className="map-toolbar-actions">
            <span className="map-counts" data-testid="map-counts">
              {data.graph.nodes.length} 节点 · {data.graph.edges.length} 关系
            </span>
            <button type="button" className="toolbar-btn" onClick={resetView} data-testid="map-reset">
              复位视图
            </button>
            <Link className="toolbar-link" to="/graph">
              完整图谱
            </Link>
          </div>
        </div>
        <div className="map-legend" aria-label="学科颜色图例">
          {data.taxonomy.disciplines.map(d => (
            <span key={d.id}>
              <i style={{ background: d.color }} />
              {d.name}
            </span>
          ))}
        </div>
      </div>
      <div className="map-body">
        <div ref={container} className="overview-cy" data-testid="map-canvas" aria-label="化学知识网络总览" />
        <MapPanel ref={panelRef} data={data} selected={selected} onSelect={id => onSelect(id)} />
      </div>
    </section>
  )
}
