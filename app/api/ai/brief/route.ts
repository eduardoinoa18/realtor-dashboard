import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/claude';
import { buildCoachSystemPrompt } from '@/lib/aiProject';

export async function POST(req: NextRequest) {
  const { context, projectContext } = await req.json();

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      system: buildCoachSystemPrompt({
        projectContext,
        modeNote: 'You are writing a short daily brief. Keep it direct and actionable.',
      }),
      messages: [{ role: 'user', content: `Create today's coaching brief from this context: ${context}` }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ content: text, model: response.model, usage: response.usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
