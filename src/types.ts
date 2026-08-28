export interface PickaxeItem {
  id: string;
  level: number;
}

export type GridCell = PickaxeItem | null;

export type BlockType = 'dirt' | 'stone' | 'coal' | 'iron' | 'gold' | 'sapphire' | 'ruby' | 'emerald' | 'diamond_ore' | 'obsidian' | 'void';

export interface BlockDef {
  color: string;
  ore?: string;
  hpMult: number;
  yieldMult: number;
}

export interface BlockData {
  hp: number;
  maxHp: number;
  type: BlockType;
  yield: number;
}

export interface GameState {
  currency: number;
  craftingGrid: GridCell[]; // Array of 25
  unlockedCells: boolean[]; // Array of 25
  shopLevel: number;
  shopBuyCount: number;
  stage: number;
  blocks: (BlockData | null)[][]; // 100 rows, 5 cols
  maxPickaxeLevel: number;
}
