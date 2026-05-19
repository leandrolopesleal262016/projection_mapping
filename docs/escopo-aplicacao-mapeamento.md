# Escopo do Projeto: Aplicação Web de Mapeamento de Projeção

## 1. Visão do Produto

Desenvolver uma aplicação web de projection mapping que permita ao usuário:

- importar formas vetoriais (SVG);
- desenhar formas geométricas diretamente no navegador;
- calibrar a projeção por meio de pontos de controle;
- associar animações a áreas mapeadas;
- visualizar e operar a projeção em tempo real;
- salvar e recuperar sessões de mapeamento.

O objetivo é oferecer um fluxo de mapping interativo no navegador, reduzindo dependência de softwares desktop para cenários de menor e média complexidade.

## 2. Objetivo do MVP

O MVP deve validar quatro capacidades centrais:

1. O usuário consegue criar ou importar áreas de projeção.
2. O usuário consegue calibrar a deformação da projeção sobre uma superfície física.
3. O usuário consegue vincular animações a essas áreas.
4. O sistema atualiza a visualização projetada em tempo real conforme os ajustes são feitos.

## 3. Escopo Funcional do MVP

### 3.1 Interface Web

O frontend deve permitir:

- criar um projeto de mapping;
- importar arquivos SVG;
- desenhar formas básicas: retângulo, círculo, polígono e path simples;
- selecionar, mover, redimensionar, rotacionar e agrupar formas;
- organizar formas em camadas;
- editar propriedades visuais das formas;
- visualizar uma área de trabalho com grade, snap opcional e zoom/pan;
- alternar entre modo de edição e modo de projeção.

### 3.2 Calibração e Mapeamento

O módulo de calibração deve permitir:

- selecionar uma forma ou grupo de formas;
- definir pontos de controle da origem e do destino;
- ajustar manualmente os pontos projetados;
- calcular e armazenar a transformação geométrica;
- reaplicar a calibração ao reabrir o projeto;
- visualizar overlay de referência para ajuste fino.

Para o MVP, a calibração pode começar com transformação planar baseada em 4 pontos (homografia), com possibilidade de expansão futura para malhas com mais pontos.

### 3.3 Animação

O sistema deve permitir:

- vincular uma animação a uma forma ou região;
- configurar propriedades básicas da animação:
  - tipo;
  - duração;
  - loop;
  - atraso;
  - velocidade;
  - cor;
  - opacidade;
- reproduzir, pausar e reiniciar a animação;
- pré-visualizar a animação dentro do editor;
- renderizar a animação no modo de projeção.

Tipos iniciais de animação sugeridos para o MVP:

- fade in/out;
- pulse;
- deslocamento;
- scale;
- rotação;
- shader simples com ruído, gradiente ou glow.

### 3.4 Sincronização em Tempo Real

O sistema deve:

- atualizar a cena projetada em tempo real conforme o usuário move formas ou pontos;
- sincronizar alterações de geometria, transformação e estado de animação;
- manter o frontend de edição e a viewport de projeção consistentes.

Para o MVP, a sincronização pode ser feita por WebSocket com eventos granulares.

### 3.5 Persistência e Backend

O backend deve:

- receber dados de projeto, formas, animações e calibração;
- persistir essas informações em banco de dados;
- expor API para carregar, salvar e listar projetos;
- publicar eventos em tempo real para atualização da projeção;
- oferecer estrutura pronta para autenticação futura, mesmo que o MVP opere sem login.

## 4. Fora do Escopo do MVP

Itens recomendados para não entrar na primeira versão:

- calibração automática por câmera/computer vision;
- múltiplos projetores com edge blending;
- timeline avançada estilo software de motion;
- colaboração multiusuário simultânea;
- biblioteca extensa de efeitos visuais;
- editor vetorial completo comparável a Illustrator/Figma;
- áudio reativo;
- suporte offline nativo;
- controle DMX/MIDI/OSC;
- versionamento complexo de projetos.

## 5. Perfis de Usuário

### 5.1 Operador Criativo

Usuário que cria formas, calibra a projeção e configura animações.

### 5.2 Técnico de Instalação

Usuário responsável por ajustar projeção em superfície física, testar alinhamento e validar estabilidade visual.

## 6. Fluxos Principais

### 6.1 Criar Projeto

1. Usuário cria um novo projeto.
2. Define resolução da área de trabalho.
3. Importa SVG ou desenha formas manualmente.
4. Organiza as áreas por camada ou grupo.

### 6.2 Calibrar

1. Usuário entra no modo de calibração.
2. Seleciona uma forma ou região.
3. Ajusta os pontos de controle no destino projetado.
4. Salva a transformação.
5. Visualiza o resultado aplicado em tempo real.

### 6.3 Animar

1. Usuário seleciona uma forma.
2. Escolhe um tipo de animação.
3. Configura parâmetros.
4. Pré-visualiza o efeito.
5. Publica ou salva o estado para projeção.

### 6.4 Operar

1. Usuário entra em modo de projeção.
2. O sistema renderiza a cena com as transformações aplicadas.
3. Ajustes feitos no editor refletem imediatamente na saída.

## 7. Requisitos Funcionais

### 7.1 Projetos

- Criar projeto.
- Editar projeto.
- Duplicar projeto.
- Salvar projeto.
- Carregar projeto.
- Exportar/importar projeto em JSON.

### 7.2 Formas

- Importar SVG.
- Desenhar formas básicas.
- Editar posicionamento, escala e rotação.
- Agrupar e desagrupar.
- Aplicar nome e metadados por forma.

### 7.3 Calibração

- Criar conjunto de pontos de controle.
- Editar pontos de controle.
- Salvar matriz de transformação.
- Restaurar calibração salva.
- Resetar calibração de uma forma.

### 7.4 Animações

- Associar animação a uma ou mais formas.
- Configurar parâmetros por instância.
- Ativar/desativar loop.
- Controlar play/pause/stop.

### 7.5 Renderização

- Exibir preview no editor.
- Exibir viewport dedicada de projeção.
- Aplicar transformação da forma antes da renderização final.
- Manter taxa de quadros aceitável para cenas simples e médias.

### 7.6 Estado em Tempo Real

- Propagar mudanças do editor para o renderizador.
- Atualizar apenas os elementos alterados.
- Minimizar latência perceptível durante a calibração.

## 8. Requisitos Não Funcionais

- Interface responsiva para desktop.
- Suporte prioritário a navegadores Chromium.
- Arquitetura modular entre editor, engine e backend.
- Persistência confiável de projetos e calibrações.
- Latência baixa na atualização de cena.
- Base preparada para escalar de MVP para multiusuário no futuro.

Metas iniciais:

- tempo de resposta das ações visuais: menor que 100 ms percebidos em ambiente local;
- FPS alvo na viewport de projeção: 30 a 60 FPS para projetos do MVP;
- tempo de carregamento de projeto simples: menor que 2 segundos em ambiente local.

## 9. Arquitetura Recomendada

### 9.1 Frontend

Stack sugerida:

- React;
- TypeScript;
- Vite;
- Zustand ou Redux Toolkit para estado;
- React Router;
- Fabric.js ou Konva para manipulação 2D no editor;
- Three.js para renderização e animações WebGL;
- Socket.IO Client para sincronização.

Motivo:

- React oferece maturidade e ecossistema forte para interfaces complexas.
- Konva/Fabric simplificam operações vetoriais 2D no editor.
- Three.js atende bem a camada de renderização com shaders e animações.

### 9.2 Backend

Stack sugerida:

- Node.js;
- Fastify ou Express;
- TypeScript;
- Socket.IO;
- Prisma ou Drizzle para acesso a dados.

Motivo:

- reduz atrito entre frontend e backend com linguagem única;
- facilita prototipagem rápida e manutenção.

### 9.3 Banco de Dados

Banco recomendado para o MVP:

- SQLite.

Motivo:

- simples de operar;
- adequado para MVP monoinstância;
- suficiente para armazenar projetos, geometrias, calibrações e presets.

Evolução futura:

- migrar para PostgreSQL quando houver multiusuário, auditoria mais forte ou maior volume de dados.

## 10. Componentes do Sistema

### 10.1 Editor de Cena

Responsabilidades:

- gerenciar canvas de edição;
- importar/desenhar formas;
- aplicar transformações visuais básicas;
- selecionar e editar elementos.

### 10.2 Módulo de Calibração

Responsabilidades:

- definir pontos de correspondência;
- calcular homografia ou transformação equivalente;
- armazenar matriz por elemento ou grupo;
- refletir calibração no preview.

### 10.3 Motor de Renderização

Responsabilidades:

- desenhar a cena em WebGL;
- aplicar animações;
- aplicar deformações/calibração;
- renderizar viewport de projeção.

### 10.4 API e Persistência

Responsabilidades:

- CRUD de projetos;
- persistência de formas;
- persistência de animações;
- persistência de pontos e matrizes de calibração;
- distribuição de eventos em tempo real.

### 10.5 Canal de Sincronização

Responsabilidades:

- publicar eventos de atualização;
- sincronizar estado entre editor e projeção;
- garantir consistência mínima do estado ativo.

## 11. Modelo de Dados Inicial

### 11.1 Projeto

- `id`
- `name`
- `width`
- `height`
- `background`
- `createdAt`
- `updatedAt`

### 11.2 Forma

- `id`
- `projectId`
- `type`
- `name`
- `svgPath`
- `transform`
- `style`
- `layerOrder`
- `groupId`

### 11.3 Calibracao

- `id`
- `projectId`
- `shapeId`
- `sourcePoints`
- `targetPoints`
- `transformMatrix`
- `updatedAt`

### 11.4 Animacao

- `id`
- `projectId`
- `shapeId`
- `type`
- `params`
- `isLoop`
- `isActive`

### 11.5 Sessao de Runtime

- `projectId`
- `currentSceneState`
- `lastSyncAt`

## 12. API Inicial Sugerida

### 12.1 REST

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

- `POST /api/projects/:id/shapes`
- `PUT /api/shapes/:shapeId`
- `DELETE /api/shapes/:shapeId`

- `POST /api/shapes/:shapeId/calibration`
- `GET /api/shapes/:shapeId/calibration`
- `PUT /api/shapes/:shapeId/calibration`

- `POST /api/shapes/:shapeId/animations`
- `PUT /api/animations/:animationId`
- `DELETE /api/animations/:animationId`

- `POST /api/projects/:id/export`
- `POST /api/projects/import`

### 12.2 WebSocket Events

Eventos de entrada:

- `scene:shape_updated`
- `scene:shape_created`
- `scene:shape_deleted`
- `scene:calibration_updated`
- `scene:animation_updated`
- `scene:mode_changed`

Eventos de saída:

- `projection:state_updated`
- `projection:render_refresh`
- `projection:error`

## 13. Estratégia de Renderização

Abordagem sugerida:

1. Editor 2D para autoria e manipulação de formas.
2. Conversão das formas em entidades renderizáveis.
3. Aplicação da transformação de calibração.
4. Aplicação da animação no material, geometria ou shader.
5. Renderização final em viewport dedicada para projeção.

Para o MVP, vale manter duas camadas claras:

- camada de autoria 2D;
- camada de renderização/projeção.

Isso reduz acoplamento e facilita depuração.

## 14. Segurança e Operação

Para a primeira versão:

- sem autenticação obrigatória, se o uso for interno/local;
- validação de payloads no backend;
- limite de tamanho para upload de SVG;
- sanitização de conteúdo importado;
- logs básicos de erro e auditoria de alterações.

Se o sistema ficar exposto publicamente, autenticação e autorização passam a ser obrigatórias.

## 15. Deploy Recomendado

### 15.1 Ambiente Inicial

- VPS Linux;
- Nginx como reverse proxy;
- frontend servido como estático;
- backend Node.js gerenciado por PM2 ou systemd;
- banco SQLite em volume persistente;
- TLS via Let's Encrypt.

### 15.2 Rotas

- `/` para frontend;
- `/api` para REST;
- `/socket.io` para eventos em tempo real;
- `/projection` opcional para viewport dedicada de saída.

## 16. Roadmap por Fases

### Fase 1. Fundação

- setup do monorepo ou repositório único;
- estrutura frontend + backend;
- modelo de dados inicial;
- CRUD de projetos.

### Fase 2. Editor

- canvas de edição;
- desenho/importação de SVG;
- seleção e transformação básica de formas;
- persistência de cena.

### Fase 3. Calibração

- pontos de controle;
- cálculo e preview da transformação;
- salvamento da calibração.

### Fase 4. Animação e Renderização

- integração Three.js;
- biblioteca inicial de animações;
- viewport de projeção.

### Fase 5. Sincronização e Operação

- WebSocket;
- atualização em tempo real;
- ajustes de desempenho e estabilidade.

### Fase 6. Deploy

- empacotamento;
- Nginx;
- observabilidade básica;
- documentação operacional.

## 17. Riscos Técnicos

- diferença entre o modelo 2D do editor e a renderização final em WebGL;
- complexidade crescente da calibração se o requisito evoluir além de homografia simples;
- desempenho ao manipular muitas formas com animações simultâneas;
- precisão do ajuste manual dependendo da superfície física e resolução do projetor;
- necessidade futura de separar engine de projeção da interface de edição.

## 18. Decisões Recomendadas para Começar

- Usar React + TypeScript no frontend.
- Usar Node.js + TypeScript no backend.
- Usar SQLite no MVP.
- Usar Socket.IO para sincronização.
- Usar Three.js para renderização.
- Implementar primeiro homografia de 4 pontos antes de suportar malhas avançadas.
- Tratar importação SVG como principal entrada na primeira iteração.

## 19. Próximos Passos

1. Validar o escopo do MVP.
2. Confirmar stack final.
3. Definir se o projeto será monorepo.
4. Especificar wireframes das telas principais.
5. Quebrar o MVP em backlog técnico.
6. Iniciar scaffold do frontend e backend.
