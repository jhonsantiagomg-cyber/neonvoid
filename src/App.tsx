import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine3D } from './game/engine';
import { SHIP_CLASSES, DIFFICULTIES, GRAPHICS_PROFILES, ABILITIES } from './game/config';

type GameState = 'menu' | 'shipSelect' | 'settings' | 'playing' | 'paused' | 'gameover' | 'levelup' | 'bossreward';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine3D | null>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedShip, setSelectedShip] = useState('interceptor');
  const [selectedDifficulty, setSelectedDifficulty] = useState('pilot');
  const [selectedGraphics, setSelectedGraphics] = useState('ultra');
  const [gameOverStats, setGameOverStats] = useState<any>(null);
  const [bossAlertName, setBossAlertName] = useState('');
  const [showBossAlert, setShowBossAlert] = useState(false);

  const startGame = useCallback(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine3D(canvasRef.current);
    engineRef.current = engine;

    engine.setCallbacks({
      onLevelUp: () => {
        setGameState('levelup');
        engine.showUpgradeModal();
      },
      onGameOver: (stats: any) => {
        setGameOverStats(stats);
        setGameState('gameover');
      },
      onBossAlert: (name: string) => {
        setBossAlertName(name);
        setShowBossAlert(true);
        setTimeout(() => setShowBossAlert(false), 4000);
      },
      onBossDefeated: () => {
        engine.showRoulette();
      },
    });

    engine.init(selectedShip, selectedDifficulty, selectedGraphics);
    setGameState('playing');
  }, [selectedShip, selectedDifficulty, selectedGraphics]);

  const handleUpgradeClose = useCallback(() => {
    setGameState('playing');
    if (engineRef.current) {
      engineRef.current.resume();
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setGameState('menu');
    setGameOverStats(null);
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
    setGameState('playing');
  }, []);

  // Handle escape key for pause and pointer lock
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        setGameState('paused');
      }
    };
    const lockHandler = () => {
      const prompt = document.getElementById('click-prompt');
      if (prompt) {
        prompt.style.display = document.pointerLockElement ? 'none' : 'flex';
      }
    };
    window.addEventListener('keydown', keyHandler);
    document.addEventListener('pointerlockchange', lockHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      document.removeEventListener('pointerlockchange', lockHandler);
    };
  }, [gameState]);

  // Handle upgrade modal close
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const modal = document.getElementById('upgrade-modal');
      if (modal && modal.classList.contains('hidden') && gameState === 'levelup') {
        handleUpgradeClose();
      }
      const roulette = document.getElementById('roulette-modal');
      if (roulette && roulette.classList.contains('hidden') && gameState === 'playing') {
        handleUpgradeClose();
      }
    });
    const modal = document.getElementById('upgrade-modal');
    const roulette = document.getElementById('roulette-modal');
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    if (roulette) observer.observe(roulette, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [gameState, handleUpgradeClose]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050510' }}>
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        style={{ display: gameState === 'playing' || gameState === 'paused' || gameState === 'levelup' ? 'block' : 'none' }}
      />

      {/* HUD Container */}
      <div id="hud-container" className="hud-container" style={{ display: gameState === 'playing' ? 'block' : 'none' }} />

      {/* Admin Console */}
      <div id="admin-container" className="admin-console hidden" />

      {/* Upgrade Modal */}
      <div id="upgrade-modal" className="upgrade-modal hidden" />

      {/* Roulette Modal */}
      <div id="roulette-modal" className="roulette-modal hidden" />

      {/* Boss Alert */}
      <div className={`boss-alert ${showBossAlert ? 'active' : ''}`}>
        ⚠️ BOSS INCOMING: {bossAlertName} ⚠️
      </div>

      {/* Scanlines overlay */}
      {gameState === 'playing' && <div className="scanlines" />}

      {/* Click to play prompt */}
      {gameState === 'playing' && (
        <div id="click-prompt" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 45, pointerEvents: 'none',
          fontFamily: 'var(--font-main)',
        }}>
          <div id="click-prompt-text" style={{
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,243,255,0.4)',
            borderRadius: '8px', padding: '16px 32px',
            color: '#00f3ff', fontSize: '0.8rem', letterSpacing: '0.2em',
            animation: 'titlePulse 2s ease-in-out infinite',
          }}>
            CLICK TO ENGAGE
          </div>
        </div>
      )}

      {/* MAIN MENU */}
      {gameState === 'menu' && (
        <div className="menu-screen">
          <h1 className="menu-title">NEON VOID</h1>
          <p className="menu-subtitle">SPACE SURVIVOR .IO</p>
          <div className="menu-panel">
            <button className="menu-btn" onClick={() => setGameState('shipSelect')}>
              ▶ START GAME
            </button>
            <button className="menu-btn" onClick={() => setGameState('settings')}>
              ⚙ SETTINGS
            </button>
            <div style={{ marginTop: '1.5rem', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              <p>WASD - Move | Mouse - Aim | LMB - Shoot | RMB - Ability</p>
              <p>Space/C - Up/Down | Shift - Boost | E - Active Reload</p>
              <p>T - Target Lock | I - Inertia Toggle | F1 - Admin | ESC - Pause</p>
            </div>
          </div>
        </div>
      )}

      {/* SHIP SELECT */}
      {gameState === 'shipSelect' && (
        <div className="menu-screen">
          <h2 style={{ color: '#00f3ff', fontSize: '1.5rem', letterSpacing: '0.2em', marginBottom: '1rem' }}>SELECT VESSEL</h2>
          <div className="menu-panel" style={{ minWidth: '600px' }}>
            <div className="ship-grid">
              {Object.entries(SHIP_CLASSES).map(([id, ship]) => (
                <div
                  key={id}
                  className={`ship-card ${selectedShip === id ? 'selected' : ''}`}
                  onClick={() => setSelectedShip(id)}
                >
                  <h3>{ship.name}</h3>
                  <div className="ship-stat">SPD: {ship.speed}</div>
                  <div className="ship-stat">HP: {ship.maxHealth}</div>
                  <div className="ship-stat">DMG: {ship.damage}</div>
                  <div className="ship-stat">RATE: {ship.fireRate}</div>
                  <div className="ship-stat">LUCK: {Math.round(ship.luck * 100)}%</div>
                  <div className="ship-stat">VAMP: {Math.round(ship.vampirism * 100)}%</div>
                  <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                    {ship.description}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button className="menu-btn" onClick={() => setGameState('menu')} style={{ flex: 1 }}>← BACK</button>
              <button className="menu-btn gold" onClick={() => setGameState('settings')} style={{ flex: 1 }}>CONTINUE →</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {gameState === 'settings' && (
        <div className="menu-screen">
          <h2 style={{ color: '#00f3ff', fontSize: '1.5rem', letterSpacing: '0.2em', marginBottom: '1rem' }}>CONFIGURATION</h2>
          <div className="menu-panel">
            <div className="section-title">DIFFICULTY</div>
            {Object.entries(DIFFICULTIES).map(([id, diff]) => (
              <button
                key={id}
                className={`menu-btn ${selectedDifficulty === id ? 'active' : ''}`}
                onClick={() => setSelectedDifficulty(id)}
              >
                {diff.name}
              </button>
            ))}

            <div className="section-title">GRAPHICS</div>
            {Object.entries(GRAPHICS_PROFILES).map(([id, prof]) => (
              <button
                key={id}
                className={`menu-btn ${selectedGraphics === id ? 'active' : ''}`}
                onClick={() => setSelectedGraphics(id)}
              >
                {prof.name}
              </button>
            ))}

            <div className="section-title">ABILITIES</div>
            <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', maxHeight: '120px', overflowY: 'auto' }}>
              {ABILITIES.map((a, i) => (
                <div key={i} style={{ marginBottom: '3px' }}>
                  <span style={{ color: '#bc13fe' }}>{a.name}</span> — {a.description}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button className="menu-btn" onClick={() => setGameState('shipSelect')} style={{ flex: 1 }}>← BACK</button>
              <button className="menu-btn gold" onClick={startGame} style={{ flex: 1 }}>🚀 LAUNCH</button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE */}
      {gameState === 'paused' && (
        <div className="pause-screen" id="pause-screen">
          <h2 style={{ color: '#00f3ff', fontSize: '2rem', letterSpacing: '0.3em', marginBottom: '2rem' }}>PAUSED</h2>
          <div className="menu-panel" style={{ minWidth: '300px' }}>
            <button className="menu-btn" onClick={handleResume}>▶ RESUME</button>
            <button className="menu-btn danger" onClick={handleRestart}>✕ QUIT TO MENU</button>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === 'gameover' && (
        <div className="gameover-screen">
          <h1 className="gameover-title">DESTROYED</h1>
          <div className="gameover-stats">
            <div className="gameover-stat">
              <div className="label">LEVEL</div>
              <div className="value">{gameOverStats?.level || 1}</div>
            </div>
            <div className="gameover-stat">
              <div className="label">KILLS</div>
              <div className="value">{gameOverStats?.kills || 0}</div>
            </div>
            <div className="gameover-stat">
              <div className="label">ARENA TIME</div>
              <div className="value">{formatTime(gameOverStats?.time || 0)}</div>
            </div>
            <div className="gameover-stat">
              <div className="label">ACCURACY</div>
              <div className="value">{gameOverStats?.accuracy || 0}%</div>
            </div>
            <div className="gameover-stat">
              <div className="label">TOTAL XP</div>
              <div className="value">{gameOverStats?.totalXP || 0}</div>
            </div>
          </div>
          <Leaderboard currentScore={gameOverStats} />
          <div className="menu-panel" style={{ minWidth: '300px', marginTop: '1rem' }}>
            <button className="menu-btn gold" onClick={startGame}>🔄 RESPAWN</button>
            <button className="menu-btn" onClick={handleRestart}>← MAIN MENU</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Save score to leaderboard
function saveScore(stats: any) {
  try {
    const scores = JSON.parse(localStorage.getItem('neonvoid_scores') || '[]');
    scores.push({ ...stats, date: Date.now() });
    scores.sort((a: any, b: any) => (b.level * 1000 + b.kills * 10 + b.totalXP) - (a.level * 1000 + a.kills * 10 + a.totalXP));
    localStorage.setItem('neonvoid_scores', JSON.stringify(scores.slice(0, 10)));
  } catch (e) { /* ignore */ }
}

function Leaderboard({ currentScore }: { currentScore: any }) {
  if (currentScore) saveScore(currentScore);
  let scores: any[] = [];
  try { scores = JSON.parse(localStorage.getItem('neonvoid_scores') || '[]'); } catch (e) { /* ignore */ }

  if (scores.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,243,255,0.2)',
      borderRadius: '6px', padding: '12px', minWidth: '350px', marginTop: '1rem',
      fontFamily: 'var(--font-main)',
    }}>
      <div style={{ fontSize: '0.6rem', color: '#00f3ff', letterSpacing: '0.2em', marginBottom: '8px' }}>
        LEADERBOARD
      </div>
      {scores.slice(0, 5).map((s: any, i: number) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem',
          padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          color: i === 0 ? '#ffd75e' : 'rgba(255,255,255,0.6)',
        }}>
          <span>#{i + 1}</span>
          <span>LVL {s.level}</span>
          <span>{s.kills} kills</span>
          <span>{formatTime(s.time)}</span>
        </div>
      ))}
    </div>
  );
}
