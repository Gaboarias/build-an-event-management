'use client';

import { useEffect, useState, useCallback } from 'react';

export const dynamic = 'force-dynamic';

interface OrgRow { id: number; name: string; members: number; created_at: string; }

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

export default function AdminPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [orgName, setOrgName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/orgs');
    if (r.status === 403 || r.status === 401) { setForbidden(true); return; }
    if (r.ok) setOrgs(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLink(''); setMsg('');
    const res = await fetch('/api/admin/orgs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName, ownerEmail }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setOrgName(''); setOwnerEmail('');
      if (j.inviteLink) setLink(j.inviteLink);
      if (j.ownerExisting) setMsg('La org se creó y el owner (cuenta existente) ya fue asignado.');
      load();
    } else setErr(j.error || 'Error');
  }

  if (forbidden) {
    return <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: "'DM Mono',monospace", color: 'var(--wem-text-primary,#F0EFE9)' }}>
      <div style={box}>Esta sección es solo para super-admin.</div>
    </div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: "'DM Mono',monospace", color: 'var(--wem-text-primary,#F0EFE9)' }}>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, marginBottom: 20 }}>Administración · Organizaciones</h1>

      <div style={box}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 12 }}>Crear organización</div>
        <form onSubmit={createOrg} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Nombre de la organización" value={orgName} onChange={(e) => setOrgName(e.target.value)} required style={{ ...input, flex: 1, minWidth: 200 }} />
          <input type="email" placeholder="email del owner" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required style={{ ...input, flex: 1, minWidth: 200 }} />
          <button type="submit" style={btn}>Crear</button>
        </form>
        {err && <div style={{ color: 'var(--wem-status-error,#f87171)', marginTop: 10, fontSize: 13 }}>{err}</div>}
        {msg && <div style={{ color: 'var(--wem-status-active,#34d399)', marginTop: 10, fontSize: 13 }}>{msg}</div>}
        {link && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: 'var(--wem-text-muted,#A8A8A0)', fontSize: 12, marginBottom: 6 }}>Link para que el owner cree su cuenta (válido 7 días):</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={link} style={{ ...input, flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" style={btn} onClick={() => navigator.clipboard.writeText(link)}>Copiar</button>
            </div>
          </div>
        )}
      </div>

      <div style={box}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 12 }}>Organizaciones ({orgs.length})</div>
        {orgs.map((o) => (
          <div key={o.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--wem-border,rgba(255,255,255,0.06))' }}>
            <div style={{ flex: 1 }}>{o.name}</div>
            <div style={{ color: 'var(--wem-text-muted,#A8A8A0)', fontSize: 12 }}>{o.members} miembro(s)</div>
          </div>
        ))}
      </div>
    </div>
  );
}
