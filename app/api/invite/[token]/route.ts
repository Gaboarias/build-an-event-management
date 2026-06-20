import { NextRequest, NextResponse } from 'next/server';
import { getInvitationByToken, getUserByEmail } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const inv = await getInvitationByToken(params.token);
  if (!inv || inv.accepted_at || new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  const existing = await getUserByEmail(inv.email);
  return NextResponse.json({
    valid: true,
    email: inv.email,
    role: inv.role,
    org_name: inv.org_name,
    existing: !!existing,
  });
}
