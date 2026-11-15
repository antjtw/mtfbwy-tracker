-- Deleted characters are kept here, in full, so the GM can bring them back. Nothing is thrown away.
create table if not exists deleted_characters (
  id          text primary key,
  player_id   text not null,
  name        text not null,
  deleted_at  timestamptz not null default now(),
  deleted_by  text not null default '',
  character   jsonb not null,
  hero        jsonb
);
alter table deleted_characters enable row level security;
