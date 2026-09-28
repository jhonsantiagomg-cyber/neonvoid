import * as THREE from 'three';
import { RADAR_SIZE, RADAR_RADIUS, RADAR_RANGE, TARGET_LOCK_RANGE, ABILITIES } from './config';
import { PlayerShip3D, BotShip3D, Orb3D } from './entities';
import { BossBase3D } from './bosses';

// ============ HUD ============
export class HUD {
  private container: HTMLElement;
  private elements: Map<string, HTMLElement> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.build();
  }

  private build() {
    this.container.innerHTML = `
      <div class="hud-top">
        <div class="hud-stat" id="hud-level">LVL 1</div>
        <div class="hud-stat" id="hud-kills">KILLS: 0</div>
        <div class="hud-stat" id="hud-luck">LUCK: 5%</div>
      </div>
      <div class="hud-bottom-left">
        <div class="hud-bar-container">
          <div class="hud-bar-label"><span>HULL</span><span id="health-val">100/100</span></div>
          <div class="hud-bar"><div class="hud-bar-fill health" id="health-bar" style="width:100%"></div></div>
        </div>
        <div class="hud-bar-container">
          <div class="hud-bar-label"><span>SHIELD</span><span id="shield-val">0/0</span></div>
          <div class="hud-bar"><div class="hud-bar-fill shield" id="shield-bar" style="width:0%"></div></div>
        </div>
        <div class="hud-bar-container">
          <div class="hud-bar-label"><span>HEAT</span><span id="heat-val">0%</span></div>
          <div class="hud-bar"><div class="hud-bar-fill heat" id="heat-bar" style="width:0%"></div></div>
        </div>
        <div class="hud-bar-container">
          <div class="hud-bar-label"><span>XP</span><span id="xp-val">0/35</span></div>
          <div class="hud-bar"><div class="hud-bar-fill xp" id="xp-bar" style="width:0%"></div></div>
        </div>
      </div>
      <div class="hud-bottom-right">
        <div class="radar-container" id="radar">
          <div class="radar-sweep"></div>
          <div class="radar-center"></div>
          <div class="radar-ring" style="width:40px;height:40px;"></div>
          <div class="radar-ring" style="width:80px;height:80px;"></div>
          <div class="radar-ring" style="width:120px;height:120px;"></div>
          <canvas id="radar-canvas" width="140" height="140" style="position:absolute;top:0;left:0;"></canvas>
        </div>
      </div>
      <div class="crosshair">
        <div class="crosshair-ring"></div>
        <div class="crosshair-dot"></div>
        <div class="crosshair-bar left"></div>
        <div class="crosshair-bar right"></div>
        <div class="crosshair-bar top"></div>
        <div class="crosshair-bar bottom"></div>
        <div class="target-lock" id="target-lock"></div>
      </div>
      <div class="damage-indicator" id="dmg-indicator">
        <div class="dmg-arc" id="dmg-arc"></div>
      </div>
      <div class="ability-indicator" id="ability-ind">
        <span id="ability-name">SPECTRAL DECOY</span>
        <div id="ability-cd" style="font-size:0.5rem;color:rgba(255,255,255,0.5);margin-top:2px;">READY</div>
      </div>
      <div class="hud-top" style="top:auto;bottom:50px;left:50%;transform:translateX(-50%);">
        <div class="hud-stat" id="hud-speed">SPD: 0</div>
        <div class="hud-stat" id="hud-alt">ALT: 0</div>
        <div class="hud-stat" id="hud-heading">HDG: 0°</div>
      </div>
      <div class="hud-stat" style="position:absolute;top:40px;left:10px;font-size:0.5rem;" id="hud-target-info"></div>
      <div class="inertia-toggle" id="inertia-toggle">INERTIA: ON</div>
      <div class="fps-counter" id="fps-counter">60 FPS</div>
    `;
  }

  update(player: PlayerShip3D, bots: BotShip3D[], orbs: Orb3D[], boss: BossBase3D | null, fps: number) {
    const s = player.state;
    // Top stats
    this.setText('hud-level', `LVL ${s.level}`);
    this.setText('hud-kills', `KILLS: ${s.kills}`);
    this.setText('hud-luck', `LUCK: ${Math.round(s.luck * 100)}%`);

    // Bars
    this.setBar('health-bar', s.health / s.maxHealth);
    this.setText('health-val', `${Math.floor(s.health)}/${s.maxHealth}`);
    this.setBar('shield-bar', s.maxShield > 0 ? s.shield / s.maxShield : 0);
    this.setText('shield-val', `${Math.floor(s.shield)}/${s.maxShield}`);
    this.setBar('heat-bar', s.heat / 100);
    this.setText('heat-val', `${Math.floor(s.heat)}%`);
    this.setBar('xp-bar', s.xp / s.xpToNext);
    this.setText('xp-val', `${s.xp}/${s.xpToNext}`);

    // Telemetry
    this.setText('hud-speed', `SPD: ${s.speed.toFixed(1)}`);
    this.setText('hud-alt', `ALT: ${Math.floor(s.position.y)}`);
    const heading = Math.floor(((player.yaw * 180 / Math.PI) % 360 + 360) % 360);
    this.setText('hud-heading', `HDG: ${heading}°`);

    // Target lock
    const targetLock = document.getElementById('target-lock') as HTMLElement;
    if (player.targetLock) {
      targetLock.classList.add('active');
      this.setText('hud-target-info', `TARGET LOCKED | DIST: ${Math.floor(player.targetLockDist)}`);
    } else {
      targetLock.classList.remove('active');
      this.setText('hud-target-info', '');
    }

    // Damage indicator
    if (player.damageIndicatorTimer > 0) {
      player.damageIndicatorTimer--;
      const arc = document.getElementById('dmg-arc') as HTMLElement;
      if (player.damageDirection) {
        const angle = Math.atan2(player.damageDirection.x, player.damageDirection.z) * 180 / Math.PI;
        arc.style.borderColor = `rgba(255, 45, 85, ${player.damageIndicatorTimer / 30})`;
        arc.style.borderTopColor = 'transparent';
        arc.style.borderLeftColor = 'transparent';
        arc.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        arc.classList.add('active');
      }
    } else {
      const arc = document.getElementById('dmg-arc') as HTMLElement;
      arc.classList.remove('active');
    }

    // Ability indicator
    const ability = ABILITIES[player.abilityIndex];
    this.setText('ability-name', ability.name.toUpperCase());
    const cdEl = document.getElementById('ability-cd') as HTMLElement;
    const indEl = document.getElementById('ability-ind') as HTMLElement;
    if (player.abilityCooldown > 0) {
      cdEl.textContent = `CD: ${(player.abilityCooldown / 30).toFixed(1)}s`;
      indEl.classList.add('on-cooldown');
    } else {
      cdEl.textContent = 'READY [RMB]';
      indEl.classList.remove('on-cooldown');
    }

    // Inertia toggle
    const toggle = document.getElementById('inertia-toggle') as HTMLElement;
    toggle.textContent = `INERTIA: ${player.inertiaDampener ? 'ON' : 'OFF'}`;
    toggle.classList.toggle('off', !player.inertiaDampener);

    // FPS
    this.setText('fps-counter', `${fps} FPS`);

    // Radar
    this.updateRadar(player, bots, orbs, boss);
  }

  private updateRadar(player: PlayerShip3D, bots: BotShip3D[], orbs: Orb3D[], boss: BossBase3D | null) {
    const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);
    const cx = RADAR_SIZE / 2;
    const cy = RADAR_SIZE / 2;
    const scale = RADAR_RADIUS / RADAR_RANGE;

    // Orbs (green dots)
    ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
    for (const orb of orbs) {
      if (!orb.active) continue;
      const dx = (orb.position.x - player.state.position.x) * scale;
      const dz = (orb.position.z - player.state.position.z) * scale;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > RADAR_RADIUS) continue;
      ctx.fillRect(cx + dx - 0.5, cy + dz - 0.5, 1, 1);
    }

    // Bots (red dots with altitude pips)
    for (const bot of bots) {
      if (!bot.state.alive) continue;
      const dx = (bot.state.position.x - player.state.position.x) * scale;
      const dz = (bot.state.position.z - player.state.position.z) * scale;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > RADAR_RADIUS) continue;

      ctx.fillStyle = '#ff2d55';
      ctx.fillRect(cx + dx - 2, cy + dz - 2, 4, 4);

      // Altitude pip
      const altDiff = bot.state.position.y - player.state.position.y;
      if (Math.abs(altDiff) > 50) {
        ctx.fillStyle = altDiff > 0 ? '#ffd75e' : '#6366f1';
        const pipY = altDiff > 0 ? cy + dz - 5 : cy + dz + 5;
        ctx.fillRect(cx + dx - 1, pipY, 2, 2);
      }
    }

    // Boss (magenta marker)
    if (boss && boss.state.alive) {
      const dx = (boss.state.position.x - player.state.position.x) * scale;
      const dz = (boss.state.position.z - player.state.position.z) * scale;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= RADAR_RADIUS + 10) {
        ctx.fillStyle = '#bc13fe';
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dz, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bc13fe';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private setText(id: string, text: string) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private setBar(id: string, ratio: number) {
    const el = document.getElementById(id) as HTMLElement;
    if (el) el.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  }

  dispose() {
    this.container.innerHTML = '';
  }
}

// ============ ADMIN CONSOLE ============
export class AdminConsole {
  private container: HTMLElement;
  private visible: boolean = false;
  private gameRef: any = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.build();
  }

  setGameRef(game: any) {
    this.gameRef = game;
  }

  private build() {
    this.container.innerHTML = `
      <h3>⚡ ADMIN CONSOLE [F1]</h3>
      <button class="admin-btn" data-action="godmode">🛡️ God Mode Toggle</button>
      <button class="admin-btn" data-action="heal">💚 Heal 100%</button>
      <button class="admin-btn" data-action="noheat">❄️ Heat Zero</button>
      <button class="admin-btn" data-action="allguns">🔫 All Weapon Patterns</button>
      <button class="admin-btn" data-action="level1">⬆️ +1 Level</button>
      <button class="admin-btn" data-action="level5">⬆️ +5 Levels</button>
      <button class="admin-btn" data-action="level20">⬆️ +20 Levels</button>
      <button class="admin-btn" data-action="resetlevel">⬇️ Reset Level</button>
      <button class="admin-btn" data-action="ability0">🎯 Ability: Spectral Decoy</button>
      <button class="admin-btn" data-action="ability5">🎯 Ability: Black Hole</button>
      <button class="admin-btn" data-action="ability6">🎯 Ability: EMP Pulse</button>
      <button class="admin-btn" data-action="ability11">🎯 Ability: Micro-Missiles</button>
      <button class="admin-btn" data-action="spawnleviathan">🐉 Spawn Leviathan</button>
      <button class="admin-btn" data-action="spawnannihilator">💀 Spawn Annihilator</button>
      <button class="admin-btn" data-action="spawntitan">👹 Spawn Mega Titan</button>
      <button class="admin-btn" data-action="killboss">💥 Kill Boss</button>
      <button class="admin-btn" data-action="killbots">☠️ Kill All Bots</button>
      <button class="admin-btn" data-action="clearproj">🧹 Clear Projectiles</button>
      <button class="admin-btn" data-action="orbrain">🌧️ Orb Rain</button>
      <button class="admin-btn" data-action="freezeai">🧊 Freeze AI Toggle</button>
      <button class="admin-btn" data-action="speed025">⏱️ Speed 0.25x</button>
      <button class="admin-btn" data-action="speed05">⏱️ Speed 0.5x</button>
      <button class="admin-btn" data-action="speed1">⏱️ Speed 1x</button>
      <button class="admin-btn" data-action="speed2">⏱️ Speed 2x</button>
      <button class="admin-btn" data-action="speed4">⏱️ Speed 4x</button>
    `;

    this.container.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (btn) {
        this.executeAction(btn.getAttribute('data-action')!);
      }
    });
  }

  toggle() {
    this.visible = !this.visible;
    this.container.classList.toggle('hidden', !this.visible);
  }

  isVisible() { return this.visible; }

  private executeAction(action: string) {
    if (!this.gameRef) return;
    const g = this.gameRef;
    const player = g.player;
    if (!player) return;

    switch (action) {
      case 'godmode': g.godMode = !g.godMode; break;
      case 'heal': player.state.health = player.state.maxHealth; break;
      case 'noheat': player.state.heat = 0; player.state.overheated = false; break;
      case 'allguns':
        player.state.weaponPattern = (player.state.weaponPattern + 1) % 5;
        break;
      case 'level1': case 'level5': case 'level20': {
        const n = parseInt(action.replace('level', ''));
        for (let i = 0; i < n; i++) player.addXP(player.state.xpToNext);
        break;
      }
      case 'resetlevel':
        player.state.level = 1; player.state.xp = 0; player.state.xpToNext = 35;
        break;
      case 'ability0': case 'ability5': case 'ability6': case 'ability11':
        player.abilityIndex = parseInt(action.replace('ability', ''));
        player.abilityCooldown = 0;
        break;
      case 'spawnleviathan': g.spawnBoss('leviathan'); break;
      case 'spawnannihilator': g.spawnBoss('annihilator'); break;
      case 'spawntitan': g.spawnBoss('megatitan'); break;
      case 'killboss': if (g.boss) g.boss.state.health = 0; break;
      case 'killbots': g.bots.forEach((b: BotShip3D) => { if (b.state.alive) b.state.health = 0; b.die(); }); break;
      case 'clearproj': g.projectiles.clearAll(); break;
      case 'orbrain': {
        for (let i = 0; i < 50; i++) {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 200
          );
          const pos = player.state.position.clone().add(offset);
          g.orbs.spawn(pos, Math.floor(Math.random() * 3));
        }
        break;
      }
      case 'freezeai': g.freezeAI = !g.freezeAI; break;
      case 'speed025': g.timeScale = 0.25; break;
      case 'speed05': g.timeScale = 0.5; break;
      case 'speed1': g.timeScale = 1; break;
      case 'speed2': g.timeScale = 2; break;
      case 'speed4': g.timeScale = 4; break;
    }
  }
}
