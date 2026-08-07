import type { CSSProperties } from 'react'
import type { AppData } from '../lib/data'
import { groupNodesByDiscipline, nodeTypeLabel } from '../lib/graph'

export function NodePicker({
  data,
  selectedId,
  onSelect,
  filter = '',
}: {
  data: AppData
  selectedId?: string | null
  onSelect: (id: string) => void
  filter?: string
}) {
  const q = filter.trim().toLowerCase()
  const groups = groupNodesByDiscipline(data.graph.nodes, data.taxonomy.disciplines)
    .map(group => ({
      ...group,
      nodes: group.nodes.filter(n => {
        if (n.type === 'discipline') return false
        if (!q) return true
        return n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
      }),
    }))
    .filter(group => group.nodes.length > 0)

  return (
    <div className="node-picker" data-testid="node-picker">
      {groups.length === 0 ? (
        <p className="muted">没有匹配的节点。</p>
      ) : (
        groups.map(group => (
          <div
            key={group.discipline.id}
            className="node-picker-group"
            style={{ '--pick-accent': group.discipline.color } as CSSProperties}
          >
            <h3>
              <i style={{ background: group.discipline.color }} />
              {group.discipline.name}
            </h3>
            <ul>
              {group.nodes.map(node => (
                <li key={node.id}>
                  <button
                    type="button"
                    className={selectedId === node.id ? 'is-active' : ''}
                    onClick={() => onSelect(node.id)}
                    data-testid={`node-pick-${node.id}`}
                    aria-current={selectedId === node.id ? 'true' : undefined}
                    style={{ '--pick-accent': group.discipline.color } as CSSProperties}
                  >
                    {node.label}
                    <small>{nodeTypeLabel(node.type)}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
