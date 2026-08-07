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
      <PageTitle title="来源与方法" description="这里说明公开范围、来源记录和知识标注方法。" />
      <div className="about-grid">
        <article className="article">
          <h2>公开内容</h2>
          <p>
            网站发布考试年份、题号、主题、知识映射和来源索引等元数据。答案、评分细则、扫描件与内部文件不会发布。在版权允许时，部分题目可提供<strong>结构化题干</strong>（非 PDF 原文），格式见仓库{' '}
            <code>docs/problem-stem-format.md</code>。
          </p>
          <h2>知识标注</h2>
          <p>题目录入按“考试—整题—小问—知识节点—关系”组织。新节点进入人工审核队列；每条映射保留来源文件、页码和审核状态。</p>
          <FormulaBlock />
          <h2>资料状态</h2>
          <div className="status-list">
            <div>
              <i className="dot green" />
              <b>metadata_public</b>
              <span>可公开元数据</span>
            </div>
            <div>
              <i className="dot amber" />
              <b>internal_only</b>
              <span>仅本地管理台可见</span>
            </div>
            <div>
              <i className="dot blue" />
              <b>fulltext_authorized / stem_public</b>
              <span>授权后可发布结构化题干</span>
            </div>
            <div>
              <i className="dot amber" />
              <b>stem_demo</b>
              <span>演示排版样例（界面会标注）</span>
            </div>
          </div>
        </article>
        <aside className="side-card">
          <h3>数据版本</h3>
          <p className="data-version">2026.08-demo</p>
          <p className="muted">当前版本用于展示网站结构和查询方式。演示映射不能当作正式真题结论。</p>
          <hr />
          <h3>建议引用</h3>
          <p className="muted">化学竞赛知识图谱，数据版本 2026.08（演示）。</p>
        </aside>
      </div>
    </>
  )
}
