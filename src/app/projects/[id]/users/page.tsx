'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Mail, Shield, ShieldAlert, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProjectUsersPage() {
  const params = useParams();
  const projectId = params?.id as string;
  
  const [members, setMembers] = useState<{ id: string, rol: string, usuario: { nombre: string, email: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRol, setInviteRol] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
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
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rol: inviteRol }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: '¡Invitación enviada con éxito!', type: 'success' });
        setInviteEmail('');
      } else {
        setMessage({ text: data.error || 'No se pudo enviar la invitación', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error al conectar con el servidor', type: 'error' });
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

  const getRoleIcon = (rol: string) => {
    switch (rol) {
      case 'admin': return <ShieldAlert className="h-4 w-4 text-primary" />;
      case 'editor': return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      default: return <Shield className="h-4 w-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Cargando personal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="w-fit border-primary/20 text-primary uppercase text-[10px] font-bold tracking-widest bg-primary/5">Equipo</Badge>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">Personal de Obra</h1>
        <p className="text-muted-foreground">Controla accesos y roles técnicos para la obra.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Miembros Actuales */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Personal Activo</CardTitle>
                  <CardDescription>Usuarios con acceso directo al proyecto</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50/30 dark:bg-slate-900/30">
                      <th className="p-4 text-xs uppercase font-black text-muted-foreground tracking-widest">Usuario</th>
                      <th className="p-4 text-xs uppercase font-black text-muted-foreground tracking-widest">Rol de Acceso</th>
                      <th className="p-4 text-xs uppercase font-black text-muted-foreground tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map((member) => (
                      <tr key={member.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{member.usuario.nombre}</span>
                            <span className="text-xs text-muted-foreground">{member.usuario.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.rol)}
                            <Select 
                              defaultValue={member.rol} 
                              onValueChange={(val) => handleUpdateRole(member.id, val)}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs font-semibold bg-transparent border-slate-200 dark:border-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="editor">Constructor (Editor)</SelectItem>
                                <SelectItem value="viewer">Cliente (Viewer)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
                            Revocar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de Invitación */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-card border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Invitar Miembro</CardTitle>
                  <CardDescription>Envía una invitación formal</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="ingeniero@obra.com" 
                      className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rol" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Rol Asignado</Label>
                  <Select value={inviteRol} onValueChange={setInviteRol}>
                    <SelectTrigger id="rol" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador (Control Total)</SelectItem>
                      <SelectItem value="editor">Editor (Constructor/Arquitecto)</SelectItem>
                      <SelectItem value="viewer">Viewer (Cliente/Inversor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full btn-industrial-primary h-11 shadow-lg shadow-primary/20 text-white" disabled={inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Enviar Invitación Técnica'
                  )}
                </Button>

                {message && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-700 border border-green-200' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                    <p className="text-xs font-bold uppercase tracking-tight leading-relaxed">{message.text}</p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="p-6 bg-slate-900 rounded-xl text-white shadow-xl shadow-slate-200 dark:shadow-none">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3">Seguridad RBAC</h4>
            <p className="text-[11px] font-medium leading-relaxed opacity-80">
              Los roles determinan qué secciones de costos e hitos técnicos puede ver o editar cada miembro. Asegúrate de asignar el nivel correcto.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
