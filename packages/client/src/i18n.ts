export type Locale = "pt" | "en";

export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_STORAGE_KEY = "pals_defence_locale";

type Dictionary = Record<string, string>;
type TextPair = { name: string; description: string };

const DICTIONARY: Record<Locale, Dictionary> = {
  pt: {
    menu_status_default: "Selecione Iniciar Run para entrar na defesa.",
    menu_title: "Pals Defence",
    menu_subtitle: "Wardens sobem contra a fratura estilhacada",
    menu_lore: "Fortaleça sua build, segure as rotas e sobreviva as fases do Behemoth.",
    menu_start_run: "Iniciar Run",
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
    run_end_wave: "Wave: {wave}",
    run_end_gold: "Ouro: {gold}",
    run_end_essence: "Essencia: {essence}",
    run_status_won: "VITORIA",
    run_status_lost: "DERROTA",
    run_status_unknown: "DESCONHECIDO",
    play_again: "Jogar Novamente",
    main_menu: "Menu Principal",
    downed_hint: "Pals Defence | DOWNED: {seconds}s para sangrar. Aproximacao de aliado revive.",
    dead_hint: "Pals Defence | Heroi derrotado. Aguarde o fim da run ou reset.",
    control_hint: "Pals Defence | Torre [1][2][3] {tower} | Skill [Q] {skillQ} [E] {skillE} | Clique no slot para colocar torre",
    hud_line_one:
      "Dificuldade {difficulty} | Wave {wave}/{totalWaves} | Base {baseHp}/{baseMaxHp} | Inimigos {enemies}{boss}",
    hud_state: "Estado {state} | HP {hp}/{maxHp} | Ouro {gold} | Lv {level} | XP {xp}/{nextXp} | Torres {towers}/{maxTowers}",
    boss_phase: " | Fase Boss {phase}",
    downed_progress: "Timer DOWNED {seconds}s | Revive {progress}%",
    hero_state_alive: "VIVO",
    hero_state_downed: "DOWNED",
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
    control_hint: "Pals Defence | Tower [1][2][3] {tower} | Skill [Q] {skillQ} [E] {skillE} | Click a slot to place tower",
    hud_line_one:
      "Difficulty {difficulty} | Wave {wave}/{totalWaves} | Base {baseHp}/{baseMaxHp} | Enemies {enemies}{boss}",
    hud_state: "State {state} | HP {hp}/{maxHp} | Gold {gold} | Lv {level} | XP {xp}/{nextXp} | Towers {towers}/{maxTowers}",
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
  },
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
