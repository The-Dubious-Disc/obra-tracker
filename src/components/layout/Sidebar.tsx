import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  return (
    <div className="w-64 border-r bg-muted/40 h-screen p-4 flex flex-col">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold tracking-tight">ObraTracker</h1>
      </div>
      <nav className="space-y-2 flex-1">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/">Dashboard</Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/builder">Constructor</Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/planos">Planos</Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/projects/new">Nuevo Proyecto</Link>
        </Button>
      </nav>
      <Separator className="my-4" />
      <div className="px-2">
        <p className="text-sm text-muted-foreground">© 2026 ObraTracker</p>
      </div>
    </div>
  );
}