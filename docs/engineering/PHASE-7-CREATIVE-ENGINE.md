# Fase 7 — AI Creative Engine

Data: 2026-11-04, America/Sao_Paulo. Branch BRAINX `codex/brainx-quality-security`, base `eddaa2a`.

**Workspace independente:** `C:/Users/Windows/CreativeEngine`. No CRM, somente este relatório foi adicionado. Aplicações, telas, dependências, banco, autenticação, APIs, commits e configurações existentes foram preservados. Não houve push, merge ou deploy.

## Resultado objetivo

- **Operacional/testado:** template React 19 + React Three Fiber, com renderização real WebGL observada em navegador, screenshot e teste de pixels; pipeline local PNG/WebP/SVG/GLB/glTF com oito testes; ComfyUI instalado em venv CPU com API e catálogo de nós testados.
- **Não aprovado:** geração de imagem IA, editor gráfico ComfyUI completo, desempenho de inferência, Blender, exportação GLB por Blender e conexão/reconhecimento do MCP Blender.
- Nenhum modelo/checkpoint foi baixado ou aprovado. Nenhuma API paga, credencial de fornecedor ou conta cloud foi configurada. Servidores de teste foram encerrados; zero listeners restantes nas portas 4173/8188.

## 1. Auditoria e decisão de arquitetura

AGENTS.md e relatórios 3/4/5/6 foram consultados. As restrições anteriores contra instalação criativa naquela fase não foram tratadas como autorização para mudar o CRM; o pedido atual autoriza apenas o workspace separado. Artefatos anteriores não versionados `artifacts/layout-fix/` e `artifacts/tracking-recovery/` permaneceram intactos.

Hardware medido por CIM, sem ler credenciais/serial:

- Windows 10 Pro, versão 10.0.19045, 64 bits.
- AMD Athlon 3000G, **dois núcleos físicos/quatro threads**.
- RAM visível **13,93 GiB**, livre inicialmente cerca de **3,30 GiB**.
- Radeon Vega 3 integrada, driver 31.0.21918.2005. AdapterRAM informado: 2 GiB; **isso não comprova VRAM dedicada**, OpenGL/Vulkan compatíveis ou aceleração de IA.
- Disco C: 893,59 GiB; livre inicialmente **159,62 GiB**, snapshot posterior **157,15 GiB**. Diferença é observação da máquina, não medição exata de custo/ocupação exclusiva do engine.
- Existentes e reutilizados: Node 24.14.1, pnpm 9.15.4, uv 0.13.7, Python 3.12.14 do runtime Codex e Chromium 1248. Python da WindowsApps é alias; não foi reinstalado. Blender/ComfyUI não foram encontrados antes desta instalação nos caminhos auditados. Não foram trocados OS, drivers ou runtimes globais.

Licenças dos runtimes existentes conferidas nas fontes oficiais das versões: Node/pnpm MIT com avisos de componentes, Python PSF e avisos históricos, uv MIT/Apache-2.0 (arquivo MIT obtido). Links e cópias em `evidence/runtime-license-sources.json` e arquivos LICENSE correspondentes; não foi auditada ativação/licença comercial do Windows. Nenhum runtime foi reinstalado para obter essas evidências.

Decisão: ComfyUI em **CPU**, sem prometer inferência útil nesta GPU; 3D web simples com carga explícita; Blender adiado porque o mínimo oficial publicado é quatro cores e os requisitos gráficos não foram confirmados. Dois cores físicos/quatro threads não foram apresentados como quatro cores físicos homologados. Não foi feita instalação pesada para presumir compatibilidade.

Fontes oficiais consultadas em 2026-11-04: [ComfyUI](https://github.com/Comfy-Org/ComfyUI), [instalação manual](https://docs.comfy.org/installation/manual_install), [requisitos](https://docs.comfy.org/installation/system_requirements), [Blender requisitos](https://www.blender.org/download/requirements/), [Blender licença](https://www.blender.org/about/license/), [MCP comunitário](https://github.com/ahujasid/mcp-for-blender), [React Three Fiber](https://github.com/pmndrs/react-three-fiber). Algumas páginas Blender retornaram erro de fetch no leitor web; os documentos oficiais foram obtidos por HTTPS e preservados no inventário, sem execução de instalador remoto.

## 2. Organização e isolamento

Raiz externa contém:

- `image-generation/`: clone oficial ComfyUI em tag estável e `.venv`, requirements congeladas, script de início local, dados próprios de usuário.
- `blender/`: script de cena própria e exemplo MCP desabilitado, sem binário/addon instalado.
- `3d-components/`: projeto pnpm independente, package.json/lock próprios, componentes e teste browser.
- `assets/brainx/{source,web,metadata}/`: organização por projeto; nenhuma publicação automática ou ligação com uploads do CRM.
- `workflows/`: grafo API stock, registro de modelos aprovados vazio.
- `prompts/`: brief criativo versionado, sem dados reais.
- `documentation/`: ASSET-PIPELINE.md, OPERATIONS.md, VALIDATION.md, toolchain.json.
- `tools/`: validação de assets, conversão WebP e preparação de request com aprovação/hash de modelo.
- `evidence/`: inventário, versões/licenças, logs, capturas e resultados reais.

Nenhum repositório completo foi copiado para o BRAINX. A fonte ComfyUI está apenas no engine externo; dependências Python e Node são locais a ele. `.gitignore` externo exclui venv, fonte vendorizada, node_modules, builds, envs e formatos de pesos. Esse arquivo não modifica o ignore do CRM.

## 3. ComfyUI — instalado e API validada, geração pendente

Versão estável **0.44.0**, release marcada `prerelease:false`, commit **2c75dc1b379a59e0880619d029607af5169a62ef**. Licença GPL-3.0 conforme fonte. Clone raso da tag oficial, não master/nightly.

Caminhos:

- Fonte: `C:/Users/Windows/CreativeEngine/image-generation/ComfyUI`.
- Venv: `image-generation/.venv`, Python 3.12.14 existente.
- Torch **2.15.0+cpu**, torchvision **0.29.2+cpu**, instalados pelo índice CPU oficial `https://download.pytorch.org/whl/cpu`.
- Dependências oficiais por PyPI; freeze em `image-generation/requirements.lock.txt`, 85 distribuições. `evidence/python-packages.json` registra versões e licenças reportadas por cada pacote. Freeze não é lock de hashes de todas as wheels.

Licenças relevantes: Torch reporta conjunto de licenças de componentes (BSD/Apache/MIT e outras), torchvision BSD, Pillow 13.0.0 MIT-CMU, NumPy 2.5.4 conjunto BSD/MIT/0BSD/Zlib/CC0, Transformers 5.22.1 Apache-2.0. Não reduzir essas dependências a uma única licença genérica. Modelo e asset precisam de revisão própria, independentemente da licença do software.

Comandos executados: `uv venv --python <Python-existente> <venv>`, instalação torch/torchvision CPU, `uv pip install -r ComfyUI/requirements.txt`, freeze e `uv pip check`. Todos concluíram; import Torch/Pillow passou e CUDA retornou **False**. Pacotes frontend/templates/documentação são dependências oficiais; não são checkpoints aprovados para inferência.

`image-generation/start-local.ps1` usa **127.0.0.1:8188**, `--cpu --offline --disable-all-custom-nodes --disable-auto-launch`, diretórios próprios e variáveis HF_HUB_OFFLINE, TRANSFORMERS_OFFLINE, HF_HUB_DISABLE_TELEMETRY e DO_NOT_TRACK. Não usa --listen sem endereço, não instala serviços/firewall, não habilita parceiros pagos ou custom nodes. O log CPU pode chamar RAM de VRAM; isso não prova GPU ou VRAM dedicada.

Evidências:

- `torch-runtime.log`: import e CPU confirmados; `comfy-pip-check.log`: exit 0.
- `comfy-system-stats.json`: endpoint respondeu; `comfy-http.json`: HTTP 200 e CSP offline, com conexões restritas a self/data/blob.
- `comfy-nodes.json`: **690 nós**, seis classes necessárias presentes: CheckpointLoaderSimple, CLIPTextEncode, EmptyLatentImage, KSampler, VAEDecode e SaveImage. **Zero checkpoints**.
- `comfy-listener.json`: bind apenas em 127.0.0.1. O serviço foi encerrado após os testes.
- Primeira consulta de health ocorreu antes do fim da inicialização e falhou; log preservado, não chamado de sucesso.
- Capturas `comfy-home.png` e `comfy-ready.png` mostram **splash/carregamento**. HTTP/título e canvas visível passaram nos scripts, mas inspeção visual revelou que isso não prova o editor pronto. O script foi fortalecido para aguardar controle do editor; esse critério ainda não foi executado. **Editor gráfico não aprovado.**

### Workflow preparado

`workflows/image-basic.api.json` contém sete nós stock para PNG: checkpoint → encoders positivo/negativo → latente 512×512/batch1 → KSampler seed20261104,20passos,CFG7,euler/normal,denoise1 → decode → SaveImage. É template SD-style, não universal para todo modelo. O campo de checkpoint sinaliza que não há modelo aprovado.

`workflows/models-approved.json` está vazio. `tools/prepare_generation.py` exige ID aprovado, modelo local safetensors, URL/origem/licença, tamanho a revisar na aprovação, aprovador/data e SHA-256 válido; calcula hash por streaming, sem carregar um modelo inteiro na RAM. Recusa modelo não aprovado/ausente/divergente e não faz download. Teste `--model-id unapproved` retornou **exit 1 esperado**, sem criar request ou gerar imagem.

O request preparado inclui parâmetros e extra_pnginfo com seed, versão e licença/hash do modelo. PNG original mantém metadados internos; WebP público é derivado separado sem EXIF/prompts. SaveImage adiciona contador ao nome; preservar original e copiar para nome canônico ainda inexistente, registrando a procedência. Não remover originais para adequar nomenclatura.

Esse guard pertence ao helper/pipeline; não é sandbox contra um operador que invoque diretamente ComfyUI. Nenhuma imagem IA foi gerada, nenhum prompt foi enfileirado e nenhum modelo grande foi baixado. Seed reproduz parâmetros, não promete pixels idênticos entre versões/hardware. Próximo passo depende de aprovação explícita de um modelo/licença/tamanho e avaliação de hardware.

## 4. Blender e MCP — preparados, não operacionais

Fonte oficial consultada indica Blender **4.5.15 LTS** como candidato estável da linha 4.5 disponível no índice. Licença dos binários GPL-3.0-or-later, conforme página oficial; não houve download/instalação porque CPU e GPU não estão plenamente dentro dos requisitos confirmados. Não há exportação GLB, arquivo blend ou render Blender aprovado.

`blender/create_scene.py` é script local preparado e passou apenas em **py_compile**. Exige processo background novo com factory-startup, cria cena sintética e exporta GLB/BLEND somente em assets/brainx/source, rejeitando destinos existentes. Não foi executado em Blender ou em uma cena do usuário. Sintaxe Python não comprova compatibilidade da API bpy/exportador.

O repositório solicitado existe como **ahujasid/mcp-for-blender**, antigo blender-mcp; pacote atual **mcp-for-blender 2.2.7**, Python>=3.10, MIT. É integração comunitária, não Blender Foundation. Requisitos oficiais e código/configuração foram revisados; não foram usados instaladores via irm|iex/curl|sh, setup automático ou scripts externos não inspecionados.

Configuração proposta em `blender/codex-mcp.example.toml` e `.codex/config.toml` do engine:

- **enabled=false**; nenhum pacote/addon MCP instalado.
- Host 127.0.0.1:9876, Python existente, versão fixada; allowlist proposta somente get_scene_info/get_object_info.
- `BLENDER_MCP_SAFE_MODE=1`, `DISABLE_TELEMETRY=true`, downloads Python automáticos desativados.
- Sem execute_blender_code, keys, serviços de geração externa ou assets de terceiros habilitados. Safe mode não é sandbox OS nem prova de confinamento de qualquer exportador; escopo de arquivos e cena ainda exigirá validação antes de habilitar.

**Reconhecimento Codex: não confirmado.** `codex -C <engine> mcp get creative_blender --json` e a consulta no cwd do engine retornaram exit 1, “No MCP server named ... found”. TOML parseou, mas arquivo existente não equivale a registro reconhecido. Não se alterou trust/configuração global para forçar a carga. Os MCPs do CRM permaneceram intactos.

Telemetria upstream: conteúdo é opt-in, mas README informa registro anônimo mínimo por padrão; DISABLE_TELEMETRY=true desativa também esse registro. O template mantém tudo desligado. O socket do addon não possui autenticação/criptografia, portanto não deve sair de localhost. Nem conexão stdio nem addon/socket foram testados nesta máquina. Essas etapas permanecem pendentes de ambiente Blender compatível e configuração reconhecida.

## 5. React Three Fiber — componente isolado renderizado

Projeto: `C:/Users/Windows/CreativeEngine/3d-components`, sem qualquer dependência adicionada ao BRAINX.

Versões fixadas: React/ReactDOM **19.3.1**, R3F **9.8.2**, Three **0.187.0**, Vite **8.3.5**, plugin-react **6.2.1**, TypeScript **5.9.3**, Playwright **1.62.0** (mesma versão de teste já existente). Tipos/Node e transitivas fixados no pnpm-lock.yaml. React19 atende aos peers R3F9 consultados. Licenças MIT para React/R3F/Three/Vite/plugin; TypeScript e Playwright Apache-2.0. Não foi instalado o test-renderer descrito como experimental pelo próprio projeto.

Comportamento: React.lazy carrega Scene somente após botão; fallback SVG permanece visível, descrição textual disponível e Canvas decorativo aria-hidden; botão funciona por teclado, aria-expanded e erro/fallback existem. Frameloop=demand, DPR1–1,5, sem rotação automática, antialias off/powerPreference low-power, dimensões reservadas e reduced motion. Não contém import de dados/modelos do CRM.

Validação:

- `pnpm install --ignore-scripts`, typecheck e build: **exit 0**.
- Preview somente em **127.0.0.1:4173**, depois encerrado. Não foi tentativa de abrir BRAINX ou substituir o Next anteriormente bloqueado; é o novo template independente solicitado nesta fase, sem relaxamento de política.
- Browser real com Chromium existente: **um teste passou**, WebGL2 criado, botão por Enter, fallback mantido e fechamento funcionando; nenhum pageerror nesse cenário.
- Screenshot real inspecionada: `evidence/r3f-isolated.png`, canvas `r3f-canvas.png`; verificação de compositor encontrou **20.856 pixels verdes** da cena procedural. Isso comprova esse render isolado, não performance em todos os dispositivos ou todos os estados de falha.
- Falha inicial preservada: readPixels após apresentação leu buffer limpo com preserveDrawingBuffer=false. O teste foi corrigido para verificar a captura real do compositor, sem flags para ignorar bloqueios GPU ou aprovar canvas vazio. `r3f-browser-test.log` e `r3f-browser-final.log` registram ambos.
- Bundle inicial JS223,02KB minificado/70,15KB gzip; Scene918,50KB/242,73KB gzip adiado. Warning>500KB não foi escondido. Medir carregamento/FPS/GPU/mobile antes de uso produtivo; não adicionar 3D onde não houver benefício.
- `pnpm audit --json` do template: exit 0, zero findings em74dependências na metadata; não garante segurança absoluta nem muda a auditoria do CRM.

## 6. Asset pipeline e procedência

Regras completas em `documentation/ASSET-PIPELINE.md`. Formatos/limites iniciais: PNG masters/transparência até2MB no check web e decoder16MP; WebP até500KB e1600px no maior eixo; SVG100KB autocontido sem script/eventos/animação/recurso externo; GLB preferido, glTF2, orçamento1,5MB/50miltriângulos e texturas1024/2048 a revisar; GLTF com recursos relativos dentro do projeto. Limites geométricos/semânticos exigem validador glTF antes de publicação, não são todos impostos pelo check básico.

Nome canônico `<project>-<purpose>-<variant>-v001.ext`, versão nova sem sobrescrever; dimensões/proporção registradas (1:1/4:3/16:9 conforme uso), alpha preservado, hashes calculados não substituíveis por metadata. Prompts/parâmetros/workflow, modelo/licença/aprovação ficam em metadados internos separados do derivado público. Licença do gerador não autoriza automaticamente o modelo ou o conteúdo gerado.

`tools/asset_pipeline.py` verifica raiz resolvida, formato/nome/peso, direitos revisados/origem, rasters reais com Pillow, SVG restritivo, recursos GLTF e header GLB2. Exporta WebP com quality82/method6 e thumbnail proporcional, destino exclusivo. Não apaga originais. Não é sanitizador universal ou substituto de revisão visual/Khronos glTF Validator.

**Oito testes passaram**, incluindo PNG→WebP com alpha100 conservado, recusa de sobrescrita, licença/origem, SVG executável/animado, traversal, recurso GLTF remoto, header GLB inválido e hash calculado protegido. Dois testes adicionais falharam antes das correções de hash/atributo animado; logs red/final preservados. Fixtures são sintéticas temporárias, não imagens IA ou exports Blender.

## 7. Evidências, custos e limitações

Inventário externo: `evidence/hardware.json`, `comfy-release.json`, `python-packages.json`, `r3f-packages.json`, requisitos congelados e `documentation/toolchain.json`. Logs de instalação/checagem, testes, API, auditoria e capturas permanecem nesse workspace. `workspace-files.json` é inventário de arquivos próprios em um snapshot, excluindo ambientes/vendor; não representa backup completo ou assinatura de toda a cadeia.

Sem cobrança de cloud/API/inferência configurada; custos locais incluem energia, disco, download e futura licença de modelo/asset. O wheel Torch CPU teve120,8MiB no log; dependências/templates e caches somam mais. Não foi estimado custo de inferência nem prometida velocidade na CPU. Não houve alteração de PATH, driver, associação blend, serviço Windows ou configuração global Codex.

Custos da sessão/plano Codex, energia e banda do usuário não foram medidos; não se afirma custo total zero.

`evidence/cleanup.json` confirma zero listeners em4173/8188 após parar apenas processos próprios, conferindo identidade. A venv e o workspace foram preservados, sem apagar arquivos existentes. O serviço Comfy criou apenas seus dados/configuração locais no engine, não migrações ou dados do BRAINX.

Gitleaks em snapshot de25arquivos próprios do engine passou sem findings (`own-files-gitleaks.json/log`); ambientes e código vendorizado não foram confundidos com código próprio. O relatório do CRM também passou em formatação/whitespace e varredura dedicada de segredos. Isso não é certificação geral de segurança. Checks do BRAINX não foram repetidos nesta fase documental; typecheck/build/browser e testes citados aqui pertencem ao engine independente.

Pendências: modelo/licença/tamanho explicitamente aprovados; imagem IA real; editor Comfy interativo; Blender compatível, MCP reconhecido/conectado e cena/GLB exportada; validação glTF completa, benchmarks/mobile e revisão de assets antes de uso em páginas. O código do CRM e sua validação visual anterior continuam separados.

## 8. Utilização, atualização e reversão

- Comfy API local: iniciar manualmente `image-generation/start-local.ps1` apenas quando necessário; aguardar health antes de uso e encerrar depois. Não ampliar bind. A interface gráfica ainda exige validação; não baixar modelo via UI sem aprovação.
- Imagem: registrar aprovação em models-approved.json, verificar modelo local/hash/licença e materializar request com prepare_generation.py; revisar grafo para arquitetura escolhida. Sem modelo aprovado, parar. PNG original → cópia canônica/sidecar → WebP revisado; nunca publicação automática.
- Template3D: em 3d-components, `pnpm typecheck`, `pnpm build`, `pnpm preview`, `pnpm test`; teste usa Chromium existente e Pillow da venv para verificar screenshot. Reutilizar componente somente após review de escopo, desempenho e acessibilidade do projeto destino.
- Blender/MCP: não habilitar na máquina atual como se estivesse homologado. Em hardware compatível, revisar versão estável, checksums/licenças, scripts locais e bind/telemetria, testar GLB e protocolo antes de ativar ferramentas. Não confiar só em arquivo de configuração.
- Atualizar uma ferramenta por vez, em ambiente paralelo, versão estável explícita e diferenças/licenças revisadas. Preservar fontes/lock/logs anteriores. Freeze Python não contém hashes de todas as wheels; aprimorar lock de artefatos antes de distribuição automatizada. Não usar versões nightly/experimentais ou instaladores remotos via pipe por padrão.
- Reverter: parar somente processos próprios após verificar identidade; arquivar o workspace externo, sem apagar arquivos existentes ou remover runtimes compartilhados. No BRAINX, reverter apenas o commit documental desta fase, sem reset/clean, push, merge ou deploy. Não há mudança de runtime, banco ou integração do CRM a desfazer.
