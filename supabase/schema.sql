-- Supabase schema for: auth + tasks + attachments storage
-- Run this in Supabase SQL Editor.

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- Tasks table (single-table approach with attachments stored as jsonb)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  -- Store as local datetime string: YYYY-MM-DDTHH:mm (lexicographically sortable)
  due_at text not null,
  completed boolean not null default false,
  in_progress boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Ensure only one "in progress" per user (optional but recommended)
create unique index if not exists tasks_one_in_progress_per_user
on public.tasks (user_id)
where in_progress = true;

-- Basic due_at format check (optional)
alter table public.tasks
  drop constraint if exists tasks_due_at_format;
alter table public.tasks
  add constraint tasks_due_at_format
  check (due_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$');

-- RLS
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks for select
using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks for insert
with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks for delete
using (auth.uid() = user_id);

-- Storage bucket for attachments
-- Note: requires Supabase Storage enabled.
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- Storage RLS policies: allow authenticated users to manage only their own objects in this bucket.
-- Supabase sets storage.objects.owner to auth.uid() automatically on upload.
create policy "attachments_select_own"
on storage.objects for select
to authenticated
using (bucket_id = 'task-attachments' and owner = auth.uid());

create policy "attachments_insert_own"
on storage.objects for insert
to authenticated
with check (bucket_id = 'task-attachments' and owner = auth.uid());

create policy "attachments_update_own"
on storage.objects for update
to authenticated
using (bucket_id = 'task-attachments' and owner = auth.uid())
with check (bucket_id = 'task-attachments' and owner = auth.uid());

create policy "attachments_delete_own"
on storage.objects for delete
to authenticated
using (bucket_id = 'task-attachments' and owner = auth.uid());

