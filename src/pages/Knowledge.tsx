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

  return (
    <>
      <Link to="/graph" className="back">
        ← 返回知识图谱
      </Link>
      <section className="knowledge-head">
        <span className="topic-icon large" style={{ background: disciplineColor(data.taxonomy.disciplines, node.discipline) }}>
          {node.label.slice(0, 1)}
        </span>
        <div>
          <p className="page-kicker">
            {discName} · {nodeTypeLabel(node.type)}
          </p>
          <h1>{node.label}</h1>
          <p>
            节点 ID：{node.id} · 重要度 {node.importance || 3}/5
          </p>
        </div>
      </section>
      <div className="knowledge-grid">
        <article className="article">
          <h2>知识说明</h2>
          <p>本页汇总该知识点在竞赛资料中的位置、相邻关系和历年考查索引。讲义内容将在完成来源核验后逐步补充。</p>
          <Notice>
            <b>公开范围：元数据</b>
            <br />
            题目原文、参考答案和评分材料仍保存在受控资料库。
          </Notice>
          <h2>相关真题</h2>
          {linked.length ? (
            linked.map(problem => (
              <Link className="mini-problem" to={`/exams/${problem.id}`} key={problem.id}>
                <b>
                  {data.exams.find(exam => exam.id === problem.examId)?.year} · {problem.number}
                </b>
                <span>{displayProblemTitle(problem.title)}</span>
                <span className="text-link">查看</span>
              </Link>
            ))
          ) : (
            <p className="muted">该节点尚无公开的节点级题目映射，待标注。</p>
          )}
        </article>
        <aside className="side-card">
          <h3>
            关系清单 <small>{relations.length}</small>
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
          <h3>学习提示</h3>
          <p className="muted">先阅读相邻节点，再回看题目中的综合考查关系。</p>
        </aside>
      </div>
    </>
  )
}
