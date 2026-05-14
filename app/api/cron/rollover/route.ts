import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isCronAuthorized } from '@/lib/cronAuth';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin environment missing');
  }
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const auth = isCronAuthorized(req);
  if (!auth.ok) {
    const status = auth.message === 'CRON_SECRET not configured' ? 500 : 401;
    return NextResponse.json({ ok: false, error: auth.message }, { status });
  }

  const supabase = getAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: staleTasks, error: staleErr } = await supabase
    .from('tasks')
    .select('id')
    .lt('due_date', today)
    .eq('is_done', false);

  if (staleErr) {
    return NextResponse.json({ ok: false, error: staleErr.message }, { status: 500 });
  }

  const staleIds = (staleTasks || []).map((task) => task.id);
  if (staleIds.length > 0) {
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({ due_date: today })
      .in('id', staleIds);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().split('T')[0];

  const { data: oldPriorities } = await supabase
    .from('priorities')
    .select('rank, title')
    .eq('for_date', yesterdayIso)
    .order('rank', { ascending: true });
  const safeOldPriorities = oldPriorities || [];

  const { data: existingToday } = await supabase
    .from('priorities')
    .select('id')
    .eq('for_date', today);

  if ((existingToday || []).length === 0 && safeOldPriorities.length > 0) {
    const rows = safeOldPriorities.slice(0, 3).map((p) => ({
      for_date: today,
      rank: p.rank,
      title: p.title,
    }));
    await supabase.from('priorities').insert(rows);
  }

  return NextResponse.json({
    ok: true,
    movedTasks: staleIds.length,
    copiedPriorities: (existingToday || []).length === 0 ? safeOldPriorities.length : 0,
    forDate: today,
  });
}
