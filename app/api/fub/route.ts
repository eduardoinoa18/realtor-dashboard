import { NextRequest, NextResponse } from 'next/server';
import { fetchFUB } from '@/lib/fub';

const DEFAULT_ASSIGNED_USER_NAME = 'Eduardo Inoa';

export async function GET(req: NextRequest) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FUB_API_KEY not set' }, { status: 500 });
  }

  const type = req.nextUrl.searchParams.get('type') || 'people';
  const today = new Date().toISOString().split('T')[0];
  const configuredAssignedUserId = (process.env.FUB_ASSIGNED_USER_ID || '').trim();
  const configuredAssignedUserName = (process.env.FUB_ASSIGNED_USER_NAME || DEFAULT_ASSIGNED_USER_NAME).trim();

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

      let resolvedAssignedUserId = configuredAssignedUserId;
      let resolvedAssignedUserName = configuredAssignedUserName;

      const usersResponse = await fetchFUB('/users', apiKey);
      const users = usersResponse.users || [];
      if (!resolvedAssignedUserId && configuredAssignedUserName) {
        const userByName = users.find((user: any) => namesMatch(user, configuredAssignedUserName));
        if (userByName?.id !== undefined && userByName?.id !== null) {
          resolvedAssignedUserId = String(userByName.id);
          resolvedAssignedUserName = getUserFullName(userByName) || configuredAssignedUserName;
        }
      }

      const filteredPeople = allPeople.filter((person) => isAssignedToUser(person, resolvedAssignedUserId, resolvedAssignedUserName));

      return NextResponse.json({
        people: filteredPeople,
        count: filteredPeople.length,
        totalCount: allPeople.length,
        filteredOut: allPeople.length - filteredPeople.length,
        assignedUser: {
          id: resolvedAssignedUserId || null,
          name: resolvedAssignedUserName,
        },
      });
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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getUserFullName(user: any) {
  const fullName = String(user?.name || '').trim();
  if (fullName) return fullName;
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  return `${first} ${last}`.trim();
}

function namesMatch(user: any, targetName: string) {
  const target = normalize(targetName);
  const candidate = normalize(getUserFullName(user));
  if (!candidate) return false;
  return candidate === target || candidate.includes(target) || target.includes(candidate);
}

function isAssignedToUser(person: any, assignedUserId?: string, assignedUserName?: string) {
  const targetId = String(assignedUserId || '').trim();
  const targetName = normalize(String(assignedUserName || ''));
  const assigned = collectAssignedUsers(person);

  if (targetId && assigned.some((entry) => String(entry.id || '').trim() === targetId)) {
    return true;
  }

  if (targetName) {
    return assigned.some((entry) => {
      const candidate = normalize(String(entry.name || ''));
      if (!candidate) return false;
      return candidate === targetName || candidate.includes(targetName) || targetName.includes(candidate);
    });
  }

  return false;
}

function collectAssignedUsers(person: any) {
  const values: Array<{ id?: string; name?: string }> = [];

  const maybeAdd = (item: any) => {
    if (!item) return;
    if (typeof item === 'string' || typeof item === 'number') {
      values.push({ id: String(item) });
      return;
    }
    values.push({
      id: item.id !== undefined && item.id !== null ? String(item.id) : undefined,
      name: String(item.name || `${item.firstName || ''} ${item.lastName || ''}` || '').trim() || undefined,
    });
  };

  maybeAdd(person.assignedUser);
  maybeAdd(person.assignee);
  maybeAdd(person.owner);
  maybeAdd(person.assignedTo);
  maybeAdd(person.assignedUserId);
  maybeAdd(person.assignedToUserId);

  if (Array.isArray(person.assignedUsers)) {
    person.assignedUsers.forEach(maybeAdd);
  }
  if (Array.isArray(person.assignees)) {
    person.assignees.forEach(maybeAdd);
  }
  if (Array.isArray(person.owners)) {
    person.owners.forEach(maybeAdd);
  }
  if (Array.isArray(person.assignedUserIds)) {
    person.assignedUserIds.forEach(maybeAdd);
  }

  return values;
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
