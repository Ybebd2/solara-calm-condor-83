// SOLARA — player.js
// Kai on foot and in a car: WASD movement, sprint, jump, orbit camera,
// weapons (1-5, R reload), shooting with hit feedback, car enter/exit.

import * as THREE from 'three';
import { WEAPONS } from './config.js';

export function createPlayer(scene, S, input, audio) {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0xff7043 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e3a5f });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.25, 10), shirtMat);
  body.position.y = 1.3;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), skinMat);
  head.position.y = 2.2;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 12), new THREE.MeshLambertMaterial({ color: 0xffd54f }));
  cap.position.y = 2.42;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.24), pantsMat);
  legL.position.set(-0.18, 0.42, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  group.add(legR);
  // gun in hand
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.55), new THREE.MeshLambertMaterial({ color: 0x212121 }));
  gun.position.set(0.5, 1.45, 0.3);
  group.add(gun);
  group.scale.setScalar(1.5);
  scene.add(group);

  let vy = 0;
  let grounded = true;
  let camYaw = S.heading + Math.PI;
  let camPitch = 0.32;
  let camDist = 9;
  let lastShot = 0;
  let walkPhase = 0;

  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 900);

  function update(dt, vehicles, police, missions) {
    const now = S.time;
    // camera orbit from mouse drag
    const drag = input.consumeDrag();
    camYaw -= drag.x * 0.005;
    camPitch = Math.max(0.08, Math.min(1.1, camPitch + drag.y * 0.003));

    if (S.paused || !S.started) return;

    const w = WEAPONS[S.weaponIdx];
    const sprint = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
    const speed = S.inCar ? 0 : (sprint ? 9 : 5.5);

    if (S.inCar && S.car) {
      // driving: W/S throttle, A/D steer
      const fwd = (input.keys['KeyW'] ? 1 : 0) - (input.keys['KeyS'] ? 1 : 0);
      const steer = (input.keys['KeyA'] ? 1 : 0) - (input.keys['KeyD'] ? 1 : 0);
      const accel = 14;
      S.carSpeed += fwd * accel * dt;
      S.carSpeed *= Math.pow(0.4, dt);
      if (Math.abs(S.carSpeed) > 26) S.carSpeed = Math.sign(S.carSpeed) * 26;
      const d = districtGrip(S.car ? S.car.x : S.px, S.car ? S.car.z : S.pz);
      const turn = steer * 1.9 * dt * Math.min(1, Math.abs(S.carSpeed) / 8) * (d / 50);
      S.car.heading += turn * Math.sign(S.carSpeed || 1);
      S.car.x += Math.sin(S.car.heading) * S.carSpeed * dt;
      S.car.z += Math.cos(S.car.heading) * S.carSpeed * dt;
      S.car.x = Math.max(-315, Math.min(315, S.car.x));
      S.car.z = Math.max(-315, Math.min(315, S.car.z));
      S.px = S.car.x;
      S.pz = S.car.z;
      S.heading = S.car.heading;
      S.speed = Math.abs(S.carSpeed);
      S.car.mesh.position.set(S.car.x, 0, S.car.z);
      S.car.mesh.rotation.y = S.car.heading;
      group.visible = false;
      // camera follows car
      camYaw = S.car.heading + Math.PI;
    } else {
      group.visible = true;
      let mx = 0;
      let mz = 0;
      if (input.keys['KeyW']) { mx += Math.sin(S.heading); mz += Math.cos(S.heading); }
      if (input.keys['KeyS']) { mx -= Math.sin(S.heading); mz -= Math.cos(S.heading); }
      if (input.keys['KeyA']) { mx -= Math.cos(S.heading); mz += Math.sin(S.heading); }
      if (input.keys['KeyD']) { mx += Math.cos(S.heading); mz -= Math.sin(S.heading); }
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx /= len;
        mz /= len;
        S.px += mx * speed * dt;
        S.pz += mz * speed * dt;
        S.heading = Math.atan2(mx, mz);
        S.speed = speed;
        walkPhase += dt * speed * 1.6;
        legL.rotation.x = Math.sin(walkPhase) * 0.6;
        legR.rotation.x = -Math.sin(walkPhase) * 0.6;
      } else {
        S.speed = 0;
        legL.rotation.x *= 0.8;
        legR.rotation.x *= 0.8;
      }
      S.px = Math.max(-315, Math.min(315, S.px));
      S.pz = Math.max(-315, Math.min(315, S.pz));
      // jump
      if (input.wasPressed('Space') && grounded) {
        vy = 7;
        grounded = false;
      }
      if (!grounded) {
        vy -= 20 * dt;
        group.position.y += vy * dt;
        if (group.position.y <= 0) {
          group.position.y = 0;
          vy = 0;
          grounded = true;
        }
      }
      group.position.set(S.px, group.position.y, S.pz);
      group.rotation.y = S.heading;
    }

    // weapons
    if (input.wasPressed('Digit1')) S.weaponIdx = 0;
    if (input.wasPressed('Digit2')) S.weaponIdx = 1;
    if (input.wasPressed('Digit3')) S.weaponIdx = 2;
    if (input.wasPressed('Digit4')) S.weaponIdx = 3;
    if (input.wasPressed('Digit5')) S.weaponIdx = 4;
    if (S.weaponIdx !== 0 && S.weaponIdx !== 4) {
      S.ammo = Math.min(S.ammo, WEAPONS[S.weaponIdx].mag);
    }
    if (input.wasPressed('KeyR') && S.ammo < WEAPONS[S.weaponIdx].mag && S.reserve > 0) {
      const need = WEAPONS[S.weaponIdx].mag - S.ammo;
      const take = Math.min(need, S.reserve);
      S.ammo += take;
      S.reserve -= take;
      audio.reload();
    }
    // shooting: mouse down or J
    const wantFire = input.mouseDown || input.keys['KeyJ'];
    if (wantFire && !S.inCar && now - lastShot >= w.rate) {
      if (w.name !== 'FISTS' && S.ammo <= 0) {
        audio.beep();
      } else {
        lastShot = now;
        if (w.name !== 'FISTS') S.ammo--;
        S.shotsFired++;
        audio.shot();
        const hit = police.tryHit(S.px, S.pz, S.heading, w);
        if (hit) {
          S.hits++;
          S.message = 'HIT! +' + w.dmg;
          S.messageUntil = now + 1;
        }
      }
    }

    // camera
    const cx = S.px - Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const cz = S.pz - Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    const cy = 2.2 + Math.sin(camPitch) * camDist;
    camera.position.set(cx, cy, cz);
    camera.lookAt(S.px, 1.6, S.pz);
  }

  function districtGrip(x, z) {
    return 50;
  }

  return {
    group,
    camera,
    update,
    setCamYaw(y) { camYaw = y; },
    get camYaw() { return camYaw; },
  };
}
