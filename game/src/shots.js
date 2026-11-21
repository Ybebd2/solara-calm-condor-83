// SOLARA — shots.js
// Staged screenshots (?shot=1..4). Each shot STAGES the scene — it does
// not just move the camera. S.shotMode = true in staged shots so the
// police do not ram the player out of frame.

import { MISSIONS } from './config.js';

const SHOTS = {
  // shot 1 sits over the road corridor (x=-256) and higher, so no building
  // slab crowds the lens; it still looks east across downtown.
  1: { camPos: [-256, 14, 84], camLook: [-40, 20, -20] },
  2: { camPos: [-64, 6, 78], camLook: [-20, 2, 64] },
  3: { camPos: [-46, 1.7, -184], camLook: [-39, 1.25, -184] },
  4: { camPos: [36, 10, -220], camLook: [-12, 10, -176] },
};

export function stageShot(n, ctx) {
  const { S, W, V, P, PO, M, hud } = ctx;
  S.shotMode = true;
  S.started = true;
  const def = SHOTS[n] || SHOTS[1];

  if (n === 1) {
    // start menu visible, camera over downtown looking east at the
    // street + gold/teal skyscrapers
    S.started = false;
    const menu = document.getElementById('start-screen');
    if (menu) menu.style.display = 'flex';
    S.px = -40; S.pz = 60;
    P.mesh.position.set(-40, 0, 60);
    P.mesh.rotation.y = Math.PI * 0.75;
    S.wanted = 0;
  }

  if (n === 2) {
    // Kai in a red sports car driving east on road z=64; 8 traffic cars
    // clustered tight ahead in both lanes (6 m spacing); wanted 1
    const menu = document.getElementById('start-screen');
    if (menu) menu.style.display = 'none';
    // clear traffic, then stage the cluster
    for (const c of V.traffic) ctx.scene.remove(c.mesh);
    V.traffic.length = 0;
    const kaiCar = V.spawnTraffic(-52, 64, 0, 0xe53935, 12);
    V.enterCar(S, kaiCar, -52, 64);
    S.carSpeed = 12;
    const lanes = [59, 69];
    for (let i = 0; i < 8; i++) {
      const lane = lanes[i % 2];
      const x = -40 + Math.floor(i / 2) * 6;
      V.spawnTraffic(x, lane, 0, undefined, 10);
    }
    S.wanted = 1;
    S.missionIdx = 0;
    S.missionActive = false;
    hud.showMessage('NEON ROW — 2:14 PM, traffic bumper to bumper');
  }

  if (n === 3) {
    // Kai on foot at the mission start, Lupe dialogue, wanted 2
    const menu = document.getElementById('start-screen');
    if (menu) menu.style.display = 'none';
    if (S.inCar) V.exitCar(S);
    S.px = -40; S.pz = -184;
    S.heading = Math.PI;
    P.mesh.position.set(-40, 0, -184);
    P.mesh.rotation.y = Math.PI;
    S.missionIdx = 0;
    S.missionActive = true;
    S.missionTime = MISSIONS[0].time;
    S.missionStage = 0;
    S.missionHold = 0;
    S.wanted = 2;
    hud.showDialogue('LUPE', MISSIONS[0].brief);
    hud.showMessage('LUPE: First Fix — meet me at MO\'S');
  }

  if (n === 4) {
    // neon chase: mission 5 started, heli up at 26 m, wanted 3
    const menu = document.getElementById('start-screen');
    if (menu) menu.style.display = 'none';
    if (S.inCar) V.exitCar(S);
    S.px = -8; S.pz = -186;
    S.heading = Math.PI;
    P.mesh.position.set(-8, 0, -186);
    P.mesh.rotation.y = Math.PI;
    S.missionIdx = 5;
    S.missionActive = true;
    S.missionTime = MISSIONS[5].time;
    S.missionStage = 0;
    S.missionHold = 0;
    S.wanted = 3;
    PO.heliAlt = 26;
    hud.showDialogue('LUPE', MISSIONS[5].brief);
    hud.showMessage('HOT WHEELS — jack a ride, lose the heli');
  }

  return { camPos: def.camPos, camLook: def.camLook };
}

export function getShotDef(n) {
  return SHOTS[n] || null;
}
