# Projection Mapping

Aplicação web para criar cenas de projection mapping no navegador, calibrar regiões com 4 pontos, associar animações e visualizar a saída em tempo real com Three.js.

## Stack

- Frontend: React, Vite, TypeScript, Three.js, Socket.IO Client
- Backend: Node.js, Express, TypeScript, Socket.IO, SQLite
- Compartilhado: pacote de tipos e utilitários de cena

## Funcionalidades do MVP

- criação de projetos com resolução customizada;
- desenho de formas básicas e importação de SVG;
- edição de posição, escala, rotação e estilo;
- calibração manual por quad de 4 pontos;
- animações `pulse`, `drift`, `rotate` e `strobe`;
- viewport de projeção dedicada em rota separada;
- persistência em SQLite;
- sincronização em tempo real entre editor e projeção.

## Estrutura

- `apps/web`: interface e viewport de projeção
- `apps/api`: API REST, SQLite e WebSocket
- `packages/shared`: tipos e utilitários compartilhados

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`

## Portas padrão

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
- healthcheck: `http://localhost:3001/api/health`

## Fluxo rápido

1. Execute `npm install`.
2. Execute `npm run dev`.
3. Abra `http://localhost:5173`.
4. Clique em `Abrir saída` para abrir a viewport dedicada.
