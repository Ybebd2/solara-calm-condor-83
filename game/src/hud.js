// SOLARA — hud.js
// HUD: cash, rank, mission panel, wanted stars, health/armour bars,
// ammo, minimap canvas (player, cars, police, geckos, waypoint),
// message line, dialogue box with speaker portrait, start screen.

import { DISTRICTS, RADIO, WEAPONS } from './config.js';

export function createHud(S, missions, world, vehicles, police) {
  const $ = (id) => document.getElementById(id);
  const els = {
    cash: $('hud-cash'),
    rank: $('hud-rank'),
    mission: $('hud-mission-title'),
    missionDist: $('hud-mission-dist'),
    missionTimer: $('hud-mission-timer'),
    stars: $('hud-stars'),
    health: $('hud-health-fill'),
    armour: $('hud-armour-fill'),
    ammo: $('hud-ammo'),
    weapon: $('hud-weapon'),
    message: $('hud-message'),
    dialogue: $('hud-dialogue'),
    dlgSpeaker: $('dlg-speaker'),
    dlgText: $('dlg-text'),
    minimap: $('minimap'),
    geckos: $('hud-geckos'),
    radio: $('hud-radio'),
    crew: $('hud-crew'),
    district: $('hud-district'),
    startScreen: $('start-screen'),
    pauseScreen: $('pause-screen'),
    mapScreen: $('map-screen'),
  };
  const mm = els.minimap ? els.minimap.getContext('2d') : null;

  function starText(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function drawMinimap() {
    if (!mm || !els.minimap) return;
    const W = els.minimap.width;
    const H = els.minimap.height;
    const scale = W / 640;
    mm.clearRect(0, 0, W, H);
    mm.fillStyle = 'rgba(10,20,30,0.75)';
    mm.fillRect(0, 0, W, H);
    // districts
    for (const d of DISTRICTS) {
      mm.fillStyle = d.color;
      mm.globalAlpha = 0.35;
      mm.beginPath();
      mm.arc((d.x + 320) * scale, (d.z + 320) * scale, d.r * scale, 0, Math.PI * 2);
      mm.fill();
      mm.globalAlpha = 1;
    }
    // roads
    mm.strokeStyle = 'rgba(255,255,255,0.5)';
    mm.lineWidth = 2;
    for (let i = -4; i <= 4; i++) {
      const c = (i * 64 + 320) * scale;
      mm.beginPath(); mm.moveTo(c, 0); mm.lineTo(c, H); mm.stroke();
      mm.beginPath(); mm.moveTo(0, c); mm.lineTo(W, c); mm.stroke();
    }
    // ocean
    mm.fillStyle = '#2fd4c8';
    mm.fillRect(0, 0, 20 * scale, H);
    // geckos
    mm.fillStyle = '#ffd700';
    for (const g of world.geckos) {
      if (g.taken) continue;
      mm.beginPath();
      mm.arc((g.x + 320) * scale, (g.z + 320) * scale, 2.5, 0, Math.PI * 2);
      mm.fill();
    }
    // waypoint / mission target
    const m = missions.current();
    if (m) {
      const t = m.type === 'finale' && S.missionStage === 1 ? [-192, -192] : m.target;
      mm.fillStyle = '#ffea00';
      mm.beginPath();
      mm.arc((t[0] + 320) * scale, (t[1] + 320) * scale, 4, 0, Math.PI * 2);
      mm.fill();
    }
    // police
    mm.fillStyle = '#3d5afe';
    for (const c of police.cruisers) {
      mm.beginPath();
      mm.arc((c.x + 320) * scale, (c.z + 320) * scale, 3, 0, Math.PI * 2);
      mm.fill();
    }
    // traffic
    mm.fillStyle = 'rgba(255,255,255,0.7)';
    for (const c of vehicles.traffic) {
      mm.fillRect((c.x + 320) * scale - 1, (c.z + 320) * scale - 1, 2, 2);
    }
    // player arrow
    const px = (S.px + 320) * scale;
    const pz = (S.pz + 320) * scale;
    mm.save();
    mm.translate(px, pz);
    mm.rotate(Math.atan2(Math.sin(S.heading), Math.cos(S.heading)));
    mm.fillStyle = '#ff5252';
    mm.beginPath();
    mm.moveTo(0, -6);
    mm.lineTo(4, 5);
    mm.lineTo(-4, 5);
    mm.closePath();
    mm.fill();
    mm.restore();
  }

  function update() {
    if (els.cash) els.cash.textContent = '$' + S.cash;
    if (els.rank) els.rank.textContent = S.rank;
    const m = missions.current();
    if (els.mission && m) {
      els.mission.textContent = S.missionActive ? m.name.toUpperCase() : 'NEXT: ' + m.name.toUpperCase();
    }
    if (els.missionDist && m) els.missionDist.textContent = Math.round(missions.distToTarget()) + 'm';
    if (els.missionTimer) {
      els.missionTimer.textContent = S.missionActive ? Math.max(0, Math.ceil(S.missionTime)) + 's' : '';
    }
    if (els.stars) {
      els.stars.textContent = starText(S.wanted);
      els.stars.style.color = S.wanted > 0 ? '#ff1744' : '#ffffff';
    }
    if (els.health) els.health.style.width = Math.max(0, S.health) + '%';
    if (els.armour) els.armour.style.width = Math.max(0, S.armour) + '%';
    const w = WEAPONS[S.weaponIdx];
    if (els.ammo) els.ammo.textContent = w.name === 'FISTS' ? '∞' : S.ammo + ' / ' + S.reserve;
    if (els.weapon) els.weapon.textContent = w.name;
    if (els.message) {
      els.message.textContent = S.time < S.messageUntil ? S.message : '';
    }
    const dlg = missions.getDialogue();
    if (els.dialogue) {
      if (dlg) {
        els.dialogue.style.display = 'block';
        if (els.dlgSpeaker) els.dlgSpeaker.textContent = dlg.speaker;
        if (els.dlgText) els.dlgText.textContent = dlg.line;
      } else {
        els.dialogue.style.display = 'none';
      }
    }
    if (els.geckos) els.geckos.textContent = '🦎 ' + world.geckosTaken() + '/20';
    if (els.radio) els.radio.textContent = (S.radioOn ? '♪ ' : '♪ ✕ ') + RADIO[S.station % RADIO.length].name;
    if (els.crew) {
      const cds = Object.entries(S.crewCd).map(([k, v]) => k + (v > 0 ? ' ' + Math.ceil(v) + 's' : ' ✓')).join('  ');
      els.crew.textContent = cds;
    }
    if (els.district) {
      let best = null;
      let bestD = 1e9;
      for (const d of DISTRICTS) {
        const dd = Math.hypot(S.px - d.x, S.pz - d.z);
        if (dd < bestD) { bestD = dd; best = d; }
      }
      els.district.textContent = best ? best.name : '';
    }
    drawMinimap();
  }

  function showStart() { if (els.startScreen) els.startScreen.style.display = 'flex'; }
  function hideStart() { if (els.startScreen) els.startScreen.style.display = 'none'; }
  function showPause(b) { if (els.pauseScreen) els.pauseScreen.style.display = b ? 'flex' : 'none'; }
  function showMap(b) { if (els.mapScreen) els.mapScreen.style.display = b ? 'flex' : 'none'; }

  return { update, showStart, hideStart, showPause, showMap, drawMinimap };
}
