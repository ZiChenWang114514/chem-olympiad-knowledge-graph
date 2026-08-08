import { forwardRef, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayDisciplineForNode, displayTopicForNode } from '../lib/displayTaxonomy'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import { getFollowOns, getNeighbors, getPrerequisites, getRelatedProblems, nodeTypeLabel, relationLabel } from '../lib/graph'
import type { GraphNode } from '../types'

type Props = {
  data: AppData
  selected: GraphNode | null
  onSelect: (id: string) => void
  onClear: () => void
}

const RELATED_PREVIEW = 6

export const Inspector = forwardRef<HTMLElement, Props>(function Inspector(
  { data, selected, onSelect, onClear },
  ref,
) {
  const [showAllRelated, setShowAllRelated] = useState(false)

  useEffect(() => setShowAllRelated(false), [selected?.id])
  if (!selected) return null

  const relationName = (id: string) => {
    const rel = data.taxonomy.relations.find(item => item.id === id || item.predicate === id || item.name === id)
    return relationLabel(id, rel?.name)
  }
  const neighbors = getNeighbors(selected.id, data.graph.edges, data.graph.nodes)
  const prereq = getPrerequisites(selected.id, data.graph.edges, data.graph.nodes)
  const follow = getFollowOns(selected.id, data.graph.edges, data.graph.nodes)
  const related = getRelatedProblems(selected.id, data.problems)
  const relatedShown = showAllRelated ? related : related.slice(0, RELATED_PREVIEW)
  const discipline = displayDisciplineForNode(selected, data.graph)
  const topic = displayTopicForNode(selected.id, data.graph)

  return (
    <aside
      className="map-panel inspector has-selection"
      ref={ref}
      data-testid="map-panel"
      style={{ '--panel-accent': discipline.color } as CSSProperties}
    >
      <div className="sheet-handle" aria-hidden="true" />
      <header className="panel-head">
        <div className="panel-context">
          {discipline.name}{topic ? ` / ${topic.name}` : ''} / {nodeTypeLabel(selected.type)}
        </div>
        <h2 data-testid="panel-title">{selected.label}</h2>
        <button type="button" className="panel-clear" onClick={onClear}>清除选择</button>
      </header>

      <div className="panel-scroll">
        {prereq.length ? (
          <section className="panel-section">
            <h3>建议先学 <small>{prereq.length}</small></h3>
            <ul className="relation-list">
              {prereq.map(node => (
                <li key={node.id}>
                  <span>先修</span>
                  <button type="button" onClick={() => onSelect(node.id)} data-testid={`prereq-${node.id}`}>
                    {node.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {follow.length ? (
          <section className="panel-section">
            <h3>后续知识 <small>{follow.length}</small></h3>
            <ul className="relation-list">
              {follow.map(node => (
                <li key={node.id}>
                  <span>后续</span>
                  <button type="button" onClick={() => onSelect(node.id)} data-testid={`follow-${node.id}`}>
                    {node.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {neighbors.length ? (
          <section className="panel-section">
            <h3>相关知识 <small>{neighbors.length}</small></h3>
            <ul className="relation-list">
              {neighbors.slice(0, 16).map(item => (
                <li key={item.edgeId}>
                  <span>{relationName(item.relation)}</span>
                  <button type="button" onClick={() => onSelect(item.other.id)} data-testid={`neighbor-${item.other.id}`}>
                    {item.other.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length ? (
          <section className="panel-section">
            <h3>历年题目 <small>{related.length}</small></h3>
            <ul className="problem-mini-list">
              {relatedShown.map(problem => {
                const exam = data.exams.find(item => item.id === problem.examId)
                return (
                  <li key={problem.id}>
                    <Link to={`/exams/${problem.id}`} data-testid={`related-problem-${problem.id}`}>
                      <b>{exam?.year} · {exam ? examStageLabel(exam.stage) : ''} · {problem.number}</b>
                      <span>{displayProblemTitle(problem.title)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {related.length > RELATED_PREVIEW ? (
              <button type="button" className="text-action" onClick={() => setShowAllRelated(value => !value)}>
                {showAllRelated ? '显示前六题' : `显示全部 ${related.length} 题`}
              </button>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer className="panel-actions">
        <Link className="btn-primary full" to={`/knowledge/${selected.id}`} data-testid="open-knowledge">
          查看知识点
        </Link>
      </footer>
    </aside>
  )
})
