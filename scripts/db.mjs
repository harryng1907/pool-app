// Runs SQL files against the Supabase database.
//   node scripts/db.mjs setup          → schema.sql + seed.sql
//   node scripts/db.mjs seed           → seed.sql only (resets demo data)
//   node scripts/db.mjs file <path>    → any SQL file
// Needs SUPABASE_DB_URL in .env.local (Supabase → Connect → Session pooler).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local'), quiet: true });

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('Missing SUPABASE_DB_URL in .env.local');
  process.exit(1);
}

const [cmd = 'setup', arg] = process.argv.slice(2);
const files =
  cmd === 'setup' ? ['supabase/schema.sql', 'supabase/seed.sql']
  : cmd === 'seed' ? ['supabase/seed.sql']
  : cmd === 'file' ? [arg]
  : [];
if (!files.length) {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const file of files) {
    const sql = readFileSync(path.join(root, file), 'utf8');
    process.stdout.write(`Running ${file} … `);
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    console.log('ok');
  }
  // Tell the API layer to pick up new tables/functions straight away.
  await client.query(`notify pgrst, 'reload schema'`);
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('\nFailed:', err.message);
  if (err.position) console.error('at character', err.position);
  process.exitCode = 1;
} finally {
  await client.end();
}
