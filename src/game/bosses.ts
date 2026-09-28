import * as THREE from 'three';
import { ARENA, DifficultyConfig } from './config';
import { BossMeshFactory } from './graphics';

export interface BossState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  alive: boolean;
  mesh: THREE.Group;
  attackTimer: number;
  phase: number;
  type: string;
}

export class BossBase3D {
  state: BossState;
  difficulty: DifficultyConfig;

  constructor(type: string, health: number, scene: THREE.Scene, difficulty: DifficultyConfig) {
    this.difficulty = difficulty;
    const mesh = new THREE.Group();
    this.state = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 400,
        -1500
      ),
      velocity: new THREE.Vector3(),
      health,
      maxHealth: health,
      alive: true,
      mesh,
      attackTimer: 0,
      phase: 0,
      type,
    };
  }

  update(playerPos: THREE.Vector3): THREE.Vector3[] {
    return [];
  }

  takeDamage(amount: number): boolean {
    this.state.health -= amount;
    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.alive = false;
      return true;
    }
    return false;
  }

  moveToPlayer(playerPos: THREE.Vector3, speed: number) {
    const dir = playerPos.clone().sub(this.state.position).normalize();
    this.state.velocity.add(dir.multiplyScalar(speed * this.difficulty.bossAggression));
    this.state.velocity.multiplyScalar(0.95);
    const spd = this.state.velocity.length();
    if (spd > speed * 2) this.state.velocity.multiplyScalar((speed * 2) / spd);
    this.state.position.add(this.state.velocity);

    // Boundary
    this.state.position.x = Math.max(ARENA.MIN_X + 100, Math.min(ARENA.MAX_X - 100, this.state.position.x));
    this.state.position.y = Math.max(ARENA.MIN_Y + 100, Math.min(ARENA.MAX_Y - 100, this.state.position.y));
    this.state.position.z = Math.max(ARENA.MIN_Z + 100, Math.min(ARENA.MAX_Z - 100, this.state.position.z));

    this.state.mesh.position.copy(this.state.position);
    this.state.mesh.lookAt(playerPos);
  }
}

// ============ LEVIATHAN ============
export class BossLeviathan3D extends BossBase3D {
  private segTime: number = 0;

  constructor(scene: THREE.Scene, difficulty: DifficultyConfig) {
    super('leviathan', 3200, scene, difficulty);
    const mesh = BossMeshFactory.createLeviathan();
    scene.add(mesh);
    this.state.mesh = mesh;
    this.state.position.set(800, 200, -1200);
    this.state.mesh.position.copy(this.state.position);
  }

  update(playerPos: THREE.Vector3): THREE.Vector3[] {
    if (!this.state.alive) return [];
    const projectiles: THREE.Vector3[] = [];

    this.moveToPlayer(playerPos, 3 * this.difficulty.bossAggression);

    // Sinusoidal body movement
    this.segTime += 0.05;
    this.state.mesh.children.forEach((child, i) => {
      if (i > 2 && i < 15) {
        child.position.y = Math.sin(this.segTime + i * 0.4) * 5;
        child.position.x = Math.cos(this.segTime + i * 0.3) * 3;
      }
    });

    // Attack: ring of 10 plasma projectiles
    this.state.attackTimer++;
    const attackInterval = Math.floor(75 / this.difficulty.bossAggression);
    if (this.state.attackTimer >= attackInterval) {
      this.state.attackTimer = 0;
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const dir = new THREE.Vector3(
          Math.cos(angle),
          Math.sin(angle) * 0.3,
          Math.sin(angle)
        ).normalize();
        projectiles.push(dir);
      }
    }

    return projectiles;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.state.mesh);
  }
}

// ============ ANNIHILATOR ============
export class BossAnnihilator3D extends BossBase3D {
  private ringRotation: number = 0;

  constructor(scene: THREE.Scene, difficulty: DifficultyConfig) {
    super('annihilator', 4500, scene, difficulty);
    const mesh = BossMeshFactory.createAnnihilator();
    scene.add(mesh);
    this.state.mesh = mesh;
    this.state.position.set(-600, -100, -1000);
    this.state.mesh.position.copy(this.state.position);
  }

  update(playerPos: THREE.Vector3): THREE.Vector3[] {
    if (!this.state.alive) return [];
    const projectiles: THREE.Vector3[] = [];

    this.moveToPlayer(playerPos, 2.5 * this.difficulty.bossAggression);

    // Rotate rings
    this.ringRotation += 0.02;
    if (this.state.mesh.children.length > 2) {
      this.state.mesh.children[1].rotation.z = this.ringRotation;
      this.state.mesh.children[2].rotation.z = -this.ringRotation * 0.7;
    }

    // Attack: battery of 4 projectiles
    this.state.attackTimer++;
    const attackInterval = Math.floor(40 / this.difficulty.bossAggression);
    if (this.state.attackTimer >= attackInterval) {
      this.state.attackTimer = 0;
      const toPlayer = playerPos.clone().sub(this.state.position).normalize();
      for (let i = 0; i < 4; i++) {
        const spread = (i - 1.5) * 0.15;
        const dir = toPlayer.clone();
        dir.x += spread;
        dir.y += (Math.random() - 0.5) * 0.1;
        dir.normalize();
        projectiles.push(dir);
      }
    }

    return projectiles;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.state.mesh);
  }
}

// ============ MEGA TITAN ============
export class BossMegaTitan3D extends BossBase3D {
  private spiralAngle: number = 0;
  private reactorPulse: number = 0;

  constructor(scene: THREE.Scene, difficulty: DifficultyConfig) {
    super('megatitan', 7000, scene, difficulty);
    const mesh = BossMeshFactory.createMegaTitan();
    scene.add(mesh);
    this.state.mesh = mesh;
    this.state.position.set(0, 300, -1500);
    this.state.mesh.position.copy(this.state.position);
  }

  update(playerPos: THREE.Vector3): THREE.Vector3[] {
    if (!this.state.alive) return [];
    const projectiles: THREE.Vector3[] = [];

    this.moveToPlayer(playerPos, 1.5 * this.difficulty.bossAggression);

    // Reactor pulse
    this.reactorPulse += 0.05;
    if (this.state.mesh.children[1]) {
      const scale = 1 + Math.sin(this.reactorPulse) * 0.2;
      this.state.mesh.children[1].scale.setScalar(scale);
    }

    // Shield ring rotation
    if (this.state.mesh.children[2]) {
      this.state.mesh.children[2].rotation.z += 0.01;
      this.state.mesh.children[2].rotation.x += 0.005;
    }

    // Attack: spiral plasma
    this.state.attackTimer++;
    const attackInterval = Math.floor(20 / this.difficulty.bossAggression);
    if (this.state.attackTimer >= attackInterval) {
      this.state.attackTimer = 0;
      this.spiralAngle += 0.3;
      const toPlayer = playerPos.clone().sub(this.state.position).normalize();
      const dir = toPlayer.clone();
      dir.x += Math.cos(this.spiralAngle) * 0.3;
      dir.y += Math.sin(this.spiralAngle) * 0.3;
      dir.normalize();
      projectiles.push(dir);
    }

    return projectiles;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.state.mesh);
  }
}
