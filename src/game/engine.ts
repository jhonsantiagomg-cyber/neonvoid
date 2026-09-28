import * as THREE from 'three';
import {
  ARENA, SHIP_CLASSES, DIFFICULTIES, GRAPHICS_PROFILES, ABILITIES,
  INITIAL_BOTS, INITIAL_ORBS, PROJECTILE_SPEED, TARGET_LOCK_RANGE,
  BOT_TYPE_CONFIGS, BOSS_SPAWN_INTERVAL, BOSS_ORB_COUNT,
  WEAPON_PATTERNS, UPGRADES, RARITY_MULTIPLIERS,
  BotType, DifficultyConfig, GraphicsProfile
} from './config';
import { PlayerShip3D, BotShip3D, ProjectilePool, OrbManager } from './entities';
import { BossBase3D, BossLeviathan3D, BossAnnihilator3D, BossMegaTitan3D } from './bosses';
import { Environment3D } from './graphics';
import { SpatialHashGrid3D } from './spatial';
import { ParticleEngine3D } from './particles';
import { HUD, AdminConsole } from './ui';
import { soundFX } from './audio';

export class GameEngine3D {
  // Core
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock = new THREE.Clock();

  // Systems
  private environment!: Environment3D;
  private particles!: ParticleEngine3D;
  private spatialGrid!: SpatialHashGrid3D;
  projectiles!: ProjectilePool;
  orbs!: OrbManager;
  player!: PlayerShip3D;
  bots: BotShip3D[] = [];
  boss: BossBase3D | null = null;
  private hud!: HUD;
  private admin!: AdminConsole;

  // State
  private running: boolean = false;
  private paused: boolean = false;
  private gameOver: boolean = false;
  private pointerLocked: boolean = false;
  private selectedShip: string = 'interceptor';
  private selectedDifficulty: string = 'pilot';
  private selectedGraphics: string = 'ultra';
  private difficultyConfig!: DifficultyConfig;
  private graphicsProfile!: GraphicsProfile;
  timeScale: number = 1;
  godMode: boolean = false;
  freezeAI: boolean = false;

  // Timing
  private accumulator: number = 0;
  private tickInterval: number = 1 / 30;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private fps: number = 60;
  private gameTime: number = 0;
  private bossTimer: number = 0;
  private totalXP: number = 0;
  private startTime: number = 0;
  private shotsFired: number = 0;
  private shotsHit: number = 0;

  // Drone entities
  private drones: { mesh: THREE.Object3D; position: THREE.Vector3; target: THREE.Vector3; fireTimer: number }[] = [];

  // Callbacks
  private onLevelUp: (() => void) | null = null;
  private onGameOver: ((stats: any) => void) | null = null;
  private onBossAlert: ((name: string) => void) | null = null;
  private onBossDefeated: (() => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {}

  setCallbacks(cbs: {
    onLevelUp?: () => void;
    onGameOver?: (stats: any) => void;
    onBossAlert?: (name: string) => void;
    onBossDefeated?: () => void;
  }) {
    this.onLevelUp = cbs.onLevelUp || null;
    this.onGameOver = cbs.onGameOver || null;
    this.onBossAlert = cbs.onBossAlert || null;
    this.onBossDefeated = cbs.onBossDefeated || null;
  }

  init(shipClass: string, difficulty: string, graphics: string) {
    this.selectedShip = shipClass;
    this.selectedDifficulty = difficulty;
    this.selectedGraphics = graphics;
    this.difficultyConfig = DIFFICULTIES[difficulty];
    this.graphicsProfile = GRAPHICS_PROFILES[graphics];

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050510);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);

    // Systems
    this.environment = new Environment3D(this.scene);
    this.environment.build(this.graphicsProfile);
    this.particles = new ParticleEngine3D(this.scene);
    this.particles.setParticleScale(this.graphicsProfile.particleScale);
    this.spatialGrid = new SpatialHashGrid3D();
    this.projectiles = new ProjectilePool(this.scene);
    this.orbs = new OrbManager(this.scene);

    // Player
    this.player = new PlayerShip3D(this.scene, shipClass);

    // Bots
    this.spawnBots();

    // Initial orbs
    this.spawnInitialOrbs();

    // HUD
    const hudContainer = document.getElementById('hud-container')!;
    this.hud = new HUD(hudContainer);

    // Admin
    const adminContainer = document.getElementById('admin-container')!;
    this.admin = new AdminConsole(adminContainer);
    this.admin.setGameRef(this);

    // Audio
    soundFX.init();

    // Events
    this.setupEvents();

    // Start
    this.running = true;
    this.gameOver = false;
    this.paused = false;
    this.gameTime = 0;
    this.bossTimer = 0;
    this.totalXP = 0;
    this.startTime = Date.now();
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.accumulator = 0;

    this.animate();
  }

  private spawnBots() {
    const types: BotType[] = ['scout', 'sniper', 'brawler'];
    for (let i = 0; i < INITIAL_BOTS; i++) {
      const type = types[i % 3];
      const bot = new BotShip3D(this.scene, type, this.difficultyConfig, `bot_${i}`);
      this.bots.push(bot);
    }
  }

  private spawnInitialOrbs() {
    for (let i = 0; i < INITIAL_ORBS; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * ARENA.WIDTH * 0.9,
        (Math.random() - 0.5) * ARENA.HEIGHT * 0.8,
        (Math.random() - 0.5) * ARENA.DEPTH * 0.9
      );
      const r = Math.random();
      const tier = r < 0.6 ? 0 : r < 0.9 ? 1 : 2;
      this.orbs.spawn(pos, tier);
    }
  }

  private setupEvents() {
    // Pointer lock
    this.canvas.addEventListener('click', () => {
      if (!this.pointerLocked && !this.paused && !this.gameOver) {
        this.canvas.requestPointerLock();
      }
      soundFX.resume();
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    // Mouse move
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      const sensitivity = 0.002;
      this.player.yaw -= e.movementX * sensitivity;
      this.player.pitch -= e.movementY * sensitivity;
      this.player.pitch = Math.max(-1.45, Math.min(1.45, this.player.pitch)); // ~83 degrees
    });

    // Mouse buttons
    document.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      if (e.button === 0) this.player.mouseDown = true;
      if (e.button === 2) this.activateAbility();
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.player.mouseDown = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.player.keys.add(e.key.toLowerCase());
      if (e.key === 'Escape') {
        if (this.admin.isVisible()) {
          this.admin.toggle();
        } else {
          this.togglePause();
        }
      }
      if (e.key === 'F1') {
        e.preventDefault();
        this.admin.toggle();
      }
      if (e.key === 'Shift') this.player.boostActive = true;
      if (e.key.toLowerCase() === 'e') {
        // Active reload
        if (this.player.state.activeReloadWindow) {
          this.player.state.heat = 0;
          this.player.state.overheated = false;
          this.player.state.activeReloadWindow = false;
          soundFX.activeReload();
        }
      }
      if (e.key.toLowerCase() === 't') {
        // Toggle target
        this.cycleTargetLock();
      }
      if (e.key.toLowerCase() === 'i') {
        // Toggle inertia
        this.player.inertiaDampener = !this.player.inertiaDampener;
      }
    });
    document.addEventListener('keyup', (e) => {
      this.player.keys.delete(e.key.toLowerCase());
      if (e.key === 'Shift') this.player.boostActive = false;
    });

    // Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Inertia toggle click
    const toggle = document.getElementById('inertia-toggle');
    if (toggle) {
      toggle.style.pointerEvents = 'auto';
      toggle.addEventListener('click', () => {
        this.player.inertiaDampener = !this.player.inertiaDampener;
      });
    }
  }

  private togglePause() {
    this.paused = !this.paused;
    const pauseEl = document.getElementById('pause-screen');
    if (pauseEl) pauseEl.classList.toggle('hidden', !this.paused);
    if (this.paused) {
      document.exitPointerLock();
    }
  }

  private cycleTargetLock() {
    const aliveBots = this.bots.filter(b => b.state.alive);
    if (aliveBots.length === 0 && !this.boss) {
      this.player.targetLock = null;
      return;
    }

    // Find nearest target in forward cone
    const forward = this.player.getForward();
    let bestDist = TARGET_LOCK_RANGE;
    let bestPos: THREE.Vector3 | null = null;

    for (const bot of aliveBots) {
      const toBot = bot.state.position.clone().sub(this.player.state.position);
      const dist = toBot.length();
      if (dist > TARGET_LOCK_RANGE) continue;
      const dot = toBot.normalize().dot(forward);
      if (dot < 0.5) continue; // Within ~60 degree cone
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = bot.state.position.clone();
      }
    }

    if (this.boss && this.boss.state.alive) {
      const toBoss = this.boss.state.position.clone().sub(this.player.state.position);
      const dist = toBoss.length();
      if (dist < bestDist) {
        bestPos = this.boss.state.position.clone();
        bestDist = dist;
      }
    }

    this.player.targetLock = bestPos;
    this.player.targetLockDist = bestDist;
  }

  private activateAbility() {
    if (this.player.abilityCooldown > 0) return;
    const ability = ABILITIES[this.player.abilityIndex];
    this.player.abilityCooldown = ability.cooldown;
    soundFX.ability();

    const pos = this.player.state.position.clone();
    const forward = this.player.getForward();

    switch (ability.id) {
      case 'decoy': {
        // Deploy decoy - attracts bots
        const decoyPos = pos.clone().add(forward.clone().multiplyScalar(100));
        this.particles.emit(decoyPos, 0xbc13fe, 20, 3, 90, 3);
        // Bots will target decoy for duration
        break;
      }
      case 'reflect': {
        this.player.shieldActive = true;
        setTimeout(() => { this.player.shieldActive = false; }, ability.duration * 33);
        this.particles.emit(pos, 0x00f3ff, 30, 5, 30, 4);
        break;
      }
      case 'timewarp': {
        this.player.timeWarpTarget = true;
        setTimeout(() => { this.player.timeWarpTarget = false; }, ability.duration * 33);
        this.particles.emitShockwave(pos, 0xbc13fe, 60, 12);
        break;
      }
      case 'gravjump': {
        const jumpDist = 400;
        this.player.state.position.add(forward.clone().multiplyScalar(jumpDist));
        this.particles.emit(pos, 0x00f3ff, 25, 8, 20, 3);
        this.particles.emit(this.player.state.position, 0x00f3ff, 25, 8, 20, 3);
        break;
      }
      case 'drones': {
        this.player.dronesActive = true;
        this.drones = [];
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2;
          const droneMesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(3, 0),
            new THREE.MeshBasicMaterial({ color: 0x00f3ff })
          );
          this.scene.add(droneMesh);
          const dronePos = pos.clone().add(new THREE.Vector3(Math.cos(angle) * 30, Math.sin(angle) * 30, 0));
          droneMesh.position.copy(dronePos);
          this.drones.push({ mesh: droneMesh, position: dronePos, target: new THREE.Vector3(), fireTimer: 0 });
        }
        setTimeout(() => {
          this.player.dronesActive = false;
          this.drones.forEach(d => this.scene.remove(d.mesh));
          this.drones = [];
        }, ability.duration * 33);
        break;
      }
      case 'blackhole': {
        this.player.blackholeActive = true;
        this.player.blackholePos = pos.clone().add(forward.clone().multiplyScalar(200));
        this.particles.emitShockwave(this.player.blackholePos, 0xbc13fe, 150, 5);
        setTimeout(() => { this.player.blackholeActive = false; }, ability.duration * 33);
        break;
      }
      case 'emp': {
        this.player.empActive = true;
        this.bots.forEach(b => { b.stunTimer = 90; });
        this.particles.emitShockwave(pos, 0xffd75e, 40, 15);
        setTimeout(() => { this.player.empActive = false; }, 90 * 33);
        break;
      }
      case 'phasebeam': {
        // Fire a powerful beam - represented as a fast projectile
        const beamVel = forward.clone().multiplyScalar(PROJECTILE_SPEED * 3);
        this.projectiles.spawn(pos.clone(), beamVel, 'player', this.player.state.damage * 5, '#ffffff');
        this.particles.emit(pos, 0xffffff, 15, 10, 15, 2);
        break;
      }
      case 'qjump': {
        const randomOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 600,
          (Math.random() - 0.5) * 400,
          (Math.random() - 0.5) * 600
        );
        this.particles.emit(pos, 0xbc13fe, 20, 6, 20, 3);
        this.player.state.position.add(randomOffset);
        // Clamp to arena
        this.player.state.position.x = Math.max(ARENA.MIN_X + 50, Math.min(ARENA.MAX_X - 50, this.player.state.position.x));
        this.player.state.position.y = Math.max(ARENA.MIN_Y + 50, Math.min(ARENA.MAX_Y - 50, this.player.state.position.y));
        this.player.state.position.z = Math.max(ARENA.MIN_Z + 50, Math.min(ARENA.MAX_Z - 50, this.player.state.position.z));
        this.particles.emit(this.player.state.position, 0xbc13fe, 20, 6, 20, 3);
        break;
      }
      case 'deflector': {
        this.player.deflectorActive = true;
        this.particles.emit(pos, 0x6366f1, 25, 4, 90, 3);
        setTimeout(() => { this.player.deflectorActive = false; }, ability.duration * 33);
        break;
      }
      case 'cryomax': {
        this.player.state.heat = 0;
        this.player.state.overheated = false;
        this.particles.emit(pos, 0x00f3ff, 20, 5, 30, 4);
        break;
      }
      case 'micromissiles': {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle) * 0.3, Math.sin(angle)).normalize();
          const vel = dir.multiplyScalar(PROJECTILE_SPEED * 0.8);
          const p = this.projectiles.spawn(pos.clone(), vel, 'player', this.player.state.damage * 0.8, '#ffd75e', true);
          if (p) {
            // Find nearest enemy for homing
            let nearest: THREE.Vector3 | null = null;
            let nearDist = 1500;
            for (const bot of this.bots) {
              if (!bot.state.alive) continue;
              const d = bot.state.position.distanceTo(pos);
              if (d < nearDist) { nearDist = d; nearest = bot.state.position.clone(); }
            }
            p.homingTarget = nearest;
          }
        }
        break;
      }
      case 'photonic': {
        this.player.photonicActive = true;
        this.particles.emitShockwave(pos, 0x00f3ff, 90, 3);
        setTimeout(() => { this.player.photonicActive = false; }, ability.duration * 33);
        break;
      }
      case 'shadow': {
        this.player.stealthActive = true;
        setTimeout(() => { this.player.stealthActive = false; }, ability.duration * 33);
        this.particles.emit(pos, 0x222244, 15, 3, 60, 2);
        break;
      }
      case 'polar': {
        // Reverse nearby enemy velocities
        for (const bot of this.bots) {
          if (!bot.state.alive) continue;
          const dist = bot.state.position.distanceTo(pos);
          if (dist < 600) {
            bot.state.velocity.multiplyScalar(-1.5);
          }
        }
        this.particles.emitShockwave(pos, 0xff2d55, 40, 10);
        break;
      }
    }
  }

  // ============ GAME LOOP ============
  private animate = () => {
    if (!this.running) return;
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // FPS
    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 1) {
      this.fps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    if (this.paused || this.gameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Fixed timestep logic
    this.accumulator += delta * this.timeScale;
    while (this.accumulator >= this.tickInterval) {
      this.tick();
      this.accumulator -= this.tickInterval;
    }

    // Render
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  private tick() {
    this.gameTime++;

    // Player
    this.player.updateMovement();
    this.player.updateHeat();
    this.player.updateShieldRegen();

    // Shooting
    if (this.player.mouseDown && this.player.state.alive) {
      this.playerShoot();
    }

    // Ability cooldown
    if (this.player.abilityCooldown > 0) this.player.abilityCooldown--;

    // Bots
    if (!this.freezeAI) {
      const timeWarpSlow = this.player.timeWarpTarget ? 0.4 : 1.0;
      for (const bot of this.bots) {
        if (!bot.state.alive) continue;
        const result = bot.update(this.player.state.position, this.player.stealthActive);
        if (result.shouldFire && !this.player.empActive) {
          this.botShoot(bot, result.fireDir);
        }
        // Black hole pull
        if (this.player.blackholeActive) {
          const toBH = this.player.blackholePos.clone().sub(bot.state.position);
          const dist = toBH.length();
          if (dist < 500 && dist > 10) {
            bot.state.velocity.add(toBH.normalize().multiplyScalar(2));
          }
        }
      }
    }

    // Boss
    if (this.boss && this.boss.state.alive) {
      const dirs = this.boss.update(this.player.state.position);
      for (const dir of dirs) {
        const vel = dir.multiplyScalar(PROJECTILE_SPEED * this.difficultyConfig.projectileSpeed);
        this.projectiles.spawn(
          this.boss.state.position.clone(),
          vel,
          'boss',
          this.boss.state.maxHealth * 0.01,
          '#ff2d55',
          false,
          true
        );
      }
    }

    // Boss spawn timer
    this.bossTimer++;
    if (!this.boss && this.bossTimer >= BOSS_SPAWN_INTERVAL && this.gameTime > 600) {
      this.bossTimer = 0;
      const types = ['leviathan', 'annihilator', 'megatitan'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.spawnBoss(type);
    }

    // Drones
    if (this.player.dronesActive) {
      for (const drone of this.drones) {
        // Orbit player
        const angle = this.gameTime * 0.05 + this.drones.indexOf(drone) * (Math.PI * 2 / 3);
        const orbitPos = this.player.state.position.clone().add(
          new THREE.Vector3(Math.cos(angle) * 40, Math.sin(angle * 0.7) * 20, Math.sin(angle) * 40)
        );
        drone.position.lerp(orbitPos, 0.1);
        drone.mesh.position.copy(drone.position);

        // Auto-fire at nearest bot
        drone.fireTimer--;
        if (drone.fireTimer <= 0) {
          drone.fireTimer = 15;
          let nearest: BotShip3D | null = null;
          let nearDist = 600;
          for (const bot of this.bots) {
            if (!bot.state.alive) continue;
            const d = bot.state.position.distanceTo(drone.position);
            if (d < nearDist) { nearDist = d; nearest = bot; }
          }
          if (nearest) {
            const dir = nearest.state.position.clone().sub(drone.position).normalize();
            this.projectiles.spawn(drone.position.clone(), dir.multiplyScalar(PROJECTILE_SPEED), 'player', this.player.state.damage * 0.5, '#00f3ff');
          }
        }
      }
    }

    // Projectiles
    this.projectiles.update();

    // Collisions
    this.checkCollisions();

    // Orbs
    this.orbs.update(this.player.state.position, (xp) => {
      this.totalXP += xp;
      soundFX.orb();
      const leveled = this.player.addXP(xp);
      if (leveled) {
        soundFX.levelUp();
        this.particles.emit(this.player.state.position, 0xffd75e, 30, 6, 40, 3);
        if (this.onLevelUp) this.onLevelUp();
      }
    });

    // Orb regeneration
    if (this.gameTime % 60 === 0 && this.orbs.getCount() < INITIAL_ORBS) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * ARENA.WIDTH * 0.9,
        (Math.random() - 0.5) * ARENA.HEIGHT * 0.8,
        (Math.random() - 0.5) * ARENA.DEPTH * 0.9
      );
      this.orbs.spawn(pos, Math.random() < 0.7 ? 0 : Math.random() < 0.8 ? 1 : 2);
    }

    // Particles
    this.particles.update();

    // Target lock update (every 5 ticks)
    if (this.gameTime % 5 === 0) {
      this.cycleTargetLock();
    }

    // Check game over
    if (!this.player.state.alive && !this.gameOver) {
      this.triggerGameOver();
    }

    // HUD
    this.hud.update(this.player, this.bots, this.orbs.getActive(), this.boss, this.fps);
  }

  private playerShoot() {
    if (this.player.state.fireCooldown > 0) return;
    if (this.player.state.overheated) return;

    const pattern = WEAPON_PATTERNS[this.player.state.weaponPattern];
    const forward = this.player.getForward();
    const right = this.player.getRight();

    // Heat
    this.player.state.heat += this.player.state.heatPerShot;
    if (this.player.state.heat >= 100) {
      this.player.state.overheated = true;
      this.player.state.overheatLockout = 65;
      soundFX.overheated();
      return;
    }

    for (let i = 0; i < pattern.count; i++) {
      let dir = forward.clone();
      if (pattern.count === 1) {
        // Single forward
      } else if (pattern.count === 2) {
        const offset = (i === 0 ? -1 : 1) * 0.03;
        dir.add(right.clone().multiplyScalar(offset));
      } else if (pattern.count === 3) {
        const angle = (i - 1) * pattern.spread;
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      } else if (pattern.count === 4) {
        const offset = ((i - 1.5) / 1.5) * pattern.spread;
        dir.add(right.clone().multiplyScalar(offset));
        dir.add(new THREE.Vector3(0, (i % 2 === 0 ? 0.02 : -0.02), 0));
      } else if (pattern.count === 8) {
        const angle = (i / 8) * Math.PI * 2;
        dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      }
      dir.normalize();

      const vel = dir.multiplyScalar(this.player.state.projectileSpeed);
      const spawnPos = this.player.state.position.clone().add(forward.clone().multiplyScalar(5));
      this.projectiles.spawn(spawnPos, vel, 'player', this.player.state.damage, this.player.state.color);
    }

    this.player.state.fireCooldown = Math.floor(this.player.state.fireRate);
    this.shotsFired++;
    soundFX.laser();
  }

  private botShoot(bot: BotShip3D, dir: THREE.Vector3) {
    const vel = dir.multiplyScalar(PROJECTILE_SPEED * this.difficultyConfig.projectileSpeed * 0.7);
    this.projectiles.spawn(
      bot.state.position.clone(),
      vel,
      bot.id,
      bot.state.damage,
      bot.state.color
    );
  }

  private checkCollisions() {
    const activeProjectiles = this.projectiles.getActive();

    for (const proj of activeProjectiles) {
      if (proj.owner === 'player') {
        // Player projectile vs bots
        for (const bot of this.bots) {
          if (!bot.state.alive) continue;
          const dist = proj.position.distanceTo(bot.state.position);
          if (dist < 12) {
            const killed = bot.takeDamage(proj.damage);
            this.projectiles.deactivate(proj);
            this.shotsHit++;
            this.particles.emit(proj.position, 0xff2d55, 5, 3, 15, 1.5);
            soundFX.impact();

            // Vampirism
            if (this.player.state.vampirism > 0) {
              const heal = proj.damage * this.player.state.vampirism;
              this.player.state.health = Math.min(this.player.state.maxHealth, this.player.state.health + heal);
            }

            if (killed) {
              this.player.state.kills++;
              this.particles.emit(bot.state.position, parseInt(bot.state.color.replace('#', '0x')), 25, 6, 30, 3);
              this.particles.emitShockwave(bot.state.position, parseInt(bot.state.color.replace('#', '0x')), 25, 6);
              soundFX.explosion();
              // Drop orbs
              const orbCount = 3 + Math.floor(Math.random() * 5);
              this.orbs.spawnMany(bot.state.position, orbCount);
            }
            break;
          }
        }

        // Player projectile vs boss
        if (this.boss && this.boss.state.alive && proj.active) {
          const dist = proj.position.distanceTo(this.boss.state.position);
          if (dist < 30) {
            const killed = this.boss.takeDamage(proj.damage);
            this.projectiles.deactivate(proj);
            this.shotsHit++;
            this.particles.emit(proj.position, 0xbc13fe, 5, 3, 15, 1.5);
            soundFX.impact();

            if (killed) {
              this.onBossKilled();
            }
          }
        }
      } else {
        // Enemy projectile vs player
        if (proj.owner !== 'player' && this.player.state.alive) {
          const dist = proj.position.distanceTo(this.player.state.position);
          if (dist < 8) {
            // Deflector check
            if (this.player.deflectorActive) {
              proj.velocity.multiplyScalar(-1);
              proj.owner = 'player';
              this.particles.emit(proj.position, 0x6366f1, 5, 3, 10, 1.5);
              continue;
            }

            if (!this.godMode) {
              const fromDir = proj.position.clone().sub(this.player.state.position).normalize();
              this.player.takeDamage(proj.damage * this.difficultyConfig.damageMultiplier, fromDir);
            }
            this.projectiles.deactivate(proj);
            this.particles.emit(proj.position, 0xff2d55, 5, 3, 15, 1.5);
            soundFX.impact();
          }
        }

        // Enemy projectile vs bots (friendly fire off - skip)
      }

      // Black hole pulls projectiles
      if (this.player.blackholeActive && proj.active) {
        const toBH = this.player.blackholePos.clone().sub(proj.position);
        const dist = toBH.length();
        if (dist < 400 && dist > 5) {
          proj.velocity.add(toBH.normalize().multiplyScalar(1));
        }
        if (dist < 15) {
          this.projectiles.deactivate(proj);
          this.particles.emit(proj.position, 0xbc13fe, 3, 2, 10, 1);
        }
      }
    }

    // Bot collision with player (ramming)
    for (const bot of this.bots) {
      if (!bot.state.alive) continue;
      const dist = bot.state.position.distanceTo(this.player.state.position);
      if (dist < 15) {
        if (!this.godMode) {
          this.player.takeDamage(5, bot.state.position.clone().sub(this.player.state.position).normalize());
        }
        bot.takeDamage(10);
      }
    }
  }

  private onBossKilled() {
    if (!this.boss) return;
    soundFX.bossExplosion();
    this.particles.emit(this.boss.state.position, 0xbc13fe, 50, 10, 60, 5);
    this.particles.emitShockwave(this.boss.state.position, 0xffd75e, 60, 12);
    this.particles.emitShockwave(this.boss.state.position, 0xbc13fe, 80, 8);

    // Drop orbs
    this.orbs.spawnMany(this.boss.state.position, BOSS_ORB_COUNT, [0.3, 0.4, 0.3]);

    // Remove boss mesh
    this.scene.remove(this.boss.state.mesh);
    this.boss = null;

    if (this.onBossDefeated) this.onBossDefeated();
  }

  spawnBoss(type: string) {
    if (this.boss) return;
    switch (type) {
      case 'leviathan':
        this.boss = new BossLeviathan3D(this.scene, this.difficultyConfig);
        break;
      case 'annihilator':
        this.boss = new BossAnnihilator3D(this.scene, this.difficultyConfig);
        break;
      case 'megatitan':
        this.boss = new BossMegaTitan3D(this.scene, this.difficultyConfig);
        break;
    }
    soundFX.bossAlert();
    if (this.onBossAlert) this.onBossAlert(type.toUpperCase());
  }

  private triggerGameOver() {
    this.gameOver = true;
    document.exitPointerLock();
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    if (this.onGameOver) {
      this.onGameOver({
        level: this.player.state.level,
        kills: this.player.state.kills,
        time: elapsed,
        accuracy,
        totalXP: this.totalXP,
      });
    }
  }

  private updateCamera() {
    this.camera.position.copy(this.player.state.position);
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0, 'YXZ');

    // FOV boost effect
    const targetFOV = this.player.boostActive ? 84 : 75;
    this.camera.fov += (targetFOV - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();

    // Update audio listener position
    soundFX.setListenerPosition(
      this.player.state.position.x,
      this.player.state.position.y,
      this.player.state.position.z
    );
  }

  // ============ PUBLIC API ============
  onGraphicsQualityChange(profile: string) {
    this.graphicsProfile = GRAPHICS_PROFILES[profile];
    this.environment.build(this.graphicsProfile);
    this.particles.setParticleScale(this.graphicsProfile.particleScale);
  }

  getStats() {
    return {
      level: this.player?.state.level || 1,
      kills: this.player?.state.kills || 0,
      gameTime: this.gameTime,
      totalXP: this.totalXP,
    };
  }

  showUpgradeModal() {
    // Guard: don't show if already showing
    const existingModal = document.getElementById('upgrade-modal');
    if (existingModal && !existingModal.classList.contains('hidden')) return;
    this.paused = true;
    document.exitPointerLock();
    // Pick 3 random upgrades
    const available = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
    const modal = document.getElementById('upgrade-modal');
    if (!modal) return;

    modal.innerHTML = `<div class="upgrade-cards">
      ${available.map((u, i) => `
        <div class="upgrade-card ${u.rarity}" data-idx="${i}">
          <h4 style="color: ${this.getRarityColor(u.rarity)}">${u.name}</h4>
          <p>${u.description}</p>
          <div class="upgrade-rarity" style="color: ${this.getRarityColor(u.rarity)}">${u.rarity.toUpperCase()}</div>
        </div>
      `).join('')}
    </div>`;

    modal.classList.remove('hidden');

    modal.querySelectorAll('.upgrade-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-idx')!);
        const upgrade = available[idx];
        const mult = RARITY_MULTIPLIERS[upgrade.rarity];
        // Apply with rarity multiplier
        upgrade.apply(this.player.state);
        // Scale some stats by rarity
        if (upgrade.id === 'plasma_cond') {
          this.player.state.damage *= (mult - 1) * 0.5;
        }
        modal.classList.add('hidden');
        soundFX.ability();
      });
    });
  }

  private getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: '#ffffff', uncommon: '#22c55e', rare: '#3b82f6',
      impossible: '#bc13fe', legendary: '#ffd75e'
    };
    return colors[rarity] || '#ffffff';
  }

  showRoulette() {
    this.paused = true;
    document.exitPointerLock();
    const modal = document.getElementById('roulette-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.innerHTML = `
      <h2 style="color:#ffd75e;font-size:1.2rem;letter-spacing:0.2em;margin-bottom:1rem;">QUANTUM MATRIX ROULETTE</h2>
      <div class="roulette-wheel">
        <span style="font-size:2rem;">⚡</span>
      </div>
      <p style="margin-top:1rem;color:#ffd75e;font-size:0.7rem;">REWARD: +40% DAMAGE, IMPROVED FIRE RATE</p>
    `;
    setTimeout(() => {
      this.player.state.damage *= 1.4;
      this.player.state.fireRate = Math.max(1, this.player.state.fireRate * 0.75);
      modal.classList.add('hidden');
      soundFX.levelUp();
    }, 2500);
  }

  resume() {
    this.paused = false;
    const pauseEl = document.getElementById('pause-screen');
    if (pauseEl) pauseEl.classList.add('hidden');
  }

  destroy() {
    this.running = false;
    document.exitPointerLock();
    this.renderer.dispose();
    this.environment.dispose();
    this.particles.dispose();
    this.projectiles.dispose();
    this.orbs.dispose();
    this.hud.dispose();
  }
}
