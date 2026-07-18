'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [redirectParam, setRedirectParam] = useState('');
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const emailParam = searchParams.get('email');
    const redirect = searchParams.get('redirect');

    if (emailParam) setEmail(emailParam);
    if (redirect) setRedirectParam(redirect);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      const params = new URLSearchParams();
      params.set('registered', '1');
      if (redirectParam) params.set('redirect', redirectParam);
      if (email) params.set('email', email);
      router.replace(`/login?${params.toString()}`);
    } else {
      setMessage(data.error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <form onSubmit={handleSubmit} className="glass-card p-8 w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Crear Cuenta</h1>
          <p className="text-xs text-muted-foreground tracking-wide">Registrate en ObraTracker</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="nombre" className="label-sm">Nombre</label>
            <input
              id="nombre"
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="label-sm">Email</label>
            <input
              id="email"
              type="email"
              placeholder="ingeniero@obra.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="label-sm">Contraseña</label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="w-full btn-industrial-primary shadow-lg shadow-primary/20">
          Registrarme
        </button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            ¿Ya tenés cuenta? <Link href={`/login${redirectParam || email ? `?${new URLSearchParams({ ...(redirectParam ? { redirect: redirectParam } : {}), ...(email ? { email } : {}) }).toString()}` : ''}`} className="font-bold text-primary hover:underline">Iniciá sesión</Link>
          </p>
        </div>

        {message && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-semibold text-center">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
