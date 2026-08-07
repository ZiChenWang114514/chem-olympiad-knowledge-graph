import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
        </b>
        <span>
          {discNames} · {problem.mappingCount} 个知识映射
        </span>
      </span>
      <DifficultyDots value={problem.difficulty} />
      <span className="problem-action">查看记录</span>
    </Link>
  )
}

export function Exams({ data }: { data: AppData }) {
  const params = new URLSearchParams(useLocation().search)
  const [stage, setStage] = useState('全部')
  const [year, setYear] = useState('全部')
  const [query, setQuery] = useState(params.get('q') || '')
  const filtered = data.problems.filter(problem => {
    const exam = data.exams.find(item => item.id === problem.examId)
    const hay = `${problem.title}${problem.number}${problem.summary || ''}`
    return (
      (stage === '全部' || exam?.stage === stage) &&
      (year === '全部' || String(exam?.year) === year) &&
      (!query || hay.includes(query))
    )
  })

  return (
    <>
      <PageTitle
        title="真题档案"
        description="按年份、考试阶段和主题查看题目元数据与知识映射。"
        split
        aside={
          <span className="archive-count">
            {filtered.length} <small>条记录</small>
          </span>
        }
      />
      <div className="filters">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="筛选题号或主题" aria-label="筛选题目" />
        <select value={stage} onChange={event => setStage(event.target.value)}>
          <option value="全部">全部</option>
          {[...new Set(data.exams.map(e => e.stage))].sort().map(s => (
            <option key={s} value={s}>
              {examStageLabel(s)}
            </option>
          ))}
        </select>
        <select value={year} onChange={event => setYear(event.target.value)}>
          <option>全部</option>
          {[...new Set(data.exams.map(exam => exam.year))]
            .sort()
            .map(item => (
              <option key={item}>{item}</option>
            ))}
        </select>
      </div>
      <div className="exam-list">
        {filtered.map(problem => (
          <ProblemCard key={problem.id} problem={problem} exam={data.exams.find(exam => exam.id === problem.examId)!} data={data} />
        ))}
      </div>
    </>
  )
}
