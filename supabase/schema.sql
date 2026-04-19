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
  food_type  text not null default 'other', -- category: meat, fish, dairy, eggs, carbs, vegetables, fruits, legumes, nuts, fats, snacks, beverages, other
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

-- -------------------------------------------------------
-- Daily habits
-- -------------------------------------------------------

-- Habit definitions (lifetime or time-bounded)
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  type        text not null default 'lifetime', -- 'lifetime' | 'timed'
  start_date  date not null default current_date,
  end_date    date,                              -- null for lifetime habits
  created_at  timestamptz not null default now()
);

-- One log row per habit per day (upserted on toggle)
create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits(id) on delete cascade,
  date       date not null default current_date,
  completed  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

alter table public.habits     disable row level security;
alter table public.habit_logs disable row level security;

-- -------------------------------------------------------
-- Study time tracking
-- -------------------------------------------------------

-- Courses
create table if not exists public.courses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- Study tasks (per course)
create table if not exists public.study_tasks (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses(id) on delete cascade,
  title             text not null,
  status            text not null default 'todo', -- 'todo' | 'in_progress' | 'done'
  estimated_minutes integer,
  due_date          date,             -- specific day or range start
  due_date_end      date,             -- null = specific day, set = range end
  created_at        timestamptz not null default now()
);

-- Study blocks (logged work sessions)
create table if not exists public.study_blocks (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses(id) on delete cascade,
  duration_minutes integer not null,
  end_time         time,             -- end time of the session; start = end_time - duration_minutes
  date             date not null default current_date,
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

-- Links between study blocks and tasks (many-to-many)
create table if not exists public.study_block_tasks (
  study_block_id uuid not null references public.study_blocks(id) on delete cascade,
  study_task_id  uuid not null references public.study_tasks(id) on delete cascade,
  primary key (study_block_id, study_task_id)
);

alter table public.courses           disable row level security;
alter table public.study_tasks       disable row level security;
alter table public.study_blocks      disable row level security;
alter table public.study_block_tasks disable row level security;

-- -------------------------------------------------------
-- Tutoring business
-- -------------------------------------------------------

create table if not exists public.students (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  phone                  text not null default '',
  email                  text not null default '',
  hourly_rate            numeric(10,2) not null default 0,
  active                 boolean not null default true,
  default_payment_method text not null default 'cash', -- cash | bank_transfer
  default_location_type  text not null default 'in_person', -- online | in_person
  created_at             timestamptz not null default now()
);

alter table public.students add column if not exists default_payment_method text not null default 'cash';
alter table public.students add column if not exists default_location_type text not null default 'in_person';

create table if not exists public.teaching_moments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students(id) on delete cascade,
  date             date not null default current_date,
  start_time       time not null,
  end_time         time not null,
  price            numeric(10,2) not null default 0,
  paid             boolean not null default false,
  payment_method   text not null default 'cash', -- cash | bank_transfer
  location_type    text not null default 'in_person', -- online | in_person
  transfer_note    text not null default '',
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  constraint teaching_moments_payment_method_check check (payment_method in ('cash', 'bank_transfer')),
  constraint teaching_moments_location_type_check check (location_type in ('online', 'in_person')),
  constraint teaching_moments_time_check check (end_time > start_time)
);

alter table public.students          disable row level security;
alter table public.teaching_moments  disable row level security;
