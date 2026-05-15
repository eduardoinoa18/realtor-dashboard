import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

interface InboxEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
}

function getImapConfig() {
  const host = String(process.env.EMAIL_IMAP_HOST || '').trim();
  const port = Number(process.env.EMAIL_IMAP_PORT || 993);
  const secureRaw = String(process.env.EMAIL_IMAP_SECURE || 'true').toLowerCase();
  const secure = secureRaw !== 'false';
  const user = String(process.env.EMAIL_IMAP_USER || '').trim();
  const pass = String(process.env.EMAIL_IMAP_PASS || '').trim();
  const mailbox = String(process.env.EMAIL_IMAP_MAILBOX || 'INBOX').trim() || 'INBOX';

  return { host, port, secure, user, pass, mailbox };
}

function toSnippet(value: string, max = 420) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function readAddressText(value: any) {
  if (!value) return '';
  if (typeof value?.text === 'string') return value.text;
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry?.address || entry?.name || '').trim())
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

export async function GET(req: NextRequest) {
  const cfg = getImapConfig();
  const configured = Boolean(cfg.host && cfg.user && cfg.pass && Number.isFinite(cfg.port));
  const limit = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get('limit') || '15')));
  const days = Math.max(1, Math.min(30, Number(req.nextUrl.searchParams.get('days') || '7')));

  if (!configured) {
    return NextResponse.json({
      emails: [],
      count: 0,
      connected: false,
      configured: false,
      reason: 'missing_imap_environment_variables',
    });
  }

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    logger: false,
  });

  try {
    await client.connect();
    const mailboxInfo = await client.mailboxOpen(cfg.mailbox);
    const exists = Number(mailboxInfo.exists || 0);
    if (!exists) {
      return NextResponse.json({ emails: [], count: 0, connected: true, configured: true, mailbox: cfg.mailbox });
    }

    const start = Math.max(1, exists - limit + 1);
    const range = `${start}:*`;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const emails: InboxEmail[] = [];

    for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true, internalDate: true })) {
      const msgTime = msg.internalDate ? new Date(msg.internalDate).getTime() : 0;
      if (msgTime && msgTime < cutoff) continue;

      const parsed = msg.source
        ? await simpleParser(Buffer.from(msg.source))
        : null;

      const subject = String(parsed?.subject || msg.envelope?.subject || '(no subject)');
      const from = readAddressText(parsed?.from) || (msg.envelope?.from || []).map((f) => `${f.name || ''} <${f.address || ''}>`.trim()).join(', ');
      const to = readAddressText(parsed?.to) || (msg.envelope?.to || []).map((f) => `${f.name || ''} <${f.address || ''}>`.trim()).join(', ');
      const date = parsed?.date?.toISOString() || (msg.internalDate ? new Date(msg.internalDate).toISOString() : new Date().toISOString());
      const textContent = String(parsed?.text || parsed?.html || '');

      emails.push({
        id: `imap-${String(msg.uid || date)}`,
        subject,
        from: from || 'Unknown sender',
        to: to || cfg.user,
        date,
        snippet: toSnippet(textContent),
      });
    }

    const ordered = emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      emails: ordered,
      count: ordered.length,
      connected: true,
      configured: true,
      mailbox: cfg.mailbox,
      diagnostics: {
        range,
        days,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      emails: [],
      count: 0,
      connected: false,
      configured: true,
      reason: 'imap_fetch_failed',
      error: String(err?.message || 'imap_fetch_failed'),
    });
  } finally {
    try {
      await client.logout();
    } catch {
      // noop
    }
  }
}
