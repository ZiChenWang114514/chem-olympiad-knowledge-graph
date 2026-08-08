import { useMemo, useState } from 'react'
import type { AppData } from '../lib/data'
import { aggregateDisciplineCounts, displayDisciplineForNode } from '../lib/displayTaxonomy'

export function Statistics({ data }: { data: AppData }) {
  const [view, setView] = useState<'discipline' | 'topic'>('discipline')
  const yearSorted = useMemo(() => [...data.statistics.yearCounts].sort((a, b) => a.year - b.year), [data.statistics.yearCounts])
  const disciplineRows = useMemo(() => aggregateDisciplineCounts(data.statistics.disciplineCounts), [data.statistics.disciplineCounts])
  const topicRows = useMemo(() => data.graph.nodes
    .filter(node => node.type === 'topic')
    .map(topic => {
      const ids = new Set([topic.id, ...data.graph.edges.filter(edge => edge.relation === 'belongs_to' && edge.target === topic.id).map(edge => edge.source)])
      return {
        name: topic.label,
        value: data.problems.filter(problem => problem.nodeIds?.some(id => ids.has(id))).length,
        color: displayDisciplineForNode(topic, data.graph).color,
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 12), [data.graph, data.problems])
  const coverage = view === 'discipline'
    ? disciplineRows.map(item => ({ name: item.name, value: item.value, color: item.color }))
    : topicRows
  const peak = Math.max(...coverage.map(item => item.value), 1)
  const yearPeak = Math.max(...yearSorted.map(item => item.value), 1)

  return (
    <div className="statistics-page">
      <header className="document-head">
        <p>公开数据</p>
        <h1>统计</h1>
      </header>

      <section className="stats-summary" aria-label="数据摘要">
        <span><strong>{data.statistics.totalProblems}</strong> 道题目</span>
        <span><strong>{data.graph.nodes.length}</strong> 个知识节点</span>
        <span><strong>{data.graph.edges.length}</strong> 条关系</span>
        <span><strong>{data.statistics.totalExams}</strong> 组考试</span>
      </section>

      <div className="statistics-layout">
        <section className="coverage-chart">
          <div className="chart-head">
            <div><h2>知识覆盖</h2><p>题目标签出现次数，同一道题可以关联多个知识领域。</p></div>
            <div className="view-switch" role="group" aria-label="统计层级">
              <button type="button" className={view === 'discipline' ? 'is-active' : ''} onClick={() => setView('discipline')}>六大学科</button>
              <button type="button" className={view === 'topic' ? 'is-active' : ''} onClick={() => setView('topic')}>主要专题</button>
            </div>
          </div>
          <div className="coverage-bars">
            {coverage.map(item => (
              <div className="coverage-row" key={item.name}>
                <span>{item.name}</span>
                <div><i style={{ width: `${Math.max(3, item.value / peak * 100)}%`, background: item.color }} /></div>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="year-chart-panel">
          <div className="chart-head"><div><h2>年份记录</h2><p>每年公开考试组数。</p></div></div>
          <div className="year-chart-new">
            {yearSorted.map(item => (
              <div key={item.year} title={`${item.year} 年：${item.value} 组`}>
                <i style={{ height: `${Math.max(8, item.value / yearPeak * 100)}%` }}><b>{item.value}</b></i>
                <span>{String(item.year).slice(2)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="statistics-note">{data.statistics.note}</p>
    </div>
  )
}
