/** 展示层工具（不改动原始数据字段） */

export function displayProblemTitle(title: string): string {
  return title.trim()
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
