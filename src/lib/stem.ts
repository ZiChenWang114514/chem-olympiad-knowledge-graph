import type { ProblemStem, StemIndex, StemIndexItem } from '../types'

const root = import.meta.env.BASE_URL

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${root}${path}`)
  if (!response.ok) throw new Error(`题干读取失败：${path}`)
  return response.json() as Promise<T>
}

export async function loadStemIndex(): Promise<StemIndex> {
  try {
    return await getJson<StemIndex>('data/stems/index.json')
  } catch {
    return { schemaVersion: 2, items: [] }
  }
}

export function stemIndexMap(index: StemIndex): Map<string, StemIndexItem> {
  return new Map(index.items.map(item => [item.problemId, item]))
}

export async function loadProblemStem(problemId: string, index?: StemIndex): Promise<ProblemStem | null> {
  const catalog = index ?? (await loadStemIndex())
  const entry = catalog.items.find(item => item.problemId === problemId)
  if (!entry) return null
  const stem = await getJson<ProblemStem>(entry.path.replace(/^\//, ''))
  if (stem.problemId !== problemId) {
    throw new Error(`题干 problemId 与请求不一致：${stem.problemId} ≠ ${problemId}`)
  }
  if (stem.schemaVersion !== 2) {
    throw new Error(`不支持的题干 schemaVersion：${stem.schemaVersion}`)
  }
  if (!stem.blocks.length) throw new Error('题干缺少 blocks')
  return stem
}
