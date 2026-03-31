import { NextResponse } from 'next/server';
import { getAllEvents } from '@/lib/db';

export async function GET() {
  try {
    const events = await getAllEvents();
    return NextResponse.json(events);
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
