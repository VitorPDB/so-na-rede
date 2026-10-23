# Continuar partidas em outro aparelho

## Ativação

Execute o arquivo completo `supabase/match-sync.sql` no SQL Editor do mesmo Supabase, após o SQL de segurança já instalado. Não recrie senhas de jogadores. A migração cria uma tabela privada e uma função; não apaga partidas nem altera as tabelas públicas existentes. Publique o código desta branch depois da migração.

## Uso

1. Abra a comissão → Continuar em outro aparelho (ou Ajustes).
2. Entre com o e-mail/senha da comissão. A conta precisa estar autorizada em scout_editors.
3. No aparelho de origem, escolha **Salvar partida na minha conta**. Aguarde **Sincronizado** antes de fechar/trocar.
4. No outro aparelho, entre na mesma conta → **Ver partidas da minha conta** → **Continuar neste aparelho**.
5. Confira a confirmação: o segundo aparelho assume aquele jogo. O primeiro detecta a transferência, pausa a publicação e impede novas gravações locais após detectar o conflito.

Cada partida tem revisão e dispositivo editor próprios. Duas pessoas na mesma conta podem trabalhar em partidas diferentes simultaneamente. Contas diferentes têm listas privadas separadas: não há compartilhamento automático de partidas entre contas.

## Preservação

A partida completa (auditoria, escalação, correções, fotos, configurações, vídeos e rascunhos) vai para a conta; limite de 25 MB por partida. O cliente valida backups recebidos antes de abrir. A marcação é salva primeiro no aparelho, como antes. Offline, ela continua local; não promete aparecer no outro aparelho antes da sincronização.

Antes de abrir outra partida ou iniciar uma nova, uma cópia completa fica no IndexedDB local. Em **Cópias deste aparelho**, baixe o JSON e restaure pelos Ajustes. A troca não ocorre se falhar a proteção local. Essas cópias não sobrevivem à limpeza dos dados do navegador; exporte para guardar fora dele.

Não há merge automático de alterações feitas por dois aparelhos. Conflito mantém os dados locais e pede abertura da versão remota ou criação de cópia independente. **Criar cópia independente** preserva o conteúdo com outro ID; depois escolha Salvar na minha conta.

Se houve queda de conexão no instante de confirmar um envio e a revisão ficou divergente, a proteção pode pedir reabertura. A cópia local é preservada antes da troca. Arquivos de vídeo locais não são enviados: em outro aparelho, selecione o mesmo arquivo original. Links/horários do YouTube são transferidos.

## Transmissão e acesso

Salvar na conta não publica o jogo. Há um canal público por time; iniciar outra partida nele pede confirmação. Ao assumir uma partida em outro aparelho, a transmissão não é ligada automaticamente. Partidas privadas vinculadas só publicam após a cópia sincronizada ser conferida.

A tabela usa RLS e não dá leitura/escrita direta a anon/authenticated. A RPC exige auth.uid e can_publish, sempre restringe por proprietário, serializa por partida, exige revisão e dispositivo e aceita retry idempotente. Não são usados segredos de servidor no frontend.

Logout encerra a sessão remota, mas não apaga a partida local já carregada, mantendo a proteção offline existente. Em aparelho compartilhado, considere que os dados locais continuam no navegador. Isto é continuidade da comissão, não um novo bloqueio de acesso ao armazenamento local.

## Validação

Testes PostgreSQL locais cobrem isolamento entre contas, negação a visitantes/não autorizados, retry, conflito de revisão, transferência entre dispositivos, dois jogos independentes, migração repetível e restauração da auditoria. A ativação no Supabase e o ensaio em dois aparelhos reais ainda precisam ser feitos no ambiente publicado.
