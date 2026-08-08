import { useEffect, useState } from 'react'
import { PageTitle } from '../ui/PageTitle'

function FormulaBlock() {
  const [html, setHtml] = useState('')
  useEffect(() => {
    let cancelled = false
    import('katex').then(katex => {
      if (cancelled) return
      setHtml(katex.default.renderToString(String.raw`\ce{2H2 + O2 -> 2H2O}`, { throwOnError: false }))
    })
    return () => {
      cancelled = true
    }
  }, [])
  return <p className="formula" aria-label="化学方程式排版示例" dangerouslySetInnerHTML={{ __html: html }} />
}

export function About() {
  return (
    <>
      <PageTitle title="来源与方法" description="公开范围、资料状态和知识标注方法。" />
      <div className="about-grid">
        <article className="article">
          <h2>公开内容</h2>
          <p>
            网站发布考试年份、题号、主题、知识关系和来源索引。答案、评分细则、扫描件与内部文件不会发布。在版权允许时，部分题目可提供<strong>结构化题干</strong>（非 PDF 原文），格式见仓库{' '}
            <code>docs/problem-stem-format.md</code>。
          </p>
          <h2>知识标注</h2>
          <p>题目按照“考试—整题—小问—知识节点—关系”组织。新增知识点经人工检查后发布；每条关联记录来源文件和页码。</p>
          <FormulaBlock />
          <h2>资料状态</h2>
          <div className="status-list">
            <div>
              <i className="dot green" />
              <b>公开资料</b>
              <span>年份、题号、主题、来源和知识关系可公开查看</span>
            </div>
            <div>
              <i className="dot amber" />
              <b>内部资料</b>
              <span>只在本地资料库中保存</span>
            </div>
            <div>
              <i className="dot blue" />
              <b>可公开题干</b>
              <span>获得许可后发布结构化题干</span>
            </div>
            <div>
              <i className="dot amber" />
              <b>排版示例</b>
              <span>用于检查公式、表格和图片显示</span>
            </div>
          </div>
        </article>
        <aside className="side-card">
          <h3>数据版本</h3>
          <p className="data-version">2026.08（演示版）</p>
          <p className="muted">当前版本展示网站结构和查询方式。演示映射不代表正式的真题标注结论。</p>
          <hr />
          <h3>建议引用</h3>
          <p className="muted">化学竞赛知识图谱，2026.08 演示版。</p>
        </aside>
      </div>
    </>
  )
}
