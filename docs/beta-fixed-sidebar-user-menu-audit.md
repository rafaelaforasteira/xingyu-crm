# Auditoria — Fixed Sidebar User Menu

## Estrutura encontrada

- `AppShell`: `apps/web/src/components/layout/app-shell.tsx`, com raiz `flex min-h-screen`, Sidebar e coluna de conteúdo. O documento é o responsável pelo scroll nas páginas comuns; o `main` usa `overflow-auto`, mas não recebe altura máxima.
- `Sidebar`: `apps/web/src/components/layout/sidebar.tsx`. A versão desktop era um item flex comum com wrapper `h-screen`; a versão mobile já usa overlay `fixed inset-0` abaixo de `lg`.
- A largura vem das classes existentes `w-60` e `w-[68px]`, controladas por `sidebarCollapsed` no store. O Main usa `flex-1`, portanto acompanha automaticamente essa largura sem margem hardcoded.
- Header: permanece `sticky top-0` dentro da coluna do Main, alinhado pelo mesmo flex layout.

## Causa do bug

O wrapper desktop tinha altura de viewport, porém continuava no fluxo normal. Quando o documento ultrapassava uma viewport, o wrapper subia junto com o restante do documento. A navegação tinha `flex-1 overflow-y-auto`, mas faltava `min-h-0`, permitindo que listas longas pressionassem o footer.

## Footer anterior

O footer continha card do usuário, `SidebarTeamSwitch`, link combinado “Configurações e perfil” e botão “Sair”. A equipe vinha de uma seleção operacional do store, com fallback hardcoded, e não necessariamente da pessoa autenticada. Auth e logout já vinham de `AuthProvider`; nome e role vinham da sessão e `AUTH_ROLE_LABEL`.

## Destinos e fontes reais

- Meu perfil: `/settings/general`, a seção pessoal/geral existente mais próxima; não existe rota `/profile`.
- Configurações: `/settings`.
- Equipe: usuário correspondente em `settingsApi.users()`, cujo retorno já inclui a relação `team`; a query é cacheada e não chama `/auth/me` novamente.
- Avatar/iniciais: componente compartilhado `Avatar`, que usa o helper `initials`.
- Logout: callback real do `AuthProvider`, preservando revogação de sessão e redirecionamento para `/login`.

## Estratégia escolhida

Desktop usa uma única estratégia: `sticky top-0 h-dvh`. Ela mantém a Sidebar fora do deslocamento visual do scroll, preserva o cálculo flexível de largura/collapse e dispensa offsets duplicados no Main. O `aside` continua `flex-col`; header e footer são não roláveis e somente o `nav` usa `min-h-0 flex-1 overflow-y-auto`. Mobile permanece no drawer existente.
