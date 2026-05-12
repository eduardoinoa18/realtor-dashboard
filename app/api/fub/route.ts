import { NextRequest, NextResponse } from 'next/server';
import { fetchFUB } from '@/lib/fub';

export async function GET(req: NextRequest) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 });
  }

  const type = req.nextUrl.searchParams.get('type') || 'people';
  const today = new Date().toISOString().split('T')[0];

  try {
    if (type === 'people') {
      let allPeople: any[] = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore && allPeople.length < 3000) {
        const url = `/people?limit=100&offset=${offset}&sort=updated&direction=desc`;
        const data = await fetchFUB(url, apiKey);
        allPeople = [...allPeople, ...(data.people || [])];
        hasMore = (data.people || []).length === 100;
        offset += 100;
      }

      return NextResponse.json({ people: allPeople, count: allPeople.length });
    }

    if (type === 'events') {
      const url = `/events?limit=200&sort=created&direction=desc&after=${today}T00:00:00Z`;
      const data = await fetchFUB(url, apiKey);
      return NextResponse.json({ events: data.events || [] });
    }

    if (type === 'appointments') {
      const url = `/appointments?limit=50&startDate=${today}&endDate=${today}`;
      const data = await fetchFUB(url, apiKey);
      return NextResponse.json({ appointments: data.appointments || [] });
    }

    if (type === 'tasks') {
      const url = `/tasks?limit=100&sort=dueDate&direction=asc`;
      const data = await fetchFUB(url, apiKey);
      return NextResponse.json({ tasks: data.tasks || [] });
    }

    if (type === 'users') {
      const url = `/users`;
      const data = await fetchFUB(url, apiKey);
      return NextResponse.json({ users: data.users || [] });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err: any) {
    console.error('FUB API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === 'upsertPerson') {
      const lead = body?.lead || {};
      const payload = {
        name: lead.name,
        stage: lead.stage,
        emails: lead.email ? [{ value: lead.email }] : undefined,
        phones: lead.phone ? [{ value: lead.phone }] : undefined,
      };

      if (lead.fubId) {
        const updated = await fetchFUB(`/people/${lead.fubId}`, apiKey, {
          method: 'PUT',
          body: payload,
        });
        return NextResponse.json({ ok: true, person: updated.person || updated });
      }

      const created = await fetchFUB('/people', apiKey, {
        method: 'POST',
        body: payload,
      });
      return NextResponse.json({ ok: true, person: created.person || created });
    }

    if (action === 'updateStage') {
      const personId = body?.personId;
      const stage = body?.stage;
      if (!personId || !stage) {
        return NextResponse.json({ error: 'personId and stage are required' }, { status: 400 });
      }

      const updated = await fetchFUB(`/people/${personId}`, apiKey, {
        method: 'PUT',
        body: { stage },
      });
      return NextResponse.json({ ok: true, person: updated.person || updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('FUB POST API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
