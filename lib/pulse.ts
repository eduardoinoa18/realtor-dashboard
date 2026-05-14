/**
 * Pulse Check Orchestration
 */
import { createMessage, getResponseText } from './anthropic';

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase environment variables are required for pulse checks');
  }

  return createClient(supabaseUrl, serviceKey);
}

export interface PulseCheckData {
  timestamp: string;
  touchCount: number;
  callCount: number;
  emailCount: number;
  textCount: number;
  newLeads: number;
  uags: number;
  closings: number;
  trend: 'up' | 'down' | 'stable';
  currentActivity: string;
  coachingTip: string;
  status: 'on-track' | 'behind' | 'ahead';
}

export function isWorkHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  return utcHour >= 12 || utcHour < 1;
}

async function getTodayKpis() {
  const t = new Date().toISOString().split('T')[0];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('activity_log').select('category').eq('logged_at::date', t);
  if (error) return null;
  const counts = {
    calls: (data || []).filter((a: any) => a.category === 'call').length,
    emails: (data || []).filter((a: any) => a.category === 'email').length,
    texts: (data || []).filter((a: any) => a.category === 'text').length,
    showings: (data || []).filter((a: any) => a.category === 'showing').length,
    notes: (data || []).filter((a: any) => a.category === 'note').length,
  };
  return { touches: counts.calls + counts.emails + counts.texts + counts.showings, ...counts };
}

async function getTodayLeads() {
  const today = new Date().toISOString().split('T')[0];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('leads').select('id, stage').gte('created_at', `${today}T00:00:00Z`).lt('created_at', `${today}T23:59:59Z`);
  if (error) return { new: 0, uag: 0 };
  return {
    new: (data || []).filter((l: any) => l.stage === 'new').length,
    uag: (data || []).filter((l: any) => l.stage === 'uag').length,
  };
}

async function getTodayClosings() {
  const t = new Date().toISOString().split('T')[0];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('closings').select('id, net_commission').eq('close_date', t);
  if (error) return { count: 0, revenue: 0 };
  return {
    count: (data || []).length,
    revenue: (data || []).reduce((sum: number, c: any) => sum + (c.net_commission || 0), 0),
  };
}

async function getDailyTargets() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('settings').select('id').limit(1).single();
  if (error) {}
  return { dailyTouchTarget: 15, dailyNewLeadTarget: 2, dailyCallTarget: 8 };
}

async function generateCoachingTip(inputs: { touches: number; calls: number; newLeads: number; trend: string; dayOfWeek: string; }): Promise<string> {
  const prompt = `As a real estate coach, provide a brief (1-2 sentence) coaching tip based on this pulse check:
- Touches: ${inputs.touches}
- Calls: ${inputs.calls}
- New leads: ${inputs.newLeads}
- Trend: ${inputs.trend}`;
  try {
    const response = await createMessage('pulse', [{ role: 'user', content: prompt }]);
    return getResponseText(response);
  } catch {
    return 'Keep the momentum going!';
  }
}

export async function runPulseCheck(): Promise<PulseCheckData> {
  const supabase = getSupabaseClient();
  const kpis = await getTodayKpis();
  const leads = await getTodayLeads();
  const closings = await getTodayClosings();
  const targets = await getDailyTargets();
  const touches = kpis?.touches || 0;
  const calls = kpis?.calls || 0;
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const targetTouches = targets?.dailyTouchTarget || 15;
  let status: 'on-track' | 'behind' | 'ahead' = 'on-track';
  if (touches < targetTouches * 0.8) status = 'behind';
  if (touches > targetTouches * 1.2) status = 'ahead';
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (touches > targetTouches) trend = 'up';
  if (touches < targetTouches * 0.7) trend = 'down';
  const coachingTip = await generateCoachingTip({ touches, calls, newLeads: leads.new, trend, dayOfWeek });
  const pulseData: PulseCheckData = {
    timestamp: now.toISOString(),
    touchCount: touches,
    callCount: calls,
    emailCount: kpis?.emails || 0,
    textCount: kpis?.texts || 0,
    newLeads: leads.new,
    uags: leads.uag,
    closings: closings.count,
    trend,
    currentActivity: `${calls} calls, ${leads.new} new leads`,
    coachingTip,
    status,
  };
  try {
    await supabase.from('ai_interactions').insert({
      interaction_type: 'pulse',
      prompt: `Pulse check for ${dayOfWeek}`,
      response: JSON.stringify(pulseData),
      model: 'claude-3-5-haiku-20241022',
      input_tokens: 150,
      output_tokens: 100,
    });
  } catch (err) {
    console.error('Error storing pulse check:', err);
  }
  return pulseData;
}

export function formatPulseForDisplay(data: PulseCheckData): string {
  const time = new Date(data.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const icon = data.status === 'behind' ? '⚠️' : data.status === 'ahead' ? '✨' : '✓';
  return `📊 Pulse (${time})\n${icon} ${data.currentActivity}\n💡 ${data.coachingTip}`;
}
