// lib/db-init.js
// Run with: node lib/db-init.js
// Requires POSTGRES_URL env var set (loads from .env.local automatically)

require('fs').readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
});
// Remap WEM_ prefixed vars to what @vercel/postgres expects
if (!process.env.POSTGRES_URL && process.env.WEM_POSTGRES_URL)
  process.env.POSTGRES_URL = process.env.WEM_POSTGRES_URL;

const { sql } = require('@vercel/postgres');

async function init() {
  console.log('Initializing database...');

  // Event config table — stores prices and cost per event
  await sql`
    CREATE TABLE IF NOT EXISTS event_config (
      id          SERIAL PRIMARY KEY,
      event_name  TEXT NOT NULL DEFAULT 'WEM Event',
      price_gen   INTEGER NOT NULL DEFAULT 9000,
      price_vip   INTEGER NOT NULL DEFAULT 12000,
      price_lounge_ind  INTEGER NOT NULL DEFAULT 16000,
      price_lounge_mesa INTEGER NOT NULL DEFAULT 44000,
      costo_neto  INTEGER NOT NULL DEFAULT 1219676,
      cap_gen     INTEGER NOT NULL DEFAULT 100,
      cap_vip     INTEGER NOT NULL DEFAULT 40,
      cap_lounge  INTEGER NOT NULL DEFAULT 25,
      updated_at  TIMESTAMP DEFAULT NOW()
    );
  `;

  // Add type column if missing (safe to re-run)
  await sql`
    ALTER TABLE event_config
      ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'event';
  `;

  // Add status column if missing (safe to re-run)
  await sql`
    ALTER TABLE event_config
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  `;

  // Insert default config if empty
  await sql`
    INSERT INTO event_config (event_name, type)
    SELECT 'WEM Event', 'event'
    WHERE NOT EXISTS (SELECT 1 FROM event_config LIMIT 1);
  `;

  // Sales snapshots — for tracking test scenarios
  await sql`
    CREATE TABLE IF NOT EXISTS sales_snapshot (
      id          SERIAL PRIMARY KEY,
      event_id    INTEGER NOT NULL REFERENCES event_config(id) ON DELETE CASCADE,
      label       TEXT NOT NULL,
      qty_gen     INTEGER NOT NULL DEFAULT 0,
      qty_vip     INTEGER NOT NULL DEFAULT 0,
      qty_lounge_ind   INTEGER NOT NULL DEFAULT 0,
      qty_lounge_mesa  INTEGER NOT NULL DEFAULT 0,
      ingreso     INTEGER NOT NULL DEFAULT 0,
      pl          INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `;

  // Expenses table — line items per event
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id         SERIAL PRIMARY KEY,
      event_id   INTEGER NOT NULL REFERENCES event_config(id) ON DELETE CASCADE,
      category   TEXT NOT NULL,
      label      TEXT,
      amount     INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Ticket sales table
  await sql`
    CREATE TABLE IF NOT EXISTS ticket_sales (
      id              SERIAL PRIMARY KEY,
      event_id        INTEGER NOT NULL REFERENCES event_config(id) ON DELETE CASCADE,
      buyer_name      TEXT NOT NULL,
      zone            TEXT NOT NULL,
      ticket_type     TEXT NOT NULL DEFAULT 'individual',
      group_size      INTEGER NOT NULL DEFAULT 1,
      payment_method  TEXT NOT NULL,
      unit_price      INTEGER NOT NULL DEFAULT 0,
      total_amount    INTEGER NOT NULL DEFAULT 0,
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    );
  `;

  console.log('✓ Tables created');
  console.log('✓ Default config inserted');
  process.exit(0);
}

init().catch(e => { console.error(e); process.exit(1); });
