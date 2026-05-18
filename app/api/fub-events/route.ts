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

async function resolveEduardoUserId(apiKey: string) {
  try {
    const usersJson = await fetchFUB('/users?limit=100', apiKey);
    const users = Array.isArray(usersJson?.users) ? usersJson.users : [];
    const matched = users.find((u: any) => {
      const full = `${String(u?.name || u?.firstName || '').toLowerCase()} ${String(u?.lastName || '').toLowerCase()}`;
      const email = String(u?.email || '').toLowerCase();
      return (full.includes('eduardo') && full.includes('inoa')) || email.includes('eduardoinoa18');
    });
    return matched?.id ? String(matched.id) : '';
  } catch {
    return '';
  }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return withHeaders(NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 }));
  }

  const since = String(
    req.nextUrl.searchParams.get('since') || new Date(Date.now() - (7 * 86400000)).toISOString().slice(0, 10)
  );

  try {
    const maybeUserId = await resolveEduardoUserId(apiKey);
    let offset = 0;
    let hasMore = true;
    const all: any[] = [];

    while (hasMore && all.length < 2000) {
      const params = new URLSearchParams({
        limit: '100',
        offset: String(offset),
        after: `${since}T00:00:00Z`,
        sort: 'created',
        direction: 'desc',
      });
      if (maybeUserId) params.set('userId', maybeUserId);

      const json = await fetchFUB(`/events?${params.toString()}`, apiKey);
      const events = Array.isArray(json?.events) ? json.events : [];
      all.push(...events);
      hasMore = events.length === 100;
      offset += 100;
    }

    const events = all.map((e: any) => ({
      id: e?.id,
      type: e?.type,
      created: e?.created || e?.createdAt || null,
      personId: e?.personId || e?.person?.id || null,
      message: String(e?.message || e?.description || e?.content || '').slice(0, 200),
      direction: e?.direction || null,
      duration: e?.duration || null,
    }));

    const res = NextResponse.json({ events, count: events.length, since });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'fub_events_failed' }, { status: 500 }));
  }
}
