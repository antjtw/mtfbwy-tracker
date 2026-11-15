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
