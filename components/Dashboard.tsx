'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EventConfig, EventType, SalesSnapshot, Expense } from '@/lib/db';
import SalesSheet from './SalesSheet';
import { type Lang, makeTr, getLang, setLang } from '@/lib/i18n';

interface Props {
  initialConfig: EventConfig;
  type: EventType;
}

// Expense categories stored in DB (always Spanish keys)
const EXPENSE_CATEGORIES = ['Luces y Sonido', 'Alquiler', 'Transporte', 'Luchador', 'Vuelo', 'Grabacion', 'Sillas', 'Estadia'] as const;

const CAT_KEY_MAP: Record<string, 'cat_luces'|'cat_alquiler'|'cat_transporte'|'cat_luchador'|'cat_vuelo'|'cat_grabacion'|'cat_sillas'|'cat_estadia'> = {
  'Luces y Sonido': 'cat_luces', 'Alquiler': 'cat_alquiler', 'Transporte': 'cat_transporte',
  'Luchador': 'cat_luchador', 'Vuelo': 'cat_vuelo', 'Grabacion': 'cat_grabacion',
  'Sillas': 'cat_sillas', 'Estadia': 'cat_estadia',
};

type Currency = 'CRC' | 'USD' | 'MXN';

function calcRev(gen: number, vip: number, li: number, mesas: number, p: EventConfig) {
  return gen * p.price_gen + vip * p.price_vip + li * p.price_lounge_ind + mesas * p.price_lounge_mesa;
}

export default function Dashboard({ initialConfig, type }: Props) {
  const [cfg, setCfg]     = useState<EventConfig>(initialConfig);
  const [draft, setDraft] = useState<EventConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const [gen, setGen] = useState(initialConfig.cap_gen);
  const [vip, setVip] = useState(initialConfig.cap_vip);
  const [li, setLi]   = useState(initialConfig.cap_lounge);
  const [lm, setLm]   = useState(0);

  const [snapshots, setSnapshots]   = useState<SalesSnapshot[]>([]);
  const [snapLabel, setSnapLabel]   = useState('');
  const [loadingSnaps, setLoadingSnaps] = useState(false);

  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [loadingExp, setLoadingExp]   = useState(false);
  const [newExpCat, setNewExpCat]     = useState<string>(EXPENSE_CATEGORIES[0]);
  const [newExpCustomCat, setNewExpCustomCat] = useState('');
  const [newExpLabel, setNewExpLabel] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [addingExp, setAddingExp]     = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency]         = useState<Currency>('CRC');
  const [rateUSD, setRateUSD]           = useState(540);
  const [rateMXN, setRateMXN]           = useState(4);
  const [actionLoading, setActionLoading] = useState(false);

  // Language
  const [lang, setLangState] = useState<Lang>('es');

  const router = useRouter();

  // Load preferences from localStorage
  useEffect(() => {
    const savedLang = getLang();
    setLangState(savedLang);

    const id = initialConfig.id;
    const savedCur  = localStorage.getItem(`wem-currency-${id}`) as Currency | null;
    const savedRateUSD = localStorage.getItem(`wem-rateUSD-${id}`);
    const savedRateMXN = localStorage.getItem(`wem-rateMXN-${id}`);
    if (savedCur) setCurrency(savedCur);
    if (savedRateUSD) setRateUSD(Number(savedRateUSD));
    if (savedRateMXN) setRateMXN(Number(savedRateMXN));
  }, [initialConfig.id]);

  const tr = makeTr(lang);

  function toggleLang() {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLangState(next);
    setLang(next);
  }

  function saveCurrency(c: Currency) {
    setCurrency(c);
    localStorage.setItem(`wem-currency-${initialConfig.id}`, c);
  }
  function saveRateUSD(r: number) { setRateUSD(r); localStorage.setItem(`wem-rateUSD-${initialConfig.id}`, String(r)); }
  function saveRateMXN(r: number) { setRateMXN(r); localStorage.setItem(`wem-rateMXN-${initialConfig.id}`, String(r)); }

  // Currency helpers — draft always stores CRC; these are display-only
  const rate = currency === 'USD' ? rateUSD : currency === 'MXN' ? rateMXN : 1;
  const sym  = currency === 'USD' ? '$' : currency === 'MXN' ? 'MX$' : '₡';
  const locale = currency === 'USD' ? 'en-US' : currency === 'MXN' ? 'es-MX' : 'es-CR';
  const decs   = currency === 'CRC' ? 0 : 2;

  function toCurrent(crc: number) { return currency === 'CRC' ? crc : crc / rate; }
  function fromCurrent(val: number) { return currency === 'CRC' ? val : val * rate; }
  function money(crc: number, signed = false) {
    const val = toCurrent(crc);
    const s = signed && crc >= 0 ? '+' : '';
    return `${s}${sym}${Math.abs(val).toLocaleString(locale, { maximumFractionDigits: decs, minimumFractionDigits: 0 })}`;
  }

  const eventId  = initialConfig.id;
  const costNeto = expenses.reduce((s, e) => s + e.amount, 0);
  const rev  = calcRev(gen, vip, li, lm, cfg);
  const pl   = rev - costNeto;
  const pers = gen + vip + li + lm * 3;
  const pct  = costNeto > 0 ? Math.min((rev / costNeto) * 100, 100) : 0;

  const plColor  = pl > 5000 ? 'var(--green)' : pl >= -20000 ? 'var(--amber)' : 'var(--red)';
  const barColor = pl > 5000 ? '#34d399' : pl >= -20000 ? '#fbbf24' : '#f87171';
  const typeLabel = type === 'seminar' ? tr('type_seminar') : tr('type_event');

  // Price input display values (in current currency)
  const draftDisplay = {
    price_gen:         Math.round(toCurrent(draft.price_gen)),
    price_vip:         Math.round(toCurrent(draft.price_vip)),
    price_lounge_ind:  Math.round(toCurrent(draft.price_lounge_ind)),
    price_lounge_mesa: Math.round(toCurrent(draft.price_lounge_mesa)),
  };

  const loadSnapshots = useCallback(async () => {
    setLoadingSnaps(true);
    try { const r = await fetch(`/api/events?eventId=${eventId}`); setSnapshots(await r.json()); }
    finally { setLoadingSnaps(false); }
  }, [eventId]);

  const loadExpenses = useCallback(async () => {
    setLoadingExp(true);
    try { const r = await fetch(`/api/expenses?eventId=${eventId}`); setExpenses(await r.json()); }
    finally { setLoadingExp(false); }
  }, [eventId]);

  useEffect(() => { loadSnapshots(); loadExpenses(); }, [loadSnapshots, loadExpenses]);

  async function saveConfig() {
    setSaving(true);
    try {
      // draft always stores CRC — no conversion needed
      const r = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...draft }),
      });
      if (!r.ok) { alert(tr('err_save')); return; }
      const fresh = await r.json();
      setCfg(fresh); setDraft(fresh);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  async function handleEventAction(action: 'active' | 'paused' | 'cancelled' | 'delete') {
    const confirms: Record<string, string> = {
      active:    tr('confirm_reactivate'),
      paused:    tr('confirm_pause'),
      cancelled: tr('confirm_cancel'),
      delete:    tr('confirm_delete'),
    };
    if (!confirm(confirms[action])) return;
    setActionLoading(true);
    try {
      if (action === 'delete') {
        const r = await fetch('/api/config', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) });
        if (!r.ok) { alert(tr('err_delete')); return; }
        router.push('/');
      } else {
        const r = await fetch('/api/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, status: action }) });
        if (!r.ok) { alert(tr('err_status')); return; }
        const updated = await r.json();
        setCfg(updated); setDraft(updated);
      }
    } finally { setActionLoading(false); }
  }

  async function saveSnap() {
    if (!snapLabel.trim()) return;
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, label: snapLabel, qty_gen: gen, qty_vip: vip, qty_lounge_ind: li, qty_lounge_mesa: lm, ingreso: rev, pl }) });
    setSnapLabel(''); loadSnapshots();
  }

  async function deleteSnap(id: number) {
    await fetch('/api/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadSnapshots();
  }

  async function addExpense() {
    const amount = parseFloat(newExpAmount);
    const effectiveCat = newExpCat === '__new__' ? newExpCustomCat.trim() : newExpCat;
    if (!effectiveCat || !amount || amount <= 0) return;
    setAddingExp(true);
    try {
      const rawAmount = Math.round(fromCurrent(amount));
      const r = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, category: effectiveCat, label: newExpLabel.trim() || null, amount: rawAmount }) });
      if (!r.ok) { alert(tr('err_expense')); return; }
      setNewExpLabel(''); setNewExpAmount(''); setNewExpCustomCat('');
      loadExpenses();
    } finally { setAddingExp(false); }
  }

  async function deleteExpenseRow(id: number) {
    await fetch('/api/expenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadExpenses();
  }

  const GENE_STEPS   = [40, 50, 60, 70, 80, 90, 100];
  const LOUNGE_STEPS = [0, 5, 10, 15, 20, 25];

  const expByCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat, rows: expenses.filter(e => e.category === cat),
  })).filter(g => g.rows.length > 0);

  // Also group any custom categories not in the standard list
  const customCats = [...new Set(expenses.filter(e => !EXPENSE_CATEGORIES.includes(e.category as typeof EXPENSE_CATEGORIES[number])).map(e => e.category))];
  const allGroups = [
    ...expByCategory,
    ...customCats.map(cat => ({ cat, rows: expenses.filter(e => e.category === cat) })),
  ];

  const btnBase: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--bg3)', border: '0.5px solid var(--border2)',
    color: 'var(--text)', fontSize: 18, fontWeight: 300,
    cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '0.5px solid var(--border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>WEM</h1>
            <Link href="/" style={{ fontSize: 11, color: 'var(--muted)', ...mono, textDecoration: 'none' }}>{tr('back_home')}</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>{cfg.event_name} · {typeLabel}</p>
            {cfg.status === 'paused'    && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '0.5px solid #fbbf24', ...mono, fontWeight: 600 }}>{tr('status_paused')}</span>}
            {cfg.status === 'cancelled' && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(248,113,113,0.15)', color: 'var(--red)', border: '0.5px solid var(--red)', ...mono, fontWeight: 600 }}>{tr('status_cancelled')}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Language toggle */}
          <button onClick={toggleLang} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', color: 'var(--muted)', borderRadius: 8, padding: '6px 12px', ...mono, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {tr('lang_toggle')}
          </button>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{ background: showSettings ? 'var(--accent)' : 'var(--bg2)', border: '0.5px solid var(--border2)', color: showSettings ? '#fff' : 'var(--muted)', borderRadius: 8, padding: '6px 14px', ...mono, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {tr('settings_btn')}
          </button>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'grid', gap: 24 }}>

        {/* Settings Panel */}
        {showSettings && (
          <section style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 11, ...mono, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>{tr('settings_title')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

              {/* Capacity */}
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{tr('capacity_title')}</p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {([
                    { key: 'cap_gen',    label: tr('cap_gen') },
                    { key: 'cap_vip',    label: tr('cap_vip') },
                    { key: 'cap_lounge', label: tr('cap_lounge') },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button style={btnBase} onClick={() => setDraft(d => ({ ...d, [f.key]: Math.max(0, d[f.key] - 1) }))}>−</button>
                        <input type="number" value={draft[f.key]} min={0} step={1}
                          onChange={e => setDraft(d => ({ ...d, [f.key]: +e.target.value }))}
                          style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 }} />
                        <button style={btnBase} onClick={() => setDraft(d => ({ ...d, [f.key]: d[f.key] + 1 }))}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{tr('currency_title')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {(['CRC', 'USD', 'MXN'] as Currency[]).map(c => (
                    <button key={c} onClick={() => saveCurrency(c)} style={{
                      padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                      background: currency === c ? 'var(--accent)' : 'var(--bg3)',
                      color: currency === c ? '#fff' : 'var(--muted)',
                      border: currency === c ? '1px solid var(--accent)' : '0.5px solid var(--border2)',
                      ...mono, fontSize: 13, fontWeight: 600,
                    }}>
                      {c === 'CRC' ? '₡ CRC' : c === 'USD' ? '$ USD' : 'MX$ MXN'}
                    </button>
                  ))}
                </div>
                {currency === 'USD' && (
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, display: 'block', marginBottom: 4 }}>{tr('rate_crc_usd')}</label>
                    <input type="number" value={rateUSD} min={1} step={1} onChange={e => saveRateUSD(+e.target.value)} style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 16 }} />
                    <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, marginTop: 6 }}>{tr('currency_note_usd')}</p>
                  </div>
                )}
                {currency === 'MXN' && (
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, display: 'block', marginBottom: 4 }}>{tr('rate_crc_mxn')}</label>
                    <input type="number" value={rateMXN} min={0.01} step={0.01} onChange={e => saveRateMXN(+e.target.value)} style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 16 }} />
                    <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, marginTop: 6 }}>{tr('currency_note_mxn')}</p>
                  </div>
                )}
                {currency === 'CRC' && <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, lineHeight: 1.5 }}>{tr('currency_note_crc')}</p>}
              </div>
            </div>

            {/* Save + Reactivate */}
            <div style={{ marginTop: 20, borderTop: '0.5px solid var(--border)', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={saveConfig} disabled={saving}
                style={{ background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1, padding: '10px 24px', borderRadius: 8, ...mono, fontSize: 13, cursor: 'pointer', border: 'none' }}>
                {saving ? tr('saving') : saved ? tr('changes_saved') : tr('save_settings')}
              </button>
              {cfg.status !== 'active' && (
                <button onClick={() => handleEventAction('active')}
                  style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '0.5px solid var(--green)', color: 'var(--green)', ...mono, fontSize: 13, cursor: 'pointer' }}>
                  {tr('reactivate')}
                </button>
              )}
            </div>

            {/* Status badges */}
            {cfg.status !== 'active' && (
              <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8,
                background: cfg.status === 'cancelled' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                border: `0.5px solid ${cfg.status === 'cancelled' ? 'var(--red)' : '#fbbf24'}` }}>
                <span style={{ fontSize: 11, ...mono, color: cfg.status === 'cancelled' ? 'var(--red)' : '#fbbf24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {cfg.status === 'cancelled' ? tr('badge_cancelled') : tr('badge_paused')}
                </span>
              </div>
            )}

            {/* Danger zone */}
            <div style={{ marginTop: 24, borderTop: '0.5px solid rgba(248,113,113,0.3)', paddingTop: 16 }}>
              <p style={{ fontSize: 10, color: 'var(--red)', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, opacity: 0.7 }}>{tr('danger_zone')}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => handleEventAction('paused')} disabled={actionLoading || cfg.status === 'paused'}
                  style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '0.5px solid #fbbf24', color: '#fbbf24', ...mono, fontSize: 12, cursor: 'pointer', opacity: (actionLoading || cfg.status === 'paused') ? 0.4 : 1, fontWeight: 600 }}>
                  {tr('pause_event')}
                </button>
                <button onClick={() => handleEventAction('cancelled')} disabled={actionLoading || cfg.status === 'cancelled'}
                  style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '0.5px solid var(--red)', color: 'var(--red)', ...mono, fontSize: 12, cursor: 'pointer', opacity: (actionLoading || cfg.status === 'cancelled') ? 0.4 : 1, fontWeight: 600 }}>
                  {tr('cancel_event')}
                </button>
                <button onClick={() => handleEventAction('delete')} disabled={actionLoading}
                  style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(248,113,113,0.15)', border: '1px solid var(--red)', color: 'var(--red)', ...mono, fontSize: 12, cursor: 'pointer', opacity: actionLoading ? 0.4 : 1, fontWeight: 700 }}>
                  {tr('delete_event')}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: tr('kpi_expenses'), value: money(costNeto),   color: 'var(--accent2)' },
            { label: tr('kpi_revenue'),  value: money(rev),        color: 'var(--text)' },
            { label: tr('kpi_pl'),       value: money(pl, true),   color: plColor },
            { label: tr('kpi_people'),   value: pers.toString(),   color: 'var(--text)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: k.color, ...mono }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Sales Sheet */}
        <SalesSheet eventId={eventId} cfg={cfg} money={money} fromCurrent={fromCurrent} toCurrent={toCurrent} sym={sym} lang={lang} />

        {/* Progress bar */}
        <div>
          <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct.toFixed(1)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.3s ease, background 0.3s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginTop: 6 }}>
            {pct.toFixed(1)}% {tr('cost_covered')} — {tr('net_cost')} {money(costNeto)}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Price config */}
          <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              {tr('prices_title')}
              <span style={{ marginLeft: 8, padding: '2px 6px', background: 'var(--bg3)', borderRadius: 4, fontSize: 9, color: 'var(--muted)', border: '0.5px solid var(--border2)' }}>
                {currency}
              </span>
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {([
                { key: 'price_gen',         label: `${tr('lbl_gen')} (${sym})`,            note: `${tr('max')} ${draft.cap_gen} ${tr('people')}` },
                { key: 'price_vip',         label: `${tr('lbl_vip')} (${sym})`,            note: `${tr('max')} ${draft.cap_vip} ${tr('people')}` },
                { key: 'price_lounge_ind',  label: `${tr('lbl_lounge_ind')} (${sym})`,     note: `${tr('max')} ${draft.cap_lounge} ${tr('people')}` },
                { key: 'price_lounge_mesa', label: `${tr('lbl_lounge_mesa')} (${sym})`,    note: `≈ ${sym}${Math.round(toCurrent(draft.price_lounge_mesa) / 3).toLocaleString(locale, { maximumFractionDigits: decs })}/${tr('per_person')}` },
              ] as const).map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type="number" value={draftDisplay[f.key]}
                    onChange={e => setDraft(d => ({ ...d, [f.key]: Math.round(fromCurrent(+e.target.value)) }))}
                    step={currency === 'CRC' ? 500 : 1} min={0} />
                  <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, marginTop: 3 }}>{f.note}</p>
                </div>
              ))}
            </div>
            <button onClick={saveConfig} disabled={saving}
              style={{ marginTop: 16, width: '100%', background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
              {saving ? tr('saving') : saved ? tr('save_ok') : tr('save_db')}
            </button>
          </section>

          {/* Simulator */}
          <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{tr('simulator_title')}</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {([
                { label: tr('lbl_gen'),          val: gen, set: setGen, max: cfg.cap_gen,    bigStep: 5 },
                { label: tr('lbl_vip'),          val: vip, set: setVip, max: cfg.cap_vip,    bigStep: 5 },
                { label: tr('lbl_lounge_ind'),   val: li,  set: setLi,  max: cfg.cap_lounge, bigStep: 1 },
                { label: tr('lounge_tables'),    val: lm,  set: setLm,  max: 8,              bigStep: 1, sub: `${lm * 3} ${tr('lounge_people')}` },
              ]).map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', ...mono }}>{s.sub ?? `${s.val} / ${s.max}`}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => s.set(Math.max(0, s.val - s.bigStep))} style={btnBase}>−</button>
                    <div style={{ flex: 1, position: 'relative', height: 36, background: 'var(--bg3)', borderRadius: 8, border: '0.5px solid var(--border2)', overflow: 'hidden', cursor: 'pointer' }}
                      onClick={e => { const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); s.set(Math.round((e.clientX - rect.left) / rect.width * s.max)); }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${s.max > 0 ? (s.val / s.max) * 100 : 0}%`, background: 'var(--accent)', opacity: 0.25, transition: 'width 0.15s ease' }} />
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{s.val}</span>
                    </div>
                    <button onClick={() => s.set(Math.min(s.max, s.val + s.bigStep))} style={btnBase}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, borderTop: '0.5px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginBottom: 8 }}>{tr('save_scenario')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder={tr('scenario_ph')} value={snapLabel} onChange={e => setSnapLabel(e.target.value)} style={{ flex: 1 }} />
                <button onClick={saveSnap} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '0.5px solid var(--border2)', whiteSpace: 'nowrap' }}>{tr('save')}</button>
              </div>
            </div>
          </section>
        </div>

        {/* Expenses */}
        <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            {tr('expenses_title')} {loadingExp && <span>…</span>}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: newExpCat === '__new__' ? '1fr 1fr 1fr 1fr auto' : '1fr 2fr 1fr auto', gap: 8, marginBottom: 16 }}>
            <select value={newExpCat} onChange={e => { setNewExpCat(e.target.value); setNewExpCustomCat(''); }}
              style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--text)', ...mono, fontSize: 13, borderRadius: 6, padding: '8px 12px' }}>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{tr(CAT_KEY_MAP[c])}</option>
              ))}
              <option value="__new__">{tr('new_cat_btn')}</option>
            </select>
            {newExpCat === '__new__' && (
              <input type="text" placeholder={tr('new_cat_ph')} value={newExpCustomCat}
                onChange={e => setNewExpCustomCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense()} autoFocus />
            )}
            <input type="text" placeholder={tr('desc_ph')} value={newExpLabel}
              onChange={e => setNewExpLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense()} />
            <input type="number" placeholder={`${tr('amount_ph')} (${sym})`} value={newExpAmount}
              onChange={e => setNewExpAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpense()} min={0} step={currency === 'CRC' ? 1000 : 1} />
            <button onClick={addExpense} disabled={addingExp} style={{ background: 'var(--accent)', color: '#fff', opacity: addingExp ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              {addingExp ? tr('adding') : tr('add')}
            </button>
          </div>

          {expenses.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)', ...mono }}>{tr('no_expenses')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', ...mono, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                    {[tr('col_category'), tr('col_description'), `${tr('col_amount')} (${sym})`, ''].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allGroups.map(({ cat, rows }) => {
                    const catLabel = CAT_KEY_MAP[cat] ? tr(CAT_KEY_MAP[cat]) : cat;
                    return rows.map((e, i) => (
                      <>
                        <tr key={e.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{i === 0 ? catLabel : ''}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{e.label || '—'}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text)', fontWeight: 500 }}>{money(e.amount)}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <button onClick={() => deleteExpenseRow(e.id)} style={{ background: 'transparent', color: 'var(--red)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7, cursor: 'pointer', borderRadius: 4 }}>×</button>
                          </td>
                        </tr>
                        {i === rows.length - 1 && (
                          <tr key={`sub-${cat}`} style={{ borderBottom: '0.5px solid var(--border2)' }}>
                            <td colSpan={2} style={{ padding: '4px 10px', color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('subtotal')} {catLabel}</td>
                            <td style={{ padding: '4px 10px', color: 'var(--muted)', fontSize: 11 }}>{money(rows.reduce((s, r) => s + r.amount, 0))}</td>
                            <td />
                          </tr>
                        )}
                      </>
                    ));
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ padding: '10px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent2)', fontWeight: 600 }}>{tr('total_net')}</td>
                    <td style={{ padding: '10px 10px', fontSize: 16, fontWeight: 700, color: 'var(--accent2)' }}>{money(costNeto)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Snapshots */}
        <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            {tr('snapshots_title')} {loadingSnaps && <span style={{ color: 'var(--muted)' }}>…</span>}
          </h2>
          {snapshots.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)', ...mono }}>{tr('no_snapshots')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', ...mono, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                    {[tr('col_scenario'), tr('lbl_gen'), tr('lbl_vip'), tr('col_lounge_ind'), tr('col_tables'), tr('col_revenue'), tr('kpi_pl'), tr('col_date'), ''].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{s.label}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{s.qty_gen}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{s.qty_vip}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{s.qty_lounge_ind}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{s.qty_lounge_mesa}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{money(s.ingreso)}</td>
                      <td style={{ padding: '8px 10px', color: s.pl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>{money(s.pl, true)}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)', fontSize: 10 }}>{new Date(s.created_at).toLocaleDateString(locale)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => deleteSnap(s.id)} style={{ background: 'transparent', color: 'var(--red)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7, cursor: 'pointer', borderRadius: 4 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* P&L Matrix */}
        <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{tr('matrix_title')}</h2>
          <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginBottom: 16 }}>{tr('vip_fixed')} {cfg.cap_vip}</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 11, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 12px', background: 'var(--bg3)', color: 'var(--muted)', border: '0.5px solid var(--border)', textAlign: 'center' }}>G \ L</th>
                  {LOUNGE_STEPS.map(l => (
                    <th key={l} style={{ padding: '6px 12px', background: 'var(--bg3)', color: 'var(--muted)', border: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 400 }}>{l} L</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GENE_STEPS.map(g => (
                  <tr key={g}>
                    <td style={{ padding: '6px 12px', background: 'var(--bg3)', color: 'var(--muted)', border: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 500 }}>{g} G</td>
                    {LOUNGE_STEPS.map(l => {
                      const r2 = g * cfg.price_gen + cfg.cap_vip * cfg.price_vip + l * cfg.price_lounge_ind;
                      const p  = r2 - costNeto;
                      const isOpt = g === cfg.cap_gen && l === cfg.cap_lounge;
                      let bg = 'rgba(248,113,113,0.12)'; let clr = '#f87171';
                      if (p >= 0)       { bg = 'rgba(52,211,153,0.12)'; clr = '#34d399'; }
                      else if (p >= -150000) { bg = 'rgba(251,191,36,0.12)'; clr = '#fbbf24'; }
                      return (
                        <td key={l} style={{ padding: '6px 12px', border: '0.5px solid var(--border)', background: isOpt ? 'rgba(124,109,250,0.2)' : bg, color: isOpt ? 'var(--accent2)' : clr, textAlign: 'center', fontWeight: isOpt ? 600 : 400, outline: isOpt ? '1.5px solid var(--accent)' : 'none', outlineOffset: '-1px' }}>
                          {money(p, true)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
