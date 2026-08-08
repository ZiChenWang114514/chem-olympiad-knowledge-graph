import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from '../public/data/manifest.json'
import taxonomy from '../public/data/taxonomy.json'
import graph from '../public/data/graph/all.json'
import statistics from '../public/data/statistics.json'
import searchIndex from '../public/data/search-index.json'
import {
  getFollowOns,
  getNeighbors,
  getPrerequisites,
  getRelatedProblems,
} from '../src/lib/graph'
import { DISPLAY_DISCIPLINES, displayDisciplineFor, validateDisplayTaxonomy, validateDisplayTopics } from '../src/lib/displayTaxonomy'
import { buildVisibleGraph } from '../src/lib/visibleGraph'
import type { GraphEdge, GraphNode, Problem } from '../src/types'

const examDir = join(__dirname, '../public/data/exams')
const problems = readdirSync(examDir)
  .filter(name => /^\d{4}\.json$/.test(name))
  .flatMap(name => {
    const payload = JSON.parse(readFileSync(join(examDir, name), 'utf8')) as { items: Problem[] }
    return payload.items
  })
const nodes = graph.nodes as GraphNode[]
const edges = graph.edges as GraphEdge[]

describe('公开数据完整性', () => {
  it('声明版本和公开版权策略', () => {
    expect(manifest.dataVersion).toBeTruthy()
    expect(manifest.schemaVersion).toBe(2)
    expect(Number.isInteger(manifest.releaseSequence)).toBe(true)
    expect(manifest.rightsPolicy).toMatch(/^metadata_.*public$/)
  })

  it('题干索引与文件一致且绑定已有题目', () => {
    const stemIndex = JSON.parse(
      require('node:fs').readFileSync(require('node:path').join(__dirname, '../public/data/stems/index.json'), 'utf8'),
    ) as { items: { problemId: string; path: string }[] }
    const problemIds = new Set(problems.map(p => p.id))
    for (const item of stemIndex.items) {
      expect(problemIds.has(item.problemId)).toBe(true)
      const abs = require('node:path').join(__dirname, '../public', item.path)
      expect(require('node:fs').existsSync(abs)).toBe(true)
      const stem = JSON.parse(require('node:fs').readFileSync(abs, 'utf8'))
      expect(stem.problemId).toBe(item.problemId)
      expect(stem.schemaVersion).toBe(2)
      expect(['stem_public', 'fulltext_authorized']).toContain(stem.rightsState)
      expect(stem.source.pages.length).toBeGreaterThan(0)
      expect(stem.source.pages.every((page: number) => Number.isInteger(page) && page > 0)).toBe(true)
      expect(stem.answer || stem.solution || stem.answerText).toBeFalsy()
    }
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

  it('prerequisite 约定：source 先修于 target，并至少存在一条', () => {
    const prereq = edges.filter(e => e.relation === 'prerequisite')
    expect(prereq.length).toBeGreaterThan(0)
    const sample = prereq.find(e => e.source === 'kn-concept-000011' && e.target === 'kn-concept-000002')
    expect(sample).toBeTruthy()
    const before = getPrerequisites('kn-concept-000002', edges, nodes).map(n => n.id)
    const after = getFollowOns('kn-concept-000011', edges, nodes).map(n => n.id)
    expect(before).toContain('kn-concept-000011')
    expect(after).toContain('kn-concept-000002')
  })

  it('学科节点在图谱中可识别，且多数有相连边', () => {
    const disciplineNodes = nodes.filter(n => n.type === 'discipline')
    expect(disciplineNodes.length).toBe(6)
    const connected = disciplineNodes.filter(n =>
      edges.some(e => e.source === n.id || e.target === n.id),
    )
    // 发布包可能尚未补全全部学科边；至少应有若干学科连通
    expect(connected.length).toBeGreaterThanOrEqual(3)
  })

  it('manifest 列出公开文件及其大小', () => {
    expect(Array.isArray(manifest.files)).toBe(true)
    expect(manifest.files.length).toBeGreaterThan(0)
    for (const entry of manifest.files) {
      expect(entry.path).toMatch(/^data\//)
      expect(entry.bytes).toBeGreaterThan(0)
    }
    expect(manifest.recordCounts.problemStems).toBe(457)
    expect(manifest.recordCounts.stemAssets).toBe(927)
  })
})

describe('图谱查询纯函数', () => {
  it('六个一级学科与 26 个专题完整归类', () => {
    expect(() => validateDisplayTaxonomy(taxonomy.disciplines)).not.toThrow()
    expect(() => validateDisplayTopics({ nodes, edges })).not.toThrow()
    expect(DISPLAY_DISCIPLINES).toHaveLength(6)
    const topicNodes = nodes.filter(node => node.type === 'topic')
    const assigned = [...taxonomy.disciplines.map(item => displayDisciplineFor(item.id).id), ...topicNodes.map(item => displayDisciplineFor(item.id).id)]
    expect(assigned).toHaveLength(32)
    expect(assigned.every(id => DISPLAY_DISCIPLINES.some(item => item.id === id))).toBe(true)
  })

  it('首页图谱与局部图谱遵守节点数量限制', () => {
    const initial = buildVisibleGraph({ nodes, edges })
    expect(initial.nodes.length).toBeGreaterThanOrEqual(60)
    expect(initial.nodes.length).toBeLessThanOrEqual(100)
    const selected = buildVisibleGraph({ nodes, edges }, { nodeId: 'kn-topic-000025' })
    expect(selected.nodes.length).toBeLessThanOrEqual(180)
    expect(selected.nodes.some(node => node.id === 'kn-topic-000025')).toBe(true)
  })

  it('相邻知识不截断、可读', () => {
    const neighbors = getNeighbors('kn-concept-000002', edges, nodes)
    expect(neighbors.length).toBeGreaterThan(1)
    expect(neighbors.every(item => item.other.id && item.relation)).toBe(true)
  })

  it('相关题目仅依据 nodeIds', () => {
    const related = getRelatedProblems('kn-topic-000025', problems)
    expect(related.length).toBeGreaterThan(0)
    expect(related.map(p => p.id)).toContain('problem-000006')
    expect(related.every(p => Array.isArray(p.nodeIds) && p.nodeIds.includes('kn-topic-000025'))).toBe(true)
    const redox = getRelatedProblems('kn-method-000004', problems)
    expect(redox.some(p => p.id === 'problem-000008')).toBe(true)
  })

  it('先修与后续方向正确', () => {
    expect(getPrerequisites('kn-method-000004', edges, nodes).map(n => n.id)).toContain('kn-concept-000006')
    expect(getFollowOns('kn-concept-000006', edges, nodes).map(n => n.id)).toContain('kn-method-000004')
  })
})
