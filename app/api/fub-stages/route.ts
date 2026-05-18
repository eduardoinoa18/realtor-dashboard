import { NextResponse } from 'next/server';
import { fetchFUB } from '@/lib/fub';

const CACHE_CONTROL = 's-maxage=60, stale-while-revalidate=300';

function withHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return withHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET() {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return withHeaders(NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 }));
  }

  try {
    const json = await fetchFUB('/stages', apiKey);
    const rows = Array.isArray(json?.stages) ? json.stages : [];
    const stages = rows.map((s: any) => ({
      id: s?.id,
      name: s?.name || s?.title || String(s?.id || 'Stage'),
      order: Number(s?.order || s?.position || 0),
      isClosed: Boolean(s?.isClosed || false),
    }));

    const res = NextResponse.json({ stages, count: stages.length });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'fub_stages_failed' }, { status: 500 }));
  }
}
