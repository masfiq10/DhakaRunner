export type CharacterPresetId = 'rafi' | 'nila' | 'kazi' | 'tania';

export type OutfitPatternId =
  | 'cricket_tiger'
  | 'street_hoodie'
  | 'jamdani_royal'
  | 'boishakh_festive';

export type HeadgearId =
  | 'none'
  | 'snapback_cap'
  | 'boishakhi_bandana'
  | 'cricket_helmet'
  | 'cyber_visor';

export type BackGearId =
  | 'none'
  | 'cricket_bat'
  | 'rickshaw_shield'
  | 'folk_dotara'
  | 'jet_pack';

export type HoverboardId =
  | 'rickshaw_neon'
  | 'bengal_tiger'
  | 'padma_gold'
  | 'ilish_silver';

export type BiomeId = 'auto' | 'mirpur_metro' | 'puran_dhaka' | 'padma_bridge';

export interface CharacterCustomization {
  presetId: CharacterPresetId;
  name: string;
  title: string;
  hometown: string;
  skinTone: string;
  outfitPattern: OutfitPatternId;
  primaryColor: string;
  secondaryColor: string;
  pantsColor: string;
  shoeColor: string;
  headgear: HeadgearId;
  backGear: BackGearId;
  hoverboard: HoverboardId;
}

export interface CharacterPresetInfo {
  id: CharacterPresetId;
  name: string;
  title: string;
  hometown: string;
  tagline: string;
  perkLabel: string;
  defaultConfig: CharacterCustomization;
}

export interface ActivePowerUps {
  chaBoost: number; // remaining seconds of invincible high-speed Cha Turbo
  magnet: number; // remaining seconds of coin magnet
  multiplier2x: number; // remaining seconds of 2x score
  hoverboard: number; // remaining seconds of active hoverboard shield
}

export interface MissionItem {
  id: string;
  title: string;
  target: number;
  current: number;
  rewardTaka: number;
  completed: boolean;
  type: 'coins' | 'distance' | 'jumps' | 'rolls' | 'trains_climbed' | 'hoverboard_uses';
}

export type GameModeState = 'menu' | 'playing' | 'paused' | 'studio' | 'gameover';

export interface RunTelemetry {
  score: number;
  highScore: number;
  takaCoins: number;
  totalBankTaka: number;
  distanceMeters: number;
  speedKmh: number;
  multiplier: number;
  comboCount: number;
  activeBiome: Exclude<BiomeId, 'auto'>;
  stumbleWarning: number; // 0 to 1: how close Traffic Sergeant Mama is chasing
  hoverboardCharges: number;
  powerUps: ActivePowerUps;
  crashReason?: string;
}

export const COLOR_SWATCHES = [
  { id: 'emerald', name: 'Padma Emerald', hex: '#006A4E' },
  { id: 'crimson', name: 'Bengal Crimson', hex: '#F42A41' },
  { id: 'gold', name: 'Sonargaon Gold', hex: '#F59E0B' },
  { id: 'cyan', name: 'Rickshaw Cyan', hex: '#06B6D4' },
  { id: 'indigo', name: 'Jamdani Indigo', hex: '#4F46E5' },
  { id: 'magenta', name: 'Boishakhi Rose', hex: '#EC4899' },
  { id: 'obsidian', name: 'Dhaka Obsidian', hex: '#1E293B' },
  { id: 'ivory', name: 'Muslin Ivory', hex: '#F8FAFC' },
];

export const CHARACTER_PRESETS: CharacterPresetInfo[] = [
  {
    id: 'rafi',
    name: 'Rafi',
    title: 'Mirpur Tape-Ball Striker',
    hometown: 'Mirpur-10, Dhaka',
    tagline: 'Dodges BRTC buses on his way to evening floodlight cricket.',
    perkLabel: '+15% Cha Turbo Duration',
    defaultConfig: {
      presetId: 'rafi',
      name: 'Rafi',
      title: 'Mirpur Tape-Ball Striker',
      hometown: 'Mirpur-10, Dhaka',
      skinTone: '#C68642',
      outfitPattern: 'cricket_tiger',
      primaryColor: '#006A4E',
      secondaryColor: '#F42A41',
      pantsColor: '#0F172A',
      shoeColor: '#F42A41',
      headgear: 'snapback_cap',
      backGear: 'cricket_bat',
      hoverboard: 'rickshaw_neon',
    },
  },
  {
    id: 'nila',
    name: 'Nila',
    title: 'Dhanmondi Cyber Artist',
    hometown: 'Dhanmondi Lake, Dhaka',
    tagline: 'Paints neon rickshaw murals and builds custom electric hover-decks.',
    perkLabel: '+20% Hoverboard Shield Time',
    defaultConfig: {
      presetId: 'nila',
      name: 'Nila',
      title: 'Dhanmondi Cyber Artist',
      hometown: 'Dhanmondi Lake, Dhaka',
      skinTone: '#D99B66',
      outfitPattern: 'street_hoodie',
      primaryColor: '#06B6D4',
      secondaryColor: '#EC4899',
      pantsColor: '#1E293B',
      shoeColor: '#06B6D4',
      headgear: 'cyber_visor',
      backGear: 'rickshaw_shield',
      hoverboard: 'ilish_silver',
    },
  },
  {
    id: 'kazi',
    name: 'Kazi',
    title: 'Puran Dhaka Speedster',
    hometown: 'Lalbagh, Old Dhaka',
    tagline: 'Parkour master across narrow rooftops and festive Sadarghat lanes.',
    perkLabel: '+20% Chumbok Magnet Range',
    defaultConfig: {
      presetId: 'kazi',
      name: 'Kazi',
      title: 'Puran Dhaka Speedster',
      hometown: 'Lalbagh, Old Dhaka',
      skinTone: '#B8763E',
      outfitPattern: 'jamdani_royal',
      primaryColor: '#F59E0B',
      secondaryColor: '#4F46E5',
      pantsColor: '#F8FAFC',
      shoeColor: '#F59E0B',
      headgear: 'boishakhi_bandana',
      backGear: 'folk_dotara',
      hoverboard: 'padma_gold',
    },
  },
  {
    id: 'tania',
    name: 'Tania',
    title: 'Royal Bengal Sprinter',
    hometown: 'Uttara Sector 4, Dhaka',
    tagline: 'Outruns the Metro Rail from Uttara North to Motijheel.',
    perkLabel: 'Starts every run with 2x Combo',
    defaultConfig: {
      presetId: 'tania',
      name: 'Tania',
      title: 'Royal Bengal Sprinter',
      hometown: 'Uttara Sector 4, Dhaka',
      skinTone: '#CD8C52',
      outfitPattern: 'boishakh_festive',
      primaryColor: '#F42A41',
      secondaryColor: '#F59E0B',
      pantsColor: '#0F172A',
      shoeColor: '#F59E0B',
      headgear: 'cricket_helmet',
      backGear: 'jet_pack',
      hoverboard: 'bengal_tiger',
    },
  },
];
