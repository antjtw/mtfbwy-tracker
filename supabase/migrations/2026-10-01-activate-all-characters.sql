-- One-off: switch on trackers for every character that didn't have one, and set
-- Kainard Plusttr, Dia Tarkdona and Vomdek Vus to Starfall only.
-- Only touches characters that were not yet tracked, so maximums already set in the GM view are kept.
update characters
set tracked = true,
    hp_max = 6, wp_max = 6, ar_max = 0,
    hp_used = least(hp_used, 6), wp_used = least(wp_used, 6), ar_used = 0
where tracked = false;

update characters
set adventures = array['Starfall']::text[]
where id in ('kainard-plusttr', 'dia-tarkdona', 'vomdek-vus');
