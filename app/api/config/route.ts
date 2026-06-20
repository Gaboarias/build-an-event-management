import { NextRequest, NextResponse } from 'next/server';
import { getConfig, updateConfig, createEvent, createSeminar, deleteEvent } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const eventId = Number(req.nextUrl.searchParams.get('eventId'));
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const config = await getConfig(eventId, s.orgId);
    if (!config) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { eventId, ...data } = await req.json();
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const config = await updateConfig(eventId, data, s.orgId);
    if (!config) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    await deleteEvent(eventId, s.orgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { event_name, type = 'event' } = await req.json();
    if (!event_name?.trim()) return NextResponse.json({ error: 'event_name required' }, { status: 400 });
    const record = type === 'seminar'
      ? await createSeminar(event_name.trim(), s.orgId)
      : await createEvent(event_name.trim(), s.orgId);
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
