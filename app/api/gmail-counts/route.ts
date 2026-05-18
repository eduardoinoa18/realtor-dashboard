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

  try {
    const token = await getGoogleAccessToken();
    const dayStart = Math.floor(new Date(`${date}T00:00:00`).getTime() / 1000);
    const dayEnd = dayStart + 86400;

    const sentQ = `from:me after:${dayStart} before:${dayEnd}`;
    const recvQ = `to:me after:${dayStart} before:${dayEnd}`;

    const [sentRes, recvRes] = await Promise.all([
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(sentQ)}&maxResults=200`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(recvQ)}&maxResults=200`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!sentRes.ok || !recvRes.ok) {
      throw new Error(`Gmail API failed (${sentRes.status}/${recvRes.status})`);
    }

    const sentJson = await sentRes.json();
    const recvJson = await recvRes.json();

    const sent = Number(sentJson?.resultSizeEstimate || 0);
    const received = Number(recvJson?.resultSizeEstimate || 0);

    const res = NextResponse.json({ sent, received, date });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'gmail_counts_failed' }, { status: 500 }));
  }
}
