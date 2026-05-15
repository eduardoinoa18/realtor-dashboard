import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/claude';
import { buildCoachSystemPrompt } from '@/lib/aiProject';

export async function POST(req: NextRequest) {
  const { context, projectContext } = await req.json();

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: buildCoachSystemPrompt({
        projectContext,
        modeNote: 'You are writing a weekly review with strategic depth.',
      }),
      messages: [{ role: 'user', content: `Write a weekly review from this context: ${context}` }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ content: text, model: response.model, usage: response.usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
