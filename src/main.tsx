import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { loadData, type AppData } from './lib/data'
import './styles.css'
import 'katex/dist/katex.min.css'

function Root() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { loadData().then(setData).catch((e) => setError(e.message)) }, [])
  if (error) return <main className="shell error"><h1>资料暂时无法读取</h1><p>{error}</p><button onClick={() => location.reload()}>重新加载</button></main>
  if (!data) return <main className="shell loading"><span className="spinner" />正在载入知识图谱…</main>
  return <App data={data} />
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><Root /></HashRouter></React.StrictMode>)
