import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootUrl = new URL('../public/data/', import.meta.url)
const root = fileURLToPath(rootUrl)
const forbidden = [/\.pdf$/i, /(^|[\\/])(?:answer|score|solution|ocr|internal)(?:[^a-z]|$)/i, /D:\\\\|C:\\\\|\\\\Users\\\\/i, /参考答案全文|评分细则/]
const forbiddenKey = /(?:sha256|checksum|digest|hash)/i
const summaryValue = /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i
// 答案/评分类禁止；结构化题干（stems/）允许。禁止未结构化「题文全文」字段名式表述出现在非 stem 语境时仍靠字段审计。
const protectedContent = /(?:参考答案全文|评分细则|(?:answer|solution|score)\s*(?:text|content)|protected\s+content)/i
const forbiddenStemKeys = /^(?:answer|answerText|solution|solutionText|solutionSteps|rubric|scoreDetail|ocrRaw|fullText|rawPdfPath|internalPath)$/i

async function files(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await files(path))
    else out.push(path)
  }
  return out
}

function inspect(value, path = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => inspect(item, `${path}[${index}]`))
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && summaryValue.test(value)) throw new Error(`禁止摘要式值：${path}`)
    if (typeof value === 'string' && protectedContent.test(value)) throw new Error(`受限内容：${path}`)
    return
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) throw new Error(`禁止摘要字段：${path}.${key}`)
    if (forbiddenStemKeys.test(key)) throw new Error(`禁止答案/未结构化全文字段：${path}.${key}`)
    inspect(child, `${path}.${key}`)
  }
}

const paths = await files(root)
const problems = []
for (const path of paths) {
  const rel = relative(root, path).replaceAll('\\', '/')
  const text = (await readFile(path)).toString()
  if (forbidden.some(rx => rx.test(rel) || rx.test(text))) problems.push(rel)
  try { inspect(JSON.parse(text), rel) } catch (error) { problems.push(`${rel}: ${error.message}`) }
}
if (problems.length) {
  console.error(`public-data-audit failed:\n${problems.join('\n')}`)
  process.exit(1)
}

const manifest = JSON.parse(await readFile(new URL('../public/data/manifest.json', import.meta.url), 'utf8'))
if (!Array.isArray(manifest.files) || !manifest.files.length || !manifest.recordCounts) {
  console.error('public-data-audit failed: manifest must declare files and recordCounts')
  process.exit(1)
}
for (const entry of manifest.files) {
  if (!entry || typeof entry.path !== 'string' || !Number.isInteger(entry.bytes) || entry.bytes < 0) {
    console.error('public-data-audit failed: invalid manifest file entry')
    process.exit(1)
  }
  const bytes = (await readFile(new URL(`../public/${entry.path}`, import.meta.url))).byteLength
  if (bytes !== entry.bytes) {
    console.error(`public-data-audit failed: file size mismatch: ${entry.path}`)
    process.exit(1)
  }
}
console.log(`public-data-audit passed (${paths.length} files, ${manifest.files.length} files listed)`)
