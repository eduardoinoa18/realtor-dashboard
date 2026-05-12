import { NextRequest, NextResponse } from 'next/server';
import { runPulseCheck } from '@/lib/pulse';
import { isCronAuthorized } from '@/lib/cronAuth';

export async function GET(req: NextRequest) {
  const auth = isCronAuthorized(req);
  if (!auth.ok) {
    const status = auth.message === 'CRON_SECRET not configured' ? 500 : 401;
    return NextResponse.json({ ok: false, error: auth.message }, { status });
  }

  try {
    const result = await runPulseCheck();
    return NextResponse.json({ ok: true, result, ranAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown pulse error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
