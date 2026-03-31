import { getConfig } from '@/lib/db';
import Dashboard from '@/components/Dashboard';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) notFound();
  let config;
  try {
    config = await getConfig(id);
  } catch {
    notFound();
  }
  if (!config || config.type !== 'event') notFound();
  return <Dashboard initialConfig={config} type="event" />;
}
