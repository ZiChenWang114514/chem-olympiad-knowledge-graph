import { Link, useParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayDisciplineForNode, displayTopicForNode } from '../lib/displayTaxonomy'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import { getFollowOns, getNeighbors, getPrerequisites, getRelatedProblems, nodeTypeLabel, relationLabel } from '../lib/graph'
import { LocalGraph } from '../map/LocalGraph'
import { NotFound } from './NotFound'

export function Knowledge({ data }: { data: AppData }) {
  const { id } = useParams()
  const node = data.graph.nodes.find(item => item.id === id)
  if (!node) return <NotFound />

  const relations = getNeighbors(node.id, data.graph.edges, data.graph.nodes)
  const prerequisites = getPrerequisites(node.id, data.graph.edges, data.graph.nodes)
  const followOns = getFollowOns(node.id, data.graph.edges, data.graph.nodes)
  const linked = getRelatedProblems(node.id, data.problems)
  const discipline = displayDisciplineForNode(node, data.graph)
  const topic = displayTopicForNode(node.id, data.graph)

  return (
    <div className="knowledge-page">
      <div className="detail-nav">
        <Link to={`/?discipline=${encodeURIComponent(discipline.id)}&node=${encodeURIComponent(node.id)}`} className="back">
          ← 在图谱中定位
        </Link>
      </div>

      <header className="document-head knowledge-title">
        <p>{discipline.name}{topic ? ` / ${topic.name}` : ''} / {nodeTypeLabel(node.type)}</p>
        <h1>{node.label}</h1>
      </header>

      <div className="knowledge-layout">
        <article className="knowledge-article">
          {prerequisites.length || followOns.length ? (
            <section>
              <h2>先修关系</h2>
              <div className="relation-columns">
                {prerequisites.length ? <div><h3>建议先学</h3><ul>{prerequisites.map(item => <li key={item.id}><Link to={`/knowledge/${item.id}`}>{item.label}</Link></li>)}</ul></div> : null}
                {followOns.length ? <div><h3>后续知识</h3><ul>{followOns.map(item => <li key={item.id}><Link to={`/knowledge/${item.id}`}>{item.label}</Link></li>)}</ul></div> : null}
              </div>
            </section>
          ) : null}

          {relations.length ? (
            <section>
              <h2>相关概念</h2>
              <ul className="knowledge-relation-list">
                {relations.map(item => {
                  const rel = data.taxonomy.relations.find(relation => relation.id === item.relation || relation.predicate === item.relation)
                  return <li key={item.edgeId}><span>{relationLabel(item.relation, rel?.name)}</span><Link to={`/knowledge/${item.other.id}`}>{item.other.label}</Link></li>
                })}
              </ul>
            </section>
          ) : null}

          <section>
            <h2>历年题目</h2>
            {linked.length ? (
              <ol className="knowledge-problems">
                {linked.map(problem => {
                  const exam = data.exams.find(item => item.id === problem.examId)
                  return (
                    <li key={problem.id}>
                      <Link to={`/exams/${problem.id}`}>
                        <span>{exam?.year} · {exam ? examStageLabel(exam.stage) : ''} · {problem.number}</span>
                        <b>{displayProblemTitle(problem.title)}</b>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            ) : <p className="muted">暂无关联题目</p>}
          </section>
        </article>

        <aside className="knowledge-graph-aside">
          <h2>局部关系</h2>
          <LocalGraph data={data} nodeId={node.id} />
          <Link className="text-link" to={`/?discipline=${encodeURIComponent(discipline.id)}&node=${encodeURIComponent(node.id)}`}>在图谱中查看</Link>
        </aside>
      </div>
    </div>
  )
}
