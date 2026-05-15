import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/claude';
import { buildCoachSystemPrompt } from '@/lib/aiProject';

const HAIKU_MODEL = 'claude-3-5-haiku-20241022';
const SONNET_MODEL = 'claude-3-5-sonnet-20241022';

export async function POST(req: NextRequest) {
  const { type, context, messages, projectContext } = await req.json();

  const prompts: Record<string, string> = {
    draft_text: `Write 3 different follow-up text messages for this lead situation: ${context}. Each under 160 characters. Warm and natural, not salesy.`,
    draft_email: `Write a professional but friendly real estate email for this situation: ${context}. Subject line + body. Eduardo Inoa, Century 21 NE.`,
    coaching: `Give Eduardo direct coaching on this situation: ${context}. What should he do RIGHT NOW to move toward his monthly closing goal this month?`,
    pipeline_review: `Review Eduardo's pipeline: ${context}. Identify the top 3 leads most likely to close this month and what specific action to take with each.`,
    weekly_review: `Eduardo's KPIs this week: ${context}. Coach him — what went well, what's off, and his 3 highest-priority actions for next week.`,
    instagram: `Write an Instagram Reel script/caption for Eduardo Inoa (Realtor in Northeast MA + Southern NH). Topic: ${context}. Hook in first line. CTA to DM. Under 200 words. Include 5 relevant hashtags.`,
    action_plan: `Create a detailed 14-day follow-up action plan for this lead situation: ${context}. Day-by-day contact schedule with exact message types.`,
  };

  const userMessage = prompts[type] || context;

  try {
    const preferredModel = type === 'coaching' || type === 'pipeline_review' || type === 'weekly_review'
      ? SONNET_MODEL
      : HAIKU_MODEL;
    let degraded = false;
    let degradedReason: string | null = null;

    let response;
    try {
      response = await client.messages.create({
        model: preferredModel,
        max_tokens: 1024,
        system: buildCoachSystemPrompt({ projectContext }),
        messages: messages || [{ role: 'user', content: userMessage }],
      });
    } catch (innerErr: any) {
      const msg = String(innerErr?.message || '');
      const shouldFallback = preferredModel === SONNET_MODEL && (msg.includes('not_found_error') || msg.includes('model'));
      if (!shouldFallback) throw innerErr;
      degraded = true;
      degradedReason = 'sonnet_unavailable';

      response = await client.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 1024,
        system: buildCoachSystemPrompt({ projectContext }),
        messages: messages || [{ role: 'user', content: userMessage }],
      });
    }

    return NextResponse.json({
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      model: response.model,
      usage: response.usage,
      degraded,
      degradedReason,
      preferredModel,
    });
  } catch (err: any) {
    console.error('Claude API error:', err);
    return NextResponse.json({ error: err.message, hint: 'Verify ANTHROPIC_API_KEY and model access in Anthropic account.' }, { status: 500 });
  }
}
