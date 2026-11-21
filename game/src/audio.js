// SOLARA — audio.js
// WebAudio radio (four stations, simple synth loops) + sound effects.
// Everything is synthesized; no audio files. Starts on first user gesture.

import { RADIO } from './config.js';

const STATION_FREQ = [
  [220, 277, 330, 415], // PUERTO 88.3 latin gold
  [196, 247, 294, 392], // CELESTE 98.1 synthwave
  [262, 330, 392, 494], // SOLARA 98.3 daytime
  [174, 220, 261, 349], // NEON 101.5 night drive
];

export function createAudio(S) {
  let ctx = null;
  let master = null;
  let radioNodes = null;
  let radioTimer = null;
  let step = 0;

  function ensure() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || !S.soundOn) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function startRadio() {
    if (!ctx || radioTimer) return;
    radioTimer = setInterval(() => {
      if (!S.radioOn || S.paused || !S.started) return;
      const scale = STATION_FREQ[S.station % STATION_FREQ.length];
      const f = scale[step % scale.length];
      tone(f, 0.5, 'triangle', 0.06);
      if (step % 4 === 0) tone(f / 2, 0.6, 'sine', 0.08);
      if (step % 8 === 6) tone(f * 2, 0.2, 'square', 0.02);
      step++;
    }, 420);
  }

  function stopRadio() {
    if (radioTimer) {
      clearInterval(radioTimer);
      radioTimer = null;
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      startRadio();
    },
    shot() { tone(880, 0.08, 'square', 0.12); tone(220, 0.12, 'sawtooth', 0.1); },
    reload() { tone(520, 0.06, 'square', 0.08); tone(660, 0.06, 'square', 0.08, 0.09); },
    cash() { tone(988, 0.12, 'sine', 0.15); tone(1319, 0.18, 'sine', 0.15, 0.1); },
    fail() { tone(196, 0.3, 'sawtooth', 0.12); tone(147, 0.4, 'sawtooth', 0.12, 0.15); },
    siren() { tone(700, 0.25, 'sine', 0.05); tone(950, 0.25, 'sine', 0.05, 0.25); },
    beep() { tone(440, 0.1, 'sine', 0.1); },
    gecko() { tone(1568, 0.1, 'sine', 0.12); tone(2093, 0.15, 'sine', 0.12, 0.08); },
    stationName() { return RADIO[S.station % RADIO.length].name; },
    setStation(i) { S.station = ((i % RADIO.length) + RADIO.length) % RADIO.length; },
  };
}
