import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';

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

export async function GET() {
  const cfg = getImapConfig();
  const configured = Boolean(cfg.host && cfg.user && cfg.pass && Number.isFinite(cfg.port));

  if (!configured) {
    return NextResponse.json({
      connected: false,
      configured: false,
      reason: 'missing_imap_environment_variables',
      required: ['EMAIL_IMAP_HOST', 'EMAIL_IMAP_PORT', 'EMAIL_IMAP_SECURE', 'EMAIL_IMAP_USER', 'EMAIL_IMAP_PASS'],
      mailbox: cfg.mailbox,
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
    const info = await client.mailboxOpen(cfg.mailbox);

    return NextResponse.json({
      connected: true,
      configured: true,
      mailbox: info.path,
      messageCount: Number(info.exists || 0),
      uidNext: Number(info.uidNext || 0),
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      configured: true,
      mailbox: cfg.mailbox,
      reason: 'imap_connection_failed',
      error: String(err?.message || 'imap_connection_failed'),
    });
  } finally {
    try {
      await client.logout();
    } catch {
      // noop
    }
  }
}
