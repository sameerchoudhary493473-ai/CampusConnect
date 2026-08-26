-- CampusConnect schema for Supabase
-- Paste this into the Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text,
  event_date date not null,
  event_time text,
  location text,
  total_seats integer not null check (total_seats >= 0),
  created_at timestamptz default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  registered_at timestamptz default now(),
  constraint unique_user_event unique (user_id, event_id)
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  priority text not null,
  location text not null,
  status text not null default 'Pending',
  created_at timestamptz default now(),
  constraint complaint_status_check check (status in ('Pending', 'In Progress', 'Resolved')),
  constraint complaint_priority_check check (priority in ('Low', 'Medium', 'High'))
);

create index if not exists idx_event_registrations_user_id on public.event_registrations(user_id);
create index if not exists idx_event_registrations_event_id on public.event_registrations(event_id);
create index if not exists idx_complaints_user_id on public.complaints(user_id);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_events_event_date on public.events(event_date);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.complaints enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_registrations from anon, authenticated;
revoke all on table public.complaints from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select on table public.events to anon, authenticated;
grant select, insert, delete on table public.event_registrations to authenticated;
grant select, insert, delete on table public.complaints to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Anyone can view events" on public.events;
create policy "Anyone can view events"
on public.events
for select
to authenticated, anon
using (true);

drop policy if exists "Users can view their own registrations" on public.event_registrations;
drop policy if exists "Users can create their own registrations" on public.event_registrations;
drop policy if exists "Users can delete their own registrations" on public.event_registrations;

create policy "Users can view their own registrations"
on public.event_registrations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own registrations"
on public.event_registrations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own registrations"
on public.event_registrations
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own complaints" on public.complaints;
drop policy if exists "Users can create their own complaints" on public.complaints;
drop policy if exists "Users can delete their own complaints" on public.complaints;

create policy "Users can view their own complaints"
on public.complaints
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own complaints"
on public.complaints
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own complaints"
on public.complaints
for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into public.events (title, category, description, event_date, event_time, location, total_seats)
values
  ('Hackathon 2026', 'Technical', 'Build creative solutions in teams and present them to mentors.', '2026-09-12', '9:00 AM - 9:00 PM', 'Innovation Lab', 24),
  ('Annual Sports Meet', 'Sports', 'Compete in athletics, football, basketball, and indoor games.', '2026-09-15', '7:00 AM - 5:00 PM', 'University Sports Complex', 18),
  ('Tech Fest', 'Technical', 'Showcase projects, attend demos, and join tech talks.', '2026-09-18', '10:00 AM - 4:00 PM', 'Main Auditorium', 30),
  ('Coding Workshop', 'Workshop', 'Learn JavaScript techniques and debugging habits.', '2026-09-20', '2:00 PM - 5:00 PM', 'Computer Lab 2', 12),
  ('Cultural Night', 'Cultural', 'Enjoy student performances, music, and dance.', '2026-09-24', '6:30 PM - 10:00 PM', 'Open Air Theatre', 20),
  ('Resume Building Workshop', 'Workshop', 'Improve your resume and interview presentation.', '2026-09-27', '11:00 AM - 1:00 PM', 'Seminar Hall B', 16)
on conflict do nothing;
