import { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default function ConstructorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
