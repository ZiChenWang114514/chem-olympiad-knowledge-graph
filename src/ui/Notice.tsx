import type { ReactNode } from 'react'

export function Notice({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'notice wide' : 'notice'}>
      <span aria-hidden="true">ⓘ</span>
      <div>{children}</div>
    </div>
  )
}
