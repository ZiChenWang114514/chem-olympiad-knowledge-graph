import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import { disciplineColor, nodeTypeLabel } from '../lib/graph'
import { loadProblemStem } from '../lib/stem'
import type { GraphNode, ProblemStem } from '../types'
import { Notice } from '../ui/Notice'
import { StemLoading, StemRenderer, StemUnavailable } from '../ui/StemRenderer'
import { NotFound } from './NotFound'

export function ExamDetail({ data }: { data: AppData }) {
  const { id } = useParams()
  const problem = data.problems.find(item => item.id === id)
  if (!problem) return <NotFound />
  const exam = data.exams.find(item => item.id === problem.examId)
  if (!exam) return <NotFound />

  return <ExamDetailBody data={data} problemId={problem.id} />
}

function ExamDetailBody({ data, problemId }: { data: AppData; problemId: string }) {
  const problem = data.problems.find(item => item.id === problemId)!
  const exam = data.exams.find(item => item.id === problem.examId)!
  const mappedNodes = (problem.nodeIds || [])
    .map(nid => data.graph.nodes.find(n => n.id === nid))
    .filter((n): n is GraphNode => Boolean(n))

  const indexEntry = data.stemIndex.items.find(item => item.problemId === problem.id)
  const [stem, setStem] = useState<ProblemStem | null | undefined>(undefined)
  const [stemError, setStemError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStem(undefined)
    setStemError(null)
    if (!indexEntry) {
      setStem(null)
      return
    }
    loadProblemStem(problem.id, data.stemIndex)
      .then(value => {
        if (!cancelled) setStem(value)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setStem(null)
          setStemError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [problem.id, indexEntry, data.stemIndex])

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
            {indexEntry ? (
              <>
                {' '}
                · <span className="content-pill">有题干</span>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="stem-section" aria-label="题目题干">
        {stem === undefined ? <StemLoading /> : null}
        {stem ? <StemRenderer stem={stem} /> : null}
        {stem === null ? (
          <>
            <StemUnavailable reason={stemError || undefined} />
            <Notice wide>
              <b>元数据摘要</b>
              <br />
              {problem.summary} 来源：{exam.sourceLabel || problem.sourceLabel || '未标注'}。
            </Notice>
          </>
        ) : null}
        {stem && problem.summary ? (
          <p className="stem-meta-summary">
            <span>档案摘要：</span>
            {problem.summary}
          </p>
        ) : null}
      </section>

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
            <Link
              className="btn-primary"
              to={`/?node=${encodeURIComponent(mappedNodes[0].id)}`}
              style={{ marginTop: 16 }}
            >
              在图谱中查看首个映射
            </Link>
          ) : null}
        </article>
        <aside className="source-card">
          <h3>来源记录</h3>
          <dl>
            <dt>公开状态</dt>
            <dd>{problem.rightsState || 'metadata_public'}</dd>
            <dt>题干状态</dt>
            <dd>{indexEntry ? indexEntry.rightsState : '未发布题干'}</dd>
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
          <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            题干格式规范见仓库 <code>docs/problem-stem-format.md</code>
          </p>
        </aside>
      </section>
    </>
  )
}
