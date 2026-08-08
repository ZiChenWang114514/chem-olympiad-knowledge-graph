import type { Discipline, DisplayDiscipline, DisplayTopic, GraphData, GraphNode } from '../types'

type TopicConfig = [id: string, name: string]

const TOPICS: Record<string, TopicConfig[]> = {
  无机: [
    ['kn-topic-000001', '主族化学'], ['kn-topic-000005', '冶金化学'], ['kn-topic-000011', '有机金属化学'],
    ['kn-topic-000013', '核化学'], ['kn-topic-000017', '生物无机化学'], ['kn-topic-000025', '配位化学'],
    ['kn-topic-000008', '工业化学'],
  ],
  有机: [
    ['kn-topic-000010', '有机硅化学'], ['kn-topic-000016', '生物化学'], ['kn-topic-000026', '高分子化学'],
  ],
  物理: [
    ['kn-topic-000002', '催化化学'], ['kn-topic-000003', '光化学'], ['kn-topic-000014', '热力学'],
    ['kn-topic-000018', '生物物理化学'], ['kn-topic-000019', '电化学'], ['kn-topic-000021', '胶体化学'],
    ['kn-topic-000022', '能源化学'], ['kn-topic-000023', '表面化学'],
  ],
  分析: [['kn-topic-000004', '光谱化学'], ['kn-topic-000015', '环境化学']],
  结构: [
    ['kn-topic-000009', '晶体化学'], ['kn-topic-000012', '材料化学'], ['kn-topic-000020', '纳米材料'],
    ['kn-topic-000024', '超分子化学'],
  ],
  实验: [['kn-topic-000007', '实验技能'], ['kn-topic-000006', '化工过程']],
}

const LEGACY_ROOT: Record<string, string> = {
  无机化学: '无机', 有机化学: '有机', 物理化学: '物理', 分析化学: '分析', 结构化学: '结构', 实验化学: '实验',
}

const COLORS: Record<string, string> = {
  无机: '#39789F', 有机: '#9A5687', 物理: '#B98018', 分析: '#2E846F', 结构: '#596FA8', 实验: '#BD6248',
}

function toTopics(root: string): DisplayTopic[] {
  return TOPICS[root].map(([id, name]) => ({ id, name, sourceDisciplineId: name }))
}

export const DISPLAY_DISCIPLINES: DisplayDiscipline[] = ['无机', '有机', '物理', '分析', '结构', '实验'].map(name => ({
  id: name,
  name,
  color: COLORS[name],
  sourceDisciplineIds: [name, ...TOPICS[name].map(([, topic]) => topic)],
  topics: toTopics(name),
}))

const TOPIC_TO_DISPLAY = new Map(DISPLAY_DISCIPLINES.flatMap(item => item.topics.map(topic => [topic.name, item] as const)))
const TOPIC_ID_TO_DISPLAY = new Map(DISPLAY_DISCIPLINES.flatMap(item => item.topics.map(topic => [topic.id, item] as const)))
const TOPIC_BY_ID = new Map(DISPLAY_DISCIPLINES.flatMap(item => item.topics.map(topic => [topic.id, topic] as const)))

export function displayDisciplineFor(source: string): DisplayDiscipline {
  const root = LEGACY_ROOT[source] || source
  const result = DISPLAY_DISCIPLINES.find(item => item.id === root) || TOPIC_TO_DISPLAY.get(source) || TOPIC_ID_TO_DISPLAY.get(source)
  if (!result) throw new Error(`公开分类“${source}”尚未归入六大学科。`)
  return result
}

export function displayDisciplineById(id?: string | null): DisplayDiscipline | undefined {
  return id ? DISPLAY_DISCIPLINES.find(item => item.id === id) : undefined
}

export function displayTopicFor(source: string): DisplayTopic | undefined {
  return TOPIC_BY_ID.get(source) || DISPLAY_DISCIPLINES.flatMap(item => item.topics).find(topic => topic.name === source)
}

export function displayTopicForNode(nodeId: string, graph: GraphData): DisplayTopic | undefined {
  const node = graph.nodes.find(item => item.id === nodeId)
  if (node?.type === 'topic') return displayTopicFor(node.id) || displayTopicFor(node.label)
  const topicId = graph.edges.find(edge => edge.source === nodeId && edge.relation === 'belongs_to' && TOPIC_BY_ID.has(edge.target))?.target
  return topicId ? TOPIC_BY_ID.get(topicId) : undefined
}

export function displayDisciplineForNode(node: GraphNode, graph?: GraphData): DisplayDiscipline {
  const topic = node.type === 'topic'
    ? displayTopicFor(node.id) || displayTopicFor(node.label)
    : graph ? displayTopicForNode(node.id, graph) : undefined
  return topic ? displayDisciplineFor(topic.id) : displayDisciplineFor(node.discipline)
}

export function displayDisciplineColor(source: string): string {
  return displayDisciplineFor(source).color
}

export function validateDisplayTaxonomy(disciplines: Discipline[]): void {
  const names = disciplines.map(item => item.id || item.name)
  const expected = DISPLAY_DISCIPLINES.map(item => item.id)
  const unknown = names.filter(name => !expected.includes(LEGACY_ROOT[name] || name))
  const missing = expected.filter(name => !names.some(value => (LEGACY_ROOT[value] || value) === name))
  if (unknown.length || missing.length) {
    const details = [unknown.length ? `未归类：${unknown.join('、')}` : '', missing.length ? `公开数据缺少：${missing.join('、')}` : ''].filter(Boolean).join('；')
    throw new Error(`六大学科显示配置与公开分类不一致。${details}`)
  }
}

export function validateDisplayTopics(graph: GraphData): void {
  const publicTopics = graph.nodes.filter(node => node.type === 'topic')
  const configured = new Set(DISPLAY_DISCIPLINES.flatMap(item => item.topics.map(topic => topic.id)))
  const unknown = publicTopics.filter(node => !configured.has(node.id))
  const missing = [...configured].filter(id => !publicTopics.some(node => node.id === id))
  if (unknown.length || missing.length) throw new Error('专题显示配置与公开图谱不一致。')
}

export function aggregateDisciplineCounts(rows: { name: string; value: number }[]) {
  const totals = new Map(DISPLAY_DISCIPLINES.map(item => [item.id, 0]))
  for (const row of rows) {
    const display = displayDisciplineFor(row.name)
    totals.set(display.id, (totals.get(display.id) || 0) + row.value)
  }
  return DISPLAY_DISCIPLINES.map(item => ({ ...item, value: totals.get(item.id) || 0 }))
}

export function displayTaxonomyDisciplines(): Discipline[] {
  return DISPLAY_DISCIPLINES.map(item => ({ id: item.id, name: item.name, color: item.color }))
}
