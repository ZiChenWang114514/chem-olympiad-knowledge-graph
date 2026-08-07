import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import MiniSearch from 'minisearch'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'

type SearchHit = { id: string; kind: string; title: string; subtitle?: string }

const NAV_ACTIONS: SearchHit[] = [
  { id: '/', kind: 'nav', title: '总览工作台', subtitle: '知识网络地图' },
  { id: '/graph', kind: 'nav', title: '完整图谱', subtitle: '扩展布局' },
  { id: '/exams', kind: 'nav', title: '真题档案', subtitle: '题目元数据' },
  { id: '/statistics', kind: 'nav', title: '统计研究', subtitle: '覆盖与分布' },
  { id: '/about', kind: 'nav', title: '来源与方法', subtitle: '公开范围说明' },
]

type Props = {
  data: AppData
  open: boolean
  onClose: () => void
  initialQuery?: string
}

export function CommandPalette({ data, open, onClose, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const search = useMemo(() => {
    const m = new MiniSearch({ fields: ['title', 'subtitle', 'text'], storeFields: ['title', 'subtitle', 'kind', 'id'] })
    m.addAll(data.search)
    return m
  }, [data.search])

  const hits = useMemo(() => {
    const q = query.trim()
    if (!q) return NAV_ACTIONS
    const found = (search.search(q, { prefix: true, fuzzy: 0.2 }) as unknown as SearchHit[]).slice(0, 8)
    const nav = NAV_ACTIONS.filter(
      a => a.title.includes(q) || (a.subtitle && a.subtitle.includes(q)),
    )
    return [...found, ...nav].slice(0, 10)
  }, [query, search])

  useEffect(() => {
    if (!open) return
    setQuery(initialQuery)
    setActive(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [open, initialQuery])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    setActive(0)
  }, [query])

  if (!open) return null

  const goHit = (hit: SearchHit) => {
    onClose()
    if (hit.kind === 'nav') {
      navigate(hit.id)
      return
    }
    if (hit.kind === 'problem') {
      navigate(`/exams/${hit.id}`)
      return
    }
    // knowledge → prefer map workspace selection
    const onMap = location.pathname === '/' || location.pathname === '' || location.pathname === '/graph'
    if (onMap) {
      navigate({ pathname: location.pathname || '/', search: `?node=${encodeURIComponent(hit.id)}` })
      return
    }
    navigate(`/?node=${encodeURIComponent(hit.id)}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(i => (hits.length ? (i + 1) % hits.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(i => (hits.length ? (i - 1 + hits.length) % hits.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const hit = hits[active] || hits[0]
      if (hit) goHit(hit)
      else if (query.trim()) {
        onClose()
        navigate(`/exams?q=${encodeURIComponent(query.trim())}`)
      }
    }
  }

  const kindLabel = (kind: string) => {
    if (kind === 'problem') return '题目'
    if (kind === 'nav') return '导航'
    return '知识'
  }

  return (
    <div className="palette-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="palette-search">
          <span className="palette-glyph" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜索知识点、题目，或跳转页面…"
            aria-label="命令面板搜索"
            autoComplete="off"
          />
          <kbd className="palette-kbd">Esc</kbd>
        </div>
        <ul className="palette-list" role="listbox">
          {hits.length === 0 ? (
            <li className="palette-empty">无匹配结果 · Enter 可前往真题档案检索</li>
          ) : (
            hits.map((hit, index) => (
              <li key={`${hit.kind}-${hit.id}`} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  className={index === active ? 'active' : ''}
                  data-testid={
                    hit.kind === 'nav' ? `palette-nav-${hit.id}` : `suggest-${hit.kind}-${hit.id}`
                  }
                  onMouseEnter={() => setActive(index)}
                  onClick={() => goHit(hit)}
                >
                  <span className={`suggest-kind${hit.kind === 'problem' ? ' is-problem' : ''}${hit.kind === 'nav' ? ' is-nav' : ''}`}>
                    {kindLabel(hit.kind)}
                  </span>
                  <span className="suggest-main">
                    <b>{hit.title}</b>
                    {hit.subtitle ? <small>{hit.subtitle}</small> : null}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd>Enter</kbd> 打开
          </span>
          <span>
            <kbd>Esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}
