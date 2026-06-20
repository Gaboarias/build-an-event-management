import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession, canManageMembers } from '@/lib/session';
import { createInvitation, listOrgInvitations, deleteInvitation, type Role } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!canManageMembers(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const invitations = await listOrgInvitations(session.orgId);
  return NextResponse.json(invitations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!canManageMembers(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { email, role } = await req.json().catch(() => ({}));
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanRole: Role = role === 'admin' ? 'admin' : 'member'; // can't invite as owner
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const inv = await createInvitation(session.orgId, cleanEmail, cleanRole, token, session.userId, expiresAt);

  const origin = req.nextUrl.origin;
  return NextResponse.json({ ...inv, link: `${origin}/invite/${token}` });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!canManageMembers(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  await deleteInvitation(session.orgId, Number(id));
  return NextResponse.json({ ok: true });
}
