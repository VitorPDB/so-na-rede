-- Run once in Supabase SQL Editor. Only explicitly allowlisted users may publish.
create table if not exists public.scout_editors (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.scout_editors enable row level security;
revoke all on public.scout_editors from anon, authenticated;

create table if not exists public.live_public (
  slug text primary key check (slug = 'so-na-rede'),
  revision bigint not null default 0,
  media_revision bigint not null default 0,
  last_request_id uuid,
  updated_at timestamptz not null default now(),
  snapshot jsonb not null
);
create table if not exists public.live_media (
  slug text primary key check (slug = 'so-na-rede'),
  media jsonb not null
);
alter table public.live_public enable row level security;
alter table public.live_media enable row level security;
revoke all on public.live_public, public.live_media from anon, authenticated;
grant select on public.live_public, public.live_media to anon, authenticated;
drop policy if exists public_score_read on public.live_public;
create policy public_score_read on public.live_public for select to anon, authenticated using (true);
drop policy if exists public_media_read on public.live_media;
create policy public_media_read on public.live_media for select to anon, authenticated using (true);

-- One immutable identity per game. Corrections update that game's publication.
-- Unfinished games are kept internally but are not visible in the public archive.
create table if not exists public.public_matches (
  match_id text primary key,
  revision bigint not null,
  played_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  snapshot jsonb not null,
  media jsonb
);
alter table public.public_matches add column if not exists played_at timestamptz not null default now();
create index if not exists public_matches_played_date on public.public_matches(played_at desc, match_id);
alter table public.public_matches enable row level security;
revoke all on public.public_matches from anon, authenticated;
grant select on public.public_matches to anon, authenticated;
drop policy if exists completed_matches_read on public.public_matches;
create policy completed_matches_read on public.public_matches for select to anon, authenticated
  using (snapshot->>'finished' = 'true');
-- Preserve the currently published game when upgrading an existing installation.
insert into public.public_matches(match_id, revision, played_at, updated_at, snapshot, media)
  select p.snapshot->>'matchId', p.revision, coalesce((p.snapshot->>'playedAt')::timestamptz, p.updated_at), p.updated_at, p.snapshot, m.media
  from public.live_public p left join public.live_media m using (slug)
  where p.snapshot->>'matchId' is not null
  on conflict (match_id) do nothing;

create or replace function public.publish_live(expected_revision bigint, snapshot jsonb, media jsonb, request_id uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; previous_request uuid;
begin
  if not exists (select 1 from public.scout_editors e where e.user_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;
  -- Serialize the first insert too. A stale tab can never overwrite a later revision.
  perform pg_advisory_xact_lock(727611);
  select p.revision, p.last_request_id into current_revision, previous_request from public.live_public p where p.slug = 'so-na-rede';
  current_revision := coalesce(current_revision, 0);
  if request_id is null then raise exception 'invalid_request'; end if;
  if previous_request = request_id then return current_revision; end if;
  if expected_revision is distinct from current_revision then raise exception 'revision_conflict'; end if;
  if snapshot->>'version' is distinct from '1' or snapshot->>'matchId' is null or snapshot ? 'audit' then
    raise exception 'invalid_snapshot';
  end if;
  insert into public.live_public(slug, revision, snapshot, media_revision, last_request_id)
    values ('so-na-rede', current_revision + 1, snapshot, case when media is not null then current_revision + 1 else 0 end, request_id)
    on conflict (slug) do update set revision = excluded.revision, snapshot = excluded.snapshot, updated_at = now(),
      media_revision = case when media is not null then excluded.revision else public.live_public.media_revision end,
      last_request_id = request_id;
  if media is not null then
    insert into public.live_media(slug, media) values ('so-na-rede', media)
      on conflict (slug) do update set media = excluded.media;
  end if;
  insert into public.public_matches(match_id, revision, played_at, snapshot, media)
    values (snapshot->>'matchId', current_revision + 1, coalesce((snapshot->>'playedAt')::timestamptz, now()), snapshot, media)
    on conflict (match_id) do update set revision = excluded.revision,
      snapshot = excluded.snapshot, updated_at = now(),
      media = coalesce(excluded.media, public.public_matches.media);
  return current_revision + 1;
end; $$;
revoke all on function public.publish_live(bigint, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.publish_live(bigint, jsonb, jsonb, uuid) to authenticated;

-- Enable public score notifications. Media is fetched on the same committed update.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_public') then
    alter publication supabase_realtime add table public.live_public;
  end if;
end $$;

-- After creating the commission user in Authentication > Users, run separately:
-- insert into public.scout_editors(user_id) values ('UUID-DO-USUARIO');
