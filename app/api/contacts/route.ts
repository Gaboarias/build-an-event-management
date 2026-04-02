import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact, updateContact, deleteContact } from '@/lib/db';

export async function GET() {
  try {
    const rows = await getContacts();
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const contact = await createContact({
      name:  body.name.trim(),
      phone: body.phone ?? null,
      email: body.email ?? null,
      role:  body.role  ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const contact = await updateContact(id, {
      name:  data.name?.trim() ?? '',
      phone: data.phone ?? null,
      email: data.email ?? null,
      role:  data.role  ?? null,
      notes: data.notes ?? null,
    });
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteContact(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
