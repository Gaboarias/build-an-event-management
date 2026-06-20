import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, MAX_AGE, createToken, safeEqual } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.APP_PASSWORD || '';
  const secret = process.env.AUTH_SECRET || '';

  if (!expected || !secret) {
    return NextResponse.json({ error: 'Autenticación no configurada' }, { status: 500 });
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  if (!safeEqual(password, expected)) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const token = await createToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}
