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

## 2. Música Adaptativa

- Trilha de combate (durante wave)
- Trilha de intermissão (entre waves)
- Trilha de boss (wave com boss)
- Transição suave entre os temas

**Onde implementar:** `GameScene.ts` — eventos de início/fim de wave, spawn de boss

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

## 6. Tela de Configurações

- Controle de volume (música / SFX separados)
- Seleção de idioma (PT/EN já parcialmente implementado)
- Keybinds documentados/visíveis

**Onde implementar:** nova tela no fluxo do menu principal em `GameScene.ts`

---

## 7. Salas Privadas Multiplayer

- Arquitetura atual coloca todos jogadores da mesma dificuldade numa sala
- Adicionar código de sala / invite link
- Host pode iniciar a partida manualmente

**Onde implementar:** `packages/server/src/index.ts` — lógica de `RoomManager`

---

## 0. Reimaginacao Visual Completa (PRIORIDADE MAXIMA)

A identidade visual atual nao agrada — reimaginar tudo do zero antes de continuar qualquer outra feature.

### O que refazer
- **Mapa:** layout, tiles, paleta de cores, estilo de terreno
- **Personagens:** herói, inimigos (todos os tipos), boss
- **Torres:** defender, archer, mage — silhuetas e paleta completamente novas
- **Tema geral:** sair do pixel art puro — explorar algo unico e mais bonito

### Direcoes a considerar (Claude deve propor e decidir o que for mais unico/bonito)
- Vetor flat com outlines expressivos (estilo Hades / Into the Breach)
- Silhuetas fortes com paleta limitada e alto contraste (estilo FTL / Slay the Spire)
- Arte com iluminacao emissiva / neon sobre fundo escuro (estilo atmosferico)
- Geometrico abstrato com identidade propria (algo que nao exista no mercado igual)

### O que nao mudar
- Logica de jogo, sistemas, WebSocket, servidor — so a camada visual

### Como atacar
1. Claude propoe conceito visual com descricao detalhada de paleta, estilo, mood
2. Implementa sprites/texturas novos em `pixelArtCatalog.ts` ou novo sistema de assets
3. Atualiza mapa (`MapLayer` / `mapTexture`) para o novo estilo
4. Atualiza CSS/UI para alinhar com o novo tema

---

## Ordem sugerida de execução

| Prioridade | Feature | Esforço estimado |
|---|---|---|
| 0 | Reimaginacao visual completa | Alto |
| 1 | Game juice (shake, flash, partículas) | Baixo |
| 2 | Upgrades de torre | Médio |
| 3 | Música adaptativa | Médio |
| 4 | Segundo mapa | Médio |
| 5 | Meta progressão | Alto |
| 6 | Tela de configurações | Baixo |
| 7 | Salas privadas | Alto |
