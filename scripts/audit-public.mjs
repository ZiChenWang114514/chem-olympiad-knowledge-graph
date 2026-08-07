import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootUrl = new URL('../public/data/', import.meta.url)
const root = fileURLToPath(rootUrl)
const forbidden = [/\.pdf$/i, /(^|[\\/])(?:answer|score|solution|ocr|internal)(?:[^a-z]|$)/i, /D:\\\\|C:\\\\|\\\\Users\\\\/i, /题文全文|参考答案全文|评分细则/]
async function files(dir) { const out=[]; for (const entry of await readdir(dir,{withFileTypes:true})) { const path=join(dir,entry.name); if(entry.isDirectory()) out.push(...await files(path)); else out.push(path) } return out }
const paths=await files(root); const problems=[]
for(const path of paths){ const rel=relative(root,path).replaceAll('\\','/'); const text=(await readFile(path)).toString(); if(forbidden.some(rx=>rx.test(rel)||rx.test(text))) problems.push(rel) }
if(problems.length){ console.error(`public-data-audit failed:\n${problems.join('\n')}`); process.exit(1) }
const manifest=JSON.parse(await readFile(new URL('../public/data/manifest.json',import.meta.url),'utf8'))
for(const [file, expected] of Object.entries(manifest.fileHashes ?? {})){ const bytes=await readFile(new URL(`../public/${file}`,import.meta.url)); const actual=createHash('sha256').update(bytes).digest('hex'); if(actual!==expected) { console.error(`sha256 mismatch: ${file}`); process.exit(1) } }
console.log(`public-data-audit passed (${paths.length} files, ${Object.keys(manifest.fileHashes ?? {}).length} hashes)`)
