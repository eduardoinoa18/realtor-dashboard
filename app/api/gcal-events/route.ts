import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAccessToken } from '@/app/api/_lib/google';

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
  const date = String(req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10));
  const calendarId = String(req.nextUrl.searchParams.get('calendarId') || 'primary');
  const timeMin = new Date(`${date}T00:00:00`).toISOString();
  const timeMax = new Date(`${date}T23:59:59`).toISOString();

  try {
    const token = await getGoogleAccessToken();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
      `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      '&singleEvents=true&orderBy=startTime';

    const apiRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!apiRes.ok) {
      throw new Error(`Calendar API ${apiRes.status}`);
    }

    const json = await apiRes.json();
    const rows = Array.isArray(json?.items) ? json.items : [];

    const events = rows.map((e: any) => ({
      id: e?.id,
      start: e?.start?.dateTime || e?.start?.date || null,
      end: e?.end?.dateTime || e?.end?.date || null,
      title: e?.summary || '(no title)',
      location: e?.location || '',
      attendees: Array.isArray(e?.attendees)
        ? e.attendees.map((a: any) => ({ email: a?.email || '', name: a?.displayName || '' }))
        : [],
    }));

    const res = NextResponse.json({ events, date, calendarId });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'gcal_events_failed' }, { status: 500 }));
  }
}
