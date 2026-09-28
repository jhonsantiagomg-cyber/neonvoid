import * as THREE from 'three';
import { MAX_PARTICLES } from './config';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  fadeOut: boolean;
}

interface Shockwave {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  active: boolean;
  speed: number;
}

export class ParticleEngine3D {
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private scene: THREE.Scene;
  private particleScale: number = 1.0;
  private pool: THREE.Mesh[] = [];
  private shockPool: THREE.Mesh[] = [];
  private geo: THREE.SphereGeometry;
  private shockGeo: THREE.RingGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geo = new THREE.SphereGeometry(1, 4, 4);
    this.shockGeo = new THREE.RingGeometry(0.5, 1, 16);

    // Pre-allocate pools
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.shockGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.shockPool.push(mesh);
    }
  }

  setParticleScale(scale: number) {
    this.particleScale = scale;
  }

  private getParticle(): Particle | null {
    const mesh = this.pool.find(m => !m.visible);
    if (!mesh) return null;
    mesh.visible = true;
    const p: Particle = { mesh, velocity: new THREE.Vector3(), life: 0, maxLife: 30, active: true, fadeOut: true };
    return p;
  }

  private getShockwave(): Shockwave | null {
    const mesh = this.shockPool.find(m => !m.visible);
    if (!mesh) return null;
    mesh.visible = true;
    return { mesh, life: 0, maxLife: 30, active: true, speed: 8 };
  }

  emit(position: THREE.Vector3, color: number, count: number, speed: number = 5, life: number = 30, size: number = 2) {
    const scaledCount = Math.floor(count * this.particleScale);
    for (let i = 0; i < scaledCount; i++) {
      const p = this.getParticle();
      if (!p) break;
      p.mesh.position.copy(position);
      p.mesh.scale.setScalar(size * (0.5 + Math.random() * 0.5));
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      p.velocity.set(
        (Math.random() - 0.5) * speed * 2,
        (Math.random() - 0.5) * speed * 2,
        (Math.random() - 0.5) * speed * 2
      );
      p.life = 0;
      p.maxLife = life + Math.floor(Math.random() * 10);
      p.active = true;
      this.particles.push(p);
    }
  }

  emitShockwave(position: THREE.Vector3, color: number, maxLife: number = 30, speed: number = 8) {
    const sw = this.getShockwave();
    if (!sw) return;
    sw.mesh.position.copy(position);
    sw.mesh.scale.setScalar(1);
    (sw.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
    sw.mesh.lookAt(position.x, position.y + 100, position.z);
    sw.life = 0;
    sw.maxLife = maxLife;
    sw.speed = speed;
    sw.active = true;
    this.shockwaves.push(sw);
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life++;
      p.mesh.position.add(p.velocity);
      p.velocity.multiplyScalar(0.95);
      if (p.fadeOut) {
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - (p.life / p.maxLife);
      }
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      sw.life++;
      const progress = sw.life / sw.maxLife;
      sw.mesh.scale.setScalar(1 + progress * sw.speed * 10);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);
      if (sw.life >= sw.maxLife) {
        sw.active = false;
        sw.mesh.visible = false;
        this.shockwaves.splice(i, 1);
      }
    }
  }

  dispose() {
    this.pool.forEach(m => { this.scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
    this.shockPool.forEach(m => { this.scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
    this.geo.dispose();
    this.shockGeo.dispose();
  }
}
