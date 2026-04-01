'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EventConfig, EventType, SalesSnapshot, Expense, EventZone } from '@/lib/db';
import SalesSheet from './SalesSheet';
import { type Lang, makeTr, getLang, setLang } from '@/lib/i18n';

interface Props {
  initialConfig: EventConfig;
  type: EventType;
}

// Expense categories stored in DB
const EXPENSE_CATEGORIES = ['Luces y Sonido', 'Venue', 'Transporte', 'Luchador', 'Vuelo', 'Grabacion', 'Sillas', 'Estadia'] as const;

const CAT_KEY_MAP: Record<string, 'cat_luces'|'cat_alquiler'|'cat_transporte'|'cat_luchador'|'cat_vuelo'|'cat_grabacion'|'cat_sillas'|'cat_estadia'> = {
  'Luces y Sonido': 'cat_luces', 'Venue': 'cat_alquiler', 'Alquiler': 'cat_alquiler', 'Transporte': 'cat_transporte',
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

  const [gen, setGen] = useState(0);
  const [vip, setVip] = useState(0);
  const [li, setLi]   = useState(0);
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
  const [editExpId,    setEditExpId]    = useState<number | null>(null);
  const [editExpLabel, setEditExpLabel] = useState('');
  const [editExpAmount, setEditExpAmount] = useState('');

  // Info cards (name / venue / date)
  const [editInfoField, setEditInfoField] = useState<'event_name' | 'venue' | 'event_date' | null>(null);
  const [editInfoVal,   setEditInfoVal]   = useState('');

  // Actual revenue from sales sheet
  const [collectedRevenue, setCollectedRevenue] = useState(0);

  const [customZones, setCustomZones]     = useState<EventZone[]>([]);
  const [newZoneName, setNewZoneName]     = useState('');
  const [newZoneCap,  setNewZoneCap]      = useState('');
  const [newZonePrice, setNewZonePrice]   = useState('');
  const [addingZone,  setAddingZone]      = useState(false);

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
  const pers = type === 'seminar' ? gen + vip : gen + vip + li + lm * 3;
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

  const loadZones = useCallback(async () => {
    const r = await fetch(`/api/zones?eventId=${eventId}`);
    setCustomZones(await r.json());
  }, [eventId]);

  useEffect(() => { loadSnapshots(); loadExpenses(); loadZones(); }, [loadSnapshots, loadExpenses, loadZones]);

  // Reset simulator counts to 0 whenever a zone gets frozen
  useEffect(() => {
    if (frozenDefaultZones.includes('general'))     setGen(0);
    if (frozenDefaultZones.includes('vip'))         setVip(0);
    if (frozenDefaultZones.includes('lounge_ind'))  setLi(0);
    if (frozenDefaultZones.includes('lounge_mesa')) setLm(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.frozen_zones]);

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
        window.location.href = '/';
      } else {
        const r = await fetch('/api/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, status: action }) });
        if (!r.ok) { alert(tr('err_status')); return; }
        const updated = await r.json();
        setCfg(updated); setDraft(updated);
      }
    } finally { setActionLoading(false); }
  }

  async function saveInfoField() {
    if (!editInfoField) return;
    const val = editInfoVal.trim() || null;
    const r = await fetch('/api/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, [editInfoField]: val }) });
    if (!r.ok) return;
    const updated = await r.json();
    setCfg(updated); setDraft(updated);
    setEditInfoField(null);
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

  function startEditExpense(e: Expense) {
    setEditExpId(e.id);
    setEditExpLabel(e.label ?? '');
    setEditExpAmount(String(Math.round(toCurrent(e.amount))));
  }

  async function saveExpenseEdit() {
    if (editExpId === null) return;
    const rawAmount = Math.round(fromCurrent(Number(editExpAmount) || 0));
    await fetch('/api/expenses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editExpId, label: editExpLabel.trim() || null, amount: rawAmount }) });
    setEditExpId(null);
    loadExpenses();
  }

  async function addZone() {
    if (!newZoneName.trim()) return;
    setAddingZone(true);
    try {
      const priceRaw = Math.round(fromCurrent(Number(newZonePrice) || 0));
      const r = await fetch('/api/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, name: newZoneName.trim(), capacity: Number(newZoneCap) || 0, price: priceRaw }) });
      if (!r.ok) return;
      setNewZoneName(''); setNewZoneCap(''); setNewZonePrice('');
      loadZones();
    } finally { setAddingZone(false); }
  }

  async function deleteZoneRow(id: number) {
    if (!confirm(tr('confirm_delete_zone'))) return;
    await fetch('/api/zones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadZones();
  }

  const GENE_STEPS   = [40, 50, 60, 70, 80, 90, 100];
  const LOUNGE_STEPS = [0, 5, 10, 15, 20, 25];

  const expByCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat, rows: expenses.filter(e => e.category === cat),
  })).filter(g => g.rows.length > 0);

  // Also group any custom categories not in the standard list
  const customCats = Array.from(new Set(expenses.filter(e => !EXPENSE_CATEGORIES.includes(e.category as typeof EXPENSE_CATEGORIES[number])).map(e => e.category)));
  const allGroups = [
    ...expByCategory,
    ...customCats.map(cat => ({ cat, rows: expenses.filter(e => e.category === cat) })),
  ];

  const frozenDefaultZones: string[] = (() => {
    try { return JSON.parse(cfg.frozen_zones || '[]'); } catch { return []; }
  })();

  async function toggleDefaultZone(key: string) {
    const current = frozenDefaultZones;
    const next = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    const r = await fetch('/api/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, frozen_zones: JSON.stringify(next) }) });
    if (!r.ok) return;
    const updated = await r.json();
    setCfg(updated); setDraft(updated);
  }

  async function toggleCustomZone(id: number, currentFrozen: boolean) {
    await fetch('/api/zones', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, frozen: !currentFrozen }) });
    loadZones();
  }

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
                  {(type === 'seminar'
                    ? [
                        { key: 'cap_gen' as const, label: tr('cap_seminar') },
                        { key: 'cap_vip' as const, label: tr('cap_external_wrestlers') },
                      ]
                    : [
                        { key: 'cap_gen'    as const, label: tr('cap_gen') },
                        { key: 'cap_vip'    as const, label: tr('cap_vip') },
                        { key: 'cap_lounge' as const, label: tr('cap_lounge') },
                      ]
                  ).map(f => (
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

            {/* Zones — events only */}
            {type !== 'seminar' && <div style={{ marginTop: 20, borderTop: '0.5px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{tr('default_zones_title')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {([
                  { key: 'general',     label: tr('lbl_gen'),        cap: draft.cap_gen },
                  { key: 'vip',         label: tr('lbl_vip'),        cap: draft.cap_vip },
                  { key: 'lounge_ind',  label: tr('lbl_lounge_ind'), cap: draft.cap_lounge },
                  { key: 'lounge_mesa', label: tr('lbl_lounge_mesa'), cap: draft.cap_lounge },
                ] as const).map(z => {
                  const isFrozen = frozenDefaultZones.includes(z.key);
                  return (
                    <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isFrozen ? 'rgba(248,113,113,0.07)' : 'var(--bg3)', borderRadius: 8, border: `0.5px solid ${isFrozen ? 'rgba(248,113,113,0.3)' : 'var(--border2)'}`, opacity: isFrozen ? 0.75 : 1 }}>
                      <span style={{ flex: 1, ...mono, fontSize: 13, color: isFrozen ? 'var(--muted)' : 'var(--text)', fontWeight: 600, textDecoration: isFrozen ? 'line-through' : 'none' }}>{z.label}</span>
                      {isFrozen && <span style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--red)', background: 'rgba(248,113,113,0.12)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '2px 6px' }}>{tr('zone_frozen')}</span>}
                      <button onClick={() => toggleDefaultZone(z.key)}
                        style={{ padding: '4px 12px', borderRadius: 6, ...mono, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: isFrozen ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.08)',
                          border: `0.5px solid ${isFrozen ? 'var(--green)' : 'rgba(248,113,113,0.4)'}`,
                          color: isFrozen ? 'var(--green)' : 'var(--red)' }}>
                        {isFrozen ? tr('unfreeze_zone') : tr('freeze_zone')}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{tr('zones_title')}</p>
              {customZones.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--muted)', ...mono, marginBottom: 12 }}>{tr('no_custom_zones')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {customZones.map(z => (
                    <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: z.frozen ? 'rgba(248,113,113,0.07)' : 'var(--bg3)', borderRadius: 8, border: `0.5px solid ${z.frozen ? 'rgba(248,113,113,0.3)' : 'var(--border2)'}`, opacity: z.frozen ? 0.75 : 1 }}>
                      <span style={{ flex: 1, ...mono, fontSize: 13, color: z.frozen ? 'var(--muted)' : 'var(--text)', fontWeight: 600, textDecoration: z.frozen ? 'line-through' : 'none' }}>{z.name}</span>
                      <span style={{ ...mono, fontSize: 11, color: 'var(--muted)' }}>{tr('zone_capacity')}: {z.capacity}</span>
                      <span style={{ ...mono, fontSize: 11, color: 'var(--muted)' }}>{tr('zone_price')}: {money(z.price)}</span>
                      {z.frozen && <span style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--red)', background: 'rgba(248,113,113,0.12)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '2px 6px' }}>{tr('zone_frozen')}</span>}
                      <button onClick={() => toggleCustomZone(z.id, z.frozen)}
                        style={{ padding: '4px 12px', borderRadius: 6, ...mono, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: z.frozen ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.08)',
                          border: `0.5px solid ${z.frozen ? 'var(--green)' : 'rgba(248,113,113,0.4)'}`,
                          color: z.frozen ? 'var(--green)' : 'var(--red)' }}>
                        {z.frozen ? tr('unfreeze_zone') : tr('freeze_zone')}
                      </button>
                      <button onClick={() => deleteZoneRow(z.id)} style={{ background: 'transparent', color: 'var(--red)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7, cursor: 'pointer', borderRadius: 4 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8 }}>
                <input type="text" placeholder={tr('zone_name_ph')} value={newZoneName} onChange={e => setNewZoneName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addZone()} />
                <input type="number" placeholder={tr('zone_capacity')} value={newZoneCap} onChange={e => setNewZoneCap(e.target.value)} min={0} step={1} />
                <input type="number" placeholder={`${tr('zone_price')} (${sym})`} value={newZonePrice} onChange={e => setNewZonePrice(e.target.value)} min={0} step={currency === 'CRC' ? 500 : 1} />
                <button onClick={addZone} disabled={addingZone} style={{ background: 'var(--accent)', color: '#fff', opacity: addingZone ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                  {tr('add_zone')}
                </button>
              </div>
            </div>}

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

        {/* Event Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {([
            { field: 'event_name'  as const, label: tr('info_event_name'), value: cfg.event_name,  display: cfg.event_name,  type: 'text',   ph: cfg.event_name },
            { field: 'venue'       as const, label: tr('info_venue'),      value: cfg.venue ?? '',  display: cfg.venue,       type: 'text',   ph: tr('info_venue_ph') },
            { field: 'event_date'  as const, label: tr('info_date'),       value: cfg.event_date ?? '', display: cfg.event_date ? new Date(cfg.event_date + 'T00:00:00').toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : null, type: 'date', ph: tr('info_date_ph') },
          ]).map(card => (
            <div key={card.field} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{card.label}</p>
              {editInfoField === card.field ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input autoFocus type={card.type} value={editInfoVal}
                    onChange={e => setEditInfoVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveInfoField()}
                    placeholder={card.ph}
                    style={{ flex: 1, fontSize: 13, fontWeight: 600, padding: '4px 8px' }} />
                  <button onClick={saveInfoField} style={{ background: 'var(--green)', color: '#fff', padding: '3px 10px', fontSize: 11, border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}>✓</button>
                  <button onClick={() => setEditInfoField(null)} style={{ background: 'transparent', color: 'var(--muted)', padding: '3px 8px', fontSize: 11, border: '0.5px solid var(--border2)', cursor: 'pointer', borderRadius: 4 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: card.display ? 'var(--text)' : 'var(--muted)', ...mono, fontStyle: card.display ? 'normal' : 'italic' }}>
                    {card.display || (card.field === 'venue' ? tr('info_no_venue') : tr('info_no_date'))}
                  </p>
                  <button onClick={() => { setEditInfoField(card.field); setEditInfoVal(card.value); }}
                    style={{ background: 'transparent', color: 'var(--muted)', padding: '2px 7px', fontSize: 11, border: '0.5px solid var(--border2)', cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}>✎</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { label: tr('kpi_expenses'),   value: money(costNeto),         color: 'var(--accent2)' },
            { label: tr('kpi_revenue'),    value: money(rev),              color: 'var(--text)' },
            { label: tr('kpi_actual_rev'), value: money(collectedRevenue), color: collectedRevenue === 0 ? 'var(--muted)' : collectedRevenue >= costNeto ? 'var(--green)' : 'var(--red)' },
            { label: tr('kpi_pl'),         value: money(pl, true),         color: plColor },
            { label: tr('kpi_people'),     value: pers.toString(),         color: 'var(--text)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: k.color, ...mono }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Sales Sheet */}
        <SalesSheet eventId={eventId} cfg={cfg} type={type} money={money} fromCurrent={fromCurrent} toCurrent={toCurrent} sym={sym} lang={lang} customZones={customZones} onCollectedChange={setCollectedRevenue} />

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
              {type === 'seminar' ? (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, display: 'block', marginBottom: 4 }}>{tr('price_seminar_fee')} ({sym})</label>
                    <input type="number" value={draftDisplay.price_gen}
                      onChange={e => setDraft(d => ({ ...d, price_gen: Math.round(fromCurrent(+e.target.value)) }))}
                      step={currency === 'CRC' ? 500 : 1} min={0} />
                    <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, marginTop: 3 }}>{tr('max')} {draft.cap_gen} {tr('people')}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, display: 'block', marginBottom: 4 }}>{tr('price_external_fee')} ({sym})</label>
                    <input type="number" value={draftDisplay.price_vip}
                      onChange={e => setDraft(d => ({ ...d, price_vip: Math.round(fromCurrent(+e.target.value)) }))}
                      step={currency === 'CRC' ? 500 : 1} min={0} />
                    <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, marginTop: 3 }}>{tr('max')} {draft.cap_vip} {tr('lbl_external_wrestlers').toLowerCase()}</p>
                  </div>
                </>
              ) : (
                ([
                  { key: 'price_gen',         zoneKey: 'general',     label: `${tr('lbl_gen')} (${sym})`,            note: `${tr('max')} ${draft.cap_gen} ${tr('people')}` },
                  { key: 'price_vip',         zoneKey: 'vip',         label: `${tr('lbl_vip')} (${sym})`,            note: `${tr('max')} ${draft.cap_vip} ${tr('people')}` },
                  { key: 'price_lounge_ind',  zoneKey: 'lounge_ind',  label: `${tr('lbl_lounge_ind')} (${sym})`,     note: `${tr('max')} ${draft.cap_lounge} ${tr('people')}` },
                  { key: 'price_lounge_mesa', zoneKey: 'lounge_mesa', label: `${tr('lbl_lounge_mesa')} (${sym})`,    note: `≈ ${sym}${Math.round(toCurrent(draft.price_lounge_mesa) / 3).toLocaleString(locale, { maximumFractionDigits: decs })}/${tr('per_person')}` },
                ] as const).filter(f => !frozenDefaultZones.includes(f.zoneKey)).map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input type="number" value={draftDisplay[f.key]}
                      onChange={e => setDraft(d => ({ ...d, [f.key]: Math.round(fromCurrent(+e.target.value)) }))}
                      step={currency === 'CRC' ? 500 : 1} min={0} />
                    <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, marginTop: 3 }}>{f.note}</p>
                  </div>
                ))
              )}
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
              {(type === 'seminar'
                ? [
                    { zoneKey: 'general', label: tr('lbl_attendees'),          val: gen, set: setGen, max: cfg.cap_gen, bigStep: 5 },
                    { zoneKey: 'vip',     label: tr('lbl_external_wrestlers'),  val: vip, set: setVip, max: cfg.cap_vip, bigStep: 1 },
                  ]
                : ([
                    { zoneKey: 'general',     label: tr('lbl_gen'),        val: gen, set: setGen, max: cfg.cap_gen,    bigStep: 5 },
                    { zoneKey: 'vip',         label: tr('lbl_vip'),        val: vip, set: setVip, max: cfg.cap_vip,    bigStep: 5 },
                    { zoneKey: 'lounge_ind',  label: tr('lbl_lounge_ind'), val: li,  set: setLi,  max: cfg.cap_lounge, bigStep: 1 },
                    { zoneKey: 'lounge_mesa', label: tr('lounge_tables'),  val: lm,  set: setLm,  max: 8,              bigStep: 1, sub: `${lm * 3} ${tr('lounge_people')}` },
                  ] as { zoneKey: string; label: string; val: number; set: (v: number) => void; max: number; bigStep: number; sub?: string }[]).filter(s => !frozenDefaultZones.includes(s.zoneKey))
              ).map(s => (
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
                          <td style={{ padding: '4px 6px' }}>
                            {editExpId === e.id ? (
                              <input autoFocus value={editExpLabel} onChange={ev => setEditExpLabel(ev.target.value)}
                                onKeyDown={ev => ev.key === 'Enter' && saveExpenseEdit()}
                                placeholder={tr('desc_ph')} style={{ width: '100%', fontSize: 12, padding: '4px 8px' }} />
                            ) : (
                              <span style={{ display: 'block', padding: '4px 8px', color: 'var(--text)' }}>
                                {e.label || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            {editExpId === e.id ? (
                              <input type="number" value={editExpAmount} onChange={ev => setEditExpAmount(ev.target.value)}
                                onKeyDown={ev => ev.key === 'Enter' && saveExpenseEdit()}
                                min={0} step={currency === 'CRC' ? 1000 : 1} style={{ width: '100%', fontSize: 12, padding: '4px 8px', fontWeight: 500 }} />
                            ) : (
                              <span style={{ display: 'block', padding: '4px 8px', color: 'var(--text)', fontWeight: 500 }}>
                                {money(e.amount)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                            {editExpId === e.id ? (
                              <span style={{ display: 'flex', gap: 4 }}>
                                <button onClick={saveExpenseEdit} style={{ background: 'var(--green)', color: '#fff', padding: '2px 10px', fontSize: 11, border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}>✓</button>
                                <button onClick={() => setEditExpId(null)} style={{ background: 'transparent', color: 'var(--muted)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--border2)', cursor: 'pointer', borderRadius: 4 }}>✕</button>
                              </span>
                            ) : (
                              <span style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => startEditExpense(e)} style={{ background: 'transparent', color: 'var(--muted)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--border2)', cursor: 'pointer', borderRadius: 4 }}>✎</button>
                                <button onClick={() => deleteExpenseRow(e.id)} style={{ background: 'transparent', color: 'var(--red)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7, cursor: 'pointer', borderRadius: 4 }}>×</button>
                              </span>
                            )}
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

        {/* P&L Matrix / Seminar Projection */}
        {type === 'seminar' ? (() => {
          const fillSteps = [0.10, 0.25, 0.50, 0.60, 0.75, 0.90, 1.00];
          const extRevFixed = vip * cfg.price_vip;
          return (
            <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{tr('matrix_seminar_title')}</h2>
              <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginBottom: 16 }}>
                {tr('lbl_external_wrestlers')}: <strong style={{ color: 'var(--text)' }}>{vip}</strong>
                {vip > 0 && <span style={{ marginLeft: 8, color: 'var(--accent2)' }}>+{money(extRevFixed)}</span>}
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 12, width: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                      {[tr('seminar_fill_rate'), tr('lbl_attendees'), tr('col_revenue'), tr('kpi_pl')].map(h => (
                        <th key={h} style={{ padding: '6px 12px', background: 'var(--bg3)', color: 'var(--muted)', border: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fillSteps.map(pct2 => {
                      const att = Math.round(cfg.cap_gen * pct2);
                      const r2  = att * cfg.price_gen + extRevFixed;
                      const p   = r2 - costNeto;
                      const isCurrent = att === gen;
                      let bg = 'rgba(248,113,113,0.12)'; let clr = '#f87171';
                      if (p >= 0)            { bg = 'rgba(52,211,153,0.12)';  clr = '#34d399'; }
                      else if (p >= -150000) { bg = 'rgba(251,191,36,0.12)';  clr = '#fbbf24'; }
                      return (
                        <tr key={pct2} style={{ borderBottom: '0.5px solid var(--border)', background: isCurrent ? 'rgba(124,109,250,0.08)' : 'transparent', outline: isCurrent ? '1.5px solid var(--accent)' : 'none', outlineOffset: '-1px' }}>
                          <td style={{ padding: '8px 12px', border: '0.5px solid var(--border)', background: 'var(--bg3)', color: isCurrent ? 'var(--accent2)' : 'var(--muted)', textAlign: 'center', fontWeight: isCurrent ? 700 : 400 }}>{Math.round(pct2 * 100)}%</td>
                          <td style={{ padding: '8px 12px', border: '0.5px solid var(--border)', color: isCurrent ? 'var(--accent2)' : 'var(--text)', textAlign: 'center', fontWeight: isCurrent ? 700 : 400 }}>{att}</td>
                          <td style={{ padding: '8px 12px', border: '0.5px solid var(--border)', color: isCurrent ? 'var(--accent2)' : 'var(--text)', textAlign: 'center', fontWeight: isCurrent ? 700 : 400 }}>{money(r2)}</td>
                          <td style={{ padding: '8px 12px', border: '0.5px solid var(--border)', background: isCurrent ? 'rgba(124,109,250,0.2)' : bg, color: isCurrent ? 'var(--accent2)' : clr, textAlign: 'center', fontWeight: isCurrent ? 700 : 400 }}>{money(p, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })() : (() => {
          const isVIPFrozen      = frozenDefaultZones.includes('vip');
          const isGenFrozen      = frozenDefaultZones.includes('general');
          const isLoungeIndFrozen = frozenDefaultZones.includes('lounge_ind');
          const activeGeneSteps   = isGenFrozen      ? [0] : GENE_STEPS;
          const activeLoungeSteps = isLoungeIndFrozen ? [0] : LOUNGE_STEPS;
          const vipContrib = isVIPFrozen ? 0 : cfg.cap_vip * cfg.price_vip;
          const optG = isGenFrozen      ? 0 : cfg.cap_gen;
          const optL = isLoungeIndFrozen ? 0 : cfg.cap_lounge;
          const rowLabel = `${isGenFrozen ? '0' : 'G'} \\ ${isLoungeIndFrozen ? '0' : 'L'}`;
          return (
            <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{tr('matrix_title')}</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                {!isVIPFrozen && (
                  <p style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>{tr('vip_fixed')} {cfg.cap_vip}</p>
                )}
                {isVIPFrozen && (
                  <span style={{ fontSize: 10, ...mono, color: 'var(--red)', background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '2px 8px' }}>
                    VIP {tr('matrix_frozen_note')}
                  </span>
                )}
                {isGenFrozen && (
                  <span style={{ fontSize: 10, ...mono, color: 'var(--red)', background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '2px 8px' }}>
                    {tr('lbl_gen')} {tr('matrix_frozen_note')}
                  </span>
                )}
                {isLoungeIndFrozen && (
                  <span style={{ fontSize: 10, ...mono, color: 'var(--red)', background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '2px 8px' }}>
                    {tr('lbl_lounge_ind')} {tr('matrix_frozen_note')}
                  </span>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 11, width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 12px', background: 'var(--bg3)', color: 'var(--muted)', border: '0.5px solid var(--border)', textAlign: 'center' }}>{rowLabel}</th>
                      {activeLoungeSteps.map(l => (
                        <th key={l} style={{ padding: '6px 12px', background: 'var(--bg3)', color: 'var(--muted)', border: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 400 }}>{l} L</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeGeneSteps.map(g => (
                      <tr key={g}>
                        <td style={{ padding: '6px 12px', background: 'var(--bg3)', color: 'var(--muted)', border: '0.5px solid var(--border)', textAlign: 'center', fontWeight: 500 }}>{g} G</td>
                        {activeLoungeSteps.map(l => {
                          const r2 = g * cfg.price_gen + vipContrib + l * cfg.price_lounge_ind;
                          const p  = r2 - costNeto;
                          const isOpt = g === optG && l === optL;
                          let bg = 'rgba(248,113,113,0.12)'; let clr = '#f87171';
                          if (p >= 0)            { bg = 'rgba(52,211,153,0.12)';  clr = '#34d399'; }
                          else if (p >= -150000) { bg = 'rgba(251,191,36,0.12)';  clr = '#fbbf24'; }
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
          );
        })()}

      </div>
    </div>
  );
}
