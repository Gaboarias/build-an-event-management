'use client';

import { useEffect, useState } from 'react';

interface OrgItem { org_id: number; org_name: string; role: string; }
interface SessionInfo {
  user: { id: number; name: string; email: string; isSuperadmin: boolean };
  org: { id: number; name: string; role: string };
  orgs: OrgItem[];
}

export default function AccountBar() {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setInfo(d); setHidden(false); } })
      .catch(() => {});
  }, []);

  if (hidden || !info) return null;

  const canManage = info.org.role === 'owner' || info.org.role === 'admin';

  async function switchOrg(orgId: number) {
    await fetch('/api/auth/switch-org', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    window.location.href = '/';
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const link: React.CSSProperties = {
    color: 'var(--wem-text-muted, #A8A8A0)', textDecoration: 'none', fontSize: 12,
    fontFamily: "'DM Mono', monospace", padding: '4px 8px', borderRadius: 6,
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '8px 16px',
        background: 'var(--wem-bg-surface, #111111)',
        borderBottom: '1px solid var(--wem-border, rgba(255,255,255,0.09))',
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: 'var(--wem-text-primary, #F0EFE9)', fontSize: 14 }}>
        WEM
      </span>

      {info.orgs.length > 1 ? (
        <select
          value={info.org.id}
          onChange={(e) => switchOrg(Number(e.target.value))}
          style={{
            background: 'var(--wem-bg-card, #1A1A1A)', color: 'var(--wem-text-primary, #F0EFE9)',
            border: '1px solid var(--wem-border2, rgba(255,255,255,0.18))', borderRadius: 6,
            padding: '4px 8px', fontSize: 12, fontFamily: "'DM Mono', monospace",
          }}
        >
          {info.orgs.map((o) => (
            <option key={o.org_id} value={o.org_id}>{o.org_name}</option>
          ))}
        </select>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--wem-text-primary, #F0EFE9)' }}>{info.org.name}</span>
      )}

      <span style={{ fontSize: 11, color: 'var(--wem-text-muted,#A8A8A0)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {info.org.role}
      </span>

      <div style={{ flex: 1 }} />

      <a href="/" style={link}>Inicio</a>
      {canManage && <a href="/settings/members" style={link}>Miembros</a>}
      {info.user.isSuperadmin && <a href="/admin" style={link}>Admin</a>}
      <span style={{ fontSize: 12, color: 'var(--wem-text-muted,#A8A8A0)' }}>{info.user.name}</span>
      <button
        onClick={logout}
        style={{
          ...link, cursor: 'pointer', background: 'transparent',
          border: '1px solid var(--wem-border2, rgba(255,255,255,0.18))',
        }}
      >
        Salir
      </button>
    </div>
  );
}
