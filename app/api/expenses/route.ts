import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, saveExpense, updateExpense, deleteExpense } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const eventId = Number(req.nextUrl.searchParams.get('eventId'));
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    return NextResponse.json(await getExpenses(eventId, s.orgId));
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.event_id || !body.category) return NextResponse.json({ error: 'event_id and category required' }, { status: 400 });
    const expense = await saveExpense(body, s.orgId);
    if (!expense) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(expense);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id, amount, label } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const expense = await updateExpense(id, amount, label ?? null, s.orgId);
    return NextResponse.json(expense);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id } = await req.json();
    await deleteExpense(id, s.orgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
