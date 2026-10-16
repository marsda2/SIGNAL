// Fail-fast check: can we reach SurrealDB Core with the SURREALDB_* creds, write a row and read it back?
// Run: npm run smoke:core   (loads .env.local via node --env-file)
import { Surreal } from 'surrealdb';

const { SURREALDB_URL, SURREALDB_USERNAME, SURREALDB_PASSWORD, SURREALDB_NAMESPACE, SURREALDB_DATABASE } = process.env;
if (!SURREALDB_URL?.trim() || !SURREALDB_USERNAME?.trim() || !SURREALDB_PASSWORD?.trim()) {
  console.error('Missing SURREALDB_URL / SURREALDB_USERNAME / SURREALDB_PASSWORD. Fill .env.local first.');
  process.exit(1);
}

const namespace = SURREALDB_NAMESPACE?.trim() || 'signal';
const database = SURREALDB_DATABASE?.trim() || 'demo';
const username = SURREALDB_USERNAME.trim();
const password = SURREALDB_PASSWORD.trim();
const authentication =
  process.env.SURREALDB_AUTH_LEVEL?.trim() === 'root' ? { username, password } : { namespace, database, username, password };

const db = new Surreal();
await db.connect(SURREALDB_URL.trim(), { namespace, database, authentication });
console.log('connect: ok');

const stamp = new Date().toISOString();
await db.query('UPSERT smoke:core CONTENT { checkedAt: $stamp }', { stamp }).json();
const [rows] = await db.query('SELECT checkedAt FROM smoke:core').json();
const readBack = Array.isArray(rows) ? rows[0]?.checkedAt : rows?.checkedAt;
console.log('read-back:', readBack === stamp ? 'ok' : `MISMATCH (${JSON.stringify(rows)})`);

await db.query('DEFINE TABLE IF NOT EXISTS incident SCHEMALESS;');
const [counts] = await db.query('SELECT count() AS n FROM incident GROUP ALL').json();
console.log('incidents in Core:', (Array.isArray(counts) ? counts[0]?.n : counts?.n) ?? 0);

await db.close();
process.exit(readBack === stamp ? 0 : 1);
