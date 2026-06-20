import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact, updateContact, deleteContact } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return NextResponse.json(await getContacts(s.orgId));
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const contact = await createContact({
      name:  body.name.trim(),
      phone: body.phone ?? null,
      email: body.email ?? null,
      role:  body.role  ?? null,
      notes: body.notes ?? null,
    }, s.orgId);
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const contact = await updateContact(id, {
      name:  data.name?.trim() ?? '',
      phone: data.phone ?? null,
      email: data.email ?? null,
      role:  data.role  ?? null,
      notes: data.notes ?? null,
    }, s.orgId);
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id } = await req.json();
    await deleteContact(id, s.orgId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
