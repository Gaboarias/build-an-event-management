import { getAllEvents } from '@/lib/db';
import HomePage from '@/components/HomePage';
import type { EventListItem } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  let events: EventListItem[] = [];
  let seminars: EventListItem[] = [];
  try {
    const all = await getAllEvents();
    events   = all.filter(e => e.type === 'event');
    seminars = all.filter(e => e.type === 'seminar');
  } catch {
    // DB not connected — empty state
  }
  return <HomePage events={events} seminars={seminars} />;
}
