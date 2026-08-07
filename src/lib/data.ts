import type { Discipline, Exam, GraphData, SearchItem, Stats, Problem, Relation } from '../types'

const root = import.meta.env.BASE_URL
async function get<T>(path: string): Promise<T> { const response = await fetch(`${root}${path}`); if (!response.ok) throw new Error(`数据读取失败：${path}`); return response.json() }

export async function loadData() {
  const [taxonomy, exams, graph, search, statistics, ...yearFiles] = await Promise.all([
    get<{ disciplines: Discipline[]; relations: Relation[] }>('data/taxonomy.json'),
    get<{ items: Exam[] }>('data/exams/index.json'), get<GraphData>('data/graph/all.json'),
    get<{ items: SearchItem[] }>('data/search-index.json'), get<Stats>('data/statistics.json'),
    get<{ items: Problem[] }>('data/exams/2006.json'), get<{ items: Problem[] }>('data/exams/2024.json'), get<{ items: Problem[] }>('data/exams/2025.json'),
  ])
  return { taxonomy, exams: exams.items, graph, search: search.items, statistics, problems: yearFiles.flatMap((f) => f.items) }
}
export type AppData = Awaited<ReturnType<typeof loadData>>
