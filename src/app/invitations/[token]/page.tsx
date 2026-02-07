'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function InvitationAcceptPage() {
  const { token } = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<{ proyectoId: string, proyecto: { nombre: string }, rol: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch invitation');
        }
        const data = await res.json();
        setInvitation(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to accept invitation');
      }
      if (invitation) {
        router.push(`/projects/${invitation.proyectoId}`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setAccepting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (error) {
    return (
      <div className="p-8 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="p-8 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation to Project</CardTitle>
          <CardDescription>
            You have been invited to join <strong>{invitation.proyecto.nombre}</strong> as a {invitation.rol}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            By clicking accept, you will gain access to this project.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={handleAccept} disabled={accepting}>
            {accepting ? 'Accepting...' : 'Accept Invitation'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/projects')}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
