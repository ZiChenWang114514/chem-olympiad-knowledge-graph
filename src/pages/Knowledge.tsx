import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayProblemTitle } from '../lib/format'
import {
  disciplineColor,
  getNeighbors,
  getRelatedProblems,
  nodeTypeLabel,
  relationLabel,
} from '../lib/graph'
import { Notice } from '../ui/Notice'
import { NotFound } from './NotFound'

export function Knowledge({ data }: { data: AppData }) {
  const { id } = useParams()
  const node = data.graph.nodes.find(item => item.id === id)
  if (!node) return <NotFound />

  const relations = getNeighbors(node.id, data.graph.edges, data.graph.nodes)
  const linked = getRelatedProblems(node.id, data.problems)
  const discName =
    data.taxonomy.disciplines.find(d => d.id === node.discipline || d.name === node.discipline)?.name || node.discipline
  const accent = disciplineColor(data.taxonomy.disciplines, node.discipline)

  return (
    <>
      <div className="detail-nav">
        <Link to={`/?node=${encodeURIComponent(node.id)}`} className="back">
          ← 在图谱中定位
        </Link>
        <Link to="/graph" className="back subtle">
          完整图谱
        </Link>
      </div>
      <section className="knowledge-head" style={{ '--panel-accent': accent } as CSSProperties}>
        <span className="topic-icon large" style={{ background: accent }}>
          {node.label.slice(0, 1)}
        </span>
        <div>
          <p className="page-kicker">
            {discName} · {nodeTypeLabel(node.type)}
          </p>
          <h1>{node.label}</h1>
          <p>
            节点编号：{node.id} · 重要度 {node.importance || 3}/5
          </p>
        </div>
      </section>
      <div className="knowledge-grid">
        <article className="article">
          <h2>知识说明</h2>
          <p>图谱记录了该知识点的相关关系、先修次序和历年考查题目。</p>
          <Notice>
            <b>本站公开内容</b>
            <br />
            本站提供知识关系和题目索引。题目原文、参考答案和评分材料保存在内部资料库。
          </Notice>
          <h2>相关真题</h2>
          {linked.length ? (
            linked.map(problem => (
              <Link className="mini-problem" to={`/exams/${problem.id}`} key={problem.id}>
                <b>
                  {data.exams.find(exam => exam.id === problem.examId)?.year} · {problem.number}
                </b>
                <span>{displayProblemTitle(problem.title)}</span>
                <span className="text-link">查看题目</span>
              </Link>
            ))
          ) : (
            <p className="muted">暂无与该知识点直接关联的公开题目。</p>
          )}
        </article>
        <aside className="side-card">
          <h3>
            知识关系 <small>{relations.length}</small>
          </h3>
          <ul className="relation-list">
            {relations.map(item => {
              const rel = data.taxonomy.relations.find(
                relation => relation.id === item.relation || relation.predicate === item.relation,
              )
              return (
                <li key={item.edgeId}>
                  <span className="relation-type">{relationLabel(item.relation, rel?.name)}</span>
                  <Link to={`/knowledge/${item.other.id}`}>{item.other.label}</Link>
                </li>
              )
            })}
          </ul>
          <Link className="btn-primary full" to={`/?node=${encodeURIComponent(node.id)}`}>
            在图谱中定位
          </Link>
          <h3>阅读建议</h3>
          <p className="muted">先查看先修知识，再结合历年题目理解相关关系。</p>
        </aside>
      </div>
    </>
  )
}
