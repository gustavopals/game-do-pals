export type Locale = "pt" | "en";

export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_STORAGE_KEY = "pals_defence_locale";

type Dictionary = Record<string, string>;

const DICTIONARY: Record<Locale, Dictionary> = {
  pt: {
    menu_status_default: "Selecione Start Run para entrar na defesa.",
    menu_title: "Pals Defence",
    menu_subtitle: "Wardens rise against the shattered rift",
    menu_lore: "Fortaleça sua build, segure as rotas e sobreviva as fases do Behemoth.",
    menu_start_run: "Start Run",
    difficulty_title: "Select Difficulty",
    difficulty_lore: "Cada dificuldade cria uma sala dedicada no servidor.",
    difficulty_easy_desc: "Ritmo mais acessivel e menor pressao de chefes.",
    difficulty_normal_desc: "Experiencia padrao do Pals Defence.",
    difficulty_hard_desc: "Mais dano, mais summons e decisoes mais exigentes.",
    back: "Back",
    connecting_title: "Connecting",
    connecting_status: "Conectando ao servidor...",
    connecting_lore: "Sincronizando seed, mapa e estado da run...",
    connecting_difficulty: "Dificuldade: {difficulty}",
    run_end_title: "Run Ended",
    run_end_status: "Status: {status}",
    run_end_wave: "Wave: {wave}",
    run_end_gold: "Gold: {gold}",
    run_end_essence: "Essence: {essence}",
    play_again: "Play Again",
    main_menu: "Main Menu",
    downed_hint: "Pals Defence | DOWNED: {seconds}s para sangrar. Aproximacao de aliado revive.",
    dead_hint: "Pals Defence | Hero defeated. Aguarde o fim da run ou reset.",
    control_hint:
      "Pals Defence | Tower [1][2][3] {tower} | Skill [Q] Arcane Bolt [E] Aether Pulse | Click slot to place tower",
    hud_line_one:
      "Difficulty {difficulty} | Wave {wave}/{totalWaves} | Base {baseHp}/{baseMaxHp} | Enemies {enemies}{boss}",
    hud_state: "State {state} | HP {hp}/{maxHp} | Gold {gold} | Lv {level} | XP {xp}/{nextXp} | Towers {towers}/{maxTowers}",
    boss_phase: " | Boss Phase {phase}",
    downed_progress: "Downed Timer {seconds}s | Revive {progress}%",
    hero_state_alive: "ALIVE",
    hero_state_downed: "DOWNED",
    hero_state_dead: "DEAD",
    difficulty_easy: "EASY",
    difficulty_normal: "NORMAL",
    difficulty_hard: "HARD",
    language_button: "EN",
    choose_upgrade_title: "Runic Blessing",
    choose_upgrade_subtitle: "Choose one power to shape this run.",
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
    play_again: "Play Again",
    main_menu: "Main Menu",
    downed_hint: "Pals Defence | DOWNED: {seconds}s to bleed out. Ally proximity revives.",
    dead_hint: "Pals Defence | Hero defeated. Wait for run reset or finish.",
    control_hint:
      "Pals Defence | Tower [1][2][3] {tower} | Skill [Q] Arcane Bolt [E] Aether Pulse | Click a slot to place tower",
    hud_line_one:
      "Difficulty {difficulty} | Wave {wave}/{totalWaves} | Base {baseHp}/{baseMaxHp} | Enemies {enemies}{boss}",
    hud_state: "State {state} | HP {hp}/{maxHp} | Gold {gold} | Lv {level} | XP {xp}/{nextXp} | Towers {towers}/{maxTowers}",
    boss_phase: " | Boss Phase {phase}",
    downed_progress: "Downed Timer {seconds}s | Revive {progress}%",
    hero_state_alive: "ALIVE",
    hero_state_downed: "DOWNED",
    hero_state_dead: "DEAD",
    difficulty_easy: "EASY",
    difficulty_normal: "NORMAL",
    difficulty_hard: "HARD",
    language_button: "PT",
    choose_upgrade_title: "Runic Blessing",
    choose_upgrade_subtitle: "Choose one power to shape this run.",
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
