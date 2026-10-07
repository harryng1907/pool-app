-- Society events (host) and student-suggested activities (created_by).
alter table public.activities add column if not exists host text;
alter table public.activities add column if not exists created_by uuid references public.profiles(id) on delete cascade;
create index if not exists activities_created_by_idx on public.activities (created_by, created_at);
