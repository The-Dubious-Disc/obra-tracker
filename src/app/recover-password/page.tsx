'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el correo');
      }
      
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-50">Recuperar contraseña</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Ingresá tu correo electrónico y te enviaremos instrucciones.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-sm text-center">
            <p className="text-xs text-destructive font-bold uppercase tracking-widest">{error}</p>
          </div>
        )}

        {!submitted ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-industrial-primary shadow-lg shadow-primary/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-sm text-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-green-700 dark:text-green-400 mb-2">¡Correo enviado!</h3>
            <p className="text-xs text-green-600 dark:text-green-300 leading-relaxed">
              Si existe una cuenta asociada a {email}, recibirás un correo con las instrucciones para restablecer tu contraseña.
            </p>
          </div>
        )}

        <div className="text-center mt-4">
          <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
