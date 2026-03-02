# GAME DEVELOPMENT PROMPT

## Project: **Pals Defense**

Develop a **2D Roguelite Tower Defense Game** with pixel-art aesthetics inspired by classic MMORPGs such as Metin2 and RuneScape, combined with modern roguelike progression systems.

---

# 1. CORE GAME CONCEPT

Pals Defense is a **Roguelite Hero-Based Tower Defense** where players defend magical realms corrupted by dimensional fractures releasing endless monster waves.

The player controls a hero capable of:

* placing combat units (towers)
* moving freely across the battlefield
* casting abilities
* evolving during runs
* creating synergistic builds

Each run is unique through procedural upgrades and randomized progression choices.

---

# 2. GAMEPLAY LOOP

Main gameplay cycle:

1. Player enters procedural battlefield
2. Enemy waves spawn following defined paths
3. Player gathers resources from defeated enemies
4. Player deploys or repositions units
5. Level-up triggers upgrade selection
6. Build evolves dynamically
7. Boss wave appears
8. Player dies or wins
9. Permanent progression unlocked
10. New run begins stronger

---

# 3. SETTING & LORE

The world of **Aetherfall** once connected multiple kingdoms through magical monoliths similar to ancient rune stones.

After a catastrophic event known as:

> **The Shattering**

these monoliths began spawning corrupted creatures from other dimensions.

Heroes known as **Wardens** defend surviving settlements by channeling ancient tower spirits.

Inspirations:

* Metin2 mystical corruption portals
* RuneScape fantasy medieval tone
* Light-hearted but epic atmosphere

---

# 4. VISUAL STYLE

Art Direction:

* Top-down 2D perspective
* Pixel-art characters
* Cute/chibi proportions
* Smooth animations
* Bright fantasy palette
* Stylized monsters (not realistic)
* Clear readability for combat

References:

* Children of Morta
* Soul Knight
* Forager
* Pixel MMORPG aesthetics

---

# 5. PLAYER SYSTEM

Player controls a Hero with:

## Attributes

* Strength → tower damage bonus
* Intelligence → ability power
* Agility → attack speed & cooldown
* Vitality → HP & regeneration
* Luck → upgrade rarity chance

## Combat

* Auto basic attack
* Active skills (cooldowns)
* Movement in real time

---

# 6. TOWER / UNIT SYSTEM

Players deploy class-based towers:

### Defender

* High HP
* Blocks enemies
* Taunt abilities

### Archer

* Long range DPS
* Critical hits
* Multi-shot upgrades

### Mage

* Area damage
* Elemental effects

### Healer

* Regeneration aura
* Buff allies

Towers can:

* be repositioned
* receive equipment
* evolve during runs

---

# 7. ROGUELITE PROGRESSION

During gameplay, player receives randomized upgrades:

Examples:

* +2 projectiles
* Fire damage conversion
* Poison stacking
* Chain lightning attacks
* Summoned spirits
* Tower duplication
* Attack speed scaling

Upgrades must allow **build synergies**.

Example builds:

* Poison Swarm
* Lightning Chain
* Summoner Army
* Critical Archer Build
* Immortal Defense Wall

---

# 8. META PROGRESSION

Persistent progression between runs:

* Global Skill Tree
* Hero unlocks
* New tower classes
* Permanent stat bonuses
* New abilities
* Equipment unlock pool

Currency earned even on failed runs.

---

# 9. ENEMY SYSTEM

Enemies spawn in waves:

Types:

* melee swarm
* ranged attackers
* armored units
* fast runners
* elite enemies
* bosses

Boss mechanics:

* area attacks
* summoning
* phase transitions

---

# 10. MAP DESIGN

Maps contain:

* enemy paths
* deploy zones
* resource drops
* environmental modifiers
* random events

Optional procedural generation preferred.

---

# 11. GAME SYSTEMS ARCHITECTURE

Target architecture:

Frontend:

* HTML5 Canvas or WebGL
* Phaser / PixiJS recommended

Backend:

* Node.js authoritative server
* Multiplayer-ready architecture
* WebSocket communication

Core systems required:

* Entity Component System (ECS)
* Wave Manager
* Upgrade Generator
* Combat Engine
* Pathfinding
* Skill System
* Save/Progression System

---

# 12. MULTIPLAYER (OPTIONAL EXPANSION)

Cooperative defense mode:

* 2–4 players
* shared waves
* individual builds
* synchronized progression

Server controls:

* enemy spawning
* damage validation
* upgrade seeds

---

# 13. TECHNICAL REQUIREMENTS

Game must support:

* deterministic combat logic
* scalable wave spawning
* modular ability system
* upgrade injection system
* easy content expansion

Avoid hardcoded logic.

All gameplay elements should be data-driven.

---

# 14. INITIAL MVP FEATURES

Implement first:

* 1 hero
* 3 tower types
* 10 upgrades
* 5 enemy types
* 1 boss
* 1 map
* basic progression system

Focus on playable loop first.

---

# 15. DESIGN GOAL

The game should feel like:

> "RuneScape meets Roguelike Tower Defense with modern indie replayability."

High replay value is mandatory.

Each run must feel different.

---

END OF SPECIFICATION
