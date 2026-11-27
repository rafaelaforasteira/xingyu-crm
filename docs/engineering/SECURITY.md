# BRAINX — Política de segurança de desenvolvimento

## Segurança em camadas

1. **Antes do código**: modelar ameaças para autenticação, multiusuário, CRM, integrações e dados de clientes (OWASP ASVS como referência).
2. **Durante o código**: revisão de mudanças, validação no servidor, autorização por recurso, tratamento de erros e prevenção de vazamento de dados.
3. **Em cada PR**: CI + Semgrep (SAST), Gitleaks (segredos) e Trivy (dependências/configuração).
4. **Antes de publicar**: testes de integração, fluxo de autenticação, APIs, backups, permissões, dados de teste e auditoria DAST do ZAP em staging autorizado.
5. **Em produção**: monitoramento, alertas, rotação de credenciais e atualização de dependências.

## Testes obrigatórios para módulos BRAINX

- Usuário A não acessa contato, pedido, conversa, arquivos e histórico do usuário/equipe B sem permissão adequada.
- Webhook inválido/repetido não cria pedido, cartão ou mensagem duplicados.
- Ações de recuperação de carrinho não enviam mensagens duplicadas em retries.
- Logs, relatórios e respostas de erro não expõem senhas, tokens, cookies ou dados sensíveis.
- Modo de demonstração nunca substitui integrações reais silenciosamente em produção.
- APIs têm validação de payload, limites de requisição pertinentes e erros previsíveis.

## Falhas e exceções

Criticidade alta/crítica bloqueia merge até correção ou aceitação explícita por responsável autorizado, com justificativa, prazo e mitigação. Detectar uma vulnerabilidade não significa que ela foi explorada; um scanner verde não garante ausência de falhas. Não desligar scanners para "fazer passar".

## Limites de execução

Análises dinâmicas potencialmente invasivas somente contra ambiente de testes/staging explicitamente autorizado. Nunca contra contas reais de Shopify, Meta ou WhatsApp sem escopo e credenciais apropriados.

## Baseline dos scanners

O workflow security.yml começa em modo consultivo: findings e falhas de scanner ficam visíveis no passo e nos artefatos por 7 dias. Não configurar como check obrigatório antes da primeira execução e triagem. Responsável de segurança deve revisar relatórios e erros de infraestrutura, corrigir/aceitar riscos com prazo e então remover continue-on-error dos três passos de scan. Não adicionar allowlists para esconder findings. Instalação de ferramentas continua falhando normalmente.
