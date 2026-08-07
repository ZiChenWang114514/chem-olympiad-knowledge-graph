import { Link, useParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import { disciplineColor, nodeTypeLabel } from '../lib/graph'
import type { GraphNode } from '../types'
import { Notice } from '../ui/Notice'
import { NotFound } from './NotFound'

export function ExamDetail({ data }: { data: AppData }) {
  const { id } = useParams()
  const problem = data.problems.find(item => item.id === id)
  if (!problem) return <NotFound />
  const exam = data.exams.find(item => item.id === problem.examId)
  if (!exam) return <NotFound />
  const mappedNodes = (problem.nodeIds || [])
    .map(nid => data.graph.nodes.find(n => n.id === nid))
    .filter((n): n is GraphNode => Boolean(n))

  return (
    <>
      <Link to="/exams" className="back">
        ← 返回真题档案
      </Link>
      <section className="detail-title">
        <span className="problem-year big">
          {exam.year}
          <small>{examStageLabel(exam.stage)}</small>
        </span>
        <div>
          <p className="page-kicker">{exam.title}</p>
          <h1>
            {problem.number} · {displayProblemTitle(problem.title)}
          </h1>
          <p>
            {problem.disciplines
              .map(
                discipline =>
                  data.taxonomy.disciplines.find(item => item.id === discipline || item.name === discipline)?.name ||
                  discipline,
              )
              .join(' / ')}{' '}
            · 难度 {problem.difficulty}/5
          </p>
        </div>
      </section>
      <Notice wide>
        <b>题文暂不公开</b>
        <br />
        {problem.summary} 来源：{exam.sourceLabel || problem.sourceLabel || '未标注'}。
      </Notice>
      <section className="detail-columns">
        <article className="article">
          <h2>知识映射</h2>
          {mappedNodes.length ? (
            <div className="mapping-box">
              {mappedNodes.map(node => (
                <Link to={`/knowledge/${node.id}`} key={node.id}>
                  <span style={{ background: disciplineColor(data.taxonomy.disciplines, node.discipline) }}>
                    {node.label.slice(0, 1)}
                  </span>
                  <b>{node.label}</b>
                  <small>{nodeTypeLabel(node.type)}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">该题尚无公开的节点级知识映射，待标注。</p>
          )}
          {mappedNodes[0] ? (
            <Link className="btn-primary" to={`/?node=${encodeURIComponent(mappedNodes[0].id)}`} style={{ marginTop: 16 }}>
              在图谱中查看首个映射
            </Link>
          ) : null}
        </article>
        <aside className="source-card">
          <h3>来源记录</h3>
          <dl>
            <dt>公开状态</dt>
            <dd>metadata_public</dd>
            <dt>题目编号</dt>
            <dd>{problem.id}</dd>
            <dt>资料来源</dt>
            <dd>{exam.sourceLabel || problem.sourceLabel}</dd>
            <dt>知识映射</dt>
            <dd>{problem.mappingCount} 个</dd>
          </dl>
          <Link to="/about" className="text-link">
            查看来源规范
          </Link>
        </aside>
      </section>
    </>
  )
}
