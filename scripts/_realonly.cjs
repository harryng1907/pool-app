const fs = require('fs');
const edit = (file, pairs) => {
  let s = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(file + ' nf ' + a.slice(0, 70));
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file, s);
};

fs.writeFileSync('supabase/migrations/003_real_only.sql', `-- "Real people only": never match this person with simulated (seed) students.
alter table public.profiles add column if not exists real_only boolean not null default false;
-- Real UNSW accounts that already exist get it switched on.
update public.profiles p set real_only = true
from auth.users u
where u.id = p.id and not p.is_seed and not coalesce(u.is_anonymous, false) and u.email not ilike '%@pool.demo';
`);

edit('supabase/schema.sql', [
  [`  interests     text[] not null default '{}',  -- hobbies picked in onboarding (same vocabulary as activity tags)`,
   `  interests     text[] not null default '{}',  -- hobbies picked in onboarding (same vocabulary as activity tags)
  real_only     boolean not null default false,  -- never match with simulated students`],
]);

edit('supabase/functions.sql', [
  // New real UNSW accounts default to real people only; demo + guest accounts keep the simulated students.
  [`  insert into profiles (id, display_name, initials, avatar_color)
  values (new.id,`, `  insert into profiles (id, display_name, initials, avatar_color, real_only)
  values (new.id,`],
  [`          ('{#0E5B66,#2563EB,#9333EA,#DC2626,#EA580C,#16A34A,#DB2777,#0891B2}'::text[])[1 + abs(hashtext(new.id::text)) % 8])
  on conflict (id) do nothing;`, `          ('{#0E5B66,#2563EB,#9333EA,#DC2626,#EA580C,#16A34A,#DB2777,#0891B2}'::text[])[1 + abs(hashtext(new.id::text)) % 8],
          -- Real UNSW accounts only ever match real people; demo + guest accounts get the simulated students.
          not coalesce(new.is_anonymous, false) and new.email not ilike '%@pool.demo')
  on conflict (id) do nothing;`],
  // Deck: interest counts only count real people when you're in real-only mode.
  [`      cross join (select coalesce(interests, '{}') as interests from profiles where id = v_me) me
      left join venues v on v.id = a.venue_id
      cross join lateral (
        select count(*) as n from swipes s
        where s.activity_id = a.id and s.decision = 'in' and s.user_id <> v_me
      ) ic`, `      cross join (select coalesce(interests, '{}') as interests, real_only from profiles where id = v_me) me
      left join venues v on v.id = a.venue_id
      cross join lateral (
        select count(*) as n from swipes s
        where s.activity_id = a.id and s.decision = 'in' and s.user_id <> v_me
          and not (me.real_only and (select is_seed from profiles where id = s.user_id))
      ) ic`],
  // Matcher: no simulated students if you want real people only, or if a real-only person is in the running.
  [`    delete from _cand where score < 5;
    delete from _cand where id not in (select id from _cand order by score desc limit 8);
  end if;`, `    delete from _cand where score < 5;
  end if;

  -- Real people only: if I asked for it, or a real-only person is a candidate, drop the simulated students.
  if me.real_only or exists (select 1 from _cand c join profiles p on p.id = c.id where p.real_only) then
    delete from _cand where is_seed;
  end if;

  if not v_has_pref then
    delete from _cand where id not in (select id from _cand order by score desc limit 8);
  end if;`],
  [`'group_pref', p.group_pref,`, `'group_pref', p.group_pref, 'real_only', p.real_only,`],
  [`    group_pref   = coalesce(nullif(p->>'group_pref', ''), group_pref),`, `    group_pref   = coalesce(nullif(p->>'group_pref', ''), group_pref),
    real_only    = coalesce((p->>'real_only')::boolean, real_only),`],
]);

edit('src/types.ts', [
  [`  group_pref: 'one' | 'small' | 'any';
  interests: string[];
  onboarded: boolean;`, `  group_pref: 'one' | 'small' | 'any';
  real_only: boolean;
  interests: string[];
  onboarded: boolean;`],
  [`  group_pref?: 'one' | 'small' | 'any';
  vibe?: string;`, `  group_pref?: 'one' | 'small' | 'any';
  real_only?: boolean;
  vibe?: string;`],
]);

edit('src/screens/ProfileScreen.tsx', [
  [`  ScrollView,
  Image,`, `  ScrollView,
  Image,
  Switch,`],
  [`  onInvite: (c: Connection) => void;
}`, `  onInvite: (c: Connection) => void;
  onToggleRealOnly: (value: boolean) => void;
}`],
  [`  connections,
  onInvite,
`, `  connections,
  onInvite,
  onToggleRealOnly,
`],
  [`      {/* Your people:`, `      {/* Who can end up in your squads */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={[styles.prefIconBox, me.real_only && { backgroundColor: THEME.colors.successGreenLight }]}>
            <Ionicons
              name={me.real_only ? 'people' : 'hardware-chip-outline'}
              size={18}
              color={me.real_only ? THEME.colors.successGreen : THEME.colors.deepTeal}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Real people only</Text>
            <Text style={styles.toggleSub}>
              {me.real_only
                ? 'Only real students join your squads. Test with friends!'
                : '30 simulated students fill squads instantly (demo mode).'}
            </Text>
          </View>
          <Switch
            value={me.real_only}
            onValueChange={onToggleRealOnly}
            disabled={busy}
            trackColor={{ false: '#D1D5DB', true: THEME.colors.successGreen }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Real people only"
          />
        </View>
      </View>

      {/* Your people:`],
]);

let p = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');
p = p.replace(/\n\}\);\s*$/, `
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  toggleSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
`);
fs.writeFileSync('src/screens/ProfileScreen.tsx', p);

edit('App.tsx', [
  [`        connections={connections}
        onInvite={handleInvite}`, `        connections={connections}
        onInvite={handleInvite}
        onToggleRealOnly={(value) =>
          withBusy(async () => {
            setMe(await api.saveProfile({ real_only: value }));
            setCards(await api.getDeck());
          })
        }`],
]);
