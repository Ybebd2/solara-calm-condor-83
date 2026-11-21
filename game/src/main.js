// SOLARA — main.js
// Entrypoint. Wires renderer + world + player + vehicles + police +
// missions + HUD + audio + staged screenshots into one loop.
// dt is clamped: Math.min(0.05, dt).

import * as THREE from 'three';
import { createState, districtAt, WEAPONS, RADIO, CREW } from './config.js';
import { createInput } from './input.js';
import { buildWorld, updateWorld } from './world.js';
import { createVehicles, drivePlayerCar } from './vehicles.js';
import { createPlayer, updatePlayer } from './player.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const S = createState();
const params = new URLSearchParams(window.location.search);
const shotNum = parseInt(params.get('shot') || '0', 10) || 0;

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x9fd4e8, 180, 520);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

const input = createInput(canvas);
const W = buildWorld(scene);
const V = createVehicles(scene);
const P = createPlayer(scene);
const PO = createPolice(scene);
const hud = createHUD(S);
const audio = createAudio(S);
const M = createMissions(S, W, hud);

window.__solaraDistrict = (x, z) => districtAt(x, z);

// camera orbit state
let camYaw = Math.PI * 0.75 + Math.PI;
let camPitch = 0.32;
let camDist = 10;
let fixedCam = null;

function placeCamera(dt) {
  if (fixedCam) {
    camera.position.set(fixedCam.camPos[0], fixedCam.camPos[1], fixedCam.camPos[2]);
    camera.lookAt(fixedCam.camLook[0], fixedCam.camLook[1], fixedCam.camLook[2]);
    return;
  }
  camYaw -= input.mouseDX * 0.004;
  camPitch += input.mouseDY * 0.003;
  camPitch = Math.max(0.08, Math.min(1.1, camPitch));
  const anchor = S.inCar && V.playerCar ? V.playerCar.mesh.position : P.mesh.position;
  const cx = anchor.x - Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const cz = anchor.z - Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  const cy = anchor.y + 1.6 + Math.sin(camPitch) * camDist;
  camera.position.set(cx, Math.max(1.2, cy), cz);
  camera.lookAt(anchor.x, anchor.y + 1.6, anchor.z);
}

// shooting hitscan: nearest officer/cruiser inside the cone
function onFire(from, dir, weapon) {
  audio.shot();
  let best = null;
  let bestD = weapon.range;
  const consider = (pos, obj, kind) => {
    const dx = pos.x - from.x;
    const dy = (pos.y + 1.2) - from.y;
    const dz = pos.z - from.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > weapon.range) return;
    const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / d;
    if (dot < 0.985) return;
    if (d < bestD) { bestD = d; best = { obj, kind }; }
  };
  for (const o of PO.officers) consider(o.mesh.position, o, 'officer');
  for (const c of PO.cruisers) consider(c.mesh.position, c, 'cruiser');
  if (best) {
    S.hits += 1;
    if (best.kind === 'officer') {
      best.obj.hp -= weapon.dmg;
      if (best.obj.hp <= 0) {
        PO.officers.splice(PO.officers.indexOf(best.obj), 1);
        scene.remove(best.obj.mesh);
        PO.addWanted(S, 1);
        hud.showMessage('OFFICER DOWN — heat rising');
      }
    } else {
      best.obj.hp -= weapon.dmg;
      if (best.obj.hp <= 0) {
        PO.cruisers.splice(PO.cruisers.indexOf(best.obj), 1);
        scene.remove(best.obj.mesh);
        PO.addWanted(S, 1);
      }
    }
  } else if (Math.random() < 0.25) {
    PO.addWanted(S, 0.2);
  }
  // muzzle flash light pop
  if (S.wanted > 0) S.seen = true;
}

function collectGeckos() {
  for (const g of W.geckos) {
    if (g.taken) continue;
    const d = Math.hypot(S.px - g.x, S.pz - g.z);
    if (d < 2.5) {
      g.taken = true;
      g.mesh.visible = false;
      S.geckosGot += 1;
      S.cash += 50;
      audio.pickup();
      hud.showMessage('GOLDEN GECKO +' + S.geckosGot + '/20  (+$50)');
    }
  }
}

function useCrew(key) {
  const now = S.time;
  if (key === 'MARA' && S.crewCd.MARA <= now) {
    S.crewCd.MARA = now + CREW.MARA.cd;
    if (S.wanted > 0) { S.wanted -= 1; hud.showMessage('MARA: GHOST — one star gone'); }
    else hud.showMessage('MARA: GHOST — already clean');
    audio.blip();
  }
  if (key === 'SULLY' && S.crewCd.SULLY <= now) {
    S.crewCd.SULLY = now + CREW.SULLY.cd;
    if (S.inCar) { S.carHealth = 100; hud.showMessage('SULLY: PIT CREW — ride fully repaired'); }
    else hud.showMessage('SULLY: PIT CREW — get in a car first');
    audio.blip();
  }
  if (key === 'KIKI' && S.crewCd.KIKI <= now) {
    S.crewCd.KIKI = now + CREW.KIKI.cd;
    S.lookoutUntil = now + 20;
    hud.showMessage('KIKI: LOOKOUT — patrols revealed on the map for 20s');
    audio.blip();
  }
}

// --- staged screenshots ---
if (shotNum >= 1 && shotNum <= 4) {
  fixedCam = stageShot(shotNum, { S, W, V, P, PO, M, hud, scene });
  // let police spawn once so the heli/cruisers are visible in the frame
  PO.update(0.5, 0.5, S, S.px, S.pz, S.inCar, true);
  hud.update(0);
  renderer.render(scene, camera);
}

// --- start screen ---
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    audio.unlock();
    S.started = true;
    startScreen.style.display = 'none';
    hud.showMessage('Welcome to SOLARA — find the yellow marker (E)');
  });
}
const loadBtn = document.getElementById('load-btn');
if (loadBtn) loadBtn.addEventListener('click', () => { audio.unlock(); S.started = true; startScreen.style.display = 'none'; });
const settingsBtn = document.getElementById('settings-btn');
if (settingsBtn) settingsBtn.addEventListener('click', () => { audio.blip(); hud.showMessage('Settings: sound ' + (S.soundOn ? 'ON' : 'OFF') + ' — press Q for radio'); });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- debug API ---
window.__solara = {
  version: 'r9-calm-condor-83',
  S,
  get traffic() { return V.traffic; },
  get cruisers() { return PO.cruisers; },
  get officers() { return PO.officers; },
  get policeCount() { return PO.cruisers.length + PO.officers.length + (PO.heli ? 1 : 0); },
  getState() { return JSON.parse(JSON.stringify(S)); },
};

// --- main loop ---
const clock = new THREE.Clock();
let firstFrame = true;

function loop() {
  requestAnimationFrame(loop);
  const rawDt = clock.getDelta();
  const dt = Math.min(0.05, rawDt);
  if (!S.paused) S.time += dt;

  // global keys
  if (input.wasPressed('Escape')) {
    S.paused = !S.paused;
    hud.showMessage(S.paused ? 'PAUSED — Esc to resume' : 'RESUMED');
  }
  if (input.wasPressed('KeyM')) {
    S.mapOpen = !S.mapOpen;
    hud.showMap(S.mapOpen);
  }
  if (input.wasPressed('KeyQ')) {
    audio.setStation((S.station + 1) % RADIO.length);
    hud.showMessage('RADIO: ' + RADIO[S.station].name + ' — ' + RADIO[S.station].desc);
  }
  if (input.wasPressed('KeyZ')) useCrew('MARA');
  if (input.wasPressed('KeyX')) useCrew('SULLY');
  if (input.wasPressed('KeyC')) useCrew('KIKI');
  if (input.wasPressed('F9')) {
    S.autopilot = !S.autopilot;
    hud.showMessage(S.autopilot ? 'AUTOPILOT ON — driving to the target' : 'AUTOPILOT OFF');
  }

  if (S.started && !S.paused) {
    // interact / mission start
    if (input.wasPressed('KeyE')) {
      if (!M.tryStart(S)) {
        // E near a car also tries to jack it
        if (!S.inCar) {
          if (V.enterCar(S, null, S.px, S.pz)) {
            hud.showMessage('JACKED A RIDE — drive!');
            audio.blip();
          }
        }
      } else {
        audio.blip();
      }
    }
    // enter / exit car
    if (input.wasPressed('KeyF')) {
      if (S.inCar) {
        const out = V.exitCar(S);
        if (out) { P.mesh.position.set(out.x, 0, out.z); S.px = out.x; S.pz = out.z; }
      } else if (V.enterCar(S, null, S.px, S.pz)) {
        hud.showMessage('IN THE CAR — W/S to drive');
        audio.blip();
      }
    }

    // autopilot: steer the car toward the mission target
    if (S.autopilot && S.inCar && V.playerCar) {
      const m = M.current();
      const t = m ? ((m.type === 'finale' && S.missionStage === 1) ? m.stage1Target : m.target) : null;
      if (t) {
        const car = V.playerCar;
        const dx = t[0] - car.mesh.position.x;
        const dz = t[1] - car.mesh.position.z;
        const want = Math.atan2(-dz, dx);
        let dh = want - car.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        car.heading += Math.max(-1.2 * dt, Math.min(1.2 * dt, dh));
        S.carSpeed = Math.min(S.carSpeed + 10 * dt, 22);
        car.mesh.position.x += Math.cos(car.heading) * S.carSpeed * dt;
        car.mesh.position.z += -Math.sin(car.heading) * S.carSpeed * dt;
        car.mesh.rotation.y = -car.heading;
        S.px = car.mesh.position.x;
        S.pz = car.mesh.position.z;
        S.heading = car.heading;
        S.speed = Math.abs(S.carSpeed);
      }
    } else if (S.inCar) {
      drivePlayerCar(dt, input, S, V, W);
    } else {
      updatePlayer(dt, input, S, P, W, V, camera, onFire);
    }

    V.update(dt, S, { x: S.px, z: S.pz });
    updateWorld(dt, S.time, W, S);
    PO.update(dt, S.time, S, S.px, S.pz, S.inCar, S.shotMode);
    M.update(dt, S);
    collectGeckos();
    audio.siren(S.wanted >= 2);

    // health / game over
    if (S.health <= 0 && !S.over) {
      S.over = true;
      S.health = 0;
      hud.showMessage('WASTED — the city got you. Press R to restart');
    }
    if (S.over && input.wasPressed('KeyR') && S.health <= 0) {
      window.location.reload();
    }
  }

  placeCamera(dt);
  hud.update(dt);
  renderer.render(scene, camera);
  input.endFrame();
  firstFrame = false;
}

if (shotNum >= 1 && shotNum <= 4) {
  // staged shot: render a few frames so the heli/beam settle, then hold
  placeCamera(0);
  hud.update(0);
  renderer.render(scene, camera);
  // keep rendering (screenshot tools capture the live page)
  loop();
} else {
  loop();
}
