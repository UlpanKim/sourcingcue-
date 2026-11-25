-- 07SourcingCue Initial Schema (Supabase PostgreSQL + Hardened RLS)
-- Every table enables Row Level Security in the same migration.

create extension if not exists "pgcrypto";

-- 1. Subscription Plans
create table if not exists public.plans (
  id text primary key check (id in ('free', 'starter', 'pro', 'team')),
  name_ko text not null,
  monthly_price_krw integer not null check (monthly_price_krw >= 0),
  yearly_price_krw integer not null check (yearly_price_krw >= 0),
  monthly_quota integer not null check (monthly_quota >= 0),
  max_ai_edits_per_project integer, -- null = unlimited
  max_members integer not null default 1,
  allow_webp boolean not null default false,
  allow_lookbook boolean not null default false,
  allow_batch boolean not null default false,
  brand_presets_limit integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "Plans are readable by everyone"
  on public.plans for select
  using (true);

insert into public.plans (
  id, name_ko, monthly_price_krw, yearly_price_krw, monthly_quota,
  max_ai_edits_per_project, max_members, allow_webp, allow_lookbook, allow_batch, brand_presets_limit
) values
  ('free', '무료 체험', 0, 0, 1, 3, 1, false, false, false, 0),
  ('starter', '스타터', 39000, 31000, 10, 10, 1, false, false, false, 1),
  ('pro', '프로', 99000, 79000, 35, null, 1, true, true, false, 3),
  ('team', '팀', 249000, 199000, 120, null, 5, true, true, true, 999)
on conflict (id) do nothing;

-- 2. Workspaces & Members
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan_id text not null default 'free' references public.plans(id),
  remaining_quota integer not null default 1 check (remaining_quota >= 0),
  quota_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- Helper to avoid 42P17 mutual recursion between workspaces and workspace_members
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create policy "Members can view their workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

-- Restrict client-side workspace updates to name only (never plan_id, remaining_quota, owner_id)
revoke update on public.workspaces from anon, authenticated;
grant update (name) on public.workspaces to authenticated;

create policy "Owners can update their workspace name"
  on public.workspaces for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Members can view workspace membership"
  on public.workspace_members for select
  using (
    user_id = auth.uid()
    or public.is_workspace_member(workspace_id)
  );

-- 3. Subscriptions (Bootpay Lightpay / PortOne ready)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id text not null references public.plans(id),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due')),
  billing_key_ref text,
  receipt_id text unique,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '1 month'),
  webhook_event_id text unique,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Workspace members can view subscriptions"
  on public.subscriptions for select
  using (public.is_workspace_member(workspace_id));

-- 4. Usage Ledger (Idempotent quota tracking)
create table if not exists public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid,
  delta integer not null, -- -1 for consume, +1 for refund, +N for monthly reset
  reason text not null check (reason in ('generation_consume', 'generation_refund', 'monthly_reset', 'plan_upgrade')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.usage_ledger enable row level security;

create policy "Workspace members can view usage ledger"
  on public.usage_ledger for select
  using (public.is_workspace_member(workspace_id));

-- 5. Projects & Edits
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_url text not null,
  product_name text,
  brand_name text,
  shipping_mode text not null default 'rocket_growth' check (shipping_mode in ('rocket_growth', 'normal')),
  status text not null default 'queued' check (status in ('queued', 'scraping', 'analyzing', 'rendering', 'completed', 'failed')),
  report_json jsonb,
  assets_json jsonb,
  detail_html text,
  ai_edit_count integer not null default 0 check (ai_edit_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Prevent clients from resetting ai_edit_count or changing workspace_id directly
revoke update (ai_edit_count, workspace_id) on public.projects from anon, authenticated;

create policy "Workspace members can manage projects"
  on public.projects for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create table if not exists public.project_edits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  edit_type text not null check (edit_type in ('direct_text', 'ai_rewrite', 'ai_image')),
  consumes_ai_quota boolean not null,
  instruction text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.project_edits enable row level security;

-- Audit log is read-only for clients; mutations happen server-side via service_role
create policy "Workspace members can view project edits"
  on public.project_edits for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_edits.project_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

-- 6. Atomic Quota Functions (Service-role only, Idempotent, Row-locked)
create or replace function public.fn_consume_generation_quota(
  p_workspace_id uuid,
  p_project_id uuid,
  p_idempotency_key text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining integer;
  v_inserted uuid;
begin
  -- Lock workspace row first to prevent race conditions
  select remaining_quota into v_remaining
  from public.workspaces
  where id = p_workspace_id
  for update;

  if not found then
    raise exception 'WORKSPACE_NOT_FOUND';
  end if;

  insert into public.usage_ledger (workspace_id, project_id, delta, reason, idempotency_key)
  values (p_workspace_id, p_project_id, -1, 'generation_consume', 'consume:' || p_idempotency_key)
  on conflict (idempotency_key) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return v_remaining;
  end if;

  if v_remaining < 1 then
    raise exception 'INSUFFICIENT_QUOTA';
  end if;

  update public.workspaces
  set remaining_quota = remaining_quota - 1
  where id = p_workspace_id
  returning remaining_quota into v_remaining;

  return v_remaining;
end;
$$;

create or replace function public.fn_refund_generation_quota(
  p_workspace_id uuid,
  p_project_id uuid,
  p_idempotency_key text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining integer;
  v_inserted uuid;
begin
  select remaining_quota into v_remaining
  from public.workspaces
  where id = p_workspace_id
  for update;

  if not found then
    raise exception 'WORKSPACE_NOT_FOUND';
  end if;

  insert into public.usage_ledger (workspace_id, project_id, delta, reason, idempotency_key)
  values (p_workspace_id, p_project_id, 1, 'generation_refund', 'refund:' || p_idempotency_key)
  on conflict (idempotency_key) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return v_remaining;
  end if;

  update public.workspaces
  set remaining_quota = remaining_quota + 1
  where id = p_workspace_id
  returning remaining_quota into v_remaining;

  return v_remaining;
end;
$$;

create or replace function public.fn_reset_monthly_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_ws record;
  v_inserted uuid;
begin
  for v_ws in
    select w.id, p.monthly_quota, w.quota_reset_at
    from public.workspaces w
    join public.plans p on p.id = w.plan_id
    where w.quota_reset_at <= now()
    for update of w skip locked
  loop
    insert into public.usage_ledger (workspace_id, delta, reason, idempotency_key)
    values (
      v_ws.id,
      v_ws.monthly_quota,
      'monthly_reset',
      'reset:' || v_ws.id::text || ':' || to_char(now(), 'YYYY-MM')
    )
    on conflict (idempotency_key) do nothing
    returning id into v_inserted;

    if v_inserted is not null then
      update public.workspaces
      set remaining_quota = v_ws.monthly_quota,
          quota_reset_at = date_trunc('month', now()) + interval '1 month'
      where id = v_ws.id;

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.fn_consume_generation_quota(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fn_consume_generation_quota(uuid, uuid, text) to service_role;

revoke all on function public.fn_refund_generation_quota(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fn_refund_generation_quota(uuid, uuid, text) to service_role;

revoke all on function public.fn_reset_monthly_quota() from public, anon, authenticated;
grant execute on function public.fn_reset_monthly_quota() to service_role;
