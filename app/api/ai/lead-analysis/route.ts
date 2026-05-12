import { NextRequest, NextResponse } from 'next/server';
import { client, EDUARDO_SYSTEM_PROMPT } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { lead } = await req.json();

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 400,
      system: `${EDUARDO_SYSTEM_PROMPT}\nYou coach on lead conversion and next best actions.`,
      messages: [{ role: 'user', content: `Analyze this lead and give next actions: ${JSON.stringify(lead)}` }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ content: text, model: response.model, usage: response.usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
