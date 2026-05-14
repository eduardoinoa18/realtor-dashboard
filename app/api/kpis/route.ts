import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type KpiKey = 'touches' | 'calls' | 'texts' | 'emails' | 'appointments' | 'new_leads' | 'uags' | 'closings';

function getWeekStart(dateInput?: string) {
  const base = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    const now = new Date();
    return toIsoDate(startOfWeek(now));
  }
  return toIsoDate(startOfWeek(base));
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

async function getAuthedSupabase() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase: null, user: null };
  }

  return { supabase, user };
}

async function recalcWeeklyFromDaily(supabase: ReturnType<typeof getSupabaseClient>, weekStartIso: string) {
  const weekStartDate = new Date(`${weekStartIso}T00:00:00`);
  const weekEndIso = toIsoDate(endOfWeek(weekStartDate));

  const { data: rows, error: dailyErr } = await supabase
    .from('daily_kpis')
    .select('touches, calls, texts, emails, appointments_scheduled, new_leads, uags, closings')
    .gte('date', weekStartIso)
    .lte('date', weekEndIso);

  if (dailyErr) throw dailyErr;

  const totals = (rows || []).reduce(
    (acc, row) => ({
      touches: acc.touches + Number(row.touches || 0),
      calls: acc.calls + Number(row.calls || 0),
      texts: acc.texts + Number(row.texts || 0),
      emails: acc.emails + Number(row.emails || 0),
      appointments: acc.appointments + Number(row.appointments_scheduled || 0),
      new_leads: acc.new_leads + Number(row.new_leads || 0),
      uags: acc.uags + Number(row.uags || 0),
      closings: acc.closings + Number(row.closings || 0),
    }),
    { touches: 0, calls: 0, texts: 0, emails: 0, appointments: 0, new_leads: 0, uags: 0, closings: 0 }
  );

  const { data: saved, error: weeklyErr } = await supabase
    .from('kpis')
    .upsert(
      {
        week_start: weekStartIso,
        touches: totals.touches,
        calls: totals.calls,
        texts: totals.texts,
        emails: totals.emails,
        appointments: totals.appointments,
        new_leads: totals.new_leads,
        uags: totals.uags,
        closings: totals.closings,
        fub_synced_at: new Date().toISOString(),
      },
      { onConflict: 'week_start' }
    )
    .select('week_start, touches, calls, texts, emails, appointments, new_leads, uags, closings, notes, fub_synced_at')
    .single();

  if (weeklyErr) throw weeklyErr;
  return saved;
}

export async function GET(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekStart = getWeekStart(String(req.nextUrl.searchParams.get('weekStart') || ''));
  const { data, error } = await supabase
    .from('kpis')
    .select('week_start, touches, calls, texts, emails, appointments, new_leads, uags, closings, notes, fub_synced_at')
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    weekStart,
    kpis: data || {
      week_start: weekStart,
      touches: 0,
      calls: 0,
      texts: 0,
      emails: 0,
      appointments: 0,
      new_leads: 0,
      uags: 0,
      closings: 0,
      notes: null,
      fub_synced_at: null,
    },
  });
}

export async function POST(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const mode = String(body?.mode || 'syncDaily').trim();
  if (mode !== 'syncDaily') {
    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  }

  const date = String(body?.date || new Date().toISOString().slice(0, 10));
  const calls = Number(body?.calls || 0);
  const texts = Number(body?.texts || 0);
  const emails = Number(body?.emails || 0);
  const appointments = Number(body?.appointments || 0);
  const newLeads = Number(body?.newLeads || 0);
  const uags = Number(body?.uags || 0);
  const closings = Number(body?.closings || 0);
  const revenue = Number(body?.revenue || 0);
  const touches = calls + texts + emails;

  const { error: dailyErr } = await supabase
    .from('daily_kpis')
    .upsert(
      {
        date,
        touches,
        calls,
        texts,
        emails,
        appointments_scheduled: appointments,
        new_leads: newLeads,
        uags,
        closings,
        revenue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    );

  if (dailyErr) {
    return NextResponse.json({ error: dailyErr.message }, { status: 500 });
  }

  try {
    const weekStart = getWeekStart(date);
    const weekly = await recalcWeeklyFromDaily(supabase, weekStart);
    return NextResponse.json({ ok: true, date, weekStart, kpis: weekly });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'weekly_recalc_failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const weekStart = getWeekStart(String(body?.weekStart || ''));
  const key = String(body?.key || '').trim() as KpiKey;
  const value = Number(body?.value);
  const allowed: KpiKey[] = ['touches', 'calls', 'texts', 'emails', 'appointments', 'new_leads', 'uags', 'closings'];
  if (!allowed.includes(key) || Number.isNaN(value)) {
    return NextResponse.json({ error: 'Invalid key or value' }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('kpis')
    .select('touches, calls, texts, emails, appointments, new_leads, uags, closings')
    .eq('week_start', weekStart)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const base = existing || {
    touches: 0,
    calls: 0,
    texts: 0,
    emails: 0,
    appointments: 0,
    new_leads: 0,
    uags: 0,
    closings: 0,
  };

  const payload: Record<string, number | string> = {
    week_start: weekStart,
    touches: Number(base.touches || 0),
    calls: Number(base.calls || 0),
    texts: Number(base.texts || 0),
    emails: Number(base.emails || 0),
    appointments: Number(base.appointments || 0),
    new_leads: Number(base.new_leads || 0),
    uags: Number(base.uags || 0),
    closings: Number(base.closings || 0),
  };
  payload[key] = Math.max(0, value);

  const { data, error } = await supabase
    .from('kpis')
    .upsert(payload, { onConflict: 'week_start' })
    .select('week_start, touches, calls, texts, emails, appointments, new_leads, uags, closings, notes, fub_synced_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, weekStart, kpis: data });
}
