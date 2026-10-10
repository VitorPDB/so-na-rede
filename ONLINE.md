# Só na Rede: estatísticas públicas ao vivo

## O que está preparado

- Página `/?view=public` somente para consulta, com o visual do app: placar, notas, fotos, melhores/piores fundamentos, pontos, rotações e tempos. O filtro de set atualiza notas, destaques e rotações; publicações antigas sem resumo por set exibem uma explicação.
- Área `/?view=commission`: marcação local e Configurações → Estatísticas públicas ao vivo. Entrar e publicar exige uma conta autorizada no banco.
- O tablet continua salvando cada ação localmente. Quando conectado, envia a atualização em até aproximadamente 1,5 segundo, mais a latência da rede. Offline, o público mantém o último placar; a publicação retoma quando volta a conexão.
- Realtime notifica a página pública; consulta a cada 30 segundos funciona como recuperação caso o canal caia. Após 90 segundos sem publicação, ela avisa que não há atualização recente (também pode ser apenas uma pausa no jogo). A última publicação fica salva no navegador para consulta offline, com aviso de desatualização; não é um backup privado.
- Fotos e escudo adversário são enviados apenas quando mudam. Auditoria, backups e configurações de notas não são publicados.
- A aba **Ao vivo** mostra a publicação atual. **Partidas anteriores** lista partidas encerradas, com notas individuais/coletivas e filtro por set. O banco preserva cada jogo por identidade; começar outro não apaga o anterior. Correções atualizam a mesma partida e reiniciar um set a retira da lista de encerradas até terminar novamente.
- Na comissão, **Análise → Histórico** consulta o histórico local, inclusive sem internet. Novos jogos guardam a análise por set; resumos antigos exibem apenas os dados que tinham sido salvos.
- O histórico público guarda jogos publicados a partir desta versão. A instalação do SQL também preserva a partida que estiver publicada no momento. Jogos antigos salvos só no tablet não são enviados automaticamente. Perfil público acumulado de temporada ainda não faz parte desta versão.
- Use um dispositivo para marcar. Revisão no servidor impede uma aba antiga de sobrescrever outra; para assumir novamente, pause e publique conscientemente. O banco guarda a visualização pública, não um backup completo do jogo. Continue exportando o JSON.

## 1. Criar o banco gratuito

1. Acesse https://supabase.com/dashboard e crie uma conta e um projeto no plano Free. Guarde a senha do banco para você.
2. Abra SQL Editor e execute o conteúdo de `supabase/live.sql`. Em um projeto existente, execute novamente o SQL atualizado; ele mantém a allowlist e os dados já publicados.
3. Em Authentication → Users, crie o usuário da comissão com e-mail e senha e confirme o e-mail. Copie o UUID desse usuário.
4. Execute separadamente, substituindo o UUID:

```sql
insert into public.scout_editors(user_id) values ('UUID-DO-USUARIO');
```

5. Desative novos cadastros públicos nas configurações de Authentication. O app não tem cadastro. Mesmo um usuário autenticado fora dessa lista não pode publicar.
6. Em Connect / API Keys, obtenha a URL do projeto e a chave **publishable** (`sb_publishable_...`). A chave pública legada `anon` também é compatível. Nunca use `service_role`, `sb_secret_...` ou senha do banco no aplicativo.

## 2. Configurar e gerar o site

**Com o ZIP pronto, não precisa recompilar:** extraia, preencha `live-config.json` ao lado de index.html com `supabaseUrl` e `publishableKey` e envie a pasta completa novamente ao Pages. Veja [CLOUDFLARE.md](CLOUDFLARE.md). Esse arquivo tem somente credenciais públicas; a escrita continua protegida pelo banco. `/?view=public&demo=1` mostra uma demonstração isolada com dados fictícios.

**Para quem compila o código-fonte**, as variáveis abaixo também continuam suportadas e têm prioridade sobre o JSON.

Se preferir usar JSON no código-fonte, preencha `public/live-config.json`. O build copia esse arquivo para dist. Uma nova compilação substitui edições feitas apenas no JSON de dist.

Copie `.env.example` para `.env.local` e substitua os dois valores. Essas credenciais públicas são incluídas no site; as políticas do banco controlam quem pode escrever.

```powershell
npm install
npm test
npm run build
Compress-Archive -Path .\dist\* -DestinationPath .\so-na-rede-cloudflare.zip -Force
```

Alterar `.env.local` exige reconstruir e republicar. Alterar live-config.json no ZIP exige apenas enviar a pasta completa novamente ao Pages. O ZIP sem credenciais ainda não transmite.

## 3. Hospedar

Para Vercel + Supabase, siga [VERCEL.md](VERCEL.md): pacote de código-fonte, importação do GitHub e variáveis de ambiente. O mesmo SQL e a mesma página pública atendem ambos os provedores.

### Cloudflare Pages

1. Crie uma conta em https://dash.cloudflare.com.
2. Workers & Pages → Create application → Pages → upload de arquivos/Direct Upload.
3. Nomeie o projeto e envie `so-na-rede-cloudflare.zip` (index.html deve estar na raiz).
4. O endereço gratuito será similar a `https://so-na-rede.pages.dev`.
5. Com a configuração do Supabase, esse endereço abre a consulta pública. Para marcar no tablet, abra `https://SEU-ENDERECO.pages.dev/?view=commission`.

No tablet, abra esse endereço com internet pelo menos uma vez e instale o PWA. Em Configurações, entre com a conta da comissão e toque em **Publicar esta partida ao vivo**. Compartilhe o endereço público. Publicar só deve ser feito com nomes e fotos que o time concorda em disponibilizar.

**Atenção aos dados atuais:** localhost e o domínio hospedado têm armazenamentos diferentes. Antes de migrar, exporte o JSON no app atual. No tablet, importe esse JSON em Configurações. Abra o app hospedado offline depois para conferir a instalação e a persistência.

## 4. Validar antes de usar na quadra

1. Abra a página pública em outro aparelho. Ela deve começar com “Aguardando a comissão”.
2. Publique e registre um ponto no tablet; confira placar e notas no outro aparelho.
3. Desfaça/corrija e confira a correção pública.
4. Desligue a internet do tablet, registre três pontos e recarregue: o jogo local deve permanecer. Ao reconectar, confira o último placar na página pública.
5. Faça logout: publicar não deve funcionar. No SQL Editor, consulte a allowlist e confirme que apenas a comissão está cadastrada. Nenhuma escrita direta em live_public/live_media é concedida a visitantes.
6. Abra duas abas da comissão e tente publicar em ambas: a segunda atualização com revisão antiga deve parar e mostrar conflito.
7. Pausar mantém a última atualização disponível. Não apaga a partida publicada. Um novo jogo só substitui a aba ao vivo ao tocar em Publicar novamente. Aguarde **Publicado** após encerrar o jogo para confirmar o envio do relatório final antes de iniciar outro.
8. Na página pública, abra **Partidas anteriores**, escolha um jogo e filtre os sets. Abra outra partida e volte à primeira: seus números e fotos devem permanecer associados ao jogo correto. O link com `?view=public&match=ID` abre diretamente essa partida. Sem conexão, a lista recente e a última partida histórica aberta ficam disponíveis com aviso.

Build e 58 testes locais passaram, incluindo políticas SQL executadas em PostgreSQL de teste, permissões de leitura/escrita, comissão autorizada, revisão e repetição sem duplicação, resumos por set e rejeição de chaves secretas. A consulta pública foi testada com dados fictícios e respostas de servidor simuladas. Ainda falta validar Auth/RLS/Realtime contra um projeto Supabase real, que não foi criado. Esses passos são necessários antes de considerar a transmissão pronta para produção.

## Custos e continuidade

Cloudflare Pages e Supabase possuem planos gratuitos com limites. Não existe prazo de expiração definido para o app no Pages; isso depende dos termos e da continuidade dos serviços. O Supabase Free pode pausar projetos após uma semana de inatividade; verifique e reative antes do jogo. Tráfego, armazenamento e conexões simultâneas devem ser acompanhados no painel. Nenhuma atualização acontece ao vivo enquanto o tablet estiver sem internet.

Referências oficiais:

- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/pricing
