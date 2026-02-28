import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/authService';
import { registerSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validationResult.error.issues.map(issue => issue.message),
        },
        { status: 400 }
      );
    }

    const { nombre, email, password } = validationResult.data;

    const result = await registerUser(nombre, email, password, 'viewer');
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Usuario registrado correctamente' });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}