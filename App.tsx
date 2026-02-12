
import React, { useState, useCallback } from 'react';
import PoolTable from './components/PoolTable';
import { GameMode, GameStatus } from './types';
import { initAudio } from './engine/audio';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [mode, setMode] = useState<GameMode>(GameMode.PvP);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [winner, setWinner] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const startGame = useCallback((selectedMode: GameMode) => {
    initAudio();
    setMode(selectedMode);
    setScores([0, 0]);
    setWinner(null);
    setCurrentPlayer(0);
    setStatus(GameStatus.PLAYING);
    setShowExitConfirm(false);
  }, []);

  const handleGameOver = useCallback((winningPlayer: number) => {
    setWinner(winningPlayer);
    setStatus(GameStatus.GAMEOVER);
  }, []);

  const handleScoreUpdate = useCallback((newScores: [number, number]) => {
    setScores(newScores);
  }, []);

  const handleTurnChange = useCallback((newPlayer: number) => {
    setCurrentPlayer(newPlayer);
  }, []);

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    setStatus(GameStatus.MENU);
  }, []);

  const DualScoreBoard = ({ perspectivePlayer }: { perspectivePlayer: number }) => {
    const opponentIdx = perspectivePlayer === 0 ? 1 : 0;
    const isPerspectiveActive = currentPlayer === perspectivePlayer;
    const isOpponentActive = currentPlayer === opponentIdx;

    const getPlayerLabel = (idx: number) => {
      if (mode === GameMode.PvP) return `P${idx + 1}`;
      if (mode === GameMode.PvE) return idx === 0 ? 'YOU' : 'AI';
      return `AI ${idx + 1}`;
    };

    return (
      <div className={`flex items-center gap-2 sm:gap-4 px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all duration-500 ${perspectivePlayer === 1 ? 'rotate-180' : ''}`}>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${isOpponentActive ? 'bg-white/10 ring-1 ring-white/20' : 'opacity-40'}`}>
          <div className={`w-2 h-2 rounded-full ${opponentIdx === 0 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`}></div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Opponent ({getPlayerLabel(opponentIdx)})</span>
            <span className="text-xl font-black tabular-nums leading-none">{scores[opponentIdx]}</span>
          </div>
        </div>
        <div className="w-px h-8 bg-white/10"></div>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${isPerspectiveActive ? 'bg-white/10 ring-1 ring-white/20' : 'opacity-40'}`}>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Your Score ({getPlayerLabel(perspectivePlayer)})</span>
            <span className="text-xl font-black tabular-nums leading-none">{scores[perspectivePlayer]}</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${perspectivePlayer === 0 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 flex flex-col items-center select-none overflow-hidden touch-none font-sans">
      
      {/* 退出按钮 - 悬浮层级确保可点击 */}
      {status === GameStatus.PLAYING && !showExitConfirm && (
        <button 
          onClick={() => setShowExitConfirm(true)}
          className="absolute top-6 right-6 z-[60] p-4 bg-slate-900/80 hover:bg-red-500/20 border border-white/10 rounded-full transition-all active:scale-90 group pointer-events-auto shadow-xl"
          aria-label="Exit Game"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400 group-hover:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      )}

      {/* 自定义退出确认弹窗 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-[280px] w-full text-center space-y-6 animate-in zoom-in duration-300">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase italic">退出对局?</h3>
              <p className="text-xs text-slate-400 tracking-wide font-medium">当前游戏进度将不会保存</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmExit}
                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-400 transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                确认退出
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-4 bg-white/5 text-slate-300 font-bold rounded-2xl hover:bg-white/10 transition-all active:scale-95"
              >
                继续游戏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部视角 */}
      <div className="w-full h-24 flex items-center justify-center px-6 z-20">
        {status === GameStatus.PLAYING ? (
          <DualScoreBoard perspectivePlayer={1} />
        ) : (
          <h1 className="text-2xl font-black tracking-[0.3em] text-slate-800 rotate-180 italic opacity-50">ZENITH V</h1>
        )}
      </div>

      {/* 游戏主体 */}
      <div className="flex-1 w-full flex items-center justify-center relative px-2 max-h-[70vh]">
        {status === GameStatus.MENU && (
          <div className="w-full max-w-sm bg-slate-900 p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500 relative z-30 pointer-events-auto">
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-black text-white tracking-[0.2em] uppercase">Zenith Hall</h2>
              <p className="text-emerald-500 text-[10px] tracking-[0.4em] font-bold uppercase italic">Physics Master Edition</p>
            </div>
            <div className="grid gap-3">
              {[
                { m: GameMode.PvP, t: 'Local Duel', d: 'Head-to-Head Battle' },
                { m: GameMode.PvE, t: 'Solo vs AI', d: 'Challenge the Engine' },
                { m: GameMode.EvE, t: 'Simulation', d: 'Watch AI vs AI' }
              ].map((item) => (
                <button 
                  key={item.m}
                  onClick={() => startGame(item.m)}
                  className="w-full text-left p-5 bg-white/[0.03] hover:bg-emerald-500/[0.08] border border-white/5 hover:border-emerald-500/30 rounded-[2rem] transition-all group active:scale-[0.96]"
                >
                  <h3 className="font-black text-lg group-hover:text-emerald-400 transition-colors uppercase italic">{item.t}</h3>
                  <p className="text-[9px] text-slate-500 tracking-widest uppercase mt-0.5">{item.d}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === GameStatus.PLAYING && (
          <div className="w-full h-full flex flex-col items-center justify-center">
             <PoolTable 
               mode={mode} 
               onGameOver={handleGameOver}
               onScoreUpdate={handleScoreUpdate}
               onTurnChange={handleTurnChange}
             />
          </div>
        )}

        {status === GameStatus.GAMEOVER && (
          <div className="max-w-xs w-full bg-slate-950 p-10 rounded-[3.5rem] border border-emerald-500/40 shadow-2xl text-center space-y-8 animate-in zoom-in duration-500 relative z-30 pointer-events-auto">
            <h2 className="text-4xl font-black text-emerald-400 italic">VICTORY</h2>
            <div className={`text-2xl font-black uppercase tracking-widest ${winner === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
              {winner === 0 ? 'Emerald Player' : 'Indigo Player'}
            </div>
            <button 
              onClick={() => setStatus(GameStatus.MENU)}
              className="w-full py-5 bg-emerald-500 text-slate-950 font-black rounded-[2rem] hover:bg-emerald-400 shadow-xl transition-all active:scale-95"
            >
              MAIN MENU
            </button>
          </div>
        )}
      </div>

      {/* 底部视角 */}
      <div className="w-full h-24 flex items-center justify-center px-6 z-20">
        {status === GameStatus.PLAYING ? (
          <DualScoreBoard perspectivePlayer={0} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-black tracking-[0.3em] text-slate-200 italic">ZENITH V</h1>
            <button onClick={() => setStatus(GameStatus.MENU)} className="text-[8px] text-slate-500 tracking-[0.5em] font-bold uppercase hover:text-emerald-400 transition-colors pointer-events-auto">Select Game Mode</button>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-20 pointer-events-none">
        <div className="w-1 h-1 rounded-full bg-white"></div>
        <span className="text-[7px] tracking-[1em] text-white uppercase font-bold">Swipe to shoot</span>
      </div>
    </div>
  );
};

export default App;
