# Prioridades de Desenvolvimento

Baseado na análise do `game-idea.md` vs implementação atual.

---

## 1. Game Juice / Feedback Visual (impacto imediato na sensação)

- Screen shake ao receber dano e ao matar inimigos
- Flash branco/vermelho no sprite do inimigo ao tomar hit
- Floating damage numbers ao acertar (sobe e desaparece)
- Partículas de morte ao eliminar inimigo
- Flash na base ao tomar dano de contato

**Onde implementar:** `GameScene.ts` — loop de combate, função de dano de torre e herói

---

## 2. ~~Música Adaptativa~~ ✓ FEITO

- ~~Trilha de combate (durante wave)~~
- ~~Trilha de intermissão (entre waves)~~
- ~~Trilha de boss (wave com boss)~~
- ~~Transição suave entre os temas~~

**Implementado em:** `MusicEngine.ts` + `GameScene.ts`

---

## 3. Upgrades de Torre em Jogo

- `TowerSnapshot.level` já existe na interface mas nunca é incrementado
- Adicionar opção de upgrade na torre selecionada (custo em ouro)
- Cada nível aumenta dano e range da torre
- Indicador visual de nível na torre (estrelas ou número)

**Onde implementar:** `packages/shared/src/types.ts` (lógica), `GameScene.ts` (painel de contexto já existe)

---

## 4. Progressão Meta (entre runs)

- Sistema de talentos/desbloqueáveis persistentes entre partidas
- Moeda meta separada (ex: "fragmentos") ganha ao completar runs
- Tela de "Legado" acessível no menu principal
- Pelo menos 3-5 talentos simples para MVP (ex: +gold inicial, +torre extra, +vida base)

**Onde implementar:** novo arquivo `MetaProgression.ts`, persistência via `localStorage`

---

## 5. Segundo Mapa

- `MAPS: MapConfig[]` em `data.ts` já suporta múltiplos mapas
- Criar segunda entrada com layout diferente (ex: path em espiral, 3 rotas)
- Tela de seleção de mapa antes de escolher dificuldade

**Onde implementar:** `packages/shared/src/data.ts` (dados), `GameScene.ts` (tela de seleção)

---

## 6. ~~Tela de Configurações~~ ✓ FEITO

- ~~Controle de volume (música / SFX separados)~~
- ~~Seleção de idioma (PT/EN já parcialmente implementado)~~
- ~~Keybinds documentados/visíveis~~

**Implementado em:** `GameScene.ts` (renderSettingsScreen) + `SfxEngine.ts` + `MusicEngine.ts`

---

## 7. Salas Privadas Multiplayer

- Arquitetura atual coloca todos jogadores da mesma dificuldade numa sala
- Adicionar código de sala / invite link
- Host pode iniciar a partida manualmente

**Onde implementar:** `packages/server/src/index.ts` — lógica de `RoomManager`

---

## ~~0. Reimaginacao Visual Completa~~ ✓ FEITO

~~A identidade visual atual nao agrada — reimaginar tudo do zero antes de continuar qualquer outra feature.~~

**Implementado em:** `pixelArtCatalog.ts` + `style.css` + `GameScene.ts` + `main.ts`

**Tema:** Void Wardens — obsidiano escuro + teal emissivo + âmbar de perigo + roxo arcano. Tiles de pedra/void, props temáticos (cristais, pilares, ruínas, tendrilas), sprites de herói/inimigos/torres completamente redesenhados, UI alinhada ao novo tema.

---

## Ordem sugerida de execução

| Prioridade | Feature | Esforço estimado |
|---|---|---|
| ~~0~~ | ~~Reimaginacao visual completa~~ ✓ | ~~Alto~~ |
| 1 | Game juice (shake, flash, partículas) | Baixo |
| 2 | Upgrades de torre | Médio |
| 3 | ~~Música adaptativa~~ ✓ | ~~Médio~~ |
| 4 | Segundo mapa | Médio |
| 5 | Meta progressão | Alto |
| 6 | ~~Tela de configurações~~ ✓ | ~~Baixo~~ |
| 7 | Salas privadas | Alto |
