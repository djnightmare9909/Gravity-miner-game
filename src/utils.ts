import { BlockData, BlockType, BlockDef } from './types';

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

export function formatNumber(num: number): string {
  if (num < 1000) return Math.floor(num).toString();
  const exp = Math.floor(Math.log10(num) / 3);
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "E", "Z", "Y"];
  const suffix = suffixes[exp] || "e" + (exp * 3);
  const short = num / Math.pow(10, exp * 3);
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
