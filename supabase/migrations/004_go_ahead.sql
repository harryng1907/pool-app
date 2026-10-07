-- "Start with who's here": members who said yes can vote to go ahead without the people who haven't answered.
alter table public.squad_members add column if not exists go_ahead boolean not null default false;
