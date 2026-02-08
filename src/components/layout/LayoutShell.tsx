'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

const PUBLIC_ROUTES = ['/login', '/register']
const PUBLIC_PREFIXES = ['/invitations']

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (isPublicRoute) {
      return
    }

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden border-b bg-background px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2"><svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="20" width="48" height="36" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/><rect x="12" y="24" width="12" height="12" fill="#60A5FA"/><rect x="28" y="24" width="12" height="12" fill="#60A5FA"/><rect x="44" y="24" width="8" height="12" fill="#60A5FA"/><rect x="12" y="40" width="12" height="8" fill="#93C5FD"/><rect x="28" y="40" width="12" height="8" fill="#93C5FD"/><rect x="44" y="40" width="8" height="8" fill="#93C5FD"/><rect x="12" y="52" width="32" height="4" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="1"/><rect x="12" y="52" width="24" height="4" fill="#10B981"/><line x1="54" y1="8" x2="54" y2="20" stroke="#374151" stroke-width="3"/><circle cx="54" cy="6" r="3" fill="#EF4444"/><line x1="48" y1="8" x2="60" y2="8" stroke="#374151" stroke-width="2"/></svg><span className="text-sm font-semibold">ObraTracker</span></div>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
