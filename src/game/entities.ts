import * as THREE from 'three';
import { ARENA, MAX_PROJECTILES, PROJECTILE_SPEED, PROJECTILE_LIFETIME, MAGNET_RANGE, BOT_DETECT_RANGE, BOT_FIRE_RANGE, BOT_RESPAWN_TICKS, BOT_TYPE_CONFIGS, BotType, SHIP_CLASSES, ShipClassConfig, HEAT_PER_SHOT, HEAT_OVERHEAT, HEAT_LOCKOUT, WEAPON_PATTERNS, DifficultyConfig } from './config';
import { MeshFactory } from './graphics';
import { SpatialHashGrid3D } from './spatial';

// ============ PROJECTILE POOL ============
export interface Projectile3D {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  owner: string;
  damage: number;
  radius: number;
  life: number;
  maxLife: number;
  active: boolean;
  isHoming: boolean;
  homingTarget: THREE.Vector3 | null;
  isBoss: boolean;
}

export class ProjectilePool {
  private pool: Projectile3D[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const mesh = MeshFactory.createProjectile('#00f3ff');
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({
        mesh, position: new THREE.Vector3(), velocity: new THREE.Vector3(),
        owner: '', damage: 0, radius: 2, life: 0, maxLife: PROJECTILE_LIFETIME,
        active: false, isHoming: false, homingTarget: null, isBoss: false
      });
    }
  }

  spawn(pos: THREE.Vector3, vel: THREE.Vector3, owner: string, damage: number, color: string = '#00f3ff', isHoming: boolean = false, isBoss: boolean = false): Projectile3D | null {
    const p = this.pool.find(p => !p.active);
    if (!p) return null;
    p.position.copy(pos);
    p.velocity.copy(vel);
    p.owner = owner;
    p.damage = damage;
    p.life = 0;
    p.maxLife = PROJECTILE_LIFETIME;
    p.active = true;
    p.isHoming = isHoming;
    p.homingTarget = null;
    p.isBoss = isBoss;
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    // Update color
    const glow = p.mesh.children[1] as THREE.Mesh;
    if (glow && glow.material) {
      (glow.material as THREE.MeshBasicMaterial).color.set(color);
    }
    return p;
  }

  update() {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life++;
      if (p.isHoming && p.homingTarget) {
        const dir = p.homingTarget.clone().sub(p.position).normalize();
        p.velocity.lerp(dir.multiplyScalar(PROJECTILE_SPEED), 0.05);
      }
      p.position.add(p.velocity);
      p.mesh.position.copy(p.position);
      if (p.life >= p.maxLife) {
        this.deactivate(p);
      }
    }
  }

  deactivate(p: Projectile3D) {
    p.active = false;
    p.mesh.visible = false;
  }

  getActive(): Projectile3D[] {
    return this.pool.filter(p => p.active);
  }

  clearAll() {
    this.pool.forEach(p => this.deactivate(p));
  }

  dispose() {
    this.pool.forEach(p => { this.scene.remove(p.mesh); });
  }
}

// ============ ORB 3D ============
export interface Orb3D {
  mesh: THREE.Group;
  position: THREE.Vector3;
  tier: number;
  xp: number;
  active: boolean;
  bobPhase: number;
}

export class OrbManager {
  private orbs: Orb3D[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(pos: THREE.Vector3, tier: number = 0) {
    const xpValues = [4, 12, 35];
    const mesh = MeshFactory.createOrb(tier);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.orbs.push({
      mesh, position: pos.clone(), tier,
      xp: xpValues[Math.min(tier, 2)],
      active: true, bobPhase: Math.random() * Math.PI * 2
    });
  }

  spawnMany(pos: THREE.Vector3, count: number, tierDistribution: number[] = [0.6, 0.3, 0.1]) {
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let tier = 0;
      if (r > tierDistribution[0] + tierDistribution[1]) tier = 2;
      else if (r > tierDistribution[0]) tier = 1;
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
      this.spawn(pos.clone().add(offset), tier);
    }
  }

  update(playerPos: THREE.Vector3, collectFn: (xp: number) => void) {
    for (const orb of this.orbs) {
      if (!orb.active) continue;
      orb.bobPhase += 0.05;
      orb.mesh.position.y = orb.position.y + Math.sin(orb.bobPhase) * 2;
      orb.mesh.rotation.y += 0.02;
      orb.mesh.rotation.x += 0.01;

      // Magnetism
      const dist = orb.position.distanceTo(playerPos);
      if (dist < MAGNET_RANGE) {
        const dir = playerPos.clone().sub(orb.position).normalize();
        const speed = Math.max(2, (MAGNET_RANGE - dist) * 0.15);
        orb.position.add(dir.multiplyScalar(speed));
        orb.mesh.position.copy(orb.position);
      }

      // Collection
      if (dist < 8) {
        orb.active = false;
        this.scene.remove(orb.mesh);
        collectFn(orb.xp);
      }
    }
    this.orbs = this.orbs.filter(o => o.active);
  }

  getActive(): Orb3D[] {
    return this.orbs.filter(o => o.active);
  }

  getCount(): number {
    return this.orbs.filter(o => o.active).length;
  }

  dispose() {
    this.orbs.forEach(o => this.scene.remove(o.mesh));
    this.orbs = [];
  }
}

// ============ SHIP BASE ============
export interface ShipState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  shieldRegen: number;
  damage: number;
  speed: number;
  maxSpeed: number;
  fireRate: number;
  fireCooldown: number;
  heat: number;
  overheated: boolean;
  overheatLockout: number;
  heatPerShot: number;
  luck: number;
  vampirism: number;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  weaponPattern: number;
  projectileSpeed: number;
  alive: boolean;
  respawnTimer: number;
  color: string;
  mesh: THREE.Group;
  // Active reload
  activeReloadWindow: boolean;
  activeReloadTimer: number;
}

export function createShipState(classConfig: ShipClassConfig, color: string, mesh: THREE.Group): ShipState {
  return {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    health: classConfig.maxHealth,
    maxHealth: classConfig.maxHealth,
    shield: 0,
    maxShield: 0,
    shieldRegen: 0.02,
    damage: classConfig.damage,
    speed: 0,
    maxSpeed: classConfig.speed,
    fireRate: classConfig.fireRate,
    fireCooldown: 0,
    heat: 0,
    overheated: false,
    overheatLockout: 0,
    heatPerShot: HEAT_PER_SHOT,
    luck: classConfig.luck,
    vampirism: classConfig.vampirism,
    level: 1,
    xp: 0,
    xpToNext: 35,
    kills: 0,
    weaponPattern: 0,
    projectileSpeed: PROJECTILE_SPEED,
    alive: true,
    respawnTimer: 0,
    color,
    mesh,
    activeReloadWindow: false,
    activeReloadTimer: 0,
  };
}

// ============ PLAYER SHIP ============
export class PlayerShip3D {
  state: ShipState;
  mesh: THREE.Group;
  yaw: number = 0;
  pitch: number = 0;
  keys: Set<string> = new Set();
  mouseDown: boolean = false;
  boostActive: boolean = false;
  inertiaDampener: boolean = true;
  abilityIndex: number = 0;
  abilityCooldown: number = 0;
  abilityDuration: number = 0;
  abilityActive: boolean = false;
  stealthActive: boolean = false;
  shieldActive: boolean = false;
  timeWarpTarget: boolean = false;
  dronesActive: boolean = false;
  droneMeshes: THREE.Group[] = [];
  blackholeActive: boolean = false;
  blackholePos: THREE.Vector3 = new THREE.Vector3();
  empActive: boolean = false;
  deflectorActive: boolean = false;
  photonicActive: boolean = false;
  damageDirection: THREE.Vector3 | null = null;
  damageIndicatorTimer: number = 0;
  targetLock: THREE.Vector3 | null = null;
  targetLockDist: number = 0;

  constructor(scene: THREE.Scene, classId: string) {
    const config = SHIP_CLASSES[classId];
    this.mesh = MeshFactory.createPlayerShip(config.color);
    this.mesh.visible = false; // First person - mesh hidden
    scene.add(this.mesh);
    this.state = createShipState(config, config.color, this.mesh);
    this.state.position.set(0, 0, 0);
  }

  getForward(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return dir;
  }

  getRight(): THREE.Vector3 {
    const dir = new THREE.Vector3(1, 0, 0);
    dir.applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    return dir;
  }

  getUp(): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0);
  }

  updateMovement() {
    if (!this.state.alive) return;
    const forward = this.getForward();
    const right = this.getRight();
    const up = this.getUp();
    const accel = this.boostActive ? this.state.maxSpeed * 0.15 : this.state.maxSpeed * 0.08;

    if (this.keys.has('w')) this.state.velocity.add(forward.clone().multiplyScalar(accel));
    if (this.keys.has('s')) this.state.velocity.add(forward.clone().multiplyScalar(-accel * 0.5));
    if (this.keys.has('a')) this.state.velocity.add(right.clone().multiplyScalar(-accel * 0.7));
    if (this.keys.has('d')) this.state.velocity.add(right.clone().multiplyScalar(accel * 0.7));
    if (this.keys.has(' ')) this.state.velocity.add(up.clone().multiplyScalar(accel * 0.7));
    if (this.keys.has('c')) this.state.velocity.add(up.clone().multiplyScalar(-accel * 0.7));

    // Damping
    if (this.inertiaDampener) {
      this.state.velocity.multiplyScalar(0.92);
    } else {
      this.state.velocity.multiplyScalar(0.995);
    }

    // Speed limit
    const speed = this.state.velocity.length();
    const maxSpd = this.boostActive ? this.state.maxSpeed * 1.8 : this.state.maxSpeed;
    if (speed > maxSpd) {
      this.state.velocity.multiplyScalar(maxSpd / speed);
    }
    this.state.speed = speed;

    // Apply velocity
    this.state.position.add(this.state.velocity);

    // Boundary bounce
    const bounce = 0.5;
    if (this.state.position.x < ARENA.MIN_X) { this.state.position.x = ARENA.MIN_X; this.state.velocity.x *= -bounce; }
    if (this.state.position.x > ARENA.MAX_X) { this.state.position.x = ARENA.MAX_X; this.state.velocity.x *= -bounce; }
    if (this.state.position.y < ARENA.MIN_Y) { this.state.position.y = ARENA.MIN_Y; this.state.velocity.y *= -bounce; }
    if (this.state.position.y > ARENA.MAX_Y) { this.state.position.y = ARENA.MAX_Y; this.state.velocity.y *= -bounce; }
    if (this.state.position.z < ARENA.MIN_Z) { this.state.position.z = ARENA.MIN_Z; this.state.velocity.z *= -bounce; }
    if (this.state.position.z > ARENA.MAX_Z) { this.state.position.z = ARENA.MAX_Z; this.state.velocity.z *= -bounce; }

    this.mesh.position.copy(this.state.position);
  }

  updateHeat() {
    if (this.state.overheated) {
      this.state.overheatLockout--;
      if (this.state.overheatLockout <= 0) {
        this.state.overheated = false;
        this.state.heat = 0;
      }
    } else {
      this.state.heat = Math.max(0, this.state.heat - 0.8);
      // Active reload window
      if (this.state.heat > 70 && this.state.heat < 85) {
        this.state.activeReloadWindow = true;
        this.state.activeReloadTimer = 20;
      } else {
        if (this.state.activeReloadTimer > 0) this.state.activeReloadTimer--;
        else this.state.activeReloadWindow = false;
      }
    }
  }

  takeDamage(amount: number, fromDir?: THREE.Vector3) {
    if (this.photonicActive) return;
    if (this.shieldActive) {
      amount *= 0.3;
    }
    // Shield absorbs first
    if (this.state.shield > 0) {
      const absorbed = Math.min(this.state.shield, amount);
      this.state.shield -= absorbed;
      amount -= absorbed;
    }
    this.state.health -= amount;
    if (fromDir) {
      this.damageDirection = fromDir.clone();
      this.damageIndicatorTimer = 30;
    }
    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.alive = false;
    }
  }

  addXP(amount: number): boolean {
    this.state.xp += amount;
    if (this.state.xp >= this.state.xpToNext) {
      this.state.xp -= this.state.xpToNext;
      this.state.level++;
      this.state.xpToNext = Math.floor(35 * Math.pow(1.22, this.state.level - 1));
      this.state.maxHealth += 12;
      this.state.health = Math.min(this.state.health + 25, this.state.maxHealth);
      this.state.damage += 1.5;
      return true; // Level up
    }
    return false;
  }

  updateShieldRegen() {
    if (this.state.maxShield > 0 && this.state.shield < this.state.maxShield) {
      this.state.shield = Math.min(this.state.maxShield, this.state.shield + this.state.shieldRegen);
    }
  }
}

// ============ BOT SHIP ============
export class BotShip3D {
  state: ShipState;
  mesh: THREE.Group;
  botType: BotType;
  aiState: 'wander' | 'hunt' = 'wander';
  target: THREE.Vector3 | null = null;
  patrolDir: THREE.Vector3 = new THREE.Vector3();
  patrolTimer: number = 0;
  fireTimer: number = 0;
  difficulty: DifficultyConfig;
  stunTimer: number = 0;
  id: string;

  constructor(scene: THREE.Scene, type: BotType, difficulty: DifficultyConfig, id: string) {
    this.botType = type;
    this.difficulty = difficulty;
    this.id = id;
    const config = BOT_TYPE_CONFIGS[type];
    const shipConfig: ShipClassConfig = {
      name: type.toUpperCase(), speed: config.speed, maxHealth: config.health,
      damage: config.damage, fireRate: config.fireRate, luck: 0, vampirism: 0, color: config.color, description: ''
    };
    this.mesh = MeshFactory.createBotShip(config.color, type);
    scene.add(this.mesh);
    this.state = createShipState(shipConfig, config.color, this.mesh);
    this.state.damage *= difficulty.damageMultiplier;
    this.state.position.set(
      (Math.random() - 0.5) * ARENA.WIDTH * 0.8,
      (Math.random() - 0.5) * ARENA.HEIGHT * 0.6,
      (Math.random() - 0.5) * ARENA.DEPTH * 0.8
    );
    this.mesh.position.copy(this.state.position);
    this.patrolDir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  }

  update(playerPos: THREE.Vector3, playerStealth: boolean): { shouldFire: boolean; fireDir: THREE.Vector3 } {
    if (!this.state.alive) {
      this.state.respawnTimer--;
      if (this.state.respawnTimer <= 0) {
        this.respawn();
      }
      return { shouldFire: false, fireDir: new THREE.Vector3() };
    }

    if (this.stunTimer > 0) {
      this.stunTimer--;
      return { shouldFire: false, fireDir: new THREE.Vector3() };
    }

    const distToPlayer = this.state.position.distanceTo(playerPos);
    const canSeePlayer = !playerStealth && distToPlayer < BOT_DETECT_RANGE;

    // AI State machine
    if (canSeePlayer) {
      this.aiState = 'hunt';
      this.target = playerPos.clone();
    } else {
      this.aiState = 'wander';
    }

    let fireResult = { shouldFire: false, fireDir: new THREE.Vector3() };

    if (this.aiState === 'wander') {
      this.patrolTimer--;
      if (this.patrolTimer <= 0) {
        this.patrolDir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        this.patrolTimer = 30 + Math.floor(Math.random() * 60);
      }
      this.state.velocity.add(this.patrolDir.clone().multiplyScalar(this.state.maxSpeed * 0.03));
    } else if (this.aiState === 'hunt' && this.target) {
      const toPlayer = this.target.clone().sub(this.state.position).normalize();
      const approachSpeed = this.botType === 'sniper' ? 0.02 : 0.05;
      this.state.velocity.add(toPlayer.multiplyScalar(this.state.maxSpeed * approachSpeed));

      // Fire logic
      this.fireTimer--;
      if (this.fireTimer <= 0 && distToPlayer < (this.botType === 'sniper' ? 1500 : BOT_FIRE_RANGE)) {
        const fireDir = this.target.clone().sub(this.state.position).normalize();
        // Add inaccuracy
        fireDir.x += (Math.random() - 0.5) * this.difficulty.inaccuracy;
        fireDir.y += (Math.random() - 0.5) * this.difficulty.inaccuracy;
        fireDir.z += (Math.random() - 0.5) * this.difficulty.inaccuracy;
        fireDir.normalize();
        fireResult = { shouldFire: true, fireDir };
        this.fireTimer = Math.floor(this.state.fireRate * (1 + this.difficulty.reactionDelay / 30));
      }
    }

    // Damping
    this.state.velocity.multiplyScalar(0.94);
    const speed = this.state.velocity.length();
    if (speed > this.state.maxSpeed) {
      this.state.velocity.multiplyScalar(this.state.maxSpeed / speed);
    }
    this.state.position.add(this.state.velocity);

    // Boundary
    if (this.state.position.x < ARENA.MIN_X) { this.state.position.x = ARENA.MIN_X; this.state.velocity.x *= -0.5; }
    if (this.state.position.x > ARENA.MAX_X) { this.state.position.x = ARENA.MAX_X; this.state.velocity.x *= -0.5; }
    if (this.state.position.y < ARENA.MIN_Y) { this.state.position.y = ARENA.MIN_Y; this.state.velocity.y *= -0.5; }
    if (this.state.position.y > ARENA.MAX_Y) { this.state.position.y = ARENA.MAX_Y; this.state.velocity.y *= -0.5; }
    if (this.state.position.z < ARENA.MIN_Z) { this.state.position.z = ARENA.MIN_Z; this.state.velocity.z *= -0.5; }
    if (this.state.position.z > ARENA.MAX_Z) { this.state.position.z = ARENA.MAX_Z; this.state.velocity.z *= -0.5; }

    this.mesh.position.copy(this.state.position);

    // Face direction of movement
    if (this.state.velocity.length() > 0.1) {
      const lookTarget = this.state.position.clone().add(this.state.velocity);
      this.mesh.lookAt(lookTarget);
    }

    return fireResult;
  }

  die() {
    this.state.alive = false;
    this.state.respawnTimer = BOT_RESPAWN_TICKS;
    this.mesh.visible = false;
  }

  respawn() {
    this.state.alive = true;
    this.state.health = this.state.maxHealth;
    this.state.position.set(
      (Math.random() - 0.5) * ARENA.WIDTH * 0.8,
      (Math.random() - 0.5) * ARENA.HEIGHT * 0.6,
      (Math.random() - 0.5) * ARENA.DEPTH * 0.8
    );
    this.mesh.position.copy(this.state.position);
    this.mesh.visible = true;
    this.aiState = 'wander';
  }

  takeDamage(amount: number) {
    this.state.health -= amount;
    if (this.state.health <= 0) {
      this.state.health = 0;
      this.die();
      return true;
    }
    return false;
  }
}
