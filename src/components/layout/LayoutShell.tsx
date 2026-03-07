'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Menu, DraftingCompass, AlertCircle } from 'lucide-react'
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
  const pathname = usePathname()
  const router = useRouter()
  // 1. Refresh projects on mount to clear potential stale 401 states from login
  const { selectedProjectId, isInitialized, projects, isLoading, error, refreshProjects } = useProjectSelection()
  const pendingCount = usePendingCount(selectedProjectId)

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  // 2. Handle case with no projects (except when already on the creation page)
  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (projects.length === 0 && pathname !== '/projects/new') {
        router.replace('/projects/new')
      } else if (projects.length > 0 && pathname === '/projects/new' && selectedProjectId) {
         // If user lands on /projects/new but has projects and one selected, 
         // redirect to the dashboard (root path).
         router.replace('/')
      }
    }
  }, [isInitialized, isLoading, projects.length, pathname, router, selectedProjectId])

  // 2. Handle error state (e.g., DB connection failure)
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-card p-8 w-full max-w-md space-y-6 text-center border-destructive/20">
          <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight text-destructive">Error de Conexión</h2>
            <p className="text-xs text-muted-foreground tracking-wide leading-relaxed">
              No se pudo conectar con la base de datos. Por favor, verifica las credenciales en el archivo .env.
            </p>
            <div className="p-3 bg-muted rounded-lg mt-4">
              <p className="text-[10px] font-mono text-muted-foreground break-all">{error}</p>
            </div>
          </div>
          <Button className="w-full" variant="outline" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // 2. Wait for project initialization
  if (!isInitialized || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center animate-pulse">
            <DraftingCompass className="h-6 w-6 text-primary animate-spin" />
          </div>
          <p className="text-xs font-bold text-muted-foreground tracking-wide animate-pulse">
            Inicializando ObraTracker...
          </p>
        </div>
      </div>
    )
  }


  // If redirecting, show loading state to avoid flash of content
  if (isInitialized && !isLoading && projects.length === 0 && pathname !== '/projects/new') {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center animate-pulse">
            <DraftingCompass className="h-6 w-6 text-primary animate-spin" />
          </div>
          <p className="text-xs font-bold text-muted-foreground tracking-wide animate-pulse">
            Redirigiendo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden border-b bg-background px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/25 relative">
              <DraftingCompass className="h-5 w-5 text-primary-foreground" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
              )}
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">ObraTracker</span>
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
