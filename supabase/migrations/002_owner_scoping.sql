-- Owner scoping for multi-user readiness.
-- Keeps existing rows accessible by backfilling to the oldest auth user in single-operator deployments.

begin;

-- Core user-owned tables to scope.
-- Note: Global/template tables (message_templates, mlo_steps, professionals) stay shared for now.

do $$
declare
  table_name text;
  scoped_tables text[] := array[
    'leads',
    'tasks',
    'kpis',
    'closings',
    'appointments',
    'priorities',
    'activity_log',
    'ai_conversations',
    'settings',
    'daily_kpis',
    'monthly_metrics',
    'pipeline',
    'listing_checklists',
    'buyer_checklists',
    'content_ideas',
    'ai_interactions',
    'mlo_metrics'
  ];
begin
  foreach table_name in array scoped_tables loop
    execute format(
      'alter table %I add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;',
      table_name
    );

    execute format(
      'create index if not exists %I on %I(owner_user_id);',
      format('idx_%s_owner_user_id', table_name),
      table_name
    );
  end loop;
end
$$;

-- Auto-assign owner on insert when authenticated users write rows.
create or replace function public.set_owner_user_id_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is null then
    new.owner_user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- Backfill existing records to preserve access in current single-user setup.
do $$
declare
  default_owner uuid;
  table_name text;
  scoped_tables text[] := array[
    'leads',
    'tasks',
    'kpis',
    'closings',
    'appointments',
    'priorities',
    'activity_log',
    'ai_conversations',
    'settings',
    'daily_kpis',
    'monthly_metrics',
    'pipeline',
    'listing_checklists',
    'buyer_checklists',
    'content_ideas',
    'ai_interactions',
    'mlo_metrics'
  ];
begin
  select id into default_owner
  from auth.users
  order by created_at asc
  limit 1;

  if default_owner is null then
    return;
  end if;

  foreach table_name in array scoped_tables loop
    execute format('update %I set owner_user_id = $1 where owner_user_id is null;', table_name)
    using default_owner;
  end loop;
end
$$;

-- Replace broad authenticated policies with owner-scoped policies.
do $$
declare
  table_name text;
  scoped_tables text[] := array[
    'leads',
    'tasks',
    'kpis',
    'closings',
    'appointments',
    'priorities',
    'activity_log',
    'ai_conversations',
    'settings',
    'daily_kpis',
    'monthly_metrics',
    'pipeline',
    'listing_checklists',
    'buyer_checklists',
    'content_ideas',
    'ai_interactions',
    'mlo_metrics'
  ];
  broad_policy_name text;
  owner_policy_name text;
  trigger_name text;
begin
  foreach table_name in array scoped_tables loop
    broad_policy_name := format('authenticated_all_%s', table_name);
    owner_policy_name := format('owner_scope_%s', table_name);
    trigger_name := format('set_owner_%s', table_name);

    execute format('drop policy if exists %I on %I;', broad_policy_name, table_name);
    execute format('drop policy if exists %I on %I;', owner_policy_name, table_name);

    execute format(
      'create policy %I on %I for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());',
      owner_policy_name,
      table_name
    );

    execute format('drop trigger if exists %I on %I;', trigger_name, table_name);
    execute format(
      'create trigger %I before insert on %I for each row execute function public.set_owner_user_id_from_auth();',
      trigger_name,
      table_name
    );
  end loop;
end
$$;

-- One settings row per user.
create unique index if not exists idx_settings_owner_unique on settings(owner_user_id) where owner_user_id is not null;

commit;
