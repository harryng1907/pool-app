# POOL — build plan & status

> Read this first (humans and AI assistants). It is the single source of truth for what exists and what's next.

**Pitch in one line:** you swipe on things you'd want to do, not people. Pool puts you in a squad of 2–4 UNSW students around something concrete, finds a time you're all free and a public campus venue, and learns from your ratings afterwards.

**Deadline:** National Final submission — Thu 8 Oct 2026, 23:59. Needs a working product, a live demo, and the repo.

---

## How it's built

| Layer | What | Where |
|---|---|---|
| App | Expo / React Native (runs on phones via Expo Go and in the browser) | `App.tsx`, `src/` |
| Database + auth | Supabase Postgres, Tokyo region, project `pboexcylafpwwwzhppvf` | `supabase/schema.sql` |
| Backend logic | Postgres functions (RPC) — matcher, scheduling, privacy, ratings, metrics | `supabase/schema.sql` |
| Demo data | 11 venues, 26 activity cards, 3 demo logins, 30 simulated students | `supabase/seed.sql` |
| API client | Every backend call the app makes | `src/lib/api.ts` |

There is no separate server: the "backend" is a set of SQL functions the app calls through Supabase. That keeps API keys off the phone and enforces privacy in the database.

### Environment files
- `.env` (committed) — public Supabase URL + publishable key. Safe to ship.
- `.env.local` (NOT committed) — `SUPABASE_DB_URL=postgresql://…` (Session pooler string with the DB password). Only needed to run `npm run db:setup`. Never commit or paste it anywhere.

### Commands
```bash
npm install
npm run web          # app in the browser at http://localhost:8081
npm start            # then scan the QR with Expo Go on your phone
npm run db:setup     # (re)create all tables/functions + demo data — wipes demo data
npm run db:seed      # reset demo data only
npm run typecheck
```

### Demo logins
`maya@pool.demo`, `alex@pool.demo`, `sam@pool.demo` — the login screen has one-tap buttons. Profile → "Reset my swipes & squads" wipes that account's activity so the demo can be re-run.

---

## The loop (all real, all in the database)

1. **Sign in** — demo accounts, or any `@unsw.edu.au` email. Other domains are rejected by a database trigger.
2. **Discover** — `get_deck()` returns cards you haven't swiped, ranked by your courses, tags you've said yes to, real sessions first, then popularity. Real weekly sessions roll forward automatically so they never go stale.
3. **"I'm in"** — `swipe()` saves it and immediately runs `form_squad()`:
   - candidates: people who said yes to the same card (+5), share tags from past yeses (+1 each, max 3), share courses (+2 each), take the card's course (+3), you rated 4★+ before (+6), different year (+0.5)
   - hard filters: compatible squad-size preference, no reports between you, nobody rated ≤2★ either way, actually free for the whole session and not double-booked
   - time: the session's fixed time, or the earliest slot in the next 7 days when you + the most candidates are free
   - venue: same category, skipping anywhere any member rated ≤2★, preferring places they rated well
   - writes plain-English "why you matched" reasons from the real data
   - simulated students accept instantly; real users get an invite
4. **Squad proposal** — members are anonymised (degree + year only, no name/face) until everyone accepts. `get_my_squads()` enforces this server-side.
5. **Confirmed** — faces, names and status lines revealed; time, place, duration.
6. **After** — sessions auto-complete when they end (or "Demo: skip to after the session"). Rate each person ("go again?") and the venue.
7. **Re-match** — `get_nudges()` shows "Go again with Mei?" on Discover. `rebook()` re-runs the matcher with only those people, a new time, and a different venue if you rated the last one low.
8. **Metrics** (Profile → Metrics) — live funnel: signed up → onboarded → swiped → matched → confirmed → met up → rated → rebooked, with step conversion, weekly active, average ratings, and weekly sign-up cohorts with week-2 return (churn).

### Privacy by design (say this in the pitch)
- Row-level security on every table: you can only read your own profile, swipes, ratings.
- No endpoint lists other users. Squad-mates are returned only through `get_my_squads()`, anonymised until the squad is confirmed.
- Venues are public campus places only. No DMs/inbox exist.

---

## Demo script (≈2 min, use Maya)
1. Log in as **Maya**. Swipe "Not for me" on one card, then **I'm in** on *COMP1511 Assignment 2 grind*.
2. AI overlay → squad of 4: Mei, Tomas (1st yr) + Priya (3rd yr). Names hidden. Reasons: all free Thursday 2 PM, said I'm in, later-year student.
3. **Looks good** → faces revealed, Law Library L2.
4. **Demo: skip to after the session** → rate Mei 5★, others 4★, Law Library 2★.
5. Back on Discover: **"Go again with Mei & …?"** → tap → new time, *different library* ("Moved to … — you rated Law Library low").
6. Profile → **Metrics** → toggle "Incl. simulated students" to show the funnel.
7. Profile → Reset to run it again.

---

## Status

### Done
- [x] Schema, RLS, seed data
- [x] Matcher (scoring, time-finding, venue choice, reasons) as SQL
- [x] Login, Discover, Squad list, Proposal, Confirmed, Rate, Profile, Metrics screens wired to the DB
- [x] Rebook nudge from ratings

### Next (in priority order)
- [ ] Deploy web build so judges/classmates can open a URL (`npx expo export -p web` → drag `dist/` to Netlify Drop, or Vercel)
- [ ] Test on 2 phones at once with two demo accounts (Alex + Sam both swipe the same card → real invite/accept flow)
- [ ] Real UNSW email sign-in (Supabase email OTP; needs custom SMTP e.g. Resend for volume) + a short onboarding screen (courses, free times, one free-text line, 1-on-1 vs group)
- [ ] Claude-written match reason (Supabase Edge Function; key stays server-side; keep current reasons as fallback)
- [ ] Squad chat (table + Supabase Realtime, members only)
- [ ] Report / block button on the Session screen (`reports` table already exists and the matcher already honours it)

### Deliberately cut
Push notifications, vouchers/partner perks, multi-university, profile browsing, DM inbox, compatibility % scores.

---

## Pitch/deck follow-ups (from mentor feedback)
- End-to-end workflow diagram: user → swipe → AI match → schedule → session → rating → re-match.
- Pilot ladder: one tutorial (20–50) → 1–2 courses → first-year cohort → whole school. Channels: QR on course page, standee, forum post, tutor mention.
- Metrics: activation %, matched → met-up %, rebook rate, 30/60-day cohort retention, churn — all shown live on the Metrics screen.
- Retention/benefit: partner perks (canteen / café vouchers for Pool sessions), mixed-year squads.
- Security: privacy by design today; formal review / ISO 27001 is a later-stage goal, don't claim it now.
- Riskiest assumption to test next: shy students actually turn up. Run one real session with classmates.
