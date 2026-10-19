-- Run AFTER security-schema.sql and security.sql, in one transaction.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.player_access (
  player_id text primary key, name text not null, number integer not null,
  pin_hash text not null, failures integer not null default 0,
  locked_until timestamptz, enabled boolean not null default true
);
create table if not exists public.player_sessions (
  token_hash text primary key, player_id text not null references public.player_access on delete cascade,
  expires_at timestamptz not null
);
create table if not exists public.player_match_private (
  match_id text primary key, updated_at timestamptz not null default now(),
  snapshot jsonb not null, moments jsonb not null default '[]'
);
alter table public.player_access enable row level security;
alter table public.player_sessions enable row level security;
alter table public.player_match_private enable row level security;
revoke all on public.player_access, public.player_sessions, public.player_match_private from public, anon, authenticated;

create or replace function public.player_safe_stats(s jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('rating',s->'rating','count',null,'points',null,'errors',null,'metrics','[]'::jsonb,
 'best',case when s->'best'->>'label' is not null then jsonb_build_object('label',s->'best'->>'label','reason','Destaque do jogador') else null end,
 'worst',case when s->'worst'->>'label' is not null then jsonb_build_object('label',s->'worst'->>'label','reason','Fundamento a desenvolver') else null end);
$$;
create or replace function public.player_safe_snapshot(s jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select (s - 'technical') || jsonb_build_object(
 'teamStats',public.player_safe_stats(s->'teamStats'),
 'players',coalesce((select jsonb_agg(p || jsonb_build_object('stats',public.player_safe_stats(p->'stats'))) from jsonb_array_elements(s->'players') p),'[]'),
 'periods',coalesce((select jsonb_agg((p-'technical') || jsonb_build_object('teamStats',public.player_safe_stats(p->'teamStats'),
 'players',coalesce((select jsonb_agg(v || jsonb_build_object('stats',public.player_safe_stats(v->'stats'))) from jsonb_array_elements(p->'players') v),'[]')))
 from jsonb_array_elements(s->'periods') p),'[]'));
$$;
-- Preserve old private detail before removing it from ALL publicly readable rows.
insert into public.player_match_private(match_id,snapshot,updated_at)
 select match_id,snapshot,updated_at from public.public_matches
 where snapshot->'teamStats'->'count' <> 'null'::jsonb
 on conflict(match_id) do nothing;
create or replace function public.player_redact_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- Compatibility with older commission clients: preserve rich input privately.
  if new.snapshot->'teamStats'->'count' <> 'null'::jsonb then
    insert into public.player_match_private(match_id,snapshot) values(new.snapshot->>'matchId',new.snapshot)
      on conflict(match_id) do update set snapshot=excluded.snapshot,updated_at=now();
  elsif new.snapshot ? 'videos' then
    update public.player_match_private set snapshot=jsonb_set(snapshot,'{videos}',new.snapshot->'videos')
      where match_id=new.snapshot->>'matchId';
  end if;
  new.snapshot := public.player_safe_snapshot(new.snapshot);
  return new;
end; $$;
drop trigger if exists zz_player_privacy on public.live_public;
create trigger zz_player_privacy before insert or update on public.live_public for each row execute function public.player_redact_publication();
drop trigger if exists zz_player_privacy on public.public_matches;
create trigger zz_player_privacy before insert or update on public.public_matches for each row execute function public.player_redact_publication();
-- Migration runs as owner; avoid the commission write quota for historical cleanup.
alter table public.public_matches disable trigger limit_public_writes;
update public.live_public set snapshot=public.player_safe_snapshot(snapshot);
update public.public_matches set snapshot=public.player_safe_snapshot(snapshot);
alter table public.public_matches enable trigger limit_public_writes;

create or replace function public.player_roster() returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',player_id,'name',name,'number',number) order by number),'[]')
 from public.player_access where enabled;
$$;
create or replace function public.player_login(player text, pin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.player_access; token text;
begin
  select * into a from public.player_access where player_id=player and enabled for update;
  if not found then return jsonb_build_object('error','invalid_credentials'); end if;
  if a.locked_until > now() then return jsonb_build_object('error','locked'); end if;
  if pin is null or pin !~ '^[0-9]{4}$' or extensions.crypt(pin,a.pin_hash) <> a.pin_hash then
    update public.player_access set failures=case when a.locked_until is not null then 1 else failures+1 end,
      locked_until=case when a.locked_until is null and failures+1>=5 then now()+interval '15 minutes' else null end
      where player_id=player;
    -- Return, never raise: failed attempts must commit.
    return jsonb_build_object('error','invalid_credentials');
  end if;
  update public.player_access set failures=0,locked_until=null where player_id=player;
  delete from public.player_sessions where expires_at < now();
  token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.player_sessions values(encode(extensions.digest(token,'sha256'),'hex'),player,now()+interval '8 hours');
  return jsonb_build_object('token',token,'playerId',player);
end; $$;
create or replace function public.player_logout(token text) returns void
language sql security definer set search_path='' as $$
 delete from public.player_sessions where token_hash=encode(extensions.digest(token,'sha256'),'hex');
$$;
create or replace function public.player_dashboard(token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare who text; games jsonb;
begin
  select s.player_id into who from public.player_sessions s join public.player_access a using(player_id)
    where token_hash=encode(extensions.digest(token,'sha256'),'hex') and expires_at>now() and a.enabled;
  if who is null then raise exception 'session_expired'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('public',public.player_safe_snapshot(g.snapshot),
    'own',(select p->'stats' from jsonb_array_elements(g.snapshot->'players') p where p->>'id'=who),
    'technical',jsonb_build_object('version',1,'team','[]'::jsonb,'players',coalesce((select jsonb_agg(p) from jsonb_array_elements(g.snapshot->'technical'->'players') p where p->>'id'=who),'[]')),
    'moments',g.moments) order by g.updated_at desc),'[]') into games
    from (select * from public.player_match_private order by updated_at desc limit 50) g;
  return jsonb_build_object('playerId',who,'games',games);
end; $$;

create or replace function public.publish_player_live(expected_revision bigint,snapshot jsonb,media jsonb,request_id uuid,moments jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare revision bigint;
begin
  if not exists(select 1 from public.scout_editors where user_id=auth.uid()) then raise exception 'not_authorized'; end if;
  if jsonb_typeof(moments) is distinct from 'array' or octet_length(moments::text)>2097152 or jsonb_array_length(moments)>10000 then raise exception 'invalid_moments'; end if;
  -- Existing publication handles authorization, validation, optimistic revision and retries.
  revision := public.publish_live(expected_revision,snapshot,media,request_id);
  update public.player_match_private set moments=coalesce((select jsonb_agg(jsonb_build_object(
    'id',m->'id','playerIds',m->'playerIds','rallyPlayerIds',m->'rallyPlayerIds',
    'label',m->'label','set',m->'set','rally',m->'rally','skill',m->'skill',
    'magic',m->'magic','emergency',m->'emergency','videoTimestampMs',m->'videoTimestampMs','videoSource',m->'videoSource'))
    from jsonb_array_elements(publish_player_live.moments) m where m->>'videoSource' ~ '^youtube:[A-Za-z0-9_-]{11}$'),'[]')
    where match_id=publish_player_live.snapshot->>'matchId';
  return revision;
end; $$;
revoke all on function public.player_safe_stats(jsonb), public.player_safe_snapshot(jsonb), public.player_redact_publication(), public.player_roster(), public.player_login(text,text), public.player_logout(text), public.player_dashboard(text),public.publish_player_live(bigint,jsonb,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.player_roster(),public.player_login(text,text),public.player_logout(text),public.player_dashboard(text) to anon,authenticated;
grant execute on function public.publish_player_live(bigint,jsonb,jsonb,uuid,jsonb) to authenticated;
commit;
