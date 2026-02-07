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

  useEffect(() => {
    if (PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
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
  }, [pathname, router])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden border-b bg-background px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold">ObraTracker</span>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
