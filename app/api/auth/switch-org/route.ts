import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, MAX_AGE, createToken } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { getMembership } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { orgId } = await req.json().catch(() => ({ orgId: 0 }));
  const targetOrg = Number(orgId);
  if (!targetOrg) return NextResponse.json({ error: 'orgId requerido' }, { status: 400 });

  // Only allow switching to an org the user actually belongs to.
  const membership = await getMembership(targetOrg, session.userId);
  if (!membership) return NextResponse.json({ error: 'No pertenecés a esa organización' }, { status: 403 });

  const token = await createToken(process.env.AUTH_SECRET || '', { uid: session.userId, oid: targetOrg });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
  return res;
}
