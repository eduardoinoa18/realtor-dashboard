import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/claude';
import { buildCoachSystemPrompt } from '@/lib/aiProject';

export async function POST(req: NextRequest) {
  const { topic, projectContext } = await req.json();
  const normalizedTopic = String(topic || '').trim() || 'local market update';

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      content: `Content ideas for ${normalizedTopic}:\n1) 30-second neighborhood market snapshot reel\n2) Buyer myth-busting carousel\n3) Seller prep checklist post\n4) Client win story with CTA to DM`,
      model: 'fallback-template',
      usage: null,
      fallback: true,
    });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      system: buildCoachSystemPrompt({
        projectContext,
        modeNote: 'You write social-first real estate content ideas.',
      }),
      messages: [{ role: 'user', content: `Generate content ideas for: ${normalizedTopic}` }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ content: text, model: response.model, usage: response.usage });
  } catch (err: any) {
    return NextResponse.json({
      content: `Quick backup ideas for ${normalizedTopic}:\n1) "3 homes under $500k this week"\n2) "What buyers miss in offer strategy"\n3) "Top 5 seller fixes before listing"`,
      model: 'fallback-on-error',
      usage: null,
      fallback: true,
      error: err?.message || 'AI provider unavailable',
    });
  }
}
