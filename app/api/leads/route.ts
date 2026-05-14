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

export async function GET() {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('leads')
    .select('id, fub_id, name, phone, email, stage, lead_source, price_range_max, notes, updated_at, last_contact, next_followup, days_in_stage')
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthedSupabase();
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const mode = String(body?.mode || 'syncFubLeads');

  if (mode !== 'syncFubLeads') {
    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  }

  const rows = Array.isArray(body?.leads) ? body.leads : [];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, upserted: 0 });
  }

  const payload = rows
    .map((lead: any) => {
      const fubId = String(lead?.fubId || '').trim();
      if (!fubId) return null;
      return {
        fub_id: fubId,
        owner_user_id: user.id,
        name: String(lead?.name || '').trim() || 'Unknown Lead',
        phone: lead?.phone ? String(lead.phone) : null,
        email: lead?.email ? String(lead.email) : null,
        stage: String(lead?.stage || 'new'),
        lead_source: lead?.lead_source ? String(lead.lead_source) : null,
        price_range_max: lead?.price_range_max ? Number(lead.price_range_max) : null,
        notes: lead?.notes ? String(lead.notes) : null,
        last_contact: lead?.lastContactAt ? String(lead.lastContactAt) : null,
        days_in_stage: Number(lead?.days_in_stage || 0),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (payload.length === 0) {
    return NextResponse.json({ ok: true, upserted: 0 });
  }

  const { error } = await supabase
    .from('leads')
    .upsert(payload, { onConflict: 'fub_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upserted: payload.length });
}

export async function PATCH(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const fubId = String(body?.fubId || '').trim();
  const id = String(body?.id || '').trim();
  const patch = body?.patch || {};

  if (!fubId && !id) {
    return NextResponse.json({ error: 'fubId or id is required' }, { status: 400 });
  }

  const payload: Record<string, any> = {};
  if (typeof patch?.stage === 'string') payload.stage = String(patch.stage);
  if (typeof patch?.notes === 'string') payload.notes = String(patch.notes);
  if (typeof patch?.lastContactAt === 'string') payload.last_contact = String(patch.lastContactAt);
  if (typeof patch?.expectedCloseDate === 'string') payload.next_followup = String(patch.expectedCloseDate);
  if (typeof patch?.updatedAt === 'string') payload.updated_at = String(patch.updatedAt);
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No patch values provided' }, { status: 400 });
  }

  let query = supabase.from('leads').update(payload);
  if (fubId) {
    query = query.eq('fub_id', fubId);
  } else {
    query = query.eq('id', id);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { supabase } = await getAuthedSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const fubId = String(body?.fubId || '').trim();
  const id = String(body?.id || '').trim();
  if (!fubId && !id) {
    return NextResponse.json({ error: 'fubId or id is required' }, { status: 400 });
  }

  let query = supabase.from('leads').delete();
  if (fubId) {
    query = query.eq('fub_id', fubId);
  } else {
    query = query.eq('id', id);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
