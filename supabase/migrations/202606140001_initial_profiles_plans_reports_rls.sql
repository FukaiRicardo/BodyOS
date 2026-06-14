create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  goal text not null,
  fitness_level text not null,
  weekly_days integer not null check (weekly_days between 1 and 7),
  age integer check (age is null or age between 10 and 100),
  gender text,
  height_cm numeric check (height_cm is null or height_cm between 50 and 300),
  current_weight_kg numeric check (current_weight_kg is null or current_weight_kg between 10 and 500),
  target_weight_kg numeric check (target_weight_kg is null or target_weight_kg between 10 and 500),
  country text,
  country_code text,
  city text,
  region text,
  currency text,
  currency_symbol text,
  training_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nutrition_plan jsonb not null default '{}'::jsonb,
  workout_plan jsonb not null default '{}'::jsonb,
  ai_model text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  workout_completed boolean not null default false,
  workout_notes text,
  energy_level integer not null check (energy_level between 1 and 10),
  sleep_hours numeric check (sleep_hours is null or sleep_hours between 0 and 24),
  mood text,
  weight_kg numeric check (weight_kg is null or weight_kg between 10 and 500),
  water_ml integer check (water_ml is null or water_ml between 0 and 10000),
  adherence_percent integer not null default 100 check (adherence_percent between 0 and 100),
  analysis jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists plans_user_created_at_idx
  on public.plans (user_id, created_at desc);

create index if not exists reports_user_date_idx
  on public.reports (user_id, date desc);

do $$
begin
  if not exists (
    select 1
    from public.reports
    group by user_id, date
    having count(*) > 1
  ) then
    create unique index if not exists reports_user_date_unique_idx
      on public.reports (user_id, date);
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'plans_select_own'
  ) then
    create policy plans_select_own
      on public.plans
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'plans_insert_own'
  ) then
    create policy plans_insert_own
      on public.plans
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'reports_select_own'
  ) then
    create policy reports_select_own
      on public.reports
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'reports_insert_own'
  ) then
    create policy reports_insert_own
      on public.reports
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'reports_update_own'
  ) then
    create policy reports_update_own
      on public.reports
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
