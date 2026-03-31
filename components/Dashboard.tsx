'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { EventConfig, EventType, SalesSnapshot, Expense } from '@/lib/db';

interface Props {
  initialConfig: EventConfig;
  type: EventType;
}

const EXPENSE_CATEGORIES = ['Luces y Sonido', 'Alquiler', 'Transporte', 'Luchador', 'Vuelo', 'Grabacion', 'Sillas', 'Estadia'];

function calcRev(gen: number, vip: number, li: number, mesas: number, p: EventConfig) {
  return gen * p.price_gen + vip * p.price_vip + li * p.price_lounge_ind + mesas * p.price_lounge_mesa;
}

export default function Dashboard({ initialConfig, type }: Props) {
  const [cfg, setCfg] = useState<EventConfig>(initialConfig);
  const [draft, setDraft] = useState<EventConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [gen, setGen] = useState(initialConfig.cap_gen);
  const [vip, setVip] = useState(initialConfig.cap_vip);
  const [li, setLi]   = useState(initialConfig.cap_lounge);
  const [lm, setLm]   = useState(0);

  const [snapshots, setSnapshots] = useState<SalesSnapshot[]>([]);
  const [snapLabel, setSnapLabel] = useState('');
  const [loadingSnaps, setLoadingSnaps] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [newExpCat, setNewExpCat] = useState(EXPENSE_CATEGORIES[0]);
  const [newExpCustomCat, setNewExpCustomCat] = useState('');
  const [newExpLabel, setNewExpLabel] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [addingExp, setAddingExp] = useState(false);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [exchangeRate, setExchangeRate] = useState(540);

  // Persist currency preference in localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wem-currency-${initialConfig.id}`);
    const rate  = localStorage.getItem(`wem-rate-${initialConfig.id}`);
    if (saved === 'USD') setCurrency('USD');
    if (rate) setExchangeRate(Number(rate));
  }, [initialConfig.id]);

  function handleCurrencyChange(c: 'CRC' | 'USD') {
    setCurrency(c);
    localStorage.setItem(`wem-currency-${initialConfig.id}`, c);
  }
  function handleRateChange(r: number) {
    setExchangeRate(r);
    localStorage.setItem(`wem-rate-${initialConfig.id}`, String(r));
  }

  // Currency helpers
  const sym = currency === 'USD' ? '$' : '₡';
  const locale = currency === 'USD' ? 'en-US' : 'es-CR';
  const decimals = currency === 'USD' ? 2 : 0;

  function toCurrent(crc: number) {
    return currency === 'USD' ? crc / exchangeRate : crc;
  }
  function fromCurrent(val: number) {
    return currency === 'USD' ? val * exchangeRate : val;
  }
  function money(crc: number, signed = false) {
    const val = toCurrent(crc);
    const s = signed && crc >= 0 ? '+' : '';
    const formatted = Math.abs(val).toLocaleString(locale, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
    return `${s}${sym}${formatted}`;
  }

  const eventId  = initialConfig.id;
  const costNeto = expenses.reduce((s, e) => s + e.amount, 0);

  const rev  = calcRev(gen, vip, li, lm, cfg);
  const pl   = rev - costNeto;
  const pers = gen + vip + li + lm * 3;
  const pct  = costNeto > 0 ? Math.min((rev / costNeto) * 100, 100) : 0;

  const plColor  = pl > 5000 ? 'var(--green)' : pl >= -20000 ? 'var(--amber)' : 'var(--red)';
  const barColor = pl > 5000 ? '#34d399' : pl >= -20000 ? '#fbbf24' : '#f87171';
  const typeLabel = type === 'seminar' ? 'seminario' : 'evento';

  const loadSnapshots = useCallback(async () => {
    setLoadingSnaps(true);
    try {
      const r = await fetch(`/api/events?eventId=${eventId}`);
      setSnapshots(await r.json());
    } finally { setLoadingSnaps(false); }
  }, [eventId]);

  const loadExpenses = useCallback(async () => {
    setLoadingExp(true);
    try {
      const r = await fetch(`/api/expenses?eventId=${eventId}`);
      setExpenses(await r.json());
    } finally { setLoadingExp(false); }
  }, [eventId]);

  useEffect(() => { loadSnapshots(); loadExpenses(); }, [loadSnapshots, loadExpenses]);

  async function saveConfig() {
    setSaving(true);
    try {
      // Convert price inputs back to CRC before saving
      const payload = { ...draft };
      if (currency === 'USD') {
        payload.price_gen          = fromCurrent(draft.price_gen);
        payload.price_vip          = fromCurrent(draft.price_vip);
        payload.price_lounge_ind   = fromCurrent(draft.price_lounge_ind);
        payload.price_lounge_mesa  = fromCurrent(draft.price_lounge_mesa);
      }
      const r = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...payload }),
      });
      if (!r.ok) { alert('Error al guardar. Verificá la conexión a la base de datos.'); return; }
      setCfg(await r.json());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  async function saveSnap() {
    if (!snapLabel.trim()) return;
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, label: snapLabel, qty_gen: gen, qty_vip: vip, qty_lounge_ind: li, qty_lounge_mesa: lm, ingreso: rev, pl }),
    });
    setSnapLabel('');
    loadSnapshots();
  }

  async function deleteSnap(id: number) {
    await fetch('/api/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadSnapshots();
  }

  async function addExpense() {
    const amount = parseInt(newExpAmount);
    const effectiveCat = newExpCat === 'Nuevo' ? newExpCustomCat.trim() : newExpCat;
    if (!effectiveCat || !amount || amount <= 0) return;
    setAddingExp(true);
    try {
      const rawAmount = currency === 'USD' ? Math.round(amount * exchangeRate) : amount;
      const r = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, category: effectiveCat, label: newExpLabel.trim() || null, amount: rawAmount }),
      });
      if (!r.ok) { alert('Error al agregar gasto.'); return; }
      setNewExpLabel('');
      setNewExpAmount('');
      setNewExpCustomCat('');
      loadExpenses();
    } finally { setAddingExp(false); }
  }

  async function deleteExpenseRow(id: number) {
    await fetch('/api/expenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadExpenses();
  }

  const GENE_STEPS   = [40,50,60,70,80,90,100];
  const LOUNGE_STEPS = [0,5,10,15,20,25];

  const expByCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    rows: expenses.filter(e => e.category === cat),
  })).filter(g => g.rows.length > 0);

  // Price draft values in current currency (for display in inputs)
  const draftInCurrency = {
    price_gen:         Math.round(toCurrent(draft.price_gen)),
    price_vip:         Math.round(toCurrent(draft.price_vip)),
    price_lounge_ind:  Math.round(toCurrent(draft.price_lounge_ind)),
    price_lounge_mesa: Math.round(toCurrent(draft.price_lounge_mesa)),
  };

  const btnBase: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--bg3)', border: '0.5px solid var(--border2)',
    color: 'var(--text)', fontSize: 18, fontWeight: 300,
    cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '0.5px solid var(--border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>WEM</h1>
            <Link href="/" style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>← inicio</Link>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{cfg.event_name} · {typeLabel}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              background: showSettings ? 'var(--accent)' : 'var(--bg2)',
              border: '0.5px solid var(--border2)',
              color: showSettings ? '#fff' : 'var(--muted)',
              borderRadius: 8, padding: '6px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ⚙ Ajustes
          </button>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'grid', gap: 24 }}>

        {/* Settings Panel */}
        {showSettings && (
          <section style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
              ⚙ Ajustes del evento
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

              {/* Capacity */}
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Aforo disponible por zona</p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {([
                    { key: 'cap_gen',    label: 'General — máx. entradas' },
                    { key: 'cap_vip',    label: 'VIP — máx. entradas' },
                    { key: 'cap_lounge', label: 'Lounge individual — máx. entradas' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button style={btnBase} onClick={() => setDraft(d => ({ ...d, [f.key]: Math.max(0, d[f.key] - 1) }))}>−</button>
                        <input
                          type="number"
                          value={draft[f.key]}
                          min={0}
                          step={1}
                          onChange={e => setDraft(d => ({ ...d, [f.key]: +e.target.value }))}
                          style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                        />
                        <button style={btnBase} onClick={() => setDraft(d => ({ ...d, [f.key]: d[f.key] + 1 }))}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Moneda de trabajo</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['CRC', 'USD'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => handleCurrencyChange(c)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8,
                        background: currency === c ? 'var(--accent)' : 'var(--bg3)',
                        color: currency === c ? '#fff' : 'var(--muted)',
                        border: currency === c ? '1px solid var(--accent)' : '0.5px solid var(--border2)',
                        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {c === 'CRC' ? '₡ Colones' : '$ Dólares'}
                    </button>
                  ))}
                </div>
                {currency === 'USD' && (
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>Tipo de cambio (₡ por $1 USD)</label>
                    <input
                      type="number"
                      value={exchangeRate}
                      min={1}
                      step={1}
                      onChange={e => handleRateChange(+e.target.value)}
                      style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                    />
                    <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
                      Todos los montos se muestran en dólares. Los datos se guardan en colones.
                    </p>
                  </div>
                )}
                {currency === 'CRC' && (
                  <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                    Todos los montos se muestran en colones costarricenses (₡). Cambiá a dólares para ver una conversión automática.
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20, borderTop: '0.5px solid var(--border)', paddingTop: 16 }}>
              <button
                onClick={saveConfig}
                disabled={saving}
                style={{ background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1, padding: '10px 24px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer', border: 'none' }}
              >
                {saving ? 'Guardando…' : saved ? '✓ Cambios guardados' : 'Guardar ajustes'}
              </button>
            </div>
          </section>
        )}

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Gastos',               value: money(costNeto),      color: 'var(--accent2)' },
            { label: 'Ingresos proyectados', value: money(rev),           color: 'var(--text)' },
            { label: 'P&L',                  value: money(pl, true),      color: plColor },
            { label: 'Personas',             value: pers.toString(),      color: 'var(--text)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct.toFixed(1)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.3s ease, background 0.3s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
            {pct.toFixed(1)}% del costo cubierto — costo neto {money(costNeto)}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Precios editables */}
          <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Configuración de precios
              <span style={{ marginLeft: 8, padding: '2px 6px', background: 'var(--bg3)', borderRadius: 4, fontSize: 9, color: 'var(--muted)', border: '0.5px solid var(--border2)' }}>
                {currency === 'USD' ? '$ USD' : '₡ CRC'}
              </span>
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {([
                { key: 'price_gen',         label: `General (${sym})`,               note: `Máx ${draft.cap_gen} personas` },
                { key: 'price_vip',         label: `VIP (${sym})`,                   note: `Máx ${draft.cap_vip} personas` },
                { key: 'price_lounge_ind',  label: `Lounge individual (${sym})`,     note: `Máx ${draft.cap_lounge} personas` },
                { key: 'price_lounge_mesa', label: `Mesa Lounge / 3 pers (${sym})`,  note: `≈ ${sym}${Math.round(toCurrent(draft.price_lounge_mesa)/3).toLocaleString(locale, { maximumFractionDigits: decimals })}/persona` },
              ] as const).map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    type="number"
                    value={draftInCurrency[f.key]}
                    onChange={e => setDraft(d => ({ ...d, [f.key]: currency === 'USD' ? Math.round(+e.target.value * exchangeRate) : +e.target.value }))}
                    step={currency === 'USD' ? 1 : 500}
                    min={0}
                  />
                  <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{f.note}</p>
                </div>
              ))}
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              style={{ marginTop: 16, width: '100%', background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar en base de datos'}
            </button>
          </section>

          {/* Simulador */}
          <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Simulador de ventas</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {([
                { label: 'General',          val: gen, set: setGen, max: cfg.cap_gen,    step: 1, bigStep: 5 },
                { label: 'VIP',              val: vip, set: setVip, max: cfg.cap_vip,    step: 1, bigStep: 5 },
                { label: 'Lounge individual',val: li,  set: setLi,  max: cfg.cap_lounge, step: 1, bigStep: 1 },
                { label: 'Mesas Lounge',     val: lm,  set: setLm,  max: 8,              step: 1, bigStep: 1, sub: `${lm * 3} personas` },
              ]).map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{s.sub ?? `${s.val} / ${s.max}`}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => s.set(Math.max(0, s.val - s.bigStep))} style={btnBase}>−</button>
                    <div
                      style={{ flex: 1, position: 'relative', height: 36, background: 'var(--bg3)', borderRadius: 8, border: '0.5px solid var(--border2)', overflow: 'hidden', cursor: 'pointer' }}
                      onClick={e => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        s.set(Math.round((e.clientX - rect.left) / rect.width * s.max));
                      }}
                    >
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${s.max > 0 ? (s.val / s.max) * 100 : 0}%`, background: 'var(--accent)', opacity: 0.25, transition: 'width 0.15s ease' }} />
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{s.val}</span>
                    </div>
                    <button onClick={() => s.set(Math.min(s.max, s.val + s.bigStep))} style={btnBase}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, borderTop: '0.5px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Guardar escenario de prueba</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Nombre del escenario…" value={snapLabel} onChange={e => setSnapLabel(e.target.value)} style={{ flex: 1 }} />
                <button onClick={saveSnap} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '0.5px solid var(--border2)', whiteSpace: 'nowrap' }}>Guardar</button>
              </div>
            </div>
          </section>
        </div>

        {/* Gastos */}
        <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Gastos {loadingExp && <span>…</span>}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: newExpCat === 'Nuevo' ? '1fr 1fr 1fr 1fr auto' : '1fr 2fr 1fr auto', gap: 8, marginBottom: 16 }}>
            <select
              value={newExpCat}
              onChange={e => { setNewExpCat(e.target.value); setNewExpCustomCat(''); }}
              style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, borderRadius: 6, padding: '8px 12px' }}
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Nuevo">+ Nuevo…</option>
            </select>
            {newExpCat === 'Nuevo' && (
              <input
                type="text"
                placeholder="Nombre de categoría…"
                value={newExpCustomCat}
                onChange={e => setNewExpCustomCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExpense()}
                autoFocus
              />
            )}
            <input
              type="text"
              placeholder="Descripción (opcional)…"
              value={newExpLabel}
              onChange={e => setNewExpLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExpense()}
            />
            <input
              type="number"
              placeholder={`Monto (${sym})`}
              value={newExpAmount}
              onChange={e => setNewExpAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExpense()}
              min={0}
              step={currency === 'USD' ? 1 : 1000}
            />
            <button onClick={addExpense} disabled={addingExp} style={{ background: 'var(--accent)', color: '#fff', opacity: addingExp ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              + Agregar
            </button>
          </div>

          {expenses.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>No hay gastos registrados aún.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                    {['Categoría', 'Descripción', `Monto (${sym})`, ''].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expByCategory.map(({ cat, rows }) => (
                    <>
                      {rows.map((e, i) => (
                        <tr key={e.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>{i === 0 ? cat : ''}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{e.label || '—'}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text)', fontWeight: 500 }}>{money(e.amount)}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <button onClick={() => deleteExpenseRow(e.id)} style={{ background: 'transparent', color: 'var(--red)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7 }}>×</button>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                        <td colSpan={2} style={{ padding: '4px 10px', color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subtotal {cat}</td>
                        <td style={{ padding: '4px 10px', color: 'var(--muted)', fontSize: 11 }}>{money(rows.reduce((s, r) => s + r.amount, 0))}</td>
                        <td />
                      </tr>
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent2)', fontWeight: 600 }}>Costo Neto Total</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent2)' }}>{money(costNeto)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Escenarios guardados */}
        <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Escenarios guardados {loadingSnaps && <span style={{ color: 'var(--muted)' }}>…</span>}
          </h2>
          {snapshots.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>No hay escenarios guardados aún.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                    {['Escenario','General','VIP','Lounge ind.','Mesas','Ingreso','P&L','Fecha',''].map(h => (
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
                      <td style={{ padding: '8px 10px', color: 'var(--muted)', fontSize: 10 }}>{new Date(s.created_at).toLocaleDateString('es-CR')}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => deleteSnap(s.id)} style={{ background: 'transparent', color: 'var(--red)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Matriz P&L */}
        <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Matriz P&L — General × Lounge individual
          </h2>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>VIP fijo en {cfg.cap_vip}</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11, width: '100%' }}>
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
                      const r = g * cfg.price_gen + cfg.cap_vip * cfg.price_vip + l * cfg.price_lounge_ind;
                      const p = r - costNeto;
                      const isOpt = g === cfg.cap_gen && l === cfg.cap_lounge;
                      let bg = 'rgba(248,113,113,0.12)'; let clr = '#f87171';
                      if (p >= 0) { bg = 'rgba(52,211,153,0.12)'; clr = '#34d399'; }
                      else if (p >= -150000) { bg = 'rgba(251,191,36,0.12)'; clr = '#fbbf24'; }
                      return (
                        <td key={l} style={{
                          padding: '6px 12px', border: '0.5px solid var(--border)',
                          background: isOpt ? 'rgba(124,109,250,0.2)' : bg,
                          color: isOpt ? 'var(--accent2)' : clr,
                          textAlign: 'center', fontWeight: isOpt ? 600 : 400,
                          outline: isOpt ? '1.5px solid var(--accent)' : 'none',
                          outlineOffset: '-1px',
                        }}>
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
