// Every call the app makes to the backend lives here.
// Business logic (matching, privacy, scheduling) runs in Postgres — see supabase/schema.sql.
import { supabase } from './supabase';
import { ActivityCard, Me, Metrics, Nudge, ProfileInput, Squad } from '../types';

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// --- Auth -------------------------------------------------------------

export const DEMO_ACCOUNTS = [
  { email: 'maya@pool.demo', name: 'Maya', blurb: 'SENG · 1st yr · likes small groups', color: '#F57C2A', initials: 'ML' },
  { email: 'alex@pool.demo', name: 'Alex', blurb: 'CS · 1st yr · prefers one-on-one', color: '#0EA5E9', initials: 'AN' },
  { email: 'sam@pool.demo', name: 'Sam', blurb: 'Commerce/CS · 2nd yr · open to anything', color: '#16A34A', initials: 'SP' },
];
const DEMO_PASSWORD = 'pool-demo-2026';

export async function signInDemo(email: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(error.message);
}

const UNSW_EMAIL = /@([a-z0-9-]+\.)*unsw\.edu\.au$/i;
export const isUnswEmail = (email: string) => UNSW_EMAIL.test(email.trim());

/** Create an account. Returns true if signed in straight away, false if a confirmation email was sent. */
export async function signUp(email: string, password: string, name: string): Promise<boolean> {
  if (!isUnswEmail(email)) throw new Error('Use your UNSW email (e.g. z1234567@ad.unsw.edu.au)');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: name.trim() },
      emailRedirectTo: typeof window !== 'undefined' && window.location ? window.location.origin : undefined,
    },
  });
  if (error) throw new Error(error.message.includes('Database error') ? 'Pool is only open to UNSW emails.' : error.message);
  return !!data.session;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message === 'Email not confirmed' ? 'Check your UNSW inbox and confirm your email first.' : error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

// --- Profile ----------------------------------------------------------

export const getMe = () => rpc<Me | null>('get_me');

export const saveProfile = (input: ProfileInput) => rpc<Me>('save_profile', { p: input });

// --- Deck -------------------------------------------------------------

export const getDeck = (limit = 20) => rpc<ActivityCard[]>('get_deck', { p_limit: limit });

/** Records the swipe. On "in", the matcher runs and returns a squad id (or null if no match yet). */
export const swipe = (activityId: string, decision: 'in' | 'pass') =>
  rpc<string | null>('swipe', { p_activity: activityId, p_decision: decision });

// --- Squads -----------------------------------------------------------

export const getMySquads = () => rpc<Squad[]>('get_my_squads');

export const respondToSquad = (squadId: string, accept: boolean) =>
  rpc<string>('respond_squad', { p_squad: squadId, p_accept: accept });

export const endSession = (squadId: string) => rpc<void>('end_session', { p_squad: squadId });

export const rateSquad = (
  squadId: string,
  scores: { user_id: string; score: number }[],
  venueScore: number | null,
  comment?: string,
) =>
  rpc<void>('rate_squad', {
    p_squad: squadId,
    p_scores: scores,
    p_venue_score: venueScore,
    p_comment: comment ?? null,
  });

export const getNudges = () => rpc<Nudge[]>('get_nudges');

/** Re-match with the people you rated 4★+ in a past squad. Returns the new squad id, or null if no shared time. */
export const rebook = (squadId: string) => rpc<string | null>('rebook', { p_squad: squadId });

// --- Metrics / demo ---------------------------------------------------

export const getMetrics = (includeSeed = false) =>
  rpc<Metrics>('get_metrics', { p_include_seed: includeSeed });

export const resetMyDemo = () => rpc<void>('reset_my_demo');

export async function logEvent(name: string, props?: Record<string, unknown>) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('app_events').insert({ user_id: data.user.id, name, props: props ?? null });
}
