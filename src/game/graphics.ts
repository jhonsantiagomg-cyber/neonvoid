import * as THREE from 'three';
import { ARENA, GraphicsProfile } from './config';

// ============ MESH FACTORY ============
export class MeshFactory {
  static createPlayerShip(color: string): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.3 });
    const wireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), wireframe: true, transparent: true, opacity: 0.4 });

    // Fuselage
    const body = new THREE.Mesh(new THREE.ConeGeometry(3, 18, 6), mat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Cockpit
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 6), new THREE.MeshPhongMaterial({ color: 0x111122, emissive: new THREE.Color(color), emissiveIntensity: 0.1 }));
    cockpit.position.z = -2;
    cockpit.scale.set(1, 0.6, 1.2);
    group.add(cockpit);

    // Wings
    const wingGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([0, 0, 0, -12, -1, 4, -6, 0, -3, 0, 0, 0, 12, -1, 4, 6, 0, -3]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    wingGeo.computeVertexNormals();
    const wings = new THREE.Mesh(wingGeo, mat);
    group.add(wings);

    // Edge glow
    const edgeGeo = new THREE.EdgesGeometry(wingGeo);
    const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(color) }));
    group.add(edgeLine);

    // Engines
    for (let side of [-1, 1]) {
      const engine = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 6), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
      engine.rotation.x = -Math.PI / 2;
      engine.position.set(side * 5, -0.5, 6);
      group.add(engine);
    }

    // Wireframe overlay
    const wireBody = new THREE.Mesh(new THREE.ConeGeometry(3.2, 18.5, 6), wireMat);
    wireBody.rotation.x = Math.PI / 2;
    group.add(wireBody);

    return group;
  }

  static createBotShip(color: string, type: string): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.2 });

    if (type === 'scout') {
      const body = new THREE.Mesh(new THREE.ConeGeometry(2, 12, 4), mat);
      body.rotation.x = Math.PI / 2;
      group.add(body);
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 3), mat);
      wing1.position.z = 2;
      group.add(wing1);
    } else if (type === 'sniper') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, 16, 6), mat);
      body.rotation.x = Math.PI / 2;
      group.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8, 4), mat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -10;
      group.add(barrel);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 14), mat);
      group.add(body);
      const shield = new THREE.Mesh(new THREE.SphereGeometry(7, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), wireframe: true, transparent: true, opacity: 0.2 }));
      group.add(shield);
    }

    // Wireframe
    const wire = new THREE.Mesh(new THREE.SphereGeometry(5, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), wireframe: true, transparent: true, opacity: 0.15 }));
    group.add(wire);

    return group;
  }

  static createOrb(tier: number): THREE.Group {
    const group = new THREE.Group();
    const colors = [0x00f3ff, 0x22c55e, 0xffd75e];
    const sizes = [2, 3, 4.5];
    const color = colors[Math.min(tier, 2)];
    const size = sizes[Math.min(tier, 2)];

    // Core crystal
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(size * 0.6, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    group.add(core);

    // Wire shell
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 0),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 })
    );
    group.add(shell);

    // Orbital ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(size * 1.2, 0.2, 4, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
    );
    group.add(ring);

    // Point light
    const light = new THREE.PointLight(color, 0.5, 50);
    group.add(light);

    return group;
  }

  static createProjectile(color: string): THREE.Group {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    group.add(core);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 4, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.4 })
    );
    group.add(glow);

    return group;
  }

  static createMissile(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 4, 6),
      new THREE.MeshPhongMaterial({ color: 0x888888, emissive: 0x222222 })
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.5, 6),
      new THREE.MeshPhongMaterial({ color: 0xffd75e, emissive: 0xffd75e, emissiveIntensity: 0.3 })
    );
    tip.rotation.x = Math.PI / 2;
    tip.position.z = -2.5;
    group.add(tip);
    return group;
  }

  static createShield(radius: number, color: number): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 12),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.3 })
    );
  }
}

// ============ BOSS MESH FACTORY ============
export class BossMeshFactory {
  static createLeviathan(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: 0x1a0a2e, emissive: 0xbc13fe, emissiveIntensity: 0.3 });

    // Head
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(12, 1), mat);
    group.add(head);

    // Eyes
    for (let side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      eye.position.set(side * 5, 3, -8);
      group.add(eye);
    }

    // Segments
    for (let i = 0; i < 12; i++) {
      const seg = new THREE.Mesh(
        new THREE.DodecahedronGeometry(8 - i * 0.4, 0),
        new THREE.MeshPhongMaterial({ color: 0x1a0a2e, emissive: 0xbc13fe, emissiveIntensity: 0.15 })
      );
      seg.position.z = 10 + i * 8;
      seg.position.y = Math.sin(i * 0.5) * 3;
      seg.userData.segIndex = i;
      group.add(seg);
    }

    // Spines
    for (let i = 0; i < 6; i++) {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(1, 8, 4),
        new THREE.MeshBasicMaterial({ color: 0xbc13fe, transparent: true, opacity: 0.6 })
      );
      spine.position.set(0, 10, i * 15);
      group.add(spine);
    }

    return group;
  }

  static createAnnihilator(): THREE.Group {
    const group = new THREE.Group();

    // Core
    const core = new THREE.Mesh(
      new THREE.DodecahedronGeometry(15, 0),
      new THREE.MeshPhongMaterial({ color: 0x2a0a0a, emissive: 0xff2d55, emissiveIntensity: 0.4 })
    );
    group.add(core);

    // Rings
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(22 + i * 8, 1.5, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = i * Math.PI / 3;
      ring.rotation.y = i * Math.PI / 4;
      group.add(ring);
    }

    // Cannons
    for (let i = 0; i < 4; i++) {
      const cannon = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 3, 12, 6),
        new THREE.MeshPhongMaterial({ color: 0x444444, emissive: 0xff2d55, emissiveIntensity: 0.2 })
      );
      const angle = (i / 4) * Math.PI * 2;
      cannon.position.set(Math.cos(angle) * 20, 0, Math.sin(angle) * 20);
      cannon.lookAt(0, 0, 0);
      group.add(cannon);
    }

    return group;
  }

  static createMegaTitan(): THREE.Group {
    const group = new THREE.Group();

    // Hull
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(25, 30, 40, 8),
      new THREE.MeshPhongMaterial({ color: 0x0a0a2e, emissive: 0x6366f1, emissiveIntensity: 0.2 })
    );
    hull.rotation.x = Math.PI / 2;
    group.add(hull);

    // Reactor core
    const reactor = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 1),
      new THREE.MeshBasicMaterial({ color: 0xbc13fe, transparent: true, opacity: 0.7 })
    );
    group.add(reactor);

    // Shield ring
    const shieldRing = new THREE.Mesh(
      new THREE.TorusGeometry(35, 2, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.3 })
    );
    group.add(shieldRing);

    // Turrets
    for (let i = 0; i < 6; i++) {
      const turret = new THREE.Mesh(
        new THREE.ConeGeometry(3, 10, 4),
        new THREE.MeshPhongMaterial({ color: 0x333355, emissive: 0xff2d55, emissiveIntensity: 0.3 })
      );
      const angle = (i / 6) * Math.PI * 2;
      turret.position.set(Math.cos(angle) * 28, Math.sin(angle) * 28, 0);
      turret.lookAt(0, 0, 0);
      group.add(turret);
    }

    return group;
  }
}

// ============ ENVIRONMENT ============
export class Environment3D {
  private scene: THREE.Scene;
  private stars: THREE.Points | null = null;
  private grids: THREE.Group = new THREE.Group();
  private boundary: THREE.LineSegments | null = null;
  private posts: THREE.Group = new THREE.Group();
  private fog: THREE.FogExp2;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.fog = new THREE.FogExp2(0x050510, 0.0003);
    scene.fog = this.fog;

    // Ambient light
    scene.add(new THREE.AmbientLight(0x222244, 0.5));

    // Directional light
    const dirLight = new THREE.DirectionalLight(0x4444ff, 0.3);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    // Point lights for atmosphere
    const p1 = new THREE.PointLight(0x00f3ff, 0.5, 2000);
    p1.position.set(0, 500, 0);
    scene.add(p1);

    const p2 = new THREE.PointLight(0xbc13fe, 0.3, 1500);
    p2.position.set(-500, -200, 500);
    scene.add(p2);
  }

  build(profile: GraphicsProfile) {
    this.clear();
    this.createStars(profile.stars);
    this.createGrids(profile.gridDensity);
    this.createBoundary();
    this.createCornerPosts();
  }

  private clear() {
    if (this.stars) { this.scene.remove(this.stars); this.stars.geometry.dispose(); (this.stars.material as THREE.Material).dispose(); }
    this.scene.remove(this.grids);
    this.grids = new THREE.Group();
    if (this.boundary) { this.scene.remove(this.boundary); this.boundary.geometry.dispose(); (this.boundary.material as THREE.Material).dispose(); }
    this.scene.remove(this.posts);
    this.posts = new THREE.Group();
  }

  private createStars(count: number) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8000;
      const brightness = 0.3 + Math.random() * 0.7;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness + Math.random() * 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 2, vertexColors: true, transparent: true, opacity: 0.8 });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private createGrids(density: number) {
    const step = ARENA.WIDTH / density;

    // Bottom grid
    const bottomGeo = new THREE.BufferGeometry();
    const bottomVerts: number[] = [];
    for (let x = ARENA.MIN_X; x <= ARENA.MAX_X; x += step) {
      bottomVerts.push(x, ARENA.MIN_Y, ARENA.MIN_Z, x, ARENA.MIN_Y, ARENA.MAX_Z);
    }
    for (let z = ARENA.MIN_Z; z <= ARENA.MAX_Z; z += step) {
      bottomVerts.push(ARENA.MIN_X, ARENA.MIN_Y, z, ARENA.MAX_X, ARENA.MIN_Y, z);
    }
    bottomGeo.setAttribute('position', new THREE.Float32BufferAttribute(bottomVerts, 3));
    const bottomGrid = new THREE.LineSegments(bottomGeo, new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.15 }));
    this.grids.add(bottomGrid);

    // Top grid
    const topGeo = new THREE.BufferGeometry();
    const topVerts: number[] = [];
    for (let x = ARENA.MIN_X; x <= ARENA.MAX_X; x += step) {
      topVerts.push(x, ARENA.MAX_Y, ARENA.MIN_Z, x, ARENA.MAX_Y, ARENA.MAX_Z);
    }
    for (let z = ARENA.MIN_Z; z <= ARENA.MAX_Z; z += step) {
      topVerts.push(ARENA.MIN_X, ARENA.MAX_Y, z, ARENA.MAX_X, ARENA.MAX_Y, z);
    }
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
    const topGrid = new THREE.LineSegments(topGeo, new THREE.LineBasicMaterial({ color: 0xbc13fe, transparent: true, opacity: 0.1 }));
    this.grids.add(topGrid);

    this.scene.add(this.grids);
  }

  private createBoundary() {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(ARENA.WIDTH, ARENA.HEIGHT, ARENA.DEPTH));
    this.boundary = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.3 }));
    this.scene.add(this.boundary);
  }

  private createCornerPosts() {
    const postGeo = new THREE.CylinderGeometry(3, 3, ARENA.HEIGHT, 6);
    const postMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.4 });
    const corners = [
      [ARENA.MIN_X, ARENA.MIN_Z], [ARENA.MAX_X, ARENA.MIN_Z],
      [ARENA.MIN_X, ARENA.MAX_Z], [ARENA.MAX_X, ARENA.MAX_Z],
    ];
    corners.forEach(([x, z]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0, z);
      this.posts.add(post);
    });
    this.scene.add(this.posts);
  }

  dispose() {
    this.clear();
  }
}
