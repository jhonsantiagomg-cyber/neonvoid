import * as THREE from 'three';

// ============ ARENA CONFIG ============
export const ARENA = {
  WIDTH: 4200,
  HEIGHT: 1800,
  DEPTH: 4200,
  MIN_X: -2100, MAX_X: 2100,
  MIN_Y: -900, MAX_Y: 900,
  MIN_Z: -2100, MAX_Z: 2100,
};

// ============ SHIP CLASSES ============
export interface ShipClassConfig {
  name: string;
  speed: number;
  maxHealth: number;
  damage: number;
  fireRate: number;
  luck: number;
  vampirism: number;
  color: string;
  description: string;
}

export const SHIP_CLASSES: Record<string, ShipClassConfig> = {
  interceptor: {
    name: 'INTERCEPTOR',
    speed: 9.2, maxHealth: 100, damage: 13, fireRate: 5, luck: 0.05, vampirism: 0,
    color: '#00f3ff', description: 'Speed & fire rate focused'
  },
  destroyer: {
    name: 'DESTRUCTOR',
    speed: 7.2, maxHealth: 170, damage: 18, fireRate: 7, luck: 0, vampirism: 0,
    color: '#ff2d55', description: 'Tank & damage focused'
  },
  phantom: {
    name: 'PHANTOM',
    speed: 8.4, maxHealth: 115, damage: 14, fireRate: 6, luck: 0.20, vampirism: 0.08,
    color: '#bc13fe', description: 'Quantum tech & lifesteal'
  }
};

// ============ DIFFICULTY ============
export interface DifficultyConfig {
  name: string;
  inaccuracy: number;
  reactionDelay: number;
  damageMultiplier: number;
  bossAggression: number;
  projectileSpeed: number;
}

export const DIFFICULTIES: Record<string, DifficultyConfig> = {
  cadet: { name: 'CADET', inaccuracy: 0.15, reactionDelay: 40, damageMultiplier: 0.7, bossAggression: 0.6, projectileSpeed: 0.8 },
  pilot: { name: 'PILOT', inaccuracy: 0.08, reactionDelay: 20, damageMultiplier: 1.0, bossAggression: 1.0, projectileSpeed: 1.0 },
  veteran: { name: 'VETERAN', inaccuracy: 0.04, reactionDelay: 10, damageMultiplier: 1.3, bossAggression: 1.4, projectileSpeed: 1.2 },
  cyborg: { name: 'CYBORG', inaccuracy: 0.02, reactionDelay: 5, damageMultiplier: 1.6, bossAggression: 1.8, projectileSpeed: 1.5 },
};

// ============ GRAPHICS QUALITY ============
export interface GraphicsProfile {
  name: string;
  stars: number;
  trails: boolean;
  gridDensity: number;
  particleScale: number;
  scanlines: boolean;
  vignette: boolean;
}

export const GRAPHICS_PROFILES: Record<string, GraphicsProfile> = {
  extraLow: { name: 'EXTRA LOW', stars: 600, trails: false, gridDensity: 16, particleScale: 0.25, scanlines: false, vignette: false },
  low: { name: 'LOW', stars: 1200, trails: true, gridDensity: 24, particleScale: 0.5, scanlines: false, vignette: false },
  medium: { name: 'MEDIUM', stars: 2000, trails: true, gridDensity: 32, particleScale: 0.75, scanlines: true, vignette: false },
  high: { name: 'HIGH', stars: 3000, trails: true, gridDensity: 40, particleScale: 1.0, scanlines: true, vignette: true },
  ultra: { name: 'ULTRA', stars: 4500, trails: true, gridDensity: 50, particleScale: 1.3, scanlines: true, vignette: true },
};

// ============ WEAPON CONFIGS ============
export const WEAPON_PATTERNS = [
  { name: 'Single', count: 1, spread: 0 },
  { name: 'Dual', count: 2, spread: 0.05 },
  { name: 'Tri-Spread', count: 3, spread: 0.12 },
  { name: 'Heavy Quad', count: 4, spread: 0.08 },
  { name: 'Annular 360', count: 8, spread: 0 },
];

// ============ UPGRADES ============
export type Rarity = 'common' | 'uncommon' | 'rare' | 'impossible' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#ffffff',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  impossible: '#bc13fe',
  legendary: '#ffd75e',
};

export const RARITY_MULTIPLIERS: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.7,
  impossible: 2.2,
  legendary: 3.0,
};

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  apply: (player: any) => void;
}

export const UPGRADES: Upgrade[] = [
  { id: 'dual_laser', name: 'Dual Laser Battery', description: 'Two side-by-side laser cannons', rarity: 'common', apply: (p) => { p.weaponPattern = 1; } },
  { id: 'tri_spread', name: 'Tri-Phase Dispersion', description: 'Three-way spread shot', rarity: 'uncommon', apply: (p) => { p.weaponPattern = 2; } },
  { id: 'heavy_quad', name: 'Heavy Quad Battery', description: 'Four heavy projectiles', rarity: 'rare', apply: (p) => { p.weaponPattern = 3; } },
  { id: 'annular', name: '360° Annular Cannon', description: 'Eight-directional ring fire', rarity: 'impossible', apply: (p) => { p.weaponPattern = 4; } },
  { id: 'plasma_cond', name: 'Plasma Condenser', description: '+25% projectile damage', rarity: 'common', apply: (p) => { p.damage *= 1.25; } },
  { id: 'turbo_charge', name: 'Turbocharger', description: '+20% fire rate', rarity: 'uncommon', apply: (p) => { p.fireRate = Math.max(1, p.fireRate * 0.8); } },
  { id: 'energy_shield', name: 'Recyclic Energy Shield', description: '+30 max shield, regen', rarity: 'rare', apply: (p) => { p.maxShield += 30; p.shieldRegen += 0.05; } },
  { id: 'cryo_cool', name: 'Cryogenic Cooling', description: '-30% heat per shot', rarity: 'uncommon', apply: (p) => { p.heatPerShot *= 0.7; } },
  { id: 'hyperspeed', name: 'Hypersonic Thrusters', description: '+15% max speed', rarity: 'common', apply: (p) => { p.maxSpeed *= 1.15; } },
  { id: 'vampiric', name: 'Vampiric Core', description: '+5% lifesteal on hit', rarity: 'rare', apply: (p) => { p.vampirism += 0.05; } },
  { id: 'luck_boost', name: 'Quantum Luck Module', description: '+10% luck', rarity: 'uncommon', apply: (p) => { p.luck += 0.10; } },
  { id: 'hull_reinforce', name: 'Hull Reinforcement', description: '+40 max health', rarity: 'common', apply: (p) => { p.maxHealth += 40; p.health += 40; } },
  { id: 'projectile_speed', name: 'Accelerated Munitions', description: '+20% projectile speed', rarity: 'common', apply: (p) => { p.projectileSpeed *= 1.2; } },
  { id: 'overcharge', name: 'Overcharge Reactor', description: '+35% damage, +15% heat', rarity: 'legendary', apply: (p) => { p.damage *= 1.35; p.heatPerShot *= 1.15; } },
  { id: 'perfect_balance', name: 'Perfect Balance', description: '+20 health, +10% speed, +10% damage', rarity: 'impossible', apply: (p) => { p.maxHealth += 20; p.health += 20; p.maxSpeed *= 1.1; p.damage *= 1.1; } },
];

// ============ ABILITIES ============
export interface AbilityConfig {
  id: string;
  name: string;
  cooldown: number;
  duration: number;
  description: string;
}

export const ABILITIES: AbilityConfig[] = [
  { id: 'decoy', name: 'Spectral Decoy', cooldown: 300, duration: 90, description: 'Deploy a decoy that attracts enemies' },
  { id: 'reflect', name: 'Reflective Shield', cooldown: 360, duration: 60, description: 'Reflect projectiles back at enemies' },
  { id: 'timewarp', name: 'Temporal Distortion', cooldown: 450, duration: 120, description: 'Slow all enemies by 60%' },
  { id: 'gravjump', name: 'Gravitational Jump', cooldown: 240, duration: 1, description: 'Instant teleport forward 400 units' },
  { id: 'drones', name: 'Sentinel Drones', cooldown: 600, duration: 180, description: 'Deploy 3 auto-attacking drones' },
  { id: 'blackhole', name: '3D Black Hole', cooldown: 500, duration: 150, description: 'Create a singularity that pulls everything' },
  { id: 'emp', name: 'EMP Pulse', cooldown: 400, duration: 1, description: 'Disable all enemy weapons and AI briefly' },
  { id: 'phasebeam', name: 'Phase Beam', cooldown: 300, duration: 30, description: 'Fire a piercing beam forward' },
  { id: 'qjump', name: 'Quantum Jump', cooldown: 200, duration: 1, description: 'Teleport to random nearby location' },
  { id: 'deflector', name: 'Deflector Matrix', cooldown: 350, duration: 90, description: 'Deflect incoming projectiles' },
  { id: 'cryomax', name: 'Cryo-Cooling Max', cooldown: 250, duration: 1, description: 'Instantly reset weapon heat to zero' },
  { id: 'micromissiles', name: 'Micro-Missiles 3D', cooldown: 350, duration: 60, description: 'Launch 8 homing micro-missiles' },
  { id: 'photonic', name: 'Photonic Barrier', cooldown: 400, duration: 120, description: 'Invulnerable barrier absorbs all damage' },
  { id: 'shadow', name: 'Orbital Shadow', cooldown: 500, duration: 150, description: 'Become invisible to enemy targeting' },
  { id: 'polar', name: 'Polar Inversion', cooldown: 450, duration: 90, description: 'Reverse all nearby enemy velocities' },
];

// ============ BOT TYPES ============
export type BotType = 'scout' | 'sniper' | 'brawler';

export const BOT_TYPE_CONFIGS: Record<BotType, { speed: number; health: number; damage: number; range: number; fireRate: number; color: string }> = {
  scout: { speed: 10, health: 60, damage: 8, range: 800, fireRate: 4, color: '#22c55e' },
  sniper: { speed: 5, health: 80, damage: 20, range: 1500, fireRate: 8, color: '#ffd75e' },
  brawler: { speed: 6, health: 150, damage: 12, range: 500, fireRate: 3, color: '#ff2d55' },
};

// ============ CONSTANTS ============
export const MAX_PROJECTILES = 250;
export const MAX_PARTICLES = 450;
export const INITIAL_BOTS = 18;
export const INITIAL_ORBS = 320;
export const PROJECTILE_SPEED = 26;
export const PROJECTILE_LIFETIME = 120;
export const TICK_RATE = 30;
export const HEAT_PER_SHOT = 3.8;
export const HEAT_OVERHEAT = 100;
export const HEAT_LOCKOUT = 65;
export const MAGNET_RANGE = 180;
export const TARGET_LOCK_RANGE = 1800;
export const RADAR_RANGE = 2200;
export const RADAR_SIZE = 140;
export const RADAR_RADIUS = 65;
export const SPATIAL_CELL_SIZE = 220;
export const BOT_DETECT_RANGE = 1200;
export const BOT_FIRE_RANGE = 950;
export const BOT_RESPAWN_TICKS = 90;
export const XP_FORMULA_BASE = 35;
export const XP_FORMULA_RATIO = 1.22;
export const LEVEL_HEALTH_BONUS = 12;
export const LEVEL_HEAL_AMOUNT = 25;
export const LEVEL_DAMAGE_BONUS = 1.5;
export const BOSS_SPAWN_INTERVAL = 1800;
export const BOSS_ORB_COUNT = 45;

export function xpForLevel(level: number): number {
  return Math.floor(XP_FORMULA_BASE * Math.pow(XP_FORMULA_RATIO, level - 1));
}
