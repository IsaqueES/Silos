# 🌾 Controle de Silos

Site para acompanhar as NFs dos romaneios por silo (1 a 9): quais já foram lançadas no SAP e quais ainda estão pendentes.

- Sidebar com cada silo, contador de pendentes e barra de progresso
- Visão geral com o progresso de todos os silos
- Filtro por período (de/até, pela coluna DTV), busca e filtro por status
- Clique em uma NF para marcá-la como **OK** (ou desfazer)
- Importação de CSV para marcar várias NFs como concluídas de uma vez
- Login com **nome + senha geral** (a senha fica no Supabase; só o dono do Supabase troca, e isso desconecta todo mundo)
- **Meta de itens por silo**: defina quantos itens quer lançar (ex.: 30) e o site mostra a porcentagem (15 lançadas = 50%)
- Inclusão, edição e exclusão de NFs direto pelo site, com **Adicionado por** e **Lançado por**
- Exportação da lista filtrada em CSV

## Como funciona

O CSV tem as colunas abaixo (com ou sem cabeçalho; separador `;` ou `,`):

```
NF;NOR;QTD;DEP;SILO;LOTE;MATERIAL;DTV
1001;5501;32.450,5;D01;1;L2026-01;100234;01/10/2026
```

Em **Importar CSV** há duas opções:

| Opção | O que faz |
|---|---|
| **Base de NFs (pendentes)** | Carrega todas as NFs do período. Elas entram como *não concluídas*. NFs que já existem não são alteradas. |
| **NFs lançadas no SAP (concluir)** | Toda NF do arquivo vira **OK**. Se a NF não estava na base, ela é criada já concluída. |

Exemplo: a base tem `[1:não, 2:não, 3:não, 4:não]`; você envia o CSV com as NFs `2` e `3` → fica `[1:não, 2:sim, 3:sim, 4:não]`.

Detalhes:
- A comparação é feita pelo **número da NF** (zeros à esquerda são ignorados: `000123` = `123`). Se uma NF tiver vários itens/lotes, todos ficam OK.
- A coluna SILO aceita `3`, `Silo 3`, `S03`…
- DTV aceita `dd/mm/aaaa`, `dd.mm.aaaa` ou `aaaa-mm-dd` — é ela que o filtro de período usa.
- No Excel: *Arquivo > Salvar como > CSV (separado por vírgulas)*. Arquivos de exemplo: `exemplo-base.csv` e `exemplo-lancadas.csv`.

## Rodar no computador

```bash
npm install
npm run dev
```

Sem configurar o Supabase o site abre em **modo local**: tudo funciona, mas os dados ficam salvos só no seu navegador e não há login. Bom para testar.

## Colocar no ar (grátis)

Usa **Supabase** (banco + login, plano free) e **GitHub Pages** (hospedagem, free).

### 1. Supabase (banco de dados)
1. Crie uma conta em <https://supabase.com> e um projeto novo.
2. Em **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em *Run*. (Se o banco já existia de uma versão anterior, rode só [`supabase/migracao-senha-geral.sql`](supabase/migracao-senha-geral.sql).)
3. Em **Project Settings > API**, copie a **Project URL** (só `https://xxxx.supabase.co`) e a chave **anon public**.

### 2. Senha geral
Todo mundo entra com o **próprio nome** e a **mesma senha**. O nome é o que aparece em *Adicionado por* e *Lançado por*.

A senha fica guardada no Supabase (nunca no código do site), como a senha de um usuário compartilhado:

1. **Authentication > Users > Add user > Create new user**
   - E-mail: `acesso@silos.app`
   - Senha: a senha geral que você quiser
   - Marque **Auto Confirm User**
2. **SQL Editor**: rode [`supabase/migracao-senha-geral.sql`](supabase/migracao-senha-geral.sql), [`supabase/migracao-sessoes.sql`](supabase/migracao-sessoes.sql) e [`supabase/migracao-metas.sql`](supabase/migracao-metas.sql) (quem instalou do zero com o `schema.sql` atual não precisa).
3. **Authentication > Sign In / Providers > Email**: deixe o provedor *Email* ligado. Recomendo **desligar "Allow new users to sign up"**, para ninguém criar contas.

O site lembra o último nome usado em cada navegador ("Entrando como **Fulano**"), então a pessoa só digita a senha. Nomes são padronizados (`isaque` → `Isaque`).

**Trocar a senha (só você, pelo Supabase):** abra [`supabase/trocar-senha.sql`](supabase/trocar-senha.sql), troque `NOVA_SENHA` pela senha nova e rode no **SQL Editor**. Isso troca a senha **e desconecta todo mundo**: quem estiver com o site aberto volta para a tela de login em até 1 minuto, com o aviso "A senha geral foi alterada".

### 3. GitHub Pages (hospedagem)
1. No repositório: **Settings > Secrets and variables > Actions > New repository secret**, crie:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = chave anon public
2. **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. Faça merge na branch `main` (ou rode o workflow manualmente em **Actions > Deploy no GitHub Pages > Run workflow**).
4. O site fica em `https://SEU-USUARIO.github.io/Silos/`.

> A chave *anon* pode ficar no site público: quem protege os dados são as regras de segurança (RLS) do `schema.sql`, que só deixam ler/alterar quem entrou com a senha geral (usuário `acesso@silos.app`, listado em `usuarios_permitidos`).

Para testar local com o Supabase, copie `.env.example` para `.env.local` e preencha.

## Estrutura

```
src/
  App.jsx                 estado, login, regras de importação
  components/             Sidebar, Overview, SiloView, ImportDialog, Login
  lib/csv.js              leitura/normalização do CSV
  lib/store.js            Supabase ou localStorage (modo local)
supabase/schema.sql       tabelas e permissões
.github/workflows/        deploy automático no GitHub Pages
```
