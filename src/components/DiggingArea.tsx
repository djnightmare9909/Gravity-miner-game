import React, { useEffect, useRef } from 'react';
import { GridCell, BlockData } from '../types';
import { getPickaxeColor, BLOCK_DEF } from '../utils';

interface Props {
  grid: GridCell[];
  initialBlocks: (BlockData | null)[][];
  onGainCurrency: (amt: number) => void;
  onChestOpen: (level: number) => void;
  onFinish: (blocks: (BlockData | null)[][], chestsOpenedCount: number) => void;
}

interface PhysicsEntity {
  id: string;
  level: number;
  col: number;
  x: number;
  y: number;
  vy: number;
  hitsLeft: number;
  active: boolean;
}

export default function DiggingArea({ grid, initialBlocks, onGainCurrency, onChestOpen, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const blocksRef = useRef(initialBlocks.map(row => [...row])); // deep-ish copy of grid array structure
  const chestsOpenedRef = useRef<Set<number>>(new Set());
  const pendingCurrencyRef = useRef(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Setup responsive canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = window.innerHeight * 0.7; // Take up most of screen height
    }
    
    const CELL_SIZE = canvas.width / 5;
    
    const entities: PhysicsEntity[] = grid.map((cell, i) => {
      if (!cell) return null;
      const col = i % 5;
      const row = Math.floor(i / 5);
      return {
        id: cell.id,
        level: cell.level,
        col,
        x: col * CELL_SIZE + CELL_SIZE / 2,
        y: row * CELL_SIZE + CELL_SIZE / 2,
        vy: 0,
        // Durability scales with pickaxe level
        hitsLeft: Math.min(500, 10 + Math.floor(Math.pow(1.2, cell.level))),
        active: true
      };
    }).filter(Boolean) as PhysicsEntity[];
    
    let cameraY = 0;
    
    const update = () => {
      let anyActive = false;
      let lowestY = 0;
      
      entities.forEach(e => {
        if (!e.active) return;
        anyActive = true;
        
        e.vy += 0.5; // Gravity
        if (e.vy > 25) e.vy = 25; // Terminal velocity
        e.y += e.vy;
        
        if (e.y > lowestY) lowestY = e.y;
        
        const col = Math.floor(e.x / CELL_SIZE);
        // Collision point is at the bottom tip of the pickaxe
        const tipY = e.y + CELL_SIZE * 0.4;
        const row = Math.floor(tipY / CELL_SIZE);
        
        if (row >= 40 && row < 100 && blocksRef.current[row] && blocksRef.current[row][col]) {
           const block = blocksRef.current[row][col]!;
           
           // Momentum-based damage modifier
           const baseDamage = Math.pow(2, e.level - 1);
           const momentumMultiplier = Math.max(1, Math.floor(e.vy / 2));
           const damage = baseDamage * momentumMultiplier;
           
           block.hp -= damage;
           e.hitsLeft--;
           
           // Bounce effect
           e.vy = -Math.max(5, Math.min(12, e.vy * 0.6));
           e.y = row * CELL_SIZE - CELL_SIZE * 0.4; // snap above block
           
           if (block.hp <= 0) {
             // Break block
             blocksRef.current[row][col] = null;
             pendingCurrencyRef.current += block.yield;
             e.vy = -3; // small upward bounce so it doesn't instantly teleport through next blocks
           }
           
           if (e.hitsLeft <= 0) e.active = false;
        }
        
        // Chest collision
        if (row >= 100 && row < 105) {
           if (!chestsOpenedRef.current.has(col)) {
             chestsOpenedRef.current.add(col);
             onChestOpen(e.level);
           }
           e.active = false;
        } else if (row > 105) {
           e.active = false; // Fell off screen completely
        }
      });
      
      // Update camera smooth follow
      let targetCameraY = lowestY - canvas.height * 0.6;
      if (targetCameraY < 0) targetCameraY = 0;
      cameraY += (targetCameraY - cameraY) * 0.1;
      
      // Clear and draw background (transparent to show container bg)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(0, -cameraY);
      
      // Culling: only draw blocks in viewport
      const startRow = Math.max(40, Math.floor(cameraY / CELL_SIZE));
      const endRow = Math.min(100, Math.ceil((cameraY + canvas.height) / CELL_SIZE));
      
      for (let r = startRow; r <= endRow; r++) {
        if (!blocksRef.current[r] && r !== 100) continue;
        
        for (let c = 0; c < 5; c++) {
           if (r === 100) {
             // Draw chest if not opened
             if (!chestsOpenedRef.current.has(c)) {
                const x = c * CELL_SIZE;
                const y = r * CELL_SIZE;
                ctx.fillStyle = '#D97706'; // amber-600 (chest base)
                ctx.fillRect(x + CELL_SIZE*0.15, y + CELL_SIZE*0.2, CELL_SIZE*0.7, CELL_SIZE*0.6);
                ctx.fillStyle = '#F59E0B'; // amber-500 (chest lid)
                ctx.fillRect(x + CELL_SIZE*0.1, y + CELL_SIZE*0.15, CELL_SIZE*0.8, CELL_SIZE*0.2);
                ctx.fillStyle = '#78350F'; // lock
                ctx.fillRect(x + CELL_SIZE*0.4, y + CELL_SIZE*0.3, CELL_SIZE*0.2, CELL_SIZE*0.15);
             }
             continue;
           }
           
           const block = blocksRef.current[r]?.[c];
           if (block) {
             const x = c * CELL_SIZE;
             const y = r * CELL_SIZE;
             const def = BLOCK_DEF[block.type] || BLOCK_DEF.stone;
             
             // Base block fill
             ctx.fillStyle = def.color;
             ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
             
             // Inner shadow / Bevel for 3D effect
             ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
             ctx.beginPath();
             ctx.moveTo(x + 1, y + 1);
             ctx.lineTo(x + CELL_SIZE - 1, y + 1);
             ctx.lineTo(x + CELL_SIZE - 5, y + 5);
             ctx.lineTo(x + 5, y + 5);
             ctx.fill();
             
             ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
             ctx.beginPath();
             ctx.moveTo(x + 1, y + CELL_SIZE - 1);
             ctx.lineTo(x + CELL_SIZE - 1, y + CELL_SIZE - 1);
             ctx.lineTo(x + CELL_SIZE - 5, y + CELL_SIZE - 5);
             ctx.lineTo(x + 5, y + CELL_SIZE - 5);
             ctx.fill();
             
             // Ore details
             if (def.ore) {
                ctx.fillStyle = def.ore;
                // Fixed pseudo-random pattern based on coordinates
                const specks = [
                  [0.2, 0.3, 0.15],
                  [0.65, 0.2, 0.12],
                  [0.35, 0.65, 0.15],
                  [0.75, 0.7, 0.1],
                  [0.25, 0.8, 0.12]
                ];
                specks.forEach(([sx, sy, ss]) => {
                   ctx.fillRect(x + 1 + CELL_SIZE * sx, y + 1 + CELL_SIZE * sy, CELL_SIZE * ss, CELL_SIZE * ss);
                });
             }
             
             // Block border
             ctx.strokeStyle = '#0f172a'; // slate-900
             ctx.lineWidth = 2;
             ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
             
             // Health bar if damaged
             if (block.hp < block.maxHp) {
               const hpPercent = Math.max(0, block.hp / block.maxHp);
               ctx.fillStyle = '#ef4444'; // red-500
               ctx.fillRect(x + 2, y + CELL_SIZE - 6, (CELL_SIZE - 4) * hpPercent, 4);
             }
           } 
        }
      }
      
      // Draw Pickaxes
      entities.forEach(e => {
        if (!e.active) return;
        
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.vy * 0.05); // Spin slightly based on velocity
        
        // Pickaxe Handle (Angled gradient)
        const hW = CELL_SIZE * 0.1;
        const hL = CELL_SIZE * 0.6;
        const grad = ctx.createLinearGradient(-hW, -hL/2, hW, hL/2);
        grad.addColorStop(0, '#5C4033'); // Dark brown
        grad.addColorStop(1, '#8B5A2B'); // Lighter brown
        ctx.fillStyle = grad;
        ctx.fillRect(-hW/2, -CELL_SIZE * 0.2, hW, hL);
        
        // Pickaxe Head
        const color = getPickaxeColor(e.level);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        // A stylized curved crescent shape
        ctx.moveTo(-CELL_SIZE * 0.45, -CELL_SIZE * 0.15);
        ctx.quadraticCurveTo(0, -CELL_SIZE * 0.5, CELL_SIZE * 0.45, -CELL_SIZE * 0.15); // Top outer curve
        ctx.lineTo(CELL_SIZE * 0.35, -CELL_SIZE * 0.05);
        ctx.quadraticCurveTo(0, -CELL_SIZE * 0.35, -CELL_SIZE * 0.35, -CELL_SIZE * 0.05); // Inner curve
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      });
      
      ctx.restore();
      
      if (anyActive) {
        requestRef.current = requestAnimationFrame(update);
      } else {
        onFinish(blocksRef.current, chestsOpenedRef.current.size);
      }
    };
    
    requestRef.current = requestAnimationFrame(update);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Run once on mount

  // Sync currency in batches to avoid overwhelming React state
  useEffect(() => {
    const interval = setInterval(() => {
       if (pendingCurrencyRef.current > 0) {
         onGainCurrency(pendingCurrencyRef.current);
         pendingCurrencyRef.current = 0;
       }
    }, 200);
    return () => clearInterval(interval);
  }, [onGainCurrency]);

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center h-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
      />
    </div>
  );
}
