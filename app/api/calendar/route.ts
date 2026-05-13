import { NextRequest, NextResponse } from 'next/server';

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
  notes?: string;
  source: 'google';
}

export async function GET(req: NextRequest) {
  const calendarIdRaw = String(req.nextUrl.searchParams.get('calendarId') || '').trim();
  const icsUrlRaw = String(req.nextUrl.searchParams.get('icsUrl') || '').trim();
  const resolvedIcsUrl = calendarIdRaw ? buildGoogleIcsUrlFromCalendarId(calendarIdRaw) : icsUrlRaw;
  if (!resolvedIcsUrl) {
    return NextResponse.json({ events: [], count: 0, diagnostics: { reason: 'missing_calendar_source' } });
  }

  let icsUrl: URL;
  try {
    icsUrl = new URL(resolvedIcsUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid ICS URL' }, { status: 400 });
  }

  if (!isAllowedGoogleCalendarHost(icsUrl.hostname)) {
    return NextResponse.json({ error: 'Only Google Calendar ICS URLs are allowed' }, { status: 400 });
  }

  const startDate = String(req.nextUrl.searchParams.get('startDate') || new Date().toISOString().slice(0, 10));
  const endDate = String(req.nextUrl.searchParams.get('endDate') || startDate);

  try {
    const response = await fetch(icsUrl.toString(), {
      headers: {
        Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Unable to fetch Google Calendar feed (${response.status})` }, { status: 502 });
    }

    const body = await response.text();
    const events = parseIcsEvents(body, startDate, endDate);

    return NextResponse.json({
      events,
      count: events.length,
      diagnostics: {
        startDate,
        endDate,
        mode: calendarIdRaw ? 'calendarId' : 'icsUrl',
        calendarId: calendarIdRaw || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'calendar_sync_failed' }, { status: 500 });
  }
}

function buildGoogleIcsUrlFromCalendarId(calendarIdRaw: string) {
  const normalized = normalizeCalendarId(calendarIdRaw);
  if (!normalized) return '';
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(normalized)}/public/basic.ics`;
}

function normalizeCalendarId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const pathname = decodeURIComponent(url.pathname);
    const icalMatch = pathname.match(/\/calendar\/ical\/([^/]+)\/public\/basic\.ics/i);
    if (icalMatch?.[1]) {
      return icalMatch[1].trim();
    }
  } catch {
    // Non-URL value, continue.
  }

  return trimmed;
}

function isAllowedGoogleCalendarHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host.endsWith('calendar.google.com') || host.endsWith('googleusercontent.com');
}

function parseIcsEvents(rawIcs: string, startDate: string, endDate: string): CalendarEvent[] {
  const unfolded = rawIcs.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: CalendarEvent[] = [];
  let current: Record<string, string> | null = null;
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T23:59:59.999Z`).getTime();

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) {
        const parsed = convertEvent(current, start, end);
        if (parsed) events.push(parsed);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    current[key] = value;
  }

  return events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

function convertEvent(data: Record<string, string>, rangeStart: number, rangeEnd: number): CalendarEvent | null {
  const uid = data.UID || data['UID;VALUE=TEXT'];
  const summary = data.SUMMARY || 'Google Calendar Event';

  const startRaw = findIcsField(data, 'DTSTART');
  const endRaw = findIcsField(data, 'DTEND');
  const startAt = parseIcsDate(startRaw);
  const endAt = parseIcsDate(endRaw);
  if (!startAt) return null;

  const startMs = new Date(startAt).getTime();
  if (Number.isNaN(startMs) || startMs < rangeStart || startMs > rangeEnd) {
    return null;
  }

  return {
    id: uid || `google-${startAt}-${summary}`,
    title: summary,
    startAt,
    endAt: endAt || undefined,
    location: data.LOCATION || undefined,
    notes: data.DESCRIPTION || undefined,
    source: 'google',
  };
}

function findIcsField(data: Record<string, string>, prefix: string) {
  const exact = data[prefix];
  if (exact) return exact;
  const key = Object.keys(data).find((item) => item.startsWith(`${prefix};`));
  return key ? data[key] : '';
}

function parseIcsDate(value: string) {
  if (!value) return null;
  const clean = value.trim();

  if (/^\d{8}$/.test(clean)) {
    const yyyy = Number(clean.slice(0, 4));
    const mm = Number(clean.slice(4, 6)) - 1;
    const dd = Number(clean.slice(6, 8));
    return new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0)).toISOString();
  }

  if (/^\d{8}T\d{6}Z$/.test(clean)) {
    const yyyy = Number(clean.slice(0, 4));
    const mm = Number(clean.slice(4, 6)) - 1;
    const dd = Number(clean.slice(6, 8));
    const hh = Number(clean.slice(9, 11));
    const min = Number(clean.slice(11, 13));
    const sec = Number(clean.slice(13, 15));
    return new Date(Date.UTC(yyyy, mm, dd, hh, min, sec)).toISOString();
  }

  if (/^\d{8}T\d{6}$/.test(clean)) {
    const yyyy = Number(clean.slice(0, 4));
    const mm = Number(clean.slice(4, 6)) - 1;
    const dd = Number(clean.slice(6, 8));
    const hh = Number(clean.slice(9, 11));
    const min = Number(clean.slice(11, 13));
    const sec = Number(clean.slice(13, 15));
    return new Date(yyyy, mm, dd, hh, min, sec).toISOString();
  }

  const fallback = new Date(clean);
  if (Number.isNaN(fallback.getTime())) return null;
  return fallback.toISOString();
}