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
