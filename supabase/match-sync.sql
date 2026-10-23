-- Continuidade privada por conta. Executar após security.sql.
create table if not exists public.scout_matches (
  owner_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null,
  payload jsonb not null,
  revision bigint not null default 1,
  device_id uuid not null,
  last_request uuid,
  updated_at timestamptz not null default now(),
  primary key(owner_id, match_id),
  check (length(match_id) between 1 and 80),
  check (octet_length(payload::text) <= 25000000)
);
alter table public.scout_matches enable row level security;
revoke all on public.scout_matches from public, anon, authenticated;

create or replace function public.scout_match_sync(
  action text, game_id text default null, body jsonb default null,
  expected_revision bigint default null, device uuid default null, request_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  who uuid := auth.uid();
  row_data public.scout_matches;
  result jsonb;
begin
  if who is null or not public.can_publish() then raise exception 'not_authorized'; end if;
  if action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object('id',m.match_id,'team',m.payload->>'team',
      'opponent',m.payload->>'opponent','revision',m.revision,'updatedAt',m.updated_at)
      order by m.updated_at desc),'[]'::jsonb) into result
      from public.scout_matches m where m.owner_id = who;
    return result;
  end if;
  if game_id is null or length(game_id) not between 1 and 80 then raise exception 'invalid_match'; end if;
  -- Serialize creation, claims and saves for this account/game, including absent rows.
  perform pg_advisory_xact_lock(hashtextextended(who::text || ':' || game_id, 0));
  select * into row_data from public.scout_matches m where m.owner_id=who and m.match_id=game_id for update;
  if action in ('read','status') then
    if row_data.match_id is null then raise exception 'match_missing'; end if;
    return jsonb_build_object('revision',row_data.revision,'device',row_data.device_id,
      'updatedAt',row_data.updated_at,'body',case when action='read' then row_data.payload else null end);
  end if;
  if device is null or request_id is null or expected_revision is null then raise exception 'invalid_request'; end if;
  if action = 'save' then
    if body is null or jsonb_typeof(body) <> 'object' or body->>'id' is distinct from game_id
      or body->>'schemaVersion' is distinct from '1'
      or jsonb_typeof(body->'audit') is distinct from 'array'
      or jsonb_typeof(body->'players') is distinct from 'array'
      or jsonb_typeof(body->'team') is distinct from 'string'
      or jsonb_typeof(body->'opponent') is distinct from 'string'
      or octet_length(body::text) > 25000000 then raise exception 'invalid_match'; end if;
    if row_data.match_id is null then
      if expected_revision <> 0 then raise exception 'revision_conflict'; end if;
      insert into public.scout_matches(owner_id,match_id,payload,device_id,last_request)
        values(who,game_id,body,device,request_id) returning * into row_data;
    else
      if row_data.device_id <> device then raise exception 'device_conflict'; end if;
      if row_data.last_request = request_id then
        if row_data.payload <> body then raise exception 'request_conflict'; end if;
      else
        if row_data.revision <> expected_revision then raise exception 'revision_conflict'; end if;
        update public.scout_matches m set payload=body,revision=m.revision+1,last_request=request_id,updated_at=now()
          where m.owner_id=who and m.match_id=game_id returning * into row_data;
      end if;
    end if;
  elsif action = 'claim' then
    if row_data.match_id is null then raise exception 'match_missing'; end if;
    if row_data.last_request is distinct from request_id or row_data.device_id <> device then
      if row_data.revision <> expected_revision then raise exception 'revision_conflict'; end if;
      update public.scout_matches m set device_id=device,revision=m.revision+1,last_request=request_id,updated_at=now()
        where m.owner_id=who and m.match_id=game_id returning * into row_data;
    end if;
  else raise exception 'invalid_action';
  end if;
  return jsonb_build_object('revision',row_data.revision,'device',row_data.device_id,'updatedAt',row_data.updated_at,
    'body',case when action='claim' then row_data.payload else null end);
end;
$$;
revoke all on function public.scout_match_sync(text,text,jsonb,bigint,uuid,uuid) from public, anon;
grant execute on function public.scout_match_sync(text,text,jsonb,bigint,uuid,uuid) to authenticated;
