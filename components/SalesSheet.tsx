'use client';

import { useState, useCallback, useEffect } from 'react';
import type { EventConfig, TicketSale } from '@/lib/db';

interface Props {
  eventId: number;
  cfg: EventConfig;
  money: (crc: number, signed?: boolean) => string;
  fromCurrent: (val: number) => number;
  toCurrent: (crc: number) => number;
  sym: string;
}

const ZONES = [
  { key: 'general',    label: 'General',           priceKey: 'price_gen' as const },
  { key: 'vip',        label: 'VIP',               priceKey: 'price_vip' as const },
  { key: 'lounge_ind', label: 'Lounge Individual', priceKey: 'price_lounge_ind' as const },
  { key: 'lounge_mesa',label: 'Mesa Lounge',       priceKey: 'price_lounge_mesa' as const },
];

const PAYMENT_METHODS = [
  { key: 'sinpe',     label: 'Sinpe Móvil',  free: false },
  { key: 'efectivo',  label: 'Efectivo',     free: false },
  { key: 'por_pagar', label: 'Por Pagar',    free: true  },
  { key: 'special',   label: 'SpecialTicket',free: true  },
];

const PAYMENT_COLORS: Record<string, string> = {
  sinpe:     '#34d399',
  efectivo:  '#60a5fa',
  por_pagar: '#fbbf24',
  special:   '#c084fc',
};

const PAYMENT_LABELS: Record<string, string> = {
  sinpe: 'Sinpe', efectivo: 'Efectivo', por_pagar: 'Por Pagar', special: 'Special',
};


export default function SalesSheet({ eventId, cfg, money, fromCurrent, toCurrent, sym }: Props) {
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
  const selectedZone    = ZONES.find(z => z.key === zone)!;
  const selectedPayment = PAYMENT_METHODS.find(p => p.key === paymentMethod)!;
  const isFree          = selectedPayment.free;

  const baseUnitPriceCRC = isFree ? 0 : cfg[selectedZone.priceKey];
  const unitPriceDisplay = customPrice !== '' && !isFree
    ? Number(customPrice)
    : Math.round(toCurrent(baseUnitPriceCRC));
  const totalDisplay = unitPriceDisplay * qty;

  function openModal() {
    setBuyerName(''); setQty(1);
    setZone('general'); setPaymentMethod('sinpe');
    setCustomPrice(''); setNotes('');
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); }

  async function confirmSale() {
    if (!buyerName.trim()) { alert('Ingresá el nombre del comprador.'); return; }
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
          zone,
          ticket_type:    qty > 1 ? 'group' : 'individual',
          group_size:     qty,
          payment_method: paymentMethod,
          unit_price:     unitCRC,
          total_amount:   totalCRC,
          notes:          notes.trim() || null,
        }),
      });
      if (!r.ok) { alert('Error al guardar la venta.'); return; }
      closeModal();
      loadSales();
    } finally { setSaving(false); }
  }

  async function deleteSaleRow(id: number) {
    if (!confirm('¿Eliminar esta venta?')) return;
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

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };
  const zoneLabel = (k: string) => ZONES.find(z => z.key === k)?.label ?? k;

  return (
    <>
      <section style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 11, ...mono, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Hoja de Ventas {loading && <span>…</span>}
            </h2>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <span style={{ fontSize: 12, ...mono, color: 'var(--green)' }}>Cobrado: {money(totalCollected)}</span>
              {totalPending > 0 && <span style={{ fontSize: 12, ...mono, color: '#fbbf24' }}>Pendiente: {money(totalPending)}</span>}
              <span style={{ fontSize: 12, ...mono, color: 'var(--muted)' }}>{totalTickets} ticket{totalTickets !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button
            onClick={openModal}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', ...mono, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            + Nueva Venta
          </button>
        </div>

        {/* Quick-add row (inline) */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr auto', gap: 8, marginBottom: 16, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, border: '0.5px solid var(--border2)' }}>
          <input
            type="text"
            placeholder="Nombre del comprador…"
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && openModal()}
            style={{ ...mono }}
          />
          <select
            value={zone}
            onChange={e => setZone(e.target.value)}
            style={{ background: 'var(--bg)', border: '0.5px solid var(--border2)', color: 'var(--text)', ...mono, fontSize: 13, borderRadius: 6, padding: '8px 12px' }}
          >
            {ZONES.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
          </select>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            style={{ background: 'var(--bg)', border: '0.5px solid var(--border2)', color: PAYMENT_COLORS[paymentMethod] ?? 'var(--text)', ...mono, fontSize: 13, borderRadius: 6, padding: '8px 12px' }}
          >
            {PAYMENT_METHODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
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
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', ...mono, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Registrar →
          </button>
        </div>

        {/* Sales table */}
        {sales.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', ...mono }}>No hay ventas registradas aún. Hacé clic en <strong>+ Nueva Venta</strong> para empezar.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', ...mono, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border2)' }}>
                  {['#','Nombre','Localidad','Tipo','Cant.','Método','Monto','Fecha',''].map(h => (
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
                    <td style={{ padding: '8px 10px', color: 'var(--muted)', textTransform: 'capitalize' }}>{s.ticket_type === 'group' ? 'Grupo' : 'Individual'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)', textAlign: 'center' }}>{s.group_size}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${PAYMENT_COLORS[s.payment_method]}22`, color: PAYMENT_COLORS[s.payment_method] ?? 'var(--text)', border: `0.5px solid ${PAYMENT_COLORS[s.payment_method] ?? 'var(--border2)'}` }}>
                        {PAYMENT_LABELS[s.payment_method] ?? s.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: s.total_amount === 0 ? 'var(--muted)' : 'var(--text)', fontWeight: 500 }}>
                      {s.total_amount === 0 ? '—' : money(s.total_amount)}
                    </td>
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
                  <td colSpan={6} style={{ padding: '10px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', fontWeight: 600 }}>Total cobrado</td>
                  <td style={{ padding: '10px 10px', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{money(totalCollected)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ─── PREBUY MODAL ─── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', ...mono, letterSpacing: '-0.3px' }}>Nueva Venta</h3>
                <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginTop: 2 }}>Registrar ticket(s)</p>
              </div>
              <button onClick={closeModal} style={{ background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: 18 }}>

              {/* Buyer Name */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Nombre del comprador</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez…"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  autoFocus
                  style={{ width: '100%', ...mono }}
                />
              </div>

              {/* Quantity */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                  Cantidad de tickets
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
                    {qty} tickets · se registran como una compra grupal
                  </p>
                )}
              </div>

              {/* Zone */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Localidad</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ZONES.map(z => (
                    <button
                      key={z.key}
                      onClick={() => setZone(z.key)}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                        background: zone === z.key ? 'rgba(124,109,250,0.15)' : 'var(--bg3)',
                        color: zone === z.key ? 'var(--accent2)' : 'var(--muted)',
                        border: zone === z.key ? '1px solid var(--accent2)' : '0.5px solid var(--border2)',
                        ...mono, fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{z.label}</div>
                      <div style={{ fontSize: 10, marginTop: 2, color: zone === z.key ? 'var(--accent2)' : 'var(--muted)', opacity: 0.8 }}>
                        {money(cfg[z.priceKey])}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Método de pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {PAYMENT_METHODS.map(p => (
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
                      {p.label}
                      {p.free && <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>valor = 0</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price override (only for non-free payments) */}
              {!isFree && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Precio unitario ({sym}) — editable
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
                <label style={{ fontSize: 11, color: 'var(--muted)', ...mono, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Notas (opcional)</label>
                <input type="text" placeholder="Ej: Pago en 2 partes, asiento especial…" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', ...mono }} />
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', border: '0.5px solid var(--border2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>Zona</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', ...mono, fontWeight: 500 }}>{selectedZone.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>Cantidad</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', ...mono, fontWeight: 500 }}>{qty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>Precio c/u</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', ...mono, fontWeight: 500 }}>{isFree ? '—' : `${sym}${unitPriceDisplay.toLocaleString()}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid var(--border2)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', ...mono, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</span>
                  <span style={{ fontSize: 20, color: isFree ? 'var(--muted)' : 'var(--green)', ...mono, fontWeight: 700 }}>
                    {isFree ? sym + '0' : `${sym}${totalDisplay.toLocaleString()}`}
                  </span>
                </div>
                {selectedPayment.key === 'por_pagar' && (
                  <p style={{ fontSize: 10, color: '#fbbf24', ...mono, marginTop: 6 }}>⚠ Pago pendiente — no se registra como ingreso cobrado</p>
                )}
                {selectedPayment.key === 'special' && (
                  <p style={{ fontSize: 10, color: '#c084fc', ...mono, marginTop: 6 }}>★ Ticket especial / cortesía — ingreso = 0</p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={closeModal} style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: 'var(--bg3)', border: '0.5px solid var(--border2)', color: 'var(--muted)', ...mono, fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={confirmSale}
                  disabled={saving || !buyerName.trim()}
                  style={{ flex: 2, padding: '12px 0', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', ...mono, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (saving || !buyerName.trim()) ? 0.5 : 1 }}
                >
                  {saving ? 'Guardando…' : '✓ Confirmar venta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
