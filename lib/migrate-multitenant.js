// Multitenant migration — run with: node lib/migrate-multitenant.js
// Idempotent: safe to re-run. Creates orgs/users/memberships/invitations,
// adds org_id to domain tables, and bootstraps the super-admin + first org.

const crypto = require('crypto');

// Load env (POSTGRES_URL) the same way db-init does.
require('fs').readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
});
if (!process.env.POSTGRES_URL && process.env.WEM_POSTGRES_URL)
  process.env.POSTGRES_URL = process.env.WEM_POSTGRES_URL;

const { sql } = require('@vercel/postgres');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const SUPERADMIN_EMAIL = 'garias1989@gmail.com';
const BOOTSTRAP_ORG = 'Midnight Trouble';

async function migrate() {
  console.log('— Multitenant migration —');

  await sql`
    CREATE TABLE IF NOT EXISTS orgs (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_superadmin BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMP DEFAULT NOW()
    );`;

  await sql`
    CREATE TABLE IF NOT EXISTS memberships (
      id         SERIAL PRIMARY KEY,
      org_id     INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role       TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (org_id, user_id)
    );`;

  await sql`
    CREATE TABLE IF NOT EXISTS invitations (
      id          SERIAL PRIMARY KEY,
      org_id      INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      email       TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'member',
      token       TEXT NOT NULL UNIQUE,
      invited_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      accepted_at TIMESTAMP,
      expires_at  TIMESTAMP NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW()
    );`;

  // Scope domain root tables by org.
  await sql`ALTER TABLE event_config      ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;`;
  await sql`ALTER TABLE academia_students ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;`;
  await sql`ALTER TABLE contacts          ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;`;

  await sql`CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_config_org ON event_config(org_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_students_org      ON academia_students(org_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_contacts_org      ON contacts(org_id);`;

  console.log('✓ Tables + columns ready');

  // ── Bootstrap org ──
  let { rows: orgRows } = await sql`SELECT id FROM orgs ORDER BY id LIMIT 1`;
  let orgId;
  if (orgRows.length === 0) {
    ({ rows: orgRows } = await sql`INSERT INTO orgs (name) VALUES (${BOOTSTRAP_ORG}) RETURNING id`);
    orgId = orgRows[0].id;
    console.log(`✓ Created bootstrap org "${BOOTSTRAP_ORG}" (id ${orgId})`);
  } else {
    orgId = orgRows[0].id;
    console.log(`• Org already exists (id ${orgId})`);
  }

  // ── Bootstrap super-admin user ──
  const { rows: existing } = await sql`SELECT id FROM users WHERE email = ${SUPERADMIN_EMAIL}`;
  let userId;
  let generatedPassword = null;
  if (existing.length === 0) {
    generatedPassword = 'Admin-' + crypto.randomBytes(4).toString('hex') + '-' + Math.floor(1000 + Math.random() * 9000);
    const ph = hashPassword(generatedPassword);
    const { rows } = await sql`
      INSERT INTO users (email, name, password_hash, is_superadmin)
      VALUES (${SUPERADMIN_EMAIL}, ${'Gabo'}, ${ph}, ${true})
      RETURNING id`;
    userId = rows[0].id;
    console.log(`✓ Created super-admin ${SUPERADMIN_EMAIL} (id ${userId})`);
  } else {
    userId = existing[0].id;
    await sql`UPDATE users SET is_superadmin = true WHERE id = ${userId}`;
    console.log(`• Super-admin already exists (id ${userId})`);
  }

  // ── Membership: super-admin is owner of bootstrap org ──
  await sql`
    INSERT INTO memberships (org_id, user_id, role)
    VALUES (${orgId}, ${userId}, 'owner')
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'owner'`;
  console.log('✓ Membership (owner) ensured');

  // ── Backfill existing domain rows to the bootstrap org ──
  const a = await sql`UPDATE event_config      SET org_id = ${orgId} WHERE org_id IS NULL`;
  const b = await sql`UPDATE academia_students SET org_id = ${orgId} WHERE org_id IS NULL`;
  const c = await sql`UPDATE contacts          SET org_id = ${orgId} WHERE org_id IS NULL`;
  console.log(`✓ Backfilled org_id — events:${a.rowCount} students:${b.rowCount} contacts:${c.rowCount}`);

  // ── Enforce NOT NULL now that rows are backfilled ──
  try {
    await sql`ALTER TABLE event_config      ALTER COLUMN org_id SET NOT NULL`;
    await sql`ALTER TABLE academia_students ALTER COLUMN org_id SET NOT NULL`;
    await sql`ALTER TABLE contacts          ALTER COLUMN org_id SET NOT NULL`;
    console.log('✓ org_id set NOT NULL on domain tables');
  } catch (e) {
    console.log('• Could not set NOT NULL (leaving nullable):', e.message.split('\n')[0]);
  }

  console.log('\n=== DONE ===');
  if (generatedPassword) {
    console.log('SUPERADMIN_LOGIN:', SUPERADMIN_EMAIL, '/', generatedPassword);
  } else {
    console.log('Super-admin already had a password (unchanged).');
  }
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
