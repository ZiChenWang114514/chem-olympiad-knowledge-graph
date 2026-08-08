import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { Inspector } from './Inspector'
import { isCompactViewport, useCytoscape } from './useCytoscape'

type Mode = 'overview' | 'expanded'

export function MapWorkspace({ data, mode }: { data: AppData; mode: Mode }) {
  const panelRef = useRef<HTMLElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('node')
  const selected = data.graph.nodes.find(n => n.id === selectedId) || null
  const skipScrollRef = useRef(true)
  const [legendOpen, setLegendOpen] = useState(false)

  const onSelect = (id: string | null) => {
    if (id) setSearchParams({ node: id }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  const { container, resetView, reduceMotion, focusNeighborhood } = useCytoscape({
    data,
    selectedId,
    onSelect,
    expanded: mode === 'expanded',
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

  // Esc clears selection when workspace focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedId) {
        const t = e.target as HTMLElement | null
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
        onSelect(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const title = mode === 'expanded' ? '知识图谱' : null

  return (
    <section
      className={`map-workspace mode-${mode}${selected ? ' has-selection' : ''}`}
      data-testid="home-map"
    >
      {title ? (
        <div className="workspace-page-title">
          <h1>{title}</h1>
          <p>按学科排列；单击节点查看关联内容，双击查看知识点。</p>
        </div>
      ) : null}

      <div className="map-toolbar">
        <div className="map-toolbar-row">
          <p className="map-hint">
            {mode === 'expanded'
              ? '缩放图谱可以查看节点标签，按 Esc 清除选择。'
              : '单击节点查看相关知识、历年题目和先修关系。'}
          </p>
          <div className="map-toolbar-actions">
            <span className="map-counts" data-testid="map-counts">
              {data.graph.nodes.length} 节点 · {data.graph.edges.length} 关系
            </span>
            <button
              type="button"
              className={`toolbar-btn${legendOpen ? ' is-active' : ''}`}
              onClick={() => setLegendOpen(v => !v)}
              aria-expanded={legendOpen}
            >
              图例
            </button>
            {selectedId ? (
              <button type="button" className="toolbar-btn" onClick={focusNeighborhood}>
                只看相关节点
              </button>
            ) : null}
            <button type="button" className="toolbar-btn" onClick={resetView} data-testid="map-reset">
              复位视图
            </button>
            {mode === 'overview' ? (
              <Link
                className="toolbar-link"
                to={selectedId ? `/graph?node=${encodeURIComponent(selectedId)}` : '/graph'}
              >
                完整图谱
              </Link>
            ) : (
              <Link className="toolbar-link" to={selectedId ? `/?node=${encodeURIComponent(selectedId)}` : '/'}>
                返回总览
              </Link>
            )}
          </div>
        </div>
        {legendOpen ? (
          <div className="map-legend" aria-label="学科颜色图例">
            {data.taxonomy.disciplines.map(d => (
              <span key={d.id}>
                <i style={{ background: d.color }} />
                {d.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="map-body">
        <div className="map-stage">
          <div
            ref={container}
            className={mode === 'expanded' ? 'cy overview-cy' : 'overview-cy'}
            data-testid="map-canvas"
            aria-label={mode === 'expanded' ? '化学知识关系图' : '化学知识网络总览'}
          />
          {!selected ? (
            <div className="map-stage-hint" aria-hidden="true">
              <span>滚轮缩放 · 拖拽平移 · 点击选中</span>
            </div>
          ) : null}
        </div>
        {selected ? (
          <button type="button" className="sheet-backdrop" aria-label="关闭节点详情" onClick={() => onSelect(null)} />
        ) : null}
        <Inspector
          ref={panelRef}
          data={data}
          selected={selected}
          onSelect={id => onSelect(id)}
          onClear={() => onSelect(null)}
          compact={mode === 'overview'}
        />
      </div>
    </section>
  )
}
