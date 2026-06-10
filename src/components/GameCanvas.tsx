import React, { useRef, useEffect, useState } from 'react';
import { Player, Enemy, Bomb, Explosion, Particle, Projectile, Item } from '../types';
import * as audio from '../utils/audio';

interface GameCanvasProps {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  enemies: Enemy[];
  setEnemies: React.Dispatch<React.SetStateAction<Enemy[]>>;
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  bombs: Bomb[];
  setBombs: React.Dispatch<React.SetStateAction<Bomb[]>>;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setSweepAngle: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: () => void;
  gameStarted: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  player,
  setPlayer,
  enemies,
  setEnemies,
  items,
  setItems,
  bombs,
  setBombs,
  isPaused,
  isGameOver,
  score,
  setScore,
  setSweepAngle,
  onGameOver,
  gameStarted,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core internal state to prevent React render locks in high-speed RAF loop
  const stateRef = useRef({
    player: { ...player },
    enemies: [] as Enemy[],
    bombs: [] as Bomb[],
    explosions: [] as Explosion[],
    particles: [] as Particle[],
    projectiles: [] as Projectile[],
    items: [] as Item[],
    keys: {} as Record<string, boolean>,
    mouse: { x: 0, y: 0, isDown: false, inside: false },
    camera: { x: 0, y: 0 },
    sweepAngle: 0,
    dimensions: { width: 680, height: 500 },
    gameStarted: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    wave: 1,
    waveProgress: 0,
    time: 0,
    combo: 0,
    comboTimer: 0,
  });

  // Sync prop changes into state references
  useEffect(() => {
    stateRef.current.player = player;
  }, [player]);

  useEffect(() => {
    stateRef.current.isPaused = isPaused;
    stateRef.current.isGameOver = isGameOver;
    stateRef.current.gameStarted = gameStarted;
  }, [isPaused, isGameOver, gameStarted]);

  // Keep components lists in sync periodically
  useEffect(() => {
    stateRef.current.enemies = enemies;
    stateRef.current.items = items;
    stateRef.current.bombs = bombs;
  }, []); // Initial load only, then handled inside raf

  // Handle Resize beautifully
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const currentWidth = Math.max(280, Math.floor(rect.width));
      const currentHeight = Math.max(240, Math.floor(rect.height));

      canvas.width = currentWidth;
      canvas.height = currentHeight;
      stateRef.current.dimensions = { width: currentWidth, height: currentHeight };
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // initial invocation

    // Set up brief delay to repeat and ensure frame bounds stabilize
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // Listen for keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      stateRef.current.keys[k] = true;
      stateRef.current.keys[e.key] = true; // raw key as well for arrows/Shift

      // Weapon shorthand numeric switches
      if (e.key === '1') {
        setPlayer(prev => ({ ...prev, weapon: 'standard' }));
      } else if (e.key === '2') {
        setPlayer(prev => ({ ...prev, weapon: 'heavy' }));
      } else if (e.key === '3') {
        setPlayer(prev => ({ ...prev, weapon: 'guided' }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      stateRef.current.keys[k] = false;
      stateRef.current.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setPlayer]);

  // Handle Canvas Mouse Actions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    stateRef.current.mouse.x = e.clientX - rect.left;
    stateRef.current.mouse.y = e.clientY - rect.top;
    stateRef.current.mouse.inside = true;
  };

  const handleMouseEnter = () => {
    stateRef.current.mouse.inside = true;
  };

  const handleMouseLeave = () => {
    stateRef.current.mouse.inside = false;
    stateRef.current.mouse.isDown = false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) { // left click
      stateRef.current.mouse.isDown = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      stateRef.current.mouse.isDown = false;
    }
  };

  // Safe Bomb-Drop Spawner Helper
  const triggerBombDrop = () => {
    const s = stateRef.current;
    if (s.player.reloadTimer > 0) return; // on cooldown

    // Cooldown lookup (decreases with reloadTime upgrade leveling)
    // Cooldown is represented in frames. Lv 1: 35 frames (~0.6s), Lv 5: 15 frames (~0.25s)
    const cooldownFrames = Math.max(12, 42 - s.player.upgradeLevels.reloadTime * 6);
    s.player.reloadTimer = cooldownFrames;

    const bombId = Math.random().toString(36).substring(2, 9);
    const bombType = s.player.weapon;

    // Check weapon ammunition
    if (bombType === 'heavy') {
      if (s.player.ammo.heavy <= 0) {
        audio.playAlarm();
        return;
      }
      setPlayer(prev => ({ ...prev, ammo: { ...prev.ammo, heavy: prev.ammo.heavy - 1 } }));
    } else if (bombType === 'guided') {
      if (s.player.ammo.guided <= 0) {
        audio.playAlarm();
        return;
      }
      setPlayer(prev => ({ ...prev, ammo: { ...prev.ammo, guided: prev.ammo.guided - 1 } }));
    }

    // Determine target location.
    // If mouse is inside canvas, drop at mouse position, taking altitude and world cords in mind.
    // Otherwise, drop directly in front of the aircraft's cruising trajectory.
    let tx = s.player.x;
    let ty = s.player.y;

    if (s.mouse.inside) {
      // Mouse cursor relative to airplane screen coordinates
      tx = s.camera.x + s.mouse.x;
      ty = s.camera.y + s.mouse.y;
    } else {
      // 180px in front of aircraft
      tx = s.player.x + Math.cos(s.player.angle) * 180;
      ty = s.player.y + Math.sin(s.player.angle) * 180;
    }

    // High fidelity bomb object
    // Speed increases standard velocities, Damage scales with upgrades
    const damageMultiplier = 1 + (s.player.upgradeLevels.bombDamage - 1) * 0.35;
    const baseDamage = bombType === 'heavy' ? 250 : bombType === 'guided' ? 80 : 70;
    const finalDamage = baseDamage * damageMultiplier;

    const baseRadius = bombType === 'heavy' ? 140 : bombType === 'guided' ? 55 : 65;
    const finalRadius = baseRadius * (1 + (s.player.upgradeLevels.radarRange * 0.05)); // radar range also boosts slightly splash

    const newBomb: Bomb = {
      id: bombId,
      x: s.player.x,
      y: s.player.y,
      startX: s.player.x,
      startY: s.player.y,
      targetX: tx,
      targetY: ty,
      angle: Math.atan2(ty - s.player.y, tx - s.player.x),
      speed: 6.5,
      currentHeight: 100, // drops from 100 altitude units down to sea (0)
      maxHeight: 100,
      damage: finalDamage,
      radius: finalRadius,
      type: bombType,
      duration: 38, // frames to splash down
      elapsed: 0,
      splashRadius: finalRadius,
      isDetonated: false,
    };

    s.bombs.push(newBomb);
    setBombs([...s.bombs]);
    audio.playBombDrop();
  };

  // Secondary simulation loop
  useEffect(() => {
    let animationFrameId: number;

    const updateWorld = () => {
      const worldLim = 2800;
      const s = stateRef.current;
      if (!s.gameStarted || s.isPaused || s.isGameOver) {
        animationFrameId = requestAnimationFrame(updateWorld);
        return;
      }

      s.time++;

      // 1. COMBAT / COOLDOWNS DECREMENT
      if (s.player.reloadTimer > 0) {
        s.player.reloadTimer--;
      }

      // 2. INPUT DETECTION & PLANE PHYSICS
      // Simple and extremely responsive 8-directional movement:
      let moveX = 0;
      let moveY = 0;

      if (s.keys['w'] || s.keys['W'] || s.keys['arrowup'] || s.keys['ArrowUp']) moveY -= 1;
      if (s.keys['s'] || s.keys['S'] || s.keys['arrowdown'] || s.keys['ArrowDown']) moveY += 1;
      if (s.keys['a'] || s.keys['A'] || s.keys['arrowleft'] || s.keys['ArrowLeft']) moveX -= 1;
      if (s.keys['d'] || s.keys['D'] || s.keys['arrowright'] || s.keys['ArrowRight']) moveX += 1;

      const baseMaxSpeed = s.player.maxSpeed;
      // Slightly scale with engine speed ratio
      const speedUpgradeFactor = 1 + (s.player.upgradeLevels.maxFuel - 1) * 0.05; // slightly faster as fuel efficiency grows
      const targetMaxSpeed = baseMaxSpeed * speedUpgradeFactor;
      
      let ax = 0;
      let ay = 0;

      if (moveX !== 0 || moveY !== 0) {
        // Normalize vector
        const length = Math.hypot(moveX, moveY);
        const dx = (moveX / length) * targetMaxSpeed;
        const dy = (moveY / length) * targetMaxSpeed;

        // Snappy transition towards target velocities
        ax = (dx - s.player.vx) * 0.35;
        ay = (dy - s.player.vy) * 0.35;

        // Visual banking / orientation rotation
        s.player.targetAngle = Math.atan2(dy, dx);
      } else {
        // High-damping braking when keys are released
        ax = -s.player.vx * 0.32;
        ay = -s.player.vy * 0.32;
      }

      // Smooth rotate animation
      let angleDiff = s.player.targetAngle - s.player.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      s.player.angle += angleDiff * 0.28; // Snappy visual turn

      // Update velocities
      s.player.vx += ax;
      s.player.vy += ay;

      // Fuel decay during flight (scales with engine load)
      let fuelConsumption = 0.035;
      if (Math.hypot(ax, ay) > 0) fuelConsumption = 0.07; // high burn inside burner throttle
      // Decrease base fuel depletion slightly based on maxFuel upgrade levels
      const fuelEfficiencyFactor = 1 - (s.player.upgradeLevels.maxFuel - 1) * 0.08;
      s.player.fuel = Math.max(0, s.player.fuel - fuelConsumption * fuelEfficiencyFactor);

      if (s.player.fuel <= 0) {
        // Damage due to engine cutout
        s.player.health = Math.max(0, s.player.health - 0.15);
        if (s.player.health <= 0) {
          s.isGameOver = true;
          onGameOver();
        }
      }

      // Apply drag
      s.player.vx *= 0.965;
      s.player.vy *= 0.965;

      // Limit speed speed
      const planeSpeed = Math.hypot(s.player.vx, s.player.vy);
      if (planeSpeed > s.player.maxSpeed) {
        s.player.vx = (s.player.vx / planeSpeed) * s.player.maxSpeed;
        s.player.vy = (s.player.vy / planeSpeed) * s.player.maxSpeed;
      }

      // Update coordinate positions
      s.player.x += s.player.vx;
      s.player.y += s.player.vy;

      // Boundaries clamp into a giant ocean map size (e.g. 2800 x 2800)
      if (s.player.x < 0) { s.player.x = 0; s.player.vx = -s.player.vx * 0.5; }
      if (s.player.x > worldLim) { s.player.x = worldLim; s.player.vx = -s.player.vx * 0.5; }
      if (s.player.y < 0) { s.player.y = 0; s.player.vy = -s.player.vy * 0.5; }
      if (s.player.y > worldLim) { s.player.y = worldLim; s.player.vy = -s.player.vy * 0.5; }

      // Adjust engine audio volume
      audio.playEngineSound(planeSpeed / s.player.maxSpeed);

      // Handle bombing hold click check (攻撃手段をスペースキーから左クリックに変更)
      if (s.mouse.isDown && s.mouse.inside) {
        triggerBombDrop();
      }

      // 3. EXPLOSIVE SONAR ROTATIONSWEEPS
      const radarRangePixels = 400 + s.player.upgradeLevels.radarRange * 90; // matches radar upgrades
      s.sweepAngle += 0.038;
      if (s.sweepAngle >= Math.PI * 2) {
        s.sweepAngle -= Math.PI * 2;
        audio.playSonarPing();
      }
      setSweepAngle(s.sweepAngle);

      // Camera scrolls smoothly behind aircraft
      s.camera.x = s.player.x - s.dimensions.width / 2;
      s.camera.y = s.player.y - s.dimensions.height / 2;

      // 4. BOMBS INERTIA / MOTION & SPLASH DETECTION
      s.bombs = s.bombs.filter((bomb) => {
        bomb.elapsed++;

        // Guided Torpedo Homing Logic (音響誘導魚雷の追従補正)
        if (bomb.type === 'guided') {
          let nearestEnemy: Enemy | null = null;
          let minDist = 350; // 水中誘導の感知範囲
          s.enemies.forEach((enemy) => {
            if (enemy.isDead) return;
            // 爆撃ターゲット座標と敵の距離
            const d = Math.hypot(enemy.x - bomb.targetX, enemy.y - bomb.targetY);
            if (d < minDist) {
              minDist = d;
              nearestEnemy = enemy;
            }
          });

          if (nearestEnemy) {
            // 爆弾の落下着地点（targetX, targetY）を敵の方向へ滑らかに誘導
            const homingStrength = 0.08;
            bomb.targetX += (nearestEnemy.x - bomb.targetX) * homingStrength;
            bomb.targetY += (nearestEnemy.y - bomb.targetY) * homingStrength;
            bomb.angle = Math.atan2(bomb.targetY - bomb.y, bomb.targetX - bomb.x);
          }
        }

        // Visual drop simulation.
        // The bomb starts high, glides towards target coordinates, and height falls to 0.
        const prog = bomb.elapsed / bomb.duration;
        bomb.currentHeight = 100 * (1 - prog);

        // Movement with inertia (carries plane's speed vector + horizontal speed)
        // Lerp coordinates based on linear slide from start node to target coordinate
        bomb.x = bomb.startX + (bomb.targetX - bomb.startX) * prog;
        bomb.y = bomb.startY + (bomb.targetY - bomb.startY) * prog;

        if (bomb.elapsed >= bomb.duration) {
          // Detonation triggers!
          bomb.isDetonated = true;

          // Push new explosion wave visualizer
          const explosionColor = bomb.type === 'heavy' ? 'rgba(239, 68, 68, 0.7)' : bomb.type === 'guided' ? 'rgba(6, 182, 212, 0.7)' : 'rgba(16, 185, 129, 0.7)';
          s.explosions.push({
            id: Math.random().toString(),
            x: bomb.x,
            y: bomb.y,
            maxRadius: bomb.radius,
            currentRadius: 10,
            color: explosionColor,
            duration: bomb.type === 'heavy' ? 24 : 16,
            elapsed: 0,
            type: bomb.type === 'heavy' ? 'heavy' : bomb.type === 'guided' ? 'wave' : 'standard',
          });

          audio.playExplosion(bomb.type === 'heavy');

          // Smoke bubbles particles
          for (let p = 0; p < 24; p++) {
            const pAngle = Math.random() * Math.PI * 2;
            const pSpeed = Math.random() * 4.5 + 1.5;
            s.particles.push({
              id: Math.random().toString(),
              x: bomb.x,
              y: bomb.y,
              vx: Math.cos(pAngle) * pSpeed,
              vy: Math.sin(pAngle) * pSpeed,
              color: bomb.type === 'heavy' ? '#f97316' : '#10b981',
              radius: Math.random() * 5 + 2,
              alpha: 1.0,
              duration: Math.random() * 20 + 15,
              elapsed: 0,
              type: 'bubble',
            });
          }

          // Damage evaluation
          s.enemies.forEach((enemy) => {
            if (enemy.isDead) return;
            const dist = Math.hypot(enemy.x - bomb.x, enemy.y - bomb.y);
            if (dist <= bomb.radius) {
              // Depth-charge mechanics:
              // Standard bombs damage Depth 0 (surface) for 100%, Depth 1 (submerged) for 50%, Depth 2 (deep) for 15%.
              // Heavy Depth Charges damage Depth 0, 1, and 2 for a full 100% impact!
              // Guided Sonic Torpedoes damage Depth 0 and 1 for 100%, and Depth 2 for 50%.
              let coverage = 1.0;
              if (bomb.type === 'standard') {
                if (enemy.depth === 1) coverage = 0.45;
                if (enemy.depth === 2) coverage = 0.10;
              } else if (bomb.type === 'guided') {
                if (enemy.depth === 2) coverage = 0.45;
              }

              const finalDamageApplied = bomb.damage * coverage;
              enemy.health = Math.max(0, enemy.health - finalDamageApplied);

              // 浮遊戦術テキスト（個別爆撃の戦略的な効果が日本語で一目でわかるように）
              let popText = `${Math.round(finalDamageApplied)} DMG`;
              let popColor = '#ffffff';

              if (bomb.type === 'heavy') {
                if (enemy.depth === 2) {
                  popText = `💥深海爆撃! 特効 ${Math.round(finalDamageApplied)} DMG`;
                  popColor = '#f87171'; // 深海での特効
                } else {
                  popText = `💣巨弾直撃! ${Math.round(finalDamageApplied)} DMG`;
                  popColor = '#fb923c';
                }
              } else if (bomb.type === 'guided') {
                popText = `🎯誘導探知! ${Math.round(finalDamageApplied)} DMG`;
                popColor = '#22d3ee';
              } else {
                if (enemy.depth === 0 || enemy.depth === 1) {
                  popText = `🎯表層直撃! ${Math.round(finalDamageApplied)} DMG`;
                  popColor = '#4ade80';
                } else {
                  popText = `💧深海減衰(10%) ${Math.round(finalDamageApplied)} DMG`;
                  popColor = '#94a3b8';
                }
              }

              // ダメージテキストエフェクトをパーティクルとしてプッシュ
              s.particles.push({
                id: Math.random().toString(),
                x: enemy.x + (Math.random() - 0.5) * 12,
                y: enemy.y - 12,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -1.2 - Math.random() * 0.8, // ゆっくり浮上
                color: popColor,
                radius: 10,
                alpha: 1.0,
                duration: 55,
                elapsed: 0,
                type: 'text',
                text: popText,
              });

              // Flash impact score particles
              s.particles.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y - 15,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -Math.random() * 2 - 1,
                color: '#ef4444',
                radius: 4,
                alpha: 1.0,
                duration: 25,
                elapsed: 0,
                type: 'debris',
              });

              // Check if dead
              if (enemy.health <= 0) {
                enemy.isDead = true;

                // 撃破完了の文字表示（緑/金色のキラキラ）
                s.particles.push({
                  id: Math.random().toString(),
                  x: enemy.x,
                  y: enemy.y - 28,
                  vx: 0,
                  vy: -1.0,
                  color: '#fbbf24', // ゴールド
                  radius: 12,
                  alpha: 1.0,
                  duration: 65,
                  elapsed: 0,
                  type: 'text',
                  text: `✨ 駆除完了! +${enemy.scoreValue}pts ✨`,
                });

                // Add score and coins
                s.score += enemy.scoreValue;
                s.player.coins += enemy.coinValue;
                setScore(s.score);

                // --- AUTO-RANDOM UPGRADE ENGINE ---
                const upgradesToAttempt: (keyof Player['upgradeLevels'])[] = ['radarRange', 'maxFuel', 'maxArmor', 'reloadTime', 'bombDamage'];
                const validUpgrades = upgradesToAttempt.filter(key => s.player.upgradeLevels[key] < 5);

                let upgradeAmountText = '';
                // 50% chance of random upgrade on enemy kill
                if (Math.random() < 0.50) {
                  if (validUpgrades.length > 0) {
                    const chosenKey = validUpgrades[Math.floor(Math.random() * validUpgrades.length)];
                    const nextLvl = s.player.upgradeLevels[chosenKey] + 1;
                    s.player.upgradeLevels[chosenKey] = nextLvl;

                    let jpLabel = '';
                    if (chosenKey === 'maxArmor') {
                      jpLabel = '装甲強化';
                      s.player.maxHealth = 100 + (nextLvl - 1) * 35;
                      s.player.health = s.player.maxHealth; // Full instant repair!
                    } else if (chosenKey === 'maxFuel') {
                      jpLabel = '燃料タンク拡張';
                      s.player.maxFuel = 100 + (nextLvl - 1) * 40;
                      s.player.fuel = s.player.maxFuel; // Full instant refuel!
                    } else if (chosenKey === 'radarRange') {
                      jpLabel = '索敵レーダー';
                    } else if (chosenKey === 'reloadTime') {
                      jpLabel = '装填時間短縮';
                    } else if (chosenKey === 'bombDamage') {
                      jpLabel = '全爆弾威力強化';
                    }

                    upgradeAmountText = `⚡ ${jpLabel} UP (Lv.${nextLvl}) ⚡`;
                    audio.playUpgrade();

                    setPlayer(prev => ({
                      ...prev,
                      upgradeLevels: {
                        ...prev.upgradeLevels,
                        [chosenKey]: nextLvl,
                      },
                      maxHealth: s.player.maxHealth,
                      health: s.player.health,
                      maxFuel: s.player.maxFuel,
                      fuel: s.player.fuel,
                      coins: prev.coins + enemy.coinValue,
                      score: Math.max(prev.score, s.score),
                    }));
                  } else {
                    // All upgrades MAX, give full combat repair and refuel!
                    s.player.health = s.player.maxHealth;
                    s.player.fuel = s.player.maxFuel;
                    upgradeAmountText = `✨ 極限状態：装甲・燃料完全復旧！ ✨`;
                    audio.playUpgrade();

                    setPlayer(prev => ({
                      ...prev,
                      health: s.player.maxHealth,
                      fuel: s.player.maxFuel,
                      coins: prev.coins + enemy.coinValue,
                      score: Math.max(prev.score, s.score)
                    }));
                  }
                } else {
                  // regular score & coins sync
                  setPlayer(prev => ({
                    ...prev,
                    coins: prev.coins + enemy.coinValue,
                    score: Math.max(prev.score, s.score)
                  }));
                }

                if (upgradeAmountText) {
                  s.particles.push({
                    id: Math.random().toString(),
                    x: enemy.x,
                    y: enemy.y - 48,
                    vx: 0,
                    vy: -1.2,
                    color: '#34d399', // highly visible emerald color
                    radius: 12,
                    alpha: 1.0,
                    duration: 100,
                    elapsed: 0,
                    type: 'text',
                    text: upgradeAmountText,
                  });
                }

                // Spawn cool particles on death
                for (let k = 0; k < 12; k++) {
                  s.particles.push({
                    id: Math.random().toString(),
                    x: enemy.x,
                    y: enemy.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    color: '#dc2626',
                    radius: Math.random() * 3.5 + 1.5,
                    alpha: 1.0,
                    duration: 30,
                    elapsed: 0,
                    type: 'debris',
                  });
                }

                // Chance to drop interactive pick-ups (fuel tank, repair kit, ammunition packs)
                const rnd = Math.random();
                if (rnd < 0.45) {
                  let itemType: Item['type'] = 'coin';
                  let amt = enemy.coinValue * 1.5;
                  if (rnd < 0.12) {
                    itemType = 'fuel';
                    amt = 35; // replenishes 35 fuel
                  } else if (rnd < 0.22) {
                    itemType = 'armor';
                    amt = 25; // repairs 25 armor
                  } else if (rnd < 0.3) {
                    itemType = 'heavy_ammo';
                    amt = 4;
                  } else if (rnd < 0.35) {
                    itemType = 'guided_ammo';
                    amt = 3;
                  }

                  s.items.push({
                    id: Math.random().toString(),
                    x: enemy.x,
                    y: enemy.y,
                    type: itemType,
                    amount: amt,
                    radius: 12,
                    pulseTimer: 0,
                  });
                  setItems([...s.items]);
                }
              }
            }
          });

          return false; // delete from listing
        }
        return true;
      });
      setBombs([...s.bombs]);

      // 5. UPDATE ACTIVE EXPLOSIONS VISUALS
      s.explosions = s.explosions.filter((exp) => {
        exp.elapsed++;
        const ratio = exp.elapsed / exp.duration;
        exp.currentRadius = exp.maxRadius * Math.sin(ratio * Math.PI / 2);
        return exp.elapsed < exp.duration;
      });

      // 6. UPDATE SCATTERED PARTICLES & BUBBLES
      s.particles = s.particles.filter((p) => {
        p.elapsed++;
        p.x += p.vx;
        p.y += p.vy;

        // Frictions friction slowing down bubble debris
        p.vx *= 0.98;
        p.vy *= 0.98;

        p.alpha = 1 - p.elapsed / p.duration;
        return p.elapsed < p.duration;
      });

      // 7. ENEMY BEHAVIOR & SHIELDS SIMULATION
      s.enemies.forEach((enemy) => {
        if (enemy.isDead) return;

        enemy.behaviorTimer++;
        enemy.animationFrame = (enemy.animationFrame + 0.15) % 8;

        // Smooth swimming motion
        // Apply tiny random offsets so motion looks very floaty and biological
        if (enemy.behaviorTimer % 60 === 0) {
          const swimAngle = Math.random() * Math.PI * 2;
          enemy.vx = Math.cos(swimAngle) * enemy.speed;
          enemy.vy = Math.sin(swimAngle) * enemy.speed;
        }

        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Wrap around boundaries smoothly
        if (enemy.x < -100) enemy.x = worldLim + 100;
        if (enemy.x > worldLim + 100) enemy.x = -100;
        if (enemy.y < -100) enemy.y = worldLim + 100;
        if (enemy.y > worldLim + 100) enemy.y = -100;

        // Enemy weapons fire (if inside range of cruiser plane)
        const distToPlayer = Math.hypot(enemy.x - s.player.x, enemy.y - s.player.y);

        // Dynamic Sonar scanning: flare up visibility of deep-sea items/creatures when radar sweeps past
        const radarRangePixels = 400 + (s.player.upgradeLevels?.radarRange || 1) * 90;
        if (distToPlayer <= radarRangePixels) {
          const angleToEnemy = Math.atan2(enemy.y - s.player.y, enemy.x - s.player.x);
          let normSweep = s.sweepAngle % (Math.PI * 2);
          if (normSweep < 0) normSweep += Math.PI * 2;
          let normEnemy = angleToEnemy % (Math.PI * 2);
          if (normEnemy < 0) normEnemy += Math.PI * 2;
          
          let diff = Math.abs(normSweep - normEnemy);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          
          if (diff < 0.28) { // Sweeping hit width
            enemy.detectedAlpha = 1.0; // Dynamic sonar ping detection!
          }
        }
        if (enemy.detectedAlpha > 0.2) {
          enemy.detectedAlpha -= 0.006; // fade out naturally
        }
        
        // Dynamic shooter mechanics based on monster category
        if (distToPlayer < 450) {
          if (enemy.shootCooldown > 0) {
            enemy.shootCooldown--;
          } else {
            // Deploy projectile or bite attack
            enemy.shootCooldown = 140 + Math.random() * 80; // delay next fire

            if (enemy.type === 'jellyfish') {
              // Rapid floating electrical projectile (glows yellow/aqua)
              const pAngle = Math.atan2(s.player.y - enemy.y, s.player.x - enemy.x);
              s.projectiles.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(pAngle) * 3.5,
                vy: Math.sin(pAngle) * 3.5,
                radius: 5,
                damage: 12,
                color: '#fbbf24', // golden yellow sparks
                duration: 150,
                elapsed: 0,
              });
              audio.playShoot();
            } else if (enemy.type === 'squid') {
              // Fires dark purple/black blind ink projectile
              const pAngle = Math.atan2(s.player.y - enemy.y, s.player.x - enemy.x);
              s.projectiles.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(pAngle) * 2.8,
                vy: Math.sin(pAngle) * 2.8,
                radius: 8,
                damage: 15,
                color: '#a855f7', // ink purple
                duration: 120,
                elapsed: 0,
              });
              audio.playShoot();
            } else if (enemy.type === 'shark') {
              // Shark leaps to surface and charges at incredible speed!
              enemy.depth = 0; // surfaces
              enemy.speed = 4.2;
              const pAngle = Math.atan2(s.player.y - enemy.y, s.player.x - enemy.x);
              enemy.vx = Math.cos(pAngle) * enemy.speed;
              enemy.vy = Math.sin(pAngle) * enemy.speed;

              // Shark bite collision check occurs below
            } else if (enemy.type === 'leviathan') {
              // Boss shoots 3 huge energy bubbles or a homing bolt!
              const targetAngle = Math.atan2(s.player.y - enemy.y, s.player.x - enemy.x);
              for (let dev = -1; dev <= 1; dev++) {
                const angle = targetAngle + dev * 0.25;
                s.projectiles.push({
                  id: Math.random().toString(),
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(angle) * 4.0,
                  vy: Math.sin(angle) * 4.0,
                  radius: 7.5,
                  damage: 22,
                  color: '#fb7185', // aggressive rose crimson glow
                  duration: 200,
                  elapsed: 0,
                });
              }
              audio.playShoot();
            }
          }
        }

        // Bite / Contact Collision Check
        // If enemy surfaces (depth == 0) and collides with plane, cause massive armor tear!
        if (enemy.depth === 0 && distToPlayer < (enemy.radius + 18)) {
          // Bite effect cooling
          if (enemy.behaviorTimer % 30 === 0) {
            const damageApplied = enemy.type === 'shark' ? 18 : enemy.type === 'leviathan' ? 30 : 8;
            s.player.health = Math.max(0, s.player.health - damageApplied);
            audio.playTakeDamage();

            // Display visual impact particles
            for (let d = 0; d < 8; d++) {
              s.particles.push({
                id: Math.random().toString(),
                x: s.player.x,
                y: s.player.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#f43f5e',
                radius: 3,
                alpha: 1.0,
                duration: 22,
                elapsed: 0,
                type: 'fire',
              });
            }

            if (s.player.health <= 0) {
              s.isGameOver = true;
              onGameOver();
            }
          }
        }
      });
      // Filter out dead enemies
      s.enemies = s.enemies.filter((enemy) => !enemy.isDead);
      setEnemies([...s.enemies]);

      // 8. UPDATE ACTIVE HOSTILE PROJECTILES
      s.projectiles = s.projectiles.filter((proj) => {
        proj.elapsed++;
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Collision sensor with flying airplane
        const dist = Math.hypot(proj.x - s.player.x, proj.y - s.player.y);
        if (dist < (proj.radius + 14)) {
          s.player.health = Math.max(0, s.player.health - proj.damage);
          audio.playTakeDamage();

          // Spark particle damage trail
          for (let p = 0; p < 6; p++) {
            s.particles.push({
              id: Math.random().toString(),
              x: s.player.x,
              y: s.player.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: proj.color,
              radius: 2.5,
              alpha: 1.0,
              duration: 20,
              elapsed: 0,
              type: 'smoke',
            });
          }

          if (s.player.health <= 0) {
            s.isGameOver = true;
            onGameOver();
          }

          return false; // remove
        }

        return proj.elapsed < proj.duration;
      });

      // 9. UPDATE INTERACTIVE FLOATING ITEMS / COINS PROXIMITY
      s.items = s.items.filter((item) => {
        item.pulseTimer += 0.05;

        // Proximity suction / collection check
        const dist = Math.hypot(item.x - s.player.x, item.y - s.player.y);
        if (dist < 32) {
          // Play collection chime
          if (item.type === 'coin') {
            audio.playCoin();
            s.player.coins += item.amount;
            setPlayer(prev => ({ ...prev, coins: prev.coins + item.amount }));
          } else {
            audio.playCoin(); // alternative sound feel
            if (item.type === 'fuel') {
              s.player.fuel = Math.min(s.player.maxFuel, s.player.fuel + item.amount);
              setPlayer(prev => ({ ...prev, fuel: Math.min(prev.maxFuel, prev.fuel + item.amount) }));
            } else if (item.type === 'armor') {
              s.player.health = Math.min(s.player.maxHealth, s.player.health + item.amount);
              setPlayer(prev => ({ ...prev, health: Math.min(prev.maxHealth, prev.health + item.amount) }));
            } else if (item.type === 'heavy_ammo') {
              s.player.ammo.heavy += item.amount;
              setPlayer(prev => ({ ...prev, ammo: { ...prev.ammo, heavy: prev.ammo.heavy + item.amount } }));
            } else if (item.type === 'guided_ammo') {
              s.player.ammo.guided += item.amount;
              setPlayer(prev => ({ ...prev, ammo: { ...prev.ammo, guided: prev.ammo.guided + item.amount } }));
            }
          }

          return false; // consumed
        }

        return true;
      });
      setItems([...s.items]);

      // 10. SPAWN ENEMIES & ITEMS SPAWNERS OVER TIME
      // Maintain proper ocean ecosystem: minimum density of enemies
      if (s.time % 100 === 0 && s.enemies.length < 18 + s.wave * 3) {
        // Spawn creature far away from player coordinates to avoid unfair pops
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 450 + Math.random() * 550;
        const ex = s.player.x + Math.cos(spawnAngle) * spawnDist;
        const ey = s.player.y + Math.sin(spawnAngle) * spawnDist;

        // Ensure coords within map limits
        const exClamped = Math.max(50, Math.min(worldLim - 50, ex));
        const eyClamped = Math.max(50, Math.min(worldLim - 50, ey));

        // Randomly select type based on current wave level
        const roll = Math.random();
        let name = 'ミュータントクラゲ (Mutant Jellyfish)';
        let type: Enemy['type'] = 'jellyfish';
        let hp = 45;
        let depth = 1; // submerged
        let pRadius = 16;
        let eSpeed = 0.6;
        let rewardScore = 120;
        let rewardCoins = 25;

        if (roll < 0.35) {
          // Jellyfish
        } else if (roll < 0.70) {
          name = '狂乱シャーク (Mad Shark)';
          type = 'shark';
          hp = 85;
          depth = 1; // starts submerged, can jump surface
          pRadius = 20;
          eSpeed = 1.35;
          rewardScore = 240;
          rewardCoins = 45;
        } else if (s.wave >= 2 && roll < 0.92) {
          name = '巨大ダイオウイカ (Colossal Kraken)';
          type = 'squid';
          hp = 220;
          depth = 2; // Deep Sea! ONLY on special sonar scans or shadows
          pRadius = 32;
          eSpeed = 0.55;
          rewardScore = 550;
          rewardCoins = 90;
        } else if (s.wave >= 3 && roll < 1.0) {
          name = '古代リヴァイアサン (Ancient Leviathan)';
          type = 'leviathan';
          hp = 650;
          depth = 1;
          pRadius = 45;
          eSpeed = 0.75;
          rewardScore = 1500;
          rewardCoins = 250;
        }

        s.enemies.push({
          id: Math.random().toString(36).substring(2, 9),
          x: exClamped,
          y: eyClamped,
          vx: (Math.random() - 0.5) * eSpeed,
          vy: (Math.random() - 0.5) * eSpeed,
          type,
          name,
          health: hp,
          maxHealth: hp,
          depth,
          radius: pRadius,
          speed: eSpeed,
          scoreValue: rewardScore,
          coinValue: rewardCoins,
          animationFrame: Math.floor(Math.random() * 8),
          shootCooldown: Math.random() * 100,
          behaviorTimer: Math.floor(Math.random() * 100),
          detectedAlpha: 0.2,
          isDead: false,
        });
        setEnemies([...s.enemies]);
      }

      // Automatically spawn oil drums or ammo crates periodically
      if (s.time % 320 === 0 && s.items.length < 8) {
        const itemAngle = Math.random() * Math.PI * 2;
        const itemDist = 300 + Math.random() * 450;
        const ix = Math.max(50, Math.min(worldLim - 50, s.player.x + Math.cos(itemAngle) * itemDist));
        const iy = Math.max(50, Math.min(worldLim - 50, s.player.y + Math.sin(itemAngle) * itemDist));

        const types: Item['type'][] = ['fuel', 'armor', 'heavy_ammo', 'guided_ammo'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        let amt = 25;
        if (chosenType === 'heavy_ammo') amt = 3;
        if (chosenType === 'guided_ammo') amt = 2;

        s.items.push({
          id: Math.random().toString(),
          x: ix,
          y: iy,
          type: chosenType,
          amount: amt,
          radius: 12,
          pulseTimer: 0,
        });
        setItems([...s.items]);
      }

      // Update Waves system
      if (s.score > s.wave * 1200) {
        s.wave++;
        // Display nice notification or increase spawns
        audio.playUpgrade();
        s.particles.push({
          id: Math.random().toString(),
          x: s.player.x,
          y: s.player.y - 40,
          vx: 0,
          vy: -1.2,
          color: '#fbbf24', // high gold level notification font
          radius: 8,
          alpha: 1.0,
          duration: 90,
          elapsed: 0,
          type: 'debris',
        });
      }

      // 11. RENDERING PIPELINE (HTML5 Canvas drawing)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const width = canvas.width;
        const height = canvas.height;

        // Clear view
        ctx.clearRect(0, 0, width, height);

        // Map drawing relative to Camera coordinates
        const camX = s.camera.x;
        const camY = s.camera.y;

        // Draw Sea Color Background
        ctx.fillStyle = '#102520'; // deep ocean teal
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines representing tactical grid
        ctx.strokeStyle = '#122c26'; // faint dark grid
        ctx.lineWidth = 1.2;
        const gridGap = 160;
        const startX = Math.floor(camX / gridGap) * gridGap;
        const startY = Math.floor(camY / gridGap) * gridGap;

        for (let gx = startX; gx < startX + width + gridGap; gx += gridGap) {
          ctx.beginPath();
          ctx.moveTo(gx - camX, 0);
          ctx.lineTo(gx - camX, height);
          ctx.stroke();
        }
        for (let gy = startY; gy < startY + height + gridGap; gy += gridGap) {
          ctx.beginPath();
          ctx.moveTo(0, gy - camY);
          ctx.lineTo(width, gy - camY);
          ctx.stroke();
        }

        // Draw Map Boundaries
        ctx.strokeStyle = '#e11d48'; // critical limit line
        ctx.lineWidth = 3.5;
        ctx.strokeRect(0 - camX, 0 - camY, worldLim, worldLim);

        // Draw Wave ripples on water
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.05)';
        ctx.lineWidth = 1;
        for (let ri = startX; ri < startX + width + gridGap; ri += gridGap / 2) {
          const rippleOfs = Math.sin((s.time + ri) * 0.015) * 8;
          ctx.beginPath();
          ctx.moveTo(ri - camX, 0);
          ctx.lineTo(ri - camX + rippleOfs, height);
          ctx.stroke();
        }

        // DRAW ITEMS / POWERUPS floatings
        s.items.forEach((item) => {
          const rx = item.x - camX;
          const ry = item.y - camY;

          // Out-of-bounds skip
          if (rx < -50 || rx > width + 50 || ry < -50 || ry > height + 50) return;

          const pulse = Math.sin(item.pulseTimer) * 2;
          const finalRad = item.radius + pulse;

          // Item glow circle
          let color = '#3b82f6'; // Blue
          let label = 'AMMO';
          if (item.type === 'fuel') { color = '#f59e0b'; label = '⚡FUEL'; }
          else if (item.type === 'armor') { color = '#10b981'; label = '🔧KIT'; }
          else if (item.type === 'heavy_ammo') { color = '#ec4899'; label = '重爆薬'; }
          else if (item.type === 'guided_ammo') { color = '#06b6d4'; label = '誘導弾'; }
          else if (item.type === 'coin') { color = '#fbbf24'; label = 'GOLD'; }

          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(rx, ry, finalRad, 0, Math.PI * 2);
          ctx.fill();

          // Outer frame
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(rx, ry, finalRad + 3, 0, Math.PI * 2);
          ctx.stroke();

          // Label text
          ctx.fillStyle = '#ffffff';
          ctx.font = '8px monospace font-extrabold';
          ctx.textAlign = 'center';
          ctx.fillText(label, rx, ry + 2);
          ctx.restore();
        });

        // DRAW ENEMIES UNDERWATER (CREATURES)
        s.enemies.forEach((enemy) => {
          const rx = enemy.x - camX;
          const ry = enemy.y - camY;

          if (rx < -100 || rx > width + 100 || ry < -100 || ry > height + 100) return;

          ctx.save();

          // Evaluate depth visual styles.
          // Depth 0 (surface): Vivid colors, highly visible
          // Depth 1 (submerged): Clean, highly readable, with aqua indicators
          // Depth 2 (deep sea): Glowing neon rose lines, flaring bright on sonar sweep scans
          let drawAlpha = 1.0;
          let scaleSize = 1.0;

          if (enemy.depth === 1) {
            drawAlpha = 0.88;
            scaleSize = 0.95;
          } else if (enemy.depth === 2) {
            // Highly legible and shines during a direct sonar flash sweep
            drawAlpha = Math.max(0.65, enemy.detectedAlpha);
            scaleSize = 0.85;
          }

          ctx.globalAlpha = drawAlpha;

          // Move and animate creature drawing
          ctx.translate(rx, ry);

          // Draw tactical depth circles so the player can see and target enemies quickly!
          if (enemy.depth === 1) {
            ctx.save();
            ctx.strokeStyle = '#22d3ee'; // bright neon cyan/aqua
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, enemy.radius + 12, 0, Math.PI * 2);
            ctx.stroke();

            // Text tags
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('D-1 潜航', 0, -enemy.radius - 14);
            ctx.restore();
          } else if (enemy.depth === 2) {
            ctx.save();
            const pulseGlow = Math.max(0.4, enemy.detectedAlpha);
            ctx.strokeStyle = `rgba(244, 63, 94, ${pulseGlow})`; // glowing rose
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, enemy.radius + 15, 0, Math.PI * 2);
            ctx.stroke();

            // Crosshairs indicators
            ctx.strokeStyle = `rgba(244, 63, 94, ${pulseGlow * 0.7})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(-enemy.radius - 19, 0); ctx.lineTo(-enemy.radius - 11, 0);
            ctx.moveTo(enemy.radius + 11, 0); ctx.lineTo(enemy.radius + 19, 0);
            ctx.moveTo(0, -enemy.radius - 19); ctx.lineTo(0, -enemy.radius - 11);
            ctx.moveTo(0, enemy.radius + 11); ctx.lineTo(0, enemy.radius + 19);
            ctx.stroke();

            // Text tags for deep sea target
            ctx.fillStyle = `rgba(244, 63, 94, ${Math.max(0.7, pulseGlow)})`;
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('D-2 深海', 0, -enemy.radius - 17);
            ctx.restore();
          }

          const movingAngle = Math.atan2(enemy.vy, enemy.vx);
          ctx.rotate(movingAngle);
          ctx.scale(scaleSize, scaleSize);

          // Render based on Enemy Class type
          if (enemy.type === 'jellyfish') {
            // Draw floating translucent jellyfish dome
            const wiggle = Math.sin(enemy.animationFrame) * 4;
            ctx.fillStyle = 'rgba(6, 182, 212, 0.82)'; // electrical aqua cyans
            ctx.beginPath();
            ctx.arc(0, 0, enemy.radius, Math.PI, 0, false);
            ctx.fill();

            // Jellyfish tentacles
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.65)';
            ctx.lineWidth = 2;
            for (let t = -2; t <= 2; t++) {
              ctx.beginPath();
              ctx.moveTo(t * 4, 0);
              ctx.quadraticCurveTo(t * 4 + wiggle, 10, t * 5 + wiggle * 1.5, enemy.radius * 1.5);
              ctx.stroke();
            }

            // Central glow core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -2, 4, 0, Math.PI * 2);
            ctx.fill();

          } else if (enemy.type === 'shark') {
            // Sleek blue predator shark body
            ctx.fillStyle = '#1e3a8a'; // heavy shark navy
            ctx.beginPath();
            ctx.moveTo(enemy.radius * 1.3, 0); // nose
            ctx.quadraticCurveTo(0, -enemy.radius * 0.6, -enemy.radius, -enemy.radius * 0.2); // left wing flank
            ctx.lineTo(-enemy.radius * 1.2, -enemy.radius * 0.5); // tail fin upper
            ctx.lineTo(-enemy.radius, 0); // tail center
            ctx.lineTo(-enemy.radius * 1.2, enemy.radius * 0.5); // tail fin lower
            ctx.quadraticCurveTo(0, enemy.radius * 0.6, enemy.radius * 1.3, 0);
            ctx.closePath();
            ctx.fill();

            // Pectoral fins
            ctx.fillStyle = '#1e40af';
            ctx.beginPath();
            ctx.moveTo(0, -enemy.radius * 0.4);
            ctx.lineTo(-enemy.radius * 0.5, -enemy.radius * 1.2);
            ctx.lineTo(-enemy.radius * 0.2, -enemy.radius * 0.4);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, enemy.radius * 0.4);
            ctx.lineTo(-enemy.radius * 0.5, enemy.radius * 1.2);
            ctx.lineTo(-enemy.radius * 0.2, enemy.radius * 0.4);
            ctx.closePath();
            ctx.fill();

            // Gill slits
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(5, -6); ctx.lineTo(4, -2);
            ctx.moveTo(8, -6); ctx.lineTo(7, -2);
            ctx.stroke();

            // Angry glowing red eyes
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(10, -4, 2, 0, Math.PI * 2);
            ctx.arc(10, 4, 2, 0, Math.PI * 2);
            ctx.fill();

          } else if (enemy.type === 'squid') {
            // Kraken squid body and giant whipping arms
            ctx.fillStyle = '#781a1a'; // deep reddish tint
            ctx.beginPath();
            ctx.arc(0, 0, enemy.radius * 0.8, -Math.PI / 2, Math.PI / 2, true); // round head dome
            ctx.lineTo(-enemy.radius * 1.2, enemy.radius * 0.4);
            ctx.lineTo(-enemy.radius * 1.2, -enemy.radius * 0.4);
            ctx.closePath();
            ctx.fill();

            // Big yellow intelligent beast eye
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(-enemy.radius * 0.4, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-enemy.radius * 0.4, 0, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Reaching tentacles (wavy motion based on wiggle ticks)
            const wiggle = Math.sin(enemy.animationFrame * 0.8) * 5;
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 3.5;
            for (let t = -3; t <= 3; t++) {
              ctx.beginPath();
              ctx.moveTo(-enemy.radius * 1.2, t * 3.5);
              ctx.quadraticCurveTo(-enemy.radius * 1.8, t * 4 + wiggle, -enemy.radius * 2.5, t * 5 + wiggle * 2);
              ctx.stroke();
            }

          } else if (enemy.type === 'leviathan') {
            // Supreme Boss dragon visual structure
            ctx.fillStyle = '#0f172a'; // charcoal scale armor
            ctx.strokeStyle = '#ef4444'; // fiery outline veins
            ctx.lineWidth = 1.5;

            // Spiky head/back segments
            ctx.beginPath();
            ctx.moveTo(enemy.radius * 1.4, 0); // snout
            ctx.lineTo(enemy.radius * 0.7, -enemy.radius * 0.6); // horn
            ctx.lineTo(0, -enemy.radius * 0.5);
            ctx.lineTo(-enemy.radius * 0.6, -enemy.radius * 0.7); // back spike
            ctx.lineTo(-enemy.radius * 1.2, 0); // tail stem
            ctx.lineTo(-enemy.radius * 0.6, enemy.radius * 0.7);
            ctx.lineTo(0, enemy.radius * 0.5);
            ctx.lineTo(enemy.radius * 0.7, enemy.radius * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Massive whipping glowing tails
            const bodyWavy = Math.sin(enemy.animationFrame * 0.6) * 10;
            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.moveTo(-enemy.radius * 1.2, 0);
            ctx.quadraticCurveTo(-enemy.radius * 1.8, bodyWavy * 1.5, -enemy.radius * 2.8, bodyWavy * 2.5);
            ctx.lineTo(-enemy.radius * 1.2, 0);
            ctx.stroke();

            // Boss central glowing crystal core
            ctx.fillStyle = '#fb7185';
            ctx.shadowColor = '#fb7185';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();

          // Standard Overlay healthbar for damaged enemies (drawn directly above node)
          if (enemy.health < enemy.maxHealth && enemy.depth < 2) {
            ctx.save();
            ctx.translate(rx, ry);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-20, -enemy.radius - 8, 40, 4);

            const hpFraction = enemy.health / enemy.maxHealth;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-20, -enemy.radius - 8, 40 * hpFraction, 4);
            ctx.restore();
          }
        });

        // DRAW EXPLOSIVE REACTION WAVES (SHOCKWAVES ON WATER/UNDERWATER SURFACE)
        s.explosions.forEach((exp) => {
          const rx = exp.x - camX;
          const ry = exp.y - camY;

          ctx.save();
          ctx.strokeStyle = exp.color;
          ctx.lineWidth = exp.type === 'heavy' ? 4.5 : 2.5;
          ctx.shadowBlur = 18;
          ctx.shadowColor = exp.color;

          // Radial circle expanding outward
          ctx.beginPath();
          ctx.arc(rx, ry, exp.currentRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Secondary subtle interior dust rings
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(rx, ry, exp.currentRadius * 0.75, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        });

        // DRAW PROJECTILES EMITTED BY THE OCEAN HOSTILES
        s.projectiles.forEach((proj) => {
          const rx = proj.x - camX;
          const ry = proj.y - camY;

          ctx.save();
          ctx.fillStyle = proj.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = proj.color;
          ctx.beginPath();
          ctx.arc(rx, ry, proj.radius, 0, Math.PI * 2);
          ctx.fill();

          // White center pip
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(rx, ry, proj.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // DRAW AIR PARTICLES / REACTION SMOKE / DAMAGE TEXTS
        s.particles.forEach((p) => {
          const rx = p.x - camX;
          const ry = p.y - camY;

          ctx.save();
          ctx.globalAlpha = p.alpha;

          if (p.type === 'text' && p.text) {
            // 戦略爆撃ダメージ・特効テキストのホログラフィック風描画
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.font = '700 9px monospace';
            ctx.textAlign = 'center';

            // バブルブラック半透明の背景板
            const textWidth = ctx.measureText(p.text).width;
            ctx.fillStyle = 'rgba(1, 8, 3, 0.78)';
            ctx.fillRect(rx - textWidth / 2 - 4, ry - 7, textWidth + 8, 11);
            
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(rx - textWidth / 2 - 4, ry - 7, textWidth + 8, 11);

            ctx.fillStyle = p.color;
            ctx.fillText(p.text, rx, ry + 2);
          } else if (p.type === 'bubble') {
            // Ring bubbles outline
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.0;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(rx, ry, p.radius, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // filled ash particles
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(rx, ry, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        });

        // DRAW FALLING AIR ORDNANCES (BOMBS DROPPING FROM PLANE ALTITUDE)
        s.bombs.forEach((bomb) => {
          const rx = bomb.x - camX;
          const ry = bomb.y - camY;

          // Out-of-bounds skip
          if (rx < -50 || rx > width + 50 || ry < -50 || ry > height + 50) return;

          // 1. Draw projection target reticle directly on the water representing collision crash point
          const targetRx = bomb.targetX - camX;
          const targetRy = bomb.targetY - camY;

          ctx.save();
          let lineCol = 'rgba(16, 185, 129, 0.65)'; // standard
          if (bomb.type === 'heavy') lineCol = 'rgba(239, 68, 68, 0.75)'; // heavy (red)
          if (bomb.type === 'guided') lineCol = 'rgba(6, 182, 212, 0.75)'; // guided (cyan)

          ctx.strokeStyle = lineCol;
          ctx.shadowColor = lineCol;
          ctx.shadowBlur = 5;

          // 外側からきゅーっと縮小して着弾タイミングを伝えるインジケーター円
          const contractingRadius = (bomb.radius * 0.5) * (1 + (bomb.currentHeight / bomb.maxHeight) * 1.5);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(targetRx, targetRy, contractingRadius, 0, Math.PI * 2);
          ctx.stroke();

          // 実際の爆風範囲を薄塗りで表現
          ctx.fillStyle = bomb.type === 'heavy' ? 'rgba(239, 68, 68, 0.05)' : bomb.type === 'guided' ? 'rgba(6, 182, 212, 0.05)' : 'rgba(16, 185, 129, 0.05)';
          ctx.beginPath();
          ctx.arc(targetRx, targetRy, bomb.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();

          // 十字照準レティクル
          ctx.setLineDash([2, 3]);
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(targetRx - 14, targetRy);
          ctx.lineTo(targetRx + 14, targetRy);
          ctx.moveTo(targetRx, targetRy - 14);
          ctx.lineTo(targetRx, targetRy + 14);
          ctx.stroke();

          // 爆弾種別の名前テキストを照準上に表示
          ctx.fillStyle = lineCol;
          ctx.font = '700 8px monospace';
          ctx.textAlign = 'center';
          const labelEN = bomb.type === 'heavy' ? '対潜重爆装 (HEAVY BARREL)' : bomb.type === 'guided' ? '音響探知魚雷 (SONAR TORPEDO)' : '標準通常爆弾 (STD METEOR)';
          ctx.fillText(labelEN, targetRx, targetRy - (bomb.radius * 0.5) - 4);

          ctx.restore();

          // 2. Draw bomb flying vector
          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(bomb.angle);

          // Height visual offset representation.
          // Drawing shadow lower and actual bomb higher to give perspective!
          const visualHeightY = -bomb.currentHeight * 0.5;

          // Shadow (dark silhouette sliding on ocean)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Physical Bomb body (height scale depends on proximity)
          const bombScale = 1.0 + bomb.currentHeight * 0.008; // scale up when high in air
          ctx.scale(bombScale, bombScale);

          let bombColor = '#10b981'; // green for standard
          if (bomb.type === 'heavy') bombColor = '#dc2626'; // orange-red heavy steel canister
          if (bomb.type === 'guided') bombColor = '#06b6d4'; // neon cyan torpedo pod

          ctx.fillStyle = bombColor;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;

          // Draw aerial missile shape
          ctx.beginPath();
          ctx.moveTo(7, visualHeightY);
          ctx.lineTo(-4, visualHeightY - 3.5);
          ctx.lineTo(-10, visualHeightY - 3.5);
          ctx.lineTo(-10, visualHeightY + 3.5);
          ctx.lineTo(-4, visualHeightY + 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Tail stabilizing fin
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(-10, visualHeightY - 3.5);
          ctx.lineTo(-14, visualHeightY - 7);
          ctx.lineTo(-11, visualHeightY);
          ctx.lineTo(-14, visualHeightY + 7);
          ctx.lineTo(-10, visualHeightY + 3.5);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        });

        // DRAW CRITICAL BOMBER INTUITION OVERLAYS (SIGHTS RETICLE OR GUIDE LINES)
        // Draw real-time bombing sights projection directly ahead of the nose
        if (s.mouse.inside) {
          // Render tracking cursor coordinates reticle
          ctx.save();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(s.mouse.x, s.mouse.y, 16, 0, Math.PI * 2);
          ctx.stroke();

          // Dot in center
          ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
          ctx.beginPath();
          ctx.arc(s.mouse.x, s.mouse.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // DRAW PLAYER FIGHTER PLANE (SUPER SHIELDED RETRO-BOMBER)
        const prx = s.player.x - camX;
        const pry = s.player.y - camY;

        ctx.save();
        ctx.translate(prx, pry);
        ctx.rotate(s.player.angle);

        // Jet engine exhaust tail fire
        const jetFireLength = 12 + Math.abs(Math.sin(s.time * 0.4)) * 6;
        if (Math.hypot(s.player.vx, s.player.vy) > 0.5) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(-12, -2);
          ctx.lineTo(-12 - jetFireLength, 0);
          ctx.lineTo(-12, 2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(-12, -1);
          ctx.lineTo(-12 - jetFireLength * 0.6, 0);
          ctx.lineTo(-12, 1);
          ctx.closePath();
          ctx.fill();
        }

        // Giant Wing span
        ctx.fillStyle = '#065f46'; // forest teal fuselage
        ctx.strokeStyle = '#10b981'; // glowing metal outline armor lines
        ctx.lineWidth = 1.8;

        // Symmetric aircraft fuselage drawing
        ctx.beginPath();
        ctx.moveTo(18, 0); // Nose nose tip
        ctx.lineTo(4, -5);   // fuselage slope
        ctx.lineTo(-4, -18); // Left wing leading edge
        ctx.lineTo(-7, -18); // Left wing tip
        ctx.lineTo(-6, -5);  // Left wing trailing edge
        ctx.lineTo(-14, -6); // Left tail stabilizer leading edge
        ctx.lineTo(-16, -11); // Left tail tip
        ctx.lineTo(-17, 0);  // Tail end point
        ctx.lineTo(-16, 11); // Right tail tip
        ctx.lineTo(-14, 6);  // Right tail stabilizer trailing edge
        ctx.lineTo(-6, 5);   // Right wing trailing edge
        ctx.lineTo(-7, 18);  // Right wing tip
        ctx.lineTo(-4, 18);  // Right wing leading edge
        ctx.lineTo(4, 5);    // fuselage slope
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Canopy windshield window (blue plexiglass layout)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(4, 0, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(5, -1, 4, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left/Right wing mounted air ordnance slots visualizer (shows bomb types)
        ctx.fillStyle = s.player.weapon === 'heavy' ? '#dc2626' : s.player.weapon === 'guided' ? '#06b6d4' : '#10b981';
        ctx.fillRect(-2, -12, 4, 2);
        ctx.fillRect(-2, 10, 4, 2);

        ctx.restore();

        // HUD OVERLAYS DIRECTLY BENEATH PILOT SCREEN
        // Draw Sonar boundary sweep alert circles
        ctx.save();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(prx, pry, radarRangePixels, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Active Warning of boss leviathan
        const activeLevi = s.enemies.find((e) => e.type === 'leviathan');
        if (activeLevi) {
          ctx.fillStyle = '#f43f5e';
          ctx.font = '700 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ WARNING: ANCIENT LEVIATHAN DETECTED (巨大生命体接近中)', width / 2, 45);
        }
      }

      animationFrameId = requestAnimationFrame(updateWorld);
    };

    animationFrameId = requestAnimationFrame(updateWorld);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [setPlayer, setEnemies, setBombs, setSweepAngle, setScore, setItems, onGameOver, isPaused, isGameOver, gameStarted]);

  return (
    <div
      ref={containerRef}
      id="game-viewport-container"
      className="relative flex-1 bg-black overflow-hidden border border-emerald-950/80 rounded-lg shadow-xl"
    >
      {/* Absolute Header with tactical info */}
      <div className="absolute top-2.5 left-3 z-10 font-mono text-[9px] text-emerald-400 select-none flex gap-4 uppercase tracking-wider font-semibold pointer-events-none bg-black/40 py-1 px-2.5 rounded border border-emerald-950/50 backdrop-blur-xs">
        <div>ORBITAL COMPAS: {Math.round(stateRef.current.player.angle * (180 / Math.PI))}° CARDINAL</div>
        <div>WAVE {stateRef.current.wave} GRID</div>
        <div className="text-amber-400">ALTITUDE: STABLE (高高度 2500m)</div>
      </div>

      <canvas
        id="combat-flight-canvas"
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
};
