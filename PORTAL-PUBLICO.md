# Portal público dos jogadores — 26/10/2026

## Ativar

O responsável aprovou retirar o PIN e tornar públicas as estatísticas completas de todos os jogadores. A publicação da comissão continua autenticada.

1. Rode no SQL Editor do Supabase o arquivo **dist/abrir-jogadores.sql**, gerado pelo build (também disponível em /abrir-jogadores.sql após deploy). Ele reúne a atualização de supabase/security-schema.sql e a migração supabase/open-players.sql. Requer as migrações anteriores, incluindo social-reels.sql.
2. Faça o deploy do código. A rota /?view=player passa a abrir diretamente a seleção de atletas, sem PIN.
3. Republique partidas para disponibilizar novos cards, datas e direções marcadas. As estatísticas completas de jogos já publicados ficam disponíveis imediatamente após ativar o RPC. Direções antigas desconhecidas não são inferidas.

A migração libera somente o DTO estatístico de partidas publicadas e seus cards/lances/mídia. Não concede leitura de tabelas de credenciais, sessões, partidas de scouting privadas ou backups. Não apaga PINs antigos nem sessões; os endpoints antigos continuam por compatibilidade, mas o novo portal não os usa.

## Uso

- Comissão: Ataque → resultado → avaliação → **Direção do ataque**, com Paralela, Diagonal, Meio ou Não informado. A opção não interfere na nota. Disponível no scouting de tela cheia e no fluxo normal de avaliação.
- Portal: escolha um atleta, depois Resumo, Fundamentos ou Partidas. Recortes: últimas três, geral das publicações carregadas ou partida específica. Carrega lotes de 20 partidas sob demanda; o geral informa essa limitação.
- Média do perfil: média aritmética das notas não nulas por partida com ações. Qualidade por fundamento: ponderada pelo volume, não média de porcentagens. Não mistura nota e precisão. Precisão = ataques sem erro/total.
- Gráfico: nota por partida e média móvel de até três jogos do recorte. Menos de 15 ações recebe indicação de baixa amostra, sem esconder o dado.
- Ponto forte/foco: maior/menor qualidade entre fundamentos com ao menos 10 ações; sem conclusão quando falta amostra.
- Direção favorita: apenas ataques explicitamente marcados, com amostra e empates. O detalhamento usa os mesmos agregados da comissão.
- Partidas: lances filtrados por atleta, vídeos internos e card daquele jogo. Dados ausentes aparecem como ausência, nunca números demonstrativos.

## Validação

144 testes passaram e build de produção validado. Cobertos direção em backup/desfazer, neutralidade da direção na nota, agregação por volume, dados ausentes e acesso anônimo às estatísticas publicadas sem acesso às tabelas de credenciais. A ativação remota e a conferência visual interativa final ainda não foram executadas. Não confundir o preview .qa com dados reais do portal.
