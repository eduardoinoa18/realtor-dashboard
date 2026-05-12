import { NextRequest, NextResponse } from 'next/server';
import { client, EDUARDO_SYSTEM_PROMPT } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { type, context, messages } = await req.json();

  const prompts: Record<string, string> = {
    draft_text: `Write 3 different follow-up text messages for this lead situation: ${context}. Each under 160 characters. Warm and natural, not salesy.`,
    draft_email: `Write a professional but friendly real estate email for this situation: ${context}. Subject line + body. Eduardo Inoa, Century 21 NE.`,
    coaching: `Give Eduardo direct coaching on this situation: ${context}. What should he do RIGHT NOW to move toward 3 closings this month?`,
    pipeline_review: `Review Eduardo's pipeline: ${context}. Identify the top 3 leads most likely to close this month and what specific action to take with each.`,
    weekly_review: `Eduardo's KPIs this week: ${context}. Coach him — what went well, what's off, and his 3 highest-priority actions for next week.`,
    instagram: `Write an Instagram Reel script/caption for Eduardo Inoa (Realtor in Northeast MA + Southern NH). Topic: ${context}. Hook in first line. CTA to DM. Under 200 words. Include 5 relevant hashtags.`,
    action_plan: `Create a detailed 14-day follow-up action plan for this lead situation: ${context}. Day-by-day contact schedule with exact message types.`,
  };

  const userMessage = prompts[type] || context;

  try {
    const response = await client.messages.create({
      model: type === 'coaching' || type === 'pipeline_review' || type === 'weekly_review'
        ? 'claude-sonnet-4-5-20250514'
        : 'claude-haiku-20241022',
      max_tokens: 1024,
      system: EDUARDO_SYSTEM_PROMPT,
      messages: messages || [{ role: 'user', content: userMessage }],
    });

    return NextResponse.json({
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      model: response.model,
      usage: response.usage,
    });
  } catch (err: any) {
    console.error('Claude API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
