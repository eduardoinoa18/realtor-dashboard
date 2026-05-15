import { NextResponse } from 'next/server';
import { client } from '@/lib/claude';

const HAIKU_MODEL = 'claude-3-5-haiku-20241022';
const SONNET_MODEL = 'claude-3-5-sonnet-20241022';

export async function GET() {
  const keyConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  if (!keyConfigured) {
    return NextResponse.json({
      connected: false,
      keyConfigured: false,
      sonnetAvailable: false,
      haikuAvailable: false,
      error: 'ANTHROPIC_API_KEY is missing',
    });
  }

  try {
    const sonnetProbe = await client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'ping' }],
    });

    return NextResponse.json({
      connected: true,
      keyConfigured: true,
      sonnetAvailable: true,
      haikuAvailable: true,
      probeModel: sonnetProbe.model,
    });
  } catch (err: any) {
    const message = String(err?.message || 'unknown_error');
    const sonnetUnavailable = message.includes('not_found_error') || message.includes('model');

    if (!sonnetUnavailable) {
      return NextResponse.json({
        connected: false,
        keyConfigured: true,
        sonnetAvailable: false,
        haikuAvailable: false,
        error: message,
      });
    }

    try {
      const haikuProbe = await client.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      });

      return NextResponse.json({
        connected: true,
        keyConfigured: true,
        sonnetAvailable: false,
        haikuAvailable: true,
        probeModel: haikuProbe.model,
        warning: 'Sonnet unavailable; running in Haiku mode.',
      });
    } catch (haikuErr: any) {
      return NextResponse.json({
        connected: false,
        keyConfigured: true,
        sonnetAvailable: false,
        haikuAvailable: false,
        error: String(haikuErr?.message || message),
      });
    }
  }
}
