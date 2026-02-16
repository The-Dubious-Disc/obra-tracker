'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      router.replace('/login?registered=1');
    } else {
      setMessage(data.error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <form onSubmit={handleSubmit} className="glass-card p-8 w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-50">Crear Cuenta</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Registrate en ObraTracker</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="nombre" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Nombre</label>
            <input
              id="nombre"
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email</label>
            <input
              id="email"
              type="email"
              placeholder="ingeniero@obra.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>
        </div>

        <button type="submit" className="w-full btn-industrial-primary shadow-lg shadow-primary/20 text-white">
          Registrarme
        </button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            ¿Ya tenés cuenta? <Link href="/login" className="font-bold text-primary hover:underline">Iniciá sesión</Link>
          </p>
        </div>

        {message && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-sm text-destructive text-xs font-bold text-center">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
