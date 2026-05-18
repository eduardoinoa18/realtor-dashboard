import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return withHeaders(NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 }));
  }

  const since = String(
    req.nextUrl.searchParams.get('since') || `${new Date().getFullYear()}-01-01`
  );

  try {
    let offset = 0;
    let hasMore = true;
    const all: any[] = [];

    while (hasMore && all.length < 2000) {
      const params = new URLSearchParams({
        stage: 'Closed',
        since,
        limit: '100',
        offset: String(offset),
      });
      const json = await fetchFUB(`/deals?${params.toString()}`, apiKey);
      const batch = Array.isArray(json?.deals) ? json.deals : [];
      all.push(...batch);
      hasMore = batch.length === 100;
      offset += 100;
    }

    const deals = all.map((d: any) => ({
      id: d?.id,
      title: d?.name || d?.title || 'Closed Deal',
      stage: d?.stage || null,
      closeDate: d?.closedDate || d?.closeDate || null,
      amount: Number(d?.value || d?.amount || 0),
      personId: d?.personId || d?.person?.id || null,
      personName: d?.person?.name || null,
      source: d?.source || null,
    }));

    const res = NextResponse.json({ deals, count: deals.length, since });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'fub_deals_failed' }, { status: 500 }));
  }
}
