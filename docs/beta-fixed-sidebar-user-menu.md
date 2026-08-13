# Fixed Sidebar e menu de usuário

A Sidebar desktop agora permanece presa à viewport com `sticky top-0 h-dvh`. A solução é puramente estrutural/CSS: não há listener de scroll nem cálculo manual. Como ela continua sendo uma coluna do flex layout, as larguras existentes (`w-60` expandida e `w-[68px]` recolhida) continuam determinando automaticamente o início do Main e o alinhamento do Header.

Internamente, o `aside` usa coluna flexível. O cabeçalho e o footer não encolhem; a navegação é a única área rolável, com `min-h-0 flex-1 overflow-y-auto`. Isso mantém o rodapé visível mesmo com muitos pipelines e elimina a faixa vazia após scroll longo. O drawer mobile abaixo de `lg` não foi alterado.

## Menu da conta

O rodapé expõe apenas Avatar, nome, role amigável e indicador de menu. O Popover compartilhado abre para cima, usa Portal e collision detection, portanto não é cortado pelo overflow da navegação. Ele apresenta email quando disponível, Team real (ou “Sem equipe”), Meu perfil, Configurações e Sair.

- Nome, email e role: sessão do `AuthProvider`.
- Role amigável: `AUTH_ROLE_LABEL`.
- Avatar/iniciais: componente compartilhado `Avatar`.
- Team: usuário real carregado pela API/cache de Settings, sem fallback hardcoded.
- Meu perfil: `/settings/general`, pois não existe módulo `/profile` separado.
- Configurações: `/settings`.
- Sair: fluxo existente de `AuthProvider.logout()`.

Nome, email, role e equipe usam truncamento e `title`. O trigger é um botão com `aria-label`, foco visível e retorno de foco no Escape provido pelo Popover.

## Limitações

O usuário pertence a uma única Team no domínio atual; não foi introduzido suporte multi-Team. O menu usa comportamento de Popover (Tab/Shift+Tab, Enter e Escape), sem implementar um novo sistema de roving focus por setas. Nenhum CSS global, Tailwind, fonte, schema Prisma ou migration foi alterado.
