import { isOperator } from '@/lib/env';
import { seedDemoMemory } from '@/lib/memory';

/** POST /api/memory/seed — writes the synthetic Room 204 incidents into Agent Memory. Operator-only. */
export async function POST(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    const results = await seedDemoMemory();
    return Response.json({ seeded: results, note: 'Synthetic demo data (labels: demo=true).' });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
