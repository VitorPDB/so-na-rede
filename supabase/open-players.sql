-- Publicação de estatísticas completas aprovada pelo responsável do projeto.
-- Só jogos já publicados. Não expõe PINs, sessões, backups ou partidas privadas.
begin;
create or replace function public.open_player_games(page_offset integer default 0) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('snapshot',g.snapshot,'media',p.media,
 'moments',public.public_reels(g.match_id),
 'cards',coalesce((select c.cards from public.player_social_cards c where c.match_id=p.match_id and c.revision=p.revision),'[]'::jsonb)) order by p.updated_at desc),'[]'::jsonb)
 from (select * from public.public_matches order by updated_at desc,match_id limit 20 offset greatest(0,least(page_offset,10000))) p
 join public.player_match_private g on g.match_id=p.match_id;
$$;
revoke all on function public.open_player_games(integer) from public;
grant execute on function public.open_player_games(integer) to anon,authenticated;
commit;
