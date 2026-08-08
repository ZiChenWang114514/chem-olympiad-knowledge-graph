import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'
import 'katex/dist/contrib/mhchem.mjs'

const root = path.resolve('D:/打工2/projects/化学竞赛知识图谱-public/_stem_pipeline/quality-review')
const requestedGroup = process.argv.includes('--group') ? process.argv[process.argv.indexOf('--group') + 1] : null
const groups = requestedGroup ? [requestedGroup.padStart(2, '0')] : ['01', '02', '03']
const allowedRoles = new Set(['assesses', 'requires', 'context_only'])
const allowedEvidence = new Set(['question', 'official_answer', 'grading_material', 'expert_inference'])
const allowedRelations = new Set(['belongs_to', 'prerequisite', 'derives', 'applies', 'contrasts', 'co_assessed'])
const allowedNodeTypes = new Set(['topic', 'concept', 'method', 'lab_skill', 'reaction_model', 'common_error'])
const allowedDisciplines = new Set(['无机', '有机', '物理', '分析', '结构', '实验'])
const forbiddenKeys = /(answer|solution|rubric|scoreDetail|ocrRaw|fullText|internalPath)/i
const badChars = /[\uFFFD\uE000-\uF8FF⼀-⿕]/u
const splitNumber = /(?<!\d)\d(?:\s+\d){2,}(?:\s*\.\s*\d+)?/u

function load(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
}

function add(errors, problemId, code, message) {
  errors.push({ problemId, code, message })
}

function scanObject(value, errors, problemId, trail = '') {
  if (Array.isArray(value)) return value.forEach((item, index) => scanObject(item, errors, problemId, `${trail}[${index}]`))
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.test(key)) add(errors, problemId, 'protected_field', `${trail}.${key}`)
    scanObject(child, errors, problemId, `${trail}.${key}`)
  }
}

function strictLatex(latex, displayMode, errors, problemId, location) {
  try {
    katex.renderToString(latex, { displayMode, throwOnError: true, strict: 'error', trust: false })
  } catch (error) {
    add(errors, problemId, 'katex_error', `${location}: ${error.message}`)
  }
}

function richText(text, errors, problemId, location) {
  if (badChars.test(text)) add(errors, problemId, 'bad_unicode', location)
  if (text.includes('?')) add(errors, problemId, 'ascii_question_mark', location)
  if (splitNumber.test(text)) add(errors, problemId, 'split_number', location)
  if (/\\normalfont|\\begin\{array\}|\\end\{array\}/.test(text)) add(errors, problemId, 'unnecessary_latex', location)
  const islands = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  let match
  while ((match = islands.exec(text))) strictLatex(match[1] ?? match[2], match[1] != null, errors, problemId, location)
}

function validateBlocks(blocks, context, subparts, labels, figures, errors, problemId) {
  if (!Array.isArray(blocks) || !blocks.length) {
    add(errors, problemId, 'empty_blocks', context)
    return
  }
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    const location = `${context}[${index}]`
    if (!block || typeof block !== 'object' || typeof block.type !== 'string') {
      add(errors, problemId, 'invalid_block', location)
      continue
    }
    if (block.type === 'paragraph' || block.type === 'callout' || block.type === 'heading') {
      richText(block.text || '', errors, problemId, location)
      if (block.type === 'paragraph' && /^\s*年(?!代)/.test(block.text || '')) add(errors, problemId, 'missing_year_prefix', location)
    }
    else if (block.type === 'formula') strictLatex(block.latex || '', block.display !== false, errors, problemId, location)
    else if (block.type === 'chem') strictLatex((block.latex || '').trim().startsWith('\\ce{') ? block.latex : `\\ce{${block.latex || ''}}`, block.display !== false, errors, problemId, location)
    else if (block.type === 'list') (block.items || []).forEach((item, itemIndex) => richText(item, errors, problemId, `${location}.items[${itemIndex}]`))
    else if (block.type === 'table') {
      ;[...(block.headers || []), ...(block.rows || []).flat()].forEach((cell, cellIndex) => richText(cell, errors, problemId, `${location}.cell[${cellIndex}]`))
    } else if (block.type === 'subpart') {
      const ref = block.localRef || block.partId
      if (!ref || !block.label) add(errors, problemId, 'invalid_subpart', location)
      if (subparts.has(ref)) add(errors, problemId, 'duplicate_subpart', ref)
      subparts.set(ref, block.label)
      if (labels.has(block.label)) add(errors, problemId, 'duplicate_subpart_label', block.label)
      labels.add(block.label)
      if (/\d{4}$|^\d+\.\d{2,}$|-0{2,}\d*$|-\d{3,}$/.test(block.label)) add(errors, problemId, 'suspicious_subpart_label', block.label)
      if (block.prompt) richText(block.prompt, errors, problemId, `${location}.prompt`)
      validateBlocks(block.blocks, `${location}.blocks`, subparts, labels, figures, errors, problemId)
    } else if (block.type === 'figure') {
      if (!block.src || !/^data\/stems\/assets\/problem-[0-9]{6}-figure-[0-9]{3}\.(jpg|jpeg|png|webp|gif|svg)$/.test(block.src)) add(errors, problemId, 'invalid_figure_src', location)
      if (!block.alt || /题目配图第|已按原图查看|原卷题图|结构或装置示意|图片/.test(block.alt)) add(errors, problemId, 'generic_figure_alt', location)
      figures.push(block)
    } else if (block.type === 'layout') {
      if (!Array.isArray(block.columns) || block.columns.length < 2) add(errors, problemId, 'invalid_layout', location)
      else block.columns.forEach((column, columnIndex) => validateBlocks(column.blocks, `${location}.columns[${columnIndex}]`, subparts, labels, figures, errors, problemId))
    } else add(errors, problemId, 'unknown_block', `${location}: ${block.type}`)
  }
}

const tasks = []
for (const group of groups) tasks.push(...load(path.join(root, `executor-${group}`, 'tasks.json')).map(task => ({ ...task, group })))
const taxonomyNodeIds = new Set(load(path.join(root, 'taxonomy-snapshot.json')).nodes.map(node => node.id))
const taskIds = new Set(tasks.map(task => task.problemId))
const errors = []
const expectedQuestions = requestedGroup ? tasks.length : 457
if (tasks.length !== expectedQuestions || taskIds.size !== expectedQuestions) add(errors, 'all', 'task_coverage', `tasks=${tasks.length}, unique=${taskIds.size}`)
let imageCount = 0
let subpartCount = 0
for (const task of tasks) {
  const output = path.join(root, `executor-${task.group}`, 'output')
  const stemPath = path.join(output, 'stems', `${task.problemId}.json`)
  const patchPath = path.join(output, 'graph-patches', `${task.problemId}.json`)
  const auditPath = path.join(output, 'audit', `${task.problemId}.json`)
  for (const file of [stemPath, patchPath, auditPath]) if (!fs.existsSync(file)) add(errors, task.problemId, 'missing_output', file)
  if (![stemPath, patchPath, auditPath].every(fs.existsSync)) continue
  const stem = load(stemPath)
  const graph = load(patchPath)
  const audit = load(auditPath)
  scanObject(stem, errors, task.problemId)
  if (stem.schemaVersion !== 2 || stem.problemId !== task.problemId || stem.rightsState === 'stem_demo') add(errors, task.problemId, 'invalid_stem_root', stemPath)
  if (!Array.isArray(stem.source?.pages) || !stem.source.pages.length || stem.source.pages.some(page => !Number.isInteger(page) || page < 1)) add(errors, task.problemId, 'invalid_source_pages', stemPath)
  const subparts = new Map()
  const labels = new Set()
  const figures = []
  validateBlocks(stem.blocks, 'blocks', subparts, labels, figures, errors, task.problemId)
  subpartCount += subparts.size
  imageCount += figures.length
  if (figures.length !== task.images.length) add(errors, task.problemId, 'figure_count', `expected=${task.images.length}, actual=${figures.length}`)
  for (const figure of figures) {
    const file = path.join(output, 'assets', path.basename(figure.src))
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) add(errors, task.problemId, 'missing_asset', file)
  }
  if (graph.problemId !== task.problemId || !Array.isArray(graph.mappings)) add(errors, task.problemId, 'invalid_graph_patch', patchPath)
  const proposedRefs = new Set()
  for (const node of graph.proposedNodes || []) {
    if (!node.localRef || proposedRefs.has(node.localRef) || !node.preferredLabel || !allowedNodeTypes.has(node.nodeType) || !allowedDisciplines.has(node.discipline) || !node.definition) add(errors, task.problemId, 'invalid_proposed_node', JSON.stringify(node))
    proposedRefs.add(node.localRef)
  }
  const mappingKeys = new Set()
  const assesses = new Set()
  const assessesByTarget = new Map()
  for (const mapping of graph.mappings || []) {
    const nodeRef = mapping.knowledgeNodeId || mapping.newNodeLocalRef
    if (!nodeRef || !mapping.targetRef || !allowedRoles.has(mapping.mappingRole) || !allowedEvidence.has(mapping.evidenceBasis)) add(errors, task.problemId, 'invalid_mapping', JSON.stringify(mapping))
    if (mapping.knowledgeNodeId && !taxonomyNodeIds.has(mapping.knowledgeNodeId)) add(errors, task.problemId, 'unknown_mapping_node', mapping.knowledgeNodeId)
    if (mapping.newNodeLocalRef && !proposedRefs.has(mapping.newNodeLocalRef)) add(errors, task.problemId, 'unknown_proposed_node', mapping.newNodeLocalRef)
    if (!mapping.explanation || /题目主题与来源页对应|该小问具有独立设问|补充对应知识映射|题目设问直接涉及该知识点/.test(mapping.explanation)) add(errors, task.problemId, 'generic_mapping_explanation', JSON.stringify(mapping))
    const key = `${mapping.targetRef}|${nodeRef}`
    if (mappingKeys.has(key)) add(errors, task.problemId, 'duplicate_mapping', key)
    mappingKeys.add(key)
    if (mapping.mappingRole === 'assesses') {
      assesses.add(mapping.targetRef)
      if (!assessesByTarget.has(mapping.targetRef)) assessesByTarget.set(mapping.targetRef, new Set())
      assessesByTarget.get(mapping.targetRef).add(nodeRef)
    }
  }
  for (const ref of subparts.keys()) if (!assesses.has(ref)) add(errors, task.problemId, 'subpart_without_assesses', ref)
  if (!subparts.size && !assesses.has(task.problemId)) add(errors, task.problemId, 'problem_without_assesses', task.problemId)
  const subpartSets = [...subparts.keys()].map(ref => [...(assessesByTarget.get(ref) || [])].sort().join('|')).filter(Boolean)
  if (subpartSets.length >= 3 && new Set(subpartSets).size === 1 && subpartSets[0].split('|').length === 1 && !graph.uniformMappingJustification) add(errors, task.problemId, 'uniform_subpart_mapping', subpartSets[0])
  const edgeKeys = new Set()
  for (const edge of graph.edges || []) {
    const source = edge.sourceNodeId || edge.sourceLocalRef
    const target = edge.targetNodeId || edge.targetLocalRef
    if (!source || !target || source === target || !allowedRelations.has(edge.relationType) || !edge.explanation || !allowedEvidence.has(edge.evidenceBasis)) add(errors, task.problemId, 'invalid_edge', JSON.stringify(edge))
    if (edge.sourceLocalRef && !proposedRefs.has(edge.sourceLocalRef)) add(errors, task.problemId, 'unknown_edge_source', edge.sourceLocalRef)
    if (edge.targetLocalRef && !proposedRefs.has(edge.targetLocalRef)) add(errors, task.problemId, 'unknown_edge_target', edge.targetLocalRef)
    const key = `${source}|${edge.relationType}|${target}`
    if (edgeKeys.has(key)) add(errors, task.problemId, 'duplicate_edge', key)
    edgeKeys.add(key)
  }
  if (audit.problemId !== task.problemId || !Array.isArray(audit.issues) || audit.issues.some(issue => issue.severity === 'error' && !issue.resolution)) add(errors, task.problemId, 'unresolved_audit', auditPath)
}
const report = { questions: tasks.length, images: imageCount, subparts: subpartCount, errors }
fs.writeFileSync(path.join(root, requestedGroup ? `validation-report-${groups[0]}.json` : 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ questions: report.questions, images: report.images, subparts: report.subparts, errors: errors.length }))
if (errors.length) process.exitCode = 1
