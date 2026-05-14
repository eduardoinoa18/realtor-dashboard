import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = String(req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10));
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, is_done, is_critical, created_at, due_date, sort_order')
    .eq('due_date', date)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data || [] });
}

export async function POST(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const title = String(body?.title || '').trim();
  const date = String(body?.date || new Date().toISOString().slice(0, 10));
  const isCritical = Boolean(body?.isCritical);

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      due_date: date,
      is_critical: isCritical,
      is_done: false,
    })
    .select('id, title, is_done, is_critical, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: data });
}

export async function PATCH(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const id = String(body?.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (typeof body?.title === 'string') patch.title = body.title.trim();
  if (typeof body?.isDone === 'boolean') patch.is_done = body.isDone;
  if (typeof body?.isCritical === 'boolean') patch.is_critical = body.isCritical;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No patch values provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select('id, title, is_done, is_critical, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const id = String(body?.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
