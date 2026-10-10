# Só na Rede — Vercel + Supabase, passo a passo

Este pacote contém o código-fonte, configuração da Vercel, banco SQL e integração de publicação. Você cria as contas e informa a URL/chave pública do seu Supabase. Nenhuma conta nem transmissão real foi ativada pelo pacote.

O auxiliar registra no tablet; o Supabase recebe a publicação; a família consulta pelo endereço da Vercel. Comissão e espectadores precisam de internet para atualizar ao vivo. A marcação do tablet continua disponível offline.

## 1. Extrair o pacote

Extraia `so-na-rede-vercel-2026-10-10.zip` em uma pasta nova. Na raiz estão `package.json`, `package-lock.json`, `vercel.json`, `vite.config.ts`, `tsconfig.json`, `index.html` e as pastas `src`, `public` e `supabase`.

Use este código-fonte na Vercel. O ZIP antigo do Cloudflare contém apenas a versão compilada e usa outro fluxo.

Antes de mudar de endereço, exporte o JSON do app atual para preservar jogos, fotos e configurações. O endereço novo terá armazenamento local próprio.

## 2. Criar o Supabase

1. Acesse https://supabase.com/dashboard e crie um projeto no plano **Free**. Uma região próxima do Brasil é adequada. A senha do banco fica com você.
2. Aguarde o projeto ficar pronto.
3. Abra **SQL Editor → New query**, copie todo o conteúdo de `supabase/live.sql` da pasta extraída e execute com **Run**. Este SQL cria a publicação atual, fotos, histórico e permissões. Se o banco já existe, executar novamente preserva os dados.
4. Abra **Authentication → Users → Add user / Create new user**. Crie o e-mail e a senha que o auxiliar usará para publicar e habilite a confirmação automática do e-mail, se apresentada.
5. Copie o **UUID** desse usuário, abra outra consulta SQL e execute:

```sql
insert into public.scout_editors(user_id)
values ('COLE-AQUI-O-UUID-DO-USUARIO')
on conflict (user_id) do nothing;
```

6. Nas configurações de Authentication, desative novos cadastros públicos (**Allow new users to sign up**). O app usa contas criadas pela comissão, sem cadastro público.
7. Obtenha a **Project URL** pelo botão **Connect** ou configurações de API do projeto. Copie também a chave **Publishable** em **Settings → API Keys**. A chave pública legada `anon` também funciona. Não use `sb_secret`, `service_role` nem a senha do banco.

URL e chave publishable são públicas; a lista `scout_editors` e as políticas SQL autorizam a escrita. Somente criar o usuário em Authentication não o autoriza a publicar: o passo 5 é necessário.

## 3. Colocar o projeto no GitHub

Este caminho mantém um endereço estável e facilita as próximas atualizações.

1. Acesse https://github.com e crie uma conta, se necessário.
2. Crie um repositório **privado**, na sua conta pessoal, chamado `so-na-rede`. O site poderá ser público mesmo com o código privado.
3. Abra **Add file → Upload files** (em um repositório vazio pode aparecer **uploading an existing file**).
4. Arraste o **conteúdo da pasta extraída**, mantendo as subpastas. Não envie o ZIP como arquivo e não crie uma pasta adicional envolvendo tudo. `package.json` e `vercel.json` devem aparecer na raiz do repositório.
5. Confirme em **Commit changes**. Não envie dados exportados de partidas, senhas, `node_modules` nem arquivos `.env.local`.

As duas credenciais públicas serão cadastradas na Vercel no próximo passo. O `public/live-config.json` deste pacote pode permanecer vazio.

## 4. Publicar na Vercel

1. Acesse https://vercel.com e entre com a conta do GitHub. Escolha a conta pessoal no plano **Hobby**.
2. Abra **Add New → Project**, autorize acesso ao repositório `so-na-rede` e toque em **Import**.
3. Confira:

| Campo | Valor |
|---|---|
| Framework Preset | Vite |
| Root Directory | raiz do repositório, sem subpasta |
| Install Command | npm ci |
| Build Command | npm run build |
| Output Directory | dist |

O `vercel.json` já define a instalação, compilação, pasta final e regras de cache para o PWA.

4. Em **Environment Variables**, adicione os dois valores do Supabase. Habilite **Production**; Preview é opcional para testar visualização. Durante os jogos, marque somente pelo endereço de produção.

| Nome | Valor |
|---|---|
| VITE_SUPABASE_URL | https://SEU-PROJETO.supabase.co |
| VITE_SUPABASE_PUBLISHABLE_KEY | sb_publishable_SUA-CHAVE-PUBLICA |

5. Clique **Deploy** e aguarde **Ready**. Use o domínio estável do projeto, como `https://so-na-rede.vercel.app`, e não o endereço temporário de uma implantação/preview. O nome exato depende da disponibilidade.
6. Se adicionar ou alterar variáveis depois do primeiro deploy, faça **Redeploy**: o Vite inclui esses valores na compilação. Para evitar valores antigos, não reutilize o cache de build quando apresentado.
7. Abra o endereço público em uma janela anônima. Se a Vercel pedir login, confira **Settings → Deployment Protection** para o domínio de produção. A família deve conseguir acessá-lo sem conta Vercel ou Supabase.

## 5. Preparar o tablet e começar a transmissão

Substitua `SEU-ENDERECO.vercel.app` pelo domínio do projeto.

- **Auxiliar:** `https://SEU-ENDERECO.vercel.app/?view=commission`
- **Família:** `https://SEU-ENDERECO.vercel.app/?view=public`
- **Demonstração isolada:** `https://SEU-ENDERECO.vercel.app/?view=public&demo=1`

1. No tablet, abra o link da comissão com internet. No Chrome, use **Instalar app / Adicionar à tela inicial**. Aguarde o indicador **Offline pronto**.
2. Para transportar os dados antigos, importe o JSON em **Ajustes → Dados**. O botão do app é **Restaurar backup JSON**.
3. Abra **Ajustes → Publicação**. Entre com o e-mail e a senha criados no Supabase.
4. Toque em **Publicar esta partida ao vivo** e aguarde **Publicado**.
5. Envie à família apenas o link público. Ela pode abrir no navegador ou instalar o app pelo mesmo link. Não precisa de login para acompanhar. Ao instalar pelo link público, o atalho abre o público; ao instalar pelo link da comissão, abre a marcação. São identificadores de instalação distintos.
6. Ao começar outro jogo, toque novamente em **Publicar esta partida ao vivo**. Antes disso, aguarde a confirmação de publicação do relatório final do jogo anterior.

Só nomes, fotos e estatísticas da publicação são enviados. Auditoria, backups e configurações internas não são disponibilizados pelo banco público. A área de marcação salva localmente em cada aparelho; a autorização do Supabase é exigida para alterar o placar publicado.

## 6. Fazer um teste completo antes do jogo

1. No tablet, publique uma partida de teste. Na família, abra o link em outro aparelho, preferencialmente usando outra conexão, como 4G.
2. Registre **Ataque → Ponto nosso → jogador**. Confira placar e nota no outro aparelho.
3. Desfaça. Confira o placar corrigido no público.
4. Desligue a internet do tablet, registre ações e recarregue. A marcação deve continuar salva; o público mantém a última publicação. Reconecte e confirme a atualização.
5. Termine uma partida de teste, aguarde **Publicado** e consulte **Partidas anteriores** na página pública. Confira o filtro por set.
6. Faça logout da publicação no tablet e confira que ele não transmite novas alterações.

O envio é verificado aproximadamente a cada 1,5 segundo, mais a latência da rede. O público usa Realtime e também uma consulta de recuperação a cada 30 segundos. Sem internet no tablet, não há atualização ao vivo para a família até reconectar.

## 7. Próximas atualizações

Atualize os arquivos no **mesmo repositório GitHub**. A Vercel gera uma nova implantação e mantém o domínio de produção. Isso preserva o armazenamento do app associado àquele endereço. Continue exportando os backups JSON.

## Alternativa: primeiro envio direto de ZIP

Acesse https://vercel.com/drop. O Vercel Drop aceita o ZIP de código-fonte e compila o projeto. Antes de enviar, extraia este pacote e preencha `public/live-config.json`:

```json
{
  "supabaseUrl": "https://SEU-PROJETO.supabase.co",
  "publishableKey": "sb_publishable_SUA-CHAVE-PUBLICA"
}
```

Envie a pasta completa ou compacte seu conteúdo novamente, com `package.json` na raiz. Escolha a conta pessoal Hobby, o nome e **Deploy**. Isso evita o GitHub no primeiro envio.

Cada novo Drop cria um projeto novo. Para atualizar mantendo o endereço, conecte esse projeto a um repositório Git ou use a Vercel CLI. Por isso o fluxo GitHub acima é o recomendado para este app, que recebe atualizações frequentes. Variáveis VITE configuradas na Vercel têm prioridade sobre o JSON; mantenha apenas uma fonte de configuração.

## Se algo não funcionar

| Sintoma | O que conferir |
|---|---|
| Build falhou lendo VERCEL.md, ONLINE.md ou SQL | Envie todos os arquivos do pacote e mantenha a estrutura; essas fontes fazem parte da compilação. |
| Público mostra Não configurado | Confira os nomes/valores das duas variáveis e faça Redeploy. |
| Login não funciona | Confira e-mail, senha, confirmação do usuário e conexão do tablet. |
| Conta não autorizada | Execute o INSERT em scout_editors com o UUID correto do usuário. |
| Outra aba publicou | Use um único tablet; pause e reinicie a transmissão conscientemente para assumir. |
| Histórico não carrega | Execute o supabase/live.sql atualizado e termine/publique um jogo. |
| Sua família vê login Vercel | Use o domínio de produção e confira Deployment Protection. |
| Dados antigos sumiram no endereço novo | Importe o backup JSON exportado do domínio antigo. |
| Supabase pausado | Reative o projeto no painel antes de jogar. |

A preparação foi verificada localmente. Login, políticas, publicação e Realtime precisam do teste do passo 6 no projeto Supabase real.

## Gratuidade

Vercel Hobby destina-se a uso pessoal e não comercial. Supabase Free também possui limites de armazenamento, tráfego e Realtime e pode pausar após uma semana de inatividade. Use os planos gratuitos e confira os painéis antes dos jogos; a gratuidade depende de permanecer dentro dos limites dos serviços.

## Referências oficiais

- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/git
- https://vercel.com/docs/plans/hobby
- https://vercel.com/kb/vercel-drop
- https://vercel.com/kb/guide/vercel-drop-vs-netlify-drop
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/pricing
