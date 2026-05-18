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
  const address = String(req.nextUrl.searchParams.get('address') || '').trim();
  if (!address) {
    return withHeaders(NextResponse.json({ error: 'address is required' }, { status: 400 }));
  }

  try {
    const token = await getGoogleAccessToken();
    const query = encodeURIComponent(`from:${address} OR to:${address}`);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listRes.ok) {
      throw new Error(`Gmail list API ${listRes.status}`);
    }

    const listJson = await listRes.json();
    const messages = Array.isArray(listJson?.messages) ? listJson.messages : [];

    const details = await Promise.all(
      messages.map(async (m: any) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(String(m.id))}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!msgRes.ok) return null;
        const msgJson = await msgRes.json();
        const headers = Array.isArray(msgJson?.payload?.headers) ? msgJson.payload.headers : [];
        const getHeader = (name: string) => String(headers.find((h: any) => String(h?.name || '').toLowerCase() === name.toLowerCase())?.value || '');
        return {
          id: msgJson?.id,
          threadId: msgJson?.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          internalDate: msgJson?.internalDate ? new Date(Number(msgJson.internalDate)).toISOString() : null,
          snippet: String(msgJson?.snippet || '').slice(0, 240),
        };
      })
    );

    const filtered = details.filter(Boolean);
    const res = NextResponse.json({ address, messages: filtered, count: filtered.length });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'gmail_thread_failed' }, { status: 500 }));
  }
}
