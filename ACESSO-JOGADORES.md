# Área dos jogadores

Implementada em `/?view=player`. Preserva o visual do time. Escolha do atleta, PIN numérico de quatro dígitos, dados próprios completos por partida, perfis públicos dos companheiros e vídeos/lances filtrados. Exibe as 50 publicações mais recentes; não faz reconhecimento facial nem importa automaticamente os vídeos do canal.

## Ativar

1. No SQL Editor do projeto Supabase, executar **`.qa/ativar-jogadores.sql`**. O arquivo já reúne o schema atualizado, segurança, migração de privacidade e os hashes dos dez PINs. Não publicar esse arquivo. Reaplicar não troca PINs existentes.
2. Publicar esta versão do site com a configuração Supabase habitual. O preview local pode mostrar a seleção, mas o login exige o servidor configurado. Nunca há autenticação simulada com dados reais.
3. Na comissão, publicar a partida. A publicação agora envia detalhes para tabelas privadas e somente o resumo permitido para as tabelas públicas. Os horários dos lances YouTube também são sincronizados. Partidas antigas já publicadas conservam os detalhes na migração; horários antigos precisam ser publicados com esta versão quando disponíveis localmente.
4. Distribuir individualmente os PINs do arquivo **`.qa/player-pins.txt`**. Eles ainda não estão ativos até executar o SQL no servidor. Os arquivos `.qa` ficam fora do Git e do build.

## Proteção implementada

- BCrypt com salt e custo 12 no banco; nenhum PIN ou hash no JavaScript do site. Os PINs são gerados com o gerador criptográfico do Node.
- Cinco tentativas erradas bloqueiam o atleta por 15 minutos, com contagem no servidor e serialização de tentativas simultâneas. Quatro dígitos têm segurança limitada; o bloqueio reduz tentativas online, mas não transforma PIN curto em senha forte.
- Tokens aleatórios de 256 bits, armazenados como SHA-256 no banco, expiração de oito horas e revogação ao sair. Cliente mantém token/detalhes somente em memória; recarregar solicita login novamente.
- Tabelas de credenciais, sessões e detalhes têm RLS e nenhuma permissão de leitura direta para `anon`/`authenticated`. A API decide o jogador pelo token; não aceita parâmetro para escolher o dono dos detalhes.
- Respostas incluem os detalhes somente do atleta autenticado. Os demais mostram nota, melhor fundamento e vídeos. Precisão, contagens individuais, erros e distribuições técnicas não são enviados como dados públicos.
- Migração remove detalhes das publicações atuais e antigas, preservando-os em tabela privada; triggers também protegem publicações de versões antigas da comissão. Cópias anteriormente baixadas por terceiros não podem ser revogadas retroativamente.
- A comissão conserva seus dados locais, auditoria e autenticação existente. Os PINs dos jogadores não autorizam publicar ou editar.

## Operação

Desativar conta no SQL Editor: `update public.player_access set enabled=false where player_id='p1';`. A API recusa seus tokens imediatamente. Para trocar um PIN, a comissão deve atualizar `pin_hash` usando `extensions.crypt('NOVO_PIN', extensions.gen_salt('bf',12))`, zerar `failures`/`locked_until` e remover as sessões desse `player_id`. Não disponibilizar uma operação anônima de redefinição.

`npm run players:pins` gera credenciais somente se não houver arquivo prévio; não sobrescreve senhas já entregues. O SQL gerado de provisionamento usa `on conflict do nothing`.

## Validação

Teste real com PostgreSQL/PGlite e pgcrypto: login, hash, bloqueio persistente, sessão, logout, acesso indevido a tabelas e publicação, retorno restrito ao atleta, migração reaplicável sem perda dos detalhes. Suite completa: 132 testes.

Referências: [funções e permissões Supabase](https://supabase.com/docs/guides/database/functions) e [pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html).
