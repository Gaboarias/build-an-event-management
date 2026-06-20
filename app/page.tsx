import { getAllEvents } from '@/lib/db';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import HomePage from '@/components/HomePage';
import type { EventListItem } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/login');

  let events: EventListItem[] = [];
  let seminars: EventListItem[] = [];
  try {
    const all = await getAllEvents(session.orgId);
    events   = all.filter(e => e.type === 'event');
    seminars = all.filter(e => e.type === 'seminar');
  } catch {
    // DB error — empty state
  }
  return <HomePage events={events} seminars={seminars} />;
}
