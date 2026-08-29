import React, { useState, useEffect, useCallback } from 'react';
import { GameState, BlockData } from './types';
import { generateBlocks, generateId, formatNumber, getPickaxeName, BIG_ZERO, toBigNum, addBigNum, subBigNum, mulBigNum, powBigNum, compareBigNum } from './utils';
import CraftingGrid from './components/CraftingGrid';
import DiggingArea from './components/DiggingArea';
import SettingsMenu from './components/SettingsMenu';
import { Trash2, ShoppingCart, Coins, Settings } from 'lucide-react';

const loadState = (): GameState => {
  try {
    const saved = localStorage.getItem('pickaxe-game-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.craftingGrid && parsed.blocks) {
        if (!parsed.unlockedCells) {
          parsed.unlockedCells = Array(25).fill(false);
          for (let i = 0; i < 5; i++) parsed.unlockedCells[i] = true;
          for (let i = 0; i < 25; i++) {
            if (parsed.craftingGrid[i]) parsed.unlockedCells[i] = true;
          }
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  
  const grid = Array(25).fill(null);
  grid[0] = { id: generateId(), level: 1 };
  
  const unlocked = Array(25).fill(false);
  for (let i = 0; i < 5; i++) unlocked[i] = true;

  return {
    currency: toBigNum(15),
    craftingGrid: grid,
    unlockedCells: unlocked,
    shopLevel: 1,
    shopBuyCount: 0,
    stage: 1,
    blocks: generateBlocks(1),
    maxPickaxeLevel: 1
  };
};

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const s = loadState();
    if (typeof s.currency === 'number') {
      s.currency = toBigNum(s.currency);
    }
    return s;
  });
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('pickaxe-game-state', JSON.stringify(state));
  }, [state]);

  const handleRestore = useCallback((newState: GameState) => {
    setState(newState);
  }, []);

  const handleReset = useCallback(() => {
    const grid = Array(25).fill(null);
    grid[0] = { id: generateId(), level: 1 };
    
    const unlocked = Array(25).fill(false);
    for (let i = 0; i < 5; i++) unlocked[i] = true;
    
    setState({
      currency: toBigNum(15),
      craftingGrid: grid,
      unlockedCells: unlocked,
      shopLevel: 1,
      shopBuyCount: 0,
      stage: 1,
      blocks: generateBlocks(1),
      maxPickaxeLevel: 1
    });
    localStorage.removeItem('pickaxe-game-state');
  }, []);

  const handleCellClick = (index: number) => {
    if (selectedCell === null) {
      if (state.craftingGrid[index]) setSelectedCell(index);
    } else {
      if (selectedCell === index) {
        setSelectedCell(null);
        return;
      }
      
      const source = state.craftingGrid[selectedCell];
      const target = state.craftingGrid[index];
      
      if (!target) {
        const newGrid = [...state.craftingGrid];
        newGrid[index] = source;
        newGrid[selectedCell] = null;
        setState(s => ({ ...s, craftingGrid: newGrid }));
        setSelectedCell(null);
      } else if (target.level === source!.level && target.level < 1000) {
        const newLevel = target.level + 1;
        const newGrid = [...state.craftingGrid];
        newGrid[index] = { ...target, level: newLevel };
        newGrid[selectedCell] = null;
        setState(s => ({
          ...s,
          craftingGrid: newGrid,
          maxPickaxeLevel: Math.max(s.maxPickaxeLevel, newLevel)
        }));
        setSelectedCell(null);
      } else {
        setSelectedCell(index);
      }
    }
  };

  const handleTrashClick = () => {
    if (selectedCell !== null && state.craftingGrid[selectedCell]) {
      const p = state.craftingGrid[selectedCell]!;
      const baseVal = mulBigNum(powBigNum(2, p.level - 1), 15);
      const value = mulBigNum(baseVal, 0.75);
      const newGrid = [...state.craftingGrid];
      newGrid[selectedCell] = null;
      setState(s => ({
        ...s,
        currency: addBigNum(s.currency, value),
        craftingGrid: newGrid
      }));
      setSelectedCell(null);
    }
  };

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

  const handleUnlockClick = (index: number) => {
    const cost = toBigNum(getUnlockCost(index));
    if (compareBigNum(state.currency, cost) >= 0) {
      setState(s => {
        const newUnlocked = [...s.unlockedCells];
        newUnlocked[index] = true;
        return {
          ...s,
          currency: subBigNum(s.currency, cost),
          unlockedCells: newUnlocked
        };
      });
    }
  };

  const handleBuy = () => {
    const cost = mulBigNum(powBigNum(2, state.shopLevel - 1), 15);
    if (compareBigNum(state.currency, cost) >= 0) {
      const emptyIndex = state.craftingGrid.findIndex((c, i) => c === null && state.unlockedCells[i]);
      if (emptyIndex !== -1) {
        const newGrid = [...state.craftingGrid];
        newGrid[emptyIndex] = { id: generateId(), level: state.shopLevel };
        
        setState(s => {
          let nextLevel = s.shopLevel;
          let nextCount = s.shopBuyCount + 1;
          const req = 100 + (s.shopLevel - 1) * 50;
          if (nextCount >= req && nextLevel < 1000) {
            nextLevel++;
            nextCount = 0;
          }
          return {
            ...s,
            currency: subBigNum(s.currency, cost),
            craftingGrid: newGrid,
            shopLevel: nextLevel,
            shopBuyCount: nextCount,
            maxPickaxeLevel: Math.max(s.maxPickaxeLevel, nextLevel)
          };
        });
      }
    }
  };

  const handleDrop = () => {
    if (state.craftingGrid.some(c => c !== null)) {
      setIsDropping(true);
      setSelectedCell(null);
    }
  };

  const handleFinishDrop = useCallback((newBlocks: (BlockData | null)[][], chestsOpenedCount: number) => {
    setIsDropping(false);
    
    // If they opened any chest, advance to next depth stage.
    if (chestsOpenedCount > 0) {
      setState(s => ({
        ...s,
        stage: s.stage + 1,
        blocks: generateBlocks(s.stage + 1)
      }));
    } else {
      setState(s => ({ ...s, blocks: newBlocks }));
    }
  }, []);

  const handleGainCurrency = useCallback((amt: number) => {
    setState(s => ({ ...s, currency: addBigNum(s.currency, toBigNum(amt)) }));
  }, []);

  const handleChestOpen = useCallback((pickaxeLevel: number) => {
    setState(s => {
      const rewardLevel = Math.min(1000, Math.max(1, s.maxPickaxeLevel + Math.floor(Math.random() * 3)));
      const emptyIndex = s.craftingGrid.findIndex((c, i) => c === null && s.unlockedCells[i]);
      if (emptyIndex !== -1) {
        const newGrid = [...s.craftingGrid];
        newGrid[emptyIndex] = { id: generateId(), level: rewardLevel };
        return { ...s, craftingGrid: newGrid, maxPickaxeLevel: Math.max(s.maxPickaxeLevel, rewardLevel) };
      } else {
        const value = mulBigNum(powBigNum(2, rewardLevel - 1), 15);
        return { ...s, currency: addBigNum(s.currency, value) };
      }
    });
  }, []);

  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-100 overflow-hidden select-none">
      <div className="w-full max-w-[420px] h-full sm:h-[800px] sm:max-h-[95vh] bg-slate-900 sm:rounded-[3rem] sm:border-[12px] border-slate-800 shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-center z-20">
          <div className="flex gap-3">
            <div 
              onClick={handleTrashClick}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-lg group ${
                selectedCell !== null && state.craftingGrid[selectedCell]
                  ? 'bg-red-900/40 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse'
                  : 'bg-red-900/20 border border-red-500/30 hover:bg-red-800/30'
              }`}
            >
              <Trash2 size={24} className={`text-red-400 group-hover:scale-110 transition-transform ${selectedCell !== null && state.craftingGrid[selectedCell] ? 'scale-110' : ''}`} />
            </div>
            
            <div 
              onClick={() => setShowSettings(true)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-lg group bg-slate-800 border border-slate-700 hover:bg-slate-700"
            >
              <Settings size={24} className="text-slate-400 group-hover:text-white transition-colors group-hover:rotate-45" />
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-black text-2xl tracking-tighter">{formatNumber(state.currency)}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-800 px-1.5 py-0.5 rounded">Coins</span>
            </div>
            <div className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase mt-1">Max Rank: {state.maxPickaxeLevel}</div>
          </div>
        </div>
        
        {/* Stage Progress */}
        <div className="px-6 py-3 z-20">
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300"
              style={{ width: `${Math.min(100, (state.stage % 10) * 10 || 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] mt-2 text-slate-400 font-black uppercase tracking-widest">
            <span>Shaft Depth: {state.stage}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col relative z-20 overflow-hidden">
          {isDropping ? (
            <div className="flex-1 mx-4 mb-2 bg-slate-950 rounded-3xl border-x border-t border-slate-800 relative overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
               <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-900 to-transparent z-10 opacity-80 pointer-events-none"></div>
               <div className="absolute top-3 left-0 right-0 flex justify-center z-20">
                 <span className="text-cyan-400 text-[10px] font-bold tracking-widest uppercase animate-pulse flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                   MINING IN PROGRESS
                 </span>
               </div>
               <DiggingArea 
                 grid={state.craftingGrid}
                 initialBlocks={state.blocks}
                 onGainCurrency={handleGainCurrency}
                 onChestOpen={handleChestOpen}
                 onFinish={handleFinishDrop}
               />
            </div>
          ) : (
            <div className="flex-1 px-6 py-4 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-500">
               <CraftingGrid 
                 grid={state.craftingGrid} 
                 unlockedCells={state.unlockedCells}
                 selectedCell={selectedCell} 
                 onCellClick={handleCellClick} 
                 onUnlockClick={handleUnlockClick}
               />
            </div>
          )}
        </div>

        {/* Action Button & Shop info */}
        {!isDropping && (
          <div className="p-6 pt-2 bg-slate-900 border-t border-slate-800/50 flex flex-col gap-3 z-30">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span>Shop Lvl {state.shopLevel} <span className="text-indigo-400 ml-2">{100 + (state.shopLevel - 1) * 50 - state.shopBuyCount} buys to upgrade</span></span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleBuy}
                disabled={compareBigNum(state.currency, mulBigNum(powBigNum(2, state.shopLevel - 1), 15)) < 0}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 rounded-2xl font-black text-[11px] tracking-widest active:scale-95 transition-all flex flex-col items-center justify-center gap-1 border border-slate-700"
              >
                <span className="text-slate-300">BUY LVL {state.shopLevel}</span>
                <span className="text-yellow-400">🪙 {formatNumber(mulBigNum(powBigNum(2, state.shopLevel - 1), 15))}</span>
              </button>
              
              <button
                onClick={handleDrop}
                className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:brightness-110 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-indigo-900/40 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10"
              >
                <span>DROP PICKAXES</span>
              </button>
            </div>
          </div>
        )}

        {/* Glows */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {showSettings && (
          <SettingsMenu 
            onClose={() => setShowSettings(false)} 
            gameState={state}
            onRestore={handleRestore}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

