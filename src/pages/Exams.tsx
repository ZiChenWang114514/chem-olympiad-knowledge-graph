import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { AppData } from '../lib/data'
import { displayDisciplineFor } from '../lib/displayTaxonomy'
import { displayProblemTitle, examStageLabel } from '../lib/format'
import type { Problem } from '../types'

function ArchiveRow({ problem, exam }: { problem: Problem; exam: AppData['exams'][number] }) {
  const disciplines = [...new Set(problem.disciplines.map(id => displayDisciplineFor(id).name))]
  return (
    <Link to={`/exams/${problem.id}`} className="archive-row">
      <time>{exam.year}</time>
      <span className="archive-stage">{examStageLabel(exam.stage)}</span>
      <b className="archive-number">{problem.number}</b>
      <span className="archive-title">{displayProblemTitle(problem.title)}</span>
      <span className="archive-disciplines">{disciplines.join(' / ')}</span>
      <span className="archive-mappings">{problem.mappingCount} 个知识点</span>
    </Link>
  )
}

export function Exams({ data }: { data: AppData }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [stage, setStage] = useState(params.get('stage') || '全部')
  const [year, setYear] = useState(params.get('year') || '全部')
  const [query, setQuery] = useState(params.get('q') || '')

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

  const examById = useMemo(() => new Map(data.exams.map(exam => [exam.id, exam])), [data.exams])
  const filtered = useMemo(() => data.problems.filter(problem => {
    const exam = examById.get(problem.examId)
    const hay = `${problem.title}${problem.number}${problem.summary || ''}${problem.disciplines.join('')}`
    return (stage === '全部' || exam?.stage === stage) && (year === '全部' || String(exam?.year) === year) && (!query || hay.includes(query))
  }), [data.problems, examById, query, stage, year])
  const years = useMemo(() => [...new Set(data.exams.map(exam => String(exam.year)))].sort((a, b) => Number(b) - Number(a)), [data.exams])

  return (
    <div className="archive-page">
      <header className="document-head archive-head"><p>历年试题</p><h1>真题档案</h1><span>{filtered.length} 条记录</span></header>
      <div className="archive-filters">
        <label><span>关键词</span><input value={query} onChange={event => { setQuery(event.target.value); pushFilters({ q: event.target.value }) }} placeholder="题号、主题或学科" /></label>
        <label><span>阶段</span><select value={stage} onChange={event => { setStage(event.target.value); pushFilters({ stage: event.target.value }) }}><option value="全部">全部</option><option value="preliminary">初赛</option><option value="final">决赛</option></select></label>
        <label><span>年份</span><select value={year} onChange={event => { setYear(event.target.value); pushFilters({ year: event.target.value }) }}><option value="全部">全部</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        {(query || stage !== '全部' || year !== '全部') ? <button type="button" onClick={() => { setQuery(''); setStage('全部'); setYear('全部'); navigate('/exams', { replace: true }) }}>清除筛选</button> : null}
      </div>
      <div className="archive-table-head" aria-hidden="true"><span>年份</span><span>阶段</span><span>题号</span><span>题名</span><span>学科</span><span>映射</span></div>
      <div className="archive-list">
        {filtered.length ? filtered.map(problem => <ArchiveRow key={problem.id} problem={problem} exam={examById.get(problem.examId)!} />) : <p className="archive-empty">没有匹配记录</p>}
      </div>
    </div>
  )
}
