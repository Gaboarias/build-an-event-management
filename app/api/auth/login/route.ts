import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, MAX_AGE, createToken } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { getUserByEmail, getUserMemberships } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET || '';
  if (!secret) return NextResponse.json({ error: 'Auth no configurada' }, { status: 500 });

  let email = '';
  let password = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim() : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const orgs = await getUserMemberships(user.id);
  if (orgs.length === 0) {
    return NextResponse.json({ error: 'Tu cuenta no pertenece a ninguna organización' }, { status: 403 });
  }

  const token = await createToken(secret, { uid: user.id, oid: orgs[0].org_id });
  const res = NextResponse.json({ ok: true, user: { name: user.name, email: user.email }, org: orgs[0] });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
  return res;
}
