import { NextRequest, NextResponse } from 'next/server';
import { getStudents, createStudent, updateStudent, deleteStudent } from '@/lib/db';

export async function GET() {
  try {
    const rows = await getStudents();
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const student = await createStudent({
      name:          body.name.trim(),
      phone:         body.phone ?? null,
      plan:          body.plan ?? 'Basic',
      date_of_birth: body.date_of_birth ?? null,
      paid_months:   body.paid_months ?? '[]',
    });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const student = await updateStudent(id, {
      name:          data.name?.trim(),
      phone:         data.phone ?? null,
      plan:          data.plan,
      date_of_birth: data.date_of_birth ?? null,
      paid_months:   data.paid_months,
    });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteStudent(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
