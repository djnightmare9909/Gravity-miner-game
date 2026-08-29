import { BlockData, BlockType, BlockDef, GameState, BigNum } from './types';

export const BLOCK_DEF: Record<BlockType, BlockDef> = {
  dirt: { color: '#3f2a1d', hpMult: 0.5, yieldMult: 0.5 },
  stone: { color: '#52525B', hpMult: 1, yieldMult: 1 },
  coal: { color: '#18181b', ore: '#000000', hpMult: 2, yieldMult: 2 },
  iron: { color: '#d4d4d8', ore: '#f4f4f5', hpMult: 5, yieldMult: 4 },
  gold: { color: '#facc15', ore: '#fef08a', hpMult: 10, yieldMult: 7 },
  sapphire: { color: '#1e3a8a', ore: '#60a5fa', hpMult: 25, yieldMult: 15 },
  ruby: { color: '#7f1d1d', ore: '#f87171', hpMult: 50, yieldMult: 25 },
  emerald: { color: '#064e3b', ore: '#34d399', hpMult: 100, yieldMult: 45 },
  diamond_ore: { color: '#164e63', ore: '#cffafe', hpMult: 250, yieldMult: 100 },
  obsidian: { color: '#2e1065', hpMult: 1000, yieldMult: 350 },
  void: { color: '#000000', ore: '#171717', hpMult: 5000, yieldMult: 1500 },
};

function getRandomBlockType(stage: number): BlockType {
  const keys = Object.keys(BLOCK_DEF) as BlockType[];
  // At stage 1, peak is 0. At stage 200+, peak is max (10).
  const peak = Math.min(keys.length - 1, (stage - 1) / 15);
  // Variance - randomly sample nearby tiers
  const variance = (Math.random() + Math.random() + Math.random() - 1.5) * 4; 
  let idx = Math.round(peak + variance);
  idx = Math.max(0, Math.min(keys.length - 1, idx));
  return keys[idx];
}

export const BIG_ZERO: BigNum = { m: 0, e: 0 };

export function normalizeBigNum(m: number, e: number): BigNum {
  if (m === 0) return BIG_ZERO;
  const absM = Math.abs(m);
  const log10 = Math.floor(Math.log10(absM));
  const newM = m / Math.pow(10, log10);
  return { m: newM, e: e + log10 };
}

export function toBigNum(val: number | BigNum): BigNum {
  if (typeof val === 'object' && 'm' in val) return val;
  if (val === 0 || !isFinite(val as number)) return BIG_ZERO;
  return normalizeBigNum(val as number, 0);
}

export function addBigNum(a: BigNum, b: BigNum): BigNum {
  if (a.m === 0) return b;
  if (b.m === 0) return a;
  const diff = a.e - b.e;
  if (diff > 15) return a;
  if (diff < -15) return b;
  const newM = a.m + b.m * Math.pow(10, -diff);
  return normalizeBigNum(newM, a.e);
}

export function subBigNum(a: BigNum, b: BigNum): BigNum {
  if (b.m === 0) return a;
  if (a.m === 0) return BIG_ZERO;
  const diff = a.e - b.e;
  if (diff > 15) return a;
  if (diff < 0) return BIG_ZERO; 
  const newM = a.m - b.m * Math.pow(10, -diff);
  if (newM <= 0) return BIG_ZERO;
  return normalizeBigNum(newM, a.e);
}

export function mulBigNum(a: BigNum, b: number | BigNum): BigNum {
  const bBig = typeof b === 'number' ? toBigNum(b) : b;
  if (a.m === 0 || bBig.m === 0) return BIG_ZERO;
  return normalizeBigNum(a.m * bBig.m, a.e + bBig.e);
}

export function powBigNum(base: number, exponent: number): BigNum {
  if (base === 0) return BIG_ZERO;
  const log10 = exponent * Math.log10(Math.abs(base));
  const e = Math.floor(log10);
  const m = Math.pow(10, log10 - e);
  return { m: base < 0 && exponent % 2 !== 0 ? -m : m, e };
}

export function compareBigNum(a: BigNum, b: BigNum): number {
  if (a.m === 0 && b.m === 0) return 0;
  if (a.m === 0) return -1;
  if (b.m === 0) return 1;
  if (a.e > b.e) return 1;
  if (a.e < b.e) return -1;
  if (a.m > b.m) return 1;
  if (a.m < b.m) return -1;
  return 0;
}

export function formatNumber(num: number | BigNum): string {
  const b = typeof num === 'number' ? toBigNum(num) : num;
  if (b.m === 0) return "0";
  
  if (b.e < 3 && b.e >= 0) {
    return Math.floor(b.m * Math.pow(10, b.e)).toString();
  }
  if (b.e < 0) {
    return "0";
  }

  const exp = Math.floor(b.e / 3);
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "E", "Z", "Y"];
  
  let suffix = "";
  if (exp < suffixes.length) {
    suffix = suffixes[exp];
  } else {
    // Specialized big-number formatting for incremental games (aa, ab, ac...)
    const letterIdx = exp - suffixes.length;
    const firstLetter = String.fromCharCode(97 + Math.floor(letterIdx / 26) % 26);
    const secondLetter = String.fromCharCode(97 + (letterIdx % 26));
    suffix = firstLetter + secondLetter;
  }
  
  const remainder = b.e % 3;
  const short = b.m * Math.pow(10, remainder);
  return short.toFixed(2).replace(/\.00$/, '') + suffix;
}

const MATERIALS = [
  "Wooden", "Stone", "Iron", "Gold", "Diamond", "Obsidian", "Mithril", "Adamantite", "Titanium", "Meteorite",
  "Orichalcum", "Cobalt", "Palladium", "Chronium", "Aetherium", "Luminite", "Void", "Celestial", "Astral", "Galactic",
  "Universal", "Dimensional", "Omni", "Eternal", "Infinite"
];

export function getPickaxeName(level: number): string {
  if (level <= MATERIALS.length) return MATERIALS[level - 1] + " Pickaxe";
  const prefixIndex = Math.floor((level - MATERIALS.length - 1) / MATERIALS.length);
  const materialIndex = (level - MATERIALS.length - 1) % MATERIALS.length;
  const prefixes = ["Super", "Ultra", "Hyper", "Mega", "Giga", "Tera", "Peta", "Exa", "Zetta", "Yotta", "Cosmic", "Godly", "Divine"];
  const prefix = prefixes[Math.min(prefixIndex, prefixes.length - 1)];
  return `${prefix} ${MATERIALS[materialIndex]} Pickaxe`;
}

export function getPickaxeColor(level: number): string {
  const colors = [
    '#8B5A2B', // Wooden (Brown)
    '#A9A9A9', // Stone (Gray)
    '#D3D3D3', // Iron (Light Gray)
    '#FFD700', // Gold (Yellow)
    '#00FFFF', // Diamond (Cyan)
    '#4B0082', // Obsidian (Indigo)
    '#00FA9A', // Mithril (Medium Spring Green)
    '#FF00FF', // Adamantite (Magenta)
    '#C0C0C0', // Titanium (Silver)
    '#FF4500', // Meteorite (Orange Red)
  ];
  if (level <= colors.length) return colors[level - 1];
  const hue = (level * 37) % 360;
  return `hsl(${hue}, 80%, 60%)`;
}

export function generateBlocks(stage: number): (BlockData | null)[][] {
  const blocks: (BlockData | null)[][] = [];
  for (let r = 0; r < 100; r++) {
    const row: (BlockData | null)[] = [];
    if (r < 40) {
      blocks.push(Array(5).fill(null));
      continue;
    }
    for (let c = 0; c < 5; c++) {
      const type = getRandomBlockType(stage);
      const def = BLOCK_DEF[type];
      
      const depthMultiplier = Math.pow(1.05, r - 40) * Math.pow(1.5, stage - 1);
      
      row.push({
        type,
        hp: Math.ceil(10 * depthMultiplier * def.hpMult),
        maxHp: Math.ceil(10 * depthMultiplier * def.hpMult),
        yield: Math.ceil(depthMultiplier * def.yieldMult * 1.25),
      });
    }
    blocks.push(row);
  }
  return blocks;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}
