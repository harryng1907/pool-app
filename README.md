# Pool — find your people at UNSW

**Swipe on things you'd do, not people.** Pool puts you in a squad of 2–4 UNSW students around something concrete (a COMP1511 assignment grind, a boba run, a society event), finds a time you're all free and a public campus venue, and learns from your ratings afterwards.

Built for students who find it hard to make the first move: the squad arrives already formed, there's no inbox and no cold DM, and you see why you were matched.

**Live app:** https://pool-app-gules.vercel.app · runs in any phone browser, or natively through Expo Go.

| Try it in 30 seconds |
|---|
| Open the live app → **Try it as a guest** (fresh account + onboarding), or tap a demo login: `maya@pool.demo`, `alex@pool.demo`, `sam@pool.demo`. |

---

## The core journey

1. **Sign in**: Continue with UNSW (Microsoft SSO, locked to the UNSW tenant), or a `@unsw.edu.au` email. Other domains are rejected by a database trigger.
2. **Onboarding**: icon-first, 5 steps. Name/degree/year → hobbies → courses → free-time grid → squad size + a one-line "in your words".
3. **Discover**: activity cards ranked by your courses, past yeses and popularity. Filter by Societies / Study / Hobby / Career.
4. **"I'm in"**: the matcher forms a squad straight away, picks a time everyone is free, and picks a public venue.
5. **Squad proposal**: squad-mates are anonymised (degree + year only) until everyone accepts.
6. **Confirmed**: names revealed, members-only chat with quick replies, Add to Calendar, "📍 I'm here" check-in.
7. **After**: rate each person ("go again?") and the venue.
8. **Re-match**: "Go again with Mei?" re-runs the matcher with the same people, at a new time, and moves the venue if you rated it low.

## How matching works (AI + data)

| Signal | Effect |
|---|---|
| Said "I'm in" to the same card | +5 |
| Shared courses / takes the card's course | +2 each / +3 |
| Shared tags from past yeses | +1 each (max 3) |
| Similar "in your words" line (`pg_trgm` text similarity) | up to +3 |
| You rated them 4★+ before | +6 |
| **Hard filters** | squad-size preference, both actually free for the whole session, not double-booked, no reports, nobody rated ≤2★ either way |

**Claude-written match reason.** A Supabase Edge Function (`supabase/functions/match-reason`) asks Claude for a one-sentence "why you matched". Claude only sees anonymous labels (Student A/B), degree, year, hobbies, courses and each person's own words. It never sees names or emails. The function runs as the signed-in user, so squad membership is checked by the database. If the AI is unavailable, the rule-based reasons still show.

## Architecture

| Layer | What | Where |
|---|---|---|
| App | Expo / React Native (iOS, Android via Expo Go, and web) | `App.tsx`, `src/` |
| Hosting | Static web build on Vercel | `vercel.json` |
| Database + auth | Supabase Postgres + Auth | `supabase/schema.sql` |
| Backend logic | Postgres functions (RPC): matcher, scheduling, privacy, ratings, chat, metrics | `supabase/functions.sql` |
| AI | Edge Function calling the Claude API (key server-side only) | `supabase/functions/match-reason/` |
| Live DB changes | Applied without wiping data | `supabase/migrations/` |

There is no separate API server. The app calls SQL functions through Supabase, so business rules and privacy are enforced in the database, not trusted to the client.

## Privacy, safety and reliability

- **Row-level security on every table.** You can read only your own profile, swipes and ratings.
- **No endpoint lists other users.** Squad-mates come back only through `get_my_squads()`, anonymised until the squad is confirmed.
- **UNSW-only**: Microsoft SSO locked to the UNSW tenant, plus a domain check in the database.
- **Public campus venues only**; no DMs. Report / block on every squad-mate → never matched again.
- **No-shows handled**: members who said yes can vote to go ahead without non-responders; anyone still silent 2 hours before is dropped.
- **Secrets**: only the public Supabase URL and publishable key are committed (`.env`). The DB URL and the Anthropic key live in `.env.local` / Supabase secrets.
- **Delete account** removes your data.

## Metrics

Profile → **Metrics** shows a live funnel from the database: signed up → onboarded → swiped → matched → confirmed → showed up (check-in) → rated → rebooked. It includes step conversion, weekly active users, average ratings, and weekly cohorts with week-2 return. The "Incl. simulated students" toggle clearly separates demo data from real users.

## Run it locally

```bash
npm install
npm run web            # browser at http://localhost:8081
npm start              # scan the QR with Expo Go
npm run typecheck
node --env-file=.env scripts/smoke.mjs   # end-to-end backend test as Maya (resets her afterwards)
```

Database (needs `SUPABASE_DB_URL` in `.env.local`):

```bash
npm run db:functions   # update backend logic only, keeps data
npm run db:seed        # reset demo data only
npm run db:setup       # rebuild everything (wipes all data)
npm run demo:reset     # reset demo accounts
npm run build:web      # static site in dist/
```

## Honest limits

- The demo uses **30 simulated students** with 2 weeks of simulated history, clearly labelled in the app.
- **Riskiest assumption still untested:** that shy students actually turn up. The check-in step exists to measure exactly this in the first pilot.
- Email confirmation uses Supabase's default mailer (rate-limited). A pilot needs a proper email provider.

## Path to adoption and next 6 months

**Pilot ladder:** one COMP1511 tutorial (20–50 students) → 1–2 first-year courses → first-year cohort → UNSW-wide. Each step is gated on activation ≥ 60% and met-up/matched ≥ 50%.

**Next:** run a real pilot session, add push notifications, partner with Arc societies for real events, partner with campus cafés for perks, add a proper email provider, and run a formal security review.

More detail: [`PLAN.md`](PLAN.md) (build status), [`docs/MENTOR-FEEDBACK.md`](docs/MENTOR-FEEDBACK.md), [`docs/workflow.svg`](docs/workflow.svg).
