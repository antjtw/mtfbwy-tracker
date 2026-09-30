-- Run once in the Supabase SQL editor.
create table if not exists players (
  id        text primary key,
  name      text not null,
  is_guest  boolean not null default false,
  status    text not null default 'active' check (status in ('active', 'partial', 'inactive')),
  sort      int not null default 0
);

create table if not exists characters (
  id          text primary key,
  player_id   text not null references players(id) on delete cascade,
  name        text not null,
  description text not null default '',
  era         text not null default '',
  campaign    text not null default '',
  current     boolean not null default false,
  is_main     boolean not null default true,
  sort        int not null default 0,
  hp_max      int not null default 7 check (hp_max between 0 and 12),
  hp_used     int not null default 0,
  wp_max      int not null default 7 check (wp_max between 0 and 12),
  wp_used     int not null default 0,
  ar_max      int not null default 4 check (ar_max between 0 and 12),
  ar_used     int not null default 0,
  updated_at  timestamptz not null default now(),
  check (hp_used between 0 and hp_max),
  check (wp_used between 0 and wp_max),
  check (ar_used between 0 and ar_max)
);

-- The app talks to the database only from the server with the service role key,
-- so lock the tables down for everyone else.
alter table players enable row level security;
alter table characters enable row level security;
