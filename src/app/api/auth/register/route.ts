import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const { nombre, email, password } = await request.json();
    
    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const result = await registerUser(nombre, email, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'User registered successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
