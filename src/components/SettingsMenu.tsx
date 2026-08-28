import React, { useState, useRef } from 'react';
import { GameState } from '../types';
import { Settings, Save, Upload, AlertTriangle, X } from 'lucide-react';

interface SettingsMenuProps {
  onClose: () => void;
  gameState: GameState;
  onRestore: (state: GameState) => void;
  onReset: () => void;
}

export default function SettingsMenu({ onClose, gameState, onRestore, onReset }: SettingsMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "pickaxe-save.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      setErrorMsg("Failed to backup save data.");
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.craftingGrid && parsed.blocks && typeof parsed.currency === 'number') {
          onRestore(parsed);
          onClose();
        } else {
          setErrorMsg("Invalid save file format.");
        }
      } catch (err) {
        setErrorMsg("Failed to read save file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {showConfirmReset ? (
        <div className="bg-slate-900 border-2 border-red-900/50 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative min-h-[320px]">
          <button 
            onClick={() => setShowConfirmReset(false)}
            className="absolute top-4 left-4 text-red-500 hover:text-red-400 transition-colors p-2"
            aria-label="No"
          >
            <X size={40} strokeWidth={3} />
          </button>

          <div className="mt-12 mb-8 flex-1 flex flex-col items-center justify-center text-center gap-4">
            <AlertTriangle className="text-red-500 mx-auto" size={48} />
            <p className="text-slate-300 font-bold leading-relaxed text-lg">
              Warning: You are about to delete your save. This process will permanently erase all progress and cannot be undone. Are you sure you wish to continue?
            </p>
          </div>

          <div className="flex justify-center mt-auto">
            <button 
              onClick={() => {
                onReset();
                onClose();
              }}
              className="py-3 px-12 bg-red-600 hover:bg-red-500 rounded-xl text-white font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-900/50"
            >
              Yes
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-6 shadow-2xl relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center gap-3">
            <Settings className="text-slate-400" size={28} />
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-widest">Settings</h2>
          </div>

          {errorMsg && (
            <div className="bg-red-500/20 text-red-400 p-3 rounded-xl text-sm font-bold border border-red-500/30">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleBackup}
              className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
            >
              <div className="flex items-center gap-3 font-bold text-slate-200">
                <Save size={20} className="text-blue-400" />
                Backup Save
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
            >
              <div className="flex items-center gap-3 font-bold text-slate-200">
                <Upload size={20} className="text-green-400" />
                Restore Save
              </div>
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleRestore} 
              className="hidden" 
            />

            <button
              onClick={() => setShowConfirmReset(true)}
              className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-red-900/30 hover:border-red-500/30 rounded-xl transition-all border border-slate-700 group mt-2"
            >
              <div className="flex items-center gap-3 font-bold text-slate-200 group-hover:text-red-400 transition-colors">
                <AlertTriangle size={20} className="text-red-400" />
                Delete Save
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
