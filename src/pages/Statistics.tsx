import type { AppData } from '../lib/data'
import { disciplineColor } from '../lib/graph'
import { PageTitle } from '../ui/PageTitle'

export function Statistics({ data }: { data: AppData }) {
  const max = Math.max(...data.statistics.yearCounts.map(item => item.value), 1)
  const discPeak = Math.max(...data.statistics.disciplineCounts.map(d => d.value), 1)

  return (
    <>
      <PageTitle title="统计研究" description="从公开元数据查看题目覆盖与知识分布，数据会随审核批次更新。" />
      <section className="metric-grid">
        <div className="metric-card">
          <span>知识节点</span>
          <strong>{data.graph.nodes.length}</strong>
          <small>与图谱数据一致</small>
        </div>
        <div className="metric-card">
          <span>题目元数据</span>
          <strong>{data.statistics.totalProblems}</strong>
          <small>初赛与决赛</small>
        </div>
        <div className="metric-card">
          <span>关系数量</span>
          <strong>{data.graph.edges.length}</strong>
          <small>可追溯关系</small>
        </div>
      </section>
      <div className="charts">
        <section className="chart-card">
          <h2>学科覆盖</h2>
          <div className="bars">
            {data.statistics.disciplineCounts.map(item => {
              const color = disciplineColor(data.taxonomy.disciplines, item.name) || item.color
              const pct = Math.max(8, (item.value / discPeak) * 100)
              return (
                <div className="bar-row" key={item.name}>
                  <span>{item.name}</span>
                  <div className="bar-track">
                    <i style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <b>{item.value}</b>
                </div>
              )
            })}
          </div>
        </section>
        <section className="chart-card">
          <h2>年份样本</h2>
          <div className="year-chart">
            {[...data.statistics.yearCounts]
              .sort((a, b) => a.year - b.year)
              .map(item => (
                <div key={item.year} className="year-col">
                  <div className="column" style={{ height: `${(item.value / max) * 150}px` }}>
                    <b>{item.value}</b>
                  </div>
                  <span>{item.year}</span>
                </div>
              ))}
          </div>
        </section>
      </div>
      <p className="data-note">ⓘ {data.statistics.note}</p>
    </>
  )
}
