import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, MAX_AGE, createToken } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import {
  getInvitationByToken, getUserByEmail, createUser, createMembership, markInvitationAccepted,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

  const inv = await getInvitationByToken(String(token));
  if (!inv || inv.accepted_at || new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invitación inválida o expirada' }, { status: 400 });
  }

  const existing = await getUserByEmail(inv.email);

  if (existing) {
    // Account already exists — just add the membership; they sign in normally.
    await createMembership(inv.org_id, existing.id, inv.role);
    await markInvitationAccepted(inv.id);
    return NextResponse.json({ ok: true, existing: true });
  }

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const pass = typeof password === 'string' ? password : '';
  if (!cleanName) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  if (pass.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });

  const user = await createUser(inv.email, cleanName, hashPassword(pass), false);
  await createMembership(inv.org_id, user.id, inv.role);
  await markInvitationAccepted(inv.id);

  const tok = await createToken(process.env.AUTH_SECRET || '', { uid: user.id, oid: inv.org_id });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, tok, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
  return res;
}
