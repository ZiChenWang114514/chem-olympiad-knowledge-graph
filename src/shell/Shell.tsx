import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import MiniSearch from 'minisearch'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayDisciplineForNode } from '../lib/displayTaxonomy'
import { CommandPalette } from './CommandPalette'

const nav = [
  { to: '/', label: '图谱', icon: 'map' },
  { to: '/exams', label: '真题', icon: 'archive' },
  { to: '/statistics', label: '统计', icon: 'chart' },
  { to: '/about', label: '方法', icon: 'book' },
] as const

type SearchHit = { id: string; kind: string; title: string; subtitle?: string }

function NavIcon({ name }: { name: typeof nav[number]['icon'] }) {
  if (name === 'map') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4M8 13l8 4"/></svg>
  if (name === 'archive') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14v12H5zM4 4h16v3H4zM9 11h6"/></svg>
  if (name === 'chart') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9M12 19V5M19 19v-7"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 017.5 2H12v17H7.5A3.5 3.5 0 004 22zM20 5.5A3.5 3.5 0 0016.5 2H12v17h4.5A3.5 3.5 0 0120 22z"/></svg>
}

export function Shell({ children, data }: { children: ReactNode; data: AppData }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const search = useMemo(() => {
    const index = new MiniSearch({ fields: ['title', 'subtitle', 'text'], storeFields: ['title', 'subtitle', 'kind', 'id'] })
    index.addAll(data.search)
    return index
  }, [data.search])

  const suggestions = useMemo(() => {
    const term = query.trim()
    if (!term) return [] as SearchHit[]
    return (search.search(term, { prefix: true, fuzzy: 0.2 }) as unknown as SearchHit[]).slice(0, 8)
  }, [query, search])

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const goHit = (hit: SearchHit) => {
    setOpen(false)
    setQuery('')
    setActive(0)
    if (hit.kind === 'problem') {
      navigate(`/exams/${hit.id}`)
      return
    }
    const node = data.graph.nodes.find(item => item.id === hit.id)
    const discipline = node ? displayDisciplineForNode(node, data.graph).id : undefined
    const params = new URLSearchParams({ node: hit.id })
    if (discipline) params.set('discipline', discipline)
    navigate(`/?${params.toString()}`)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const term = query.trim()
    const hit = suggestions[active] || suggestions[0]
    if (hit) goHit(hit)
    else if (term) navigate(`/exams?q=${encodeURIComponent(term)}`)
    else setPaletteOpen(true)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setActive(0)
      return
    }
    if (!open || !suggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(index => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(index => (index - 1 + suggestions.length) % suggestions.length)
    }
  }

  const isWorkspace = location.pathname === '/' || location.pathname === '' || location.pathname === '/graph'

  return (
    <div className={`app${isWorkspace ? ' is-workspace' : ''}`}>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="command-bar">
        <Link to="/" className="brand" aria-label="化学竞赛知识图谱">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
              <circle cx="11" cy="12" r="3" fill="currentColor" />
              <circle cx="21" cy="12" r="3" fill="currentColor" />
              <circle cx="16" cy="21" r="3" fill="currentColor" />
              <path d="M13.5 13.5L15 18M18.5 13.5L17 18M14 12h4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="brand-text"><b>化学竞赛知识图谱</b></span>
        </Link>

        <form className="search desktop-search" onSubmit={submit} role="search">
          <span className="search-glyph" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg></span>
          <input
            aria-label="搜索知识点、题目或年份"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            value={query}
            onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0) }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            placeholder="搜索知识点、题目或年份"
            autoComplete="off"
          />
          {open && suggestions.length > 0 ? (
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
                    <span className="suggest-main"><b>{hit.title}</b>{hit.subtitle ? <small>{hit.subtitle}</small> : null}</span>
                    <span className="suggest-type">{hit.kind === 'problem' ? '题目' : '知识点'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        <button type="button" className="mobile-search-trigger" onClick={() => setPaletteOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>
          搜索
        </button>

        <nav className="nav desktop-nav" aria-label="主导航">
          {nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'is-active' : ''}>{item.label}</NavLink>)}
        </nav>
      </header>

      <main id="main-content" className={isWorkspace ? 'content home-content' : 'content'}>
        <div className="page-frame" key={location.pathname}>{children}</div>
      </main>

      {!isWorkspace ? (
        <footer className="site-footer">
          <span>化学竞赛知识图谱</span>
          <span>{data.statistics.totalProblems} 道题目 · {data.statistics.totalNodes} 个知识节点</span>
          <span>数据版本 {data.manifest.dataVersion}</span>
        </footer>
      ) : null}

      <nav className="mobile-nav" aria-label="手机主导航">
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <CommandPalette data={data} open={paletteOpen} onClose={() => setPaletteOpen(false)} initialQuery={query} />
    </div>
  )
}
