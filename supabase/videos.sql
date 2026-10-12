-- Run in Supabase SQL Editor after the original live.sql setup.
create or replace function public.update_match_videos(target_match_id text, new_videos jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare item jsonb;
begin
  if not exists(select 1 from public.scout_editors e where e.user_id=auth.uid()) then raise exception 'not_authorized'; end if;
  if jsonb_typeof(new_videos) is distinct from 'array' then raise exception 'invalid_videos'; end if;
  if jsonb_array_length(new_videos)>20 then raise exception 'invalid_videos'; end if;
  for item in select value from jsonb_array_elements(new_videos) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or length(item->>'id') not between 1 and 80
      or jsonb_typeof(item->'title') is distinct from 'string'
      or length(trim(item->>'title')) not between 1 and 180
      or jsonb_typeof(item->'youtubeId') is distinct from 'string'
      or (item->>'youtubeId') !~ '^[A-Za-z0-9_-]{11}$'
      or jsonb_typeof(item->'startSeconds') is distinct from 'number'
      or (item->>'startSeconds') !~ '^[0-9]+$'
      or (item->>'startSeconds')::numeric not between 0 and 86400
      or coalesce(item->>'kind','') not in ('live','replay','highlights')
      or (item ? 'set' and (jsonb_typeof(item->'set') is distinct from 'number' or (item->>'set') !~ '^[1-5]$'))
      or (item - array['id','title','youtubeId','startSeconds','kind','set']) <> '{}'::jsonb
      then raise exception 'invalid_videos'; end if;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(new_videos)) <> jsonb_array_length(new_videos) then raise exception 'invalid_videos'; end if;
  -- Serialize with live publication; modify only attachments, not scores or grades.
  perform pg_advisory_xact_lock(727611);
  update public.public_matches p set snapshot=jsonb_set(p.snapshot,'{videos}',new_videos,true),revision=p.revision+1,updated_at=now()
    where p.match_id=target_match_id and p.snapshot->>'finished'='true';
  if not found then raise exception 'match_not_found'; end if;
end; $$;
revoke all on function public.update_match_videos(text,jsonb) from public,anon;
grant execute on function public.update_match_videos(text,jsonb) to authenticated;
