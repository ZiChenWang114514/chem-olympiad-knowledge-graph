import { useMemo, useState, type CSSProperties } from 'react'
import type { AppData } from '../lib/data'
import { groupNodesByDiscipline, nodeTypeLabel } from '../lib/graph'

const PREVIEW_LIMIT = 10

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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const groups = useMemo(
    () =>
      groupNodesByDiscipline(data.graph.nodes, data.taxonomy.disciplines)
        .map(group => ({
          ...group,
          nodes: group.nodes.filter(n => {
            if (n.type === 'discipline') return false
            if (!q) return true
            return n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
          }),
        }))
        .filter(group => group.nodes.length > 0),
    [data, q],
  )

  const isGroupOpen = (id: string, index: number) => {
    if (q) return true
    if (openGroups[id] !== undefined) return openGroups[id]
    return index === 0
  }

  return (
    <div className="node-picker" data-testid="node-picker">
      {groups.length === 0 ? (
        <p className="muted">没有匹配的节点。试试更短的关键词。</p>
      ) : (
        groups.map((group, index) => {
          const open = isGroupOpen(group.discipline.id, index)
          const showAll = Boolean(q) || expandedGroups[group.discipline.id]
          const hiddenCount = !showAll && open ? Math.max(0, group.nodes.length - PREVIEW_LIMIT) : 0

          return (
            <div
              key={group.discipline.id}
              className={`node-picker-group${open ? ' is-open' : ''}`}
              style={{ '--pick-accent': group.discipline.color } as CSSProperties}
            >
              <button
                type="button"
                className="node-picker-group-toggle"
                onClick={() =>
                  setOpenGroups(prev => ({
                    ...prev,
                    [group.discipline.id]: !isGroupOpen(group.discipline.id, index),
                  }))
                }
                aria-expanded={open}
              >
                <i style={{ background: group.discipline.color }} />
                <span className="node-picker-group-name">{group.discipline.name}</span>
                <span className="node-picker-group-count">{group.nodes.length}</span>
                <span className="node-picker-chevron" aria-hidden="true">
                  {open ? '▾' : '▸'}
                </span>
              </button>

              <ul>
                {group.nodes.map((node, nodeIndex) => {
                  const clipped = !open || (!showAll && nodeIndex >= PREVIEW_LIMIT)
                  return (
                    <li key={node.id} className={clipped ? 'is-clipped' : undefined}>
                      <button
                        type="button"
                        className={selectedId === node.id ? 'is-active' : ''}
                        onClick={() => onSelect(node.id)}
                        data-testid={`node-pick-${node.id}`}
                        aria-current={selectedId === node.id ? 'true' : undefined}
                        tabIndex={clipped ? -1 : 0}
                        style={{ '--pick-accent': group.discipline.color } as CSSProperties}
                      >
                        {node.label}
                        <small>{nodeTypeLabel(node.type)}</small>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {open && hiddenCount > 0 ? (
                <button
                  type="button"
                  className="node-picker-more"
                  onClick={() =>
                    setExpandedGroups(prev => ({ ...prev, [group.discipline.id]: true }))
                  }
                >
                  显示其余 {hiddenCount} 个
                </button>
              ) : null}
              {open && showAll && !q && group.nodes.length > PREVIEW_LIMIT ? (
                <button
                  type="button"
                  className="node-picker-more is-muted"
                  onClick={() =>
                    setExpandedGroups(prev => ({ ...prev, [group.discipline.id]: false }))
                  }
                >
                  收起
                </button>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}
