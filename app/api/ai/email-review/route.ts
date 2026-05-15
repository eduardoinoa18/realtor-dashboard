import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/claude';
import { buildCoachSystemPrompt } from '@/lib/aiProject';

export async function POST(req: NextRequest) {
  const { emails, projectContext } = await req.json();
  const rows = Array.isArray(emails) ? emails.slice(0, 25) : [];

  if (rows.length === 0) {
    return NextResponse.json({
      content: 'No recent emails were provided for AI review.',
      model: 'local-empty',
      reviewed: 0,
    });
  }

  const context = rows
    .map((row: any, idx: number) => {
      const subject = String(row?.subject || '(no subject)');
      const from = String(row?.from || 'Unknown sender');
      const date = String(row?.date || '');
      const snippet = String(row?.snippet || '').slice(0, 500);
      return `${idx + 1}. From: ${from}\nSubject: ${subject}\nDate: ${date}\nSnippet: ${snippet}`;
    })
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      system: buildCoachSystemPrompt({
        projectContext,
        modeNote: 'You are reviewing business email inbox activity. Produce a concise executive summary, opportunities, risks, and a prioritized action list for today.',
      }),
      messages: [
        {
          role: 'user',
          content: `Review the recent inbox activity and extract business intelligence for Eduardo's real estate operation.\n\n${context}`,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({
      content: text,
      model: response.model,
      usage: response.usage,
      reviewed: rows.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || 'email_review_failed') }, { status: 500 });
  }
}
