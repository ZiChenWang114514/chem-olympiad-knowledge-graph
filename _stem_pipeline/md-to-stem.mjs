/**
 * Deterministic MinerU MD → ProblemStem JSON converter.
 * Does not require LLM. Splits papers by problem headings and maps to problem IDs.
 */
import fs from 'node:fs'
import path from 'node:path'

const SITE = 'D:\\ccho-site-public'
const PIPE = path.join(SITE, '_stem_pipeline')
const OUT_STEMS = path.join(PIPE, 'out', 'stems')
const OUT_LATEX = path.join(PIPE, 'out', 'latex')
const LOG = path.join(PIPE, 'logs', 'md-to-stem.log')

fs.mkdirSync(OUT_STEMS, { recursive: true })
fs.mkdirSync(OUT_LATEX, { recursive: true })

function log(m) {
  const line = `[${new Date().toISOString()}] ${m}`
  fs.appendFileSync(LOG, line + '\n')
  console.log(line)
}

function rewriteMdPath(p) {
  if (!p) return p
  return p
    .replace(/^D:\\\\打工2\\\\初赛&决赛/i, 'D:\\\\ccho-exams-link')
    .replace(/^D:\\打工2\\初赛&决赛/i, 'D:\\ccho-exams-link')
    .replace(/\//g, path.sep)
}

/** Normalize MinerU math-ish fragments toward KaTeX-friendly LaTeX */
function cleanMath(s) {
  return s
    .replace(/\\mathrm\s*\{([^}]*)\}/g, '{$1}')
    .replace(/\\mathrm\s+([A-Za-z0-9]+)/g, '{$1}')
    .replace(/\s+/g, ' ')
    .trim()
}

function mdInlineToText(line) {
  // images → textual placeholder
  let t = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '（图：$1）')
  // display math $$...$$ kept as $...$ for paragraph renderer
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => `$$${cleanMath(m)}$$`)
  // collapse HTML sub/sup roughly
  t = t.replace(/<sub>(.*?)<\/sub>/gi, '_{$1}')
  t = t.replace(/<sup>(.*?)<\/sup>/gi, '^{$1}')
  t = t.replace(/<[^>]+>/g, '')
  return t.trim()
}

function isProblemStart(line, index, lines) {
  const t = line.trim()
  if (!t) return null
  // 第1题 / 第 1 题
  let m = t.match(/^#{0,3}\s*第\s*(\d+)\s*题/)
  if (m) return { key: m[1], raw: t }
  // 题1 / 试题1
  m = t.match(/^#{0,3}\s*(?:试)?题\s*(\d+)\b/)
  if (m) return { key: m[1], raw: t }
  // Q1 / Q6
  m = t.match(/^#{0,3}\s*Q\s*(\d+)\b/i)
  if (m) return { key: m[1], raw: t }
  // 1.  or 1、 at start of line (careful: not 1-1)
  m = t.match(/^#{0,3}\s*(\d{1,2})[\.、．]\s+\S/)
  if (m) return { key: m[1], raw: t }
  // bare "1 " with score pattern 第1题 already handled; "（一）" style
  m = t.match(/^#{0,3}\s*[（(]([一二三四五六七八九十]+)[)）]/)
  if (m) {
    const map = { 一: '1', 二: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9', 十: '10' }
    if (map[m[1]]) return { key: map[m[1]], raw: t }
  }
  return null
}

function splitProblems(mdText) {
  const lines = mdText.split(/\r?\n/)
  const chunks = []
  let cur = null
  for (let i = 0; i < lines.length; i++) {
    const hit = isProblemStart(lines[i], i, lines)
    if (hit && (!cur || hit.key !== cur.key || lines[i].includes('题'))) {
      // avoid restarting on 1-1 subparts: if line matches N-M skip
      if (/^\s*\d+-\d+/.test(lines[i].trim())) {
        if (cur) cur.lines.push(lines[i])
        continue
      }
      if (cur) chunks.push(cur)
      cur = { key: hit.key, titleLine: hit.raw, lines: [lines[i]] }
    } else if (cur) {
      cur.lines.push(lines[i])
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

function linesToBlocks(bodyLines) {
  const blocks = []
  let para = []
  const flushPara = () => {
    if (!para.length) return
    const text = para.map(mdInlineToText).filter(Boolean).join('\n')
    if (text) blocks.push({ type: 'paragraph', text })
    para = []
  }
  for (const raw of bodyLines) {
    const line = raw.trimEnd()
    const t = line.trim()
    if (!t) {
      flushPara()
      continue
    }
    // pure display math line
    const dm = t.match(/^\$\$([\s\S]+)\$\$$/) || t.match(/^\\\[([\s\S]+)\\\]$/)
    if (dm) {
      flushPara()
      blocks.push({ type: 'formula', latex: cleanMath(dm[1]), display: true })
      continue
    }
    // heading-ish
    if (/^#{1,4}\s+/.test(t)) {
      flushPara()
      const text = t.replace(/^#{1,4}\s+/, '')
      blocks.push({ type: 'heading', level: 3, text: mdInlineToText(text) })
      continue
    }
    // table rows → callout summary (keep simple)
    if (t.startsWith('|') || t.startsWith('<table') || t.startsWith('<tr')) {
      flushPara()
      if (t.startsWith('<table') || t.includes('<td')) {
        blocks.push({ type: 'callout', tone: 'info', text: '（原卷此处含表格/仪器试剂表，详见 PDF 或 MD 源文件。）' })
      }
      continue
    }
    // list
    if (/^[-*•]\s+/.test(t) || /^\d+[\)）]\s+/.test(t)) {
      flushPara()
      const item = t.replace(/^[-*•]\s+/, '').replace(/^\d+[\)）]\s+/, '')
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'list') last.items.push(mdInlineToText(item))
      else blocks.push({ type: 'list', ordered: /^\d+[\)）]/.test(t), items: [mdInlineToText(item)] })
      continue
    }
    para.push(line)
  }
  flushPara()
  return blocks
}

function extractParts(blocks) {
  // Heuristic: lines that look like (1) / 1-1 as subparts stay in flat blocks.
  // Split into parts when we see explicit part markers at paragraph starts.
  const parts = []
  let preamble = []
  let cur = null
  const partRe = /^(?:[（(]\s*(\d+)\s*[)）]|(\d+)\s*[-−–]\s*(\d+)|([1-9])\s*[\)）])\s*(.*)$/
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      const m = b.text.match(partRe)
      if (m) {
        const label = m[1] ? `(${m[1]})` : m[2] ? `${m[2]}-${m[3]}` : `(${m[4]})`
        const rest = (m[5] || '').trim()
        if (cur) parts.push(cur)
        cur = {
          id: `part-auto-${parts.length + 1}`,
          label,
          blocks: rest ? [{ type: 'paragraph', text: rest }] : [],
        }
        continue
      }
    }
    if (cur) cur.blocks.push(b)
    else preamble.push(b)
  }
  if (cur) parts.push(cur)
  return { preamble, parts }
}

function matchProblem(metaList, key, chunkIndex) {
  // meta.number may be "1","Q1","Q6","10" etc.
  const cands = metaList.filter(p => {
    const n = String(p.number || '').replace(/^Q/i, '').trim()
    return n === String(key) || String(p.number) === String(key) || String(p.number).toLowerCase() === `q${key}`
  })
  if (cands.length === 1) return cands[0]
  if (cands.length > 1) return cands[0]
  // fallback by order
  if (metaList[chunkIndex]) return metaList[chunkIndex]
  return null
}

function buildStem(meta, chunk, paper) {
  const bodyLines = chunk.lines.slice(1) // drop title line
  let blocks = linesToBlocks(bodyLines)
  if (!blocks.length) {
    blocks = [{ type: 'paragraph', text: chunk.lines.map(mdInlineToText).filter(Boolean).join('\n') || '（本题正文未能从 MD 可靠切分，请对照源卷。）' }]
  }
  const { preamble, parts } = extractParts(blocks)
  const stem = {
    schemaVersion: 1,
    problemId: meta.id,
    rightsState: 'stem_public',
    language: 'zh-CN',
    title: meta.title || chunk.titleLine.replace(/^#+\s*/, '').slice(0, 80),
    number: String(meta.number),
    examYear: meta.year || paper.year,
    examStage: meta.stage || paper.stage,
    source: {
      sourceDocumentId: meta.sourceDocumentId,
      sourceLabel: meta.sourceLabel || paper.folder,
      page: meta.page ?? 0,
      transcriptionMethod: 'ocr_reviewed',
      transcribedAt: new Date().toISOString().slice(0, 10),
    },
    provenanceNote: `由 MinerU MD（${paper.rel}）程序化切分并整理为结构化题干；公式已尽量转为 LaTeX。请以官方纸质/PDF 为准。`,
    renderingHints: { mhchem: true },
  }
  if (parts.length) {
    stem.blocks = preamble.length ? preamble : [{ type: 'callout', tone: 'info', text: '下列为分问。' }]
    stem.parts = parts.map((p, i) => ({
      ...p,
      id: `part-${meta.id.replace('problem-', '')}-${String(i + 1).padStart(2, '0')}`,
    }))
  } else {
    stem.blocks = preamble.length ? preamble : blocks
  }
  return stem
}

function toLatex(stem) {
  const lines = [`% ${stem.problemId} ${stem.number} ${stem.title}`, `\\section*{${stem.number}. ${stem.title}}`]
  const emit = blocks => {
    for (const b of blocks || []) {
      if (b.type === 'paragraph') lines.push(b.text.replace(/\$\$/g, '$$'), '')
      else if (b.type === 'formula') lines.push(`\\[ ${b.latex} \\]`, '')
      else if (b.type === 'chem') lines.push(`\\[ \\ce{${b.latex}} \\]`, '')
      else if (b.type === 'heading') lines.push(`\\subsection*{${b.text}}`, '')
      else if (b.type === 'list') {
        lines.push(b.ordered ? '\\begin{enumerate}' : '\\begin{itemize}')
        for (const it of b.items) lines.push(`  \\item ${it}`)
        lines.push(b.ordered ? '\\end{enumerate}' : '\\end{itemize}', '')
      } else if (b.type === 'callout') lines.push(`\\textit{${b.text}}`, '')
    }
  }
  emit(stem.blocks)
  for (const p of stem.parts || []) {
    lines.push(`\\subsection*{${p.label}}`)
    emit(p.blocks)
  }
  return lines.join('\n')
}

// Load all shard tasks
const shardDirs = fs.readdirSync(path.join(PIPE, 'shards')).filter(n => n.startsWith('shard-'))
const papers = []
for (const d of shardDirs) {
  const tasks = JSON.parse(fs.readFileSync(path.join(PIPE, 'shards', d, 'tasks.json'), 'utf8'))
  for (const t of tasks.tasks || []) papers.push({ ...t, shard: d })
}

const written = new Set()
const report = { ok: [], fail: [], unmatched: [] }

for (const paper of papers) {
  const mdPath = rewriteMdPath(paper.md)
  if (!fs.existsSync(mdPath)) {
    report.fail.push({ paper: paper.rel, error: `md missing: ${mdPath}` })
    continue
  }
  const text = fs.readFileSync(mdPath, 'utf8')
  const chunks = splitProblems(text)
  log(`${paper.rel}: chunks=${chunks.length} metaProblems=${paper.problems.length}`)

  const usedMeta = new Set()
  chunks.forEach((chunk, idx) => {
    const meta = matchProblem(paper.problems, chunk.key, idx)
    if (!meta) {
      report.unmatched.push({ paper: paper.rel, key: chunk.key })
      return
    }
    if (usedMeta.has(meta.id)) return
    usedMeta.add(meta.id)
    try {
      const stem = buildStem(meta, chunk, paper)
      const out = path.join(OUT_STEMS, `${meta.id}.json`)
      fs.writeFileSync(out, JSON.stringify(stem, null, 2), 'utf8')
      fs.writeFileSync(path.join(OUT_LATEX, `${meta.id}.tex`), toLatex(stem), 'utf8')
      written.add(meta.id)
      report.ok.push(meta.id)
    } catch (e) {
      report.fail.push({ paper: paper.rel, problemId: meta.id, error: String(e.message || e) })
    }
  })

  // meta problems with no chunk: minimal placeholder from title only
  for (const meta of paper.problems) {
    if (written.has(meta.id)) continue
    const stem = {
      schemaVersion: 1,
      problemId: meta.id,
      rightsState: 'stem_public',
      language: 'zh-CN',
      title: meta.title,
      number: String(meta.number),
      examYear: meta.year || paper.year,
      examStage: meta.stage || paper.stage,
      source: {
        sourceDocumentId: meta.sourceDocumentId,
        sourceLabel: meta.sourceLabel || paper.folder,
        page: meta.page ?? 0,
        transcriptionMethod: 'ocr_reviewed',
        transcribedAt: new Date().toISOString().slice(0, 10),
      },
      provenanceNote: `未能从 MD 可靠切分正文（${paper.rel}）；仅写入元数据标题占位，待人工补全。`,
      renderingHints: { mhchem: true },
      blocks: [
        { type: 'callout', tone: 'warn', text: '本题干正文自动切分失败，仅显示题目标题占位。' },
        { type: 'paragraph', text: `${meta.number} · ${meta.title}` },
      ],
    }
    fs.writeFileSync(path.join(OUT_STEMS, `${meta.id}.json`), JSON.stringify(stem, null, 2), 'utf8')
    fs.writeFileSync(path.join(OUT_LATEX, `${meta.id}.tex`), toLatex(stem), 'utf8')
    written.add(meta.id)
    report.ok.push(meta.id + ':placeholder')
  }
}

fs.writeFileSync(path.join(PIPE, 'logs', 'md-to-stem-report.json'), JSON.stringify({
  written: written.size,
  ok: report.ok.length,
  fail: report.fail,
  unmatched: report.unmatched.slice(0, 50),
  unmatchedCount: report.unmatched.length,
}, null, 2))

log(`DONE written=${written.size} fail=${report.fail.length} unmatched=${report.unmatched.length}`)
console.log(JSON.stringify({ written: written.size, fail: report.fail.length, unmatched: report.unmatched.length }, null, 2))
