export type WeaponType = 'standard' | 'heavy' | 'guided';

export interface UpgradeLevels {
  radarRange: number;   // 1 to 5
  maxFuel: number;      // 1 to 5
  maxArmor: number;     // 1 to 5
  reloadTime: number;   // 1 to 5
  bombDamage: number;   // 1 to 5
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;        // radians
  targetAngle: number;  // radians
  speed: number;
  maxSpeed: number;
  health: number;
  maxHealth: number;
  fuel: number;
  maxFuel: number;
  score: number;
  coins: number;
  weapon: WeaponType;
  ammo: {
    standard: number;   // infinite or high
    heavy: number;
    guided: number;
  };
  reloadTimer: number;  // cooldown in frames/ms
  upgradeLevels: UpgradeLevels;
}

export type EnemyType = 'jellyfish' | 'shark' | 'squid' | 'leviathan' | 'nest';

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: EnemyType;
  name: string;
  health: number;
  maxHealth: number;
  depth: number;        // 0: Surface, 1: Submerged, 2: Deep Sea (visible only on full radar)
  radius: number;
  speed: number;
  scoreValue: number;
  coinValue: number;
  animationFrame: number;
  shootCooldown: number;
  behaviorTimer: number;
  detectedAlpha: number; // For fading in on radar scans
  isDead: boolean;
  spawnTimer?: number;  // for nests
}

export interface Bomb {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  angle: number;
  speed: number;
  currentHeight: number; // height for visual drop simulation (e.g. 100 down to 0)
  maxHeight: number;
  damage: number;
  radius: number;
  type: WeaponType;
  duration: number;      // how long it takes to hit the water
  elapsed: number;
  splashRadius: number;
  isDetonated: boolean;
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  maxRadius: number;
  currentRadius: number;
  color: string;
  duration: number;
  elapsed: number;
  type: 'standard' | 'heavy' | 'wave';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  duration: number;
  elapsed: number;
  type: 'smoke' | 'fire' | 'bubble' | 'debris' | 'text';
  text?: string;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  duration: number;
  elapsed: number;
}

export interface Item {
  id: string;
  x: number;
  y: number;
  type: 'fuel' | 'armor' | 'heavy_ammo' | 'guided_ammo' | 'coin';
  amount: number;
  radius: number;
  pulseTimer: number;
}

export interface SonarSweep {
  angle: number;        // current sweep angle in radians
  speed: number;        // radial velocity
}
