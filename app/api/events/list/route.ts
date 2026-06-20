import { NextResponse } from 'next/server';
import { getAllEvents } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const events = await getAllEvents(s.orgId);
    return NextResponse.json(events);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
