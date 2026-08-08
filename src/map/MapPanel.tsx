import { forwardRef, type CSSProperties } from 'react'
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
}

export const MapPanel = forwardRef<HTMLElement, Props>(function MapPanel({ data, selected, onSelect }, ref) {
  const navigate = useNavigate()
  const relationName = (id: string) => {
    const rel = data.taxonomy.relations.find(r => r.id === id || r.predicate === id || r.name === id)
    return relationLabel(id, rel?.name)
  }
  const neighbors = selected ? getNeighbors(selected.id, data.graph.edges, data.graph.nodes) : []
  const prereq = selected ? getPrerequisites(selected.id, data.graph.edges, data.graph.nodes) : []
  const follow = selected ? getFollowOns(selected.id, data.graph.edges, data.graph.nodes) : []
  const related = selected ? getRelatedProblems(selected.id, data.problems) : []
  const accent = selected ? disciplineColor(data.taxonomy.disciplines, selected.discipline) : undefined

  return (
    <aside className="map-panel" ref={ref} data-testid="map-panel">
      {selected ? (
        <>
          <div className="panel-head" style={{ '--panel-accent': accent } as CSSProperties}>
            <h2 data-testid="panel-title">{selected.label}</h2>
            <p className="panel-meta">
              <span className="panel-meta-pill">
                {data.taxonomy.disciplines.find(d => d.id === selected.discipline || d.name === selected.discipline)?.name ||
                  selected.discipline}
              </span>
              <span className="panel-meta-pill">{nodeTypeLabel(selected.type)}</span>
            </p>
          </div>

          <section className="panel-section">
            <h3>相关知识</h3>
            {neighbors.length ? (
              <ul className="relation-list">
                {neighbors.map(item => (
                  <li key={item.edgeId}>
                    <span className="relation-type">{relationName(item.relation)}</span>
                    <button type="button" onClick={() => onSelect(item.other.id)} data-testid={`neighbor-${item.other.id}`}>
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
            <h3>先修知识</h3>
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
            <h3>后续知识</h3>
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
            <h3>历年题目</h3>
            {related.length ? (
              <ul className="problem-mini-list">
                {related.map(problem => {
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
            ) : (
              <p className="muted" data-testid="problems-pending">
                暂无与该知识点直接关联的公开题目。
              </p>
            )}
          </section>

          <button
            type="button"
            className="secondary full"
            onClick={() => navigate(`/knowledge/${selected.id}`)}
            data-testid="open-knowledge"
          >
            查看知识点
          </button>
        </>
      ) : (
        <>
          <h2>选择节点</h2>
          <p className="muted">单击图中节点，或从下方列表选择。</p>
          <NodePicker data={data} onSelect={onSelect} />
        </>
      )}
    </aside>
  )
})
