-- Run this in the Supabase SQL editor

-- Notes table
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tasks table
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Automatically update updated_at on notes
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger notes_updated_at
  before update on public.notes
  for each row execute procedure update_updated_at();

-- Disable RLS (single local user, no auth needed)
alter table public.notes disable row level security;
alter table public.tasks disable row level security;

-- -------------------------------------------------------
-- Food tracking
-- -------------------------------------------------------

-- Food library: user-defined items with calories/protein per unit
create table if not exists public.food_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  calories   numeric(8,2) not null,   -- kcal per one unit
  protein    numeric(8,2) not null,   -- grams per one unit
  unit       text not null default '100g', -- display label: "100g", "item", "cup", etc.
  created_at timestamptz not null default now()
);

-- Food log: meals logged or scheduled per day
create table if not exists public.food_log (
  id           uuid primary key default gen_random_uuid(),
  food_item_id uuid references public.food_items(id) on delete set null,
  name         text not null,          -- denormalized so it survives item deletion
  calories     numeric(8,2) not null,  -- total for this entry (quantity * item calories)
  protein      numeric(8,2) not null,  -- total for this entry
  quantity     numeric(8,2) not null default 1,
  unit         text not null,
  meal         text not null default 'other', -- breakfast | lunch | dinner | snack | other
  status       text not null default 'planned', -- planned | eaten
  date         date not null default current_date,
  created_at   timestamptz not null default now()
);

alter table public.food_items disable row level security;
alter table public.food_log   disable row level security;

-- -------------------------------------------------------
-- Recipes
-- -------------------------------------------------------

-- Recipe library
create table if not exists public.recipes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Ingredients per recipe (references food_items, denormalized for safety)
create table if not exists public.recipe_items (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references public.recipes(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  name         text not null,         -- denormalized
  calories     numeric(8,2) not null, -- item calories * quantity
  protein      numeric(8,2) not null, -- item protein * quantity
  quantity     numeric(8,2) not null default 1,
  unit         text not null
);

alter table public.recipes      disable row level security;
alter table public.recipe_items disable row level security;

-- -------------------------------------------------------
-- Daily summaries (archived food log totals)
-- -------------------------------------------------------

-- Stores aggregated calories/protein per day after old log entries are deleted
create table if not exists public.daily_summaries (
  date             date primary key,
  total_calories   numeric(10,2) not null,
  total_protein    numeric(10,2) not null,
  created_at       timestamptz not null default now()
);

alter table public.daily_summaries disable row level security;
