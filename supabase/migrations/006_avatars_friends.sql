-- Profile photos, friend codes, private plans.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists friend_code text;
update public.profiles set friend_code = upper(substr(md5(random()::text || id::text), 1, 6)) where friend_code is null;
alter table public.profiles alter column friend_code set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);

-- Friends added with a code. Stored once per pair (a < b).
create table if not exists public.friendships (
  a          uuid not null references public.profiles(id) on delete cascade,
  b          uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table public.friendships enable row level security;

-- Private plans (made for friends) never appear in anyone's deck.
alter table public.activities add column if not exists is_private boolean not null default false;

-- Photo storage: public bucket, but file names are random and only shared with squad-mates after reveal.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = true, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

drop policy if exists "avatar upload own folder" on storage.objects;
drop policy if exists "avatar update own folder" on storage.objects;
drop policy if exists "avatar delete own folder" on storage.objects;
create policy "avatar upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
