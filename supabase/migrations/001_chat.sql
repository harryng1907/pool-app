-- Squad chat. Only members of a confirmed (or finished) squad can read or post.
create table if not exists public.messages (
  id          bigserial primary key,
  squad_id    uuid not null references public.squads(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(trim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists messages_squad_idx on public.messages (squad_id, created_at);
alter table public.messages enable row level security;
