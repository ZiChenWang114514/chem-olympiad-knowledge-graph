import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayDisciplineFor, displayDisciplineForNode } from '../lib/displayTaxonomy'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import { nodeTypeLabel } from '../lib/graph'
import { loadProblemStem } from '../lib/stem'
import type { GraphNode, ProblemStem } from '../types'
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
        <div>
          <p className="page-kicker">{exam.year} · {examStageLabel(exam.stage)} · {exam.title}</p>
          <h1>
            {problem.number} · {displayProblemTitle(problem.title)}
          </h1>
          <p>
            {[...new Set(problem.disciplines.map(discipline => displayDisciplineFor(discipline).name))].join(' / ')}
            {' · '}难度 {problem.difficulty}/5
          </p>
        </div>
      </section>

      <section className="stem-section" aria-label="题目题干">
        {stem === undefined ? <StemLoading /> : null}
        {stem ? <StemRenderer stem={stem} /> : null}
        {stem === null ? (
          <StemUnavailable reason={stemError || undefined} />
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
            <>
              <div className="mapping-box">
                {mappedNodes.map(node => (
                  <Link to={`/knowledge/${node.id}`} key={node.id}>
                    <b>{node.label}</b><small>{displayDisciplineForNode(node, data.graph).name} · {nodeTypeLabel(node.type)}</small>
                  </Link>
                ))}
              </div>
              {problem.partMappings?.length ? (
                <div className="part-mapping-list">
                  {problem.partMappings.map(part => (
                    <section key={part.partId}>
                      <h3>{part.label}</h3>
                      <div>
                        {part.mappings.map(mapping => {
                          const node = data.graph.nodes.find(item => item.id === mapping.nodeId)
                          if (!node) return null
                          const role = mapping.mappingRole === 'assesses' ? '直接考查' : mapping.mappingRole === 'requires' ? '求解需要' : '题目情境'
                          return (
                            <Link key={`${part.partId}-${mapping.nodeId}`} to={`/knowledge/${node.id}`}>
                              <b>{node.label}</b>
                              <small>{role}</small>
                            </Link>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted">暂无知识映射</p>
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
            <dt>来源</dt>
            <dd>{exam.sourceLabel || problem.sourceLabel}</dd>
            {problem.sourceDocumentId || exam.sourceDocumentId ? <><dt>来源编号</dt><dd>{problem.sourceDocumentId || exam.sourceDocumentId}</dd></> : null}
            {problem.sourceVersion || exam.sourceVersion ? <><dt>资料版本</dt><dd>{problem.sourceVersion || exam.sourceVersion}</dd></> : null}
            {stem?.source.pages?.length || problem.page || exam.page ? <><dt>来源页</dt><dd>第 {stem?.source.pages?.join('、') || problem.page || exam.page} 页</dd></> : null}
            <dt>知识映射</dt>
            <dd>{problem.mappingCount} 个</dd>
          </dl>
          <Link to="/about" className="text-link">
            来源与标注方法
          </Link>
        </aside>
      </section>
    </>
  )
}
