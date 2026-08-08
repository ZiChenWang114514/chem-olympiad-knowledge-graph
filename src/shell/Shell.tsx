import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import MiniSearch from 'minisearch'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { CommandPalette } from './CommandPalette'

const nav = [
  { to: '/', label: '总览' },
  { to: '/graph', label: '知识图谱' },
  { to: '/exams', label: '真题档案' },
  { to: '/statistics', label: '统计研究' },
  { to: '/about', label: '来源与方法' },
]

type SearchHit = { id: string; kind: string; title: string; subtitle?: string }

function isMac() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
}

export function Shell({ children, data }: { children: ReactNode; data: AppData }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
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

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
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
    const onMap = location.pathname === '/' || location.pathname === '' || location.pathname === '/graph'
    if (onMap) {
      navigate({ pathname: location.pathname || '/', search: `?node=${encodeURIComponent(hit.id)}` })
      return
    }
    navigate(`/?node=${encodeURIComponent(hit.id)}`)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (!q) {
      setPaletteOpen(true)
      return
    }
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

  const isHome = location.pathname === '/' || location.pathname === ''
  const isGraph = location.pathname === '/graph'
  const isWorkspace = isHome || isGraph
  const shortcut = isMac() ? '⌘K' : 'Ctrl K'

  return (
    <div className={`app${isWorkspace ? ' is-workspace' : ''}`}>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="command-bar">
        <Link to="/" className="brand" aria-label="化学竞赛知识图谱">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
              <circle cx="11" cy="12" r="3.2" fill="currentColor" opacity="0.95" />
              <circle cx="21" cy="12" r="3.2" fill="currentColor" opacity="0.95" />
              <circle cx="16" cy="21" r="3.2" fill="currentColor" opacity="0.95" />
              <path
                d="M13.2 13.6 L14.8 18.2 M18.8 13.6 L17.2 18.2 M14.2 12 H17.8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-kicker">化学竞赛</span>
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
          <button
            type="button"
            className="search-shortcut"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setPaletteOpen(true)}
            title="打开全站搜索"
          >
            {shortcut}
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

        <nav className="nav" aria-label="主导航">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <span className="version" title="当前公开数据版本">
          2026.08 演示版
        </span>
      </header>

      <main id="main-content" className={isWorkspace ? 'content home-content' : 'content'}>
        <div className="page-enter" key={location.pathname}>
          {children}
        </div>
      </main>

      {!isWorkspace && (
        <footer>
          <span>化学竞赛知识图谱</span>
          <span>
            {data.statistics.totalExams} 组考试 · {data.statistics.totalProblems} 道题目 · 知识映射尚在校订
          </span>
          <Link to="/about">资料说明</Link>
        </footer>
      )}

      <CommandPalette data={data} open={paletteOpen} onClose={() => setPaletteOpen(false)} initialQuery={query} />
    </div>
  )
}
