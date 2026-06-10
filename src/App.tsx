import { useState, useEffect } from 'react';
import { Player, Enemy, Bomb, Item } from './types';
import { GameCanvas } from './components/GameCanvas';
import { RadarDisplay } from './components/RadarDisplay';
import { GameHUD } from './components/GameHUD';
import * as audio from './utils/audio';
import { Plane, AlertTriangle, ShieldCheck, RefreshCw, Volume2, Award, Zap, Compass, Sparkles } from 'lucide-react';

const INITIAL_PLAYER = (): Player => ({
  x: 1400,
  y: 1400,
  vx: 0,
  vy: 0,
  angle: 0,
  targetAngle: 0,
  speed: 0,
  maxSpeed: 5.8,
  health: 100,
  maxHealth: 100,
  fuel: 100,
  maxFuel: 100,
  score: 0,
  coins: 100, // starting funds to let player try initial upgrades
  weapon: 'standard',
  ammo: {
    standard: 99999,
    heavy: 8,
    guided: 5,
  },
  reloadTimer: 0,
  upgradeLevels: {
    radarRange: 1,
    maxFuel: 1,
    maxArmor: 1,
    reloadTime: 1,
    bombDamage: 1,
  },
});

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER());
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [score, setScore] = useState(0);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Load High Score on mount
  useEffect(() => {
    const saved = localStorage.getItem('ocean_bomber_highscore');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  // Sync high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('ocean_bomber_highscore', score.toString());
    }
  }, [score, highScore]);

  // Handle Game Restart
  const handleStartGame = () => {
    setPlayer(INITIAL_PLAYER());
    setEnemies([]);
    setItems([]);
    setBombs([]);
    setScore(0);
    setSweepAngle(0);

    // Initial audio trigger
    audio.toggleAudio(audioEnabled);
    setGameState('playing');
  };

  const handleToggleAudio = () => {
    const nextVal = !audioEnabled;
    setAudioEnabled(nextVal);
    audio.toggleAudio(nextVal);
  };

  const handleGameOver = () => {
    audio.stopEngineSound();
    setGameState('gameover');
  };

  const handlePause = () => {
    if (gameState === 'playing') {
      audio.stopEngineSound();
      setGameState('paused');
    } else if (gameState === 'paused') {
      audio.toggleAudio(audioEnabled);
      setGameState('playing');
    }
  };

  // Keyboard 'P' key triggers pause toggle automatically
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        handlePause();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [gameState, audioEnabled]);

  // Upgrades buying trigger logic
  const handleUpgrade = (type: keyof Player['upgradeLevels']) => {
    const currentLvl = player.upgradeLevels[type];
    if (currentLvl >= 5) return;

    const cost = currentLvl * 150 + 100;
    if (player.coins < cost) {
      audio.playAlarm();
      return;
    }

    audio.playUpgrade();

    setPlayer((prev) => {
      const nextLevels = { ...prev.upgradeLevels, [type]: currentLvl + 1 };
      let updatedMaxHealth = prev.maxHealth;
      let updatedHealth = prev.health;
      let updatedMaxFuel = prev.maxFuel;
      let updatedFuel = prev.fuel;

      // Apply passive stat boosts
      if (type === 'maxArmor') {
        updatedMaxHealth = 100 + (currentLvl) * 35; // +35HP per level
        updatedHealth = updatedMaxHealth; // completely repair
      }
      if (type === 'maxFuel') {
        updatedMaxFuel = 100 + (currentLvl) * 40; // +40 Fuel per level
        updatedFuel = updatedMaxFuel; // completely refuel
      }

      return {
        ...prev,
        coins: prev.coins - cost,
        upgradeLevels: nextLevels,
        maxHealth: updatedMaxHealth,
        health: updatedHealth,
        maxFuel: updatedMaxFuel,
        fuel: updatedFuel,
      };
    });
  };

  return (
    <div id="app-root-deck" className="h-screen max-h-screen bg-[#010603] text-emerald-100 flex flex-col justify-between overflow-hidden selection:bg-emerald-800 selection:text-white pb-1">
      {/* Immersive Mission Control Header */}
      <header className="border-b border-emerald-950/60 bg-[#020b05]/95 px-4 py-2 flex flex-row justify-between items-center gap-2 shadow-md backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-950 p-1.5 rounded-lg border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <Plane className="w-5 h-5 text-emerald-400 rotate-45 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-emerald-200 leading-none">
              海洋生物レーダー爆撃作戦
            </h1>
            <p className="text-[8px] font-mono text-emerald-500 tracking-widest uppercase mt-0.5">
              DEEP SEA RADAR BOMBER TACTICAL COMMAND
            </p>
          </div>
        </div>

        {/* Global Level Indicator & High Score panel */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex flex-col text-right">
            <span className="text-[8px] text-emerald-500/70">HIGH SCORE</span>
            <span className="text-amber-400 font-bold text-xs tracking-wider">{highScore} pts</span>
          </div>
          <div className="flex flex-col text-right border-l border-emerald-950/80 pl-4">
            <span className="text-[8px] text-emerald-500/70">CURRENT SCORE</span>
            <span className="text-emerald-400 font-bold text-xs tracking-wider">{score} pts</span>
          </div>
          <div className="hidden sm:flex flex-col text-right border-l border-emerald-950/80 pl-4">
            <span className="text-[8px] text-emerald-500/70">COCKPIT STATUS</span>
            <span className="text-emerald-300 font-bold bg-[#031d0d]/70 px-1.5 py-0.5 rounded border border-emerald-800 text-[8px] leading-tight">
              ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Board Container */}
      <main className="flex-1 w-full overflow-hidden px-4 py-2 flex flex-col items-center justify-center">
        {gameState === 'menu' && (
          <div id="main-briefing-menu" className="w-full max-w-2xl bg-[#020d04]/90 border border-emerald-950/80 p-6 rounded-lg shadow-2xl relative overflow-hidden backdrop-blur-md my-auto">
            {/* Visual background radar ripple */}
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full border border-emerald-950/50 animate-ping opacity-30 pointer-events-none" />
            
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1 bg-red-950/60 border border-red-800/40 text-red-400 font-mono text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest font-semibold mb-2 animate-pulse">
                ⚠️ LEVEL-3 SEA MONSTER INVASION
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-300 uppercase tracking-tight">
                海洋深部 爆撃指令
              </h2>
              <p className="text-xs font-mono text-emerald-500 mt-1">
                EX-70 NEUTRON BOMBER COCKPIT DECK
              </p>
            </div>

            {/* Operation Strategy Briefing */}
            <div className="bg-[#031508]/40 border border-emerald-950 p-4 rounded text-xs select-none mb-5 flex flex-col gap-2.5">
              <div className="text-emerald-300 font-bold uppercase tracking-wider border-b border-emerald-950 pb-1.5 flex items-center gap-1.5 font-sans">
                <Compass className="w-4 h-4 text-emerald-400 animate-spin" /> 作戦概要 (Tactical Strategy Directives)
              </div>
              <p className="leading-relaxed text-emerald-400/90 font-sans">
                本ミッションの目的は、深海探知ソナー（レーダー）を駆使して海面下および深海に潜む危険な海洋生物を特定し、精鋭爆撃機から対潜爆雷を投下してこれを殲滅することである。
              </p>
              <p className="leading-relaxed text-emerald-400/90 font-sans">
                各海洋生物は潜んでいる深度が異なり（海面・潜航・深海）、標準爆弾では深海の生物に十分なダメージが通らない。深度や索敵レーダーの反応に応じて、装備（重爆雷、音響誘導弾など）を切り替えて爆撃を行え。航空燃料が切れる、もしくは生物の体当たりを受けると機体が墜落する。
              </p>
            </div>

            {/* Enemy Classification Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-[11px] font-mono">
              <div className="border border-emerald-900/30 bg-[#031206]/50 p-3 rounded">
                <div className="text-cyan-400 font-bold">👾 ミュータントクラゲ [潜航]</div>
                <div className="text-emerald-500/80 mt-1">電磁パルス弾を放つ。標準爆弾で容易に撃破可能。</div>
              </div>
              <div className="border border-emerald-900/30 bg-[#031206]/50 p-3 rounded">
                <div className="text-rose-400 font-bold">🦈 狂乱シャーク [海面急浮上]</div>
                <div className="text-emerald-500/80 mt-1">高速で海面に跳ね上がり、低空飛行の機体へ噛み付いてくる。</div>
              </div>
              <div className="border border-emerald-900/30 bg-[#031206]/50 p-3 rounded">
                <div className="text-indigo-400 font-bold">🦑 巨大ダイオウイカ [深海]</div>
                <div className="text-emerald-500/80 mt-1">深海に潜伏。ソナー照射時のみ高輝度に反応。対潜重爆雷が効果的。</div>
              </div>
              <div className="border border-emerald-900/30 bg-[#031206]/50 p-3 rounded flex items-center justify-between">
                <div>
                  <div className="text-amber-400 font-bold animate-pulse">👑 古代リヴァイアサン [BOSS]</div>
                  <div className="text-emerald-500/80 mt-1">極めて巨大。耐久力が桁違いに高く、弾道ホーミング弾を連射する。</div>
                </div>
              </div>
            </div>

            {/* Launch Operations Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="start-operation-btn"
                onClick={handleStartGame}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black text-sm font-extrabold py-3 border border-emerald-400 rounded cursor-pointer transition-all uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Zap className="w-4.5 h-4.5 animate-bounce" /> 作戦を開始する (DEPLOY SQUADRON)
              </button>
              
              <button
                id="toggle-audio-menu-btn"
                onClick={handleToggleAudio}
                className="p-3 px-4 border border-emerald-800 rounded bg-[#031c0e]/40 hover:bg-[#031c0e] text-xs font-mono text-emerald-300 transition-all flex items-center justify-center gap-1.5"
              >
                {audioEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>AUDIO COCKPIT ON</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-neutral-600" />
                    <span className="text-rose-400">AUDIO MUTED</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Combat Board HUD Screen */}
        {(gameState === 'playing' || gameState === 'paused') && (
          <div id="tactical-hud-board" className="w-full h-full flex flex-col lg:flex-row gap-4 overflow-hidden py-1">
            {/* Interactive Flight Canvas Viewport */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden">
              <GameCanvas
                player={player}
                setPlayer={setPlayer}
                enemies={enemies}
                setEnemies={setEnemies}
                items={items}
                setItems={setItems}
                bombs={bombs}
                setBombs={setBombs}
                isPaused={gameState === 'paused'}
                isGameOver={gameState === 'gameover'}
                score={score}
                setScore={setScore}
                setSweepAngle={setSweepAngle}
                onGameOver={handleGameOver}
                gameStarted={gameState === 'playing'}
              />

              {/* In-Game Paused Visual Sheet */}
              {gameState === 'paused' && (
                <div id="pause-overlay" className="absolute inset-0 bg-black/82 z-20 flex flex-col items-center justify-center border border-emerald-800 rounded-lg">
                  <div className="text-center p-6 border border-emerald-950 rounded-lg bg-[#020b05]/95 shadow-2xl">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-xl font-bold text-emerald-300 uppercase tracking-wide">
                      戦術管制 一時中断 (FLIGHT DECK PAUSED)
                    </h3>
                    <p className="text-xs font-mono text-emerald-500 mt-1.5 mb-5 select-none">
                      COCKPIT IS IN HOT-STANDBY READY SYSTEM
                    </p>
                    <button
                      id="resume-btn"
                      onClick={handlePause}
                      className="px-6 py-2 border border-emerald-400 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs uppercase cursor-pointer tracking-wider shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    >
                      操縦を再開する (RESUME FLIGHT)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dashboard side controls panel */}
            <div className="w-full lg:w-[260px] flex flex-col md:flex-row lg:flex-col gap-3 shrink-0 overflow-y-auto max-h-full pr-1 scrollbar-thin scrollbar-thumb-emerald-950">
              {/* Radar Widget */}
              <RadarDisplay
                player={player}
                enemies={enemies}
                items={items}
                radarRange={400 + player.upgradeLevels.radarRange * 90}
                sweepAngle={sweepAngle}
              />

              {/* Main Upgrades HUD panel */}
              <div className="flex-1 min-w-[200px]">
                <GameHUD
                  player={player}
                  onUpgrade={handleUpgrade}
                  audioEnabled={audioEnabled}
                  onToggleAudio={handleToggleAudio}
                />
              </div>
            </div>
          </div>
        )}

        {/* GameOver/Briefing Summary visual Deck */}
        {gameState === 'gameover' && (
          <div id="gameover-deck" className="w-full max-w-md bg-[#020a05]/95 border border-red-950/80 p-6 rounded-lg shadow-2xl text-center backdrop-blur-md my-auto relative">
            <div className="absolute top-2 left-2 text-[8px] font-mono text-red-500/70 select-none">
              SECURE DECK ERROR 404
            </div>
            
            <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto mb-3.5 animate-pulse" />
            <h2 className="text-2xl font-black text-red-400 tracking-wide uppercase">
              作戦異常切断 (MISSION FAILED)
            </h2>
            <p className="text-[10px] font-mono text-rose-500 mt-1 mb-5">
              AIRCRAFT CRASHED & EXTERMINATED IN REEFS
            </p>

            {/* Scores summary stats deck */}
            <div className="border border-emerald-950/60 bg-[#031408]/80 rounded p-4 mb-6 text-sm text-left font-mono flex flex-col gap-2.5">
              <div className="flex justify-between border-b border-emerald-950 pb-1.5 flex-row">
                <span className="text-emerald-500">獲得スコア (Total Score):</span>
                <span className="text-emerald-300 font-bold tracking-widest leading-none">{score} PTS</span>
              </div>
              <div className="flex justify-between border-b border-emerald-950 pb-1.5 flex-row">
                <span className="text-emerald-500">回収ゴールド (Gold Coins Gathered):</span>
                <span className="text-amber-400 font-bold leading-none">{player.coins} G</span>
              </div>
              <div className="flex justify-between flex-row">
                <span className="text-emerald-500">最高戦績 (Personal Record):</span>
                <span className="text-amber-300 font-bold tracking-widest leading-none">{highScore} PTS</span>
              </div>
            </div>

            {/* Action control block */}
            <div className="flex gap-3">
              <button
                id="retry-btn"
                onClick={handleStartGame}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded text-black font-extrabold py-3 text-xs uppercase cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              >
                <RefreshCw className="w-4 h-4 animate-spin" /> 再度作戦を展開 (REDEPLOY FLYER)
              </button>
              
              <button
                id="back-menu-btn"
                onClick={() => setGameState('menu')}
                className="px-4 py-3 border border-emerald-800 rounded bg-[#031d0c]/35 hover:bg-[#031d0c] text-xs font-mono text-emerald-300 transition-all cursor-pointer"
              >
                メニューに戻る (BRIEFING)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Cyber Credits footer inside deck margins */}
      <footer className="shrink-0 text-center font-mono text-[9px] text-emerald-600/50 select-none pointer-events-none py-1.5 w-full px-4 border-t border-emerald-950/20 flex justify-between mt-1">
        <div>ORBIT STATION S-04 COMMAND LINK: ONLINE</div>
        <div>BOMB CONTROL: MOUSE LEFT-CLICK</div>
      </footer>
    </div>
  );
}
