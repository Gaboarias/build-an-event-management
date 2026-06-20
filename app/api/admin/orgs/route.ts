import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/session';
import { listAllOrgs, createOrg, createInvitation, getUserByEmail, createMembership } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isSuperadmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json(await listAllOrgs());
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isSuperadmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { orgName, ownerEmail } = await req.json().catch(() => ({}));
  const name = typeof orgName === 'string' ? orgName.trim() : '';
  const email = typeof ownerEmail === 'string' ? ownerEmail.trim().toLowerCase() : '';
  if (!name || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'Nombre de org y email del owner requeridos' }, { status: 400 });
  }

  const org = await createOrg(name);

  // If the owner already has an account, attach directly; otherwise create an owner invite link.
  const existing = await getUserByEmail(email);
  if (existing) {
    await createMembership(org.id, existing.id, 'owner');
    return NextResponse.json({ org, ownerExisting: true });
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await createInvitation(org.id, email, 'owner', token, session.userId, expiresAt);
  return NextResponse.json({ org, inviteLink: `${req.nextUrl.origin}/invite/${token}` });
}
