import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import MiniSearch from 'minisearch'
import { useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayDisciplineForNode } from '../lib/displayTaxonomy'

type SearchHit = { id: string; kind: string; title: string; subtitle?: string }

const NAV_ACTIONS: SearchHit[] = [
  { id: '/', kind: 'nav', title: '图谱', subtitle: '浏览知识关系' },
  { id: '/exams', kind: 'nav', title: '真题', subtitle: '按年份和阶段查找' },
  { id: '/statistics', kind: 'nav', title: '统计', subtitle: '查看覆盖与年份变化' },
  { id: '/about', kind: 'nav', title: '方法', subtitle: '资料来源与标注规则' },
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
    const node = data.graph.nodes.find(item => item.id === hit.id)
    const params = new URLSearchParams({ node: hit.id })
    if (node) params.set('discipline', displayDisciplineForNode(node, data.graph).id)
    navigate(`/?${params.toString()}`)
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
        aria-label="搜索全站"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="palette-search">
          <span className="palette-glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜索知识点、题目，或跳转页面…"
            aria-label="搜索全站"
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
