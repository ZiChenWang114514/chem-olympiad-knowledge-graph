import { forwardRef, useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import {
  disciplineColor,
  getFollowOns,
  getNeighbors,
  getPrerequisites,
  getRelatedProblems,
  nodeTypeLabel,
  relationLabel,
} from '../lib/graph'
import type { GraphNode } from '../types'
import { NodePicker } from './NodePicker'

type Props = {
  data: AppData
  selected: GraphNode | null
  onSelect: (id: string) => void
  onClear: () => void
  compact?: boolean
}

const RELATED_PREVIEW = 6

export const Inspector = forwardRef<HTMLElement, Props>(function Inspector(
  { data, selected, onSelect, onClear, compact = false },
  ref,
) {
  const navigate = useNavigate()
  const [pickerFilter, setPickerFilter] = useState('')
  const [showAllRelated, setShowAllRelated] = useState(false)

  useEffect(() => {
    setShowAllRelated(false)
  }, [selected?.id])

  const relationName = (id: string) => {
    const rel = data.taxonomy.relations.find(r => r.id === id || r.predicate === id || r.name === id)
    return relationLabel(id, rel?.name)
  }
  const neighbors = selected ? getNeighbors(selected.id, data.graph.edges, data.graph.nodes) : []
  const prereq = selected ? getPrerequisites(selected.id, data.graph.edges, data.graph.nodes) : []
  const follow = selected ? getFollowOns(selected.id, data.graph.edges, data.graph.nodes) : []
  const related = selected ? getRelatedProblems(selected.id, data.problems) : []
  const relatedShown = showAllRelated ? related : related.slice(0, RELATED_PREVIEW)
  const accent = selected ? disciplineColor(data.taxonomy.disciplines, selected.discipline) : undefined

  return (
    <aside
      className={`map-panel inspector${selected ? ' has-selection' : ''}${compact ? ' is-compact' : ''}`}
      ref={ref}
      data-testid="map-panel"
    >
      <div className="sheet-handle" aria-hidden="true" />

      {selected ? (
        <>
          <div className="panel-head" style={{ '--panel-accent': accent } as CSSProperties}>
            <div className="panel-head-row">
              <h2 data-testid="panel-title">{selected.label}</h2>
              <button type="button" className="panel-close" onClick={onClear} aria-label="清除选中" title="清除选中">
                ×
              </button>
            </div>
            <p className="panel-meta">
              <span className="panel-meta-pill">
                {data.taxonomy.disciplines.find(d => d.id === selected.discipline || d.name === selected.discipline)
                  ?.name || selected.discipline}
              </span>
              <span className="panel-meta-pill">{nodeTypeLabel(selected.type)}</span>
              {typeof selected.importance === 'number' ? (
                <span className="panel-meta-pill is-soft">重要度 {selected.importance}/5</span>
              ) : null}
            </p>
          </div>

          <div className="panel-scroll">
            <section className="panel-section">
              <h3>
                相关知识 <small>{neighbors.length}</small>
              </h3>
              {neighbors.length ? (
                <ul className="relation-list">
                  {neighbors.map(item => (
                    <li key={item.edgeId}>
                      <span className="relation-type">{relationName(item.relation)}</span>
                      <button
                        type="button"
                        onClick={() => onSelect(item.other.id)}
                        data-testid={`neighbor-${item.other.id}`}
                      >
                        {item.other.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">暂无相关知识。</p>
              )}
            </section>

            <section className="panel-section">
              <h3>
                先修知识 <small>{prereq.length}</small>
              </h3>
              {prereq.length ? (
                <ul className="relation-list">
                  {prereq.map(node => (
                    <li key={node.id}>
                      <span className="relation-type">先修</span>
                      <button type="button" onClick={() => onSelect(node.id)} data-testid={`prereq-${node.id}`}>
                        {node.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">暂无先修知识。</p>
              )}
            </section>

            <section className="panel-section">
              <h3>
                后续知识 <small>{follow.length}</small>
              </h3>
              {follow.length ? (
                <ul className="relation-list">
                  {follow.map(node => (
                    <li key={node.id}>
                      <span className="relation-type">后续</span>
                      <button type="button" onClick={() => onSelect(node.id)} data-testid={`follow-${node.id}`}>
                        {node.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">暂无后续知识。</p>
              )}
            </section>

            <section className="panel-section">
              <h3>
                历年题目 <small>{related.length}</small>
              </h3>
              {related.length ? (
                <>
                  <ul className="problem-mini-list">
                    {relatedShown.map(problem => {
                      const exam = data.exams.find(e => e.id === problem.examId)
                      return (
                        <li key={problem.id}>
                          <Link to={`/exams/${problem.id}`} data-testid={`related-problem-${problem.id}`}>
                            <b>
                              {exam?.year} · {exam ? examStageLabel(exam.stage) : ''} · {problem.number}
                            </b>
                            <span>{displayProblemTitle(problem.title)}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                  {related.length > RELATED_PREVIEW ? (
                    <button
                      type="button"
                      className="node-picker-more"
                      onClick={() => setShowAllRelated(v => !v)}
                    >
                      {showAllRelated ? '收起题目列表' : `查看全部 ${related.length} 题`}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="muted" data-testid="problems-pending">
                  暂无与该知识点直接关联的公开题目。
                </p>
              )}
            </section>
          </div>

          <div className="panel-actions">
            <button
              type="button"
              className="btn-primary full"
              onClick={() => navigate(`/knowledge/${selected.id}`)}
              data-testid="open-knowledge"
            >
              查看知识点
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="panel-idle-head">
            <h2>选择节点</h2>
            <p className="muted">单击图中节点，或在列表中查找；双击可以查看知识点。</p>
            <label className="picker-filter">
              <span className="visually-hidden">过滤节点</span>
              <input
                type="search"
                value={pickerFilter}
                onChange={e => setPickerFilter(e.target.value)}
                placeholder="过滤节点名称…"
                autoComplete="off"
              />
            </label>
          </div>
          <NodePicker data={data} onSelect={onSelect} filter={pickerFilter} />
        </>
      )}
    </aside>
  )
})
