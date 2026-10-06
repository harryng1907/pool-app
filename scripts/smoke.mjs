// End-to-end check of the backend through the public API, exactly as the app calls it.
//   node scripts/smoke.mjs            (uses maya@pool.demo, resets her data first)
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env', quiet: true });
const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY, {
  auth: { persistSession: false },
});

const email = process.argv[2] ?? 'maya@pool.demo';
const call = async (fn, args) => {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
};
const log = (label, v) => console.log(`\n== ${label}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}`);

const { error: authErr } = await sb.auth.signInWithPassword({ email, password: 'pool-demo-2026' });
if (authErr) throw authErr;
console.log('signed in as', email);

await call('reset_my_demo');

// Privacy: other people's profiles must not be readable.
const { data: others } = await sb.from('profiles').select('id, display_name');
log('profiles visible to me (should be just me)', others.map((p) => p.display_name));

const deck = await call('get_deck', { p_limit: 30 });
log('deck', deck.slice(0, 6).map((c) => `${c.title} | ${c.kind} | ${c.starts_at ?? '-'} | ${c.interested_count} yes`));

const squadId = await call('swipe', { p_activity: 'comp1511-a2', p_decision: 'in' });
log('squad id', squadId);

let squads = await call('get_my_squads');
let s = squads.find((x) => x.id === squadId);
log('proposed squad', { status: s.status, when: s.starts_at, venue: s.venue.name, reasons: s.reasons,
  members: s.members.map((m) => `${m.name} (${m.degree_short} yr${m.year}) hidden=${m.hidden} id=${m.id}`) });

log('respond', await call('respond_squad', { p_squad: squadId, p_accept: true }));
squads = await call('get_my_squads');
s = squads.find((x) => x.id === squadId);
log('after accept', { status: s.status, members: s.members.map((m) => `${m.name} hidden=${m.hidden}`) });

await call('end_session', { p_squad: squadId });
const others2 = s.members.filter((m) => !m.is_me);
await call('rate_squad', {
  p_squad: squadId,
  p_scores: others2.map((m, i) => ({ user_id: m.id, score: i === 0 ? 5 : 3 })),
  p_venue_score: 2,
  p_comment: 'too quiet to talk',
});
const nudges = await call('get_nudges');
log('nudges', nudges);

const reb = await call('rebook', { p_squad: squadId });
squads = await call('get_my_squads');
s = squads.find((x) => x.id === reb);
log('rebooked squad', s ? { status: s.status, when: s.starts_at, venue: s.venue.name, reasons: s.reasons,
  members: s.members.map((m) => m.name) } : reb);

// A few interest cards to make sure free-time search works.
for (const id of ['boba', 'lofi-cowork', 'late-night-lib']) {
  const r = await call('swipe', { p_activity: id, p_decision: 'in' });
  const sq = (await call('get_my_squads')).find((x) => x.id === r);
  log(`swipe ${id}`, sq ? `${sq.starts_at} @ ${sq.venue.name} with ${sq.members.length - 1} | ${sq.reasons.join(' / ')}` : 'no match');
}

log('me', await call('get_me'));
log('metrics (incl seed)', (await call('get_metrics', { p_include_seed: true })).funnel);

await call('reset_my_demo');
console.log('\nreset done — all good');
