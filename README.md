# MTFBWY Tracker

Slot tracker (hit points, willpower, armour) for the MTFBWY RPG. Next.js + Supabase, hosted on Vercel.

## Flow
Select player → enter shared code → select character → tap slots. Changes save instantly and other
devices (including the GM's admin view) pick them up within about two seconds.

- **Player codes:** `PLAYER_CODES` (comma-separated, so you can hand out several and retire them individually).
- **GM code:** `GM_CODE` unlocks `/admin`, where the GM sets each character's slot maximums (0 to 12) and sees live usage grouped by campaign.
- Slots are stored as a count (`hp_used`, `hp_max` and so on). Tapping a slot ticks up to it, tapping the last ticked slot un-ticks it.

## Run locally
```bash
cp .env.example .env.local   # edit the codes
npm install
npm run dev                  # http://localhost:3000
```
With no Supabase variables set it uses a local JSON file (`.data/`, git-ignored) seeded from `lib/seed.ts`.

## Supabase setup
1. Create a free project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Project Settings → API: copy the **Project URL** and the **service_role** key into `.env.local` as
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The key is server-only: never prefix it with `NEXT_PUBLIC_`.
4. `npm run seed` loads the players and characters from `lib/seed.ts`. Re-running it updates names and
   maximums but never resets live slot usage.

## Deploy on Vercel
Import the repo, then add `PLAYER_CODES`, `GM_CODE`, `SESSION_SECRET` (`openssl rand -hex 32`),
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as environment variables.

## Fonts
Stand-ins (Oswald, Barlow) load from Google Fonts. To use the licensed fonts, add `@font-face` rules for
ITC Serif Gothic, FF DIN Pan-European and Droidobesh Depot with files in `public/fonts`; the CSS variables
in `app/globals.css` already list them first.
