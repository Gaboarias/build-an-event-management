import { sql } from '@vercel/postgres';

export type EventType = 'event' | 'seminar';

export type EventStatus = 'active' | 'paused' | 'cancelled';

export interface EventConfig {
  id: number;
  event_name: string;
  type: EventType;
  status: EventStatus;
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

export async function getAllEvents(): Promise<EventListItem[]> {
  const { rows } = await sql<EventListItem>`
    SELECT id, event_name, type, updated_at FROM event_config ORDER BY id
  `;
  return rows;
}

export async function getConfig(eventId: number): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    SELECT * FROM event_config WHERE id = ${eventId}
  `;
  return rows[0];
}

export async function createEvent(eventName: string): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    INSERT INTO event_config (event_name, type)
    VALUES (${eventName}, 'event')
    RETURNING *
  `;
  return rows[0];
}

export async function createSeminar(eventName: string): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    INSERT INTO event_config (event_name, type)
    VALUES (${eventName}, 'seminar')
    RETURNING *
  `;
  return rows[0];
}

export async function deleteEvent(eventId: number): Promise<void> {
  await sql`DELETE FROM event_config WHERE id = ${eventId}`;
}

export async function updateConfig(eventId: number, data: Partial<EventConfig>): Promise<EventConfig> {
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
      updated_at       = NOW()
    WHERE id = ${eventId}
    RETURNING *
  `;
  return rows[0];
}

export async function updateEventStatus(eventId: number, status: EventStatus): Promise<EventConfig> {
  const { rows } = await sql<EventConfig>`
    UPDATE event_config SET status = ${status}, updated_at = NOW()
    WHERE id = ${eventId}
    RETURNING *
  `;
  return rows[0];
}

export async function getSnapshots(eventId: number): Promise<SalesSnapshot[]> {
  const { rows } = await sql<SalesSnapshot>`
    SELECT * FROM sales_snapshot WHERE event_id = ${eventId} ORDER BY created_at DESC
  `;
  return rows;
}

export async function saveSnapshot(s: Omit<SalesSnapshot, 'id' | 'created_at'>): Promise<SalesSnapshot> {
  const { rows } = await sql<SalesSnapshot>`
    INSERT INTO sales_snapshot (event_id, label, qty_gen, qty_vip, qty_lounge_ind, qty_lounge_mesa, ingreso, pl)
    VALUES (${s.event_id}, ${s.label}, ${s.qty_gen}, ${s.qty_vip}, ${s.qty_lounge_ind}, ${s.qty_lounge_mesa}, ${s.ingreso}, ${s.pl})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteSnapshot(id: number): Promise<void> {
  await sql`DELETE FROM sales_snapshot WHERE id = ${id}`;
}

export interface Expense {
  id: number;
  event_id: number;
  category: string;
  label: string | null;
  amount: number;
  created_at: string;
}

export async function getExpenses(eventId: number): Promise<Expense[]> {
  const { rows } = await sql<Expense>`
    SELECT * FROM expenses WHERE event_id = ${eventId} ORDER BY category, created_at
  `;
  return rows;
}

export async function saveExpense(e: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
  const { rows } = await sql<Expense>`
    INSERT INTO expenses (event_id, category, label, amount)
    VALUES (${e.event_id}, ${e.category}, ${e.label ?? null}, ${e.amount})
    RETURNING *
  `;
  return rows[0];
}

export async function updateExpense(id: number, amount: number, label: string | null): Promise<Expense> {
  const { rows } = await sql<Expense>`
    UPDATE expenses SET amount = ${amount}, label = ${label ?? null} WHERE id = ${id} RETURNING *
  `;
  return rows[0];
}

export async function deleteExpense(id: number): Promise<void> {
  await sql`DELETE FROM expenses WHERE id = ${id}`;
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

export async function getSales(eventId: number): Promise<TicketSale[]> {
  const { rows } = await sql<TicketSale>`
    SELECT * FROM ticket_sales WHERE event_id = ${eventId} ORDER BY created_at DESC
  `;
  return rows;
}

export async function saveSale(s: Omit<TicketSale, 'id' | 'created_at'>): Promise<TicketSale> {
  const { rows } = await sql<TicketSale>`
    INSERT INTO ticket_sales (event_id, buyer_name, zone, ticket_type, group_size, payment_method, unit_price, total_amount, notes)
    VALUES (${s.event_id}, ${s.buyer_name}, ${s.zone}, ${s.ticket_type}, ${s.group_size}, ${s.payment_method}, ${s.unit_price}, ${s.total_amount}, ${s.notes ?? null})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteSale(id: number): Promise<void> {
  await sql`DELETE FROM ticket_sales WHERE id = ${id}`;
}

export interface EventZone {
  id: number;
  event_id: number;
  name: string;
  capacity: number;
  price: number;
  created_at: string;
}

export async function getZones(eventId: number): Promise<EventZone[]> {
  const { rows } = await sql<EventZone>`
    SELECT * FROM event_zones WHERE event_id = ${eventId} ORDER BY created_at
  `;
  return rows;
}

export async function saveZone(z: Omit<EventZone, 'id' | 'created_at'>): Promise<EventZone> {
  const { rows } = await sql<EventZone>`
    INSERT INTO event_zones (event_id, name, capacity, price)
    VALUES (${z.event_id}, ${z.name}, ${z.capacity}, ${z.price})
    RETURNING *
  `;
  return rows[0];
}

export async function deleteZone(id: number): Promise<void> {
  await sql`DELETE FROM event_zones WHERE id = ${id}`;
}
