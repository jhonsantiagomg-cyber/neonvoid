export class SoundFX {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private listener: { positionX: any; positionY: any; positionZ: any } | null = null;
  private enabled = true;

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      if (this.ctx.listener.positionX) {
        this.listener = this.ctx.listener as any;
      }
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setListenerPosition(x: number, y: number, z: number) {
    if (!this.listener) return;
    try {
      if (this.listener.positionX) {
        this.listener.positionX.value = x;
        this.listener.positionY.value = y;
        this.listener.positionZ.value = z;
      }
    } catch (e) { /* ignore */ }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3, freqEnd?: number) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), this.ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume: number = 0.2, filterFreq: number = 1000) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    source.stop(this.ctx.currentTime + duration);
  }

  laser() {
    this.playTone(880, 0.1, 'sawtooth', 0.15, 220);
  }

  impact() {
    this.playNoise(0.08, 0.15, 2000);
    this.playTone(200, 0.05, 'square', 0.1);
  }

  explosion() {
    this.playNoise(0.4, 0.3, 800);
    this.playTone(80, 0.3, 'sawtooth', 0.2, 30);
  }

  bossExplosion() {
    this.playNoise(0.8, 0.4, 600);
    this.playTone(60, 0.6, 'sawtooth', 0.3, 20);
    setTimeout(() => this.playNoise(0.5, 0.3, 400), 200);
  }

  levelUp() {
    this.playTone(440, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(660, 0.1, 'sine', 0.2), 80);
    setTimeout(() => this.playTone(880, 0.15, 'sine', 0.25), 160);
  }

  ability() {
    this.playTone(1200, 0.08, 'sine', 0.15, 600);
    this.playTone(300, 0.15, 'triangle', 0.1, 900);
  }

  orb() {
    this.playTone(1400, 0.05, 'sine', 0.08);
  }

  bossAlert() {
    const notes = [440, 550, 440, 550, 660];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.15, 'square', 0.12), i * 150);
    });
  }

  overheated() {
    this.playTone(150, 0.2, 'sawtooth', 0.15, 100);
  }

  activeReload() {
    this.playTone(2000, 0.05, 'sine', 0.2);
    this.playTone(2500, 0.05, 'sine', 0.15);
  }
}

export const soundFX = new SoundFX();
