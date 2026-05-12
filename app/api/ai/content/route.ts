import { NextRequest, NextResponse } from 'next/server';
import { client, EDUARDO_SYSTEM_PROMPT } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { topic } = await req.json();

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-20241022',
      max_tokens: 500,
      system: `${EDUARDO_SYSTEM_PROMPT}\nYou write social-first real estate content ideas.`,
      messages: [{ role: 'user', content: `Generate content ideas for: ${topic}` }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ content: text, model: response.model, usage: response.usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
