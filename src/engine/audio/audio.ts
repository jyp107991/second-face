/**
 * Fully synthesized audio (no sample files): ambience beds, a sparse drone score, SFX and UI blips.
 * The AudioContext is created on the first user gesture (browser autoplay rules).
 */

export type SfxId =
  | 'pistol' | 'rifle' | 'shotgun' | 'smg' | 'arc' | 'heavy' | 'melee' | 'unarmed' | 'thrown'
  | 'impact' | 'miss' | 'explosion' | 'reload' | 'blip' | 'blip2' | 'step_soft' | 'step_hard' | 'step_metal' | 'hurt' | 'pickup' | 'door' | 'levelup';

export interface Volumes { master: number; music: number; sfx: number; ambience: number; }

const DEFAULT_VOL: Volumes = { master: 0.8, music: 0.5, sfx: 0.8, ambience: 0.7 };

export class AudioEngine {
  ctx?: AudioContext;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private musicBus!: GainNode;
  private noise!: AudioBuffer;
  private brown!: AudioBuffer;
  private ambNodes: AudioNode[] = [];
  private ambId?: string;
  private ambTimer?: number;
  private musicTimer?: number;
  vol: Volumes;

  constructor() {
    let saved: Partial<Volumes> = {};
    try { saved = JSON.parse(localStorage.getItem('sf.volume') ?? '{}'); } catch { /* ignore */ }
    this.vol = { ...DEFAULT_VOL, ...saved };
    const unlock = () => { this.init(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    // CRT blips on every UI button press.
    document.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) this.play('blip'); }, true);
  }

  private init(): void {
    if (this.ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
    this.noise = this.makeNoise(false);
    this.brown = this.makeNoise(true);
    this.applyVolumes();
    if (this.ambId) { const id = this.ambId; this.ambId = undefined; this.setAmbience(id); }
    this.startMusic();
  }

  setVolumes(v: Partial<Volumes>): void {
    this.vol = { ...this.vol, ...v };
    localStorage.setItem('sf.volume', JSON.stringify(this.vol));
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.ambience * 0.6, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.35, t, 0.05);
  }

  private makeNoise(brown: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  private noiseSrc(brown = false, loop = false): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = brown ? this.brown : this.noise;
    s.loop = loop;
    if (loop) s.loopStart = Math.random();
    return s;
  }

  // --- Ambience -----------------------------------------------------------------------------------

  setAmbience(id?: string): void {
    if (id === this.ambId) return;
    this.ambId = id;
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const n of this.ambNodes) { try { (n as AudioScheduledSourceNode).stop?.(t + 1.5); } catch { /* already stopped */ } }
    this.ambNodes = [];
    if (this.ambTimer) { clearTimeout(this.ambTimer); this.ambTimer = undefined; }
    if (!id) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(1, t + 2);
    out.connect(this.ambBus);
    if (id === 'wind' || id === 'camp' || id === 'town') {
      const n = this.noiseSrc(true, true);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 250;
      lfo.connect(lfoG).connect(bp.frequency);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
      const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.25;
      lfo2.connect(lfo2G).connect(g.gain);
      n.connect(bp).connect(g).connect(out);
      n.start(); lfo.start(); lfo2.start();
      this.ambNodes.push(n, lfo, lfo2);
    }
    if (id === 'hum') {
      for (const [f, gv] of [[55, 0.12], [110, 0.05], [165, 0.02]] as const) {
        const o = ctx.createOscillator(); o.frequency.value = f; o.type = 'sine';
        const g = ctx.createGain(); g.gain.value = gv;
        o.connect(g).connect(out); o.start();
        this.ambNodes.push(o);
      }
      const n = this.noiseSrc(true, true);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
      const g = ctx.createGain(); g.gain.value = 0.25;
      n.connect(lp).connect(g).connect(out); n.start();
      this.ambNodes.push(n);
    }
    if (id === 'camp' || id === 'town') {
      // Distant crackle / murmur texture.
      const n = this.noiseSrc(false, true);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
      const g = ctx.createGain(); g.gain.value = 0.02;
      n.connect(hp).connect(g).connect(out); n.start();
      this.ambNodes.push(n);
    }
    if (id === 'birds') {
      // A peaceful day: a light breeze under scattered birdsong (short two- or three-note chirps, far and near).
      const n = this.noiseSrc(true, true);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.value = 0.18;
      n.connect(bp).connect(g).connect(out); n.start();
      this.ambNodes.push(n);
      const chirp = () => {
        if (this.ambId !== 'birds') return;
        const t0 = ctx.currentTime + 0.05, base = 1800 + Math.random() * 2200, far = 0.25 + Math.random() * 0.75;
        const notes = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < notes; i++) {
          const o = ctx.createOscillator(); o.type = 'sine';
          const eg = ctx.createGain(); eg.gain.value = 0;
          const s = t0 + i * (0.09 + Math.random() * 0.06), f = base * (1 + (Math.random() - 0.5) * 0.3);
          o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.35 : 0.8), s + 0.07);
          eg.gain.setValueAtTime(0, s); eg.gain.linearRampToValueAtTime(0.05 * far, s + 0.015); eg.gain.exponentialRampToValueAtTime(0.0005, s + 0.09);
          o.connect(eg).connect(out); o.start(s); o.stop(s + 0.12);
        }
        this.ambTimer = window.setTimeout(chirp, 900 + Math.random() * 3500);
      };
      this.ambTimer = window.setTimeout(chirp, 600);
    }
    if (id === 'murmur') {
      // A bustling place: wind under a crowd's voices (a vowel-band of noise that swells), and the odd knock of trade.
      const n = this.noiseSrc(true, true);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 350; bp.Q.value = 0.6;
      const g = ctx.createGain(); g.gain.value = 0.3;
      n.connect(bp).connect(g).connect(out); n.start();
      const v = this.noiseSrc(false, true);
      const vb = ctx.createBiquadFilter(); vb.type = 'bandpass'; vb.frequency.value = 900; vb.Q.value = 2.5;
      const vg = ctx.createGain(); vg.gain.value = 0.045;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.23;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.02;
      lfo.connect(lfoG).connect(vg.gain);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.9;
      const lfo2G = ctx.createGain(); lfo2G.gain.value = 300;
      lfo2.connect(lfo2G).connect(vb.frequency);
      v.connect(vb).connect(vg).connect(out); v.start(); lfo.start(); lfo2.start();
      this.ambNodes.push(n, v, lfo, lfo2);
      const knock = () => {
        if (this.ambId !== 'murmur') return;
        const s = ctx.currentTime + 0.02;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(160 + Math.random() * 120, s);
        o.frequency.exponentialRampToValueAtTime(70, s + 0.08);
        const eg = ctx.createGain(); eg.gain.setValueAtTime(0.06 * (0.3 + Math.random() * 0.7), s); eg.gain.exponentialRampToValueAtTime(0.0005, s + 0.12);
        o.connect(eg).connect(out); o.start(s); o.stop(s + 0.14);
        this.ambTimer = window.setTimeout(knock, 2500 + Math.random() * 6000);
      };
      this.ambTimer = window.setTimeout(knock, 1500);
    }
  }

  // --- Music: sparse drone + occasional bell tones ------------------------------------------------

  private startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    const ctx = this.ctx;
    const roots = [55, 49, 58.27, 43.65];
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500; filt.Q.value = 2;
    filt.connect(this.musicBus);
    const oscs = [0, 1, 2].map((i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = roots[0] * (i === 2 ? 1.5 : 1); o.detune.value = (i - 1) * 7;
      const g = ctx.createGain(); g.gain.value = 0.07;
      o.connect(g).connect(filt); o.start();
      return o;
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 250;
    lfo.connect(lfoG).connect(filt.frequency); lfo.start();
    let step = 0;
    const pent = [0, 3, 5, 7, 10, 12, 15];
    const tick = () => {
      const t = ctx.currentTime;
      step++;
      if (step % 5 === 0) {
        const r = roots[(step / 5) % roots.length];
        oscs.forEach((o, i) => o.frequency.setTargetAtTime(r * (i === 2 ? 1.5 : 1), t, 3));
      }
      if (Math.random() < 0.45) {
        const semis = pent[Math.floor(Math.random() * pent.length)];
        const f = 220 * Math.pow(2, semis / 12) * (Math.random() < 0.3 ? 2 : 1);
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
        const d = ctx.createDelay(); d.delayTime.value = 0.45;
        const fb = ctx.createGain(); fb.gain.value = 0.35;
        o.connect(g); g.connect(this.musicBus); g.connect(d); d.connect(fb).connect(d); d.connect(this.musicBus);
        o.start(t); o.stop(t + 4.2);
      }
    };
    this.musicTimer = window.setInterval(tick, 4000);
  }

  // --- SFX ----------------------------------------------------------------------------------------

  /** Play a sound. `pan` -1..1, `gain` 0..1 (distance attenuation done by caller). */
  play(id: SfxId, pan = 0, gain = 1): void {
    if (!this.ctx || gain <= 0.01 || !Number.isFinite(gain) || !Number.isFinite(pan)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = gain;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p).connect(this.sfxBus);
    const env = (node: AudioNode, a: number, peak: number, decay: number) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
      node.connect(g).connect(out);
      return g;
    };
    const noiseBurst = (type: BiquadFilterType, freq: number, q: number, peak: number, decay: number, brown = false) => {
      const n = this.noiseSrc(brown);
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      n.connect(f); env(f, 0.003, peak, decay);
      n.start(t); n.stop(t + decay + 0.1);
      return f;
    };
    const thump = (f0: number, f1: number, peak: number, decay: number, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + decay);
      env(o, 0.002, peak, decay);
      o.start(t); o.stop(t + decay + 0.05);
    };
    switch (id) {
      case 'pistol': noiseBurst('lowpass', 3000, 0.7, 0.9, 0.18); thump(180, 50, 0.6, 0.12); break;
      case 'smg': noiseBurst('lowpass', 3500, 0.7, 0.7, 0.1); thump(160, 60, 0.4, 0.08); break;
      case 'rifle': noiseBurst('highpass', 1200, 0.7, 0.9, 0.25); thump(140, 40, 0.7, 0.2); noiseBurst('lowpass', 600, 0.5, 0.3, 0.6, true); break;
      case 'shotgun': noiseBurst('lowpass', 2200, 0.5, 1, 0.35); thump(120, 35, 0.9, 0.25); break;
      case 'heavy': noiseBurst('lowpass', 1800, 0.5, 1, 0.3); thump(90, 30, 0.9, 0.3); break;
      case 'arc': {
        const o = ctx.createOscillator(); o.type = 'square';
        o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        env(o, 0.002, 0.25, 0.25); o.start(t); o.stop(t + 0.3);
        noiseBurst('bandpass', 4000, 3, 0.3, 0.2);
        break;
      }
      case 'melee': case 'unarmed': {
        const f = noiseBurst('bandpass', 800, 1.5, 0.35, 0.18);
        (f as BiquadFilterNode).frequency.exponentialRampToValueAtTime(2500, t + 0.15);
        break;
      }
      case 'thrown': noiseBurst('bandpass', 600, 2, 0.2, 0.25); break;
      case 'impact': thump(120, 60, 0.6, 0.1); noiseBurst('lowpass', 900, 0.7, 0.4, 0.08); break;
      case 'miss': noiseBurst('bandpass', 3000, 4, 0.15, 0.12); break;
      case 'explosion': noiseBurst('lowpass', 900, 0.5, 1, 1.4, true); thump(80, 25, 1, 0.9); noiseBurst('lowpass', 3000, 0.5, 0.6, 0.3); break;
      case 'reload': {
        for (const dt of [0, 0.18]) {
          const n = this.noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 6;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.5, t + dt + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.05);
          n.connect(f).connect(g).connect(out); n.start(t + dt); n.stop(t + dt + 0.1);
        }
        break;
      }
      case 'step_soft': noiseBurst('lowpass', 500, 0.5, 0.12, 0.08, true); break;
      case 'step_hard': noiseBurst('bandpass', 1400, 1.2, 0.12, 0.05); break;
      case 'step_metal': noiseBurst('bandpass', 2600, 8, 0.12, 0.1); thump(400, 300, 0.04, 0.08, 'triangle'); break;
      case 'hurt': thump(220, 110, 0.25, 0.25, 'sawtooth'); break;
      case 'pickup': thump(600, 900, 0.15, 0.08, 'triangle'); break;
      case 'door': noiseBurst('lowpass', 400, 1, 0.5, 0.6, true); thump(70, 50, 0.4, 0.5); break;
      case 'levelup': for (const [i, f] of [440, 554, 659, 880].entries()) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.3); o.connect(g).connect(out); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.35); } break;
      case 'blip': case 'blip2': {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = id === 'blip' ? 1320 : 880;
        env(o, 0.002, 0.04, 0.04); o.start(t); o.stop(t + 0.06);
        break;
      }
    }
  }
}

export function stepSoundFor(floor?: string): SfxId {
  if (floor === 'metal' || floor === 'grate') return 'step_metal';
  if (floor === 'concrete' || floor === 'tile' || floor === 'asphalt' || floor === 'wood') return 'step_hard';
  return 'step_soft';
}
