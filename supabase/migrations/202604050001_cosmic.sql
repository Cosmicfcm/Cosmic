create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  timezone text default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'UTC',
  reminder_offsets int[] not null default '{}',
  color text,
  recurrence_rule_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  rrule text not null,
  timezone text not null default 'UTC',
  exdates text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  occurrence_date date not null,
  is_cancelled boolean not null default false,
  title text,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  category_id uuid references public.categories(id) on delete set null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, occurrence_date)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  completed boolean not null default false,
  due_at timestamptz,
  linked_event_id uuid references public.events(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  priority text not null default 'medium',
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  pinned boolean not null default false,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  horizon text not null default 'short',
  progress int not null default 0,
  target_date timestamptz,
  category_id uuid references public.categories(id) on delete set null,
  linked_task_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  due_at timestamptz not null,
  title text not null,
  body text not null,
  sent_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.event_recurrence_rules enable row level security;
alter table public.event_overrides enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "Users read own profiles" on public.profiles
for select using (auth.uid() = id);

create policy "Users update own profiles" on public.profiles
for update using (auth.uid() = id);

create policy "Users manage own categories" on public.categories
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own events" on public.events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own recurrence rules" on public.event_recurrence_rules
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own overrides" on public.event_overrides
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own tasks" on public.tasks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own notes" on public.notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own goals" on public.goals
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own reminders" on public.reminders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own push subscriptions" on public.push_subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
