import { NextRequest, NextResponse } from 'next/server';

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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const existingRefreshToken = process.env.GOOGLE_REFRESH_TOKEN_EDUARDO;

  if (!clientId || !clientSecret) {
    return withHeaders(NextResponse.json({ error: 'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set' }, { status: 500 }));
  }

  if (existingRefreshToken) {
    return withHeaders(NextResponse.json({
      error: 'Google refresh token already configured. Callback is disabled.',
    }, { status: 403 }));
  }

  const code = String(req.nextUrl.searchParams.get('code') || '').trim();
  if (!code) {
    return withHeaders(NextResponse.json({ error: 'Missing code parameter' }, { status: 400 }));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://realtor-dashboard-neon.vercel.app'}/api/google-oauth-callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      return withHeaders(NextResponse.json({
        error: `Google OAuth exchange failed (${tokenRes.status})`,
        detail: tokenJson,
      }, { status: 500 }));
    }

    const refreshToken = String(tokenJson?.refresh_token || '').trim();
    if (!refreshToken) {
      return withHeaders(NextResponse.json({
        error: 'No refresh token returned. Re-run consent with prompt=consent and access_type=offline.',
        detail: tokenJson,
      }, { status: 500 }));
    }

    return withHeaders(NextResponse.json({
      ok: true,
      message: 'Copy this refresh token into Vercel env GOOGLE_REFRESH_TOKEN_EDUARDO, then redeploy.',
      refreshToken,
    }));
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'google_oauth_callback_failed' }, { status: 500 }));
  }
}
