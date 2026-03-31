import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, saveSnapshot, deleteSnapshot } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const eventId = Number(req.nextUrl.searchParams.get('eventId'));
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const rows = await getSnapshots(eventId);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 });
    const snap = await saveSnapshot(body);
    return NextResponse.json(snap);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteSnapshot(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
