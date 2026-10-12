-- Existing projects: execute security-schema.sql first, then this file.
-- The build also supplies security-setup.sql containing both, in this order.
begin;
create or replace function public.scout_json_valid(v jsonb, s jsonb, depth integer default 0)
returns boolean language plpgsql immutable set search_path = '' as $$
declare kind text; k text; child jsonb; item jsonb; n numeric; size integer;
begin
  if v is null or s is null or depth > 16 then return false; end if;
  if v = 'null'::jsonb then return coalesce((s->>'nullable')::boolean,false); end if;
  kind := jsonb_typeof(v);
  if kind is distinct from s->>'type' then return false; end if;
  if s ? 'enum' and not ((s->'enum') @> jsonb_build_array(v)) then return false; end if;
  if kind = 'number' then
    n := (v #>> '{}')::numeric;
    return (not coalesce((s->>'integer')::boolean,false) or trunc(n)=n)
      and (not (s ? 'min') or n >= (s->>'min')::numeric)
      and (not (s ? 'max') or n <= (s->>'max')::numeric);
  elsif kind = 'string' then
    size := length(v #>> '{}');
    return size >= coalesce((s->>'min')::integer,0)
      and size <= coalesce((s->>'max')::integer,2147483647)
      and (not (s ? 'pattern') or (v #>> '{}') ~ (s->>'pattern'));
  elsif kind = 'boolean' then return true;
  elsif kind = 'array' then
    size := jsonb_array_length(v);
    if size < coalesce((s->>'min')::integer,0) or size > coalesce((s->>'max')::integer,2147483647) then return false; end if;
    for item in select value from jsonb_array_elements(v) loop
      if not public.scout_json_valid(item,s->'items',depth+1) then return false; end if;
    end loop;
    return true;
  elsif kind = 'object' then
    if (select count(*) from jsonb_object_keys(v)) > coalesce((s->>'max')::integer,100) then return false; end if;
    for k in select jsonb_array_elements_text(coalesce(s->'required','[]'::jsonb)) loop
      if not (v ? k) then return false; end if;
    end loop;
    for k,item in select key,value from jsonb_each(v) loop
      child := coalesce(s->'properties'->k,s->'additional');
      if child is null or (s ? 'additional' and s ? 'pattern' and k !~ (s->>'pattern'))
        or not public.scout_json_valid(item,child,depth+1) then return false; end if;
    end loop;
    return true;
  end if;
  return false;
exception when others then return false;
end; $$;
revoke all on function public.scout_json_valid(jsonb,jsonb,integer) from public,anon,authenticated;

create or replace function public.scout_validate_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare payload jsonb;
begin
  if tg_table_name in ('live_public','public_matches') then
    payload := new.snapshot;
    if octet_length(payload::text)>1048576 or not public.scout_json_valid(payload,public.scout_payload_schema('snapshot')) then
      raise exception 'invalid_snapshot';
    end if;
    -- Reject invalid timestamps before the archive uses them.
    if payload->>'playedAt' is not null then perform (payload->>'playedAt')::timestamptz; end if;
    if tg_table_name='public_matches' then
      if new.match_id is distinct from payload->>'matchId' then raise exception 'invalid_snapshot'; end if;
    end if;
  end if;
  if tg_table_name in ('live_media','public_matches') then
    if new.media is not null and (octet_length(new.media::text)>5242880 or not public.scout_json_valid(new.media,public.scout_payload_schema('media'))) then
      raise exception 'invalid_media';
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.scout_validate_publication() from public,anon,authenticated;
drop trigger if exists validate_publication on public.live_public;
create trigger validate_publication before insert or update on public.live_public for each row execute function public.scout_validate_publication();
drop trigger if exists validate_publication on public.live_media;
create trigger validate_publication before insert or update on public.live_media for each row execute function public.scout_validate_publication();
drop trigger if exists validate_publication on public.public_matches;
create trigger validate_publication before insert or update on public.public_matches for each row execute function public.scout_validate_publication();

-- Database-side limit: accepted writes, not frontend button clicks. Both RPCs
-- write public_matches once. Retries rejected by revision/idempotency do not count.
create table if not exists public.scout_write_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  writes integer not null
);
alter table public.scout_write_limits enable row level security;
revoke all on public.scout_write_limits from public,anon,authenticated;
create or replace function public.scout_limit_writes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); t timestamptz := clock_timestamp(); count_writes integer;
begin
  -- SQL Editor/service administration has no user JWT; never use its keys in the app.
  if actor is null then return new; end if;
  if not exists(select 1 from public.scout_editors e where e.user_id=actor) then raise exception 'not_authorized'; end if;
  insert into public.scout_write_limits as w(user_id,window_start,writes) values(actor,t,1)
  on conflict(user_id) do update set
    writes=case when w.window_start <= t-interval '1 minute' then 1 else w.writes+1 end,
    window_start=case when w.window_start <= t-interval '1 minute' then t else w.window_start end
  returning writes into count_writes;
  if count_writes>120 then raise exception 'rate_limited'; end if;
  return new;
end; $$;
revoke all on function public.scout_limit_writes() from public,anon,authenticated;
drop trigger if exists limit_public_writes on public.public_matches;
create trigger limit_public_writes after insert or update on public.public_matches for each row execute function public.scout_limit_writes();

create or replace function public.can_publish()
returns boolean language sql stable security definer set search_path = '' as $$
select exists(select 1 from public.scout_editors e where e.user_id=auth.uid());
$$;
revoke all on function public.can_publish() from public,anon;
grant execute on function public.can_publish() to authenticated;
commit;
