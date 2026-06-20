import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageMembers } from '@/lib/session';
import { listOrgMembers, updateMemberRole, removeMember, type Role } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const members = await listOrgMembers(session.orgId);
  return NextResponse.json(members);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!canManageMembers(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { userId, role } = await req.json().catch(() => ({}));
  const target = Number(userId);
  const newRole = (['owner', 'admin', 'member'] as Role[]).includes(role) ? (role as Role) : null;
  if (!target || !newRole) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  // Don't allow demoting the last owner.
  const members = await listOrgMembers(session.orgId);
  const owners = members.filter((m) => m.role === 'owner');
  const targetMember = members.find((m) => m.user_id === target);
  if (!targetMember) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });
  if (targetMember.role === 'owner' && newRole !== 'owner' && owners.length <= 1) {
    return NextResponse.json({ error: 'Debe quedar al menos un owner' }, { status: 400 });
  }

  await updateMemberRole(session.orgId, target, newRole);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!canManageMembers(session.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { userId } = await req.json().catch(() => ({}));
  const target = Number(userId);
  if (!target) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

  const members = await listOrgMembers(session.orgId);
  const targetMember = members.find((m) => m.user_id === target);
  if (!targetMember) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });
  const owners = members.filter((m) => m.role === 'owner');
  if (targetMember.role === 'owner' && owners.length <= 1) {
    return NextResponse.json({ error: 'No podés quitar al único owner' }, { status: 400 });
  }

  await removeMember(session.orgId, target);
  return NextResponse.json({ ok: true });
}
