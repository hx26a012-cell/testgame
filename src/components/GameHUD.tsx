import React from 'react';
import { Player, WeaponType } from '../types';
import { Shield, Flame, Target, Award, Key, Volume2, VolumeX } from 'lucide-react';

interface GameHUDProps {
  player: Player;
  onUpgrade: (type: keyof Player['upgradeLevels']) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  onUpgrade,
  audioEnabled,
  onToggleAudio,
}) => {
  const getUpgradeCost = (currentLvl: number) => {
    if (currentLvl >= 5) return Infinity;
    return currentLvl * 150 + 100; // lvl 1->2: 250, 2->3: 400, etc.
  };

  const currentWeaponName = (type: WeaponType) => {
    switch (type) {
      case 'standard': return '炸裂魚雷爆弾 (Standard Bomb)';
      case 'heavy': return '超重対潜爆雷 (Heavy Depth Charge)';
      case 'guided': return '音響誘導追従弾 (Guided Sonic Torpedo)';
    }
  };

  const getWeaponLabel = (type: WeaponType) => {
    switch (type) {
      case 'standard': return '無制限基本爆弾 (INF)';
      case 'heavy': return `${player.ammo.heavy}発`;
      case 'guided': return `${player.ammo.guided}発`;
    }
  };

  return (
    <div id="game-hud" className="flex flex-col gap-2.5 text-emerald-100 font-sans h-full select-none text-xs">
      {/* Flight Control / Dashboard Status */}
      <div className="border border-emerald-950/80 bg-[#020d06]/95 p-3 rounded-lg shadow-md shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1 font-bold tracking-wider text-emerald-400 text-xs">
            <Shield className="w-4 h-4" /> AIRCRAFT TELEMETRY
          </div>
          <button
            id="toggle-audio-btn"
            onClick={onToggleAudio}
            className="p-1 px-1.5 rounded border border-emerald-800 text-[10px] flex items-center gap-1 hover:bg-emerald-950 text-emerald-300 transition-all font-mono"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>SOUND ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-red-400" />
                <span>SOUND OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Armor/Health sensor */}
        <div className="mb-2.5">
          <div className="flex justify-between text-[10px] font-mono text-emerald-400/80 mb-0.5">
            <span>ARMOR INTEGRITY (機体装甲力)</span>
            <span>{Math.round(player.health)} / {player.maxHealth}</span>
          </div>
          <div className="w-full bg-emerald-950/60 h-3 rounded-sm border border-emerald-500/15 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-sm transition-all duration-300 ${
                player.health < player.maxHealth * 0.3
                  ? 'bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
              }`}
              style={{ width: `${Math.max(0, (player.health / player.maxHealth) * 100)}%` }}
            />
          </div>
        </div>

        {/* Fuel sensor */}
        <div className="mb-2.5">
          <div className="flex justify-between text-[10px] font-mono text-amber-400/80 mb-0.5 flex-row items-center">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 animate-pulse" /> FUEL COMBUSTION (燃料)
            </span>
            <span>{Math.round(player.fuel)} / {player.maxFuel}</span>
          </div>
          <div className="w-full bg-emerald-950/60 h-3 rounded-sm border border-emerald-500/15 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-sm transition-all duration-300 ${
                player.fuel < player.maxFuel * 0.3
                  ? 'bg-red-600 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.6)]'
                  : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              }`}
              style={{ width: `${Math.max(0, (player.fuel / player.maxFuel) * 100)}%` }}
            />
          </div>
          {player.fuel < player.maxFuel * 0.3 && (
            <div className="text-[9px] text-rose-400 font-mono animate-pulse mt-0.5 text-center font-bold tracking-wider">
              ⚠️ WARNING: FUEL CRITICAL
            </div>
          )}
        </div>

        {/* Weapon Selection Display */}
        <div className="border border-emerald-900/30 bg-emerald-950/20 p-2 rounded text-xs mb-2">
          <div className="text-[9px] font-mono text-emerald-500 mb-0.5 tracking-wider uppercase">ACTIVE ORDNANCE (装備兵装)</div>
          <div className="font-bold text-center py-0.5 text-emerald-300 tracking-wide text-xs">
            {currentWeaponName(player.weapon)}
          </div>

          {/* 各武装がいつ・どの獲物・深度に有効かのひとくち戦術ガイド */}
          <div className="bg-[#010902] px-2 py-1.5 rounded border border-emerald-950 text-[9px] text-emerald-400 font-mono mt-1 space-y-0.5 leading-relaxed">
            {player.weapon === 'standard' && (
              <>
                <div className="text-emerald-300 font-bold">🟢 標準炸裂爆弾 [無限連射]</div>
                <div>浅瀬〜中層[深度0〜1]のクラゲやサメに有効。</div>
                <div className="text-rose-400 text-[8px] font-semibold">🚫 深海(深度2)のイカ等にはダメージが10%に激減！</div>
              </>
            )}
            {player.weapon === 'heavy' && (
              <>
                <div className="text-amber-400 font-bold">🟠 超重対潜爆雷 [減衰なし]</div>
                <div>深海[深度2]の巨大イカ、その他巨大ボスに100%特効！</div>
                <div className="text-emerald-400 text-[8px] font-semibold">✨ 広範囲の極大爆風 ＋ 全ての深さに全力ダメージ。</div>
              </>
            )}
            {player.weapon === 'guided' && (
              <>
                <div className="text-cyan-400 font-bold">🔵 音響探知魚雷 [自動誘導]</div>
                <div>最寄りの海洋ターゲットへ勝手に軌道を曲げて追尾！</div>
                <div className="text-cyan-300 text-[8px] font-semibold">🧭 照準がズレても命中。すばしっこいサメに最適！</div>
              </>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400/80 mt-1.5 border-t border-emerald-950/50 pt-1">
            <span>AMMO (残弾数)</span>
            <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 text-cyan-300 font-bold">{getWeaponLabel(player.weapon)}</span>
          </div>
        </div>

        {/* Ammo Stockpile Selector Indicators */}
        <div className="grid grid-cols-3 gap-1 text-center mt-2.5">
          {(['standard', 'heavy', 'guided'] as WeaponType[]).map((w, index) => (
            <div
              key={w}
              className={`p-1 rounded border text-[9px] font-mono cursor-pointer transition-all ${
                player.weapon === w
                  ? 'bg-emerald-800 text-white border-emerald-400 font-semibold scale-102 ring-1 ring-emerald-500/30'
                  : 'bg-[#031c0e]/40 text-emerald-400/70 border-emerald-900/40 hover:bg-[#031c0e]'
              }`}
            >
              <div className="text-white font-bold leading-none mb-0.5">{index + 1}</div>
              <div className="uppercase tracking-tight text-[8px]">{w === 'standard' ? 'STD' : w === 'heavy' ? 'HVY' : 'GUIDE'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrades Shop Deck (機体強化) */}
      <div className="border border-emerald-950/80 bg-[#020d06]/95 p-3 rounded-lg shadow-md flex-1 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center gap-1 font-bold tracking-wider text-emerald-400 text-xs mb-2">
            <Target className="w-4 h-4 text-emerald-300 animate-pulse" /> AUTOMATIC UPGRADES (自動適応強化)
          </div>

          <div className="text-[10px] font-mono bg-[#031c0e]/95 p-2 rounded border border-emerald-900/60 mb-2.5 text-emerald-300 leading-relaxed">
            <div className="font-bold text-emerald-400 mb-0.5">🎮 撃破時オート強化システム:</div>
            敵（海洋生物）を撃退すると、<span className="text-amber-400 font-bold">50%の確率で</span>機体のパーツが自動的に1レベルランダム強化されます！
          </div>

          {/* Upgrade List - Read-only View */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[170px] lg:max-h-full scrollbar-thin scrollbar-thumb-emerald-950">
            {Object.entries(player.upgradeLevels).map(([key, level]) => {
              const upgradeType = key as keyof Player['upgradeLevels'];
              const levelVal = level as number;
              const labelJP = {
                radarRange: 'ソナー範囲 (Sonar Range)',
                maxFuel: '最大燃料 (Max Fuel)',
                maxArmor: '最大装甲 (Max Armor)',
                reloadTime: 'リロード短縮 (Fire Rate)',
                bombDamage: '爆薬威力 (Bomb Damage)',
              }[upgradeType];

              return (
                <div key={upgradeType} className="flex flex-col border border-emerald-950 bg-emerald-950/20 p-1.5 rounded">
                  <div className="flex justify-between items-center text-[10px] mb-0.5">
                    <span className="font-semibold text-emerald-200">{labelJP}</span>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">Lv.{levelVal}/5</span>
                  </div>
                  {/* Small progress squares */}
                  <div className="flex justify-between items-center gap-1.5">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-2 rounded-2xs border border-emerald-900 flex-1 ${
                            i <= levelVal 
                              ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)] border-emerald-300' 
                              : 'bg-[#030e07] border-emerald-950/60'
                          }`}
                        />
                      ))}
                    </div>
                    {levelVal >= 5 ? (
                      <span className="text-[8px] font-mono font-bold text-amber-400 px-1 border border-amber-900 bg-amber-950/30 rounded uppercase tracking-wide">MAX</span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-emerald-500/80 px-1 border border-emerald-950/40 bg-emerald-950/10 rounded uppercase tracking-wide">READY</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scoring & Controls Help Deck */}
        <div className="mt-2.5 pt-1.5 border-t border-emerald-950/50 text-emerald-400/75 text-[10px] font-mono flex flex-col gap-1 select-none font-medium shrink-0">
          <div className="text-cyan-300 font-bold text-[10px]">🕹️ 操作手順 (Flight Manual):</div>
          <div className="grid grid-cols-1 gap-1 text-[9px] bg-emerald-950/25 p-1.5 rounded border border-emerald-900/40">
            <div className="text-emerald-300 font-bold text-center border-b border-emerald-950 pb-1 mb-1">🕹️ WASD または 矢印キー で直感的な8方向移動！</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <div><span className="bg-emerald-950 px-1 border border-emerald-800 rounded font-semibold text-amber-400 leading-none">左クリック</span> 爆弾投下</div>
              <div><span className="bg-emerald-950 px-1 border border-emerald-800 rounded leading-none">WASD/矢印</span> 移動操作</div>
              <div><span className="bg-emerald-950 px-1 border border-emerald-800 rounded leading-none">[1, 2, 3]</span> 兵装切換</div>
              <div><span className="bg-emerald-950 px-1 border border-emerald-800 rounded leading-none">P キー</span> 一時停止</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
