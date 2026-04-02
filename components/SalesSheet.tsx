'use client';

import { useState, useCallback, useEffect } from 'react';
import type { EventConfig, EventType, TicketSale, EventZone } from '@/lib/db';
import { type Lang, makeTr } from '@/lib/i18n';
import { useIsMobile } from '@/lib/useIsMobile';

interface Props {
  eventId: number;
  cfg: EventConfig;
  type: EventType;
  money: (crc: number, signed?: boolean) => string;
  fromCurrent: (val: number) => number;
  lang: Lang;
  toCurrent: (crc: number) => number;
  sym: string;
  customZones: EventZone[];
  onCollectedChange?: (amount: number) => void;
}

const ZONES = [
  { key: 'general',     zoneKey: 'zone_general'     as const, priceKey: 'price_gen'         as const },
  { key: 'vip',         zoneKey: 'zone_vip'         as const, priceKey: 'price_vip'         as const },
  { key: 'lounge_ind',  zoneKey: 'zone_lounge_ind'  as const, priceKey: 'price_lounge_ind'  as const },
  { key: 'lounge_mesa', zoneKey: 'zone_lounge_mesa' as const, priceKey: 'price_lounge_mesa' as const },
];

const PAYMENT_KEYS = [
  { key: 'sinpe',     payKey: 'pay_sinpe'   as const, free: false },
  { key: 'efectivo',  payKey: 'pay_cash'    as const, free: false },
  { key: 'por_pagar', payKey: 'pay_pending' as const, free: true  },
  { key: 'special',   payKey: 'pay_special' as const, free: true  },
];

const PAYMENT_COLORS: Record<string, string> = {
  sinpe:     '#34d399',
  efectivo:  '#60a5fa',
  por_pagar: '#fbbf24',
  special:   '#c084fc',
};


export default function SalesSheet({ eventId, cfg, type, money, fromCurrent, toCurrent, sym, lang, customZones, onCollectedChange }: Props) {
  const tr = makeTr(lang);

  const frozenDefaultKeys: string[] = (() => {
    try { return JSON.parse((cfg as any).frozen_zones || '[]'); } catch { return []; }
  })();

  const allZones = type === 'seminar'
    ? [
        { value: 'general', label: tr('lbl_attendees'),         price: cfg.price_gen, isCustom: false },
        { value: 'vip',     label: tr('lbl_external_wrestlers'), price: cfg.price_vip, isCustom: false },
      ]
    : [
        ...ZONES
          .filter(z => !frozenDefaultKeys.includes(z.key))
          .map(z => ({ value: z.key, label: tr(z.zoneKey), price: cfg[z.priceKey] as number, isCustom: false })),
        ...customZones
          .filter(z => !z.frozen)
          .map(z => ({ value: `cz_${z.id}`, label: z.name, price: z.price, isCustom: true })),
      ];
  const [sales, setSales]     = useState<TicketSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]   = useState(false);

  // Form state
  const [buyerName,      setBuyerName]      = useState('');
  const [qty,            setQty]            = useState(1);
  const [zone,           setZone]           = useState('general');
  const [paymentMethod,  setPaymentMethod]  = useState('sinpe');
  const [customPrice,    setCustomPrice]    = useState('');
  const [notes,          setNotes]          = useState('');

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/sales?eventId=${eventId}`);
      setSales(await r.json());
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { loadSales(); }, [loadSales]);

  // Derived pricing
  const selectedZoneData = allZones.find(z => z.value === zone) ?? allZones[0];
  const selectedPayment  = PAYMENT_KEYS.find(p => p.key === paymentMethod)!;
  const isFree           = selectedPayment.free;

  const baseUnitPriceCRC = isFree ? 0 : selectedZoneData.price;
  const unitPriceDisplay = customPrice !== '' && !isFree
    ? Number(customPrice)
    : Math.round(toCurrent(baseUnitPriceCRC));
  const totalDisplay = unitPriceDisplay * qty;

  function openModal() {
    setBuyerName(''); setQty(1);
    setZone(allZones[0]?.value ?? 'general'); setPaymentMethod('sinpe');
    setCustomPrice(''); setNotes('');
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); }

  async function confirmSale() {
    if (!buyerName.trim()) { alert(tr('err_buyer')); return; }
    setSaving(true);
    try {
      const unitCRC  = isFree ? 0 : fromCurrent(unitPriceDisplay);
      const totalCRC = unitCRC * qty;
      const r = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id:       eventId,
          buyer_name:     buyerName.trim(),
          zone: zone.startsWith('cz_') ? (customZones.find(z => `cz_${z.id}` === zone)?.name ?? zone) : zone,
          ticket_type:    qty > 1 ? 'group' : 'individual',
          group_size:     qty,
          payment_method: paymentMethod,
          unit_price:     unitCRC,
          total_amount:   totalCRC,
          notes:          notes.trim() || null,
        }),
      });
      if (!r.ok) { alert(tr('err_sale')); return; }
      closeModal();
      loadSales();
    } finally { setSaving(false); }
  }

  async function deleteSaleRow(id: number) {
    if (!confirm(tr('confirm_delete_sale'))) return;
    await fetch('/api/sales', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadSales();
  }

  // Totals
  const totalCollected = sales.filter(s => s.payment_method !== 'por_pagar').reduce((a, s) => a + s.total_amount, 0);
  const totalPending   = sales.filter(s => s.payment_method === 'por_pagar').reduce((a, s) => a + s.total_amount, 0);
  const totalTickets   = sales.reduce((a, s) => a + s.group_size, 0);

  useEffect(() => { onCollectedChange?.(totalCollected); }, [totalCollected, onCollectedChange]);

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };
  const isMobile = useIsMobile();
  const zoneLabel = (k: string) => { const z = ZONES.find(z => z.key === k); return z ? tr(z.zoneKey) : k; };
  const payLabel  = (k: string) => { const p = PAYMENT_KEYS.find(p => p.key === k); return p ? tr(p.payKey) : k; };

  return (
    <>
      <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {tr('sales_title')} {loading && <span>…</span>}
            </h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, ...mono, color: 'var(--green)' }}>{tr('collected')}: {money(totalCollected)}</span>
              {totalPending > 0 && <span style={{ fontSize: 12, ...mono, color: '#fbbf24' }}>{tr('pending_label')}: {money(totalPending)}</span>}
              <span style={{ fontSize: 12, ...mono, color: 'var(--muted)' }}>{totalTickets} {totalTickets !== 1 ? tr('tickets_plural') : tr('tickets_label')}</span>
            </div>
          </div>
          <button
            onClick={openModal}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', ...mono, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : undefined }}
          >
            {tr('new_sale')}
          </button>
        </div>

        {/* Quick-add row (inline) */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1.5fr 1.5fr auto', gap: 8, marginBottom: 16, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, border: '0.5px solid var(--border2)' }}>
          <input
            type="text"
            placeholder={tr('name_ph')}
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && openModal()}
            style={{ ...mono, gridColumn: isMobile ? '1 / -1' : undefined }}
          />
          <select
            value={zone}
            onChange={e => setZone(e.target.value)}
            style={{ background: 'var(--bg)', border: '0.5px solid var(--border2)', color: 'var(--text)', ...mono, fontSize: 13, borderRadius: 6, padding: '8px 12px' }}
          >
            {allZones.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
          </select>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            style={{ background: 'var(--bg)', border: '0.5px solid var(--border2)', color: PAYMENT_COLORS[paymentMethod] ?? 'var(--text)', ...mono, fontSize: 13, borderRadius: 6, padding: '8px 12px' }}
          >
            {PAYMENT_KEYS.map(p => <option key={p.key} value={p.key}>{tr(p.payKey)}</option>)}
          </select>
          <button
            onClick={() => {
              if (buyerName.trim()) {
                setQty(1);
                setCustomPrice('');
                setNotes('');
                setShowModal(true);
              } else {
                openModal();
              }
            }}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: isMobile ? '10px 0' : '0 16px', ...mono, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', gridColumn: isMobile ? '1 / -1' : undefined }}
          >
            {tr('register_btn')}
          </button>
        </div>

        {/* Sales table */}
        {sales.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', ...mono }}>{tr('no_sales')} <strong>{tr('new_sale')}</strong> {tr('no_sales2')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', ...mono, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                  {['#', tr('col_name'), tr('col_zone'), tr('col_type'), tr('col_qty'), tr('col_method'), tr('col_sale_amount'), tr('col_notes'), tr('col_date'), ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--muted)', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)', fontSize: 10 }}>{sales.length - idx}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text)', fontWeight: 500 }}>{s.buyer_name}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{zoneLabel(s.zone)}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)', textTransform: 'capitalize' }}>{s.ticket_type === 'group' ? (lang === 'es' ? 'Grupo' : 'Group') : (lang === 'es' ? 'Individual' : 'Individual')}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)', textAlign: 'center' }}>{s.group_size}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${PAYMENT_COLORS[s.payment_method]}22`, color: PAYMENT_COLORS[s.payment_method] ?? 'var(--text)', border: `0.5px solid ${PAYMENT_COLORS[s.payment_method] ?? 'var(--border2)'}` }}>
                        {payLabel(s.payment_method)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: s.total_amount === 0 ? 'var(--muted)' : 'var(--text)', fontWeight: 500 }}>
                      {s.total_amount === 0 ? '—' : money(s.total_amount)}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)', fontSize: 11, fontStyle: s.notes ? 'normal' : 'italic', maxWidth: 160, whiteSpace: 'normal' }}>{s.notes || '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)', fontSize: 10 }}>{new Date(s.created_at).toLocaleDateString('es-CR')}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        onClick={() => deleteSaleRow(s.id)}
                        style={{ background: 'transparent', color: 'var(--red)', padding: '2px 8px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7, cursor: 'pointer', borderRadius: 4 }}
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '0.5px solid var(--border2)' }}>
                  <td colSpan={6} style={{ padding: '10px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', fontWeight: 600 }}>{tr('total_collected')}</td>
                  <td style={{ padding: '10px 10px', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{money(totalCollected)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ─── PREBUY MODAL ─── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: isMobile ? '16px 16px 0 0' : 16, width: '100%', maxWidth: isMobile ? '100%' : 480, padding: isMobile ? '24px 20px' : 28, boxShadow: '0 24px 80px rgba(0,0,0,0.5)', maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', ...mono, letterSpacing: '-0.3px' }}>{tr('modal_title')}</h3>
                <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginTop: 2 }}>{tr('modal_sub')}</p>
              </div>
              <button onClick={closeModal} style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: 18 }}>

              {/* Buyer Name */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{tr('buyer_name')}</label>
                <input
                  type="text"
                  placeholder={tr('name_ph')}
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  autoFocus
                  style={{ width: '100%', ...mono }}
                />
              </div>

              {/* Quantity */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                  {tr('ticket_qty_label')}
                </label>
                {/* Quick preset buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setQty(n)}
                      style={{
                        padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                        background: qty === n ? 'var(--accent)' : 'var(--bg3)',
                        color: qty === n ? '#fff' : 'var(--muted)',
                        border: qty === n ? '1px solid var(--accent)' : '0.5px solid var(--border2)',
                        ...mono, fontSize: 15, fontWeight: 700,
                      }}
                    >{n}</button>
                  ))}
                </div>
                {/* Stepper for fine-tuning */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
                  >−</button>
                  <input
                    type="number"
                    value={qty}
                    min={1}
                    max={50}
                    onChange={e => setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 800, ...mono, padding: '8px 0' }}
                  />
                  <button
                    onClick={() => setQty(q => Math.min(50, q + 1))}
                    style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
                  >+</button>
                </div>
                {qty > 1 && (
                  <p style={{ fontSize: 10, color: 'var(--muted)', ...mono, marginTop: 6 }}>
                    {qty} {tr('group_note')}
                  </p>
                )}
              </div>

              {/* Zone */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{tr('zone_label')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {allZones.map(z => (
                    <button
                      key={z.value}
                      onClick={() => setZone(z.value)}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                        background: zone === z.value ? 'rgba(124,109,250,0.15)' : 'var(--bg3)',
                        color: zone === z.value ? 'var(--accent2)' : 'var(--muted)',
                        border: zone === z.value ? '1px solid var(--accent2)' : '0.5px solid var(--border2)',
                        ...mono, fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{z.label}</div>
                      <div style={{ fontSize: 10, marginTop: 2, color: zone === z.value ? 'var(--accent2)' : 'var(--muted)', opacity: 0.8 }}>
                        {money(z.price)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{tr('method_label')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {PAYMENT_KEYS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => { setPaymentMethod(p.key); setCustomPrice(''); }}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                        background: paymentMethod === p.key ? `${PAYMENT_COLORS[p.key]}18` : 'var(--bg3)',
                        color: paymentMethod === p.key ? PAYMENT_COLORS[p.key] : 'var(--muted)',
                        border: paymentMethod === p.key ? `1px solid ${PAYMENT_COLORS[p.key]}` : '0.5px solid var(--border2)',
                        ...mono, fontSize: 12, fontWeight: paymentMethod === p.key ? 600 : 400,
                      }}
                    >
                      {tr(p.payKey)}
                      {p.free && <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{tr('free_note')}</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price override (only for non-free payments) */}
              {!isFree && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    {tr('unit_price_label')} ({sym}) — {tr('editable')}
                  </label>
                  <input
                    type="number"
                    placeholder={`${unitPriceDisplay}`}
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    min={0}
                    style={{ width: '100%', ...mono, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{tr('notes_label')}</label>
                <input type="text" placeholder={tr('notes_ph')} value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', ...mono }} />
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', border: '0.5px solid var(--border2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>{tr('col_zone2')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', ...mono, fontWeight: 500 }}>{selectedZoneData.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>{tr('col_qty2')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', ...mono, fontWeight: 500 }}>{qty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>{tr('col_unit')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', ...mono, fontWeight: 500 }}>{isFree ? '—' : `${sym}${unitPriceDisplay.toLocaleString()}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid var(--border2)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', ...mono, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr('total_label')}</span>
                  <span style={{ fontSize: 20, color: isFree ? 'var(--muted)' : 'var(--green)', ...mono, fontWeight: 700 }}>
                    {isFree ? sym + '0' : `${sym}${totalDisplay.toLocaleString()}`}
                  </span>
                </div>
                {selectedPayment.key === 'por_pagar' && (
                  <p style={{ fontSize: 10, color: '#fbbf24', ...mono, marginTop: 6 }}>{tr('pending_note')}</p>
                )}
                {selectedPayment.key === 'special' && (
                  <p style={{ fontSize: 10, color: '#c084fc', ...mono, marginTop: 6 }}>{tr('special_note')}</p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={closeModal} style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--muted)', ...mono, fontSize: 13, cursor: 'pointer' }}>
                  {tr('cancel')}
                </button>
                <button
                  onClick={confirmSale}
                  disabled={saving || !buyerName.trim()}
                  style={{ flex: 2, padding: '12px 0', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', ...mono, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (saving || !buyerName.trim()) ? 0.5 : 1 }}
                >
                  {saving ? tr('saving_sale') : tr('confirm_sale')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
