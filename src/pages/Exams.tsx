import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import type { Problem } from '../types'
import { DifficultyDots } from '../ui/DifficultyDots'
import { PageTitle } from '../ui/PageTitle'

function ProblemCard({ problem, exam, data }: { problem: Problem; exam: AppData['exams'][number]; data: AppData }) {
  const discNames = problem.disciplines
    .map(id => data.taxonomy.disciplines.find(d => d.id === id || d.name === id)?.name || id)
    .join(' / ')
  return (
    <Link to={`/exams/${problem.id}`} className="problem-card">
      <span className="problem-year">
        {exam.year}
        <small>{examStageLabel(exam.stage)}</small>
      </span>
      <span className="problem-main">
        <b>
          {problem.number} · {displayProblemTitle(problem.title)}
          {problem.hasStem ? <span className="content-pill sm">题干</span> : null}
        </b>
        <span>
          {discNames} · {problem.mappingCount} 个关联知识点
          {problem.hasStem ? ' · 可阅读题干' : ''}
        </span>
      </span>
      <DifficultyDots value={problem.difficulty} />
      <span className="problem-action">查看题目</span>
    </Link>
  )
}

export function Exams({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [stage, setStage] = useState(params.get('stage') || '全部')
  const [year, setYear] = useState(params.get('year') || '全部')
  const [query, setQuery] = useState(params.get('q') || '')

  // Sync from URL (e.g. search deep-link)
  useEffect(() => {
    setQuery(params.get('q') || '')
    setStage(params.get('stage') || '全部')
    setYear(params.get('year') || '全部')
  }, [params])

  const pushFilters = (next: { q?: string; stage?: string; year?: string }) => {
    const q = next.q ?? query
    const s = next.stage ?? stage
    const y = next.year ?? year
    const sp = new URLSearchParams()
    if (q.trim()) sp.set('q', q.trim())
    if (s !== '全部') sp.set('stage', s)
    if (y !== '全部') sp.set('year', y)
    setParams(sp, { replace: true })
  }

  const filtered = useMemo(
    () =>
      data.problems.filter(problem => {
        const exam = data.exams.find(item => item.id === problem.examId)
        const hay = `${problem.title}${problem.number}${problem.summary || ''}`
        return (
          (stage === '全部' || exam?.stage === stage) &&
          (year === '全部' || String(exam?.year) === year) &&
          (!query || hay.includes(query))
        )
      }),
    [data, stage, year, query],
  )

  const years = useMemo(
    () => [...new Set(data.exams.map(e => String(e.year)))].sort((a, b) => Number(b) - Number(a)),
    [data.exams],
  )

  return (
    <>
      <PageTitle
        title="真题档案"
        description="按年份、考试阶段和主题查找题目，并查看关联知识点。"
        split
        aside={
          <span className="archive-count">
            {filtered.length} <small>道题</small>
          </span>
        }
      />
      <div className="filters sticky-filters">
        <label>
          <span className="visually-hidden">筛选题目</span>
          <input
            aria-label="筛选题目"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              pushFilters({ q: e.target.value })
            }}
            placeholder="输入题号或主题…"
          />
        </label>
        <select
          aria-label="考试阶段"
          value={stage}
          onChange={e => {
            setStage(e.target.value)
            pushFilters({ stage: e.target.value })
          }}
        >
          <option value="全部">全部阶段</option>
          <option value="preliminary">初赛</option>
          <option value="final">决赛</option>
        </select>
        <select
          aria-label="年份"
          value={year}
          onChange={e => {
            setYear(e.target.value)
            pushFilters({ year: e.target.value })
          }}
        >
          <option value="全部">全部年份</option>
          {years.map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {(query || stage !== '全部' || year !== '全部') && (
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => {
              setQuery('')
              setStage('全部')
              setYear('全部')
              navigate('/exams', { replace: true })
            }}
          >
            清除
          </button>
        )}
      </div>
      <div className="problem-list">
        {filtered.length ? (
          filtered.map(problem => {
            const exam = data.exams.find(item => item.id === problem.examId)!
            return <ProblemCard key={problem.id} problem={problem} exam={exam} data={data} />
          })
        ) : (
          <div className="empty-inline">
            <b>没有符合条件的题目</b>
            <p>请调整关键词、年份或考试阶段。</p>
          </div>
        )}
      </div>
    </>
  )
}
