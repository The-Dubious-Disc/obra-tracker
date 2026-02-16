'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Menu, DraftingCompass } from 'lucide-react'
import { usePendingCount } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'

const PUBLIC_ROUTES = ['/login', '/register', '/recover-password', '/reset-password']
const PUBLIC_PREFIXES = ['/invitations']

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (isPublicRoute) return

    let cancelled = false
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (!cancelled && res.status === 401) {
          const redirect = encodeURIComponent(pathname)
          router.replace(`/login?redirect=${redirect}`)
        }
      } catch {
        if (!cancelled) {
          const redirect = encodeURIComponent(pathname)
          router.replace(`/login?redirect=${redirect}`)
        }
      }
    }

    checkAuth()
    return () => {
      cancelled = true
    }
  }, [isPublicRoute, pathname, router])

  if (isPublicRoute) {
    return <main className="min-h-screen bg-background">{children}</main>
  }

  return <PrivateLayout>{children}</PrivateLayout>
}

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { selectedProjectId } = useProjectSelection()
  const pendingCount = usePendingCount(selectedProjectId)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden border-b bg-background px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-sm flex items-center justify-center shadow-lg shadow-primary/20 relative">
              <DraftingCompass className="h-5 w-5 text-primary-foreground" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
              )}
            </div>
            <span className="text-lg font-black tracking-tight uppercase italic text-slate-900 dark:text-slate-50">ObraTracker</span>
          </div>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
