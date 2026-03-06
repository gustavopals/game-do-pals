export type Locale = "pt" | "en";

export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_STORAGE_KEY = "pals_defence_locale";

type Dictionary = Record<string, string>;
type TextPair = { name: string; description: string };

const DICTIONARY: Record<Locale, Dictionary> = {
  pt: {
    menu_status_default: "Selecione Iniciar Run para entrar na defesa.",
    menu_title: "Pals Defence",
    menu_subtitle: "Os Wardens se erguem contra a fenda estilhacada",
    menu_lore: "Fortaleça sua build, segure as rotas e sobreviva as fases do Behemoth.",
    menu_start_run: "Iniciar Partida",
    map_select_title: "Selecionar Mapa",
    map_wardens_field_name: "Wardens Field",
    map_wardens_field_desc: "Duas rotas convergem perto da base; cobertura central e decisao rapida.",
    map_wardens_field_paths: "2 rotas",
    map_fracture_crossroads_name: "Fracture Crossroads",
    map_fracture_crossroads_desc:
      "Tres rotas serpenteando em alturas diferentes, com pressao constante no fim.",
    map_fracture_crossroads_paths: "3 rotas",
    room_mode_label: "Modo da sala: {mode}",
    room_mode_public: "Publica",
    room_mode_private_create: "Criar Privada",
    room_mode_private_join: "Entrar por Codigo",
    room_mode_join_detail: "Entrar por Codigo ({code})",
    room_code_prompt: "Digite o codigo da sala privada:",
    room_code_invalid: "Codigo de sala invalido.",
    difficulty_title: "Selecionar Dificuldade",
    difficulty_lore: "Cada dificuldade cria uma sala dedicada no servidor.",
    difficulty_easy_desc: "Ritmo mais acessivel e menor pressao de chefes.",
    difficulty_normal_desc: "Experiencia padrao do Pals Defence.",
    difficulty_hard_desc: "Mais dano, mais summons e decisoes mais exigentes.",
    back: "Voltar",
    connecting_title: "Conectando",
    connecting_status: "Conectando ao servidor...",
    connecting_mode: "Modo: {mode}",
    connecting_mode_with_code: "Modo: {mode} | Sala {code}",
    connecting_lore: "Sincronizando seed, mapa e estado da run...",
    connecting_difficulty: "Dificuldade: {difficulty}",
    run_end_title: "Run Encerrada",
    run_end_status: "Status: {status}",
    run_end_wave: "Onda: {wave}",
    run_end_gold: "Ouro: {gold}",
    run_end_essence: "Essencia: {essence}",
    run_status_won: "VITORIA",
    run_status_lost: "DERROTA",
    run_status_unknown: "DESCONHECIDO",
    play_again: "Jogar Novamente",
    main_menu: "Menu Principal",
    downed_hint: "Pals Defence | CAIDO: {seconds}s para sangrar. Aliado precisa aproximar e segurar V.",
    dead_hint: "Pals Defence | Heroi derrotado. Aguarde o fim da run ou reset.",
    upgrade_pause_hint: "Pals Defence | Run pausada: escolha sua bencao runica.",
    intermission_hint:
      "Pals Defence | Preparacao {seconds}s para Onda {wave} | [SPACE] iniciar agora (+{bonus} ouro)",
    control_hint:
      "Pals Defence | Torre [1][2][3] {tower} | Habilidade [Q] {skillQ} [E] {skillE} | Clique no slot para colocar torre | [R] reroll | {move} | {upgrade} | {revive}",
    move_mode_off: "Mover Torre [F] OFF",
    move_mode_on: "Mover Torre [F] ON (clique torre > slot, custo {cost})",
    move_mode_selected: "Mover Torre [F] ON (slot alvo, custo {cost})",
    upgrade_tower_unselected: "Upgrade Torre [G] (selecione uma torre sua)",
    upgrade_tower_ready: "Upgrade Torre [G] Lv {level}->{nextLevel} (custo {cost})",
    upgrade_tower_no_gold: "Upgrade Torre [G] Lv {level}->{nextLevel} (sem ouro {cost})",
    upgrade_tower_max: "Upgrade Torre [G] MAX",
    private_lobby_host_hint:
      "Sala privada {code} | Jogadores {players} | Voce e o host: [SPACE] inicia a partida.",
    private_lobby_guest_hint:
      "Sala privada {code} | Jogadores {players} | Aguardando o host iniciar a partida.",
    private_lobby_start_button: "Iniciar Partida [SPACE]",
    private_lobby_start_info: "Sala {code} | Jogadores {players}",
    revive_hold_hint: "Reviver [V] segurar",
    hud_line_one:
      "Dificuldade {difficulty} | Onda {wave}/{totalWaves} | Fase {waveState}{pause} | Base {baseHp}/{baseMaxHp} | Inimigos {enemies}{boss}",
    upgrade_pause_hud: " | PAUSADO UPGRADE",
    hud_state:
      "Estado {state} | HP {hp}/{maxHp} | Ouro {gold} | Rerolls {rerolls} | Lv {level} | XP {xp}/{nextXp} | Torres {towers}/{maxTowers}",
    wave_state_spawning: "combate ({remaining} para spawn)",
    wave_state_intermission: "preparo ({seconds}s)",
    wave_state_waiting_host: "aguardando host",
    wave_state_completed: "encerrada",
    boss_phase: " | Fase do Chefe {phase}",
    downed_progress: "Tempo CAIDO {seconds}s | Revive {progress}%",
    objective_hud_line:
      "Evento Onda {wave} | {name} | {status} {progress}/{target} | Recompensa +{reward} ouro",
    objective_kind_slayer: "EXPURGO",
    objective_kind_survivor: "SOBREVIVER",
    objective_kind_bulwark: "BASTIAO",
    objective_status_active: "ATIVO",
    objective_status_completed: "CONCLUIDO",
    objective_status_failed: "FALHOU",
    hero_state_alive: "VIVO",
    hero_state_downed: "CAIDO",
    hero_state_dead: "MORTO",
    hero_not_joined: "Heroi ainda nao entrou",
    skill_ready: "PRONTO",
    difficulty_easy: "FACIL",
    difficulty_normal: "NORMAL",
    difficulty_hard: "DIFICIL",
    tower_defender: "DEFENSOR",
    tower_archer: "ARQUEIRO",
    tower_mage: "MAGO",
    enemy_swarm: "ENXAME",
    enemy_ranged: "ARQUEIRO DA FENDA",
    enemy_armored: "GUARDA OBSIDIANA",
    enemy_runner: "CORREDOR BLINK",
    enemy_elite: "CAMPEAO DA FENDA",
    enemy_boss: "BEHEMOTH",
    context_panel_title: "Painel Tatico",
    context_panel_empty: "Passe o cursor sobre heroi, torre ou inimigo para ver detalhes.",
    context_legend_title: "Efeitos:",
    effect_poison: "Veneno",
    effect_poison_desc: "Dano periodico com stacks.",
    effect_shock: "Choque",
    effect_shock_desc: "Pode disparar chain lightning.",
    effect_empowered: "Empoderado",
    effect_empowered_desc: "Bonus temporario de elite.",
    effect_downed: "Caido",
    effect_downed_desc: "Precisa de revive manual (V).",
    context_enemy_title: "Inimigo: {name}",
    context_tower_title: "Torre: {name}",
    context_hero_title: "Heroi: {name}",
    context_hp_line: "HP {hp}/{maxHp}",
    context_speed_line: "Velocidade {speed}",
    context_boss_phase_line: "Fase do chefe {phase}",
    context_poison_line: "Veneno x{stacks} ({seconds}s)",
    context_shock_line: "Choque ({seconds}s)",
    context_empowered_line: "Empoderado ({seconds}s)",
    context_no_effects: "Sem efeitos ativos.",
    context_owner_self: "VOCE",
    context_owner_ally: "ALIADO",
    context_owner_line: "Dono: {owner}",
    context_damage_line: "Dano {damage}",
    context_range_line: "Alcance {range}",
    context_cooldown_line: "Cooldown {cooldown}s",
    context_tower_selected_upgrade: "Selecionada para upgrade.",
    context_tower_upgrade_hint: "Upgrade [G] -> Lv {nextLevel} (custo {cost} ouro)",
    context_tower_upgrade_max: "Torre no nivel maximo.",
    context_tower_selected_move: "Selecionada para mover.",
    context_state_line: "Estado: {state}",
    context_level_line: "Nivel: {level}",
    context_downed_line: "Sangra em {seconds}s | Revive {progress}%",
    context_reviving_line: "Canalizando revive.",
    onboarding_title: "Onboarding Tatico",
    onboarding_progress: "Progresso avancado: {done}/{total}",
    onboarding_next: "Proximo: {step}",
    onboarding_complete: "Controles avancados dominados.",
    onboarding_step_move: "Reposicionar torre [F] + clique",
    onboarding_step_reroll: "Reroll de bencao [R]",
    onboarding_step_wave: "Chamar onda cedo [SPACE]",
    onboarding_move_wait: "Coloque ao menos 1 torre para treinar reposicionamento.",
    onboarding_reroll_wait: "Ganhe token de reroll em upgrades para usar [R].",
    onboarding_revive_tip: "Co-op: segure [V] perto de aliado CAIDO para reviver.",
    onboarding_revive_active: "Aliado CAIDO detectado: aproxime e segure [V].",
    audio_on: "SFX: ON",
    audio_off: "SFX: OFF",
    music_on: "MUS: ON",
    music_off: "MUS: OFF",
    language_button: "EN",
    settings_button: "Configuracoes",
    settings_title: "Configuracoes",
    settings_volume_sfx: "Volume SFX",
    settings_volume_music: "Volume Musica",
    settings_language: "Idioma",
    settings_keybinds_title: "Controles",
    settings_keybind_move: "WASD — Mover heroi",
    settings_keybind_skill_q: "Q — Arcane Bolt",
    settings_keybind_skill_e: "E — Aether Pulse",
    settings_keybind_towers: "1 / 2 / 3 — Torres (Def / Arq / Mago)",
    settings_keybind_move_tower: "F — Modo mover torre",
    settings_keybind_upgrade_tower: "G — Upgrade da torre selecionada",
    settings_keybind_wave: "SPACE — Chamar proxima onda",
    settings_keybind_revive: "V — Reviver aliado (segurar)",
    settings_keybind_reroll: "R — Reroll de upgrade",
    settings_keybind_place: "Clique no slot — Colocar torre",
    choose_upgrade_title: "Bencao Runica",
    choose_upgrade_subtitle: "Escolha um poder para moldar esta run.",
    rarity_common: "comum",
    rarity_rare: "raro",
    rarity_epic: "epico",
    reroll_button: "Reroll (R)",
    reroll_tokens: "Tokens de reroll: {count}",
    wave_call_button: "Chamar Proxima Onda [SPACE]",
    wave_call_info: "Onda {wave} em {seconds}s | Bonus imediato +{bonus} ouro",
    error_connection_closed: "Conexao com o servidor encerrada.",
    error_connection_failed: "Falha ao conectar ao servidor.",
    error_malformed_server_message: "Mensagem invalida recebida do servidor.",
    error_invalid_json_payload: "Payload JSON invalido.",
    error_invalid_message_shape: "Formato de mensagem invalido.",
    error_join_required: "Envie join antes das acoes de jogo.",
    error_player_session_not_found: "Sessao do jogador nao encontrada.",
    error_invalid_player_id: "playerId invalido.",
    error_private_room_code_required: "Codigo da sala privada obrigatorio.",
    error_private_room_not_found: "Sala privada nao encontrada.",
  },
  en: {
    menu_status_default: "Select Start Run to begin defending.",
    menu_title: "Pals Defence",
    menu_subtitle: "Wardens rise against the shattered rift",
    menu_lore: "Shape your build, hold the lanes, and survive the Behemoth phases.",
    menu_start_run: "Start Run",
    map_select_title: "Select Map",
    map_wardens_field_name: "Wardens Field",
    map_wardens_field_desc: "Two lanes converge near base; central coverage matters most.",
    map_wardens_field_paths: "2 lanes",
    map_fracture_crossroads_name: "Fracture Crossroads",
    map_fracture_crossroads_desc:
      "Three lanes weaving across the arena with constant late defensive pressure.",
    map_fracture_crossroads_paths: "3 lanes",
    room_mode_label: "Room mode: {mode}",
    room_mode_public: "Public",
    room_mode_private_create: "Create Private",
    room_mode_private_join: "Join by Code",
    room_mode_join_detail: "Join by Code ({code})",
    room_code_prompt: "Enter the private room code:",
    room_code_invalid: "Invalid room code.",
    difficulty_title: "Select Difficulty",
    difficulty_lore: "Each difficulty creates a dedicated server room.",
    difficulty_easy_desc: "More forgiving pace and lower boss pressure.",
    difficulty_normal_desc: "Standard Pals Defence experience.",
    difficulty_hard_desc: "Higher damage, more summons, tougher decisions.",
    back: "Back",
    connecting_title: "Connecting",
    connecting_status: "Connecting to server...",
    connecting_mode: "Mode: {mode}",
    connecting_mode_with_code: "Mode: {mode} | Room {code}",
    connecting_lore: "Syncing seed, map and run state...",
    connecting_difficulty: "Difficulty: {difficulty}",
    run_end_title: "Run Ended",
    run_end_status: "Status: {status}",
    run_end_wave: "Wave: {wave}",
    run_end_gold: "Gold: {gold}",
    run_end_essence: "Essence: {essence}",
    run_status_won: "VICTORY",
    run_status_lost: "DEFEAT",
    run_status_unknown: "UNKNOWN",
    play_again: "Play Again",
    main_menu: "Main Menu",
    downed_hint: "Pals Defence | DOWNED: {seconds}s to bleed out. Ally must stay close and hold V.",
    dead_hint: "Pals Defence | Hero defeated. Wait for run reset or finish.",
    upgrade_pause_hint: "Pals Defence | Run paused: choose your runic blessing.",
    intermission_hint:
      "Pals Defence | Prep {seconds}s for Wave {wave} | [SPACE] start now (+{bonus} gold)",
    control_hint:
      "Pals Defence | Tower [1][2][3] {tower} | Skill [Q] {skillQ} [E] {skillE} | Click a slot to place tower | [R] reroll | {move} | {upgrade} | {revive}",
    move_mode_off: "Move Tower [F] OFF",
    move_mode_on: "Move Tower [F] ON (click tower > slot, cost {cost})",
    move_mode_selected: "Move Tower [F] ON (target a slot, cost {cost})",
    upgrade_tower_unselected: "Upgrade Tower [G] (select one of your towers)",
    upgrade_tower_ready: "Upgrade Tower [G] Lv {level}->{nextLevel} (cost {cost})",
    upgrade_tower_no_gold: "Upgrade Tower [G] Lv {level}->{nextLevel} (not enough gold {cost})",
    upgrade_tower_max: "Upgrade Tower [G] MAX",
    private_lobby_host_hint:
      "Private room {code} | Players {players} | You are host: press [SPACE] to start.",
    private_lobby_guest_hint:
      "Private room {code} | Players {players} | Waiting for host to start.",
    private_lobby_start_button: "Start Match [SPACE]",
    private_lobby_start_info: "Room {code} | Players {players}",
    revive_hold_hint: "Revive [V] hold",
    hud_line_one:
      "Difficulty {difficulty} | Wave {wave}/{totalWaves} | Phase {waveState}{pause} | Base {baseHp}/{baseMaxHp} | Enemies {enemies}{boss}",
    upgrade_pause_hud: " | UPGRADE PAUSED",
    hud_state:
      "State {state} | HP {hp}/{maxHp} | Gold {gold} | Rerolls {rerolls} | Lv {level} | XP {xp}/{nextXp} | Towers {towers}/{maxTowers}",
    wave_state_spawning: "combat ({remaining} left)",
    wave_state_intermission: "prep ({seconds}s)",
    wave_state_waiting_host: "waiting host",
    wave_state_completed: "cleared",
    boss_phase: " | Boss Phase {phase}",
    downed_progress: "Downed Timer {seconds}s | Revive {progress}%",
    objective_hud_line:
      "Wave {wave} Event | {name} | {status} {progress}/{target} | Reward +{reward} gold",
    objective_kind_slayer: "PURGE",
    objective_kind_survivor: "SURVIVE",
    objective_kind_bulwark: "BASTION",
    objective_status_active: "ACTIVE",
    objective_status_completed: "COMPLETED",
    objective_status_failed: "FAILED",
    hero_state_alive: "ALIVE",
    hero_state_downed: "DOWNED",
    hero_state_dead: "DEAD",
    hero_not_joined: "Hero not joined yet",
    skill_ready: "READY",
    difficulty_easy: "EASY",
    difficulty_normal: "NORMAL",
    difficulty_hard: "HARD",
    tower_defender: "DEFENDER",
    tower_archer: "ARCHER",
    tower_mage: "MAGE",
    enemy_swarm: "SWARM",
    enemy_ranged: "RIFT ARCHER",
    enemy_armored: "OBSIDIAN GUARD",
    enemy_runner: "BLINK RUNNER",
    enemy_elite: "FRACTURE CHAMPION",
    enemy_boss: "BEHEMOTH",
    context_panel_title: "Tactical Panel",
    context_panel_empty: "Hover hero, tower, or enemy to inspect details.",
    context_legend_title: "Effects:",
    effect_poison: "Poison",
    effect_poison_desc: "Damage over time with stacks.",
    effect_shock: "Shock",
    effect_shock_desc: "May trigger chain lightning.",
    effect_empowered: "Empowered",
    effect_empowered_desc: "Temporary elite bonus.",
    effect_downed: "Downed",
    effect_downed_desc: "Needs manual revive (V).",
    context_enemy_title: "Enemy: {name}",
    context_tower_title: "Tower: {name}",
    context_hero_title: "Hero: {name}",
    context_hp_line: "HP {hp}/{maxHp}",
    context_speed_line: "Speed {speed}",
    context_boss_phase_line: "Boss phase {phase}",
    context_poison_line: "Poison x{stacks} ({seconds}s)",
    context_shock_line: "Shock ({seconds}s)",
    context_empowered_line: "Empowered ({seconds}s)",
    context_no_effects: "No active effects.",
    context_owner_self: "YOU",
    context_owner_ally: "ALLY",
    context_owner_line: "Owner: {owner}",
    context_damage_line: "Damage {damage}",
    context_range_line: "Range {range}",
    context_cooldown_line: "Cooldown {cooldown}s",
    context_tower_selected_upgrade: "Selected for upgrade.",
    context_tower_upgrade_hint: "Upgrade [G] -> Lv {nextLevel} (cost {cost} gold)",
    context_tower_upgrade_max: "Tower is at max level.",
    context_tower_selected_move: "Selected for relocation.",
    context_state_line: "State: {state}",
    context_level_line: "Level: {level}",
    context_downed_line: "Bleeds out in {seconds}s | Revive {progress}%",
    context_reviving_line: "Channeling revive.",
    onboarding_title: "Tactical Onboarding",
    onboarding_progress: "Advanced progress: {done}/{total}",
    onboarding_next: "Next: {step}",
    onboarding_complete: "Advanced controls mastered.",
    onboarding_step_move: "Relocate tower [F] + click",
    onboarding_step_reroll: "Reroll blessing [R]",
    onboarding_step_wave: "Call wave early [SPACE]",
    onboarding_move_wait: "Place at least 1 tower first to practice relocation.",
    onboarding_reroll_wait: "Earn a reroll token from upgrades to use [R].",
    onboarding_revive_tip: "Co-op: hold [V] near a DOWNED ally to revive.",
    onboarding_revive_active: "DOWNED ally detected: move close and hold [V].",
    audio_on: "SFX: ON",
    audio_off: "SFX: OFF",
    music_on: "MUS: ON",
    music_off: "MUS: OFF",
    language_button: "PT",
    settings_button: "Settings",
    settings_title: "Settings",
    settings_volume_sfx: "SFX Volume",
    settings_volume_music: "Music Volume",
    settings_language: "Language",
    settings_keybinds_title: "Keybinds",
    settings_keybind_move: "WASD — Move hero",
    settings_keybind_skill_q: "Q — Arcane Bolt",
    settings_keybind_skill_e: "E — Aether Pulse",
    settings_keybind_towers: "1 / 2 / 3 — Towers (Def / Arc / Mage)",
    settings_keybind_move_tower: "F — Move tower mode",
    settings_keybind_upgrade_tower: "G — Upgrade selected tower",
    settings_keybind_wave: "SPACE — Call next wave",
    settings_keybind_revive: "V — Revive ally (hold)",
    settings_keybind_reroll: "R — Reroll upgrade",
    settings_keybind_place: "Click on slot — Place tower",
    choose_upgrade_title: "Runic Blessing",
    choose_upgrade_subtitle: "Choose one power to shape this run.",
    rarity_common: "common",
    rarity_rare: "rare",
    rarity_epic: "epic",
    reroll_button: "Reroll (R)",
    reroll_tokens: "Reroll tokens: {count}",
    wave_call_button: "Call Next Wave [SPACE]",
    wave_call_info: "Wave {wave} in {seconds}s | Instant bonus +{bonus} gold",
    error_connection_closed: "Connection to server closed.",
    error_connection_failed: "Failed to connect to server.",
    error_malformed_server_message: "Received malformed server message.",
    error_invalid_json_payload: "Invalid JSON payload.",
    error_invalid_message_shape: "Invalid message shape.",
    error_join_required: "You must send join before game actions.",
    error_player_session_not_found: "Player session not found.",
    error_invalid_player_id: "Invalid playerId.",
    error_private_room_code_required: "Private room code is required.",
    error_private_room_not_found: "Private room not found.",
  },
};

const ERROR_MESSAGE_KEY_BY_NORMALIZED: Record<string, string> = {
  "connection to server closed.": "error_connection_closed",
  "failed to connect to server.": "error_connection_failed",
  "received malformed server message.": "error_malformed_server_message",
  "invalid json payload.": "error_invalid_json_payload",
  "invalid message shape.": "error_invalid_message_shape",
  "you must send join before game actions.": "error_join_required",
  "player session not found.": "error_player_session_not_found",
  "invalid playerid.": "error_invalid_player_id",
  "private room code is required.": "error_private_room_code_required",
  "private room not found.": "error_private_room_not_found",
};

const SKILL_TEXTS: Record<Locale, Record<string, TextPair>> = {
  pt: {
    arcaneBolt: {
      name: "Raio Arcano",
      description: "Dispara um projetil magico potente no alvo proximo ao cursor.",
    },
    aetherPulse: {
      name: "Pulso Aeter",
      description: "Dispara fragmentos energeticos em ate 4 inimigos proximos.",
    },
  },
  en: {
    arcaneBolt: {
      name: "Arcane Bolt",
      description: "Fires a powerful arcane projectile at a target near the cursor.",
    },
    aetherPulse: {
      name: "Aether Pulse",
      description: "Launches energy shards at up to 4 nearby enemies.",
    },
  },
};

const UPGRADE_TEXTS: Record<Locale, Record<string, TextPair>> = {
  pt: {
    iron_focus: { name: "Foco de Ferro", description: "+4 de dano do heroi." },
    long_step: { name: "Passo Longo", description: "+30 de velocidade de movimento." },
    tower_forging: { name: "Forja de Torres", description: "Torres causam +18% de dano." },
    rapid_bolts: { name: "Setas Rapidas", description: "Torres atacam 15% mais rapido." },
    extended_sight: { name: "Visao Estendida", description: "+30 de alcance de ataque do heroi." },
    reinforced_slots: { name: "Slots Reforcados", description: "+1 no limite de torres." },
    greedy_aura: { name: "Aura Gananciosa", description: "+20% de ouro recebido." },
    second_wind: { name: "Segundo Folego", description: "Recupera 25 de vida." },
    monolith_patch: { name: "Remendo do Monolito", description: "Recupera 15 de vida da base." },
    tactical_reroll: {
      name: "Reroll Tatico",
      description: "+1 token de reroll para upgrades futuros.",
    },
    keen_eyes: { name: "Olhos Afiados", description: "+8% de chance de critico." },
    rending_focus: { name: "Foco Cortante", description: "+35% de dano critico." },
    venomous_runes: { name: "Runas Venenosas", description: "+30% de poder de veneno." },
    storm_conductor: {
      name: "Condutor da Tempestade",
      description: "+25% de dano de chain lightning.",
    },
  },
  en: {
    iron_focus: { name: "Iron Focus", description: "+4 hero damage." },
    long_step: { name: "Long Step", description: "+30 movement speed." },
    tower_forging: { name: "Tower Forging", description: "Towers deal +18% damage." },
    rapid_bolts: { name: "Rapid Bolts", description: "Towers attack 15% faster." },
    extended_sight: { name: "Extended Sight", description: "+30 hero attack range." },
    reinforced_slots: { name: "Reinforced Slots", description: "+1 tower cap." },
    greedy_aura: { name: "Greedy Aura", description: "+20% gold gained." },
    second_wind: { name: "Second Wind", description: "Restore 25 HP." },
    monolith_patch: { name: "Monolith Patch", description: "Restore 15 base HP." },
    tactical_reroll: {
      name: "Tactical Reroll",
      description: "+1 reroll token for future upgrades.",
    },
    keen_eyes: { name: "Keen Eyes", description: "+8% critical chance." },
    rending_focus: { name: "Rending Focus", description: "+35% critical damage." },
    venomous_runes: { name: "Venomous Runes", description: "+30% poison power." },
    storm_conductor: {
      name: "Storm Conductor",
      description: "+25% chain lightning damage.",
    },
  },
};

export function loadLocale(): Locale {
  const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw === "pt" || raw === "en") {
    return raw;
  }
  return DEFAULT_LOCALE;
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function toggleLocale(locale: Locale): Locale {
  return locale === "pt" ? "en" : "pt";
}

export function tr(locale: Locale, key: string, vars: Record<string, string | number> = {}): string {
  const template = DICTIONARY[locale][key] ?? DICTIONARY.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => `${vars[token] ?? ""}`);
}

export function trErrorMessage(locale: Locale, message: string): string {
  const key = ERROR_MESSAGE_KEY_BY_NORMALIZED[normalizeErrorMessage(message)];
  if (!key) {
    return message;
  }
  return tr(locale, key);
}

export function isConnectionErrorMessage(message: string): boolean {
  const normalized = normalizeErrorMessage(message);
  return (
    normalized === "connection to server closed." ||
    normalized === "failed to connect to server." ||
    normalized.includes("failed to connect") ||
    normalized.includes("connection")
  );
}

export function trSkillName(locale: Locale, skillId: string, fallback: string): string {
  return SKILL_TEXTS[locale][skillId]?.name ?? SKILL_TEXTS.en[skillId]?.name ?? fallback;
}

export function trSkillDescription(locale: Locale, skillId: string, fallback: string): string {
  return SKILL_TEXTS[locale][skillId]?.description ?? SKILL_TEXTS.en[skillId]?.description ?? fallback;
}

export function trUpgradeName(locale: Locale, upgradeId: string, fallback: string): string {
  return UPGRADE_TEXTS[locale][upgradeId]?.name ?? UPGRADE_TEXTS.en[upgradeId]?.name ?? fallback;
}

export function trUpgradeDescription(locale: Locale, upgradeId: string, fallback: string): string {
  return UPGRADE_TEXTS[locale][upgradeId]?.description ?? UPGRADE_TEXTS.en[upgradeId]?.description ?? fallback;
}

function normalizeErrorMessage(message: string): string {
  return message.trim().toLowerCase();
}
