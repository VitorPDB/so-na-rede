-- Reels públicos e cards individuais. Aplicar após players.sql e video-point-marks.sql.
begin;
create table if not exists public.player_social_cards (
  match_id text primary key references public.public_matches(match_id) on delete cascade,
  revision bigint not null default 0,
  cards jsonb not null check(jsonb_typeof(cards)='array' and octet_length(cards::text)<=524288)
);
alter table public.player_social_cards add column if not exists revision bigint not null default 0;
alter table public.player_social_cards enable row level security;
revoke all on public.player_social_cards from public,anon,authenticated;
create or replace function public.publish_player_bundle(expected_revision bigint,snapshot jsonb,media jsonb,request_id uuid,moments jsonb,cards jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare revision bigint;
begin
  if not public.can_publish() then raise exception 'not_authorized'; end if;
  if jsonb_typeof(cards) is distinct from 'array' or jsonb_array_length(cards)>30 or octet_length(cards::text)>524288 then raise exception 'invalid_cards'; end if;
  if exists(select 1 from jsonb_array_elements(cards) c where
    jsonb_typeof(c) is distinct from 'object' or jsonb_typeof(c->'player') is distinct from 'object'
    or not exists(select 1 from jsonb_array_elements(snapshot->'players') p where p->>'id'=c->'player'->>'id')
    or jsonb_typeof(c->'metrics') is distinct from 'array' or jsonb_array_length(c->'metrics')<>4
    or c->'player' ? 'photo') then raise exception 'invalid_cards'; end if;
  revision:=public.publish_player_live(expected_revision,snapshot,media,request_id,moments);
  insert into public.player_social_cards(match_id,revision,cards) values(snapshot->>'matchId',revision,cards)
    on conflict(match_id) do update set cards=excluded.cards,revision=excluded.revision;
  return revision;
end; $$;
revoke all on function public.publish_player_bundle(bigint,jsonb,jsonb,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.publish_player_bundle(bigint,jsonb,jsonb,uuid,jsonb,jsonb) to authenticated;
create or replace function public.player_social_card(token text,game_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare who text; card jsonb; photo jsonb;
begin
  select s.player_id into who from public.player_sessions s join public.player_access a using(player_id)
    where token_hash=encode(extensions.digest(token,'sha256'),'hex') and expires_at>now() and a.enabled;
  if who is null then raise exception 'session_expired'; end if;
  select c into card from public.player_social_cards g join public.public_matches p on p.match_id=g.match_id and p.revision=g.revision cross join lateral jsonb_array_elements(g.cards) c
    where g.match_id=game_id and c->'player'->>'id'=who limit 1;
  select media->'photos'->who into photo from public.public_matches where match_id=game_id;
  if card is not null and photo is not null then card:=jsonb_set(card,'{player,photo}',photo); end if;
  return card;
end; $$;
revoke all on function public.player_social_card(text,text) from public;
grant execute on function public.player_social_card(text,text) to anon,authenticated;
-- Only the published action metadata; never expose the private snapshot or card metrics.
create or replace function public.public_reels(game_id text) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
   'id',m->'id','playerIds',m->'playerIds','rallyPlayerIds',coalesce(m->'rallyPlayerIds','[]'),
   'label',m->'label','set',m->'set','rally',m->'rally','skill',m->'skill',
   'pointWon',coalesce(m->'pointWon','false'),'magic',coalesce(m->'magic','false'),'emergency',coalesce(m->'emergency','false'),
   'videoTimestampMs',m->'videoTimestampMs','videoSource',m->'videoSource'))),'[]')
 from public.player_match_private g join public.public_matches p on p.match_id=g.match_id
 cross join lateral jsonb_array_elements(g.moments) m
 where g.match_id=game_id and m->>'videoSource' ~ '^youtube:[A-Za-z0-9_-]{11}$'
 and exists(select 1 from jsonb_array_elements(coalesce(p.snapshot->'videos','[]')) v where 'youtube:'||(v->>'youtubeId')=m->>'videoSource');
$$;
revoke all on function public.public_reels(text) from public;
grant execute on function public.public_reels(text) to anon,authenticated;
commit;
