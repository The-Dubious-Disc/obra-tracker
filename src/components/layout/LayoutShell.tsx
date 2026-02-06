'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
