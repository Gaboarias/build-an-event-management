// Stateless session token: base64url(payload).hmac — Edge + Node safe (Web Crypto).
// payload carries { uid, oid, exp } (user id, active org id, expiry ms).

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function b64urlEncode(s: string): string {
  // btoa is available in both Edge and Node 18+
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}

export const COOKIE_NAME = 'wem_auth';
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

export interface SessionPayload {
  uid: number;
  oid: number; // active org id
  exp: number; // expiry, ms epoch
}

export async function createToken(
  secret: string,
  data: { uid: number; oid: number },
): Promise<string> {
  const payload: SessionPayload = { uid: data.uid, oid: data.oid, exp: Date.now() + MAX_AGE * 1000 };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

export async function verifyToken(
  secret: string,
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!secret || !token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmac(secret, body);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body)) as SessionPayload;
    if (!payload || typeof payload.uid !== 'number' || typeof payload.oid !== 'number') return null;
    if (!Number.isFinite(payload.exp) || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
