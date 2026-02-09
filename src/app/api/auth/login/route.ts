import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/services/authService';
import { cookies } from 'next/headers';
import { loginSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/middleware/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResponse = checkRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validationResult.error.issues.map(issue => issue.message),
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    const user = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, email),
    });

    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return NextResponse.json({ userId: user.id, nombre: user.nombre, rol: user.rol });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}