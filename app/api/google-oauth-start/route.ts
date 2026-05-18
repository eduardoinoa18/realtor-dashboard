import { NextResponse } from 'next/server';

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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const existingRefreshToken = process.env.GOOGLE_REFRESH_TOKEN_EDUARDO;

  if (!clientId) {
    return withHeaders(NextResponse.json({ error: 'GOOGLE_CLIENT_ID not set' }, { status: 500 }));
  }

  if (existingRefreshToken) {
    return withHeaders(NextResponse.json({
      error: 'Google refresh token already configured. OAuth start is disabled.',
    }, { status: 403 }));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://realtor-dashboard-neon.vercel.app'}/api/google-oauth-callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ].join(' '),
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
