import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, saveExpense, updateExpense, deleteExpense } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const eventId = Number(req.nextUrl.searchParams.get('eventId'));
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const rows = await getExpenses(eventId);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.event_id || !body.category) return NextResponse.json({ error: 'event_id and category required' }, { status: 400 });
    const expense = await saveExpense(body);
    return NextResponse.json(expense);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, amount, label } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const expense = await updateExpense(id, amount, label ?? null);
    return NextResponse.json(expense);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteExpense(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
