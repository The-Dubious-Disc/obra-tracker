'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordInput } from '@/components/ui/PasswordInput';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      const target = redirectParam ? decodeURIComponent(redirectParam) : '/';
      router.replace(target);
    } else {
      setMessage(data.error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="glass-card p-8 w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-50">Iniciar Sesión</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Acceso al Sistema de Obra</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email</label>
            <input
              id="email"
              type="email"
              placeholder="ingeniero@obra.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>
          <div className="space-y-2">
             <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Contraseña</label>
              <Link href="/recover-password" className="text-[10px] uppercase font-bold text-primary hover:underline tracking-widest">¿Olvidaste tu contraseña?</Link>
             </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="w-full btn-industrial-primary shadow-lg shadow-primary/20 text-white">
          Ingresar
        </button>
        
        {registered && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-sm text-green-600 text-xs font-bold text-center">
            Registro exitoso. Iniciá sesión.
          </div>
        )}
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            ¿No tenés cuenta? <Link href={`/register${redirectParam || emailParam ? `?${new URLSearchParams({ ...(redirectParam ? { redirect: redirectParam } : {}), ...(emailParam ? { email: emailParam } : {}) }).toString()}` : ''}`} className="font-bold text-primary hover:underline">Registrate</Link>
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
