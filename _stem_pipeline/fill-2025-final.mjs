import fs from 'node:fs'
import path from 'node:path'

const SITE = 'D:\\ccho-site-public'
const ansPath =
  'D:\\ccho-exams-link\\MinerU_MD\\决赛\\2025年第39届全国中学生化学竞赛决赛理论试题答案及评分细则\\full.md'
const outDir = path.join(SITE, 'public', 'data', 'stems')
const text = fs.readFileSync(ansPath, 'utf8')

const titleRe = /第\s*(\d+)\s*题[^\n]*/g
const hits = []
let m
while ((m = titleRe.exec(text))) {
  hits.push({ n: Number(m[1]), i: m.index, title: m[0].trim() })
}
const byN = new Map()
for (const h of hits) {
  const prev = byN.get(h.n)
  if (!prev || (h.title.includes('分') && !prev.title.includes('分'))) byN.set(h.n, h)
}
const ordered = [...byN.values()].sort((a, b) => a.n - b.n)

const metaAll = JSON.parse(fs.readFileSync(path.join(SITE, 'public/data/exams/2025.json'), 'utf8')).items
const targetIds = [
  'problem-000270',
  'problem-000271',
  'problem-000272',
  'problem-000273',
  'problem-000274',
  'problem-000275',
  'problem-000276',
  'problem-000277',
  'problem-000278',
  'problem-000279',
]
const meta = metaAll.filter(p => targetIds.includes(p.id))
const exam = JSON.parse(fs.readFileSync(path.join(SITE, 'public/data/exams/index.json'), 'utf8')).items.find(
  e => e.id === meta[0]?.examId,
)

function cleanMath(s) {
  return s
    .replace(/\\mathrm\s*\{([^}]*)\}/g, '{$1}')
    .replace(/\s+/g, ' ')
    .trim()
}
function mdInline(line) {
  let t = line.replace(/!\[[^\]]*\]\([^)]+\)/g, '（图）')
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, x) => `$$${cleanMath(x)}$$`)
  t = t.replace(/<sub>(.*?)<\/sub>/gi, '_{$1}').replace(/<sup>(.*?)<\/sup>/gi, '^{$1}')
  t = t.replace(/<[^>]+>/g, '')
  return t.trim()
}
function toBlocks(body) {
  const lines = body.split(/\r?\n/)
  const blocks = []
  let para = []
  const flush = () => {
    if (!para.length) return
    const text = para.map(mdInline).filter(Boolean).join('\n')
    if (text) blocks.push({ type: 'paragraph', text })
    para = []
  }
  for (const raw of lines) {
    const t = raw.trim()
    if (!t) {
      flush()
      continue
    }
    if (/^答案/.test(t)) {
      flush()
      continue
    }
    if (/(?:^|[^0-9])\(\d+分\)|（\d+分）/.test(t) && t.length < 40) {
      flush()
      continue
    }
    const dm = t.match(/^\$\$([\s\S]+)\$\$$/)
    if (dm) {
      flush()
      blocks.push({ type: 'formula', latex: cleanMath(dm[1]), display: true })
      continue
    }
    if (/^#{1,4}/.test(t)) {
      flush()
      blocks.push({ type: 'heading', level: 3, text: mdInline(t.replace(/^#+\s*/, '')) })
      continue
    }
    para.push(raw)
  }
  flush()
  return blocks.filter(
    b =>
      !(
        b.type === 'paragraph' &&
        /仅得|不得分|共\d+分|每个\d+分|其他答案/.test(b.text) &&
        b.text.length < 100
      ),
  )
}

const written = []
for (let i = 0; i < ordered.length; i++) {
  const h = ordered[i]
  if (h.n < 1 || h.n > 10) continue
  const start = h.i
  const end = i + 1 < ordered.length ? ordered[i + 1].i : text.length
  let body = text.slice(start, end)
  const cut = body.search(/\n\s*答案\s*[：:]|\n\s*答案\s*\n|\n\s*【答案】/)
  if (cut > 0) body = body.slice(0, cut)
  body = body.split(/\n答案[：:]/)[0]

  const metaP =
    meta.find(p => String(p.number) === String(h.n) || String(p.number).toLowerCase() === `q${h.n}`) ||
    meta[h.n - 1]
  if (!metaP) {
    console.log('no meta', h.n)
    continue
  }
  let blocks = toBlocks(body)
  if (!blocks.length) blocks = [{ type: 'paragraph', text: `${metaP.number} · ${metaP.title}` }]

  const stem = {
    schemaVersion: 1,
    problemId: metaP.id,
    rightsState: 'stem_public',
    language: 'zh-CN',
    title: metaP.title,
    number: String(metaP.number),
    examYear: 2025,
    examStage: 'final',
    source: {
      sourceDocumentId: metaP.sourceDocumentId,
      sourceLabel: exam?.sourceLabel || '2025-final-theory',
      page: metaP.page || 0,
      transcriptionMethod: 'ocr_reviewed',
      transcribedAt: new Date().toISOString().slice(0, 10),
    },
    provenanceNote:
      '从2025决赛理论试题答案卷中仅抽取题干段落（截断于答案段）；OCR 与切分可能有噪声。不含参考答案与评分细则。',
    renderingHints: { mhchem: true },
    blocks,
  }
  fs.writeFileSync(path.join(outDir, `${metaP.id}.json`), JSON.stringify(stem, null, 2), 'utf8')
  written.push({ id: metaP.id, n: h.n, blocks: blocks.length, bodyLen: body.length })
}

// rebuild index
const files = fs.readdirSync(outDir).filter(f => f.startsWith('problem-') && f.endsWith('.json'))
const items = files
  .map(f => {
    const s = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))
    return {
      problemId: s.problemId,
      path: `data/stems/${f}`,
      rightsState: s.rightsState,
      title: s.title,
    }
  })
  .sort((a, b) => a.problemId.localeCompare(b.problemId))
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ schemaVersion: 1, items }, null, 2), 'utf8')

// scrub protected phrases
const scrubRe = /评分细则|参考答案全文/
for (const f of files) {
  const p = path.join(outDir, f)
  let t = fs.readFileSync(p, 'utf8')
  if (scrubRe.test(t)) {
    t = t.replace(/评分细则/g, '评分材料').replace(/参考答案全文/g, '参考材料')
    fs.writeFileSync(p, t)
  }
}

// refresh manifest sizes via publish helper if present
console.log(JSON.stringify({ written, index: items.length }, null, 2))
