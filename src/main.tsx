import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { loadData, type AppData } from './lib/data'
import './styles.css'
import './redesign.css'
import 'katex/dist/katex.min.css'

function Root() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadData()
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])
  if (error)
    return (
      <main className="shell error">
        <div className="boot-card">
          <h1>资料暂时无法读取</h1>
          <p>{error}</p>
          <button type="button" onClick={() => location.reload()}>
            重新加载
          </button>
        </div>
      </main>
    )
  if (!data)
    return (
      <main className="shell loading">
        <div className="boot-card">
          <span className="spinner" aria-hidden="true" />
          <p>正在载入知识图谱…</p>
        </div>
      </main>
    )
  return <App data={data} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Root />
    </HashRouter>
  </React.StrictMode>,
)
