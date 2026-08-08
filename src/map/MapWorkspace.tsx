import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { DISPLAY_DISCIPLINES, displayDisciplineFor, displayDisciplineForNode } from '../lib/displayTaxonomy'
import { relationLabel } from '../lib/graph'
import { buildVisibleGraph } from '../lib/visibleGraph'
import { DisciplineRail } from './DisciplineRail'
import { Inspector } from './Inspector'
import { isCompactViewport, useCytoscape } from './useCytoscape'

export function MapWorkspace({ data }: { data: AppData }) {
  const workspaceRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [topicId, setTopicId] = useState<string>()
  const [legendOpen, setLegendOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(() => {
    try { return localStorage.getItem('chem-map-help-seen') !== '1' } catch { return false }
  })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const selectedId = searchParams.get('node') || undefined
  const selected = data.graph.nodes.find(node => node.id === selectedId) || null
  const selectedDiscipline = selected ? displayDisciplineForNode(selected, data.graph).id : undefined
  const requestedDiscipline = searchParams.get('discipline') || selectedDiscipline
  const activeDiscipline = DISPLAY_DISCIPLINES.some(item => item.id === requestedDiscipline)
    ? requestedDiscipline
    : undefined
  const relation = searchParams.get('relation') || undefined

  const visible = useMemo(() => buildVisibleGraph(data.graph, {
    disciplineId: activeDiscipline,
    topicId,
    nodeId: selectedId,
    relation,
  }), [activeDiscipline, data.graph, relation, selectedId, topicId])

  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  const onGraphSelect = (id: string | null) => {
    if (!id) {
      updateParams({ node: undefined })
      return
    }
    const sourceTopic = visible.topicNodeSources[id]
    if (sourceTopic) {
      const display = displayDisciplineFor(sourceTopic)
      const topic = display.topics.find(item => item.sourceDisciplineId === sourceTopic)
      updateParams({ discipline: display.id, node: undefined })
      setTopicId(topic?.id)
      return
    }
    const node = data.graph.nodes.find(item => item.id === id)
    updateParams({ node: id, discipline: node ? displayDisciplineForNode(node, data.graph).id : activeDiscipline })
  }

  const { container, resetView, reduceMotion, focusNeighborhood } = useCytoscape({
    data,
    graph: visible,
    selectedId,
    onSelect: onGraphSelect,
  })

  useEffect(() => {
    if (!selectedId || !panelRef.current || !isCompactViewport()) return
    panelRef.current.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [reduceMotion, selectedId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !selectedId) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      updateParams({ node: undefined })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(document.fullscreenElement === workspaceRef.current)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  const resetGraph = () => {
    setTopicId(undefined)
    resetView()
    setSearchParams({}, { replace: true })
  }

  const toggleFullscreen = async () => {
    if (!workspaceRef.current) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await workspaceRef.current.requestFullscreen()
  }

  return (
    <section
      ref={workspaceRef}
      className={`map-workspace${selected ? ' has-selection' : ''}`}
      data-testid="home-map"
    >
      <div className="map-body">
        <DisciplineRail
          data={data}
          activeDisciplineId={activeDiscipline}
          activeTopicId={topicId}
          onDiscipline={id => {
            setTopicId(undefined)
            updateParams({ discipline: id, node: undefined })
          }}
          onTopic={setTopicId}
          onNode={id => onGraphSelect(id)}
        />

        <div className="map-stage">
          <div ref={container} className="overview-cy" data-testid="map-canvas" aria-label="化学知识关系图" />
          {showHelp ? (
            <div className="map-help" role="status">
              <span>滚轮缩放，拖拽移动，选择节点查看关系。</span>
              <button type="button" onClick={() => {
                setShowHelp(false)
                try { localStorage.setItem('chem-map-help-seen', '1') } catch { /* 浏览器禁用存储时只关闭本次提示 */ }
              }}>知道了</button>
            </div>
          ) : null}
        </div>

        {selected ? <button type="button" className="sheet-backdrop" aria-label="清除选择" onClick={() => onGraphSelect(null)} /> : null}
        <Inspector ref={panelRef} data={data} selected={selected} onSelect={id => onGraphSelect(id)} onClear={() => onGraphSelect(null)} />
      </div>

      <div className="map-statusbar">
        <div className="map-scope">
          <strong>{activeDiscipline ? DISPLAY_DISCIPLINES.find(item => item.id === activeDiscipline)?.name : '全部学科'}</strong>
          <span data-testid="map-counts">显示 {visible.nodes.length} / {visible.totalNodes} 个节点 · {visible.edges.length} 条关系</span>
        </div>
        <div className="map-controls">
          <label>
            <span>关系</span>
            <select value={relation || ''} onChange={event => updateParams({ relation: event.target.value || undefined })}>
              <option value="">全部</option>
              {data.taxonomy.relations.map(item => (
                <option key={item.id} value={item.predicate}>{relationLabel(item.predicate, item.name)}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setLegendOpen(value => !value)} aria-expanded={legendOpen}>图例</button>
          {selectedId ? <button type="button" onClick={focusNeighborhood}>聚焦关系</button> : null}
          <button type="button" onClick={resetGraph} data-testid="map-reset">复位图谱</button>
          <button type="button" onClick={toggleFullscreen}>{isFullscreen ? '退出全屏' : '全屏浏览'}</button>
        </div>
      </div>

      {legendOpen ? (
        <div className="map-legend" aria-label="图谱图例">
          {DISPLAY_DISCIPLINES.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.name}</span>)}
          <span><i className="shape concept" />概念</span>
          <span><i className="shape method" />方法</span>
          <span><i className="shape skill" />技能</span>
        </div>
      ) : null}
    </section>
  )
}
