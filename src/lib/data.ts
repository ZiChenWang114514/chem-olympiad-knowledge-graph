import type { Discipline, Exam, GraphData, Manifest, SearchItem, Stats, Problem, Relation } from '../types'

const root = import.meta.env.BASE_URL
async function get<T>(path: string): Promise<T> { const response = await fetch(`${root}${path}`); if (!response.ok) throw new Error(`数据读取失败：${path}`); return response.json() }

export async function loadData() {
  const [manifest, taxonomy, exams, graph, search, statistics] = await Promise.all([
    get<Manifest>('data/manifest.json'),
    get<{ disciplines: Discipline[]; relations: Relation[] }>('data/taxonomy.json'),
    get<{ items: Exam[] }>('data/exams/index.json'), get<GraphData>('data/graph/all.json'),
    get<{ items: SearchItem[] }>('data/search-index.json'), get<Stats>('data/statistics.json'),
  ])
  const years = [...new Set(exams.items.map(exam => exam.year))]
  const yearFiles = await Promise.all(years.map(year => get<{ items: Problem[] }>(`data/exams/${year}.json`)))
  return { manifest, taxonomy, exams: exams.items, graph, search: search.items, statistics, problems: yearFiles.flatMap((f) => f.items) }
}
export type AppData = Awaited<ReturnType<typeof loadData>>
