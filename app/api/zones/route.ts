import { NextRequest, NextResponse } from 'next/server';
import { getZones, saveZone, updateZone, deleteZone } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const eventId = Number(req.nextUrl.searchParams.get('eventId'));
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    return NextResponse.json(await getZones(eventId, s.orgId));
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.event_id || !body.name?.trim()) return NextResponse.json({ error: 'event_id and name required' }, { status: 400 });
    const zone = await saveZone({ event_id: body.event_id, name: body.name.trim(), capacity: body.capacity ?? 0, price: body.price ?? 0 }, s.orgId);
    if (!zone) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(zone);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const zone = await updateZone(id, data, s.orgId);
    return NextResponse.json(zone);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id } = await req.json();
    await deleteZone(id, s.orgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
