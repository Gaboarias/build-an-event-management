import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, saveSnapshot, deleteSnapshot } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const eventId = Number(req.nextUrl.searchParams.get('eventId'));
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const rows = await getSnapshots(eventId, s.orgId);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 });
    const snap = await saveSnapshot(body, s.orgId);
    if (!snap) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(snap);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id } = await req.json();
    await deleteSnapshot(id, s.orgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
