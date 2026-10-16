// Reproducible check in a clean Daytona sandbox: upload the repo (no secrets, no node_modules), npm ci,
// typecheck, NFC unit tests. With --serve, also builds the web app, serves it and prints a Daytona preview URL.
// Usage: npm run daytona:smoke [-- --serve] [-- --keep]
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { Daytona } from '@daytona/sdk';

const SERVE = process.argv.includes('--serve');
const KEEP = process.argv.includes('--keep') || SERVE;
const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', '.vercel', 'web-build', '.claude']);
const SKIP_FILE = (name) => name.startsWith('.env') && name !== '.env.example';
const ROOT = process.cwd();
const REMOTE = 'signal';

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) await walk(join(dir, e.name), out);
    } else if (!SKIP_FILE(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
const t0 = Date.now();
console.log('Creating sandbox…');
const sandbox = await daytona.create({ language: 'typescript', labels: { app: 'signal', purpose: 'smoke' } });
console.log(`Sandbox ${sandbox.id} ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const results = [];
try {
  const files = await walk(ROOT);
  console.log(`Uploading ${files.length} files…`);
  const uploads = await Promise.all(
    files.map(async (f) => ({ source: await readFile(f), destination: `${REMOTE}/${relative(ROOT, f).split(sep).join('/')}` })),
  );
  for (let i = 0; i < uploads.length; i += 100) await sandbox.fs.uploadFiles(uploads.slice(i, i + 100), 300);

  const steps = [
    ['node --version && npm --version', 60],
    ['npm ci --no-audit --no-fund', 900],
    ['npm run typecheck', 300],
    ['npm run test:nfc', 300],
  ];
  if (SERVE) steps.push(['npm run build:web', 900]);
  for (const [cmd, timeout] of steps) {
    const started = Date.now();
    const r = await sandbox.process.executeCommand(cmd, REMOTE, undefined, timeout);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    results.push({ cmd, exitCode: r.exitCode, secs });
    console.log(`${r.exitCode === 0 ? '✓' : '✗'} ${cmd} (${secs}s)`);
    if (r.exitCode !== 0) {
      console.log(String(r.result).slice(-3000));
      break;
    }
  }

  if (SERVE && results.every((r) => r.exitCode === 0)) {
    await sandbox.process.createSession('web');
    await sandbox.process.executeSessionCommand('web', { command: `cd ${REMOTE} && npx expo serve --port 8081`, runAsync: true });
    const preview = await sandbox.getPreviewLink(8081);
    console.log(`\nPreview (API routes need env vars set in the sandbox to call providers): ${preview.url}`);
  }
} finally {
  if (KEEP) console.log(`Keeping sandbox ${sandbox.id} (delete it from the Daytona dashboard when done).`);
  else {
    await daytona.delete(sandbox);
    console.log('Sandbox deleted.');
  }
}

const ok = results.length > 0 && results.every((r) => r.exitCode === 0);
console.log(JSON.stringify({ sandbox: sandbox.id, ok, results }, null, 2));
process.exit(ok ? 0 : 1);
