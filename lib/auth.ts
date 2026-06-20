// Lightweight shared-password auth: HMAC-signed cookie token.
// Works in both the Edge runtime (middleware) and Node runtime (route handlers)
// because it only relies on Web Crypto (crypto.subtle) and TextEncoder.

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

export const COOKIE_NAME = 'wem_auth';
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

// token = "<expiryMs>.<hmac(expiryMs)>"
export async function createToken(secret: string): Promise<string> {
  const exp = Date.now() + MAX_AGE * 1000;
  const sig = await hmac(secret, String(exp));
  return `${exp}.${sig}`;
}

export async function verifyToken(secret: string, token: string | undefined | null): Promise<boolean> {
  if (!secret || !token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(secret, expStr);
  // constant-time-ish comparison
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// constant-time string compare for the password check
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
