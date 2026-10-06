// Reset the three demo accounts (swipes, squads, ratings, chat) so the demo can be run fresh.
//   node scripts/reset-demo.mjs
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env', quiet: true });
for (const email of ['maya@pool.demo', 'alex@pool.demo', 'sam@pool.demo']) {
  const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  const { error: authError } = await sb.auth.signInWithPassword({ email, password: 'pool-demo-2026' });
  if (authError) throw authError;
  const { error } = await sb.rpc('reset_my_demo');
  if (error) throw error;
  console.log('reset', email);
}
