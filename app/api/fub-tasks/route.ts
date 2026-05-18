import { NextResponse } from 'next/server';
import { fetchFUB } from '@/lib/fub';

const CACHE_CONTROL = 's-maxage=60, stale-while-revalidate=300';

function withHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return withHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET() {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return withHeaders(NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 }));
  }

  try {
    let offset = 0;
    let hasMore = true;
    const all: any[] = [];

    while (hasMore && all.length < 2000) {
      const params = new URLSearchParams({
        completed: 'false',
        limit: '100',
        offset: String(offset),
        sort: 'dueDate',
        direction: 'asc',
      });
      const json = await fetchFUB(`/tasks?${params.toString()}`, apiKey);
      const batch = Array.isArray(json?.tasks) ? json.tasks : [];
      all.push(...batch);
      hasMore = batch.length === 100;
      offset += 100;
    }

    const tasks = all.map((t: any) => ({
      id: t?.id,
      title: t?.title || t?.name || t?.subject || 'Task',
      dueDate: t?.dueDate || null,
      completed: Boolean(t?.completed || t?.isComplete || false),
      personId: t?.personId || t?.person?.id || null,
      personName: t?.person?.name || null,
      assignedTo: t?.assignedTo || t?.assignedUserName || null,
      priority: t?.priority || null,
      status: t?.status || null,
    }));

    const res = NextResponse.json({ tasks, count: tasks.length });
    res.headers.set('Cache-Control', CACHE_CONTROL);
    return withHeaders(res);
  } catch (error: any) {
    return withHeaders(NextResponse.json({ error: error?.message || 'fub_tasks_failed' }, { status: 500 }));
  }
}
