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

  const personId = String(req.nextUrl.searchParams.get('personId') || '').trim();
  if (!personId) {
    return withHeaders(NextResponse.json({ error: 'personId is required' }, { status: 400 }));
  }

  try {
    const params = new URLSearchParams({ personId, limit: '50' });
    const json = await fetchFUB(`/notes?${params.toString()}`, apiKey);
    const rows = Array.isArray(json?.notes) ? json.notes : [];

    const notes = rows.map((n: any) => ({
      id: n?.id,
      personId: n?.personId || personId,
      created: n?.created || n?.createdAt || null,
      updated: n?.updated || n?.updatedAt || null,
      body: String(n?.body || n?.content || n?.text || '').slice(0, 1000),
      userId: n?.userId || n?.author?.id || null,
      userName: n?.author?.name || null,
    }));

    const res = NextResponse.json({ notes, count: notes.length, personId });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'fub_notes_failed' }, { status: 500 }));
  }
}
