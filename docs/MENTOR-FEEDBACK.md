# Mentor feedback → what we built

Use this for the National Final deck. **Built** = working in the app today (show it live). **Plan** = say it as a next step, don't claim it.

| Mentor said | Status | What exists / what to say |
|---|---|---|
| After meeting up → rate / vote each person, "would you go again?" | **Built** | Rate screen: 1–5 stars per person + the venue. Ratings are private. |
| AI uses ratings for the next recommendation ("you rated A highly, go with A again") | **Built** | Discover shows "Go again with Mei?" (adds "Weekend's here!" Fri–Sun). Tapping it re-matches the same people at a new time. The matcher gives +6 to people you rated 4★+, and never matches you with someone either of you rated ≤2★. |
| Bad café → AI picks a different place next time | **Built** | Venues rated ≤2★ by anyone in the squad are skipped. The reason says so: "Moved to K17 — you rated Law Library low". |
| Learn habits (group of 5, goes to library) → nudge "weekend, library again?" | **Partly** | Built: hobbies from onboarding and every "I'm in" swipe shape the deck and the matcher. Built: in-app weekend nudge. Plan: push notifications. |
| Build connections that last | **Built** | "Your people": after a session, if you BOTH rated each other 4★+, you're connected and can invite each other to new sessions. No friend requests, no browsing. |
| Different from Tinder: connections, not romance; groups | **Built** | You swipe activities, not people. No photos before a squad forms, no romantic field, squads of 2–4, no inbox or DMs. |
| Separate sessions → choose what type of group to join | **Built** | Filter chips on Discover: Societies / Study / Hobby / Career. |
| (Team idea) Society events | **Built** | Society cards with a badge and "Go as a squad". Pitch: "Societies give you the event, Pool gives you the people to walk in with." The demo uses made-up society names; real ones would be a partnership. |
| (Team idea) Create your own event | **Built** | ➕ Suggest an activity. Nobody hosts: it becomes a card and the matcher builds the squad, so it's still no first move. |
| 1-on-1 or 2–3 people? Close the group when full | **Built** | Onboarding: 1-on-1 / Small group / Either. The matcher respects it. Real sessions show "N spots open" and cap at 4. |
| Survey + rating after every session → recommendations | **Built** | The Rate screen is the post-session survey. It feeds the matcher and the metrics. |
| Validate a concrete date and time | **Built** | Every squad has an exact time from everyone's free-time grid, plus a public venue. Add to Calendar opens a pre-filled Google Calendar event. |
| Strong privacy: hide user info, only reveal what's needed in the session | **Built** | Row-level security on every table. Before everyone accepts, squad-mates show only "CS · 1st yr". Names, faces and status lines appear after confirmation. No endpoint lists other students. Chat is members-only. |
| Security certification (ISO) | **Plan** | Say "privacy by design now; formal security review / ISO 27001 at scale". Don't claim it. |
| Report / block | **Built** | Flag on each squad-mate → reason → the matcher never pairs you again. |
| Too much text → more icons | **Built** | Icon-first onboarding (hobby tiles, free-time grid, squad-size cards). Icons on every card, filter, chat quick-replies (👋 📍 🏃). |
| Clear target from the start: introverts | **Built** | The product shape: no first message, squad arrives formed, match reason shown, quick-reply chips so you don't have to compose a message. |
| App needs a benefit: different, trusted, private | **Built + plan** | Built: UNSW-only, public venues, privacy. Plan: partner perks (canteen / café discounts for Pool sessions) as the retention hook. |
| Metrics: new installs, active users, MAU, retention, cohorts, conversion install→active, churn, frequency | **Built** | Profile → Metrics, live from the database: funnel (signed up → onboarded → swiped → matched → confirmed → met up → rated → rebooked) with step conversion %, weekly active, average ratings, weekly sign-up cohorts with week-2 return. Churn = 100% − return. Toggle "Incl. simulated students" for the demo. |
| Write out the whole workflow, end to end | **Built** | `docs/workflow.svg`: drop it on a slide. |
| Scale: pilot 20–50 → 1–2 classes → whole school | **Plan** | Pilot ladder: one COMP1511 tutorial (20–50) → 1–2 first-year courses → first-year cohort → UNSW. Gate each step on activation ≥ 60% and met-up/matched ≥ 50%. |
| Viral: forum, QR, standee at the gate, friend referrals | **Plan** | QR on the course Moodle page and lecture slide, standee at the main walkway / library, a Reddit and Discord post, a tutor mention. Referral: "bring a friend into your squad" (later). |
| Commercialise, show it's executable | **Plan** | Free for students. Revenue from campus partners (cafés and venues pay for footfall from squads), plus a university / Arc licence for wellbeing and retention data (aggregate only). |
| Measure input (active) and output (monthly) after 2–3 months; must measure churn | **Built (instrumented)** | Events, swipes, squads and ratings are all timestamped, so cohorts and churn are computable from day one of the pilot. |

## Honest limits (say them before a judge does)
- The demo uses **30 simulated students** with 2 weeks of simulated history. The toggle on the metrics screen says so.
- **The riskiest assumption is still untested:** that shy students actually turn up. The first pilot measures matched → met up.
- Email confirmation for new sign-ups uses Supabase's default mailer, which sends only a few emails per hour. For a real pilot we'd plug in a proper email provider.
