import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Server-side proxy to Nominatim. Required because Nominatim rejects requests
 * without a sensible User-Agent and we want to centralize the policy.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 3) return NextResponse.json({ results: [] });
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PCR-Pilot-Demo/1.0 (demo only — not for production use)',
        'Accept-Language': 'en',
      },
      // Cache 60s — Nominatim's policy permits low-volume use
      next: { revalidate: 60 },
    });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    return NextResponse.json({ results: data });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
