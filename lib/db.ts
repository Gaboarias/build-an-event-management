import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';

export type EventType = 'event' | 'seminar';
export type EventStatus = 'active' | 'paused' | 'cancelled';
export type Role = 'owner' | 'admin' | 'member';

// ─────────────────────────── Tenancy types ───────────────────────────

export interface AppUser {
  id: number;
  email: string;
  name: string;
  is_superadmin: boolean;
  created_at: string;
}

export interface Org {
  id: number;
  name: string;
  created_at: string;
}

export interface OrgMembership {
  org_id: number;
  org_name: string;
  role: Role;
}

export interface OrgMember {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Invitation {
  id: number;
  org_id: number;
  email: string;
  role: Role;
  token: string;
  invited_by: number | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface SessionContext {
  userId: number;
  orgId: number;
  role: Role;
  name: string;
  email: string;
  isSuperadmin: boolean;
  orgName: string;
}

// ─────────────────────────── Domain types ───────────────────────────

export interface EventConfig {
  id: number;
  org_id: number;
  event_name: string;
  type: EventType;
  status: EventStatus;
  frozen_zones: string;
  venue: string | null;
  event_date: string | null;
  price_gen: number;
  price_vip: number;
  price_lounge_ind: number;
  price_lounge_mesa: number;
  costo_neto: number;
  cap_gen: number;
  cap_vip: number;
  cap_lounge: number;
  updated_at: string;
}

export interface EventListItem {
  id: number;
  event_name: string;
  type: EventType;
  venue: string | null;
  event_date: string | null;
  updated_at: string;
}

export interface SalesSnapshot {
  id: number;
  event_id: number;
  label: string;
  qty_gen: number;
  qty_vip: number;
  qty_lounge_ind: number;
  qty_lounge_mesa: number;
  ingreso: number;
  pl: number;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export interface AcademiaStudent {
  id: number;
  name: string;
  phone: string | null;
  plan: 'Basic' | 'Mid' | 'Full';
  date_of_birth: string | null;
  paid_months: string;
  created_at: string;
}

export interface Expense {
  id: number;
  event_id: number;
  category: string;
  label: string | null;
  amount: number;
  created_at: string;
}

export interface TicketSale {
  id: number;
  event_id: number;
  buyer_name: string;
  zone: string;
  ticket_type: 'individual' | 'group';
  group_size: number;
  payment_method: string;
  unit_price: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

export interface EventZone {
  id: number;
  event_id: number;
  name: string;
  capacity: number;
  price: number;
  frozen: boolean;
  created_at: string;
}

// ═══════════════════════ Users / Orgs / Memberships ═══════════════════════

export async function getUserByEmail(email: string) {
  const { rows } = await sql<AppUser & { password_hash: string }>`
    SELECT * FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
  return rows[0];
}

export async function getUserById(id: number) {
  const { rows } = await sql<AppUser>`
    SELECT id, email, name, is_superadmin, created_at FROM users WHERE id = ${id}`;
  return rows[0];
}

export async function createUser(email: string, name: string, passwordHash: string, isSuperadmin = false) {
  const { rows } = await sql<AppUser>`
    INSERT INTO users (email, name, password_hash, is_superadmin)
    VALUES (${email}, ${name}, ${passwordHash}, ${isSuperadmin})
    RETURNING id, email, name, is_superadmin, created_at`;
  return rows[0];
}

export async function setUserPassword(userId: number, passwordHash: string) {
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function createOrg(name: string): Promise<Org> {
  const { rows } = await sql<Org>`INSERT INTO orgs (name) VALUES (${name}) RETURNING *`;
  return rows[0];
}

export async function getOrg(id: number): Promise<Org | undefined> {
  const { rows } = await sql<Org>`SELECT * FROM orgs WHERE id = ${id}`;
  return rows[0];
}

export async function renameOrg(id: number, name: string) {
  await sql`UPDATE orgs SET name = ${name} WHERE id = ${id}`;
}

export async function listAllOrgs() {
  noStore();
  const { rows } = await sql<Org & { members: number }>`
    SELECT o.*, (SELECT COUNT(*)::int FROM memberships m WHERE m.org_id = o.id) AS members
    FROM orgs o ORDER BY o.created_at DESC`;
  return rows;
}

export async function createMembership(orgId: number, userId: number, role: Role) {
  await sql`
    INSERT INTO memberships (org_id, user_id, role)
    VALUES (${orgId}, ${userId}, ${role})
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = ${role}`;
}

export async function getMembership(orgId: number, userId: number): Promise<{ role: Role } | undefined> {
  const { rows } = await sql<{ role: Role }>`
    SELECT role FROM memberships WHERE org_id = ${orgId} AND user_id = ${userId}`;
  return rows[0];
}

export async function getUserMemberships(userId: number): Promise<OrgMembership[]> {
  noStore();
  const { rows } = await sql<OrgMembership>`
    SELECT m.org_id, o.name AS org_name, m.role
    FROM memberships m JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = ${userId}
    ORDER BY o.name`;
  return rows;
}

export async function listOrgMembers(orgId: number): Promise<OrgMember[]> {
  noStore();
  const { rows } = await sql<OrgMember>`
    SELECT u.id AS user_id, u.name, u.email, m.role, m.created_at
    FROM memberships m JOIN users u ON u.id = m.user_id
    WHERE m.org_id = ${orgId}
    ORDER BY m.created_at`;
  return rows;
}

export async function updateMemberRole(orgId: number, userId: number, role: Role) {
  await sql`UPDATE memberships SET role = ${role} WHERE org_id = ${orgId} AND user_id = ${userId}`;
}

export async function removeMember(orgId: number, userId: number) {
  await sql`DELETE FROM memberships WHERE org_id = ${orgId} AND user_id = ${userId}`;
}

export async function getSessionContext(userId: number, orgId: number): Promise<SessionContext | null> {
  noStore();
  const { rows } = await sql<{
    role: Role; name: string; email: string; is_superadmin: boolean; org_id: number; org_name: string;
  }>`
    SELECT m.role, u.name, u.email, u.is_superadmin, o.id AS org_id, o.name AS org_name
    FROM memberships m
    JOIN users u ON u.id = m.user_id
    JOIN orgs  o ON o.id = m.org_id
    WHERE m.user_id = ${userId} AND m.org_id = ${orgId}
    LIMIT 1`;
  const r = rows[0];
  if (!r) return null;
  return {
    userId, orgId, role: r.role, name: r.name, email: r.email,
    isSuperadmin: r.is_superadmin, orgName: r.org_name,
  };
}

// ─────────────────────────── Invitations ───────────────────────────

export async function createInvitation(orgId: number, email: string, role: Role, token: string, invitedBy: number, expiresAt: string) {
  const { rows } = await sql<Invitation>`
    INSERT INTO invitations (org_id, email, role, token, invited_by, expires_at)
    VALUES (${orgId}, ${email}, ${role}, ${token}, ${invitedBy}, ${expiresAt})
    RETURNING *`;
  return rows[0];
}

export async function getInvitationByToken(token: string): Promise<(Invitation & { org_name: string }) | undefined> {
  noStore();
  const { rows } = await sql<Invitation & { org_name: string }>`
    SELECT i.*, o.name AS org_name
    FROM invitations i JOIN orgs o ON o.id = i.org_id
    WHERE i.token = ${token} LIMIT 1`;
  return rows[0];
}

export async function markInvitationAccepted(id: number) {
  await sql`UPDATE invitations SET accepted_at = NOW() WHERE id = ${id}`;
}

export async function listOrgInvitations(orgId: number): Promise<Invitation[]> {
  noStore();
  const { rows } = await sql<Invitation>`
    SELECT * FROM invitations
    WHERE org_id = ${orgId} AND accepted_at IS NULL AND expires_at > NOW()
    ORDER BY created_at DESC`;
  return rows;
}

export async function deleteInvitation(orgId: number, id: number) {
  await sql`DELETE FROM invitations WHERE id = ${id} AND org_id = ${orgId}`;
}

// ═══════════════════════ Events (org-scoped) ═══════════════════════

export async function getAllEvents(orgId: number): Promise<EventListItem[]> {
  noStore();
  const { rows } = await sql<EventListItem>`
    SELECT id, event_name, type, venue, event_date, updated_at
    FROM event_config WHERE org_id = ${orgId} ORDER BY id`;
  return rows;
}

export async function getConfig(eventId: number, orgId: number): Promise<EventConfig | undefined> {
  const { rows } = await sql<EventConfig>`
    SELECT * FROM event_config WHERE id = ${eventId} AND org_id = ${orgId}`;
  return rows[0];
}

export async function createEvent(eventName: string, orgId: number): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    INSERT INTO event_config (event_name, type, org_id)
    VALUES (${eventName}, 'event', ${orgId}) RETURNING *`;
  return rows[0];
}

export async function createSeminar(eventName: string, orgId: number): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    INSERT INTO event_config (event_name, type, org_id)
    VALUES (${eventName}, 'seminar', ${orgId}) RETURNING *`;
  return rows[0];
}

export async function deleteEvent(eventId: number, orgId: number): Promise<void> {
  await sql`DELETE FROM event_config WHERE id = ${eventId} AND org_id = ${orgId}`;
}

export async function updateConfig(eventId: number, data: Partial<EventConfig>, orgId: number): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    UPDATE event_config SET
      price_gen        = COALESCE(${data.price_gen        ?? null}::integer, price_gen),
      price_vip        = COALESCE(${data.price_vip        ?? null}::integer, price_vip),
      price_lounge_ind = COALESCE(${data.price_lounge_ind ?? null}::integer, price_lounge_ind),
      price_lounge_mesa= COALESCE(${data.price_lounge_mesa?? null}::integer, price_lounge_mesa),
      costo_neto       = COALESCE(${data.costo_neto       ?? null}::integer, costo_neto),
      cap_gen          = COALESCE(${data.cap_gen          ?? null}::integer, cap_gen),
      cap_vip          = COALESCE(${data.cap_vip          ?? null}::integer, cap_vip),
      cap_lounge       = COALESCE(${data.cap_lounge       ?? null}::integer, cap_lounge),
      event_name       = COALESCE(${data.event_name       ?? null}, event_name),
      status           = COALESCE(${data.status           ?? null}, status),
      frozen_zones     = COALESCE(${data.frozen_zones     ?? null}, frozen_zones),
      venue            = COALESCE(${data.venue            ?? null}, venue),
      event_date       = COALESCE(${data.event_date       ?? null}, event_date),
      updated_at       = NOW()
    WHERE id = ${eventId} AND org_id = ${orgId}
    RETURNING *`;
  return rows[0];
}

export async function updateEventStatus(eventId: number, status: EventStatus, orgId: number): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    UPDATE event_config SET status = ${status}, updated_at = NOW()
    WHERE id = ${eventId} AND org_id = ${orgId} RETURNING *`;
  return rows[0];
}

// ─── snapshots (scoped via parent event's org) ───
export async function getSnapshots(eventId: number, orgId: number): Promise<SalesSnapshot[]> {
  const { rows } = await sql<SalesSnapshot>`
    SELECT s.* FROM sales_snapshot s
    WHERE s.event_id = ${eventId}
      AND s.event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})
    ORDER BY s.created_at DESC`;
  return rows;
}

export async function saveSnapshot(s: Omit<SalesSnapshot, 'id' | 'created_at'>, orgId: number): Promise<SalesSnapshot> {
  const { rows } = await sql<SalesSnapshot>`
    INSERT INTO sales_snapshot (event_id, label, qty_gen, qty_vip, qty_lounge_ind, qty_lounge_mesa, ingreso, pl)
    SELECT ${s.event_id}, ${s.label}, ${s.qty_gen}, ${s.qty_vip}, ${s.qty_lounge_ind}, ${s.qty_lounge_mesa}, ${s.ingreso}, ${s.pl}
    WHERE EXISTS (SELECT 1 FROM event_config WHERE id = ${s.event_id} AND org_id = ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function deleteSnapshot(id: number, orgId: number): Promise<void> {
  await sql`DELETE FROM sales_snapshot WHERE id = ${id}
    AND event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})`;
}

// ─── expenses ───
export async function getExpenses(eventId: number, orgId: number): Promise<Expense[]> {
  const { rows } = await sql<Expense>`
    SELECT e.* FROM expenses e
    WHERE e.event_id = ${eventId}
      AND e.event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})
    ORDER BY e.category, e.created_at`;
  return rows;
}

export async function saveExpense(e: Omit<Expense, 'id' | 'created_at'>, orgId: number): Promise<Expense> {
  const { rows } = await sql<Expense>`
    INSERT INTO expenses (event_id, category, label, amount)
    SELECT ${e.event_id}, ${e.category}, ${e.label ?? null}, ${e.amount}
    WHERE EXISTS (SELECT 1 FROM event_config WHERE id = ${e.event_id} AND org_id = ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function updateExpense(id: number, amount: number, label: string | null, orgId: number): Promise<Expense> {
  const { rows } = await sql<Expense>`
    UPDATE expenses SET amount = ${amount}, label = ${label ?? null}
    WHERE id = ${id} AND event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function deleteExpense(id: number, orgId: number): Promise<void> {
  await sql`DELETE FROM expenses WHERE id = ${id}
    AND event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})`;
}

// ─── ticket sales ───
export async function getSales(eventId: number, orgId: number): Promise<TicketSale[]> {
  const { rows } = await sql<TicketSale>`
    SELECT t.* FROM ticket_sales t
    WHERE t.event_id = ${eventId}
      AND t.event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})
    ORDER BY t.created_at DESC`;
  return rows;
}

export async function saveSale(s: Omit<TicketSale, 'id' | 'created_at'>, orgId: number): Promise<TicketSale> {
  const { rows } = await sql<TicketSale>`
    INSERT INTO ticket_sales (event_id, buyer_name, zone, ticket_type, group_size, payment_method, unit_price, total_amount, notes)
    SELECT ${s.event_id}, ${s.buyer_name}, ${s.zone}, ${s.ticket_type}, ${s.group_size}, ${s.payment_method}, ${s.unit_price}, ${s.total_amount}, ${s.notes ?? null}
    WHERE EXISTS (SELECT 1 FROM event_config WHERE id = ${s.event_id} AND org_id = ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function deleteSale(id: number, orgId: number): Promise<void> {
  await sql`DELETE FROM ticket_sales WHERE id = ${id}
    AND event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})`;
}

// ─── zones ───
export async function getZones(eventId: number, orgId: number): Promise<EventZone[]> {
  const { rows } = await sql<EventZone>`
    SELECT z.* FROM event_zones z
    WHERE z.event_id = ${eventId}
      AND z.event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})
    ORDER BY z.created_at`;
  return rows;
}

export async function saveZone(z: Omit<EventZone, 'id' | 'created_at' | 'frozen'>, orgId: number): Promise<EventZone> {
  const { rows } = await sql<EventZone>`
    INSERT INTO event_zones (event_id, name, capacity, price)
    SELECT ${z.event_id}, ${z.name}, ${z.capacity}, ${z.price}
    WHERE EXISTS (SELECT 1 FROM event_config WHERE id = ${z.event_id} AND org_id = ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function updateZone(id: number, data: { frozen?: boolean; name?: string; capacity?: number; price?: number }, orgId: number): Promise<EventZone> {
  const { rows } = await sql<EventZone>`
    UPDATE event_zones SET
      frozen   = COALESCE(${data.frozen   ?? null}::boolean, frozen),
      name     = COALESCE(${data.name     ?? null}, name),
      capacity = COALESCE(${data.capacity ?? null}::integer, capacity),
      price    = COALESCE(${data.price    ?? null}::integer, price)
    WHERE id = ${id} AND event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function deleteZone(id: number, orgId: number): Promise<void> {
  await sql`DELETE FROM event_zones WHERE id = ${id}
    AND event_id IN (SELECT id FROM event_config WHERE org_id = ${orgId})`;
}

// ═══════════════════════ Academia (org-scoped) ═══════════════════════

export async function getStudents(orgId: number): Promise<AcademiaStudent[]> {
  noStore();
  const { rows } = await sql<AcademiaStudent>`
    SELECT * FROM academia_students WHERE org_id = ${orgId} ORDER BY name ASC`;
  return rows;
}

export async function createStudent(data: Omit<AcademiaStudent, 'id' | 'created_at'>, orgId: number): Promise<AcademiaStudent> {
  const { rows } = await sql<AcademiaStudent>`
    INSERT INTO academia_students (name, phone, plan, date_of_birth, paid_months, org_id)
    VALUES (${data.name}, ${data.phone ?? null}, ${data.plan}, ${data.date_of_birth ?? null}, ${data.paid_months}, ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function updateStudent(id: number, data: Partial<Omit<AcademiaStudent, 'id' | 'created_at'>>, orgId: number): Promise<AcademiaStudent> {
  const { rows } = await sql<AcademiaStudent>`
    UPDATE academia_students
    SET name=${data.name ?? ''}, phone=${data.phone ?? null}, plan=${data.plan ?? 'Basic'},
        date_of_birth=${data.date_of_birth ?? null}, paid_months=${data.paid_months ?? '[]'}
    WHERE id=${id} AND org_id=${orgId} RETURNING *`;
  return rows[0];
}

export async function deleteStudent(id: number, orgId: number): Promise<void> {
  await sql`DELETE FROM academia_students WHERE id=${id} AND org_id=${orgId}`;
}

// ═══════════════════════ Contacts (org-scoped) ═══════════════════════

export async function getContacts(orgId: number): Promise<Contact[]> {
  noStore();
  const { rows } = await sql<Contact>`
    SELECT * FROM contacts WHERE org_id = ${orgId} ORDER BY name ASC`;
  return rows;
}

export async function createContact(data: Omit<Contact, 'id' | 'created_at'>, orgId: number): Promise<Contact> {
  const { rows } = await sql<Contact>`
    INSERT INTO contacts (name, phone, email, role, notes, org_id)
    VALUES (${data.name}, ${data.phone ?? null}, ${data.email ?? null}, ${data.role ?? null}, ${data.notes ?? null}, ${orgId})
    RETURNING *`;
  return rows[0];
}

export async function updateContact(id: number, data: Omit<Contact, 'id' | 'created_at'>, orgId: number): Promise<Contact> {
  const { rows } = await sql<Contact>`
    UPDATE contacts SET name=${data.name}, phone=${data.phone ?? null}, email=${data.email ?? null},
      role=${data.role ?? null}, notes=${data.notes ?? null}
    WHERE id=${id} AND org_id=${orgId} RETURNING *`;
  return rows[0];
}

export async function deleteContact(id: number, orgId: number): Promise<void> {
  await sql`DELETE FROM contacts WHERE id=${id} AND org_id=${orgId}`;
}
