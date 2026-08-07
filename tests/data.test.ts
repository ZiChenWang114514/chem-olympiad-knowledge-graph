import { describe, expect, it } from 'vitest'
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
    expect(manifest.schemaVersion).toBe(2)
    expect(Number.isInteger(manifest.releaseSequence)).toBe(true)
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
    expect(manifest.recordCounts.knowledgeNodes).toBe(nodes.length)
    expect(manifest.recordCounts.knowledgeEdges).toBe(edges.length)
    expect(taxonomy.relations.every(relation => /^relation-type-\d{6}$/.test(relation.id))).toBe(true)
    expect(taxonomy.relations.some(relation => relation.predicate === 'prerequisite')).toBe(true)
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
    const sample = prereq.find(e => e.source === 'kn-concept-000008' && e.target === 'kn-concept-000007')
    expect(sample).toBeTruthy()
    const before = getPrerequisites('kn-concept-000007', edges, nodes).map(n => n.id)
    const after = getFollowOns('kn-concept-000008', edges, nodes).map(n => n.id)
    expect(before).toContain('kn-concept-000008')
    expect(after).toContain('kn-concept-000007')
  })

  it('每个学科节点至少有一条相连边', () => {
    const disciplineIds = nodes.filter(n => n.type === 'discipline').map(n => n.id)
    for (const id of disciplineIds) {
      const degree = edges.filter(e => e.source === id || e.target === id).length
      expect(degree).toBeGreaterThan(0)
    }
  })

  it('manifest 列出公开文件及其大小', () => {
    expect(Array.isArray(manifest.files)).toBe(true)
    expect(manifest.files.length).toBeGreaterThan(0)
    for (const entry of manifest.files) {
      expect(entry.path).toMatch(/^data\//)
      expect(entry.bytes).toBeGreaterThan(0)
    }
  })
})

describe('图谱查询纯函数', () => {
  it('相邻知识不截断、可读', () => {
    const neighbors = getNeighbors('kn-concept-000009', edges, nodes)
    expect(neighbors.length).toBeGreaterThan(1)
    expect(neighbors.every(item => item.other.id && item.relation)).toBe(true)
  })

  it('相关题目仅依据 nodeIds', () => {
    const related = getRelatedProblems('kn-concept-000007', problems)
    expect(related.map(p => p.id).sort()).toEqual(['problem-000001', 'problem-000006'].sort())
    const crystal = getRelatedProblems('kn-method-000002', problems)
    expect(crystal.some(p => p.id === 'problem-000004')).toBe(true)
  })

  it('配位化学先修与后续方向正确', () => {
    expect(getPrerequisites('kn-method-000002', edges, nodes).map(n => n.id)).toContain('kn-concept-000011')
    expect(getFollowOns('kn-concept-000011', edges, nodes).map(n => n.id)).toContain('kn-method-000002')
  })
})
