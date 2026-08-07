import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import manifest from '../public/data/manifest.json'
import taxonomy from '../public/data/taxonomy.json'
import graph from '../public/data/graph/all.json'

describe('公开数据完整性', () => {
  it('声明版本和公开版权策略', () => { expect(manifest.dataVersion).toBeTruthy(); expect(manifest.rightsPolicy).toBe('metadata_public') })
  it('知识节点与关系引用均存在', () => {
    const ids = new Set(graph.nodes.map(n => n.id));
    for (const edge of graph.edges) { expect(ids.has(edge.source)).toBe(true); expect(ids.has(edge.target)).toBe(true) }
    expect(new Set(taxonomy.disciplines.map(d => d.id)).size).toBe(taxonomy.disciplines.length)
  })
  it('manifest 中的公开文件哈希与实际内容一致', () => {
    for (const [file, expected] of Object.entries(manifest.fileHashes)) {
      const bytes = readFileSync(new URL(`../public/${file}`, import.meta.url))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected)
    }
  })
})
