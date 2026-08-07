import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="empty-page">
      <h1>没有找到这条记录</h1>
      <Link to="/">返回总览</Link>
    </div>
  )
}
