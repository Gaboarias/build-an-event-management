'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { EventListItem, EventType } from '@/lib/db';

interface Props {
  events: EventListItem[];
  seminars: EventListItem[];
}

function CreateForm({ type, onCancel, onCreated }: { type: EventType; onCancel: () => void; onCreated: (item: EventListItem) => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const label = type === 'seminar' ? 'seminario' : 'evento';

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: name.trim(), type }),
      });
      if (!r.ok) { alert('Error al crear. Verificá la conexión a la base de datos.'); return; }
      const item = await r.json();
      onCreated({ id: item.id, event_name: item.event_name, type: item.type, updated_at: item.updated_at });
      router.push(type === 'seminar' ? `/seminars/${item.id}` : `/events/${item.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
      <input
        type="text"
        placeholder={`Nombre del ${label}…`}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        autoFocus
        style={{ flex: 1 }}
      />
      <button onClick={handleCreate} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap' }}>
        {loading ? 'Creando…' : 'Crear'}
      </button>
      <button onClick={onCancel} style={{ background: 'transparent', color: 'var(--muted)', border: '0.5px solid var(--border2)', whiteSpace: 'nowrap' }}>
        Cancelar
      </button>
    </div>
  );
}

function ItemCard({ item }: { item: EventListItem }) {
  const href = item.type === 'seminar' ? `/seminars/${item.id}` : `/events/${item.id}`;
  const badgeColor = item.type === 'seminar' ? 'rgba(251,191,36,0.15)' : 'rgba(124,109,250,0.15)';
  const badgeText = item.type === 'seminar' ? '#fbbf24' : 'var(--accent2)';
  const badgeLabel = item.type === 'seminar' ? 'SEMINARIO' : 'EVENTO';

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {item.event_name}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
            {new Date(item.updated_at).toLocaleDateString('es-CR')}
          </p>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em',
          background: badgeColor, color: badgeText,
          borderRadius: 4, padding: '3px 7px',
        }}>
          {badgeLabel}
        </span>
      </div>
    </Link>
  );
}

function Section({
  title,
  items,
  type,
  buttonLabel,
}: {
  title: string;
  items: EventListItem[];
  type: EventType;
  buttonLabel: string;
}) {
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState<EventListItem[]>(items);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, padding: '6px 14px' }}
          >
            {buttonLabel}
          </button>
        )}
      </div>

      {creating && (
        <CreateForm
          type={type}
          onCancel={() => setCreating(false)}
          onCreated={item => { setList(prev => [...prev, item]); setCreating(false); }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', padding: '12px 0' }}>
            No hay {type === 'seminar' ? 'seminarios' : 'eventos'} aún.
          </p>
        ) : (
          list.map(item => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

export default function HomePage({ events, seminars }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '0.5px solid var(--border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>
            WEM
          </h1>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>wrestling events manager</p>
        </div>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
      </header>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        <Section title="Eventos" items={events} type="event" buttonLabel="+ Nuevo evento" />
        <Section title="Seminarios" items={seminars} type="seminar" buttonLabel="+ Nuevo seminario" />
      </div>

    </div>
  );
}
