# Vídeos das partidas

Implementado na branch `codex/notas-contextuais-v2`.

## Cadastrar

- Partida atual: Partida → Preparação → Vídeos.
- Partida antiga: Análise → Histórico → escolher partida → Vídeos da partida.
- Cole o link específico do YouTube (watch, youtu.be, live ou shorts), dê um título e escolha transmissão, gravação ou melhores momentos.
- Início em segundos é opcional; se vazio, aproveita o horário do próprio link (`t=`, `start=`).
- Pode vincular a um set. Aceita até 20 vídeos por partida, inclusive de canais de terceiros.
- Editar/remover anexos conserva placar, notas e estatísticas. JSON e backup automático incluem os links. Os links da partida atual são arquivados ao iniciar o próximo jogo; não são copiados para o novo confronto.

## Página pública

O botão de acesso à comissão foi removido. O endereço direto da comissão continua existente e o login de publicação permanece obrigatório; a remoção do atalho não é um bloqueio de acesso ao endereço.

Abaixo do placar aparecem os vídeos cadastrados. O player só carrega depois de tocar em um vídeo, sem reprodução automática. Há opção “Abrir no YouTube” quando o autor restringe incorporação. O vídeo não é sincronizado automaticamente com os pontos e pode ter atraso numa live. Offline, os anexos permanecem disponíveis localmente; assistir exige conexão.

## Atualizar partidas antigas no público

1. No Supabase, abra o SQL Editor do projeto já existente.
2. Execute o conteúdo de `supabase/videos.sql` uma vez. Pode executar novamente sem apagar dados. Também pode baixar “SQL de vídeos” na tela do histórico.
3. No app da comissão, entre em Ajustes → Publicação com o usuário autorizado.
4. No Histórico, selecione a partida já publicada e adicione/edite os links.
5. Toque “Publicar vídeos no histórico público”. Os anexos são atualizados separadamente das estatísticas, sem substituir a partida ao vivo.
6. Reabra/atualize a partida na página pública para ver os novos anexos.

A partida precisa já existir no arquivo público e estar encerrada. Uma partida apenas local continuará com os vídeos locais; esta operação não cria estatísticas públicas que não tenham sido publicadas.

Para a partida atual, os links vão junto da publicação normal do placar. O setup completo baixado pelo app (`live-setup.sql`) já inclui a função de vídeos; instalações existentes precisam apenas da migração acima.
