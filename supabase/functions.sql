-- =====================================================================
-- POOL — server-side logic (Postgres functions called by the app via RPC).
-- Safe to re-run at any time; does not touch data.
--   npm run db:functions
-- =====================================================================

-- ---------------------------------------------------------------------
-- Sign-up: UNSW emails only, and every new account gets a profile row.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local text := coalesce(split_part(new.email, '@', 1), 'guest');
begin
  -- Guests (anonymous demo sessions) are allowed; real accounts must be UNSW.
  if not coalesce(new.is_anonymous, false) and (new.email is null
     or not (new.email ilike '%@unsw.edu.au' or new.email ilike '%.unsw.edu.au' or new.email ilike '%@pool.demo')) then
    raise exception 'Pool is only open to UNSW students (use your UNSW email).';
  end if;
  insert into profiles (id, display_name, initials, avatar_color, real_only)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'name', ''), initcap(v_local)),
          upper(left(coalesce(nullif(new.raw_user_meta_data->>'name', ''), v_local), 2)),
          ('{#0E5B66,#2563EB,#9333EA,#DC2626,#EA580C,#16A34A,#DB2777,#0891B2}'::text[])[1 + abs(hashtext(new.id::text)) % 8],
          -- Real UNSW accounts only ever match real people; demo + guest accounts get the simulated students.
          not coalesce(new.is_anonymous, false) and new.email not ilike '%@pool.demo')
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
    -- Already booked then? (Simulated demo students can be in many squads at once,
    -- so several judges can run the same demo in parallel.)
    select 1 from squad_members m join squads s on s.id = m.squad_id
    where m.user_id = p_user and m.status <> 'declined' and s.status in ('proposed','confirmed')
      and not (select is_seed from profiles where id = p_user)
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
           + 1.5 * cardinality(array(select unnest(a.tags) intersect select unnest(me.interests)))
           + (case when a.kind = 'session' then 1.5 else 0 end)
           + ln(1 + ic.n) * 0.5
           -- happening in the next couple of days → a little higher
           + (case when a.starts_at < now() + interval '2 days' then 0.5 else 0 end) as rank
      from activities a
      cross join (select coalesce(interests, '{}') as interests, real_only from profiles where id = v_me) me
      left join venues v on v.id = a.venue_id
      cross join lateral (
        select count(*) as n from swipes s
        where s.activity_id = a.id and s.decision = 'in' and s.user_id <> v_me
          and not (me.real_only and (select is_seed from profiles where id = s.user_id))
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
        'host', a.host, 'suggested', a.created_by is not null,
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
  v_required    uuid;  -- the student who suggested this activity always gets a spot
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
    + least(3, cardinality(array(select unnest(p.interests) intersect select unnest(me.interests))))
    + least(2, cardinality(array(select unnest(p.interests) intersect select unnest(a.tags))))
    + (case when p.year <> me.year then 0.5 else 0 end) as score
  from eligible p;

  if v_has_pref then
    delete from _cand where not (id = any(p_preferred));
  else
    delete from _cand where score < 5;
  end if;

  -- Real people only: if I asked for it, or a real-only person is a candidate, drop the simulated students.
  if me.real_only or exists (select 1 from _cand c join profiles p on p.id = c.id where p.real_only) then
    delete from _cand where is_seed;
  end if;

  -- A student-suggested activity always includes the person who suggested it.
  if a.created_by is not null and a.created_by <> v_me then
    select id into v_required from _cand where id = a.created_by;
    update _cand set score = score + 20 where id = v_required;
  end if;

  if not v_has_pref then
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
      continue when v_required is not null and not pool_is_free(v_required, v_slot, a.duration_mins);
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
    if found then
      v_reasons := v_reasons || case when r.n = 2 and array_length(v_everyone, 1) = 2
                                     then format('You both take %s', r.course)
                                     else format('%s of you take %s', r.n, r.course) end;
    end if;
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

  select string_agg(t, ' & ') as ts into r from (
    select t from unnest(me.interests) t
    where (select count(*) from profiles where id = any(v_chosen) and t = any(interests)) = array_length(v_chosen, 1)
    order by (t = any(a.tags)) desc, t limit 2
  ) z;
  if r.ts is not null then
    v_reasons := v_reasons || format('You''re all into %s', r.ts);
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

  -- Nobody waits forever: 2 hours before the start, anyone who hasn't answered is dropped.
  perform pool_settle_squad(s.id, true)
  from squads s
  where s.status = 'proposed' and s.starts_at < now() + interval '2 hours'
    and s.id in (select squad_id from squad_members where user_id = v_me);

  return coalesce((
    select jsonb_agg(sq order by rk, starts_at desc)
    from (
      select case s.status when 'proposed' then 0 when 'confirmed' then 1 else 2 end as rk,
             s.starts_at,
             jsonb_build_object(
               'id', s.id, 'status', s.status, 'my_status', mm.status, 'my_go_ahead', mm.go_ahead,
               'starts_at', s.starts_at, 'ends_at', s.ends_at,
               'reasons', s.reasons, 'rebook_of', s.rebook_of,
               'revealed', s.status in ('confirmed','completed'),
               'rated', exists (select 1 from member_ratings r where r.squad_id = s.id and r.rater_id = v_me)
                     or exists (select 1 from venue_ratings r where r.squad_id = s.id and r.rater_id = v_me),
               'activity', jsonb_build_object(
                 'id', a.id, 'title', a.title, 'description', a.description, 'course', a.course,
                 'category', a.category, 'squad_type', a.squad_type, 'icon', a.icon, 'tags', a.tags,
                 'host', a.host,
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
                       'is_me', m.user_id = v_me, 'status', m.status, 'hidden', false, 'go_ahead', m.go_ahead)
                   else
                     jsonb_build_object(
                       'id', null, 'name', p.degree_short || ' student', 'initials', '?',
                       'avatar_color', '#B8C2CC', 'degree', p.degree, 'degree_short', p.degree_short,
                       'year', p.year, 'status_quote', null,
                       'is_me', false, 'status', m.status, 'hidden', true, 'go_ahead', m.go_ahead)
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
    if found then perform pool_seed_says(p_squad, 'intro'); end if;
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

  -- Simulated students rate you back, so the demo can show mutual connections.
  insert into member_ratings (squad_id, rater_id, ratee_id, score)
  select p_squad, (e->>'user_id')::uuid, v_me,
         case when (e->>'score')::int >= 4 then 4 + abs(hashtext(v_me::text || (e->>'user_id'))) % 2 else 3 end
  from jsonb_array_elements(coalesce(p_scores, '[]'::jsonb)) e
  join profiles p on p.id = (e->>'user_id')::uuid and p.is_seed
  on conflict (squad_id, rater_id, ratee_id) do nothing;

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
      'year', p.year, 'vibe', p.vibe, 'status_quote', p.status_quote, 'group_pref', p.group_pref, 'real_only', p.real_only,
      'interests', to_jsonb(p.interests),
      'onboarded', p.onboarded_at is not null,
      'email', (select coalesce(email, '') from auth.users where id = v_me),
      'is_guest', (select coalesce(is_anonymous, false) from auth.users where id = v_me),
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
  if not exists (select 1 from auth.users where id = v_me and (email ilike '%@pool.demo' or is_anonymous)) then
    raise exception 'Only demo and guest accounts can be reset';
  end if;
  delete from squads where id in (select squad_id from squad_members where user_id = v_me);
  delete from swipes where user_id = v_me;
  delete from member_ratings where rater_id = v_me;
  delete from venue_ratings where rater_id = v_me;
  delete from app_events where user_id = v_me;
  delete from reports where reporter_id = v_me;
  delete from activities where created_by = v_me;
  delete from member_ratings where ratee_id = v_me;
end $$;

-- Onboarding / edit profile. Every key is optional; only keys present are changed.
-- { full_name, degree, degree_short, year, group_pref, vibe, status_quote,
--   interests: [..], courses: [..], availability: [{dow, start, end}] }
create or replace function public.save_profile(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me    uuid := auth.uid();
  v_name  text := nullif(trim(p->>'full_name'), '');
  v_first text := split_part(nullif(trim(p->>'full_name'), ''), ' ', 1);
  v_last  text := split_part(nullif(trim(p->>'full_name'), ''), ' ', 2);
begin
  if v_me is null then raise exception 'not signed in'; end if;

  update profiles set
    full_name    = coalesce(v_name, full_name),
    display_name = coalesce(nullif(v_first, ''), display_name),
    initials     = coalesce(upper(nullif(left(v_first, 1) || coalesce(nullif(left(v_last, 1), ''), substr(v_first, 2, 1)), '')), initials),
    degree       = coalesce(nullif(p->>'degree', ''), degree),
    degree_short = coalesce(nullif(p->>'degree_short', ''), degree_short),
    year         = coalesce((p->>'year')::smallint, year),
    group_pref   = coalesce(nullif(p->>'group_pref', ''), group_pref),
    real_only    = coalesce((p->>'real_only')::boolean, real_only),
    vibe         = case when p ? 'vibe' then nullif(trim(p->>'vibe'), '') else vibe end,
    status_quote = case when p ? 'status_quote' then nullif(trim(p->>'status_quote'), '') else status_quote end,
    interests    = case when p ? 'interests' then array(select jsonb_array_elements_text(p->'interests')) else interests end,
    onboarded_at = coalesce(onboarded_at, now())
  where id = v_me;

  if p ? 'courses' then
    delete from profile_courses where user_id = v_me;
    insert into profile_courses (user_id, course)
    select distinct v_me, upper(trim(c)) from jsonb_array_elements_text(p->'courses') c where trim(c) <> '';
  end if;

  if p ? 'availability' then
    delete from availability where user_id = v_me;
    insert into availability (user_id, dow, start_hour, end_hour)
    select v_me, (e->>'dow')::int, (e->>'start')::int, (e->>'end')::int
    from jsonb_array_elements(p->'availability') e
    on conflict do nothing;
  end if;

  return get_me();
end $$;

-- ---------------------------------------------------------------------
-- Squad chat (no table policies: all access goes through these functions)
-- ---------------------------------------------------------------------

create or replace function public.can_chat(p_squad uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from squads s join squad_members m on m.squad_id = s.id
    where s.id = p_squad and s.status in ('confirmed','completed')
      and m.user_id = auth.uid() and m.status = 'accepted'
  );
$$;

-- Simulated students say something friendly, so the demo chat isn't empty.
create or replace function public.pool_seed_says(p_squad uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_quote text;
  v_cat text;
begin
  select p.id, p.status_quote into v_user, v_quote
  from squad_members m join profiles p on p.id = m.user_id
  where m.squad_id = p_squad and m.status = 'accepted' and p.is_seed
  order by m.responded_at, p.id limit 1;
  if v_user is null then return; end if;

  select a.category into v_cat from squads s join activities a on a.id = s.activity_id where s.id = p_squad;

  insert into messages (squad_id, user_id, body) values (p_squad, v_user,
    case p_kind
      when 'intro' then 'Hey all 👋 ' || coalesce(v_quote, 'See you there!')
      else case v_cat
        when 'quiet'  then 'Sounds good! I''ll grab us a table 📚'
        when 'food'   then 'Yesss, so in 🧋'
        when 'active' then 'Let''s go 💪 I can bring a spare'
        when 'maker'  then 'Bringing my toolkit 🔧'
        else 'Can''t wait 🙌'
      end
    end);
end $$;
revoke all on function public.pool_seed_says(uuid, text) from public, anon, authenticated;

create or replace function public.get_messages(p_squad uuid, p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not can_chat(p_squad) then raise exception 'Chat opens once your squad is confirmed'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'body', m.body, 'created_at', m.created_at, 'is_me', m.user_id = auth.uid(),
      'name', p.display_name, 'initials', p.initials, 'avatar_color', p.avatar_color) order by m.id)
    from messages m join profiles p on p.id = m.user_id
    where m.squad_id = p_squad and m.id > p_after
  ), '[]'::jsonb);
end $$;

create or replace function public.send_message(p_squad uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_chat(p_squad) then raise exception 'Chat opens once your squad is confirmed'; end if;
  insert into messages (squad_id, user_id, body) values (p_squad, auth.uid(), trim(p_body));
  -- First message from a real person → a simulated squad-mate replies once.
  if (select count(*) from messages m join profiles p on p.id = m.user_id
      where m.squad_id = p_squad and p.is_seed) <= 1 then
    perform pool_seed_says(p_squad, 'reply');
  end if;
end $$;

-- Report someone from a squad you were both in. The matcher never pairs you again.
create or replace function public.report_member(p_squad uuid, p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_squad_member(p_squad)
     or not exists (select 1 from squad_members where squad_id = p_squad and user_id = p_user) then
    raise exception 'You can only report people from your own squads';
  end if;
  insert into reports (reporter_id, reported_id, squad_id, reason) values (auth.uid(), p_user, p_squad, p_reason);
end $$;

-- ---------------------------------------------------------------------
-- "Your people": mutual connections. No friend requests — you're connected
-- when you've done a session together and BOTH rated each other 4★+.
-- ---------------------------------------------------------------------

create or replace function public.get_connections()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not signed in'; end if;
  return coalesce((
    select jsonb_agg(c order by last_at desc)
    from (
      select x.last_at,
             jsonb_build_object(
               'id', p.id, 'name', p.display_name, 'initials', p.initials, 'avatar_color', p.avatar_color,
               'degree_short', p.degree_short, 'year', p.year, 'status_quote', p.status_quote,
               'sessions_together', x.n, 'last_activity', x.last_title, 'last_squad_id', x.last_squad,
               'shared_interests', to_jsonb(array(select unnest(p.interests) intersect select unnest(me.interests)))
             ) as c
      from (
        select other.user_id as uid, count(*) as n, max(s.ends_at) as last_at,
               (array_agg(a.title order by s.ends_at desc))[1] as last_title,
               (array_agg(s.id order by s.ends_at desc))[1] as last_squad
        from squads s
        join activities a on a.id = s.activity_id
        join squad_members mine on mine.squad_id = s.id and mine.user_id = v_me and mine.status = 'accepted'
        join squad_members other on other.squad_id = s.id and other.user_id <> v_me and other.status = 'accepted'
        where s.status = 'completed'
        group by other.user_id
      ) x
      join profiles p on p.id = x.uid
      cross join (select coalesce(interests, '{}') as interests from profiles where id = v_me) me
      where (select avg(score) from member_ratings where rater_id = v_me and ratee_id = x.uid) >= 4
        and (select avg(score) from member_ratings where rater_id = x.uid and ratee_id = v_me) >= 4
        and not exists (select 1 from reports r where (r.reporter_id = v_me and r.reported_id = x.uid)
                                                   or (r.reporter_id = x.uid and r.reported_id = v_me))
    ) q
  ), '[]'::jsonb);
end $$;

-- Start a new 1-on-1 with a connection: same kind of activity as last time, a new time you're both free.
create or replace function public.invite_connection(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_last uuid;
  v_activity text;
begin
  select (c->>'last_squad_id')::uuid into v_last
  from jsonb_array_elements(get_connections()) c where (c->>'id')::uuid = p_user;
  if v_last is null then raise exception 'You can only invite your connections'; end if;
  select activity_id into v_activity from squads where id = v_last;
  return form_squad(v_activity, array[p_user], v_last);
end $$;

-- ---------------------------------------------------------------------
-- Suggest an activity. It becomes a card in other people's decks, and the
-- suggester is just another squad member — nobody has to "host".
-- p: { title, squad_type, category, icon, course?, description?, duration_mins?, tags?: [] }
-- ---------------------------------------------------------------------

create or replace function public.create_activity(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_title  text := trim(coalesce(p->>'title', ''));
  v_course text := nullif(upper(replace(trim(coalesce(p->>'course', '')), ' ', '')), '');
  v_id     text := 'u-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  v_tags   text[];
  v_squad  uuid;
begin
  if v_me is null then raise exception 'not signed in'; end if;
  if length(v_title) < 4 or length(v_title) > 60 then raise exception 'Give it a short title (4–60 characters)'; end if;
  if v_course is not null and v_course !~ '^[A-Z]{4}[0-9]{4}$' then raise exception 'Course codes look like COMP1511'; end if;
  if (select count(*) from activities where created_by = v_me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You can suggest up to 5 activities a day';
  end if;

  v_tags := array(select distinct t from (
      select jsonb_array_elements_text(coalesce(p->'tags', '[]'::jsonb)) t
      union all select v_course where v_course is not null
    ) z where t is not null limit 5);

  insert into activities (id, kind, squad_type, title, description, course, category, tags, icon, duration_mins, created_by)
  values (v_id, 'interest',
          coalesce(nullif(p->>'squad_type', ''), 'hobby'),
          v_title,
          nullif(left(trim(coalesce(p->>'description', '')), 140), ''),
          v_course,
          coalesce(nullif(p->>'category', ''), 'social'),
          v_tags,
          left(coalesce(nullif(p->>'icon', ''), 'sparkles'), 40),
          coalesce((p->>'duration_mins')::int, 90),
          v_me);

  -- You're obviously in for your own idea — try to form a squad straight away.
  insert into swipes (user_id, activity_id, decision) values (v_me, v_id, 'in');
  v_squad := form_squad(v_id);
  return jsonb_build_object('activity_id', v_id, 'squad_id', v_squad);
end $$;

-- Permanently delete my account. Cascades to profile, swipes, squads I'm in, ratings,
-- chat messages, reports and suggested activities. Demo accounts can't be deleted.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not signed in'; end if;
  if (select email from auth.users where id = v_me) ilike '%@pool.demo' then
    raise exception 'Demo accounts can''t be deleted — use Reset instead';
  end if;
  -- Squads that would be left with one person (or only simulated students) are cancelled.
  update squads s set status = 'cancelled'
  where s.status in ('proposed','confirmed')
    and s.id in (select squad_id from squad_members where user_id = v_me)
    and ((select count(*) from squad_members m where m.squad_id = s.id and m.user_id <> v_me and m.status <> 'declined') < 2
         -- or only simulated students would be left
         or not exists (select 1 from squad_members m join profiles p on p.id = m.user_id
                        where m.squad_id = s.id and m.user_id <> v_me and not p.is_seed));
  delete from auth.users where id = v_me;
end $$;

-- ---------------------------------------------------------------------
-- "Start with who's here"
-- ---------------------------------------------------------------------

-- Drop everyone who hasn't answered, then confirm (2+ people) or cancel.
-- p_force: skip the vote check (used for the 2-hours-before timeout).
create or replace function public.pool_settle_squad(p_squad uuid, p_force boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_accepted int;
  v_voted int;
begin
  select count(*) filter (where status = 'accepted'),
         count(*) filter (where status = 'accepted' and (go_ahead or (select is_seed from profiles where id = user_id)))
    into v_accepted, v_voted
  from squad_members where squad_id = p_squad;

  -- Everyone who said yes has to agree (simulated students always do).
  if not p_force and v_voted < v_accepted then
    return 'waiting';
  end if;

  update squad_members set status = 'declined', responded_at = now()
  where squad_id = p_squad and status = 'invited';

  if v_accepted >= 2 then
    update squads set status = 'confirmed' where id = p_squad and status = 'proposed';
    if found then perform pool_seed_says(p_squad, 'intro'); end if;
    return 'confirmed';
  end if;
  update squads set status = 'cancelled' where id = p_squad and status = 'proposed';
  return 'cancelled';
end $$;
revoke all on function public.pool_settle_squad(uuid, boolean) from public, anon, authenticated;

-- I've said yes — vote to start with whoever has said yes so far.
create or replace function public.vote_go_ahead(p_squad uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  update squad_members m set go_ahead = true
  from squads s
  where m.squad_id = p_squad and m.user_id = auth.uid() and m.status = 'accepted'
    and s.id = m.squad_id and s.status = 'proposed';
  if not found then raise exception 'Say yes to the squad first'; end if;

  if (select count(*) from squad_members where squad_id = p_squad and status = 'accepted') < 2 then
    raise exception 'You need at least one other person who said yes';
  end if;
  return pool_settle_squad(p_squad, false);
end $$;
