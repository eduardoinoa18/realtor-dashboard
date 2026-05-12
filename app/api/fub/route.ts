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
