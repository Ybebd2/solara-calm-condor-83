// SOLARA — vehicles.js
// Traffic cars + player drivable cars. Cars are shaped (body, cabin,
// wheels, lights) — not plain boxes. Traffic drives the road grid in
// both lanes; the player can jack a car with F and drive it.

import * as THREE from 'three';
import { WORLD } from './config.js';

const CAR_COLORS = [0xd32f2f, 0x1976d2, 0xfbc02d, 0x7b1fa2, 0x00897b, 0xf57c00, 0x5d4037, 0x455a64, 0xc0ca33, 0xe91e63];

function buildCarMesh(color, sporty) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const len = sporty ? 4.6 : 4.2;
  const wid = 2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.75, wid), bodyMat);
  body.position.y = 0.65;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(len * 0.5, 0.65, wid * 0.85), glassMat);
  cabin.position.set(-len * 0.05, 1.3, 0);
  cabin.castShadow = true;
  car.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  for (const [wx, wz] of [[len * 0.32, wid / 2], [len * 0.32, -wid / 2], [-len * 0.32, wid / 2], [-len * 0.32, -wid / 2]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    car.add(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffde7 });
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.5), lightMat);
  hl.position.set(len / 2 + 0.02, 0.7, wid / 2 - 0.35);
  car.add(hl);
  const hl2 = hl.clone();
  hl2.position.z = -wid / 2 + 0.35;
  car.add(hl2);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xd50000 });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.5), tailMat);
  tl.position.set(-len / 2 - 0.02, 0.7, wid / 2 - 0.35);
  car.add(tl);
  const tl2 = tl.clone();
  tl2.position.z = -wid / 2 + 0.35;
  car.add(tl2);
  return car;
}

export function createVehicles(scene, S) {
  const traffic = [];
  const rand = (() => {
    let s = 4242;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();

  function spawnTrafficCar(x, z, heading, speed) {
    const color = CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
    const mesh = buildCarMesh(color, rand() < 0.25);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    scene.add(mesh);
    return { mesh, x, z, heading, speed, lane: Math.random() < 0.5 ? 1 : -1 };
  }

  // traffic on the road grid, both lanes
  for (let i = 0; i < 26; i++) {
    const vertical = rand() < 0.5;
    const roadC = (Math.floor(rand() * 9) - 4) * WORLD.roadGap;
    const along = -300 + rand() * 600;
    const laneOff = (rand() < 0.5 ? 5 : -5);
    const x = vertical ? roadC + laneOff : along;
    const z = vertical ? along : roadC + laneOff;
    const heading = vertical ? (laneOff > 0 ? Math.PI : 0) : (laneOff > 0 ? Math.PI / 2 : -Math.PI / 2);
    const speed = 6 + rand() * 8;
    traffic.push(spawnTrafficCar(x, z, heading, speed));
  }

  function update(dt, S) {
    for (const c of traffic) {
      if (S.shotMode) continue;
      const dx = Math.sin(c.heading);
      const dz = Math.cos(c.heading);
      c.x += dx * c.speed * dt;
      c.z += dz * c.speed * dt;
      if (c.x > 320) c.x = -320;
      if (c.x < -320) c.x = 320;
      if (c.z > 320) c.z = -320;
      if (c.z < -320) c.z = 320;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
    }
  }

  function nearestCar(x, z, maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const c of traffic) {
      const dx = c.x - x;
      const dz = c.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = c; }
    }
    return best;
  }

  function placeCarAt(car, x, z, heading) {
    car.x = x;
    car.z = z;
    car.heading = heading;
    car.mesh.position.set(x, 0, z);
    car.mesh.rotation.y = heading;
  }

  return {
    traffic,
    update,
    nearestCar,
    placeCarAt,
    buildCarMesh,
    spawnPlayerCar(color) {
      const mesh = buildCarMesh(color || 0xd32f2f, true);
      scene.add(mesh);
      return { mesh, x: 0, z: 0, heading: 0, speed: 0 };
    },
  };
}
