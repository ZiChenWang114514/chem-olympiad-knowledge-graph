import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const forbiddenKeys = new Set(['fullText', 'answerText', 'solutionText', 'scoreText', 'ocrText', 'rawPdfPath', 'internalPath', 'sourcePath', 'localPath', 'reviewNotes', 'privateNotes'])
const forbiddenTokens = ['stem', 'answer', 'rubric', 'protected', 'internal_path', 'ocr', 'reviewer', 'review_note']
const pathLike = /(?:^|[\\/])(?:D:|C:|Users|AppData|Desktop|private|internal)(?:[\\/]|$)/i
const forbiddenHashKeys = new Set(['sha256','source_sha256','sourceSha256','hash','checksum','digest','fileHashes'])
const allowedKeys = new Set(['id','dataVersion','data_version','schemaVersion','schema_version','generatedAt','generated_at','releaseSequence','release_sequence','rightsPolicy','rights_state','rightsState','source_status','source_label','sourceLabel','source_document_id','sourceDocumentId','source_version','sourceVersion','source_page','sourcePage','page','source_file_name','sourceFileName','source_filename','sourceFilename','file_name','fileName','source_size_bytes','sourceSizeBytes','size_bytes','sizeBytes','source_page_count','sourcePageCount','page_count','pageCount','source_modified_at','sourceModifiedAt','modified_at','modifiedAt','files','counts','record_counts','notice','items','disciplines','relations','nodes','edges','exam','problems','parts','mappings','year','stage','session','session_number','session_label','exam_type','title','topic_summary','total_score','examId','exam_id','number','difficulty','mappingCount','problemCount','summary','kind','label','text','type','node_type','discipline','importance','aliases_json','description','source','target','source_node_id','target_node_id','relation','predicate','relation_type','explanation','evidence_reference','target_kind','target_id','knowledge_node_id','evidence_page','evidence_note','sort_order','parent_id','problem_id','value','name','color','totalExams','totalProblems','totalNodes','disciplineCounts','yearCounts','syntheticDemo','revision','version','exam_count','problem_count','node_count','mapping_count','by_stage','by_discipline','knowledge_node','aliases','nodeIds','node_ids'])

async function readJson(path) { return JSON.parse(await readFile(path, 'utf8')) }
async function listJson(dir) { try { const names=await readdir(dir,{withFileTypes:true}); const out=[]; for(const name of names){const p=join(dir,name.name); if(name.isDirectory()) out.push(...await listJson(p)); else if(name.name.endsWith('.json')) out.push(p)} return out } catch { return [] } }
function validate(value, path = '$') {
  if (Array.isArray(value)) return value.forEach((x,i)=>validate(x,`${path}[${i}]`))
  if (!value || typeof value !== 'object') { if(typeof value==='string' && pathLike.test(value)) throw new Error(`受限内部路径：${path}`); return }
  const dynamicMap=/\.(by_stage|by_discipline|files|record_counts)$/.test(path)
  for (const [key, child] of Object.entries(value)) { if (forbiddenHashKeys.has(key) || /(?:sha256|checksum|digest|hash)/i.test(key)) throw new Error(`禁止摘要字段：${path}.${key}`); if (forbiddenKeys.has(key) || forbiddenTokens.some(token=>key.toLowerCase().includes(token))) throw new Error(`受限字段：${path}.${key}`); if (!dynamicMap && !allowedKeys.has(key)) throw new Error(`未知字段：${path}.${key}`); validate(child,`${path}.${key}`) }
}
function itemsFrom(value) { return Array.isArray(value) ? value : (Array.isArray(value?.items) ? value.items : []) }
function unique(items) { return [...new Map(items.map(x=>[x.id, x])).values()] }
async function writeJson(path, value) { await mkdir(join(path,'..'),{recursive:true}); await writeFile(path, JSON.stringify(value)) }

export async function importRelease(releaseDir, outputDir) {
  const root=resolve(releaseDir), out=resolve(outputDir)
  const files=await listJson(root); if(!files.length) throw new Error('发布包中没有 JSON 文件')
  const source=[]; for(const file of files){const value=await readJson(file); validate(value,relative(root,file)); source.push({file,value})}
  const find=(name)=>source.find(x=>x.file.toLowerCase().endsWith(name.toLowerCase()))?.value
  const manifest=find('manifest.json')||{}; const taxonomy=find('taxonomy.json'); if(!taxonomy) throw new Error('缺少 taxonomy.json')
  const isUnder=(file,dir)=>file.toLowerCase().includes(`${dir.toLowerCase()}${file.includes('\\')?'\\':'/'}`)
  const realExamPayloads=source.filter(x=>isUnder(x.file,'exams')).map(x=>x.value).filter(x=>x.exam && Array.isArray(x.problems))
  const exams=unique(realExamPayloads.map(x=>x.exam)); const examById=new Map(exams.map(exam=>[exam.id,exam])); const problems=realExamPayloads.flatMap(x=>x.problems).map(problem=>({
    id:problem.id, examId:problem.exam_id, number:problem.number, title:problem.title, disciplines:[], nodeIds:[], difficulty:3,
    mappingCount:0, rightsState:problem.rights_state||'metadata_public', summary:`${problem.topic_summary||'公开知识标签与考查方向；题文暂不公开。'}${problem.source_page?` 来源页码：${problem.source_page}。`:''}`,
    sourceDocumentId:problem.source_document_id||problem.sourceDocumentId||examById.get(problem.exam_id)?.source_document_id||examById.get(problem.exam_id)?.sourceDocumentId,
    sourceLabel:problem.source_label||problem.sourceLabel||problem.source_file_name||problem.sourceFileName||problem.source_filename||problem.sourceFilename||problem.file_name||problem.fileName||examById.get(problem.exam_id)?.source_label||examById.get(problem.exam_id)?.sourceLabel||examById.get(problem.exam_id)?.source_file_name||examById.get(problem.exam_id)?.sourceFileName||examById.get(problem.exam_id)?.source_filename||examById.get(problem.exam_id)?.sourceFilename||examById.get(problem.exam_id)?.file_name||examById.get(problem.exam_id)?.fileName,
    sourceVersion:problem.source_version||problem.sourceVersion||examById.get(problem.exam_id)?.source_version||examById.get(problem.exam_id)?.sourceVersion,
    page:problem.source_page??problem.sourcePage
  }))
  const mappings=realExamPayloads.flatMap(x=>x.mappings||[]); const nodes=taxonomy.nodes||[]; const nodeById=new Map(nodes.map(n=>[n.id,n]));
  for(const problem of problems){
    const related=mappings.filter(m=>m.target_kind==='problem'&&m.target_id===problem.id)
    const nodeIds=[...new Set(related.map(m=>m.knowledge_node_id).filter(id=>id && nodeById.has(id)))]
    problem.nodeIds=nodeIds
    problem.mappingCount=nodeIds.length
    problem.disciplines=[...new Set(nodeIds.map(id=>nodeById.get(id)?.discipline).filter(Boolean))]
  }
  const publicExams=exams.map(exam=>({id:exam.id,year:exam.year,stage:exam.stage,session:exam.session_label||exam.session_number||'',title:exam.title||`${exam.year} 化学竞赛`,rightsState:exam.rights_state||'metadata_public',problemCount:problems.filter(p=>p.examId===exam.id).length,sourceDocumentId:exam.source_document_id||exam.sourceDocumentId,sourceLabel:exam.source_label||exam.sourceLabel||exam.source_file_name||exam.sourceFileName||exam.source_filename||exam.sourceFilename||exam.file_name||exam.fileName||exam.source_status||'公开发布包',sourceVersion:exam.source_version||exam.sourceVersion,page:exam.source_page??exam.sourcePage,syntheticDemo:false}))
  const relationPredicates=[...new Set((taxonomy.edges||[]).map(edge=>edge.relation_type))]
  const relations=relationPredicates.map((predicate,index)=>({id:`relation-type-${String(index+1).padStart(6,'0')}`,name:predicate,predicate}))
  const publicTaxonomy={disciplines:[...new Map(nodes.map(n=>[n.discipline,{id:n.discipline,name:n.discipline,color:'#5575b8'}])).values()],relations}
  const graphNodes=nodes.map(node=>({id:node.id,label:node.name,type:node.node_type||'concept',discipline:node.discipline||'other',importance:3}))
  const graphEdges=(taxonomy.edges||[]).map(edge=>({id:edge.id,source:edge.source_node_id,target:edge.target_node_id,relation:edge.relation_type}))
  const graph={nodes:graphNodes,edges:graphEdges}
  const rawSearch=find('search-index.json')||[]; const searchItems=itemsFrom(rawSearch).map(item=>({id:item.id,kind:item.kind==='knowledge_node'?'knowledge':item.kind,title:item.label,subtitle:item.kind==='knowledge_node'?'知识节点':'题目元数据',text:[...(item.aliases||[]),item.summary||''].join(' ')}))
  const rawStatistics=find('statistics.json')||{}; const statistics={totalExams:rawStatistics.exam_count||publicExams.length,totalProblems:rawStatistics.problem_count||problems.length,totalNodes:rawStatistics.node_count||graph.nodes.length,disciplineCounts:Object.entries(rawStatistics.by_discipline||{}).map(([name,value])=>({name,value,color:'#5575b8'})),yearCounts:publicExams.reduce((acc,exam)=>{const row=acc.find(x=>x.year===exam.year); if(row) row.value+=1; else acc.push({year:exam.year,value:1}); return acc},[]),note:'统计基于已通过自动检查的公开发布包。'}
  const outputs={'taxonomy.json':publicTaxonomy,'exams/index.json':{items:publicExams},'graph/all.json':{syntheticDemo:false,...graph},'search-index.json':{items:searchItems},'statistics.json':statistics}
  const years=new Map(); for(const problem of problems){const exam=publicExams.find(x=>x.id===problem.examId); const year=exam?.year??Number(String(problem.examId).match(/20\d{2}/)?.[0]); if(year){if(!years.has(year)) years.set(year,[]); years.get(year).push(problem)}}
  for(const [year,items] of years) outputs[`exams/${year}.json`]={items}
  const fileList=[]; for(const [file,value] of Object.entries(outputs)){const bytes=Buffer.from(JSON.stringify(value)); await writeJson(join(out,file),value); fileList.push({path:`data/${file}`,bytes:bytes.byteLength})}
  const releaseSequence=Number(manifest.release_sequence??manifest.releaseSequence??manifest.revision??1)||1
  const publicManifest={dataVersion:manifest.data_version||manifest.dataVersion||manifest.version||'imported',schemaVersion:2,generatedAt:manifest.generated_at||manifest.generatedAt||new Date().toISOString(),releaseSequence,rightsPolicy:'metadata_public',files:fileList,recordCounts:{exams:outputs['exams/index.json'].items.length,problems:problems.length,knowledgeNodes:graph.nodes.length,knowledgeEdges:graph.edges.length},notice:'该版本由已通过自动检查的发布包生成；题文与受限材料不随公开站点发布。'}
  await writeJson(join(out,'manifest.json'),publicManifest); return publicManifest
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args=process.argv.slice(2); const release=args[0]; const output=args.includes('--out')?args[args.indexOf('--out')+1]:process.env.PUBLIC_DATA_DIR||resolve('public/data');
  if(!release){console.error('用法：npm run import:release -- <release-dir> [--out <public-data-dir>]'); process.exit(2)}
  try { const manifest=await importRelease(release,output); console.log(`import-release passed: ${manifest.recordCounts.problems} problems, ${manifest.recordCounts.knowledgeNodes} nodes -> ${output}`) } catch(error) { console.error(`import-release failed: ${error.message}`); process.exit(1) }
}
