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
