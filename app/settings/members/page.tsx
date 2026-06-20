'use client';

import { useEffect, useState, useCallback } from 'react';

export const dynamic = 'force-dynamic';

interface Member { user_id: number; name: string; email: string; role: string; }
interface Invite { id: number; email: string; role: string; token: string; }

const box: React.CSSProperties = {
  background: 'var(--wem-bg-card,#1A1A1A)', border: '1px solid var(--wem-border,rgba(255,255,255,0.09))',
  borderRadius: 12, padding: 20, marginBottom: 20,
};
const input: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--wem-border2,rgba(255,255,255,0.18))',
  background: 'var(--wem-bg-surface,#111)', color: 'var(--wem-text-primary,#F0EFE9)', fontSize: 14,
  fontFamily: "'DM Mono',monospace",
};
const btn: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--wem-accent-primary,#1560BD)',
  color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const m = await fetch('/api/members');
    if (m.ok) setMembers(await m.json());
    const i = await fetch('/api/invitations');
    if (i.status === 403) { setForbidden(true); return; }
    if (i.ok) setInvites(await i.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLink('');
    const res = await fetch('/api/invitations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setLink(j.link); setEmail(''); load(); }
    else setErr(j.error || 'Error');
  }

  async function changeRole(userId: number, newRole: string) {
    await fetch('/api/members', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role: newRole }) });
    load();
  }
  async function removeMember(userId: number) {
    if (!confirm('¿Quitar este miembro de la organización?')) return;
    await fetch('/api/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    load();
  }
  async function cancelInvite(id: number) {
    await fetch('/api/invitations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  const muted = { color: 'var(--wem-text-muted,#A8A8A0)' };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: "'DM Mono',monospace", color: 'var(--wem-text-primary,#F0EFE9)' }}>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, marginBottom: 20 }}>Miembros</h1>

      {forbidden && <div style={box}>No tenés permiso para gestionar miembros.</div>}

      {!forbidden && (
        <div style={box}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 12 }}>Invitar a alguien</div>
          <form onSubmit={invite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ ...input, flex: 1, minWidth: 200 }} />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={input}>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" style={btn}>Generar link</button>
          </form>
          {err && <div style={{ color: 'var(--wem-status-error,#f87171)', marginTop: 10, fontSize: 13 }}>{err}</div>}
          {link && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...muted, fontSize: 12, marginBottom: 6 }}>Compartí este link con la persona (válido 7 días):</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={link} style={{ ...input, flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" style={btn} onClick={() => navigator.clipboard.writeText(link)}>Copiar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={box}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 12 }}>Equipo ({members.length})</div>
        {members.map((m) => (
          <div key={m.user_id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--wem-border,rgba(255,255,255,0.06))' }}>
            <div style={{ flex: 1 }}>
              <div>{m.name}</div>
              <div style={{ ...muted, fontSize: 12 }}>{m.email}</div>
            </div>
            {!forbidden ? (
              <>
                <select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value)} style={input}>
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                </select>
                <button onClick={() => removeMember(m.user_id)} style={{ ...btn, background: 'transparent', border: '1px solid var(--wem-status-error,#f87171)', color: 'var(--wem-status-error,#f87171)' }}>Quitar</button>
              </>
            ) : (
              <span style={{ ...muted, fontSize: 12, textTransform: 'uppercase' }}>{m.role}</span>
            )}
          </div>
        ))}
      </div>

      {!forbidden && invites.length > 0 && (
        <div style={box}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 12 }}>Invitaciones pendientes</div>
          {invites.map((i) => (
            <div key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--wem-border,rgba(255,255,255,0.06))' }}>
              <div style={{ flex: 1 }}>{i.email} <span style={{ ...muted, fontSize: 12 }}>· {i.role}</span></div>
              <button onClick={() => navigator.clipboard.writeText(`${location.origin}/invite/${i.token}`)} style={{ ...btn, background: 'transparent', border: '1px solid var(--wem-border2,rgba(255,255,255,0.18))', color: 'var(--wem-text-primary,#F0EFE9)' }}>Copiar link</button>
              <button onClick={() => cancelInvite(i.id)} style={{ ...btn, background: 'transparent', border: '1px solid var(--wem-status-error,#f87171)', color: 'var(--wem-status-error,#f87171)' }}>Cancelar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
