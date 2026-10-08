-- A confirmed squad whose time is being changed stays "revealed" (names, chat) while people re-confirm.
alter table public.squads add column if not exists was_confirmed boolean not null default false;
