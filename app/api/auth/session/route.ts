import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserMemberships } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const orgs = await getUserMemberships(session.userId);
  return NextResponse.json({
    user: { id: session.userId, name: session.name, email: session.email, isSuperadmin: session.isSuperadmin },
    org: { id: session.orgId, name: session.orgName, role: session.role },
    orgs,
  });
}
