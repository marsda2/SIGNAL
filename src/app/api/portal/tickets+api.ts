import { coreBackend, listIncidents, listSpaces } from '@/lib/core';

/** GET /api/portal/tickets — the demo maintenance portal's own read API (backed by Core). */
export async function GET() {
  try {
    const incidents = await listIncidents();
    const spaces = await listSpaces();
    const tickets = incidents.map((incident) => {
      const space = spaces.find((s) => s.id === incident.locationId);
      return {
        ...incident,
        locationName: space?.name ?? incident.locationId,
        assetName: space?.assets.find((a) => a.id === incident.assetId)?.name ?? incident.assetId ?? 'Equipment not specified',
      };
    });
    return Response.json({ backend: coreBackend(), tickets });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
