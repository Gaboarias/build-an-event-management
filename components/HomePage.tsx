'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { EventListItem, EventType } from '@/lib/db';
import { type Lang, makeTr, getLang, setLang } from '@/lib/i18n';
import { useTheme, type Theme } from './ThemeProvider';

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
      onCreated({ id: item.id, event_name: item.event_name, type: item.type, venue: item.venue ?? null, event_date: item.event_date ?? null, updated_at: item.updated_at });
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

function Calendar({ allItems, lang }: { allItems: EventListItem[]; lang: Lang }) {
  const tr = makeTr(lang);
  const locale = lang === 'en' ? 'en-US' : 'es-CR';
  const mono = { fontFamily: 'var(--font-mono)' };

  const [calDate, setCalDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const year  = calDate.getFullYear();
  const month = calDate.getMonth();

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Map dateStr → items
  const byDate = new Map<string, EventListItem[]>();
  allItems.forEach(item => {
    if (!item.event_date) return;
    byDate.set(item.event_date, [...(byDate.get(item.event_date) ?? []), item]);
  });

  // Build calendar grid (Monday-first)
  const firstDow   = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Day-of-week headers Mon–Sun
  const dowHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i); // 2024-01-01 is Monday
    return d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2).toUpperCase();
  });

  // Upcoming events sorted from today
  const upcoming = allItems
    .filter(i => i.event_date && i.event_date >= todayStr)
    .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1))
    .slice(0, 6);

  const monthLabel = calDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ ...mono, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tr('cal_title')}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setCalDate(new Date(year, month - 1, 1))}
            style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--muted)', borderRadius: 6, padding: '3px 10px', fontSize: 14, cursor: 'pointer' }}>‹</button>
          <span style={{ ...mono, fontSize: 12, color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize', minWidth: 140, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => setCalDate(new Date(year, month + 1, 1))}
            style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--muted)', borderRadius: 6, padding: '3px 10px', fontSize: 14, cursor: 'pointer' }}>›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        {/* Grid */}
        <div>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {dowHeaders.map(d => (
              <div key={d} style={{ ...mono, fontSize: 9, color: 'var(--muted)', textAlign: 'center', padding: '4px 0', letterSpacing: '0.06em' }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayItems = byDate.get(dateStr) ?? [];
              const isToday  = dateStr === todayStr;
              const hasEvent = dayItems.some(x => x.type === 'event');
              const hasSeminar = dayItems.some(x => x.type === 'seminar');
              return (
                <div key={i} title={dayItems.map(x => x.event_name).join(', ')}
                  style={{ borderRadius: 6, padding: '5px 2px', textAlign: 'center', cursor: dayItems.length ? 'pointer' : 'default',
                    background: isToday ? 'var(--accent)' : dayItems.length ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: `0.5px solid ${isToday ? 'var(--accent)' : dayItems.length ? 'var(--border2)' : 'transparent'}`,
                    transition: 'background 0.1s' }}>
                  <span style={{ ...mono, fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : dayItems.length ? 'var(--text)' : 'var(--muted)' }}>{day}</span>
                  {(hasEvent || hasSeminar) && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                      {hasEvent    && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent2)',   display: 'inline-block' }} />}
                      {hasSeminar  && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--amber)',     display: 'inline-block' }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            <span style={{ ...mono, fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', display: 'inline-block' }} /> Evento
            </span>
            <span style={{ ...mono, fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} /> Seminario
            </span>
          </div>
        </div>

        {/* Upcoming list */}
        <div>
          <p style={{ ...mono, fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{tr('cal_upcoming')}</p>
          {upcoming.length === 0 ? (
            <p style={{ ...mono, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{tr('cal_no_upcoming')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map(item => {
                const href = item.type === 'seminar' ? `/seminars/${item.id}` : `/events/${item.id}`;
                const dot  = item.type === 'seminar' ? 'var(--amber)' : 'var(--accent2)';
                const d    = new Date(item.event_date! + 'T00:00:00');
                const dStr = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
                return (
                  <Link key={item.id} href={href} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8,
                      border: '0.5px solid var(--border)', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...mono, fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.event_name}</p>
                        {item.venue && <p style={{ ...mono, fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{item.venue}</p>}
                      </div>
                      <span style={{ ...mono, fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{dStr}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
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
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setLangState(getLang());
  }, []);

  const tr = makeTr(lang);
  const mono = { fontFamily: 'var(--font-mono)' };

  function toggleLang() {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLangState(next);
    setLang(next);
  }

  const themes: { key: Theme; icon: string }[] = [
    { key: 'dark',       icon: '🌙' },
    { key: 'light',      icon: '☀️' },
    { key: 'colorblind', icon: '◑'  },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '0.5px solid var(--border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>WEM</h1>
          <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginTop: 2 }}>{tr('home_subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Theme switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 8, padding: 3 }}>
            {themes.map(t => (
              <button key={t.key} onClick={() => setTheme(t.key)} title={tr(`theme_${t.key}` as any)}
                style={{ background: theme === t.key ? 'var(--accent)' : 'transparent', color: theme === t.key ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s' }}>
                {t.icon}
              </button>
            ))}
          </div>
          <button onClick={toggleLang} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', color: 'var(--muted)', borderRadius: 8, padding: '6px 12px', ...mono, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {tr('lang_toggle')}
          </button>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
        </div>
      </header>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px', display: 'grid', gap: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <Section title={tr('section_events')} items={events} type="event" buttonLabel={tr('create_event')} noItemsLabel={tr('no_events')} lang={lang} />
          <Section title={tr('section_seminars')} items={seminars} type="seminar" buttonLabel={tr('create_seminar')} noItemsLabel={tr('no_seminars')} lang={lang} />
        </div>
        <Calendar allItems={[...events, ...seminars]} lang={lang} />
      </div>
    </div>
  );
}
