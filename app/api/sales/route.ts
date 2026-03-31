import { NextRequest, NextResponse } from 'next/server';
import { getSales, saveSale, deleteSale } from '@/lib/db';

export async function GET(req: NextRequest) {
  const eventId = Number(req.nextUrl.searchParams.get('eventId'));
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
  try {
    return NextResponse.json(await getSales(eventId));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sale = await saveSale({
      event_id:       body.event_id,
      buyer_name:     body.buyer_name,
      zone:           body.zone,
      ticket_type:    body.ticket_type,
      group_size:     body.group_size ?? 1,
      payment_method: body.payment_method,
      unit_price:     body.unit_price ?? 0,
      total_amount:   body.total_amount ?? 0,
      notes:          body.notes ?? null,
    });
    return NextResponse.json(sale);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteSale(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
