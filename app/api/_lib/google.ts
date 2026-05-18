export async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN_EDUARDO;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth environment variables');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json?.access_token) {
    throw new Error('Google token refresh response missing access_token');
  }

  return String(json.access_token);
}
