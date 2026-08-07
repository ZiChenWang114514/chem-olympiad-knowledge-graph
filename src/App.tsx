import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import cytoscape, { type Core, type EventObject } from 'cytoscape'
import katex from 'katex'
import MiniSearch from 'minisearch'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { AppData } from './lib/data'
import {
  disciplineColor,
  getFollowOns,
  getNeighbors,
  getPrerequisites,
  getRelatedProblems,
  groupNodesByDiscipline,
  nodeSize,
  nodeTypeLabel,
} from './lib/graph'
import type { GraphNode, Problem } from './types'

const nav = [
  { to: '/', label: '总览' },
  { to: '/graph', label: '知识图谱' },
  { to: '/exams', label: '真题档案' },
  { to: '/statistics', label: '统计研究' },
  { to: '/about', label: '来源与方法' },
]

type SearchHit = { id: string; kind: string; title: string; subtitle?: string }

function Shell({ children, data }: { children: ReactNode; data: AppData }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const formRef = useRef<HTMLFormElement>(null)

  const search = useMemo(() => {
    const m = new MiniSearch({ fields: ['title', 'subtitle', 'text'], storeFields: ['title', 'subtitle', 'kind', 'id'] })
    m.addAll(data.search)
    return m
  }, [data.search])

  const suggestions = useMemo(() => {
    const q = query.trim()
    if (!q) return [] as SearchHit[]
    return (search.search(q, { prefix: true, fuzzy: 0.2 }) as unknown as SearchHit[]).slice(0, 6)
  }, [query, search])

  const goHit = (hit: SearchHit) => {
    setOpen(false)
    setQuery('')
    setActive(0)
    if (hit.kind === 'problem') {
      navigate(`/exams/${hit.id}`)
      return
    }
    if (location.pathname === '/' || location.pathname === '') {
      navigate(`/?node=${encodeURIComponent(hit.id)}`)
      return
    }
    navigate(`/knowledge/${hit.id}`)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (!q) return
    if (suggestions[active]) {
      goHit(suggestions[active])
      return
    }
    if (suggestions[0]) {
      goHit(suggestions[0])
      return
    }
    setOpen(false)
    navigate(`/exams?q=${encodeURIComponent(q)}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setActive(0)
      ;(event.target as HTMLInputElement).blur()
      return
    }
    if (!open || !suggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(i => (i + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(i => (i - 1 + suggestions.length) % suggestions.length)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">χ</span>
          <span>
            化学竞赛
            <br />
            <b>知识图谱</b>
          </span>
        </Link>
        <form className="search" ref={formRef} onSubmit={submit} role="search">
          <span className="search-glyph" aria-hidden="true">
            ⌕
          </span>
          <input
            aria-label="搜索知识点、题目或年份"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setOpen(true)
              setActive(0)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 120)
            }}
            onKeyDown={onKeyDown}
            placeholder="搜索知识点、题目或年份"
            autoComplete="off"
          />
          <button type="submit" className="search-submit">
            搜索
          </button>
          {open && suggestions.length > 0 && (
            <ul id="search-suggestions" className="search-suggestions" role="listbox">
              {suggestions.map((hit, index) => (
                <li key={`${hit.kind}-${hit.id}`} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    className={index === active ? 'active' : ''}
                    data-testid={`suggest-${hit.kind}-${hit.id}`}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => goHit(hit)}
                  >
                    <span className={`suggest-kind${hit.kind === 'problem' ? ' is-problem' : ''}`}>
                      {hit.kind === 'problem' ? '题目' : '知识'}
                    </span>
                    <span className="suggest-main">
                      <b>{hit.title}</b>
                      {hit.subtitle ? <small>{hit.subtitle}</small> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        <div className="top-actions">
          <span className="version" title={data.statistics.note}>
            演示数据 2026.08
          </span>
        </div>
      </header>
      <nav className="nav" aria-label="主导航">
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className={location.pathname === '/' ? 'content home-content' : 'content'}>{children}</main>
      <footer>
        <span>化学竞赛知识图谱</span>
        <span>
          {data.statistics.totalExams} 组考试 · {data.statistics.totalProblems} 条题目元数据 · 演示数据，映射待核验
        </span>
        <Link to="/about">查看资料说明</Link>
      </footer>
    </div>
  )
}

function isCompactViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)').matches
}

function applySelection(cy: Core, nodeId: string | null, reduceMotion: boolean) {
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
  const padding = isCompactViewport() ? 24 : 48
  if (reduceMotion) {
    cy.fit(eles, padding)
  } else {
    cy.animate({ fit: { eles, padding } }, { duration: 280 })
  }
}

function buildCyStyle(data: AppData) {
  const colorOf = (id: string) => disciplineColor(data.taxonomy.disciplines, id)
  return [
    {
      selector: 'node',
      style: {
        'background-color': (el: cytoscape.NodeSingular) => colorOf(el.data('discipline')),
        'background-opacity': 0.96,
        label: 'data(label)',
        color: '#0f2a36',
        'font-size': 11.5,
        'font-family': 'Noto Sans SC, sans-serif',
        'font-weight': 500,
        'text-wrap': 'wrap',
        'text-max-width': 92,
        'text-valign': 'bottom',
        'text-margin-y': 7,
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.72,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        width: (el: cytoscape.NodeSingular) => nodeSize(el.data() as GraphNode),
        height: (el: cytoscape.NodeSingular) => nodeSize(el.data() as GraphNode),
        'border-width': 2.5,
        'border-color': 'rgba(255,255,255,0.92)',
        'overlay-opacity': 0,
        'shadow-blur': 12,
        'shadow-color': 'rgba(15,42,54,0.18)',
        'shadow-offset-x': 0,
        'shadow-offset-y': 2,
        'shadow-opacity': 0.35,
      },
    },
    {
      selector: 'node[type = "discipline"]',
      style: {
        'font-weight': 700,
        'font-size': 12,
        'border-width': 3,
        'border-color': 'rgba(255,255,255,0.95)',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.35,
        'line-color': '#c2d0d2',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#c2d0d2',
        'curve-style': 'bezier',
        'arrow-scale': 0.72,
        opacity: 0.88,
      },
    },
    {
      selector: 'edge[relation = "prerequisite"]',
      style: {
        width: 1.55,
        'line-color': '#9eb3b6',
        'target-arrow-color': '#9eb3b6',
      },
    },
    {
      selector: 'edge[relation = "belongs"]',
      style: {
        width: 1.15,
        'line-color': '#d0dbdc',
        'target-arrow-color': '#d0dbdc',
        'line-style': 'solid',
        opacity: 0.7,
      },
    },
    {
      selector: 'node.faded, edge.faded',
      style: { opacity: 0.2 },
    },
    {
      selector: 'node.neighbor-node',
      style: {
        'border-width': 3.5,
        'border-color': '#0a6b72',
        opacity: 1,
        'shadow-blur': 16,
        'shadow-color': 'rgba(10,107,114,0.28)',
        'shadow-opacity': 0.55,
      },
    },
    {
      selector: 'edge.neighbor-edge',
      style: {
        width: 2.6,
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
        'text-background-opacity': 0.88,
        'shadow-blur': 18,
        'shadow-color': 'rgba(196,90,40,0.35)',
        'shadow-opacity': 0.6,
      },
    },
  ]
}

function OverviewMap({ data }: { data: AppData }) {
  const container = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const selectedId = searchParams.get('node')
  const selected = data.graph.nodes.find(n => n.id === selectedId) || null
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const skipScrollRef = useRef(true)

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
      layout: {
        name: 'cose',
        animate: false,
        padding: compact ? 28 : 48,
        nodeRepulsion: () => 8200,
        idealEdgeLength: () => 104,
        gravity: 0.85,
        componentSpacing: compact ? 32 : 56,
        nestingFactor: 1.2,
      },
      minZoom: 0.35,
      maxZoom: 2.2,
      wheelSensitivity: 0.25,
    })
    cyRef.current = cy

    const onTapNode = (event: EventObject) => {
      const id = event.target.id()
      setSearchParams({ node: id }, { replace: true })
    }
    const onTapBackground = (event: EventObject) => {
      if (event.target === cy) setSearchParams({}, { replace: true })
    }
    cy.on('tap', 'node', onTapNode)
    cy.on('tap', onTapBackground)

    return () => {
      cy.removeListener('tap', 'node', onTapNode)
      cy.removeListener('tap', onTapBackground)
      cyRef.current = null
      cy.destroy()
    }
  }, [data, setSearchParams])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    applySelection(cy, selectedId, reduceMotion)
  }, [selectedId, reduceMotion, data])

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false
      return
    }
    if (!selectedId || !panelRef.current) return
    if (window.matchMedia('(max-width: 800px)').matches) {
      panelRef.current.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }, [selectedId, reduceMotion])

  const resetView = () => {
    setSearchParams({}, { replace: true })
    const cy = cyRef.current
    if (!cy) return
    cy.elements().removeClass('faded neighbor-node neighbor-edge map-selected')
    cy.nodes().unselect()
    const padding = isCompactViewport() ? 24 : 40
    if (reduceMotion) cy.fit(undefined, padding)
    else cy.animate({ fit: { eles: cy.elements(), padding } }, { duration: 240 })
  }

  const selectNode = (id: string) => setSearchParams({ node: id }, { replace: true })

  const relationName = (id: string) => data.taxonomy.relations.find(r => r.id === id || r.predicate === id)?.name || id
  const neighbors = selected ? getNeighbors(selected.id, data.graph.edges, data.graph.nodes) : []
  const prereq = selected ? getPrerequisites(selected.id, data.graph.edges, data.graph.nodes) : []
  const follow = selected ? getFollowOns(selected.id, data.graph.edges, data.graph.nodes) : []
  const related = selected ? getRelatedProblems(selected.id, data.problems) : []
  // 空态列表不重复学科节点（学科仍可在图上点选）
  const groups = groupNodesByDiscipline(data.graph.nodes, data.taxonomy.disciplines)
    .map(group => ({ ...group, nodes: group.nodes.filter(n => n.type !== 'discipline') }))
    .filter(group => group.nodes.length > 0)

  return (
    <section className="map-workspace" data-testid="home-map">
      <div className="map-toolbar">
        <p className="map-hint">点节点查看相邻知识、相关题目与学习次序。</p>
        <div className="map-legend" aria-label="学科颜色图例">
          {data.taxonomy.disciplines.map(d => (
            <span key={d.id}>
              <i style={{ background: d.color }} />
              {d.name}
            </span>
          ))}
        </div>
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
      <div className="map-body">
        <div ref={container} className="overview-cy" data-testid="map-canvas" aria-label="化学知识网络总览" />
        <aside className="map-panel" ref={panelRef} data-testid="map-panel">
          {selected ? (
            <>
              <div
                className="panel-head"
                style={
                  {
                    '--panel-accent': disciplineColor(data.taxonomy.disciplines, selected.discipline),
                  } as CSSProperties
                }
              >
                <h2 data-testid="panel-title">{selected.label}</h2>
                <p className="panel-meta">
                  <span className="panel-meta-pill">
                    {data.taxonomy.disciplines.find(d => d.id === selected.discipline)?.name || selected.discipline}
                  </span>
                  <span className="panel-meta-pill">{nodeTypeLabel(selected.type)}</span>
                </p>
              </div>

              <h3>相邻知识</h3>
              {neighbors.length ? (
                <ul className="relation-list">
                  {neighbors.map(item => (
                    <li key={item.edgeId}>
                      <span className="relation-type">{relationName(item.relation)}</span>
                      <button type="button" onClick={() => selectNode(item.other.id)} data-testid={`neighbor-${item.other.id}`}>
                        {item.other.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">暂无相邻关系标注。</p>
              )}

              <h3>建议先学</h3>
              {prereq.length ? (
                <ul className="relation-list">
                  {prereq.map(node => (
                    <li key={node.id}>
                      <span className="relation-type">先修于当前</span>
                      <button type="button" onClick={() => selectNode(node.id)} data-testid={`prereq-${node.id}`}>
                        {node.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">暂无先修标注。</p>
              )}

              <h3>可继续学习</h3>
              {follow.length ? (
                <ul className="relation-list">
                  {follow.map(node => (
                    <li key={node.id}>
                      <span className="relation-type">以当前为先修</span>
                      <button type="button" onClick={() => selectNode(node.id)} data-testid={`follow-${node.id}`}>
                        {node.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">暂无后续标注。</p>
              )}

              <h3>相关历年题目</h3>
              {related.length ? (
                <ul className="problem-mini-list">
                  {related.map(problem => {
                    const exam = data.exams.find(e => e.id === problem.examId)
                    return (
                      <li key={problem.id}>
                        <Link to={`/exams/${problem.id}`} data-testid={`related-problem-${problem.id}`}>
                          <b>
                            {exam?.year} · {exam?.stage} · {problem.number}
                          </b>
                          <span>{problem.title.replace(/^基础设施演示记录：/, '')}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="muted" data-testid="problems-pending">
                  该节点尚无公开的节点级题目映射，待标注。
                </p>
              )}

              <button type="button" className="secondary full" onClick={() => navigate(`/knowledge/${selected.id}`)} data-testid="open-knowledge">
                打开知识页
              </button>
            </>
          ) : (
            <>
              <h2>选择知识节点</h2>
              <p className="muted">点图中的节点，或从下方列表选择。列表便于键盘操作。</p>
              <div className="node-picker" data-testid="node-picker">
                {groups.map(group => (
                  <div
                    key={group.discipline.id}
                    className="node-picker-group"
                    style={{ '--pick-accent': group.discipline.color } as CSSProperties}
                  >
                    <h3>
                      <i style={{ background: group.discipline.color, color: group.discipline.color }} />
                      {group.discipline.name}
                    </h3>
                    <ul>
                      {group.nodes.map(node => (
                        <li key={node.id}>
                          <button
                            type="button"
                            onClick={() => selectNode(node.id)}
                            data-testid={`node-pick-${node.id}`}
                            style={{ '--pick-accent': group.discipline.color } as CSSProperties}
                          >
                            {node.label}
                            <small>{nodeTypeLabel(node.type)}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}

function Home({ data }: { data: AppData }) {
  return <OverviewMap data={data} />
}

function GraphView({ data }: { data: AppData }) {
  const container = useRef<HTMLDivElement>(null)
  const graph = useRef<Core | null>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const navigate = useNavigate()
  const relationName = (id: string) => data.taxonomy.relations.find(r => r.id === id || r.predicate === id)?.name || id

  useEffect(() => {
    if (!container.current) return
    const cy = cytoscape({
      container: container.current,
      elements: [
        ...data.graph.nodes.map(node => ({ data: node })),
        ...data.graph.edges.map(edge => ({ data: edge })),
      ],
      style: buildCyStyle(data) as cytoscape.StylesheetStyle[],
      layout: { name: 'cose', animate: false, padding: 30, nodeRepulsion: () => 6800, idealEdgeLength: () => 88 },
      minZoom: 0.35,
      maxZoom: 2.2,
    })
    graph.current = cy
    cy.on('tap', 'node', event => setSelected(event.target.data() as GraphNode))
    return () => {
      graph.current = null
      cy.destroy()
    }
  }, [data])

  const reset = () => {
    graph.current?.fit(undefined, 30)
    graph.current?.center()
    setSelected(null)
  }
  const neighbors = selected ? getNeighbors(selected.id, data.graph.edges, data.graph.nodes) : []

  return (
    <>
      <div className="page-title">
        <div>
          <h1>知识图谱</h1>
          <p>从学科进入具体节点；关系同时提供图形和文字列表。</p>
        </div>
        <div className="legend">
          {data.taxonomy.disciplines.map(discipline => (
            <span key={discipline.id}>
              <i style={{ background: discipline.color }} />
              {discipline.name}
            </span>
          ))}
        </div>
      </div>
      <div className="graph-layout">
        <div className="graph-card">
          <div className="graph-toolbar">
            <span>
              {data.graph.nodes.length} 个节点 · {data.graph.edges.length} 条关系
            </span>
            <button type="button" onClick={reset}>
              恢复总览
            </button>
          </div>
          <div ref={container} className="cy" aria-label="化学知识关系图" />
          <div className="graph-hint">选择节点后查看相邻关系；也可用右侧文字列表。</div>
        </div>
        <aside className="detail-panel">
          {selected ? (
            <>
              <h2>{selected.label}</h2>
              <span className="pill" style={{ background: disciplineColor(data.taxonomy.disciplines, selected.discipline) }}>
                {data.taxonomy.disciplines.find(d => d.id === selected.discipline)?.name}
              </span>
              <p className="panel-copy">
                {nodeTypeLabel(selected.type)} · 相邻关系 {neighbors.length} 条
              </p>
              <h3>
                相邻关系 <small>{neighbors.length}</small>
              </h3>
              <ul className="relation-list">
                {neighbors.map(item => (
                  <li key={item.edgeId}>
                    <span className="relation-type">{relationName(item.relation)}</span>
                    <button type="button" onClick={() => setSelected(item.other)}>
                      {item.other.label}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="secondary full" onClick={() => navigate(`/knowledge/${selected.id}`)}>
                打开知识页
              </button>
            </>
          ) : (
            <div className="empty-panel">
              <h3>请选择节点</h3>
              <p>选择后可查看文字关系列表。</p>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

function Exams({ data }: { data: AppData }) {
  const params = new URLSearchParams(useLocation().search)
  const [stage, setStage] = useState('全部')
  const [year, setYear] = useState('全部')
  const [query, setQuery] = useState(params.get('q') || '')
  const filtered = data.problems.filter(problem => {
    const exam = data.exams.find(item => item.id === problem.examId)
    return (
      (stage === '全部' || exam?.stage === stage) &&
      (year === '全部' || String(exam?.year) === year) &&
      (!query || `${problem.title}${problem.number}`.includes(query))
    )
  })
  return (
    <>
      <div className="page-title split">
        <div>
          <h1>真题档案</h1>
          <p>按年份、考试阶段和主题查看题目元数据与知识映射。</p>
        </div>
        <span className="archive-count">
          {filtered.length} <small>条记录</small>
        </span>
      </div>
      <div className="filters">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="筛选题号或主题" aria-label="筛选题目" />
        <select value={stage} onChange={event => setStage(event.target.value)}>
          <option>全部</option>
          <option>初赛</option>
          <option>决赛</option>
        </select>
        <select value={year} onChange={event => setYear(event.target.value)}>
          <option>全部</option>
          {[...new Set(data.exams.map(exam => exam.year))]
            .sort()
            .map(item => (
              <option key={item}>{item}</option>
            ))}
        </select>
      </div>
      <div className="exam-list">
        {filtered.map(problem => (
          <ProblemCard key={problem.id} problem={problem} exam={data.exams.find(exam => exam.id === problem.examId)!} data={data} />
        ))}
      </div>
    </>
  )
}

function ProblemCard({ problem, exam, data }: { problem: Problem; exam: AppData['exams'][number]; data: AppData }) {
  return (
    <Link to={`/exams/${problem.id}`} className="problem-card">
      <span className="problem-year">
        {exam.year}
        <small>{exam.stage}</small>
      </span>
      <span className="problem-main">
        <b>
          {problem.number} · {problem.title}
        </b>
        <span>
          {problem.disciplines.map(id => data.taxonomy.disciplines.find(discipline => discipline.id === id)?.name).join(' / ')} ·{' '}
          {problem.mappingCount} 个知识映射
        </span>
      </span>
      <span className="difficulty">难度 {problem.difficulty}/5</span>
      <span className="problem-action">查看记录</span>
    </Link>
  )
}

function Knowledge({ data }: { data: AppData }) {
  const { id } = useParams()
  const node = data.graph.nodes.find(item => item.id === id) || data.graph.nodes.find(item => item.type !== 'discipline')!
  const relations = getNeighbors(node.id, data.graph.edges, data.graph.nodes)
  const linked = getRelatedProblems(node.id, data.problems)
  return (
    <>
      <Link to="/graph" className="back">
        ← 返回知识图谱
      </Link>
      <section className="knowledge-head">
        <span className="topic-icon large" style={{ background: disciplineColor(data.taxonomy.disciplines, node.discipline) }}>
          {node.label.slice(0, 1)}
        </span>
        <div>
          <p className="page-kicker">
            {data.taxonomy.disciplines.find(d => d.id === node.discipline)?.name} · {nodeTypeLabel(node.type)}
          </p>
          <h1>{node.label}</h1>
          <p>
            节点 ID：{node.id} · 重要度 {node.importance || 3}/5
          </p>
        </div>
      </section>
      <div className="knowledge-grid">
        <article className="article">
          <h2>知识说明</h2>
          <p>本页汇总该知识点在竞赛资料中的位置、相邻关系和历年考查索引。讲义内容将在完成来源核验后逐步补充。</p>
          <div className="notice">
            <span>ⓘ</span>
            <div>
              <b>公开范围：元数据</b>
              <br />
              题目原文、参考答案和评分材料仍保存在受控资料库。
            </div>
          </div>
          <h2>相关真题</h2>
          {linked.length ? (
            linked.map(problem => (
              <Link className="mini-problem" to={`/exams/${problem.id}`} key={problem.id}>
                <b>
                  {data.exams.find(exam => exam.id === problem.examId)?.year} · {problem.number}
                </b>
                <span>{problem.title}</span>
                <span className="text-link">查看</span>
              </Link>
            ))
          ) : (
            <p className="muted">该节点尚无公开的节点级题目映射，待标注。</p>
          )}
        </article>
        <aside className="side-card">
          <h3>
            关系清单 <small>{relations.length}</small>
          </h3>
          <ul className="relation-list">
            {relations.map(item => (
              <li key={item.edgeId}>
                <span className="relation-type">{data.taxonomy.relations.find(relation => relation.id === item.relation || relation.predicate === item.relation)?.name || item.relation}</span>
                <Link to={`/knowledge/${item.other.id}`}>{item.other.label}</Link>
              </li>
            ))}
          </ul>
          <h3>学习提示</h3>
          <p className="muted">先阅读相邻节点，再回看题目中的综合考查关系。</p>
        </aside>
      </div>
    </>
  )
}

function ExamDetail({ data }: { data: AppData }) {
  const { id } = useParams()
  const problem = data.problems.find(item => item.id === id)
  if (!problem) return <NotFound />
  const exam = data.exams.find(item => item.id === problem.examId)!
  const mappedNodes = (problem.nodeIds || []).map(nid => data.graph.nodes.find(n => n.id === nid)).filter((n): n is GraphNode => Boolean(n))
  const sourceDocumentId = problem.sourceDocumentId || exam.sourceDocumentId
  const sourceLabel = problem.sourceLabel || exam.sourceLabel
  const sourceVersion = problem.sourceVersion || exam.sourceVersion
  const sourcePage = problem.page ?? exam.page
  return (
    <>
      <Link to="/exams" className="back">
        ← 返回真题档案
      </Link>
      <section className="detail-title">
        <span className="problem-year big">
          {exam.year}
          <small>{exam.stage}</small>
        </span>
        <div>
          <p className="page-kicker">{exam.title}</p>
          <h1>
            {problem.number} · {problem.title}
          </h1>
          <p>
            {problem.disciplines.map(discipline => data.taxonomy.disciplines.find(item => item.id === discipline)?.name).join(' / ')} · 难度{' '}
            {problem.difficulty}/5
          </p>
        </div>
      </section>
      <div className="notice wide">
        <span>ⓘ</span>
        <div>
          <b>题文暂不公开</b>
          <br />
          {problem.summary} 来源：{sourceLabel}。
        </div>
      </div>
      <section className="detail-columns">
        <article>
          <h2>知识映射</h2>
          {mappedNodes.length ? (
            <div className="mapping-box">
              {mappedNodes.map(node => (
                <Link to={`/knowledge/${node.id}`} key={node.id}>
                  <span style={{ background: disciplineColor(data.taxonomy.disciplines, node.discipline) }}>{node.label.slice(0, 1)}</span>
                  <b>{node.label}</b>
                  <small>{nodeTypeLabel(node.type)}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">该题尚无公开的节点级知识映射，待标注。</p>
          )}
        </article>
        <aside className="source-card">
          <h3>来源记录</h3>
          <dl>
            <dt>公开状态</dt>
            <dd>metadata_public</dd>
            <dt>题目编号</dt>
            <dd>{problem.id}</dd>
            <dt>资料来源</dt>
            <dd>
              {sourceDocumentId && <>{sourceDocumentId} · </>}{sourceLabel}
              {sourceVersion && <> · 版本 {sourceVersion}</>}
              {sourcePage !== undefined && <> · 第 {sourcePage} 页</>}
            </dd>
            <dt>知识映射</dt>
            <dd>{problem.mappingCount} 个</dd>
          </dl>
          <Link to="/about" className="text-link">
            查看来源规范
          </Link>
        </aside>
      </section>
    </>
  )
}

function Statistics({ data }: { data: AppData }) {
  const max = Math.max(...data.statistics.yearCounts.map(item => item.value), 1)
  return (
    <>
      <div className="page-title">
        <div>
          <h1>统计研究</h1>
          <p>从公开元数据查看题目覆盖与知识分布，数据会随审核批次更新。</p>
        </div>
      </div>
      <section className="metric-grid">
        <div>
          <span>知识节点</span>
          <strong>{data.graph.nodes.length}</strong>
          <small>与图谱数据一致</small>
        </div>
        <div>
          <span>题目元数据</span>
          <strong>{data.statistics.totalProblems}</strong>
          <small>初赛与决赛</small>
        </div>
        <div>
          <span>关系数量</span>
          <strong>{data.graph.edges.length}</strong>
          <small>可追溯关系</small>
        </div>
      </section>
      <div className="charts">
        <section className="chart-card">
          <h2>学科覆盖</h2>
          <div className="bars">
            {data.statistics.disciplineCounts.map(item => (
              <div className="bar-row" key={item.name}>
                <span>{item.name}</span>
                <div>
                  <i style={{ width: `${Math.max(8, (item.value / 3) * 100)}%`, background: item.color }} />
                </div>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="chart-card">
          <h2>年份样本</h2>
          <div className="year-chart">
            {data.statistics.yearCounts.map(item => (
              <div key={item.year}>
                <div className="column" style={{ height: `${(item.value / max) * 150}px` }}>
                  <b>{item.value}</b>
                </div>
                <span>{item.year}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="data-note">ⓘ {data.statistics.note}</p>
    </>
  )
}

function About() {
  const formula = katex.renderToString(String.raw`\ce{2H2 + O2 -> 2H2O}`, { throwOnError: false })
  return (
    <>
      <div className="page-title">
        <div>
          <h1>来源与方法</h1>
          <p>这里说明公开范围、来源记录和知识标注方法。</p>
        </div>
      </div>
      <div className="about-grid">
        <article className="article">
          <h2>公开内容</h2>
          <p>网站发布考试年份、题号、主题、知识映射和来源索引等元数据。未经授权的题目原文、答案、扫描件和内部文件不会发布。</p>
          <h2>知识标注</h2>
          <p>题目录入按“考试—整题—小问—知识节点—关系”组织。新节点进入人工审核队列；每条映射保留来源文件哈希、页码和审核状态。</p>
          <p className="formula" aria-label="化学方程式排版示例" dangerouslySetInnerHTML={{ __html: formula }} />
          <h2>资料状态</h2>
          <div className="status-list">
            <div>
              <i className="dot green" />
              <b>metadata_public</b>
              <span>可公开元数据</span>
            </div>
            <div>
              <i className="dot amber" />
              <b>internal_only</b>
              <span>仅本地管理台可见</span>
            </div>
            <div>
              <i className="dot blue" />
              <b>fulltext_authorized</b>
              <span>取得授权后可展示全文</span>
            </div>
          </div>
        </article>
        <aside className="side-card">
          <h3>数据版本</h3>
          <p className="data-version">2026.08-demo</p>
          <p className="muted">当前版本用于展示网站结构和查询方式。演示映射不能当作正式真题结论。</p>
          <hr />
          <h3>建议引用</h3>
          <p className="muted">化学竞赛知识图谱，数据版本 2026.08（演示）。</p>
        </aside>
      </div>
    </>
  )
}

function NotFound() {
  return (
    <div className="empty-page">
      <h1>没有找到这条记录</h1>
      <Link to="/">返回总览</Link>
    </div>
  )
}

export default function App({ data }: { data: AppData }) {
  return (
    <Shell data={data}>
      <Routes>
        <Route path="/" element={<Home data={data} />} />
        <Route path="/graph" element={<GraphView data={data} />} />
        <Route path="/exams" element={<Exams data={data} />} />
        <Route path="/exams/:id" element={<ExamDetail data={data} />} />
        <Route path="/knowledge/:id" element={<Knowledge data={data} />} />
        <Route path="/statistics" element={<Statistics data={data} />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
