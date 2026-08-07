import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppData } from '../lib/data'
import {
  disciplineColor,
  getNeighbors,
  nodeTypeLabel,
  relationLabel,
} from '../lib/graph'
import type { GraphNode } from '../types'
import { EmptyState } from '../ui/EmptyState'
import { PageTitle } from '../ui/PageTitle'
import { useCytoscape } from './useCytoscape'

export function GraphPage({ data }: { data: AppData }) {
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const navigate = useNavigate()
  const selectedId = selected?.id ?? null

  const { container, resetView } = useCytoscape({
    data,
    selectedId,
    onSelect: id => {
      if (!id) {
        setSelected(null)
        return
      }
      setSelected(data.graph.nodes.find(n => n.id === id) || null)
    },
  })

  const neighbors = selected ? getNeighbors(selected.id, data.graph.edges, data.graph.nodes) : []
  const relationName = (id: string) => {
    const rel = data.taxonomy.relations.find(r => r.id === id || r.predicate === id || r.name === id)
    return relationLabel(id, rel?.name)
  }

  return (
    <>
      <PageTitle
        title="知识图谱"
        description="从学科进入具体节点；关系同时提供图形和文字列表。"
        aside={
          <div className="legend">
            {data.taxonomy.disciplines.map(discipline => (
              <span key={discipline.id}>
                <i style={{ background: discipline.color }} />
                {discipline.name}
              </span>
            ))}
          </div>
        }
      />
      <div className="graph-layout">
        <div className="graph-card">
          <div className="graph-toolbar">
            <span>
              {data.graph.nodes.length} 个节点 · {data.graph.edges.length} 条关系
            </span>
            <button type="button" onClick={resetView}>
              恢复总览
            </button>
          </div>
          <div ref={container} className="cy" aria-label="化学知识关系图" />
          <div className="graph-hint">选择节点后查看相邻关系；也可用右侧文字列表。</div>
        </div>
        <aside className="detail-panel">
          {selected ? (
            <>
              <h2>{selected.label}</h2>
              <span className="pill" style={{ background: disciplineColor(data.taxonomy.disciplines, selected.discipline) }}>
                {data.taxonomy.disciplines.find(d => d.id === selected.discipline || d.name === selected.discipline)?.name}
              </span>
              <p className="panel-copy">
                {nodeTypeLabel(selected.type)} · 相邻关系 {neighbors.length} 条
              </p>
              <h3>
                相邻关系 <small>{neighbors.length}</small>
              </h3>
              <ul className="relation-list">
                {neighbors.map(item => (
                  <li key={item.edgeId}>
                    <span className="relation-type">{relationName(item.relation)}</span>
                    <button type="button" onClick={() => setSelected(item.other)}>
                      {item.other.label}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="secondary full" onClick={() => navigate(`/knowledge/${selected.id}`)}>
                打开知识页
              </button>
            </>
          ) : (
            <EmptyState title="请选择节点" description="选择后可查看文字关系列表。" />
          )}
        </aside>
      </div>
    </>
  )
}
