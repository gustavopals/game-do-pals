# Pals Defence - Game Vision + Development Blueprint

Updated on: 2026-03-02

## 1. Vision

Pals Defence e um roguelite tower defense 2D top-down em pixel art.
O jogador controla um Warden que:

- move em tempo real
- usa skills ativas
- constroi e reposiciona torres
- escala build por upgrades aleatorios
- sobrevive a ondas ate o boss final

Inspiracao de atmosfera e leitura visual:

- Metin2 (fantasia corrompida)
- RuneScape (medieval fantasy clara)
- Stardew Valley (pixel art charm e legibilidade)

## 2. Product Pillars

- Build variety: escolhas de upgrade com sinergia real.
- Readability first: combate legivel em qualquer momento da run.
- Fast runs: loop direto, sem friccao desnecessaria.
- Authoritative server: regras criticas no backend.
- Evolucao continua: base preparada para multiplayer e metaprogressao.

## 3. Current Vertical Slice (already implemented)

### 3.1 Core loop

- Entrada em sala por dificuldade (`easy`, `normal`, `hard`)
- Ondas progressivas + boss
- Ouro e XP por inimigo derrotado
- Level up com escolha de upgrade
- Derrota por base destruida ou party wipe
- Vitoria ao concluir todas as ondas

### 3.2 Hero and combat

- Hero com movimento WASD
- Ataque basico automatico
- Skills ativas:
  - `Q`: Arcane Bolt
  - `E`: Aether Pulse
- Cooldowns de skill no HUD
- Projetis visuais no cliente (hero, torres, inimigos e skills)

### 3.3 Towers

- Classes MVP:
  - Defender
  - Archer
  - Mage
- Colocacao em slots
- Limite maximo de torres por heroi
- Novo: reposicionamento de torre durante run (custo de ouro)

### 3.4 Enemy systems

- Tipos base: swarm, ranged, armored, runner, elite, boss
- Status e efeitos:
  - poison
  - shock
  - chain lightning
- Elite com empower temporal
- Boss com fases, summon e shockwave
- Pass de balance recente em stats base, pressao de boss e pacing de ondas

### 3.5 Roguelite upgrades

- Pool de upgrades com raridade
- Escolha de 1 entre 3 opcoes
- A run pausa durante escolha de bencao para decisao sem pressao
- Reroll de upgrades com tokens
- Upgrades focados em dano, velocidade, economia e sinergias

### 3.6 Cooperative states

- Estados de heroi: `alive`, `downed`, `dead`
- Bleedout para downed
- Revive manual por proximidade + segurar tecla (com VFX de conexao)
- Balance tuning por tamanho de equipe (duo/squad) para tempo de revive e janela de bleedout

### 3.7 Wave pacing

- Spawns por onda com escalonamento
- Intermission entre ondas
- Novo: `SPACE` chama proxima onda antecipadamente
- Bonus de ouro imediato ao antecipar
- Curva de ondas recalibrada (early mais legivel, mid/late mais consistente)

### 3.11 Economy tuning

- Recompensas de ouro/XP ajustadas por tipo de inimigo
- Escala de recompensa por dificuldade (`easy`, `normal`, `hard`)
- Escala de recompensa por tamanho do grupo para evitar inflacao em co-op
- Ouro inicial ajustado por dificuldade para manter ritmo de abertura da run

### 3.8 UX/UI and screens

- Main Menu
- Difficulty Select
- Gameplay HUD
- Upgrade Overlay
- Run End Screen
- HUD com estado da run, wave state, status do heroi e skills
- Context panel tatico com tooltip de status/efeitos em herois, torres e inimigos
- Toggle de SFX no cliente e feedback sonoro de UI
- Onboarding tatico in-game para controles avancados (`F`, `R`, `SPACE`) + dica contextual de revive co-op (`V`)

### 3.9 Art direction in-game

- Top-down 2D pixel look
- Terreno em tiles com camadas/config JSON
- Sprites pixelados de heroi, torres e inimigos
- Ambient motion (motes, pulsos, overlays de status)
- Pass visual v2 aplicado: sprites unicos por tipo de inimigo, animacao expandida do heroi e maior diversidade de decor no mapa

### 3.10 Localization

- Suporte PT/EN com toggle em runtime
- Textos principais de gameplay/local UI localizados
- Revisao completa de i18n fica para fase final de polish

### 3.12 Audio foundation

- Primeira camada de SFX sintetizados integrada no cliente
- Eventos cobertos: UI/click, escolha de upgrade, transicoes de wave, skills, elite/boss, revive, vitoria/derrota, erro
- Estado ON/OFF persistido localmente e restaurado ao abrir o jogo

### 3.13 Telemetry foundation

- Coleta basica de resultados de run no servidor
- Persistencia em `packages/server/data/telemetry.json`
- Agregacoes iniciais: total, por dificuldade, por tamanho de grupo e historico recente

### 3.14 Mid-run dynamic objective

- Evento dinamico acionado no meio da run (wave 3)
- Objetivo sorteado por partida: `slayer`, `survivor` ou `bulwark`
- Progresso e status exibidos no HUD (`active`, `completed`, `failed`)
- Recompensa de ouro para o time ao concluir o evento

## 4. Final Product Goal (target)

Entregar uma versao final bonita, jogavel e coesa com:

- identidade visual forte (pixel art fantasy)
- combate satisfatorio e legivel
- progresso de run com escolhas impactantes
- curva de dificuldade consistente
- conteudo suficiente para replay

## 5. Gameplay Design Details

### 5.1 Run loop target

1. Entrar no mapa
2. Posicionar torres iniciais
3. Segurar ondas e coletar recursos
4. Evoluir build por level ups
5. Ajustar posicionamento e ritmo entre ondas
6. Enfrentar boss de fim de run
7. Receber progresso permanente
8. Repetir com novas variacoes

### 5.2 Hero progression model

Atributos alvo (expansao):

- Strength: bonus de dano de torres
- Intelligence: poder de habilidades
- Agility: attack speed e cooldown reduction
- Vitality: HP e sustain
- Luck: qualidade media de upgrades

### 5.3 Tower philosophy

- Defender: seguranca de rota
- Archer: single target DPS
- Mage: area/control
- Healer (expansao): sustain e buffs

### 5.4 Build archetypes target

- Poison Swarm
- Lightning Chain
- Crit Archer
- Summoner/Utility
- Defense Wall

## 6. Visual and Audio Direction (target)

- Pixel art top-down com paleta fantasy vibrante
- Silhuetas claras para cada classe/tipo
- VFX curtos e informativos
- UI diegetica com tema "arcane wardens"
- SFX por categoria: hit, cast, wave, elite, boss, UI
- Musica por fase: calm intermission, tense combat, boss escalation

## 7. Technical Architecture

### 7.1 Stack (defined)

- Client: Phaser + Vite + TypeScript
- Server: Node.js + WebSocket (`ws`) + TypeScript
- Shared: tipos, constantes, dados e RNG deterministico

### 7.2 Networking model

- Server authoritative para combate/regras
- Cliente renderiza snapshot e VFX
- Contratos de mensagem centralizados no pacote shared

### 7.3 Systems

- Wave System
- Path System
- Combat System
- Enemy Ability System
- Upgrade System
- Progression Store (persistencia basica)

## 8. Meta Progression Roadmap

Planejado para proximas fases:

- arvore global de talentos
- desbloqueio de herois e torres
- pool de equipamentos
- currency persistente mais robusta
- objetivos/missoes de conta

## 9. Multiplayer Roadmap

Fase atual: arquitetura pronta para evoluir.
Fases seguintes:

- salas explicitas (2-4 jogadores)
- matchmaking simples por lobby code
- sincronizacao de revive/co-op actions
- reconnection/resume de partida

## 10. Short-Term Backlog (next steps)

1. Refinar reposicionamento de torres (feedback visual, custo dinamico, UX).
2. Primeira camada de musica adaptativa (intermission, combate, boss) com controle de volume.
3. Dashboard/relatorio rapido de telemetria para leitura de balance sem abrir JSON manualmente.
4. Mini tutorial visual de revive/downed para squads (VFX dedicado + teste com 2-4 jogadores).
5. Balance pass do evento dinamico (targets, recompensa e dificuldade por modo).

## 11. Final Polish Backlog

- revisao completa PT/EN em todas as telas e textos de sistema
- polishing de UI visual "shipping quality"
- pass final de arte de personagens e mapa
- QA de performance + gameplay feel
- configuracoes (volume, idioma inicial, keybinds)

## 12. Definition of Done (release candidate)

Uma build e considerada release candidate quando:

- loop completo e estavel por varias runs consecutivas
- sem erros criticos de rede em fluxo normal
- combate legivel e responsivo
- progressao de run e metaprogressao funcionando
- UX consistente em PT e EN
- arte, audio e UI em nivel apresentavel/profissional
