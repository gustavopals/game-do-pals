# Pals Defence - MVP Skeleton

Monorepo inicial para um roguelite tower defense 2D com:

- `client`: Phaser + Vite + TypeScript
- `server`: Node.js + WebSocket (`ws`) + TypeScript
- `shared`: tipos, dados e constantes compartilhadas

## Estrutura

- `packages/shared`: contrato de rede, dados de torres/inimigos/upgrades/mapa e RNG deterministico.
- `packages/server`: loop autoritativo com sistemas de ondas, path, combate, upgrades e progressao.
- `packages/client`: render top-down em Phaser, input WASD, colocacao de torres e HUD.

## MVP atual

- 1 heroi jogavel
- 3 torres (`defender`, `archer`, `mage`)
- 14 upgrades no pool
- 5 tipos de inimigos + 1 boss
- habilidades inimigas: elite burst + boss em 3 fases (summon/shockwave)
- 1 mapa
- Progressao basica entre runs (`packages/server/data/progression.json`)

## Rodando localmente

```bash
npm install
npm run dev:server
npm run dev:client
```

Servidor WebSocket padrao: `ws://localhost:3000`
Cliente Vite padrao: `http://localhost:5173`

Se quiser mudar a URL do servidor no cliente:

```bash
VITE_WS_URL=ws://localhost:3000 npm --workspace @pals-defence/client run dev
```

## Controles

- `WASD`: mover heroi
- `1`, `2`, `3`: selecionar tipo de torre
- Clique em um slot: colocar torre
- `Q`: Arcane Bolt (skill ativa)
- `E`: Aether Pulse (skill ativa)
- Escolha de upgrade: clique no card
- Revive coop: aproxime de um aliado `DOWNED` para reviver automaticamente

## Proximos incrementos naturais

- refinamento do downed/revive (acao manual, VFX dedicados, balanceamento de tempo)
- balanceamento fino dos status/skills inimigas e tooltips
- ECS completo em runtime (hoje esta como base de arquitetura)
- salas/matches multiplas e sincronizacao 2-4 jogadores
- persistencia de conta/autenticacao
