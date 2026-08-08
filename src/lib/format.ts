/** 展示层工具（不改动原始数据字段） */

export function displayProblemTitle(title: string): string {
  return title.replace(/^基础设施演示记录[：:]\s*/, '').trim() || title
}

const STAGE_LABELS: Record<string, string> = {
  preliminary: '初赛',
  prelim: '初赛',
  final: '决赛',
  初赛: '初赛',
  决赛: '决赛',
}

export function examStageLabel(stage: string): string {
  if (!stage) return '未标注'
  return STAGE_LABELS[stage] || STAGE_LABELS[stage.toLowerCase()] || stage
}

const RIGHTS_STATE_LABELS: Record<string, string> = {
  metadata_public: '公开资料',
  internal_only: '内部资料',
  fulltext_authorized: '题干已获授权',
  stem_public: '题干可公开阅读',
  stem_demo: '排版示例',
}

export function rightsStateLabel(state?: string): string {
  if (!state) return '未发布题干'
  return RIGHTS_STATE_LABELS[state] || state
}
