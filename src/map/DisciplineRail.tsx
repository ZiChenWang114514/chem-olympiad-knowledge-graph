import { useMemo, useState, type CSSProperties } from 'react'
import type { AppData } from '../lib/data'
import { DISPLAY_DISCIPLINES, displayDisciplineForNode } from '../lib/displayTaxonomy'
import { nodeTypeLabel } from '../lib/graph'

type Props = {
  data: AppData
  activeDisciplineId?: string
  activeTopicId?: string
  onDiscipline: (id?: string) => void
  onTopic: (id?: string) => void
  onNode: (id: string) => void
}

export function DisciplineRail({
  data,
  activeDisciplineId,
  activeTopicId,
  onDiscipline,
  onTopic,
  onNode,
}: Props) {
  const [query, setQuery] = useState('')
  const active = DISPLAY_DISCIPLINES.find(item => item.id === activeDisciplineId)
  const counts = useMemo(() => {
    const result = new Map(DISPLAY_DISCIPLINES.map(item => [item.id, 0]))
    for (const node of data.graph.nodes) {
      if (node.type === 'discipline') continue
      const display = displayDisciplineForNode(node, data.graph)
      result.set(display.id, (result.get(display.id) || 0) + 1)
    }
    return result
  }, [data.graph.nodes])

  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('zh-CN')
    if (!term) return []
    return data.graph.nodes
      .filter(node => node.type !== 'discipline')
      .filter(node => !active || displayDisciplineForNode(node, data.graph).id === active.id)
      .filter(node => node.label.toLocaleLowerCase('zh-CN').includes(term))
      .sort((a, b) => (b.importance || 0) - (a.importance || 0) || a.label.localeCompare(b.label, 'zh'))
      .slice(0, 12)
  }, [active, data.graph.nodes, query])

  return (
    <aside className="discipline-rail" aria-label="学科与专题">
      <div className="discipline-tabs" role="list" aria-label="六大学科">
        {DISPLAY_DISCIPLINES.map(item => (
          <button
            key={item.id}
            type="button"
            className={activeDisciplineId === item.id ? 'is-active' : ''}
            onClick={() => {
              onDiscipline(activeDisciplineId === item.id ? undefined : item.id)
              setQuery('')
            }}
            style={{ '--discipline-color': item.color } as CSSProperties}
            aria-pressed={activeDisciplineId === item.id}
            data-testid={`discipline-${item.id}`}
          >
            <span className="discipline-mark" aria-hidden="true" />
            <span>{item.name}</span>
            <small>{counts.get(item.id) || 0}</small>
          </button>
        ))}
      </div>

      {active ? (
        <div className="topic-browser">
          <div className="topic-browser-head">
            <strong>{active.name}专题</strong>
            <button type="button" onClick={() => onDiscipline(undefined)}>查看全部</button>
          </div>
          <div className="topic-list" role="list">
            <button
              type="button"
              className={!activeTopicId ? 'is-active' : ''}
              onClick={() => onTopic(undefined)}
              aria-pressed={!activeTopicId}
            >
              全部专题
            </button>
            {active.topics.map(topic => (
              <button
                key={topic.id}
                type="button"
                className={activeTopicId === topic.id ? 'is-active' : ''}
                onClick={() => onTopic(topic.id)}
                aria-pressed={activeTopicId === topic.id}
              >
                {topic.name}
              </button>
            ))}
          </div>

          <label className="map-filter">
            <span>筛选当前图谱</span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={`搜索${active.name}知识点`}
              autoComplete="off"
            />
          </label>
          {query ? (
            <div className="map-filter-results" aria-live="polite">
              {results.length ? results.map(node => (
                <button key={node.id} type="button" onClick={() => onNode(node.id)}>
                  <span>{node.label}</span>
                  <small>{nodeTypeLabel(node.type)}</small>
                </button>
              )) : <p>没有匹配的知识点</p>}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="discipline-note">选择学科后浏览专题，也可以直接搜索全站。</p>
      )}
    </aside>
  )
}
