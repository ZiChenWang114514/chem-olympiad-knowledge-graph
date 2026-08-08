/**
 * LLM polish of existing ProblemStem JSON via DeepSeek chat API.
 * Concurrency default 10. Resumable via polish-progress.jsonl.
 *
 * Usage:
 *   node polish-stems.mjs
 *   node polish-stems.mjs --concurrency 10
 *   node polish-stems.mjs --limit 5          # smoke
 *   node polish-stems.mjs --force            # re-polish even if already marked
 *   node polish-stems.mjs --only problem-000001,problem-000050
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE = path.resolve(__dirname, '..')
const SRC = path.join(__dirname, 'out', 'stems')
const LOG_DIR = path.join(__dirname, 'logs')
const PROGRESS = path.join(LOG_DIR, 'polish-progress.jsonl')
const REPORT = path.join(LOG_DIR, 'polish-report.json')

const args = process.argv.slice(2)
function flag(name, def = null) {
  const i = args.indexOf(name)
  if (i < 0) return def
  if (def === false) return true
  return args[i + 1] ?? def
}
const CONCURRENCY = Math.max(1, parseInt(flag('--concurrency', '10'), 10) || 10)
const LIMIT = flag('--limit') ? parseInt(flag('--limit'), 10) : 0
const FORCE = args.includes('--force')
const ONLY = flag('--only')
  ? String(flag('--only'))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null

const API_KEY =
  process.env.DEEPSEEK_API_KEY ||
  process.env.api_key ||
  ''
const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').trim().replace(/\/$/, '')
const MODEL = (process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash').trim()

if (!API_KEY) {
  console.error('Missing DEEPSEEK_API_KEY (User or Process env).')
  process.exit(1)
}

fs.mkdirSync(LOG_DIR, { recursive: true })
fs.mkdirSync(SRC, { recursive: true })

// --- deterministic OCR cleanup (pre-LLM) ---
// Kangxi radicals / CJK compatibility → common forms (code points only, ASCII-safe source)
const CJK_PAIRS = [
  [0x2f49, 0x6708], // moon
  [0x2f47, 0x65e5], // sun
  [0x2f23, 0x5b50], // child
  [0x2f00, 0x4e00], // one
  [0x2f01, 0x4e8c], // two
  [0x2f04, 0x4e59], // yi
  [0x2f0f, 0x51e0], // ji
  [0x2ee6, 0x89d2], // angle
  [0x2f50, 0x6bd4], // bi
  [0x2f9c, 0x8db3], // foot
  [0x2f63, 0x751f], // life
  [0x2fbc, 0x9ad8], // high
  [0x2f46, 0x65e0], // wu
  [0x2f64, 0x7528], // yong
  [0x2f65, 0x800c], // er
  [0x2f24, 0x5927], // big
  [0x2f25, 0x5c0f], // small
  [0x2f54, 0x6c34], // water
  [0x2f55, 0x706b], // fire
  [0x2f4e, 0x6728], // wood
  [0x2faf, 0x91d1], // metal
  [0x2f11, 0x571f], // earth
  [0x2f08, 0x4eba], // ren
  [0x2f1d, 0x53e3], // kou
  [0x2f3c, 0x624b], // shou
  [0x2f4c, 0x76ee], // mu
  [0x2f3f, 0x5fc3], // xin
  [0x2f6f, 0x77f3], // shi
  [0x2f79, 0x7cf8], // si
  [0x2f92, 0x8863], // yi
  [0x2ecb, 0x8f66], // che
  [0x2ed4, 0x95e8], // men
  [0x2eda, 0x9875], // ye
  [0x2be5, 0x9c7c], // yu (approx)
  [0x2be6, 0x9e1f], // niao
  [0x2ee2, 0x9a6c], // ma
  [0x2ef0, 0x9f99], // long
  [0x2ef2, 0x9f9f], // gui
  [0x2f9d, 0x91cc], // li
  [0x2ec5, 0x89c1], // jian
  [0x2f9a, 0x8a00], // yan
  [0x2f9b, 0x8d70], // zou
  [0x2fb6, 0x98de], // fei
  [0x2fb7, 0x98df], // shi
  [0x2fbc, 0x9ad8], // gao
  [0x2f67, 0x767d], // bai
  [0x2f76, 0x7c73], // mi
  [0x2f7a, 0x7f8a], // yang
  [0x2f5d, 0x725b], // niu
  [0x2f5e, 0x72ac], // quan
  [0x2f8c, 0x8089], // rou
  [0x2fbb, 0x9aa8], // gu
  [0x2f6b, 0x76ae], // pi
  [0x2f6d, 0x6bdb], // mao
  [0x2f7b, 0x7fbd], // yu feather
  [0x2f7f, 0x8033], // er ear
  [0x2fd0, 0x9f3b], // bi nose
  [0x2eee, 0x9f7f], // chi
  [0x2f96, 0x820c], // she
]

function fixCjkCompat(s) {
  if (typeof s !== 'string') return s
  let out = s
  for (const [fromCp, toCp] of CJK_PAIRS) {
    const a = String.fromCodePoint(fromCp)
    if (out.includes(a)) out = out.split(a).join(String.fromCodePoint(toCp))
  }
  try {
    out = out.normalize('NFKC')
  } catch {
    /* ignore */
  }
  return out
}

function deepMapStrings(obj, fn) {
  if (typeof obj === 'string') return fn(obj)
  if (Array.isArray(obj)) return obj.map((x) => deepMapStrings(x, fn))
  if (obj && typeof obj === 'object') {
    const o = {}
    for (const [k, v] of Object.entries(obj)) o[k] = deepMapStrings(v, fn)
    return o
  }
  return obj
}

function compactMathSpacing(s) {
  if (typeof s !== 'string') return s
  return s
    .replace(/\\mathrm\s*\{/g, '\\mathrm{')
    .replace(/\\operatorname\s*\{/g, '\\operatorname{')
    .replace(/\\mathsf\s*\{/g, '\\mathsf{')
    .replace(/\\text\s*\{/g, '\\text{')
    .replace(/_\s*\{/g, '_{')
    .replace(/\^\s*\{/g, '^{')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}')
    .replace(/([A-Za-z])\s+_\s*/g, '$1_')
    .replace(/([A-Za-z0-9])\s+\^\s*/g, '$1^')
}

const SYSTEM = `你是化学竞赛题干结构化精修助手。输入是 ProblemStem JSON（schemaVersion=1）。
输出必须是**同一个 problemId 的完整 JSON 对象**，不要 markdown 围栏，不要解释。

精修目标（只改题干呈现，不改题意）：
1. 修正 OCR 错字、全角/兼容汉字、乱码（如 ⽉→月、⼦→子）。
2. 整理 LaTeX：去掉 \\mathrm 内多余空格；化学式优先用 $...$ 内简洁写法或 chem 块的 latex（mhchem 表达式，无 \\ce{} 外壳时用裸表达式）。
3. 小问结构：parts[] 标签修正；合并无意义拆分；「（图：）」改为 figure 块（caption/alt 描述缺图，可无 src）。
4. 删除「下列为分问。」这类无信息 callout；合并连续空壳段落。
5. 禁止写入答案、评分、解析、hash/sha256、内部路径。
6. 保留 problemId、rightsState、language、number、examYear、examStage、source.* 字段原值。
7. provenanceNote 更新为含「DeepSeek 精修」说明；transcribedAt 可更新为今天日期。
8. renderingHints.mhchem = true。
9. blocks/parts 至少有一处非空正文。

若输入已很好，可做最小改动后原样返回。`

function stripFences(text) {
  let t = String(text || '').trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  // sometimes model wraps extra prose
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first >= 0 && last > first) t = t.slice(first, last + 1)
  return t
}

const FORBIDDEN_KEYS =
  /^(answer|answerText|solution|solutionText|solutionSteps|rubric|scoreDetail|ocrRaw|fullText|rawPdfPath|internalPath)$/i
const HASH_KEY = /(?:sha256|checksum|digest|hash)/i
const BANNED_PHRASE = /评分细则|参考答案全文/

function validateStem(stem, expectedId) {
  const errors = []
  if (!stem || typeof stem !== 'object') return ['not object']
  if (stem.schemaVersion !== 1) errors.push('schemaVersion')
  if (stem.problemId !== expectedId) errors.push('problemId mismatch')
  if (!['stem_public', 'stem_demo', 'fulltext_authorized'].includes(stem.rightsState))
    errors.push('rightsState')
  if (!(stem.blocks?.length || stem.parts?.length)) errors.push('empty body')
  const stack = [stem]
  while (stack.length) {
    const o = stack.pop()
    if (!o || typeof o !== 'object') continue
    if (Array.isArray(o)) {
      o.forEach((x) => stack.push(x))
      continue
    }
    for (const [k, v] of Object.entries(o)) {
      if (FORBIDDEN_KEYS.test(k) || HASH_KEY.test(k)) errors.push('forbidden key ' + k)
      if (typeof v === 'string' && BANNED_PHRASE.test(v)) errors.push('banned phrase')
      if (v && typeof v === 'object') stack.push(v)
    }
  }
  return errors
}

function scrubBanned(stem) {
  return deepMapStrings(stem, (s) =>
    s.replace(/评分细则/g, '评分材料').replace(/参考答案全文/g, '参考材料'),
  )
}

function loadDone() {
  const done = new Set()
  if (!fs.existsSync(PROGRESS)) return done
  for (const line of fs.readFileSync(PROGRESS, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const j = JSON.parse(line)
      if (j.ok && j.problemId) done.add(j.problemId)
    } catch {
      /* skip */
    }
  }
  return done
}

function appendProgress(rec) {
  // serialize progress writes (multi-worker)
  fs.appendFileSync(PROGRESS, JSON.stringify(rec) + '\n', 'utf8')
}

process.on('uncaughtException', (e) => {
  console.error('uncaughtException', e)
  try {
    fs.appendFileSync(path.join(LOG_DIR, 'polish-crash.log'), String(e.stack || e) + '\n', 'utf8')
  } catch {
    /* ignore */
  }
  process.exit(1)
})
process.on('unhandledRejection', (e) => {
  console.error('unhandledRejection', e)
  try {
    fs.appendFileSync(
      path.join(LOG_DIR, 'polish-crash.log'),
      'rejection ' + String(e && e.stack ? e.stack : e) + '\n',
      'utf8',
    )
  } catch {
    /* ignore */
  }
})

function alreadyPolished(stem) {
  return (
    typeof stem.provenanceNote === 'string' &&
    (stem.provenanceNote.includes('DeepSeek 精修') || stem.provenanceNote.includes('LLM 精修'))
  )
}

async function chatComplete(messages, { retries = 4, jsonMode = true } = {}) {
  let lastErr
  let useJsonMode = jsonMode
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const payload = {
        model: MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 16384,
        // deepseek-v4-flash: disable hidden reasoning so max_tokens go to content
        thinking: { type: 'disabled' },
      }
      if (useJsonMode) payload.response_format = { type: 'json_object' }
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (res.status === 429 || res.status === 503 || res.status === 502) {
        const wait = Math.min(60000, 1500 * 2 ** attempt)
        await new Promise((r) => setTimeout(r, wait))
        lastErr = new Error(`HTTP ${res.status}`)
        continue
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        if (res.status === 400 && useJsonMode && /response_format|json_object/i.test(body)) {
          useJsonMode = false
          lastErr = new Error(`HTTP ${res.status}: response_format unsupported`)
          continue
        }
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`)
      }
      const data = await res.json()
      const msg = data.choices?.[0]?.message || {}
      let content = msg.content
      if (!content && typeof msg.reasoning_content === 'string') {
        // last resort: model put JSON only in reasoning (rare)
        const m = msg.reasoning_content.match(/\{[\s\S]*\}/)
        if (m) content = m[0]
      }
      if (!content) throw new Error('empty content finish=' + (data.choices?.[0]?.finish_reason || '?'))
      const finish = data.choices?.[0]?.finish_reason
      if (finish === 'length') {
        lastErr = new Error('truncated response (finish_reason=length)')
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
      }
      return content
    } catch (e) {
      lastErr = e
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** attempt)))
        continue
      }
    }
  }
  throw lastErr
}

function lockIdentity(polished, stem, problemId, noteSuffix) {
  polished.schemaVersion = 1
  polished.problemId = problemId
  polished.rightsState = stem.rightsState || 'stem_public'
  polished.language = stem.language || 'zh-CN'
  polished.number = stem.number
  if (stem.examYear != null) polished.examYear = stem.examYear
  if (stem.examStage) polished.examStage = stem.examStage
  polished.title = polished.title || stem.title
  polished.source = {
    ...stem.source,
    ...(polished.source || {}),
    sourceLabel: stem.source?.sourceLabel || polished.source?.sourceLabel,
    transcriptionMethod: 'ocr_reviewed',
    transcribedAt: new Date().toISOString().slice(0, 10),
  }
  if (stem.source?.sourceDocumentId) polished.source.sourceDocumentId = stem.source.sourceDocumentId
  polished.renderingHints = { mhchem: true, ...(polished.renderingHints || {}) }
  const baseNote = polished.provenanceNote || stem.provenanceNote || ''
  if (!String(baseNote).includes('DeepSeek 精修') && !String(baseNote).includes('确定性精修')) {
    polished.provenanceNote = baseNote + noteSuffix
  } else {
    polished.provenanceNote = baseNote
  }
  return scrubBanned(deepMapStrings(polished, (s) => compactMathSpacing(fixCjkCompat(s))))
}

async function polishOne(file) {
  const problemId = path.basename(file, '.json')
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8')
  let stem = JSON.parse(raw)

  // deterministic pass first
  stem = deepMapStrings(stem, (s) => compactMathSpacing(fixCjkCompat(s)))

  let polished
  let mode = 'llm'
  try {
    const content = await chatComplete([
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: '请精修以下 JSON，仅返回精修后的完整 JSON：\n' + JSON.stringify(stem),
      },
    ])
    try {
      polished = JSON.parse(stripFences(content))
    } catch (e) {
      throw new Error('JSON parse fail: ' + e.message + ' | head=' + content.slice(0, 120))
    }
    polished = lockIdentity(
      polished,
      stem,
      problemId,
      '；DeepSeek 精修：OCR 汉字/公式/小问结构整理，请以官方 PDF 为准。',
    )
  } catch (e) {
    // fallback: write deterministic-only cleanup so batch still advances
    mode = 'deterministic'
    polished = lockIdentity(
      structuredClone(stem),
      stem,
      problemId,
      '；确定性精修：兼容汉字/公式空格清理；LLM 未采用（' + String(e.message || e).slice(0, 80) + '）。',
    )
  }

  const errors = validateStem(polished, problemId)
  if (errors.length) throw new Error('validation: ' + errors.join(', '))

  fs.writeFileSync(path.join(SRC, file), JSON.stringify(polished, null, 2) + '\n', 'utf8')
  return {
    problemId,
    ok: true,
    mode,
    bytes: Buffer.byteLength(JSON.stringify(polished)),
  }
}

async function pool(items, concurrency, worker) {
  let i = 0
  let active = 0
  const results = []
  return new Promise((resolve) => {
    const next = () => {
      if (i >= items.length && active === 0) return resolve(results)
      while (active < concurrency && i < items.length) {
        const item = items[i++]
        active++
        Promise.resolve()
          .then(() => worker(item))
          .then(
            (r) => {
              results.push({ ok: true, item, r })
            },
            (e) => {
              results.push({ ok: false, item, error: String(e.message || e) })
            },
          )
          .finally(() => {
            active--
            next()
          })
      }
    }
    next()
  })
}

async function main() {
  let files = fs
    .readdirSync(SRC)
    .filter((f) => f.startsWith('problem-') && f.endsWith('.json'))
    .sort()

  if (ONLY) {
    const set = new Set(ONLY.map((id) => (id.endsWith('.json') ? id : id + '.json')))
    files = files.filter((f) => set.has(f) || set.has(f.replace(/\.json$/, '')))
  }

  const done = FORCE ? new Set() : loadDone()
  const pending = []
  for (const f of files) {
    const id = f.replace(/\.json$/, '')
    if (done.has(id)) continue
    if (!FORCE) {
      try {
        const s = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'))
        if (alreadyPolished(s)) {
          appendProgress({ problemId: id, ok: true, skipped: 'already_polished', t: Date.now() })
          continue
        }
      } catch {
        /* process */
      }
    }
    pending.push(f)
  }

  if (LIMIT > 0) pending.splice(LIMIT)

  console.log(
    JSON.stringify(
      {
        base: BASE_URL,
        model: MODEL,
        concurrency: CONCURRENCY,
        totalFiles: files.length,
        pending: pending.length,
        alreadyDone: done.size,
        force: FORCE,
      },
      null,
      2,
    ),
  )

  if (!pending.length) {
    console.log('Nothing to polish.')
    fs.writeFileSync(REPORT, JSON.stringify({ pending: 0, ok: 0, fail: 0 }, null, 2))
    return
  }

  // smoke API
  await chatComplete(
    [
      { role: 'user', content: 'reply with exactly: OK' },
    ],
    { retries: 2, jsonMode: false },
  ).then((c) => console.log('API smoke:', c.slice(0, 40)))

  const started = Date.now()
  let ok = 0
  let fail = 0
  const failures = []

  await pool(pending, CONCURRENCY, async (file) => {
    const id = file.replace(/\.json$/, '')
    try {
      const r = await polishOne(file)
      ok++
      appendProgress({ ...r, t: Date.now() })
      if (ok % 10 === 0 || ok === 1) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(0)
        console.log(`[${ok + fail}/${pending.length}] ok=${ok} fail=${fail} last=${id} ${elapsed}s`)
      }
      return r
    } catch (e) {
      fail++
      const rec = { problemId: id, ok: false, error: String(e.message || e), t: Date.now() }
      try {
        appendProgress(rec)
      } catch {
        /* ignore log write */
      }
      failures.push(rec)
      console.error(`FAIL ${id}:`, e.message || e)
      return rec
    }
  })

  const report = {
    concurrency: CONCURRENCY,
    model: MODEL,
    base: BASE_URL,
    pending: pending.length,
    ok,
    fail,
    elapsedSec: Math.round((Date.now() - started) / 1000),
    failures: failures.slice(0, 50),
  }
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report, null, 2))
  if (fail > 0) process.exitCode = 2
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
