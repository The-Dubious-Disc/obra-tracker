'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [registered, setRegistered] = useState(false);
  const [redirectParam, setRedirectParam] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const emailParam = searchParams.get('email');
    const registeredParam = searchParams.get('registered');
    const redirect = searchParams.get('redirect');

    if (emailParam) setEmail(emailParam);
    if (registeredParam === '1') setRegistered(true);
    if (redirect) setRedirectParam(redirect);
  }, []);

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
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Iniciar Sesión</h1>
          <p className="text-xs text-muted-foreground tracking-wide">Acceso al Sistema de Obra</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="label-sm">Email</label>
            <input
              id="email"
              type="email"
              placeholder="ingeniero@obra.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>
          <div className="space-y-2">
             <div className="flex items-center justify-between">
              <label htmlFor="password" className="label-sm">Contraseña</label>
              <Link href="/recover-password" className="text-xs font-semibold text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
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

        <button type="submit" className="w-full btn-industrial-primary shadow-lg shadow-primary/20">
          Ingresar
        </button>
        
        {registered && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm font-semibold text-center">
            Registro exitoso. Iniciá sesión.
          </div>
        )}
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            ¿No tenés cuenta? <Link href={`/register${redirectParam || email ? `?${new URLSearchParams({ ...(redirectParam ? { redirect: redirectParam } : {}), ...(email ? { email: email } : {}) }).toString()}` : ''}`} className="font-bold text-primary hover:underline">Registrate</Link>
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
