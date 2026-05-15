import { EDUARDO_SYSTEM_PROMPT } from '@/lib/claude';

export function buildCoachSystemPrompt(options?: { projectContext?: string; modeNote?: string }) {
  const projectContext = String(options?.projectContext || '').trim();
  const modeNote = String(options?.modeNote || '').trim();

  const segments = [EDUARDO_SYSTEM_PROMPT];

  if (projectContext) {
    segments.push(
      'Additional project context from Eduardo:\n' +
        projectContext +
        '\nUse this context as high-priority guidance when generating strategy and decisions.'
    );
  }

  if (modeNote) {
    segments.push(modeNote);
  }

  return segments.join('\n\n');
}
