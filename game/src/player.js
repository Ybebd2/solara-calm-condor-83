// SOLARA — player.js
// Kai on foot: WASD movement relative to the orbit camera, sprint, jump,
// weapon switching, reload, and hitscan shooting.

import * as THREE from 'three';
import { WEAPONS } from './config.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  // Kai: teal jacket, dark jeans, cap
  const jacket = new THREE.MeshLambertMaterial({ color: 0x00acc1 });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x263238 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const cap = new THREE.MeshLambertMaterial({ color: 0xffd600 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.38), jacket);
  body.position.y = 1.12;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), skin);
  head.position.y = 1.82;
  group.add(head);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.12, 12), cap);
  capTop.position.y = 2.02;
  group.add(capTop);
  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3), cap);
  capBrim.position.set(0, 1.97, 0.32);
  group.add(capBrim);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.66, 0.26), jeans);
  legL.position.set(-0.17, 0.33, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.17;
  group.add(legR);
  // gun in hand
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.42, 1.2, 0.25);
  group.add(gun);

  group.position.set(-40, 0, 60);
  scene.add(group);

  // tracer line for shots
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0 }));
  scene.add(tracer);

  const P = {
    mesh: group,
    vy: 0,
    onGround: true,
    fireCooldown: 0,
    tracerUntil: 0,
    tracer,
    walkPhase: 0,
  };
  return P;
}

export function updatePlayer(dt, input, S, P, W, V, camera, fireCallback) {
  const camYaw = Math.atan2(-(camera.position.x - P.mesh.position.x), -(camera.position.z - P.mesh.position.z));
  P.fireCooldown = Math.max(0, P.fireCooldown - dt);

  if (S.inCar) {
    // hide Kai while driving
    P.mesh.visible = false;
    return;
  }
  P.mesh.visible = true;

  // movement relative to camera
  let mx = 0, mz = 0;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz -= 1;
  if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz += 1;
  if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
  if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
  const moving = mx !== 0 || mz !== 0;
  const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = sprint ? 10 : 6;
  if (moving) {
    const len = Math.hypot(mx, mz);
    mx /= len; mz /= len;
    // rotate input by camera yaw
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const wx = mx * cos - mz * sin;
    const wz = mx * sin + mz * cos;
    P.mesh.position.x += wx * speed * dt;
    P.mesh.position.z += wz * speed * dt;
    S.heading = Math.atan2(wx, wz);
    P.mesh.rotation.y = S.heading;
    P.walkPhase += dt * (sprint ? 13 : 9);
    // walk bob + leg swing (legs are children 3,4)
    P.mesh.position.y = Math.abs(Math.sin(P.walkPhase)) * 0.05;
    P.mesh.children[3].rotation.x = Math.sin(P.walkPhase) * 0.5;
    P.mesh.children[4].rotation.x = -Math.sin(P.walkPhase) * 0.5;
    S.speed = speed;
  } else {
    S.speed = 0;
    P.mesh.children[3].rotation.x = 0;
    P.mesh.children[4].rotation.x = 0;
    P.mesh.position.y = 0;
  }

  // jump
  if (input.wasPressed('Space') && P.onGround) {
    P.vy = 8.5;
    P.onGround = false;
  }
  if (!P.onGround) {
    P.vy -= 22 * dt;
    P.mesh.position.y += P.vy * dt;
    if (P.mesh.position.y <= 0) {
      P.mesh.position.y = 0;
      P.vy = 0;
      P.onGround = true;
    }
  }

  // clamp to map
  P.mesh.position.x = Math.max(-312, Math.min(312, P.mesh.position.x));
  P.mesh.position.z = Math.max(-312, Math.min(312, P.mesh.position.z));
  S.px = P.mesh.position.x;
  S.pz = P.mesh.position.z;
  if (!moving) S.heading = P.mesh.rotation.y;

  // weapon switching 1-5
  for (let i = 0; i < 5; i++) {
    if (input.wasPressed('Digit' + (i + 1))) {
      S.weaponIdx = i;
      const w = WEAPONS[i];
      S.ammo = w.mag === Infinity ? Infinity : w.mag;
      if (w.mag !== Infinity) S.reserve = w.mag * 4;
    }
  }
  // reload
  if (input.wasPressed('KeyR')) {
    const w = WEAPONS[S.weaponIdx];
    if (w.mag !== Infinity && S.reserve > 0) {
      const need = w.mag - S.ammo;
      const take = Math.min(need, S.reserve);
      S.ammo += take;
      S.reserve -= take;
    }
  }

  // shooting (mouse click; auto weapons also fire while held)
  const w = WEAPONS[S.weaponIdx];
  const wantFire = w.auto ? input.mouseDown : input.clicked;
  if (wantFire && P.fireCooldown <= 0 && S.ammo !== 0) {
    P.fireCooldown = w.rate;
    if (w.mag !== Infinity) S.ammo -= 1;
    S.shotsFired += 1;
    // tracer from gun toward camera forward
    const from = new THREE.Vector3();
    P.mesh.children[5].getWorldPosition(from);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const to = from.clone().add(dir.multiplyScalar(w.range));
    P.tracer.geometry.setFromPoints([from, to]);
    P.tracer.material.opacity = 0.9;
    P.tracerUntil = S.time + 0.06;
    if (fireCallback) fireCallback(from, dir, w);
  }
  if (S.time > P.tracerUntil) P.tracer.material.opacity = 0;
}
