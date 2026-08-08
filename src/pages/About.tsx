import type { AppData } from '../lib/data'

export function About({ data }: { data: AppData }) {
  return (
    <article className="method-page">
      <header className="document-head">
        <p>资料说明</p>
        <h1>来源与方法</h1>
      </header>

      <section>
        <h2>公开内容</h2>
        <p>网站公开考试年份、题号、主题、知识映射、来源索引和已获准发布的结构化题干。原始扫描件、参考答案、评分材料及内部审阅记录不在网站中发布。</p>
      </section>

      <section>
        <h2>知识标注</h2>
        <p>题目按照考试、整题、小问、知识节点和关系组织。一级学科分为无机、有机、物理、分析、结构和实验六类，材料、电化学、配位、晶体等名称作为专题显示。</p>
        <p>题目与知识点之间区分直接考查、求解需要和题目情境。图谱中的先修、所属、应用、推导、对比和综合考查关系分别记录，不能仅凭同题出现建立先修关系。</p>
      </section>

      <section>
        <h2>资料状态</h2>
        <div className="method-table-wrap">
          <table className="method-table">
            <thead><tr><th>状态</th><th>公开内容</th></tr></thead>
            <tbody>
              <tr><td>公开元数据</td><td>年份、题号、主题、知识映射和来源信息</td></tr>
              <tr><td>结构化题干</td><td>在来源允许且完成审校后发布的题目正文、公式和插图</td></tr>
              <tr><td>本地资料</td><td>扫描件、答案、评分材料和内部审阅记录</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>数据版本</h2>
        <dl className="version-details">
          <div><dt>当前版本</dt><dd>{data.manifest.dataVersion}</dd></div>
          <div><dt>生成时间</dt><dd>{new Date(data.manifest.generatedAt).toLocaleString('zh-CN')}</dd></div>
          <div><dt>考试记录</dt><dd>{data.statistics.totalExams} 组</dd></div>
          <div><dt>题目记录</dt><dd>{data.statistics.totalProblems} 道</dd></div>
          <div><dt>知识节点</dt><dd>{data.statistics.totalNodes} 个</dd></div>
        </dl>
      </section>

      <section>
        <h2>引用</h2>
        <p>引用本网站时，请注明“化学竞赛知识图谱”、数据版本和访问日期。具体题目仍以原发布机构提供的资料为准。</p>
      </section>
    </article>
  )
}
