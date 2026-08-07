import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mdRoot = 'D:\\打工2\\初赛&决赛\\MinerU_MD'
const SHARDS = 10

const exams = JSON.parse(fs.readFileSync(path.join(siteRoot, 'public/data/exams/index.json'), 'utf8')).items
const years = fs.readdirSync(path.join(siteRoot, 'public/data/exams')).filter(f => /^\d{4}\.json$/.test(f))
const problems = years.flatMap(y => {
  const items = JSON.parse(fs.readFileSync(path.join(siteRoot, 'public/data/exams', y), 'utf8')).items
  return items.map(p => {
    const e = exams.find(x => x.id === p.examId)
    return {
      ...p,
      year: e?.year,
      stage: e?.stage,
      sourceLabel: e?.sourceLabel || p.sourceLabel || '',
      examTitle: e?.title || '',
    }
  })
})

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (ent.name.toLowerCase() === 'full.md') acc.push(p)
  }
  return acc
}

function parseYear(folder) {
  const m = folder.match(/(20\d{2})/)
  return m ? Number(m[1]) : null
}

function parseStage(folder, rel) {
  if (/答案|评分|细则|参考答案/.test(folder)) return { stage: null, skip: true, reason: 'answer_key' }
  if (/juesai|决赛/i.test(folder) || /[\\/]决赛[\\/]/.test(rel)) return { stage: 'final', skip: false }
  if (/chusai|初赛/i.test(folder) || /[\\/]初赛[\\/]/.test(rel)) return { stage: 'preliminary', skip: false }
  return { stage: null, skip: false }
}

const mds = walk(mdRoot)
const tasks = []

for (const md of mds) {
  const rel = path.relative(mdRoot, md).split(path.sep).join('/')
  const folder = path.basename(path.dirname(md))
  const year = parseYear(folder)
  const stageInfo = parseStage(folder, rel)
  if (stageInfo.skip) {
    tasks.push({ md, rel, folder, skip: true, reason: stageInfo.reason, year, stage: null, problems: [] })
    continue
  }
  const stage = stageInfo.stage
  let pool = problems.filter(p => p.year === year && (!stage || p.stage === stage))

  // Prefer sourceLabel match (strip .pdf)
  const bySource = pool.filter(p => {
    const sl = String(p.sourceLabel || '').replace(/\.pdf$/i, '')
    if (!sl) return false
    return folder.includes(sl) || sl.includes(folder) || folder.replace(/-juesai.*|-chusai.*/, '') === sl.replace(/-juesai.*|-chusai.*/, '')
  })
  if (bySource.length) pool = bySource

  // For multi-paper years (2020+ final parts), try -1/-2 suffix
  const part = folder.match(/-(?:juesai|chusai)-?(\d)$/i) || folder.match(/第([一二])场/)
  if (part && pool.length > 12) {
    // leave all; agents will use number mapping; alternatively split by examId later
  }

  const paperProblems = [...new Map(pool.map(p => [p.id, {
    id: p.id,
    number: p.number,
    title: p.title,
    examId: p.examId,
    year: p.year,
    stage: p.stage,
    sourceLabel: p.sourceLabel,
    sourceDocumentId: p.sourceDocumentId,
    page: p.page,
  }])).values()].sort((a, b) => String(a.number).localeCompare(String(b.number), 'zh', { numeric: true }))

  tasks.push({
    md,
    rel,
    folder,
    skip: paperProblems.length === 0,
    reason: paperProblems.length === 0 ? 'no_problem_match' : undefined,
    year,
    stage,
    problemCount: paperProblems.length,
    problems: paperProblems,
  })
}

const work = tasks.filter(t => !t.skip)
const skipped = tasks.filter(t => t.skip)
const shards = Array.from({ length: SHARDS }, (_, i) => ({ id: i, tasks: [], problemCount: 0 }))
for (const t of [...work].sort((a, b) => b.problemCount - a.problemCount)) {
  shards.sort((a, b) => a.problemCount - b.problemCount)
  shards[0].tasks.push(t)
  shards[0].problemCount += t.problemCount
}

const outDir = path.join(siteRoot, '_stem_pipeline')
fs.mkdirSync(path.join(outDir, 'shards'), { recursive: true })
fs.mkdirSync(path.join(outDir, 'out', 'stems'), { recursive: true })
fs.mkdirSync(path.join(outDir, 'out', 'latex'), { recursive: true })
fs.mkdirSync(path.join(outDir, 'logs'), { recursive: true })
fs.mkdirSync(path.join(outDir, 'prompts'), { recursive: true })

const inventory = {
  generatedAt: new Date().toISOString(),
  mdRoot,
  siteRoot,
  totalMd: mds.length,
  workPapers: work.length,
  totalProblems: work.reduce((s, t) => s + t.problemCount, 0),
  uniqueProblemIds: new Set(work.flatMap(t => t.problems.map(p => p.id))).size,
  skipped: skipped.map(s => ({ rel: s.rel, reason: s.reason, year: s.year, stage: s.stage })),
  shards: shards.map(s => ({ id: s.id, problemCount: s.problemCount, papers: s.tasks.length })),
}

fs.writeFileSync(path.join(outDir, 'inventory.json'), JSON.stringify({ ...inventory, allTasks: work }, null, 2))
for (const s of shards) {
  const dir = path.join(outDir, 'shards', `shard-${String(s.id).padStart(2, '0')}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'tasks.json'), JSON.stringify({
    shardId: s.id,
    problemCount: s.problemCount,
    papers: s.tasks.length,
    tasks: s.tasks,
  }, null, 2))
}

console.log(JSON.stringify(inventory, null, 2))
