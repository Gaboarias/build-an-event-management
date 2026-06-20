import { getConfig } from '@/lib/db';
import { getSession } from '@/lib/session';
import Dashboard from '@/components/Dashboard';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const id = Number(params.id);
  if (!id) notFound();
  let config;
  try {
    config = await getConfig(id, session.orgId);
  } catch {
    notFound();
  }
  if (!config || config.type !== 'event') notFound();
  return <Dashboard initialConfig={config} type="event" />;
}
