-- Despair: one shared pool per campaign or adventure (0 to 12), set by the GM.
-- Pools are created the first time the GM changes one; until then they read as 0.
create table if not exists despair (
  adventure  text primary key,
  value      int not null default 0 check (value between 0 and 12),
  updated_at timestamptz not null default now()
);
alter table despair enable row level security;
