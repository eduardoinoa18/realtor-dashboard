import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_OWNER_EMAIL = 'eduardoinoa18@gmail.com';

function isAllowedEmail(email: string) {
  const configured = process.env.AUTH_INSTANT_ACCESS_EMAILS;
  const allowList = (configured || DEFAULT_OWNER_EMAIL)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowList.includes(email.toLowerCase());
}

function normalizeActionLink(actionLink: string, origin: string, redirectTo: string) {
  try {
    const parsed = new URL(actionLink);
    const normalizedOrigin = new URL(origin);

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.protocol = normalizedOrigin.protocol;
      parsed.host = normalizedOrigin.host;
    }

    if (parsed.hostname.includes('.supabase.co') && parsed.pathname.includes('/auth/v1/verify')) {
      parsed.searchParams.set('redirect_to', redirectTo);
    }

    return parsed.toString();
  } catch {
    return actionLink;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server auth config missing' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const nextPath = String(body?.next || '/today');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json({ error: 'Instant access is not enabled for this email' }, { status: 403 });
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const magic = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });

    let actionLink = magic.data?.properties?.action_link;
    let selectedType = 'magiclink';
    let selectedError = magic.error;

    if (!actionLink) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });

      if (created.error) {
        selectedError = created.error;
      } else {
        const retryMagic = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo },
        });
        actionLink = retryMagic.data?.properties?.action_link;
        selectedType = 'magiclink';
        selectedError = retryMagic.error || selectedError;
      }
    }

    if (!actionLink) {
      return NextResponse.json(
        { error: selectedError?.message || 'Failed to generate access link' },
        { status: 500 }
      );
    }

    const normalizedLink = normalizeActionLink(actionLink, origin, redirectTo);

    return NextResponse.json({
      actionLink: normalizedLink,
      type: selectedType,
      email,
      redirectTo,
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || 'Unexpected server error') }, { status: 500 });
  }
}
