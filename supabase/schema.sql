-- =====================================================================
-- POOL — database schema, privacy rules (RLS) and server-side logic.
-- Safe to re-run: it drops and recreates every POOL table and function.
-- Run with:  npm run db:setup   (or paste into Supabase → SQL Editor)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

drop table if exists
  public.app_events, public.reports, public.venue_ratings, public.member_ratings,
  public.squad_members, public.squads, public.swipes, public.activities,
  public.availability, public.profile_courses, public.profiles, public.venues
  cascade;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Public campus places. Sessions only ever happen at one of these.
create table public.venues (
  id        text primary key,
  name      text not null,
  detail    text,
  category  text not null check (category in ('quiet','social','active','maker','food'))
);

-- One row per user. Private: only the owner can read it directly.
-- Squad-mates see a subset through get_my_squads(), and only after the squad is confirmed.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  full_name     text,
  initials      text not null,
  avatar_color  text not null default '#0E5B66',
  degree        text not null default 'UNSW student',
  degree_short  text not null default 'UNSW',
  year          smallint not null default 1,
  vibe          text,          -- free-text "how do you like to hang out / study"
  status_quote  text,          -- shown to squad-mates after reveal
  group_pref    text not null default 'small' check (group_pref in ('one','small','any')),
  is_seed       boolean not null default false,  -- simulated students for the demo
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table public.profile_courses (
  user_id  uuid references public.profiles(id) on delete cascade,
  course   text not null,
  primary key (user_id, course)
);

-- Weekly free windows in Sydney local time. dow: 0 = Sunday … 6 = Saturday.
create table public.availability (
  user_id     uuid references public.profiles(id) on delete cascade,
  dow         smallint not null check (dow between 0 and 6),
  start_hour  smallint not null check (start_hour between 0 and 23),
  end_hour    smallint not null check (end_hour between 1 and 24),
  primary key (user_id, dow, start_hour),
  check (end_hour > start_hour)
);

-- The swipe deck. 'interest' cards have no fixed time (the matcher finds one);
-- 'session' cards are real events with a time and a venue.
create table public.activities (
  id             text primary key,
  kind           text not null check (kind in ('interest','session')),
  squad_type     text not null check (squad_type in ('deadline','hobby','career')),
  title          text not null,
  description    text,
  course         text,
  category       text not null check (category in ('quiet','social','active','maker','food')),
  tags           text[] not null default '{}',
  icon           text not null default 'sparkles',
  duration_mins  int not null default 120,
  venue_id       text references public.venues(id),
  starts_at      timestamptz,
  capacity       int not null default 4 check (capacity between 2 and 4),
  created_at     timestamptz not null default now()
);

create table public.swipes (
  user_id      uuid references public.profiles(id) on delete cascade,
  activity_id  text references public.activities(id) on delete cascade,
  decision     text not null check (decision in ('in','pass')),
  created_at   timestamptz not null default now(),
  primary key (user_id, activity_id)
);

create table public.squads (
  id           uuid primary key default gen_random_uuid(),
  activity_id  text not null references public.activities(id) on delete cascade,
  venue_id     text references public.venues(id),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'proposed'
               check (status in ('proposed','confirmed','completed','cancelled')),
  reasons      text[] not null default '{}',
  rebook_of    uuid references public.squads(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.squad_members (
  squad_id      uuid references public.squads(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  status        text not null default 'invited' check (status in ('invited','accepted','declined')),
  responded_at  timestamptz,
  primary key (squad_id, user_id)
);

-- "Would you go again with this person?" 1–5
create table public.member_ratings (
  squad_id    uuid references public.squads(id) on delete cascade,
  rater_id    uuid references public.profiles(id) on delete cascade,
  ratee_id    uuid references public.profiles(id) on delete cascade,
  score       smallint not null check (score between 1 and 5),
  created_at  timestamptz not null default now(),
  primary key (squad_id, rater_id, ratee_id)
);

create table public.venue_ratings (
  squad_id    uuid references public.squads(id) on delete cascade,
  rater_id    uuid references public.profiles(id) on delete cascade,
  venue_id    text references public.venues(id) on delete cascade,
  score       smallint not null check (score between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  primary key (squad_id, rater_id)
);

create table public.reports (
  id           bigserial primary key,
  reporter_id  uuid references public.profiles(id) on delete cascade,
  reported_id  uuid references public.profiles(id) on delete cascade,
  squad_id     uuid references public.squads(id) on delete set null,
  reason       text,
  created_at   timestamptz not null default now()
);

-- Lightweight analytics (app opens etc.) for the metrics screen.
create table public.app_events (
  id          bigserial primary key,
  user_id     uuid default auth.uid() references public.profiles(id) on delete cascade,
  name        text not null,
  props       jsonb,
  created_at  timestamptz not null default now()
);

create index on public.swipes (activity_id, decision);
create index on public.squad_members (user_id);
create index on public.member_ratings (rater_id);
create index on public.app_events (user_id, created_at);

-- ---------------------------------------------------------------------
-- Row-level security: the database itself enforces privacy.
-- ---------------------------------------------------------------------

alter table public.venues          enable row level security;
alter table public.profiles        enable row level security;
alter table public.profile_courses enable row level security;
alter table public.availability    enable row level security;
alter table public.activities      enable row level security;
alter table public.swipes          enable row level security;
alter table public.squads          enable row level security;
alter table public.squad_members   enable row level security;
alter table public.member_ratings  enable row level security;
alter table public.venue_ratings   enable row level security;
alter table public.reports         enable row level security;
alter table public.app_events      enable row level security;

create or replace function public.is_squad_member(p_squad uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from squad_members where squad_id = p_squad and user_id = auth.uid());
$$;

create policy "venues readable"     on public.venues     for select to authenticated using (true);
create policy "activities readable" on public.activities for select to authenticated using (true);

-- Nobody can browse other people's profiles.
create policy "own profile read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own courses"      on public.profile_courses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own availability" on public.availability    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own swipes"       on public.swipes          for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "member reads squad"       on public.squads        for select to authenticated using (public.is_squad_member(id));
create policy "own membership read"      on public.squad_members for select to authenticated using (user_id = auth.uid());
create policy "own member ratings read"  on public.member_ratings for select to authenticated using (rater_id = auth.uid());
create policy "own venue ratings read"   on public.venue_ratings  for select to authenticated using (rater_id = auth.uid());
create policy "file a report"            on public.reports        for insert to authenticated with check (reporter_id = auth.uid());
create policy "log own events"           on public.app_events     for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Sign-up: UNSW emails only, and every new account gets a profile row.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local text := split_part(new.email, '@', 1);
begin
  if new.email is null
     or not (new.email ilike '%@unsw.edu.au' or new.email ilike '%.unsw.edu.au' or new.email ilike '%@pool.demo') then
    raise exception 'Pool is only open to UNSW students (use your UNSW email).';
  end if;
  insert into profiles (id, display_name, initials)
  values (new.id, initcap(v_local), upper(left(v_local, 2)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Time helpers (all scheduling is in Sydney local time)
-- ---------------------------------------------------------------------

-- Next occurrence of weekday/hour, at least 2 hours from now.
create or replace function public.pool_next_slot(p_dow int, p_hour int)
returns timestamptz language sql stable as $$
  select min((d::date + make_time(p_hour, 0, 0)) at time zone 'Australia/Sydney')
  from generate_series((now() at time zone 'Australia/Sydney')::date,
                       (now() at time zone 'Australia/Sydney')::date + 7, interval '1 day') d
  where extract(dow from d) = p_dow
    and ((d::date + make_time(p_hour, 0, 0)) at time zone 'Australia/Sydney') > now() + interval '2 hours';
$$;

-- Is this user free for the whole window, and not already booked into another squad?
create or replace function public.pool_is_free(p_user uuid, p_start timestamptz, p_mins int)
returns boolean language sql stable security definer set search_path = public as $$
  with t as (select p_start at time zone 'Australia/Sydney' as l)
  select exists (
    select 1 from availability av, t
    where av.user_id = p_user
      and av.dow = extract(dow from t.l)
      and av.start_hour <= extract(hour from t.l) + extract(minute from t.l) / 60.0
      and av.end_hour   >= extract(hour from t.l) + extract(minute from t.l) / 60.0 + p_mins / 60.0
  ) and not exists (
    select 1 from squad_members m join squads s on s.id = m.squad_id
    where m.user_id = p_user and m.status <> 'declined' and s.status in ('proposed','confirmed')
      and tstzrange(s.starts_at, s.ends_at) && tstzrange(p_start, p_start + make_interval(mins => p_mins))
  );
$$;
revoke all on function public.pool_is_free(uuid, timestamptz, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- The deck
-- ---------------------------------------------------------------------

create or replace function public.get_deck(p_limit int default 20)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not signed in'; end if;

  -- Real sessions recur weekly: roll any past ones forward so the deck never goes stale.
  update activities
     set starts_at = starts_at + ceil(extract(epoch from (now() - starts_at)) / 604800.0) * interval '7 days'
   where kind = 'session' and starts_at < now();

  return coalesce((
    select jsonb_agg(card order by rank desc, a.starts_at nulls last, a.id)
    from (
      select a.*, v.name as venue_name, v.detail as venue_detail, ic.n as interested,
             -- rank: my courses first, then things like what I've said yes to, then real sessions, then popularity
             (case when a.course in (select course from profile_courses where user_id = v_me) then 4 else 0 end)
           + (select count(*) from swipes s join activities x on x.id = s.activity_id, unnest(x.tags) t
               where s.user_id = v_me and s.decision = 'in' and t = any(a.tags))
           + (case when a.kind = 'session' then 1.5 else 0 end)
           + ln(1 + ic.n) * 0.5
           -- happening in the next couple of days → a little higher
           + (case when a.starts_at < now() + interval '2 days' then 0.5 else 0 end) as rank
      from activities a
      left join venues v on v.id = a.venue_id
      cross join lateral (
        select count(*) as n from swipes s
        where s.activity_id = a.id and s.decision = 'in' and s.user_id <> v_me
      ) ic
      where not exists (select 1 from swipes s where s.activity_id = a.id and s.user_id = v_me)
      order by rank desc, a.starts_at nulls last, a.id
      limit p_limit
    ) a
    cross join lateral (
      select jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'squad_type', a.squad_type, 'title', a.title,
        'description', a.description, 'course', a.course, 'category', a.category,
        'tags', a.tags, 'icon', a.icon, 'duration_mins', a.duration_mins,
        'starts_at', a.starts_at, 'capacity', a.capacity,
        'venue', case when a.venue_id is null then null
                      else jsonb_build_object('id', a.venue_id, 'name', a.venue_name, 'detail', a.venue_detail) end,
        'interested_count', a.interested,
        'spots_left', case when a.kind = 'session' then greatest(1, a.capacity - (
            select count(distinct m.user_id) from squads s join squad_members m on m.squad_id = s.id
            where s.activity_id = a.id and s.status in ('proposed','confirmed') and m.status = 'accepted'))
          else null end
      ) as card
    ) c
  ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- The matcher
--   Scores candidates on: said "I'm in" to the same card, shared tags from past
--   swipes, shared courses, the card's course, ratings you gave them before,
--   and a small mixed-year bonus. Hard filters: group-size preference, no
--   reports, no low ratings either way, and actually free at the chosen time.
--   Then picks a time everyone is free and a public venue nobody rated badly.
-- ---------------------------------------------------------------------

create or replace function public.form_squad(
  p_activity text,
  p_preferred uuid[] default '{}',
  p_rebook_of uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me          uuid := auth.uid();
  a             activities%rowtype;
  me            profiles%rowtype;
  v_has_pref    boolean := coalesce(array_length(p_preferred, 1), 0) > 0;
  v_target      int;
  v_fixed_time  boolean;
  v_slot        timestamptz;
  v_best_slot   timestamptz;
  v_best_count  int := 0;
  v_count       int;
  v_pool_size   int;
  v_chosen      uuid[];
  v_everyone    uuid[];
  v_venue       text;
  v_venue_name  text;
  v_avoided     text;
  v_squad       uuid;
  v_reasons     text[] := '{}';
  v_from        timestamptz := now() + interval '2 hours';
  r             record;
begin
  if v_me is null then raise exception 'not signed in'; end if;
  select * into a from activities where id = p_activity;
  if not found then raise exception 'unknown activity %', p_activity; end if;
  select * into me from profiles where id = v_me;

  -- Already in an active squad for this card? Return it instead of making another.
  if p_rebook_of is null then
    select s.id into v_squad
    from squads s join squad_members m on m.squad_id = s.id
    where s.activity_id = p_activity and m.user_id = v_me and m.status <> 'declined'
      and s.status in ('proposed','confirmed')
    limit 1;
    if v_squad is not null then return v_squad; end if;
  end if;

  v_target := case when v_has_pref then array_length(p_preferred, 1)
                   when me.group_pref = 'one' then 1
                   else 3 end;
  if a.kind = 'session' then v_target := least(v_target, a.capacity - 1); end if;
  v_fixed_time := a.kind = 'session' and a.starts_at > now() + interval '30 minutes' and p_rebook_of is null;

  -- 1. Score everyone who could plausibly join.
  drop table if exists _cand;
  create temp table _cand on commit drop as
  with my_courses as (select course from profile_courses where user_id = v_me),
  eligible as (
    select p.* from profiles p
    where p.id <> v_me
      and (p.id = any(p_preferred) or case me.group_pref
            when 'one'   then p.group_pref in ('one','any')
            when 'small' then p.group_pref in ('small','any')
            else true end)
      and not exists (select 1 from swipes s where s.user_id = p.id and s.activity_id = a.id and s.decision = 'pass')
      and not exists (select 1 from reports rp where (rp.reporter_id = v_me and rp.reported_id = p.id)
                                                 or (rp.reporter_id = p.id and rp.reported_id = v_me))
      and coalesce((select avg(score) from member_ratings mr where mr.rater_id = v_me and mr.ratee_id = p.id), 3) > 2
      and coalesce((select avg(score) from member_ratings mr where mr.rater_id = p.id and mr.ratee_id = v_me), 3) > 2
  )
  select p.id, p.is_seed, p.year,
      (case when p.id = any(p_preferred) then 20 else 0 end)
    + (case when exists (select 1 from swipes s where s.user_id = p.id and s.activity_id = a.id and s.decision = 'in') then 5 else 0 end)
    + least(3, (select count(distinct t) from swipes s join activities x on x.id = s.activity_id, unnest(x.tags) t
                 where s.user_id = p.id and s.decision = 'in' and t = any(a.tags)))
    + 2 * (select count(*) from profile_courses pc where pc.user_id = p.id and pc.course in (select course from my_courses))
    + (case when a.course is not null and exists (select 1 from profile_courses pc where pc.user_id = p.id and pc.course = a.course) then 3 else 0 end)
    + (case when (select avg(score) from member_ratings mr where mr.rater_id = v_me and mr.ratee_id = p.id) >= 4 then 6 else 0 end)
    + (case when p.year <> me.year then 0.5 else 0 end) as score
  from eligible p;

  if v_has_pref then
    delete from _cand where not (id = any(p_preferred));
  else
    delete from _cand where score < 5;
    delete from _cand where id not in (select id from _cand order by score desc limit 8);
  end if;

  -- 2. Pick a time. A rebook looks from the day after the last session onwards.
  if p_rebook_of is not null then
    select greatest(v_from, ((starts_at at time zone 'Australia/Sydney')::date + 1)::timestamp at time zone 'Australia/Sydney')
      into v_from from squads where id = p_rebook_of;
  end if;

  if v_fixed_time then
    v_best_slot := a.starts_at;
  else
    select count(*) into v_pool_size from _cand;
    for v_slot in
      select (d::date + make_time(h, 0, 0)) at time zone 'Australia/Sydney'
      from generate_series((v_from at time zone 'Australia/Sydney')::date,
                           (v_from at time zone 'Australia/Sydney')::date + 7, interval '1 day') d,
           generate_series(8, 20) h
      where ((d::date + make_time(h, 0, 0)) at time zone 'Australia/Sydney') >= v_from
      order by 1
    loop
      continue when not pool_is_free(v_me, v_slot, a.duration_mins);
      select count(*) into v_count from _cand c where pool_is_free(c.id, v_slot, a.duration_mins);
      continue when v_has_pref and v_count < v_pool_size;  -- rebook: everyone you asked for must be free
      if v_count > v_best_count then
        v_best_count := v_count;
        v_best_slot := v_slot;
      end if;
      exit when v_count >= v_target;
    end loop;
    if v_best_slot is null then return null; end if;
  end if;

  delete from _cand c where not pool_is_free(c.id, v_best_slot, a.duration_mins);

  select array_agg(id order by score desc) into v_chosen
  from (select id, score from _cand order by score desc limit v_target) z;
  if v_chosen is null then return null; end if;
  v_everyone := v_chosen || v_me;

  -- 3. Pick a venue: the card's own venue or one of the same type, skipping anywhere
  --    a squad member rated 2★ or lower, preferring places they rated well.
  select v.id, v.name into v_venue, v_venue_name
  from venues v
  left join (
    select venue_id, avg(score) as avg_score, min(score) as min_score
    from venue_ratings where rater_id = any(v_everyone) group by venue_id
  ) vr on vr.venue_id = v.id
  where (v.id = a.venue_id or v.category = a.category)
    and coalesce(vr.min_score, 5) > 2
  order by (v.id = a.venue_id and p_rebook_of is null) desc,
           vr.avg_score desc nulls last,
           md5(v.id || v_me::text)
  limit 1;

  if v_venue is null then
    select v.id, v.name into v_venue, v_venue_name from venues v
    where v.id = a.venue_id or v.category = a.category order by (v.id = a.venue_id) desc limit 1;
  end if;

  select v.name into v_avoided
  from venue_ratings vr join venues v on v.id = vr.venue_id
  where vr.rater_id = v_me and vr.score <= 2 and (v.category = a.category or v.id = a.venue_id)
    and v.id <> v_venue
  order by vr.created_at desc limit 1;

  -- 4. Explain the match in plain words.
  if a.course is not null then
    select count(*) into v_count from profile_courses where course = a.course and user_id = any(v_everyone);
    if v_count = 2 and array_length(v_everyone, 1) = 2 then
      v_reasons := v_reasons || format('You both take %s', a.course);
    elsif v_count = array_length(v_everyone, 1) then
      v_reasons := v_reasons || format('All %s of you take %s', v_count, a.course);
    elsif v_count >= 2 then
      v_reasons := v_reasons || format('%s of you take %s', v_count, a.course);
    end if;
  else
    select course, count(*) as n into r from profile_courses
    where user_id = any(v_everyone) group by course having count(*) >= 2 order by count(*) desc limit 1;
    if found then v_reasons := v_reasons || format('%s of you take %s', r.n, r.course); end if;
  end if;

  v_reasons := v_reasons || format('Everyone is free %s',
    to_char(v_best_slot at time zone 'Australia/Sydney', 'FMDay FMHH12:MI AM'));

  select count(*) into v_count from swipes
  where activity_id = a.id and decision = 'in' and user_id = any(v_chosen);
  if v_count = array_length(v_chosen, 1) then
    v_reasons := v_reasons || case when v_count = 1 then 'They said "I''m in" to this too' else 'Everyone said "I''m in" to this too' end;
  elsif v_count > 0 then
    v_reasons := v_reasons || format('%s of them said "I''m in" to this too', v_count);
  else
    select t, count(*) as n into r
    from swipes s join activities x on x.id = s.activity_id, unnest(x.tags) t
    where s.user_id = any(v_chosen) and s.decision = 'in' and t = any(a.tags)
    group by t order by count(*) desc limit 1;
    if found then v_reasons := v_reasons || format('They keep saying yes to "%s" too', r.t); end if;
  end if;

  for r in
    select p.display_name, round(avg(mr.score))::int as s
    from member_ratings mr join profiles p on p.id = mr.ratee_id
    where mr.rater_id = v_me and mr.ratee_id = any(v_chosen)
    group by p.display_name having avg(mr.score) >= 4
  loop
    v_reasons := v_reasons || format('You rated %s %s★ last time', r.display_name, r.s);
  end loop;

  if exists (select 1 from profiles where id = any(v_chosen) and year >= me.year + 2) then
    v_reasons := v_reasons || 'Includes a later-year student who''s been through this'::text;
  end if;

  if v_avoided is not null then
    v_reasons := v_reasons || format('Moved to %s — you rated %s low', v_venue_name, v_avoided);
  end if;

  -- 5. Create the squad. Simulated (seed) students accept instantly; real users get invited.
  insert into squads (activity_id, venue_id, starts_at, ends_at, status, reasons, rebook_of, created_by)
  values (a.id, v_venue, v_best_slot, v_best_slot + make_interval(mins => a.duration_mins),
          'proposed', v_reasons, p_rebook_of, v_me)
  returning id into v_squad;

  insert into squad_members (squad_id, user_id, status) values (v_squad, v_me, 'invited');
  insert into squad_members (squad_id, user_id, status, responded_at)
  select v_squad, p.id, case when p.is_seed then 'accepted' else 'invited' end,
         case when p.is_seed then now() end
  from profiles p where p.id = any(v_chosen);

  return v_squad;
end $$;

-- Swipe, and on "I'm in" immediately try to form a squad. Returns the squad id or null.
create or replace function public.swipe(p_activity text, p_decision text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into swipes (user_id, activity_id, decision) values (auth.uid(), p_activity, p_decision)
  on conflict (user_id, activity_id) do update set decision = excluded.decision, created_at = now();
  if p_decision = 'in' then
    return form_squad(p_activity);
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------
-- Squads: list, respond, finish, rate, rebook
-- ---------------------------------------------------------------------

create or replace function public.get_my_squads()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not signed in'; end if;

  update squads set status = 'completed'
  where status = 'confirmed' and ends_at < now()
    and id in (select squad_id from squad_members where user_id = v_me);

  return coalesce((
    select jsonb_agg(sq order by rk, starts_at desc)
    from (
      select case s.status when 'proposed' then 0 when 'confirmed' then 1 else 2 end as rk,
             s.starts_at,
             jsonb_build_object(
               'id', s.id, 'status', s.status, 'my_status', mm.status,
               'starts_at', s.starts_at, 'ends_at', s.ends_at,
               'reasons', s.reasons, 'rebook_of', s.rebook_of,
               'revealed', s.status in ('confirmed','completed'),
               'rated', exists (select 1 from member_ratings r where r.squad_id = s.id and r.rater_id = v_me)
                     or exists (select 1 from venue_ratings r where r.squad_id = s.id and r.rater_id = v_me),
               'activity', jsonb_build_object(
                 'id', a.id, 'title', a.title, 'description', a.description, 'course', a.course,
                 'category', a.category, 'squad_type', a.squad_type, 'icon', a.icon, 'tags', a.tags,
                 'duration_mins', a.duration_mins),
               'venue', jsonb_build_object('id', v.id, 'name', v.name, 'detail', v.detail),
               'members', (
                 select jsonb_agg(
                   -- Privacy: names, faces and quotes only after everyone has accepted.
                   case when s.status in ('confirmed','completed') or m.user_id = v_me
                          -- …or you've already met them in a past session
                          or exists (select 1 from squads ps
                                     join squad_members a1 on a1.squad_id = ps.id and a1.user_id = v_me and a1.status = 'accepted'
                                     join squad_members a2 on a2.squad_id = ps.id and a2.user_id = m.user_id and a2.status = 'accepted'
                                     where ps.status = 'completed') then
                     jsonb_build_object(
                       'id', p.id, 'name', p.display_name, 'initials', p.initials,
                       'avatar_color', p.avatar_color, 'degree', p.degree, 'degree_short', p.degree_short,
                       'year', p.year, 'status_quote', p.status_quote,
                       'is_me', m.user_id = v_me, 'status', m.status, 'hidden', false)
                   else
                     jsonb_build_object(
                       'id', null, 'name', p.degree_short || ' student', 'initials', '?',
                       'avatar_color', '#B8C2CC', 'degree', p.degree, 'degree_short', p.degree_short,
                       'year', p.year, 'status_quote', null,
                       'is_me', false, 'status', m.status, 'hidden', true)
                   end
                   order by (m.user_id = v_me), m.responded_at nulls last)
                 from squad_members m join profiles p on p.id = m.user_id
                 where m.squad_id = s.id and m.status <> 'declined')
             ) as sq
      from squads s
      join squad_members mm on mm.squad_id = s.id and mm.user_id = v_me
      join activities a on a.id = s.activity_id
      left join venues v on v.id = s.venue_id
      where mm.status <> 'declined' and s.status <> 'cancelled'
    ) q
  ), '[]'::jsonb);
end $$;

-- Accept or decline a proposed squad. Confirms it once everyone left has accepted.
create or replace function public.respond_squad(p_squad uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_status text;
  v_left int;
  v_pending int;
begin
  update squad_members set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
  where squad_id = p_squad and user_id = v_me;
  if not found then raise exception 'not in this squad'; end if;

  select count(*) filter (where status <> 'declined'), count(*) filter (where status = 'invited')
    into v_left, v_pending
  from squad_members where squad_id = p_squad;

  if v_left < 2 then
    update squads set status = 'cancelled' where id = p_squad and status = 'proposed';
  elsif v_pending = 0 then
    update squads set status = 'confirmed' where id = p_squad and status = 'proposed';
  end if;

  select status into v_status from squads where id = p_squad;
  return v_status;
end $$;

-- Mark a confirmed session as done (normally happens automatically when it ends;
-- this lets the demo skip ahead).
create or replace function public.end_session(p_squad uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_squad_member(p_squad) then raise exception 'not in this squad'; end if;
  update squads set status = 'completed' where id = p_squad and status = 'confirmed';
end $$;

-- p_scores: [{ "user_id": "...", "score": 1-5 }, ...]
create or replace function public.rate_squad(p_squad uuid, p_scores jsonb, p_venue_score int default null, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if not exists (
    select 1 from squads s join squad_members m on m.squad_id = s.id
    where s.id = p_squad and m.user_id = v_me and s.status = 'completed'
  ) then
    raise exception 'You can rate a squad after the session';
  end if;

  insert into member_ratings (squad_id, rater_id, ratee_id, score)
  select p_squad, v_me, (e->>'user_id')::uuid, (e->>'score')::int
  from jsonb_array_elements(coalesce(p_scores, '[]'::jsonb)) e
  where (e->>'user_id')::uuid in (select user_id from squad_members where squad_id = p_squad and user_id <> v_me)
  on conflict (squad_id, rater_id, ratee_id) do update set score = excluded.score, created_at = now();

  if p_venue_score is not null then
    insert into venue_ratings (squad_id, rater_id, venue_id, score, comment)
    select p_squad, v_me, venue_id, p_venue_score, p_comment from squads where id = p_squad
    on conflict (squad_id, rater_id) do update set score = excluded.score, comment = excluded.comment, created_at = now();
  end if;
end $$;

-- "Go again?" suggestions: past squads where you rated someone 4★+ and haven't rebooked yet.
create or replace function public.get_nudges()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  return coalesce((
    select jsonb_agg(n order by ended desc)
    from (
      select s.ends_at as ended,
             jsonb_build_object(
               'squad_id', s.id, 'activity_title', a.title, 'activity_icon', a.icon,
               'venue_name', v.name,
               'venue_score', (select score from venue_ratings vr where vr.squad_id = s.id and vr.rater_id = v_me),
               'names', jsonb_agg(p.display_name order by r.score desc),
               'top_score', max(r.score)) as n
      from squads s
      join member_ratings r on r.squad_id = s.id and r.rater_id = v_me and r.score >= 4
      join profiles p on p.id = r.ratee_id
      join activities a on a.id = s.activity_id
      left join venues v on v.id = s.venue_id
      where s.status = 'completed'
        and not exists (
          select 1 from squads s2 join squad_members m2 on m2.squad_id = s2.id and m2.user_id = v_me
          where s2.rebook_of = s.id and s2.status <> 'cancelled' and m2.status <> 'declined')
      group by s.id, a.title, a.icon, v.name, s.ends_at
      order by s.ends_at desc
      limit 3
    ) q
  ), '[]'::jsonb);
end $$;

-- Rebook with the people you rated 4★+ from a past squad.
create or replace function public.rebook(p_squad uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pref uuid[];
  v_activity text;
begin
  if not is_squad_member(p_squad) then raise exception 'not in this squad'; end if;
  select array_agg(ratee_id) into v_pref from (
    select ratee_id from member_ratings
    where squad_id = p_squad and rater_id = auth.uid()
    group by ratee_id having avg(score) >= 4
  ) z;
  if v_pref is null then raise exception 'Rate someone 4★ or more to rebook with them'; end if;
  select activity_id into v_activity from squads where id = p_squad;
  return form_squad(v_activity, v_pref, p_squad);
end $$;

-- ---------------------------------------------------------------------
-- Profile + metrics
-- ---------------------------------------------------------------------

create or replace function public.get_me()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  return (
    select jsonb_build_object(
      'id', p.id, 'name', p.display_name, 'full_name', p.full_name, 'initials', p.initials,
      'avatar_color', p.avatar_color, 'degree', p.degree, 'degree_short', p.degree_short,
      'year', p.year, 'vibe', p.vibe, 'status_quote', p.status_quote, 'group_pref', p.group_pref,
      'onboarded', p.onboarded_at is not null,
      'email', (select email from auth.users where id = v_me),
      'courses', coalesce((select jsonb_agg(course order by course) from profile_courses where user_id = v_me), '[]'),
      'availability', coalesce((select jsonb_agg(jsonb_build_object('dow', dow, 'start', start_hour, 'end', end_hour) order by dow, start_hour)
                                from availability where user_id = v_me), '[]'),
      'stats', jsonb_build_object(
        'swipes', (select count(*) from swipes where user_id = v_me and decision = 'in'),
        'squads_done', (select count(*) from squads s join squad_members m on m.squad_id = s.id
                        where m.user_id = v_me and m.status = 'accepted' and s.status = 'completed'),
        'hours', coalesce((select round(sum(extract(epoch from (s.ends_at - s.starts_at))) / 3600)
                           from squads s join squad_members m on m.squad_id = s.id
                           where m.user_id = v_me and m.status = 'accepted' and s.status = 'completed'), 0),
        'people_met', (select count(distinct m2.user_id) from squads s
                       join squad_members m on m.squad_id = s.id and m.user_id = v_me and m.status = 'accepted'
                       join squad_members m2 on m2.squad_id = s.id and m2.user_id <> v_me and m2.status = 'accepted'
                       where s.status = 'completed'))
    )
    from profiles p where p.id = v_me
  );
end $$;

-- Funnel + retention straight from the tables. p_include_seed adds the simulated students.
create or replace function public.get_metrics(p_include_seed boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_users uuid[];
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select array_agg(id) into v_users from profiles where p_include_seed or not is_seed;
  v_users := coalesce(v_users, '{}');

  return jsonb_build_object(
    'funnel', jsonb_build_array(
      jsonb_build_object('step', 'Signed up',  'users', array_length(v_users, 1)),
      jsonb_build_object('step', 'Onboarded',  'users', (select count(*) from profiles where id = any(v_users) and onboarded_at is not null)),
      jsonb_build_object('step', 'Swiped',     'users', (select count(distinct user_id) from swipes where user_id = any(v_users))),
      jsonb_build_object('step', 'Matched',    'users', (select count(distinct user_id) from squad_members where user_id = any(v_users))),
      jsonb_build_object('step', 'Confirmed',  'users', (select count(distinct m.user_id) from squad_members m join squads s on s.id = m.squad_id
                                                          where m.user_id = any(v_users) and m.status = 'accepted' and s.status in ('confirmed','completed'))),
      jsonb_build_object('step', 'Met up',     'users', (select count(distinct m.user_id) from squad_members m join squads s on s.id = m.squad_id
                                                          where m.user_id = any(v_users) and m.status = 'accepted' and s.status = 'completed')),
      jsonb_build_object('step', 'Rated',      'users', (select count(distinct rater_id) from member_ratings where rater_id = any(v_users))),
      jsonb_build_object('step', 'Rebooked',   'users', (select count(distinct m.user_id) from squad_members m join squads s on s.id = m.squad_id
                                                          where m.user_id = any(v_users) and s.rebook_of is not null and m.status <> 'declined'))
    ),
    'totals', jsonb_build_object(
      'activities', (select count(*) from activities),
      'squads', (select count(*) from squads),
      'avg_member_rating', (select round(avg(score), 2) from member_ratings),
      'avg_venue_rating', (select round(avg(score), 2) from venue_ratings),
      'weekly_active', (select count(distinct user_id) from (
          select user_id, created_at from swipes union all select user_id, created_at from app_events) e
        where user_id = any(v_users) and created_at > now() - interval '7 days')
    ),
    'cohorts', coalesce((
      select jsonb_agg(c order by week)
      from (
        select date_trunc('week', p.created_at) as week,
               jsonb_build_object(
                 'week', to_char(date_trunc('week', p.created_at), 'DD Mon'),
                 'signed_up', count(*),
                 'active_week_1', count(*) filter (where exists (
                   select 1 from (select user_id, created_at from swipes union all select user_id, created_at from app_events) e
                   where e.user_id = p.id and e.created_at >= p.created_at + interval '7 days'
                     and e.created_at < p.created_at + interval '14 days'))) as c
        from profiles p where p.id = any(v_users)
        group by 1
      ) q
    ), '[]')
  );
end $$;

-- Demo accounts only: wipe my swipes, squads and ratings so the demo can be run again.
create or replace function public.reset_my_demo()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if (select email from auth.users where id = v_me) not ilike '%@pool.demo' then
    raise exception 'Only demo accounts can be reset';
  end if;
  delete from squads where id in (select squad_id from squad_members where user_id = v_me);
  delete from swipes where user_id = v_me;
  delete from member_ratings where rater_id = v_me;
  delete from venue_ratings where rater_id = v_me;
  delete from app_events where user_id = v_me;
end $$;
