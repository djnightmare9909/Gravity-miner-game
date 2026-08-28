import React from 'react';
import { Pickaxe, Lock } from 'lucide-react';
import { GridCell } from '../types';
import { getPickaxeColor } from '../utils';

interface Props {
  grid: GridCell[];
  unlockedCells: boolean[];
  selectedCell: number | null;
  onCellClick: (index: number) => void;
  onUnlockClick: (index: number) => void;
}

export default function CraftingGrid({ grid, unlockedCells, selectedCell, onCellClick, onUnlockClick }: Props) {
  const getUnlockCost = (index: number) => {
    const row = Math.floor(index / 5);
    switch (row) {
      case 0: return 0;
      case 1: return 1000;
      case 2: return 5000;
      case 3: return 25000;
      case 4: return 125000;
      default: return 0;
    }
  };

  return (
    <div className="bg-slate-950/60 w-full max-w-[400px] mx-auto backdrop-blur-sm p-3 rounded-3xl border border-slate-700/50 grid grid-cols-5 gap-2 shadow-2xl relative z-20">
      {grid.map((cell, i) => {
        const isUnlocked = unlockedCells[i];
        
        if (!isUnlocked) {
          const cost = getUnlockCost(i);
          return (
            <div
              key={i}
              onClick={() => onUnlockClick(i)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center relative shadow-inner cursor-pointer transition-all duration-200 select-none bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/60"
            >
              <Lock size={14} className="text-slate-500 mb-1" />
              <div className="text-[9px] text-yellow-500/80 font-black">{cost >= 1000 ? (cost/1000) + 'k' : cost}</div>
            </div>
          );
        }

        return (
          <div
            key={i}
            onClick={() => onCellClick(i)}
            className={`aspect-square rounded-xl flex items-center justify-center relative shadow-inner cursor-pointer transition-all duration-200 select-none ${
              selectedCell === i 
                ? 'bg-slate-700/40 border-2 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20 scale-105 z-10' 
                : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80'
            }`}
          >
            {cell && (
              <>
                <div 
                  className="flex items-center justify-center drop-shadow-md"
                  style={{ color: getPickaxeColor(cell.level) }}
                >
                  <Pickaxe size={28} strokeWidth={2.5} />
                </div>
                <div className="absolute bottom-1 right-1 text-[7.5px] font-bold bg-slate-900 px-1 rounded text-slate-400">
                  LV.{cell.level}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
