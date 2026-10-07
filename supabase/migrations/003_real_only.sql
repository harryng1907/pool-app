-- "Real people only": never match this person with simulated (seed) students.
alter table public.profiles add column if not exists real_only boolean not null default false;
-- Real UNSW accounts that already exist get it switched on.
update public.profiles p set real_only = true
from auth.users u
where u.id = p.id and not p.is_seed and not coalesce(u.is_anonymous, false) and u.email not ilike '%@pool.demo';
