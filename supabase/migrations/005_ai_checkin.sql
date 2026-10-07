-- AI-written match reason, real attendance (check-in), and text similarity on "in your words".
create extension if not exists pg_trgm with schema extensions;
alter table public.squads add column if not exists ai_reason text;
alter table public.squad_members add column if not exists checked_in_at timestamptz;

-- Simulated history: most people in finished demo squads showed up.
update public.squad_members m set checked_in_at = s.starts_at + interval '5 minutes'
from public.squads s
where s.id = m.squad_id and s.status = 'completed' and s.reasons = '{"Simulated history"}'
  and m.status = 'accepted' and m.checked_in_at is null
  and abs(hashtext(m.user_id::text || s.id::text)) % 7 <> 0;
