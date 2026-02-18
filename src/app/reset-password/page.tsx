'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PasswordInput } from '@/components/ui/PasswordInput';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación faltante o inválido.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !error) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-50">Nueva Contraseña</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Ingresá tu nueva contraseña industrial para continuar.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-sm text-center">
            <p className="text-xs text-destructive font-bold uppercase tracking-widest">{error}</p>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-sm text-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-green-700 dark:text-green-400 mb-2">¡Contraseña actualizada!</h3>
            <p className="text-xs text-green-600 dark:text-green-300 leading-relaxed">
              Tu contraseña ha sido restablecida correctamente. Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Nueva Contraseña
                </label>
                <PasswordInput
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Confirmar Contraseña
                </label>
                <PasswordInput
                  id="confirmPassword"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!error}
              className="w-full btn-industrial-primary shadow-lg shadow-primary/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Guardando...' : 'Restablecer Contraseña'}
            </button>
          </form>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
