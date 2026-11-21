// SOLARA — vehicles.js
// Traffic cars, the player car, arcade driving and carjacking.
// Cars follow the road grid; traffic keeps to lanes and avoids piling up.

import * as THREE from 'three';
import { WORLD, mulberry32 } from './config.js';

const CAR_COLORS = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa, 0xfb8c00, 0x00acc1, 0xec407a, 0x9e9e9e, 0x212121];

function buildCarMesh(color, sporty) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x10202e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(sporty ? 4.6 : 4.2, 0.75, 2.0), bodyMat);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(sporty ? 2.2 : 2.4, 0.62, 1.8), glassMat);
  cabin.position.set(sporty ? -0.2 : -0.3, 1.28, 0);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w);
  }
  // headlights + taillights
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff9c4 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  for (const wz of [0.7, -0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.34), hl);
    h.position.set(sporty ? 2.32 : 2.12, 0.66, wz);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.34), tl);
    t.position.set(sporty ? -2.32 : -2.12, 0.66, wz);
    g.add(t);
  }
  return g;
}

export function createVehicles(scene) {
  const rng = mulberry32(777);
  const V = {
    traffic: [],
    playerCar: null,
    headlight: null,
    spawnTraffic,
    update,
    enterCar,
    exitCar,
  };

  function spawnTraffic(x, z, heading, color, speed) {
    const mesh = buildCarMesh(color !== undefined ? color : CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)], false);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = -heading;
    scene.add(mesh);
    const car = {
      mesh, heading,
      speed: speed !== undefined ? speed : 7 + rng() * 5,
      lane: Math.round(((heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 2)) % 4,
      stuck: 0,
    };
    V.traffic.push(car);
    return car;
  }

  // seed traffic across the grid
  for (let i = 0; i < 26; i++) {
    const alongX = rng() < 0.5;
    const road = (Math.floor(rng() * 9) - 4) * WORLD.roadGap;
    const along = -280 + rng() * 560;
    const dir = rng() < 0.5 ? 0 : Math.PI;
    const lane = (rng() < 0.5 ? 5 : -5);
    if (alongX) spawnTraffic(along, road + lane, dir, undefined, undefined);
    else spawnTraffic(road + lane, along, dir + Math.PI / 2, undefined, undefined);
  }

  function nearestAhead(car, dist) {
    let best = null;
    let bestD = dist;
    for (const o of V.traffic) {
      if (o === car) continue;
      const dx = o.mesh.position.x - car.mesh.position.x;
      const dz = o.mesh.position.z - car.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) {
        // roughly in front?
        const fx = Math.cos(car.heading);
        const fz = -Math.sin(car.heading);
        if (dx * fx + dz * fz > 0) { best = o; bestD = d; }
      }
    }
    return best;
  }

  function update(dt, S, playerPos) {
    // traffic drives along roads, slows for the car ahead
    for (const car of V.traffic) {
      const ahead = nearestAhead(car, 10);
      const targetSpeed = ahead ? Math.max(0, ahead.speed - 2) : car.speed;
      const fx = Math.cos(car.heading);
      const fz = -Math.sin(car.heading);
      car.mesh.position.x += fx * targetSpeed * dt;
      car.mesh.position.z += fz * targetSpeed * dt;
      // wrap around the map edge
      if (car.mesh.position.x > 315) car.mesh.position.x = -315;
      if (car.mesh.position.x < -315) car.mesh.position.x = 315;
      if (car.mesh.position.z > 315) car.mesh.position.z = -315;
      if (car.mesh.position.z < -315) car.mesh.position.z = 315;
      car.mesh.rotation.y = -car.heading;
    }
    // player car headlight follows
    if (V.playerCar && V.headlight) {
      const c = V.playerCar;
      V.headlight.position.set(
        c.mesh.position.x + Math.cos(c.heading) * 2.4,
        1.0,
        c.mesh.position.z - Math.sin(c.heading) * 2.4
      );
      V.headlight.target.position.set(
        c.mesh.position.x + Math.cos(c.heading) * 22,
        0,
        c.mesh.position.z - Math.sin(c.heading) * 22
      );
    }
  }

  function enterCar(S, car, px, pz) {
    // jack the nearest traffic car, or spawn the player car if none near
    let target = car;
    if (!target) {
      let bestD = 6;
      for (const c of V.traffic) {
        const d = Math.hypot(c.mesh.position.x - px, c.mesh.position.z - pz);
        if (d < bestD) { bestD = d; target = c; }
      }
    }
    if (target) {
      const idx = V.traffic.indexOf(target);
      if (idx >= 0) V.traffic.splice(idx, 1);
      V.playerCar = target;
      S.inCar = true;
      S.car = target;
      S.carSpeed = 0;
      S.carsJacked += 1;
      S.jackedAt = S.time;
      S.carHealth = 100;
      if (!V.headlight) {
        V.headlight = new THREE.SpotLight(0xfff2cc, 60, 34, 0.5, 0.45, 1.4);
        scene.add(V.headlight);
        scene.add(V.headlight.target);
      }
      V.headlight.visible = true;
      return true;
    }
    return false;
  }

  function exitCar(S) {
    if (!V.playerCar) return null;
    const c = V.playerCar;
    const px = c.mesh.position.x - Math.sin(c.heading) * 2.5;
    const pz = c.mesh.position.z - Math.cos(c.heading) * 2.5;
    V.traffic.push(c);
    V.playerCar = null;
    S.inCar = false;
    S.car = null;
    S.carSpeed = 0;
    if (V.headlight) V.headlight.visible = false;
    return { x: px, z: pz };
  }

  return V;
}

// Arcade driving for the player car. Returns nothing; mutates S + car.
export function drivePlayerCar(dt, input, S, V, W) {
  const car = V.playerCar;
  if (!car) return;
  const accel = 16;
  const brake = 26;
  const maxSpeed = 34;
  const maxReverse = 10;
  let target = S.carSpeed;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) target += accel * dt;
  else if (input.isDown('KeyS') || input.isDown('ArrowDown')) {
    target -= (S.carSpeed > 0.5 ? brake : accel * 0.6) * dt;
  } else {
    target -= Math.sign(target) * 8 * dt;
    if (Math.abs(target) < 0.3) target = 0;
  }
  target = Math.max(-maxReverse, Math.min(maxSpeed, target));
  S.carSpeed = target;
  // steering scales with speed
  const steerInput = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0)
    - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
  const steerAuthority = Math.min(1, Math.abs(S.carSpeed) / 8);
  car.heading += steerInput * 1.7 * steerAuthority * dt * Math.sign(S.carSpeed || 1);
  const fx = Math.cos(car.heading);
  const fz = -Math.sin(car.heading);
  car.mesh.position.x += fx * S.carSpeed * dt;
  car.mesh.position.z += fz * S.carSpeed * dt;
  // keep inside the map (bounce off the edge)
  if (car.mesh.position.x > 312 || car.mesh.position.x < -312) {
    car.mesh.position.x = Math.max(-312, Math.min(312, car.mesh.position.x));
    S.carSpeed *= -0.3;
  }
  if (car.mesh.position.z > 312 || car.mesh.position.z < -312) {
    car.mesh.position.z = Math.max(-312, Math.min(312, car.mesh.position.z));
    S.carSpeed *= -0.3;
  }
  car.mesh.rotation.y = -car.heading;
  // body roll
  car.mesh.rotation.z = -steerInput * 0.03 * steerAuthority;
  S.px = car.mesh.position.x;
  S.pz = car.mesh.position.z;
  S.heading = car.heading;
  S.speed = Math.abs(S.carSpeed);
}
