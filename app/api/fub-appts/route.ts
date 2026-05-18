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
    req.nextUrl.searchParams.get('since') || new Date(Date.now() - (7 * 86400000)).toISOString().slice(0, 10)
  );

  try {
    const params = new URLSearchParams({
      limit: '100',
      sort: 'start',
      direction: 'asc',
      startDate: since,
      endDate: new Date(Date.now() + (30 * 86400000)).toISOString().slice(0, 10),
    });

    const json = await fetchFUB(`/appointments?${params.toString()}`, apiKey);
    const rows = Array.isArray(json?.appointments) ? json.appointments : [];

    const appointments = rows.map((a: any) => ({
      id: a?.id,
      start: a?.start || a?.startDate || null,
      end: a?.end || a?.endDate || null,
      title: a?.title || a?.summary || a?.type || 'Appointment',
      type: a?.type || null,
      personId: a?.personId || a?.person?.id || null,
      personName: a?.person
        ? `${String(a.person.firstName || '').trim()} ${String(a.person.lastName || '').trim()}`.trim()
        : String(a?.personName || ''),
      location: a?.location || '',
    }));

    const res = NextResponse.json({ appointments, count: appointments.length, since });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'fub_appts_failed' }, { status: 500 }));
  }
}
