'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { EventListItem, EventType } from '@/lib/db';
import { type Lang, makeTr, getLang, setLang } from '@/lib/i18n';

interface Props {
  events: EventListItem[];
  seminars: EventListItem[];
}

function CreateForm({ type, onCancel, onCreated, lang }: { type: EventType; onCancel: () => void; onCreated: (item: EventListItem) => void; lang: Lang }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const tr = makeTr(lang);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: name.trim(), type }),
      });
      if (!r.ok) { alert(lang === 'es' ? 'Error al crear. Verificá la conexión a la base de datos.' : 'Error creating. Check your database connection.'); return; }
      const item = await r.json();
      onCreated({ id: item.id, event_name: item.event_name, type: item.type, updated_at: item.updated_at });
      router.push(type === 'seminar' ? `/seminars/${item.id}` : `/events/${item.id}`);
    } finally {
      setLoading(false);
    }
  }

  const ph = type === 'seminar' ? tr('seminar_ph') : tr('event_ph');

  return (
    <div style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
      <input
        type="text"
        placeholder={ph}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        autoFocus
        style={{ flex: 1 }}
      />
      <button onClick={handleCreate} disabled={loading} style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap' }}>
        {loading ? tr('creating_btn') : tr('create_btn')}
      </button>
      <button onClick={onCancel} style={{ background: 'transparent', color: 'var(--muted)', border: '0.5px solid var(--border2)', whiteSpace: 'nowrap' }}>
        {tr('cancel')}
      </button>
    </div>
  );
}

function ItemCard({ item, lang }: { item: EventListItem; lang: Lang }) {
  const tr = makeTr(lang);
  const href = item.type === 'seminar' ? `/seminars/${item.id}` : `/events/${item.id}`;
  const badgeColor = item.type === 'seminar' ? 'rgba(251,191,36,0.15)' : 'rgba(124,109,250,0.15)';
  const badgeText  = item.type === 'seminar' ? '#fbbf24' : 'var(--accent2)';
  const badgeLabel = item.type === 'seminar' ? tr('type_badge_seminar').toUpperCase() : tr('type_badge_event').toUpperCase();
  const locale     = lang === 'en' ? 'en-US' : 'es-CR';
  const dateStr    = item.event_date
    ? new Date(item.event_date + 'T00:00:00').toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.event_name}</p>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', background: badgeColor, color: badgeText, borderRadius: 4, padding: '3px 7px', flexShrink: 0 }}>
            {badgeLabel}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {item.venue && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ opacity: 0.5 }}>📍</span> {item.venue}
            </p>
          )}
          {dateStr && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ opacity: 0.5 }}>📅</span> {dateStr}
            </p>
          )}
          {!item.venue && !dateStr && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', opacity: 0.5 }}>
              {tr('updated')} {new Date(item.updated_at).toLocaleDateString(locale)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function Section({ title, items, type, buttonLabel, noItemsLabel, lang }: {
  title: string; items: EventListItem[]; type: EventType; buttonLabel: string; noItemsLabel: string; lang: Lang;
}) {
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState<EventListItem[]>(items);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2>
        {!creating && (
          <button onClick={() => setCreating(true)} style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, padding: '6px 14px' }}>{buttonLabel}</button>
        )}
      </div>
      {creating && (
        <CreateForm type={type} onCancel={() => setCreating(false)} onCreated={item => { setList(prev => [...prev, item]); setCreating(false); }} lang={lang} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', padding: '12px 0' }}>{noItemsLabel}</p>
        ) : (
          list.map(item => <ItemCard key={item.id} item={item} lang={lang} />)
        )}
      </div>
    </div>
  );
}

export default function HomePage({ events, seminars }: Props) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    setLangState(getLang());
  }, []);

  const tr = makeTr(lang);

  function toggleLang() {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLangState(next);
    setLang(next);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '0.5px solid var(--border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>WEM</h1>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{tr('home_subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleLang} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', color: 'var(--muted)', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {tr('lang_toggle')}
          </button>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        <Section title={tr('section_events')} items={events} type="event" buttonLabel={tr('create_event')} noItemsLabel={tr('no_events')} lang={lang} />
        <Section title={tr('section_seminars')} items={seminars} type="seminar" buttonLabel={tr('create_seminar')} noItemsLabel={tr('no_seminars')} lang={lang} />
      </div>
    </div>
  );
}
