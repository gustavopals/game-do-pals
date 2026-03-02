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
    difficulty_title: "Selecionar Dificuldade",
    difficulty_lore: "Cada dificuldade cria uma sala dedicada no servidor.",
    difficulty_easy_desc: "Ritmo mais acessivel e menor pressao de chefes.",
    difficulty_normal_desc: "Experiencia padrao do Pals Defence.",
    difficulty_hard_desc: "Mais dano, mais summons e decisoes mais exigentes.",
    back: "Voltar",
    connecting_title: "Conectando",
    connecting_status: "Conectando ao servidor...",
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
    downed_hint: "Pals Defence | CAIDO: {seconds}s para sangrar. Aproximacao de aliado revive.",
    dead_hint: "Pals Defence | Heroi derrotado. Aguarde o fim da run ou reset.",
    intermission_hint:
      "Pals Defence | Preparacao {seconds}s para Onda {wave} | [SPACE] iniciar agora (+{bonus} ouro)",
    control_hint:
      "Pals Defence | Torre [1][2][3] {tower} | Habilidade [Q] {skillQ} [E] {skillE} | Clique no slot para colocar torre | [R] reroll | {move}",
    move_mode_off: "Mover Torre [F] OFF",
    move_mode_on: "Mover Torre [F] ON (clique torre > slot, custo {cost})",
    move_mode_selected: "Mover Torre [F] ON (slot alvo, custo {cost})",
    hud_line_one:
      "Dificuldade {difficulty} | Onda {wave}/{totalWaves} | Fase {waveState} | Base {baseHp}/{baseMaxHp} | Inimigos {enemies}{boss}",
    hud_state:
      "Estado {state} | HP {hp}/{maxHp} | Ouro {gold} | Rerolls {rerolls} | Lv {level} | XP {xp}/{nextXp} | Torres {towers}/{maxTowers}",
    wave_state_spawning: "combate ({remaining} para spawn)",
    wave_state_intermission: "preparo ({seconds}s)",
    wave_state_completed: "encerrada",
    boss_phase: " | Fase do Chefe {phase}",
    downed_progress: "Tempo CAIDO {seconds}s | Revive {progress}%",
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
    language_button: "EN",
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
  },
  en: {
    menu_status_default: "Select Start Run to begin defending.",
    menu_title: "Pals Defence",
    menu_subtitle: "Wardens rise against the shattered rift",
    menu_lore: "Shape your build, hold the lanes, and survive the Behemoth phases.",
    menu_start_run: "Start Run",
    difficulty_title: "Select Difficulty",
    difficulty_lore: "Each difficulty creates a dedicated server room.",
    difficulty_easy_desc: "More forgiving pace and lower boss pressure.",
    difficulty_normal_desc: "Standard Pals Defence experience.",
    difficulty_hard_desc: "Higher damage, more summons, tougher decisions.",
    back: "Back",
    connecting_title: "Connecting",
    connecting_status: "Connecting to server...",
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
    downed_hint: "Pals Defence | DOWNED: {seconds}s to bleed out. Ally proximity revives.",
    dead_hint: "Pals Defence | Hero defeated. Wait for run reset or finish.",
    intermission_hint:
      "Pals Defence | Prep {seconds}s for Wave {wave} | [SPACE] start now (+{bonus} gold)",
    control_hint:
      "Pals Defence | Tower [1][2][3] {tower} | Skill [Q] {skillQ} [E] {skillE} | Click a slot to place tower | [R] reroll | {move}",
    move_mode_off: "Move Tower [F] OFF",
    move_mode_on: "Move Tower [F] ON (click tower > slot, cost {cost})",
    move_mode_selected: "Move Tower [F] ON (target a slot, cost {cost})",
    hud_line_one:
      "Difficulty {difficulty} | Wave {wave}/{totalWaves} | Phase {waveState} | Base {baseHp}/{baseMaxHp} | Enemies {enemies}{boss}",
    hud_state:
      "State {state} | HP {hp}/{maxHp} | Gold {gold} | Rerolls {rerolls} | Lv {level} | XP {xp}/{nextXp} | Towers {towers}/{maxTowers}",
    wave_state_spawning: "combat ({remaining} left)",
    wave_state_intermission: "prep ({seconds}s)",
    wave_state_completed: "cleared",
    boss_phase: " | Boss Phase {phase}",
    downed_progress: "Downed Timer {seconds}s | Revive {progress}%",
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
    language_button: "PT",
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
