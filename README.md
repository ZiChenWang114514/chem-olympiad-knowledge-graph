# 化学竞赛知识图谱（公开站）

React + TypeScript + Vite + Cytoscape.js 的静态知识图谱。站点读取 `public/data` 中版本化 JSON，默认只发布考试元数据、知识节点和关系，不包含未获授权的题目全文、答案或内部文件。

## 本地运行

```bash
npm install
npm run dev
npm run build
npm test
```

经过审核的私有发布包可以在本地转换为公开数据（转换器会拒绝未知字段、题文全文、答案/评分字段和内部路径）：

```bash
npm run import:release -- D:/path/to/release
```

如需先写入临时目录进行检查，可追加 `--out D:/path/to/public-data`；确认无误后再将结果复制到 `public/data`。

转换器兼容本地 pipeline exporter 的发布结构（`manifest.json`、`taxonomy.json`、`exams/<stage>/*.json`、`graph/*.json`、`search-index.json`、`statistics.json`），会把 snake_case 字段转换为网页所需的 camelCase 字段。

生产构建默认使用 `/chem-olympiad-knowledge-graph/` 作为 GitHub Pages base。推送 `main` 后，GitHub Actions 会执行测试、构建、公开数据检查并部署 Pages。
