import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '@/lib/services/authService';
import { sendPasswordResetEmail } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const { success, token, message, error } = await createPasswordResetToken(email);

    if (!success) {
      return NextResponse.json({ error }, { status: 500 });
    }

    if (token) {
      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({ message: message || 'Correo de recuperación enviado' });
  } catch (error) {
    console.error('Recover password API error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
