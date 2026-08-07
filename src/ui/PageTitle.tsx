import type { ReactNode } from 'react'

export function PageTitle({
  title,
  description,
  aside,
  split,
}: {
  title: string
  description?: string
  aside?: ReactNode
  split?: boolean
}) {
  return (
    <div className={split ? 'page-title split' : 'page-title'}>
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {aside}
    </div>
  )
}
