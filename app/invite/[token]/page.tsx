'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface InviteInfo { valid: boolean; email?: string; role?: string; org_name?: string; existing?: boolean; }

const card: React.CSSProperties = {
  width: '100%', maxWidth: 400, background: 'var(--wem-bg-card, #1A1A1A)',
  border: '1px solid var(--wem-border, rgba(255,255,255,0.09))', borderRadius: 16, padding: '40px 32px',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--wem-text-muted, #A8A8A0)', marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid var(--wem-border2, rgba(255,255,255,0.18))',
  background: 'var(--wem-bg-surface, #111111)', color: 'var(--wem-text-primary, #F0EFE9)',
  fontSize: 15, fontFamily: "'DM Mono', monospace", outline: 'none', marginBottom: 18,
};

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${params.token}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ valid: false }));
  }, [params.token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, name, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        if (j.existing) { router.replace('/login'); }
        else { router.replace('/'); router.refresh(); }
      } else {
        setError(j.error || 'No se pudo aceptar la invitación');
        setLoading(false);
      }
    } catch {
      setError('Error de conexión'); setLoading(false);
    }
  }

  const wrap = { minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Mono', monospace" } as React.CSSProperties;

  if (!info) return <div style={wrap}><div style={card}>Cargando…</div></div>;

  if (!info.valid) {
    return <div style={wrap}><div style={card}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--wem-text-primary,#F0EFE9)', marginBottom: 8 }}>Invitación inválida</div>
      <div style={{ fontSize: 13, color: 'var(--wem-text-muted,#A8A8A0)' }}>Este enlace expiró o ya fue usado. Pedile a tu administrador uno nuevo.</div>
    </div></div>;
  }

  return (
    <div style={wrap}>
      <form onSubmit={accept} style={card}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--wem-text-primary,#F0EFE9)', marginBottom: 6 }}>
          Unirte a {info.org_name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--wem-text-muted,#A8A8A0)', marginBottom: 24 }}>
          {info.email} · rol {info.role}
        </div>

        {info.existing ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--wem-text-primary,#F0EFE9)', marginBottom: 18 }}>
              Ya tenés una cuenta con este email. Al continuar te agregamos a <b>{info.org_name}</b> y luego iniciás sesión normalmente.
            </div>
          </>
        ) : (
          <>
            <label style={labelStyle}>Tu nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required placeholder="Nombre y apellido" style={inputStyle} />
            <label style={labelStyle}>Creá una contraseña (mín. 8)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
          </>
        )}

        {error && (
          <div style={{ fontSize: 13, color: 'var(--wem-status-error,#f87171)', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 18 }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: 'var(--wem-accent-primary, #1560BD)', color: '#fff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Procesando…' : (info.existing ? 'Unirme y continuar →' : 'Crear cuenta →')}
        </button>
      </form>
    </div>
  );
}
