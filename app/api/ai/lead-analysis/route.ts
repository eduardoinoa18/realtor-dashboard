import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/claude';
import { buildCoachSystemPrompt } from '@/lib/aiProject';

export async function POST(req: NextRequest) {
  const { lead, projectContext } = await req.json();

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 400,
      system: buildCoachSystemPrompt({
        projectContext,
        modeNote: 'You coach on lead conversion and next best actions.',
      }),
      messages: [{ role: 'user', content: `Analyze this lead and give next actions: ${JSON.stringify(lead)}` }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ content: text, model: response.model, usage: response.usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
