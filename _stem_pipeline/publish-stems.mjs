/**
 * Validate stems in out/stems and publish to public/data/stems + manifest.
 */
import fs from 'node:fs'
import path from 'node:path'

const SITE = 'D:\\ccho-site-public'
const SRC = path.join(SITE, '_stem_pipeline', 'out', 'stems')
const DST = path.join(SITE, 'public', 'data', 'stems')
const DATA = path.join(SITE, 'public', 'data')

fs.mkdirSync(DST, { recursive: true })

const FORBIDDEN_KEYS = /^(answer|answerText|solution|solutionText|solutionSteps|rubric|scoreDetail|ocrRaw|fullText|rawPdfPath|internalPath)$/i
const HASH_KEY = /(?:sha256|checksum|digest|hash)/i

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (ent.name.endsWith('.json')) acc.push(p)
  }
  return acc
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.json') && f.startsWith('problem-'))
const passed = []
const failed = []

for (const f of files) {
  const p = path.join(SRC, f)
  const errors = []
  let stem
  try {
    stem = JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    failed.push({ file: f, errors: ['invalid json: ' + e.message] })
    continue
  }
  if (stem.schemaVersion !== 1) errors.push('schemaVersion')
  if (stem.problemId + '.json' !== f) errors.push('filename mismatch')
  if (!['stem_public', 'stem_demo', 'fulltext_authorized'].includes(stem.rightsState)) errors.push('rightsState')
  if (!(stem.blocks?.length || stem.parts?.length)) errors.push('empty body')
  const stack = [stem]
  while (stack.length) {
    const o = stack.pop()
    if (!o || typeof o !== 'object') continue
    if (Array.isArray(o)) {
      o.forEach(x => stack.push(x))
      continue
    }
    for (const [k, v] of Object.entries(o)) {
      if (FORBIDDEN_KEYS.test(k) || HASH_KEY.test(k)) errors.push('forbidden key ' + k)
      if (v && typeof v === 'object') stack.push(v)
    }
  }
  if (errors.length) failed.push({ file: f, errors })
  else {
    fs.copyFileSync(p, path.join(DST, f))
    passed.push(stem)
  }
}

// Keep any existing demo stems not overwritten
const index = {
  schemaVersion: 1,
  items: passed
    .map(s => ({
      problemId: s.problemId,
      path: `data/stems/${s.problemId}.json`,
      rightsState: s.rightsState,
      title: s.title,
    }))
    .sort((a, b) => a.problemId.localeCompare(b.problemId)),
}
fs.writeFileSync(path.join(DST, 'index.json'), JSON.stringify(index, null, 2), 'utf8')

// Rebuild manifest.files
const allJson = walk(DATA)
const manifestPath = path.join(DATA, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.notice = '本网站公开题目元数据、知识映射、来源索引，以及经授权或程序化整理的结构化题干；不提供参考解答与评分材料。'
manifest.rightsPolicy = 'metadata_public'
manifest.recordCounts = manifest.recordCounts || {}
manifest.recordCounts.stems = passed.length

// iterative self-size for manifest.json
let filesList = allJson
  .filter(p => path.basename(p) !== 'manifest.json')
  .map(p => ({
    path: 'data/' + path.relative(DATA, p).split(path.sep).join('/'),
    bytes: fs.statSync(p).size,
  }))
for (let i = 0; i < 4; i++) {
  const payload = {
    ...manifest,
    files: [...filesList, { path: 'data/manifest.json', bytes: 0 }].sort((a, b) => a.path.localeCompare(b.path)),
  }
  let raw = JSON.stringify(payload)
  let b = Buffer.byteLength(raw)
  payload.files = payload.files.map(f => (f.path === 'data/manifest.json' ? { path: f.path, bytes: b } : f))
  raw = JSON.stringify(payload)
  b = Buffer.byteLength(raw)
  payload.files = payload.files.map(f => (f.path === 'data/manifest.json' ? { path: f.path, bytes: b } : f))
  fs.writeFileSync(manifestPath, JSON.stringify(payload))
  manifest.files = payload.files
}

const report = { passed: passed.length, failed, indexItems: index.items.length }
fs.writeFileSync(path.join(SITE, '_stem_pipeline', 'logs', 'publish-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ passed: passed.length, failed: failed.length, index: index.items.length }, null, 2))
if (failed.length) {
  console.error('Some stems failed validation:', failed.slice(0, 10))
}
