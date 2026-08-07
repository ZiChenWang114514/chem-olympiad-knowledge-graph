import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import manifest from '../public/data/manifest.json'
import taxonomy from '../public/data/taxonomy.json'
import graph from '../public/data/graph/all.json'
import statistics from '../public/data/statistics.json'
import searchIndex from '../public/data/search-index.json'
import exam2006 from '../public/data/exams/2006.json'
import exam2024 from '../public/data/exams/2024.json'
import exam2025 from '../public/data/exams/2025.json'
import {
  getFollowOns,
  getNeighbors,
  getPrerequisites,
  getRelatedProblems,
} from '../src/lib/graph'
import type { GraphEdge, GraphNode, Problem } from '../src/types'

const problems = [...exam2006.items, ...exam2024.items, ...exam2025.items] as Problem[]
const nodes = graph.nodes as GraphNode[]
const edges = graph.edges as GraphEdge[]

describe('公开数据完整性', () => {
  it('声明版本和公开版权策略', () => {
    expect(manifest.dataVersion).toBeTruthy()
    expect(manifest.rightsPolicy).toBe('metadata_public')
  })

  it('知识节点与关系引用均存在', () => {
    const ids = new Set(nodes.map(n => n.id))
    for (const edge of edges) {
      expect(ids.has(edge.source)).toBe(true)
      expect(ids.has(edge.target)).toBe(true)
    }
    expect(new Set(taxonomy.disciplines.map(d => d.id)).size).toBe(taxonomy.disciplines.length)
  })

  it('statistics.totalNodes 与 graph.nodes.length 一致', () => {
    expect(statistics.totalNodes).toBe(nodes.length)
    expect(manifest.counts.knowledgeNodes).toBe(nodes.length)
    expect(manifest.counts.knowledgeEdges).toBe(edges.length)
  })

  it('search-index 的知识节点 id 均存在于图谱', () => {
    const ids = new Set(nodes.map(n => n.id))
    const knowledge = searchIndex.items.filter(item => item.kind === 'knowledge')
    expect(knowledge.length).toBe(nodes.length)
    for (const item of knowledge) expect(ids.has(item.id)).toBe(true)
  })

  it('题目 nodeIds 均指向存在的节点', () => {
    const ids = new Set(nodes.map(n => n.id))
    for (const problem of problems) {
      expect(Array.isArray(problem.nodeIds)).toBe(true)
      for (const nodeId of problem.nodeIds || []) expect(ids.has(nodeId)).toBe(true)
      expect(problem.mappingCount).toBe((problem.nodeIds || []).length)
    }
  })

  it('prerequisite 约定为 source 先修于 target，并至少存在一条', () => {
    const prereq = edges.filter(e => e.relation === 'prerequisite')
    expect(prereq.length).toBeGreaterThan(0)
    const sample = prereq.find(e => e.source === 'atomic' && e.target === 'periodic')
    expect(sample).toBeTruthy()
    const before = getPrerequisites('periodic', edges, nodes).map(n => n.id)
    const after = getFollowOns('atomic', edges, nodes).map(n => n.id)
    expect(before).toContain('atomic')
    expect(after).toContain('periodic')
  })

  it('每个学科节点至少有一条相连边', () => {
    const disciplineIds = nodes.filter(n => n.type === 'discipline').map(n => n.id)
    for (const id of disciplineIds) {
      const degree = edges.filter(e => e.source === id || e.target === id).length
      expect(degree).toBeGreaterThan(0)
    }
  })

  it('manifest 中的公开文件哈希与实际内容一致', () => {
    for (const [file, expected] of Object.entries(manifest.fileHashes)) {
      const bytes = readFileSync(new URL(`../public/${file}`, import.meta.url))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected)
    }
  })
})

describe('图谱查询纯函数', () => {
  it('相邻知识不截断、可读', () => {
    const neighbors = getNeighbors('equilibrium', edges, nodes)
    expect(neighbors.length).toBeGreaterThan(1)
    expect(neighbors.every(item => item.other.id && item.relation)).toBe(true)
  })

  it('相关题目仅依据 nodeIds', () => {
    const related = getRelatedProblems('periodic', problems)
    expect(related.map(p => p.id).sort()).toEqual(['p-2006-prelim-01', 'p-2025-prelim-01'].sort())
    const crystal = getRelatedProblems('crystal', problems)
    expect(crystal.some(p => p.id === 'p-2024-final-01')).toBe(true)
  })

  it('配位化学先修与后续方向正确', () => {
    expect(getPrerequisites('crystal', edges, nodes).map(n => n.id)).toContain('coordination')
    expect(getFollowOns('coordination', edges, nodes).map(n => n.id)).toContain('crystal')
  })
})
