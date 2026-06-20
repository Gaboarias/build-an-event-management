'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const card: React.CSSProperties = {
  width: '100%', maxWidth: 380, background: 'var(--wem-bg-card, #1A1A1A)',
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace('/');
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'No se pudo ingresar');
        setLoading(false);
      }
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Mono', monospace" }}>
      <form onSubmit={onSubmit} style={card}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: 'var(--wem-text-primary, #F0EFE9)', marginBottom: 6 }}>WEM</div>
        <div style={{ fontSize: 13, color: 'var(--wem-text-muted, #A8A8A0)', marginBottom: 28 }}>Iniciá sesión en tu cuenta</div>

        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required placeholder="tu@correo.com" style={inputStyle} />

        <label style={labelStyle}>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />

        {error && (
          <div style={{ fontSize: 13, color: 'var(--wem-status-error, #f87171)', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 18 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: 'var(--wem-accent-primary, #1560BD)', color: '#fff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Ingresando…' : 'Entrar →'}
        </button>
      </form>
    </div>
  );
}
