// SOLARA — hud.js
// HUD: cash, rank, mission panel, wanted stars, health/armour bars, ammo,
// minimap canvas, message line, two-way dialogue box, radio display.

import { MISSIONS, RADIO, WEAPONS } from './config.js';

export function createHUD(S) {
  const $ = (id) => document.getElementById(id);
  const H = {
    update,
    showMessage,
    showDialogue,
    showMap,
  };
  let dialogueTimer = null;
  let mapVisible = false;

  const minimap = $('minimap');
  const mctx = minimap ? minimap.getContext('2d') : null;

  function showMessage(text) {
    S.message = text;
    S.messageUntil = S.time + 4;
    const el = $('message');
    if (el) {
      el.textContent = text;
      el.style.opacity = '1';
    }
  }

  function showDialogue(speaker, text) {
    const box = $('dialogue');
    if (!box) return;
    const who = $('dialogue-speaker');
    const body = $('dialogue-text');
    if (who) who.textContent = speaker;
    if (body) body.textContent = text;
    box.style.opacity = '1';
    S.dialogueUntil = S.time + 5;
    if (dialogueTimer) clearTimeout(dialogueTimer);
    dialogueTimer = setTimeout(() => { box.style.opacity = '0'; }, 5000);
    // Kai replies to the giver after a beat (two-way dialogue)
    if (speaker !== 'KAI') {
      const replies = [
        'Got it. On my way.',
        'Say less. Consider it done.',
        'Alright, I will handle it.',
        'Copy that. Moving now.',
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setTimeout(() => {
        if (who) who.textContent = 'KAI';
        if (body) body.textContent = reply;
        box.style.opacity = '1';
        if (dialogueTimer) clearTimeout(dialogueTimer);
        dialogueTimer = setTimeout(() => { box.style.opacity = '0'; }, 4000);
      }, 2600);
    }
  }

  function showMap(on) {
    mapVisible = on;
    const big = $('bigmap');
    if (big) big.style.display = on ? 'block' : 'none';
    const mm = $('minimap-wrap');
    if (mm) mm.style.display = on ? 'none' : 'block';
  }

  function drawMinimap(ctx, size, big) {
    const W2 = 640;
    const scale = size / W2;
    const ox = size / 2;
    const oz = size / 2;
    const X = (x) => ox + x * scale;
    const Z = (z) => oz + z * scale;
    ctx.clearRect(0, 0, size, size);
    // ocean
    ctx.fillStyle = '#19b5c9';
    ctx.fillRect(0, 0, X(-300) - X(-320), size);
    // sand
    ctx.fillStyle = '#f2ddae';
    ctx.fillRect(X(-300), 0, X(-268) - X(-300), size);
    // ground
    ctx.fillStyle = '#3a4152';
    ctx.fillRect(X(-268), 0, size - X(-268), size);
    // roads
    ctx.strokeStyle = '#565e70';
    ctx.lineWidth = big ? 5 : 2.5;
    for (let k = -5; k <= 5; k++) {
      const c = k * 64;
      ctx.beginPath(); ctx.moveTo(X(c), 0); ctx.lineTo(X(c), size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, Z(c)); ctx.lineTo(size, Z(c)); ctx.stroke();
    }
    // districts
    const cols = ['#4fc3f7', '#ffb74d', '#ff5252', '#e040fb', '#69f0ae', '#ffd54f', '#fff176'];
    const pts = [[-210, -210], [-210, 210], [0, 0], [0, -190], [190, -190], [190, 190], [-280, 0]];
    pts.forEach(([dx, dz], i) => {
      ctx.fillStyle = cols[i];
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(X(dx), Z(dz), (big ? 26 : 12), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
    // geckos
    if (H.geckos) {
      ctx.fillStyle = '#ffd600';
      for (const g of H.geckos) {
        if (g.taken) continue;
        ctx.beginPath(); ctx.arc(X(g.x), Z(g.z), big ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // mission target
    if (S.missionActive && S.missionIdx < MISSIONS.length) {
      const m = MISSIONS[S.missionIdx];
      const t = (m.type === 'finale' && S.missionStage === 1) ? m.stage1Target : m.target;
      const pulse = 1 + Math.sin(S.time * 5) * 0.3;
      ctx.fillStyle = '#ffea00';
      ctx.beginPath(); ctx.arc(X(t[0]), Z(t[1]), (big ? 8 : 5) * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffea00';
      ctx.beginPath(); ctx.arc(X(t[0]), Z(t[1]), (big ? 14 : 9) * pulse, 0, Math.PI * 2); ctx.stroke();
    }
    // police
    if (H.police) {
      ctx.fillStyle = '#2979ff';
      for (const c of H.police.cruisers) {
        ctx.beginPath(); ctx.arc(X(c.mesh.position.x), Z(c.mesh.position.z), big ? 5 : 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ff1744';
      for (const o of H.police.officers) {
        ctx.beginPath(); ctx.arc(X(o.mesh.position.x), Z(o.mesh.position.z), big ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
      }
      if (H.police.heli) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(X(H.police.heli.mesh.position.x), Z(H.police.heli.mesh.position.z), big ? 6 : 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    // player arrow
    ctx.save();
    ctx.translate(X(S.px), Z(S.pz));
    ctx.rotate(-S.heading + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function update(dt) {
    const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
    setText('cash', '$' + Math.floor(S.cash).toLocaleString('en-US'));
    setText('rank', S.rank);
    setText('geckos', '🦎 ' + S.geckosGot + '/' + S.geckosTotal);
    setText('radio', S.radioOn ? RADIO[S.station].name : 'RADIO OFF');
    const w = WEAPONS[S.weaponIdx];
    setText('weapon', w.name + '  ' + (w.mag === Infinity ? '∞' : S.ammo + ' / ' + S.reserve));
    // wanted stars
    const stars = $('stars');
    if (stars) {
      stars.textContent = '★'.repeat(S.wanted) + '☆'.repeat(Math.max(0, 5 - S.wanted));
      stars.style.color = S.wanted >= 3 ? '#ff1744' : '#ffea00';
    }
    // health / armour bars
    const hb = $('health-bar');
    if (hb) hb.style.width = Math.max(0, S.health) + '%';
    const ab = $('armour-bar');
    if (ab) ab.style.width = Math.max(0, S.armour) + '%';
    setText('health-num', Math.ceil(S.health) + '');
    // mission panel
    const mp = $('mission-panel');
    if (mp) {
      if (S.missionIdx >= MISSIONS.length) {
        mp.innerHTML = '<b>ALL 8 JOBS DONE</b><br>YOU ARE THE FIXER OF SOLARA';
      } else if (S.missionActive) {
        const m = MISSIONS[S.missionIdx];
        const t = (m.type === 'finale' && S.missionStage === 1) ? m.stage1Target : m.target;
        const d = Math.hypot(S.px - t[0], S.pz - t[1]);
        const mm = Math.floor(Math.max(0, S.missionTime) / 60);
        const ss = String(Math.floor(Math.max(0, S.missionTime) % 60)).padStart(2, '0');
        const hold = (m.type === 'hold' || (m.type === 'finale' && S.missionStage === 0))
          ? '  HOLD ' + S.missionHold.toFixed(1) + 's / 5s' : '';
        mp.innerHTML = '<b>' + m.giver + ' — ' + m.name + '</b><br>' +
          Math.round(d) + 'm &nbsp;·&nbsp; ' + mm + ':' + ss + hold;
      } else {
        const m = MISSIONS[S.missionIdx];
        mp.innerHTML = '<b>NEXT: ' + m.giver + ' — ' + m.name + '</b><br>Go to the yellow marker (E to start)';
      }
    }
    // message fade
    const msg = $('message');
    if (msg && S.time > S.messageUntil) msg.style.opacity = '0';
    // minimap
    if (mctx) drawMinimap(mctx, 180, false);
    const big = $('bigmap-canvas');
    if (big && mapVisible) {
      drawMinimap(big.getContext('2d'), 480, true);
    }
    // district label
    const dl = $('district');
    if (dl) {
      const d = window.__solaraDistrict ? window.__solaraDistrict(S.px, S.pz) : null;
      if (d) dl.textContent = d.name;
    }
  }

  return H;
}
