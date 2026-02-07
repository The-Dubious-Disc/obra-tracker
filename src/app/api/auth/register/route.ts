import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const { nombre, email, password } = await request.json();
    
    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const result = await registerUser(nombre, email, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Usuario registrado correctamente' });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
