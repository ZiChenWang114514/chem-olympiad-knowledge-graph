import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function fixture() {
  const root=mkdtempSync(join(tmpdir(),'chem-release-')); mkdirSync(join(root,'exams')); mkdirSync(join(root,'graph'))
  writeFileSync(join(root,'manifest.json'),JSON.stringify({dataVersion:'fixture-1',schemaVersion:'private-2'}))
  writeFileSync(join(root,'taxonomy.json'),JSON.stringify({disciplines:[{id:'physical',name:'物理化学',color:'#d36b4b'}],relations:[{id:'belongs',name:'属于'}]}))
  writeFileSync(join(root,'exams','index.json'),JSON.stringify({items:[{id:'exam-2025',year:2025,stage:'初赛',title:'演示考试',problemCount:1,rightsState:'metadata_public'}]}))
  writeFileSync(join(root,'exams','2025.json'),JSON.stringify({items:[{id:'p-1',examId:'exam-2025',number:'Q1',title:'演示题',disciplines:['physical'],difficulty:2,mappingCount:1,rightsState:'metadata_public',summary:'演示关系'}]}))
  writeFileSync(join(root,'graph','all.json'),JSON.stringify({nodes:[{id:'physical',label:'物理化学',type:'discipline',discipline:'physical'}],edges:[]}))
  writeFileSync(join(root,'search-index.json'),JSON.stringify({items:[]})); writeFileSync(join(root,'statistics.json'),JSON.stringify({totalExams:1,totalProblems:1,totalNodes:1,disciplineCounts:[]})); return root
}

function realSnakeFixture() {
  const root=mkdtempSync(join(tmpdir(),'chem-real-release-')); mkdirSync(join(root,'exams','prelim'),{recursive:true}); mkdirSync(join(root,'graph'))
  writeFileSync(join(root,'manifest.json'),JSON.stringify({data_version:'real-1',schema_version:1,generated_at:'2026-01-01T00:00:00Z',files:{},record_counts:{exams:1,problems:1,parts:1,nodes:1,edges:1,mappings:1}}))
  writeFileSync(join(root,'taxonomy.json'),JSON.stringify({nodes:[{id:'n1',name:'化学平衡',aliases_json:'["平衡"]',discipline:'physical',node_type:'concept',description:'关系待公开'}],edges:[{id:'e1',source_node_id:'n1',target_node_id:'n1',relation_type:'self',explanation:'demo',evidence_reference:'p1'}]}))
  writeFileSync(join(root,'exams','prelim','2025-exam-1.json'),JSON.stringify({exam:{id:'exam-1',year:2025,session_number:1,stage:'初赛',session_label:'全国统一场',exam_type:'theory',rights_state:'metadata_public',source_status:'verified',source_sha256:'abcdef1234567890',source_label:'正式来源'},problems:[{id:'p1',exam_id:'exam-1',number:'Q1',title:'平衡关系',topic_summary:'演示元数据',total_score:10,rights_state:'metadata_public',source_page:1}],parts:[{id:'part1',problem_id:'p1',parent_id:null,kind:'subquestion',label:'(1)',sort_order:1,rights_state:'metadata_public'}],mappings:[{id:'m1',target_kind:'problem',target_id:'p1',knowledge_node_id:'n1',importance:1,evidence_page:1,evidence_note:'待复核'}]}))
  writeFileSync(join(root,'graph','physical.json'),JSON.stringify({nodes:[{id:'n1',name:'化学平衡',discipline:'physical',node_type:'concept'}],edges:[{id:'e1',source_node_id:'n1',target_node_id:'n1',relation_type:'self'}]}))
  writeFileSync(join(root,'search-index.json'),JSON.stringify([{id:'n1',kind:'knowledge_node',label:'化学平衡',aliases:['平衡'],summary:'演示'}])); writeFileSync(join(root,'statistics.json'),JSON.stringify({exam_count:1,problem_count:1,node_count:1,mapping_count:1,by_stage:{'初赛':1},by_discipline:{physical:1}})); return root
}

describe('release importer',()=>{
  it('converts private release into public data and writes hashes',()=>{const root=realSnakeFixture(),out=mkdtempSync(join(tmpdir(),'chem-public-')); try { execFileSync(process.execPath,['scripts/import-release.mjs',root,'--out',out],{stdio:'pipe'}); const manifest=JSON.parse(readFileSync(join(out,'manifest.json'),'utf8')); expect(manifest.fileHashes['data/exams/2025.json']).toMatch(/^[a-f0-9]{64}$/); expect(JSON.parse(readFileSync(join(out,'exams/2025.json'),'utf8')).items[0].id).toBe('p1') } finally {rmSync(root,{recursive:true,force:true});rmSync(out,{recursive:true,force:true})}})
  it('rejects restricted full-text fields before writing',()=>{const root=fixture(),out=mkdtempSync(join(tmpdir(),'chem-public-')); try {writeFileSync(join(root,'exams','bad.json'),JSON.stringify({items:[{id:'bad',examId:'exam-2025',number:'Q2',fullText:'restricted'}]})); expect(()=>execFileSync(process.execPath,['scripts/import-release.mjs',root,'--out',out],{stdio:'pipe'})).toThrow();} finally {rmSync(root,{recursive:true,force:true});rmSync(out,{recursive:true,force:true})}})
  it('converts the private exporter snake_case schema',()=>{const root=realSnakeFixture(),out=mkdtempSync(join(tmpdir(),'chem-public-')); try {execFileSync(process.execPath,['scripts/import-release.mjs',root,'--out',out],{stdio:'pipe'}); const exam=JSON.parse(readFileSync(join(out,'exams','2025.json'),'utf8')); const exams=JSON.parse(readFileSync(join(out,'exams','index.json'),'utf8')); const taxonomy=JSON.parse(readFileSync(join(out,'taxonomy.json'),'utf8')); expect(exam.items[0].examId).toBe('exam-1'); expect(exam.items[0].mappingCount).toBe(1); expect(exam.items[0].sourcePage).toBe(1); expect(exams.items[0].sourceSha256).toContain('abcdef123456'); expect(taxonomy.disciplines[0].id).toBe('physical')} finally {rmSync(root,{recursive:true,force:true});rmSync(out,{recursive:true,force:true})}})
})
