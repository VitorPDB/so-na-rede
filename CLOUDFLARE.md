# Publicar esta versão

O ZIP `so-na-rede-cloudflare-public-live-2026-10-10.zip` contém o site compilado. `index.html` está na raiz: envie o ZIP inteiro pelo upload de arquivos do Cloudflare Pages. Não use o ZIP de código-fonte nesse upload.

1. No projeto Pages, escolha **Create a new deployment** (ou crie um projeto com **Drag and drop your files**).
2. Envie o ZIP e publique na produção. Abra `https://SEU-PROJETO.pages.dev/?view=commission` no tablet.
3. Para transportar dados do localhost, exporte JSON no app atual e importe no app hospedado. Cada domínio tem seu próprio armazenamento.
4. Aguarde **Offline pronto** antes de desconectar. Teste uma recarga sem internet.

## Público ao vivo

A integração está preparada, mas este ZIP vem sem credenciais. Sem projeto Supabase, o registro local funciona e a página pública mostra o estado de espera/configuração. Teste o layout em `/?view=public&demo=1`: os dados são fictícios e não alteram a partida.

O ZIP também inclui **live-setup.sql** (configuração do banco) e **ativar-online.md** (guia completo). Depois de criar o Supabase e executar esse SQL:

1. Extraia o ZIP.
2. Edite **live-config.json**, ao lado de index.html:

```json
{
  "supabaseUrl": "https://SEU-PROJETO.supabase.co",
  "publishableKey": "sb_publishable_SUA-CHAVE-PUBLICA"
}
```

3. Envie **a pasta extraída completa** ao Pages, ou compacte o conteúdo dessa pasta com index.html na raiz. Não precisa instalar Node nem recompilar.
4. Abra `/?view=commission`, entre em Ajustes → Publicação com a conta da comissão e inicie a transmissão. O público acessa `/?view=public`, sem login. Com a configuração ativa, a raiz do site também abre a página pública.

Somente a chave publishable ou a chave pública legada anon é aceita. Senha do banco, service_role e sb_secret não devem entrar nesse arquivo. A autorização para publicar vem da lista da comissão e das políticas SQL.

A página pública atualiza automaticamente, permite filtrar notas/estatísticas por set, mostra fotos, destaques, pontos, rotações e tempos. Se perder a conexão, mantém a última publicação recebida, com aviso de dados possivelmente desatualizados. Isso não substitui o backup JSON privado.

Referências: [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [chaves do Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
