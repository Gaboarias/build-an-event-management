import { NextRequest, NextResponse } from 'next/server';
import { getConfig, updateConfig, createEvent, createSeminar } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const eventId = Number(req.nextUrl.searchParams.get('eventId'));
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const config = await getConfig(eventId);
    if (!config) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { eventId, ...data } = await req.json();
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const config = await updateConfig(eventId, data);
    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { event_name, type = 'event' } = await req.json();
    if (!event_name?.trim()) return NextResponse.json({ error: 'event_name required' }, { status: 400 });
    const record = type === 'seminar'
      ? await createSeminar(event_name.trim())
      : await createEvent(event_name.trim());
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
