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
  species     text not null default '',
  origin      text not null default '',
  career      text not null default '',
  paths       jsonb not null default '[]'::jsonb, -- [{ "path": "Sentinel", "archetypes": [{ "name": "Blademaster", "level": 1 }] }]
  adventures  text[] not null default '{}',
  is_main     boolean not null default true,
  tracked     boolean not null default false,
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

-- Despair: one shared pool per campaign or adventure (0 to 12), set by the GM.
create table if not exists despair (
  adventure  text primary key,
  value      int not null default 0 check (value between 0 and 12),
  updated_at timestamptz not null default now()
);
alter table despair enable row level security;

-- Built Heroes (character builder): the decisions a player made; everything else is computed from them.
-- id is the character's id; the tracker row in `characters` is created from it.
create table if not exists heroes (
  id            text primary key references characters(id) on delete cascade,
  player_id     text not null references players(id) on delete cascade,
  rules_version text not null,
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table heroes enable row level security;
-- The card database (loaded from the Abilities sheet by the Database set-up page in /admin).
create table if not exists cards (
  id                  text primary key,
  source_type         text not null check (source_type in ('tradition', 'path', 'career')),
  source_name         text not null,
  path                text not null default '',
  archetype           text not null default '',
  tier                int  not null check (tier between 0 and 3),
  name                text not null,
  content             text not null,
  prerequisite_text   text not null default '',
  prerequisite        jsonb,
  action_roll         text not null default 'No',
  willpower_cost      int,
  willpower_cost_note text not null default '',
  rules_version       text not null,
  sort                int  not null default 0
);
alter table cards enable row level security;
-- Dice roller: a log of resolved rolls (also what makes adding Despair safe to retry), and an atomic "add Despair".
create table if not exists roll_events (
  roll_id        text primary key,
  character_id   text not null,
  adventure      text not null,
  at             timestamptz not null default now(),
  balance        int  not null check (balance between 1 and 12),
  despair        int  not null check (despair between 1 and 12),
  modifier       int  not null default 0,
  penalty        int  not null default 0,
  kind           text not null,
  wp_delta       int  not null default 0,
  despair_delta  int  not null default 0
);
alter table roll_events enable row level security;

-- Records the roll once (a repeated roll_id changes nothing) and adds to the pool, capped at 12.
create or replace function add_despair(
  p_roll_id text, p_character_id text, p_adventure text, p_delta int,
  p_balance int, p_despair int, p_modifier int, p_penalty int, p_kind text, p_wp_delta int
) returns table (value int, clamped boolean, applied boolean)
language plpgsql as $$
declare
  inserted int;
  cur int;
  nxt int;
begin
  insert into roll_events (roll_id, character_id, adventure, balance, despair, modifier, penalty, kind, wp_delta, despair_delta)
  values (p_roll_id, p_character_id, p_adventure, p_balance, p_despair, p_modifier, p_penalty, p_kind, p_wp_delta, p_delta)
  on conflict (roll_id) do nothing;
  get diagnostics inserted = row_count;

  select d.value into cur from despair d where d.adventure = p_adventure for update;
  if inserted = 0 then
    return query select coalesce(cur, 0), false, false;
    return;
  end if;

  insert into despair (adventure, value, updated_at) values (p_adventure, least(12, p_delta), now())
  on conflict (adventure) do update set value = least(12, despair.value + p_delta), updated_at = now()
  returning despair.value into nxt;

  return query select nxt, (coalesce(cur, 0) + p_delta > 12), true;
end;
$$;
