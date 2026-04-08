'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AcademiaStudent } from '@/lib/db';
import { type Lang, makeTr, getLang, setLang } from '@/lib/i18n';
import { useTheme, type Theme } from './ThemeProvider';
import { useIsMobile } from '@/lib/useIsMobile';

const PLANS = ['Basic', 'Mid', 'Full'] as const;
type Plan = typeof PLANS[number];

const PLAN_STYLE: Record<Plan, { bg: string; color: string; border: string }> = {
  Basic: { bg: 'rgba(21,96,189,0.15)',  color: 'var(--accent)',  border: 'rgba(21,96,189,0.4)' },
  Mid:   { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24',        border: 'rgba(251,191,36,0.4)' },
  Full:  { bg: 'rgba(52,211,153,0.15)', color: 'var(--green)',   border: 'rgba(52,211,153,0.4)' },
};

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function calcAge(dob: string | null): string | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob + 'T00:00:00').getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return age >= 0 ? String(age) : null;
}

interface StudentFormState {
  name: string;
  phone: string;
  plan: Plan;
  date_of_birth: string;
}

const emptyForm = (): StudentFormState => ({ name: '', phone: '', plan: 'Basic', date_of_birth: '' });

export default function AcademiaPage() {
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const themes: { key: Theme; icon: string }[] = [
    { key: 'dark', icon: '🌙' }, { key: 'light', icon: '☀️' }, { key: 'colorblind', icon: '◑' },
  ];

  const [lang, setLangState] = useState<Lang>('es');
  useEffect(() => { setLangState(getLang()); }, []);
  const tr = makeTr(lang);
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };

  function toggleLang() {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLangState(next); setLang(next);
  }

  const [students, setStudents] = useState<AcademiaStudent[]>([]);
  const [loading, setLoading]   = useState(false);
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState<StudentFormState>(emptyForm());

  const [editId, setEditId]     = useState<number | null>(null);
  const [editForm, setEditForm] = useState<StudentFormState>(emptyForm());

  const [year, setYear] = useState(() => new Date().getFullYear());
  const months = lang === 'en' ? MONTHS_EN : MONTHS_ES;

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/academia');
      if (r.ok) setStudents(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function saveNew() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/academia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, paid_months: '[]' }),
      });
      if (!r.ok) return;
      setForm(emptyForm()); setAdding(false); load();
    } finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editId) return;
    const student = students.find(s => s.id === editId);
    await fetch('/api/academia', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...editForm, paid_months: student?.paid_months ?? '[]' }),
    });
    setEditId(null); load();
  }

  async function handleDelete(id: number) {
    if (!confirm(tr('academia_confirm_delete'))) return;
    await fetch('/api/academia', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  async function toggleMonth(student: AcademiaStudent, key: string) {
    const paid: string[] = (() => { try { return JSON.parse(student.paid_months); } catch { return []; } })();
    const next = paid.includes(key) ? paid.filter(m => m !== key) : [...paid, key];
    await fetch('/api/academia', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id, name: student.name, phone: student.phone, plan: student.plan, date_of_birth: student.date_of_birth, paid_months: JSON.stringify(next) }),
    });
    // Optimistic update
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, paid_months: JSON.stringify(next) } : s));
  }

  function startEdit(s: AcademiaStudent) {
    setEditId(s.id);
    setEditForm({ name: s.name, phone: s.phone ?? '', plan: s.plan, date_of_birth: s.date_of_birth ?? '' });
  }

  const paidCount = (s: AcademiaStudent) => {
    try { return (JSON.parse(s.paid_months) as string[]).filter(m => m.startsWith(String(year))).length; } catch { return 0; }
  };

  const inputStyle: React.CSSProperties = { width: '100%', ...mono };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ borderBottom: '0.5px solid var(--border)', padding: isMobile ? '14px 16px' : '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>WEM</h1>
            <Link href="/" style={{ fontSize: 11, color: 'var(--muted)', ...mono, textDecoration: 'none' }}>{tr('back_home')}</Link>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', ...mono, marginTop: 2 }}>{tr('academia_title')} · {tr('academia_subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 8, padding: 3 }}>
            {themes.map(t => (
              <button key={t.key} onClick={() => setTheme(t.key)} title={t.key}
                style={{ background: theme === t.key ? 'var(--accent)' : 'transparent', color: theme === t.key ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer', transition: 'background 0.15s' }}>
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px', display: 'grid', gap: 24 }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>{tr('academia_title')}</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', ...mono, marginTop: 4 }}>{students.length} {tr('academia_students_count')} {loading ? '…' : ''}</p>
          </div>
          {!adding && (
            <button onClick={() => setAdding(true)} style={{ background: 'var(--accent)', color: '#fff', padding: '10px 20px', borderRadius: 8, ...mono, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              {tr('academia_add_student')}
            </button>
          )}
        </div>

        {/* Add form */}
        {adding && (
          <section style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ ...mono, fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{tr('academia_add_student')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{tr('academia_name')} *</label>
                <input type="text" placeholder={tr('academia_name_ph')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{tr('academia_phone')}</label>
                <input type="text" placeholder={tr('academia_phone_ph')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>{tr('academia_plan')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PLANS.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, plan: p }))}
                      style={{ padding: '10px 0', borderRadius: 8, cursor: 'pointer', ...mono, fontSize: 13, fontWeight: 600,
                        background: form.plan === p ? PLAN_STYLE[p].bg : 'var(--bg3)',
                        color: form.plan === p ? PLAN_STYLE[p].color : 'var(--muted)',
                        border: form.plan === p ? `1px solid ${PLAN_STYLE[p].border}` : '0.5px solid var(--border2)' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{tr('academia_dob')}</label>
                <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
              <button onClick={() => { setAdding(false); setForm(emptyForm()); }}
                style={{ background: 'transparent', color: 'var(--muted)', border: '0.5px solid var(--border2)', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', ...mono }}>
                {tr('cancel')}
              </button>
              <button onClick={saveNew} disabled={saving || !form.name.trim()}
                style={{ background: 'var(--accent)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: saving || !form.name.trim() ? 0.6 : 1, ...mono }}>
                {saving ? tr('academia_saving') : tr('academia_save')}
              </button>
            </div>
          </section>
        )}

        {/* Year navigator */}
        {students.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setYear(y => y - 1)} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', color: 'var(--muted)', borderRadius: 6, padding: '4px 12px', fontSize: 14, cursor: 'pointer' }}>‹</button>
            <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 50, textAlign: 'center' }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', color: 'var(--muted)', borderRadius: 6, padding: '4px 12px', fontSize: 14, cursor: 'pointer' }}>›</button>
            <span style={{ ...mono, fontSize: 11, color: 'var(--muted)' }}>{tr('academia_year_label')}</span>
          </div>
        )}

        {/* Student list */}
        {students.length === 0 && !adding ? (
          <p style={{ ...mono, fontSize: 13, color: 'var(--muted)' }}>{tr('academia_no_students')}</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {students.map(s => {
              const planStyle = PLAN_STYLE[s.plan as Plan] ?? PLAN_STYLE.Basic;
              const age = calcAge(s.date_of_birth);
              const paid: string[] = (() => { try { return JSON.parse(s.paid_months); } catch { return []; } })();
              const paidThisYear = paid.filter(m => m.startsWith(String(year))).length;

              return editId === s.id ? (
                /* Edit card */
                <section key={s.id} style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 12, padding: 20 }}>
                  <h3 style={{ ...mono, fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{tr('academia_editing')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{tr('academia_name')} *</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{tr('academia_phone')}</label>
                      <input type="text" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>{tr('academia_plan')}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {PLANS.map(p => (
                          <button key={p} onClick={() => setEditForm(f => ({ ...f, plan: p }))}
                            style={{ padding: '10px 0', borderRadius: 8, cursor: 'pointer', ...mono, fontSize: 13, fontWeight: 600,
                              background: editForm.plan === p ? PLAN_STYLE[p].bg : 'var(--bg3)',
                              color: editForm.plan === p ? PLAN_STYLE[p].color : 'var(--muted)',
                              border: editForm.plan === p ? `1px solid ${PLAN_STYLE[p].border}` : '0.5px solid var(--border2)' }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...mono, fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{tr('academia_dob')}</label>
                      <input type="date" value={editForm.date_of_birth} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    <button onClick={saveEdit} style={{ background: 'var(--green)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', ...mono }}>✓ {tr('academia_save')}</button>
                    <button onClick={() => setEditId(null)} style={{ background: 'transparent', color: 'var(--muted)', border: '0.5px solid var(--border2)', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', ...mono }}>✕</button>
                  </div>
                </section>
              ) : (
                /* Display card */
                <section key={s.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
                  {/* Top row: info + actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{s.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 4,
                            background: planStyle.bg, color: planStyle.color, border: `0.5px solid ${planStyle.border}` }}>
                            {s.plan.toUpperCase()}
                          </span>
                          {s.phone && <span style={{ ...mono, fontSize: 12, color: 'var(--muted)' }}>📞 {s.phone}</span>}
                          {age && <span style={{ ...mono, fontSize: 12, color: 'var(--muted)' }}>{age} {tr('academia_years')}</span>}
                          <span style={{ ...mono, fontSize: 11, color: paidThisYear === 12 ? 'var(--green)' : paidThisYear > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                            {paidThisYear}/12 {tr('academia_paid')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEdit(s)} style={{ background: 'transparent', color: 'var(--muted)', padding: '4px 10px', fontSize: 11, border: '0.5px solid var(--border2)', cursor: 'pointer', borderRadius: 6 }}>✎</button>
                      <button onClick={() => handleDelete(s.id)} style={{ background: 'transparent', color: 'var(--red)', padding: '4px 10px', fontSize: 11, border: '0.5px solid var(--red)', opacity: 0.7, cursor: 'pointer', borderRadius: 6 }}>×</button>
                    </div>
                  </div>

                  {/* Months row */}
                  <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
                      {months.map((month, idx) => {
                        const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
                        const isPaid = paid.includes(key);
                        return (
                          <button key={idx} onClick={() => toggleMonth(s, key)}
                            style={{ padding: isMobile ? '6px 8px' : '7px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              cursor: 'pointer', ...mono, minWidth: isMobile ? 36 : 42, textAlign: 'center',
                              background: isPaid ? 'rgba(52,211,153,0.18)' : 'var(--bg3)',
                              color: isPaid ? 'var(--green)' : 'var(--muted)',
                              border: `0.5px solid ${isPaid ? 'var(--green)' : 'var(--border2)'}`,
                              transition: 'all 0.12s' }}>
                            {month}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
