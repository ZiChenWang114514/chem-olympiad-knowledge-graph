import type { Discipline, Exam, GraphData, Manifest, SearchItem, Stats, Problem, Relation, StemIndex } from '../types'
import { loadStemIndex } from './stem'
import { validateDisplayTaxonomy, validateDisplayTopics } from './displayTaxonomy'

const root = import.meta.env.BASE_URL
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${root}${path}`)
  if (!response.ok) throw new Error(`数据读取失败：${path}`)
  return response.json()
}

export async function loadData() {
  const [manifest, taxonomy, exams, graph, search, statistics, stemIndex] = await Promise.all([
    get<Manifest>('data/manifest.json'),
    get<{ disciplines: Discipline[]; relations: Relation[] }>('data/taxonomy.json'),
    get<{ items: Exam[] }>('data/exams/index.json'),
    get<GraphData>('data/graph/all.json'),
    get<{ items: SearchItem[] }>('data/search-index.json'),
    get<Stats>('data/statistics.json'),
    loadStemIndex(),
  ])
  const years = [...new Set(exams.items.map(exam => exam.year))]
  validateDisplayTaxonomy(taxonomy.disciplines)
  validateDisplayTopics(graph)
  const yearFiles = await Promise.all(years.map(year => get<{ items: Problem[] }>(`data/exams/${year}.json`)))
  const stemIds = new Set(stemIndex.items.map(item => item.problemId))
  const problems = yearFiles.flatMap(f => f.items).map(problem => ({
    ...problem,
    hasStem: stemIds.has(problem.id),
  }))
  return {
    manifest,
    taxonomy,
    exams: exams.items,
    graph,
    search: search.items,
    statistics,
    problems,
    stemIndex: stemIndex as StemIndex,
  }
}
export type AppData = Awaited<ReturnType<typeof loadData>>
