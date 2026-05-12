import { NextRequest } from 'next/server';

export function isCronAuthorized(req: NextRequest): { ok: boolean; message?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, message: 'CRON_SECRET not configured' };
  }

  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get('secret');
  const vercelCron = req.headers.get('x-vercel-cron');

  // Allow Vercel cron invocations and local/manual calls with secret.
  const authorized = vercelCron === '1' || bearer === secret || querySecret === secret;

  if (!authorized) {
    return { ok: false, message: 'Unauthorized cron invocation' };
  }

  return { ok: true };
}
