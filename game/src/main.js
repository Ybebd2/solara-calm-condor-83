// SOLARA — main.js
// Entrypoint. Builds the renderer/scene, wires modules, runs the loop
// (dt clamped to 0.05), handles crew abilities, autopilot, pause/map,
// mission start (E), car enter/exit (F), radio (Q), and the debug API
// on window.__solara.

import * as THREE from 'three';
import { initialState, rankFor, RADIO } from './config.js';
import { createInput } from './input.js';
import { buildWorld } from './world.js';
import { createVehicles } from './vehicles.js';
import { createPlayer } from './player.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';

const S = initialState();
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const input = createInput(canvas);
const audio = createAudio(S);
const world = buildWorld(scene, S);
const vehicles = createVehicles(scene, S);
const police = createPolice(scene, S, audio);
const missions = createMissions(scene, S, audio);
const player = createPlayer(scene, S, input, audio);
const hud = createHud(S, missions, world, vehicles, police);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
});

// --- staged screenshots ---
const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
let stagedCam = null;
if (shotParam) {
  stagedCam = applyShot(shotParam, S, player, vehicles, police, missions);
  hud.hideStart();
}

// --- start screen buttons ---
const startBtn = document.getElementById('start-btn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    S.started = true;
    hud.hideStart();
    audio.unlock();
  });
}
const loadBtn = document.getElementById('load-btn');
if (loadBtn) loadBtn.addEventListener('click', () => { S.started = true; hud.hideStart(); audio.unlock(); });
const settingsBtn = document.getElementById('settings-btn');
if (settingsBtn) settingsBtn.addEventListener('click', () => { S.soundOn = !S.soundOn; settingsBtn.textContent = 'SOUND: ' + (S.soundOn ? 'ON' : 'OFF'); });

let lastTime = performance.now();
let autopilotTarget = null;

function useCrew(name) {
  const now = S.time;
  if (S.crewCd[name] > 0) {
    S.message = name + ' on cooldown (' + Math.ceil(S.crewCd[name]) + 's)';
    S.messageUntil = now + 2;
    return;
  }
  if (name === 'MARA') {
    S.crewCd.MARA = 90;
    S.wanted = Math.max(0, S.wanted - 1);
    S.message = 'MARA — GHOST: -1 wanted star';
    S.messageUntil = now + 3;
  } else if (name === 'SULLY') {
    S.crewCd.SULLY = 60;
    if (S.inCar) {
      S.message = 'SULLY — PIT CREW: car fully repaired';
      S.messageUntil = now + 3;
    } else {
      S.message = 'SULLY — PIT CREW needs you in a car';
      S.messageUntil = now + 3;
    }
  } else if (name === 'KIKI') {
    S.crewCd.KIKI = 60;
    S.lookoutUntil = now + 20;
    S.message = 'KIKI — LOOKOUT: patrols revealed 20s';
    S.messageUntil = now + 3;
  }
  audio.beep();
}

function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(0.05, rawDt);
  S.time += dt;

  // cooldowns tick
  for (const k of Object.keys(S.crewCd)) {
    if (S.crewCd[k] > 0) S.crewCd[k] = Math.max(0, S.crewCd[k] - dt);
  }

  if (S.started && !S.paused) {
    // E: start mission near start marker
    if (input.wasPressed('KeyE')) {
      const dx = S.px - -40;
      const dz = S.pz - -192;
      if (!S.missionActive && Math.hypot(dx, dz) < 8) {
        missions.startMission();
      }
    }
    // F: enter/exit car
    if (input.wasPressed('KeyF')) {
      if (S.inCar) {
        S.inCar = false;
        S.car = null;
        S.carSpeed = 0;
        S.px += Math.sin(S.heading + Math.PI / 2) * 3;
        S.pz += Math.cos(S.heading + Math.PI / 2) * 3;
      } else {
        const car = vehicles.nearestCar(S.px, S.pz, 6);
        if (car) {
          S.inCar = true;
          S.car = car;
          S.carSpeed = 0;
          S.carsJacked++;
          S.message = 'Car jacked!';
          S.messageUntil = S.time + 2;
          audio.beep();
        }
      }
    }
    // Q: radio station
    if (input.wasPressed('KeyQ')) {
      audio.setStation(S.station + 1);
      S.message = 'RADIO: ' + RADIO[S.station % RADIO.length].name;
      S.messageUntil = S.time + 2;
    }
    // crew keys
    if (input.wasPressed('KeyZ')) useCrew('MARA');
    if (input.wasPressed('KeyX')) useCrew('SULLY');
    if (input.wasPressed('KeyC')) useCrew('KIKI');
    // F9 autopilot
    if (input.wasPressed('F9')) {
      S.autopilot = !S.autopilot;
      S.message = 'AUTOPILOT ' + (S.autopilot ? 'ON' : 'OFF');
      S.messageUntil = S.time + 2;
      if (S.autopilot) {
        const m = missions.current();
        const t = m ? (m.type === 'finale' && S.missionStage === 1 ? [-192, -192] : m.target) : [0, 0];
        autopilotTarget = t;
      }
    }
    // autopilot: steer toward mission target
    if (S.autopilot && S.inCar && S.car && autopilotTarget) {
      const dx = autopilotTarget[0] - S.px;
      const dz = autopilotTarget[1] - S.pz;
      const want = Math.atan2(dx, dz);
      let dh = want - S.car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      S.car.heading += Math.max(-1.5 * dt, Math.min(1.5 * dt, dh));
      S.carSpeed = Math.min(S.carSpeed + 10 * dt, 18);
    }
    // Esc: pause
    if (input.wasPressed('Escape')) {
      S.paused = !S.paused;
      hud.showPause(S.paused);
    }
    // M: map
    if (input.wasPressed('KeyM')) {
      S.mapOpen = !S.mapOpen;
      hud.showMap(S.mapOpen);
    }
    // health regen slowly when not wanted
    if (S.wanted === 0 && S.health < 100) S.health = Math.min(100, S.health + 2 * dt);
    // gecko pickup
    if (world.collectGeckoNear(S.px, S.pz)) {
      audio.gecko();
      S.message = 'GOLDEN GECKO! ' + world.geckosTaken() + '/20';
      S.messageUntil = S.time + 2;
    }
    // game over -> respawn at safehouse
    if (S.over) {
      S.over = false;
      S.health = 100;
      S.wanted = 0;
      S.px = -40;
      S.pz = -192;
      S.inCar = false;
      S.car = null;
      S.message = 'You woke up at MO\'S. Back to work.';
      S.messageUntil = S.time + 4;
    }

    world.update(dt, S.time);
    vehicles.update(dt, S);
    police.update(dt);
    missions.update(dt);
    player.update(dt, vehicles, police, missions);
  } else if (!S.started) {
    // attract mode: slow orbit around downtown
    const t = S.time * 0.05;
    player.camera.position.set(Math.cos(t) * 120, 40, Math.sin(t) * 120);
    player.camera.lookAt(0, 10, 0);
  }

  // staged shot camera overrides the orbit camera
  if (stagedCam && S.shotMode) {
    player.camera.position.set(stagedCam.camPos[0], stagedCam.camPos[1], stagedCam.camPos[2]);
    player.camera.lookAt(stagedCam.camLook[0], stagedCam.camLook[1], stagedCam.camLook[2]);
    if (shotParam === '1') hud.showStart();
  }

  hud.update();
  renderer.render(scene, player.camera);
}

window.__solara = {
  version: 'r9-calm-condor',
  S,
  traffic: vehicles.traffic,
  cruisers: police.cruisers,
  officers: police.officers,
  policeCount() { return police.policeCount(); },
  getState() { return JSON.parse(JSON.stringify({ ...S, car: !!S.car })); },
};

requestAnimationFrame(frame);
