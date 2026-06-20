// Server-side session helpers (Node runtime). Reads the signed cookie,
// then resolves the live membership/role from the DB.
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';
import { getSessionContext, type SessionContext } from '@/lib/db';

export type { SessionContext };

export async function getSession(): Promise<SessionContext | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const payload = await verifyToken(process.env.AUTH_SECRET || '', token);
  if (!payload) return null;
  // Confirms membership still exists (immediate revocation) and pulls role.
  return getSessionContext(payload.uid, payload.oid);
}

export function canManageMembers(role: string): boolean {
  return role === 'owner' || role === 'admin';
}
