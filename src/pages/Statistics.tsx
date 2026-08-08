import { useMemo } from 'react'
import type { AppData } from '../lib/data'
import { disciplineColor } from '../lib/graph'
import { PageTitle } from '../ui/PageTitle'

const TOP_N = 8

export function Statistics({ data }: { data: AppData }) {
  const max = Math.max(...data.statistics.yearCounts.map(item => item.value), 1)

  const disciplineRows = useMemo(() => {
    const sorted = [...data.statistics.disciplineCounts].sort((a, b) => b.value - a.value)
    const top = sorted.slice(0, TOP_N).map(item => ({
      name: item.name,
      value: item.value,
      color: disciplineColor(data.taxonomy.disciplines, item.name) || item.color,
    }))
    const rest = sorted.slice(TOP_N)
    const restSum = rest.reduce((s, c) => s + c.value, 0)
    if (restSum > 0) {
      top.push({ name: `其他 ${rest.length} 项`, value: restSum, color: '#7a8f94' })
    }
    return top
  }, [data])

  const discPeak = Math.max(...disciplineRows.map(d => d.value), 1)
  const yearSorted = useMemo(
    () => [...data.statistics.yearCounts].sort((a, b) => a.year - b.year),
    [data.statistics.yearCounts],
  )

  return (
    <>
      <PageTitle title="统计研究" description="统计题目年份、学科标签和知识关系的分布。" />
      <section className="metric-grid">
        <div className="metric-card">
          <span>知识节点</span>
          <strong>{data.graph.nodes.length}</strong>
          <small>当前图谱</small>
        </div>
        <div className="metric-card">
          <span>题目</span>
          <strong>{data.statistics.totalProblems}</strong>
          <small>初赛与决赛</small>
        </div>
        <div className="metric-card">
          <span>关系数量</span>
          <strong>{data.graph.edges.length}</strong>
          <small>节点之间的关系</small>
        </div>
      </section>
      <div className="charts">
        <section className="chart-card">
          <h2>学科覆盖</h2>
          <p className="chart-sub">按题目标签出现次数统计，显示前 {TOP_N} 项，其余合并为“其他”。</p>
          <div className="bars">
            {disciplineRows.map(item => {
              const pct = Math.max(6, (item.value / discPeak) * 100)
              return (
                <div className="bar-row" key={item.name}>
                  <span>{item.name}</span>
                  <div className="bar-track">
                    <i style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                  <b>{item.value}</b>
                </div>
              )
            })}
          </div>
        </section>
        <section className="chart-card">
          <h2>年度收录</h2>
          <p className="chart-sub">各年收录的初赛、决赛考试组数。</p>
          <div className="year-chart year-chart-dense">
            {yearSorted.map(item => (
              <div key={item.year} className="year-col" title={`${item.year}: ${item.value}`}>
                <div className="column" style={{ height: `${Math.max(4, (item.value / max) * 150)}px` }}>
                  {item.value > 0 ? <b>{item.value}</b> : null}
                </div>
                <span>{String(item.year).slice(2)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="data-note">ⓘ 统计范围以本站当前公开数据为准。</p>
    </>
  )
}
