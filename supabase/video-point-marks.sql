-- Atualiza a publicação dos lances com marca de ponto. Não altera PINs ou partidas existentes.
begin;
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
    'pointWon',coalesce(m->'pointWon','false'::jsonb),'magic',m->'magic','emergency',m->'emergency','videoTimestampMs',m->'videoTimestampMs','videoSource',m->'videoSource'))
    from jsonb_array_elements(publish_player_live.moments) m where m->>'videoSource' ~ '^youtube:[A-Za-z0-9_-]{11}$'),'[]')
    where match_id=publish_player_live.snapshot->>'matchId';
  return revision;
end; $$;
revoke all on function public.publish_player_live(bigint,jsonb,jsonb,uuid,jsonb) from public,anon;
grant execute on function public.publish_player_live(bigint,jsonb,jsonb,uuid,jsonb) to authenticated;
commit;
