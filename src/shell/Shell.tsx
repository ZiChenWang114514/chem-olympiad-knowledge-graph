import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import MiniSearch from 'minisearch'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'

const nav = [
  { to: '/', label: '总览' },
  { to: '/graph', label: '知识图谱' },
  { to: '/exams', label: '真题档案' },
  { to: '/statistics', label: '统计研究' },
  { to: '/about', label: '来源与方法' },
]

type SearchHit = { id: string; kind: string; title: string; subtitle?: string }

export function Shell({ children, data }: { children: ReactNode; data: AppData }) {
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

  const isHome = location.pathname === '/' || location.pathname === ''

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="topbar">
        <div className="topbar-primary">
          <Link to="/" className="brand" aria-label="化学竞赛知识图谱">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
                <circle cx="11" cy="12" r="3.2" fill="currentColor" opacity="0.95" />
                <circle cx="21" cy="12" r="3.2" fill="currentColor" opacity="0.95" />
                <circle cx="16" cy="21" r="3.2" fill="currentColor" opacity="0.95" />
                <path d="M13.2 13.6 L14.8 18.2 M18.8 13.6 L17.2 18.2 M14.2 12 H17.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="brand-text">
              <span className="brand-kicker">化学竞赛</span>
              <b>知识图谱</b>
            </span>
          </Link>
          <div className="top-actions">
            <span className="version" title={data.statistics.note}>
              演示数据 2026.08
            </span>
          </div>
        </div>
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
      </header>
      <nav className="nav" aria-label="主导航">
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main id="main-content" className={isHome ? 'content home-content' : 'content'}>
        {children}
      </main>
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
