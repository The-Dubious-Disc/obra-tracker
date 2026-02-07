'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectUsersPage() {
  const { id: projectId } = useParams();
  const [members, setMembers] = useState<{ id: string, rol: string, usuario: { nombre: string, email: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRol, setInviteRol] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setMessage('');
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rol: inviteRol }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Invitación enviada correctamente.');
        setInviteEmail('');
      } else {
        setMessage(data.error || 'No se pudo enviar la invitación');
      }
    } catch {
      setMessage('Error al enviar la invitación');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, rol: newRole }),
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Cargando miembros...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Equipo del proyecto</h1>

      <Card>
        <CardHeader>
          <CardTitle>Miembros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-4 font-medium p-4 border-b bg-muted/50">
              <div>Nombre</div>
              <div>Email</div>
              <div>Rol</div>
              <div>Acciones</div>
            </div>
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="grid grid-cols-4 p-4 items-center">
                  <div>{member.usuario.nombre}</div>
                  <div>{member.usuario.email}</div>
                  <div>
                    <Select 
                      defaultValue={member.rol} 
                      onValueChange={(val) => handleUpdateRole(member.id, val)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {/* Potential delete button */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitar nuevo miembro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input 
                type="email" 
                placeholder="colega@ejemplo.com" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="w-48 space-y-2">
              <label className="text-sm font-medium">Rol</label>
              <Select value={inviteRol} onValueChange={setInviteRol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </form>
          {message && <p className="mt-4 text-sm font-medium">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
