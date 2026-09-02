-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)

create table if not exists games (
id uuid primary key default gen_random_uuid(),
sport text not null,
title text not null,
location text not null,
start_time timestamptz not null,
spots int not null,
skill_level text,
created_by text not null,
joined jsonb not null default '[]'::jsonb,
created_at timestamptz default now()
);

create table if not exists messages (
id uuid primary key default gen_random_uuid(),
game_id uuid references games(id) on delete cascade,
name text not null,
text text not null,
created_at timestamptz default now()
);

-- Row level security: open policies for MVP (anyone can read/write).
-- Tighten these once you add real auth (e.g. restrict updates to the joiner's own row).
alter table games enable row level security;
alter table messages enable row level security;

create policy "public read games" on games for select using (true);
create policy "public insert games" on games for insert with check (true);
create policy "public update games" on games for update using (true);

create policy "public read messages" on messages for select using (true);
create policy "public insert messages" on messages for insert with check (true);

-- Enable realtime so the feed and chat update live without polling
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table messages;
