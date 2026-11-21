// SOLARA — audio.js
// Tiny WebAudio synth: UI blips, gunshots, pickups, siren wail and a
// low radio pad that changes colour per station. Everything is guarded:
// if the AudioContext cannot start, the game still runs silently.

import { RADIO } from './config.js';

export function createAudio(S) {
  const A = {
    unlock,
    blip,
    shot,
    pickup,
    siren,
    setStation,
    toggle,
  };
  let ctx = null;
  let padOsc = null;
  let padGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let unlocked = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (!c || unlocked) return;
    unlocked = true;
    try {
      if (c.state === 'suspended') c.resume();
      startPad();
    } catch (e) { /* silent */ }
  }

  function startPad() {
    if (!ctx || !S.radioOn) return;
    try {
      padOsc = ctx.createOscillator();
      padGain = ctx.createGain();
      padOsc.type = 'sine';
      padOsc.frequency.value = [110, 164.8, 220, 277.2][S.station] || 220;
      padGain.gain.value = 0.018;
      padOsc.connect(padGain);
      padGain.connect(ctx.destination);
      padOsc.start();
    } catch (e) { /* silent */ }
  }

  function stopPad() {
    try { if (padOsc) padOsc.stop(); } catch (e) { /* noop */ }
    padOsc = null;
    padGain = null;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c || !S.soundOn) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.value = vol || 0.05;
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch (e) { /* silent */ }
  }

  function blip() { tone(880, 0.07, 'sine', 0.04); }
  function shot() { tone(160, 0.09, 'sawtooth', 0.09, 60); }
  function pickup() { tone(660, 0.09, 'sine', 0.05); setTimeout(() => tone(990, 0.12, 'sine', 0.05), 80); }

  function siren(on) {
    const c = ensure();
    if (!c || !S.soundOn) return;
    try {
      if (on && !sirenOsc) {
        sirenOsc = c.createOscillator();
        sirenGain = c.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = 0.012;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(c.destination);
        sirenOsc.start();
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.value = 0.5;
        lfoGain.gain.value = 250;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        lfo.start();
        sirenOsc._lfo = lfo;
      } else if (!on && sirenOsc) {
        try { sirenOsc._lfo.stop(); } catch (e) { /* noop */ }
        sirenOsc.stop();
        sirenOsc = null;
        sirenGain = null;
      }
    } catch (e) { /* silent */ }
  }

  function setStation(i) {
    S.station = i;
    if (padOsc) {
      try { padOsc.frequency.value = [110, 164.8, 220, 277.2][i] || 220; } catch (e) { /* noop */ }
    }
    blip();
  }

  function toggle() {
    S.soundOn = !S.soundOn;
    if (!S.soundOn) { stopPad(); siren(false); }
    else if (unlocked) { startPad(); }
  }

  return A;
}
