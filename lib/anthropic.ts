/**
 * Anthropic Claude API integration with token budgeting
 * Handles model selection, token tracking, and streaming setup
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Token budget limits per model (conservative estimates)
 */
export const TOKEN_BUDGETS = {
  pulse: {
    maxInput: 800,
    maxOutput: 300,
    model: 'claude-3-5-haiku-20241022', // Cost-optimized for frequent runs
  },
  dailyBrief: {
    maxInput: 2000,
    maxOutput: 800,
    model: 'claude-3-5-haiku-20241022', // Haiku: fast, affordable
  },
  weeklyReview: {
    maxInput: 4000,
    maxOutput: 2000,
    model: 'claude-3-5-sonnet-20241022', // Sonnet: deeper analysis (on-demand only)
  },
  contentIdea: {
    maxInput: 1500,
    maxOutput: 500,
    model: 'claude-3-5-haiku-20241022', // Content generation is routine
  },
  leadAnalysis: {
    maxInput: 1200,
    maxOutput: 400,
    model: 'claude-3-5-haiku-20241022', // Individual lead coaching
  },
};

/**
 * Token counter (approximate)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 chars
}

/**
 * Check if input respects token budget
 */
export function checkTokenBudget(
  input: string,
  type: keyof typeof TOKEN_BUDGETS
): { valid: boolean; inputTokens: number; remainingBudget: number } {
  const budget = TOKEN_BUDGETS[type];
  const inputTokens = estimateTokens(input);
  const valid = inputTokens <= budget.maxInput;

  return {
    valid,
    inputTokens,
    remainingBudget: Math.max(0, budget.maxInput - inputTokens),
  };
}

/**
 * Create message with streaming enabled
 */
export async function createStreamingMessage(
  type: keyof typeof TOKEN_BUDGETS,
  messages: Anthropic.Messages.MessageParam[]
) {
  const budget = TOKEN_BUDGETS[type];

  return client.messages.create({
    model: budget.model,
    max_tokens: budget.maxOutput,
    messages,
    system:
      type === 'weeklyReview'
        ? 'You are a real estate coach providing deep strategic analysis. Be thorough and actionable.'
        : 'You are a real estate business coach. Be concise, data-driven, and actionable.',
  });
}

/**
 * Create non-streaming message (simpler use cases)
 */
export async function createMessage(
  type: keyof typeof TOKEN_BUDGETS,
  messages: Anthropic.Messages.MessageParam[]
) {
  const budget = TOKEN_BUDGETS[type];

  return client.messages.create({
    model: budget.model,
    max_tokens: budget.maxOutput,
    messages,
    system:
      type === 'weeklyReview'
        ? 'You are a real estate coach providing deep strategic analysis. Be thorough and actionable.'
        : 'You are a real estate business coach. Be concise, data-driven, and actionable.',
  });
}

/**
 * Extract text from message response
 */
export function getResponseText(response: Anthropic.Messages.Message): string {
  const textBlock = response.content.find((block) => block.type === 'text');
  if (textBlock && textBlock.type === 'text') {
    return textBlock.text;
  }
  return '';
}

/**
 * Format AI response for display
 */
export function formatAiResponse(raw: string): {
  title: string;
  content: string;
  sections: Array<{ heading: string; text: string }>;
} {
  const lines = raw.split('\n').filter((l) => l.trim());
  const title = lines[0]?.replace(/^#+\s*/, '') || 'Coach Tip';

  const sections: Array<{ heading: string; text: string }> = [];
  let currentSection = '';
  let currentText = '';

  for (const line of lines.slice(1)) {
    if (line.startsWith('##')) {
      if (currentSection) {
        sections.push({ heading: currentSection, text: currentText.trim() });
      }
      currentSection = line.replace(/^#+\s*/, '');
      currentText = '';
    } else {
      currentText += line + '\n';
    }
  }

  if (currentSection) {
    sections.push({ heading: currentSection, text: currentText.trim() });
  }

  return {
    title,
    content: raw,
    sections,
  };
}
