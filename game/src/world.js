// SOLARA — world.js
// Builds the city: ground, road grid, pastel buildings, beach + turquoise
// ocean, trees, streetlights, 64 peds in groups, 20 Golden Geckos, the
// safehouse + mission markers and the target beacon.
// IMPORTANT: no trees within 20 m of the spawn (-40,60), the first mission
// start (-40,-192) or the shot-3 staging spot, so the spawn view is never
// blocked by a canopy.

import * as THREE from 'three';
import { WORLD, DISTRICTS, districtAt, mulberry32 } from './config.js';

const NO_TREE_ZONES = [
  { x: -40, z: 60, r: 22 },   // player spawn
  { x: -40, z: -192, r: 22 }, // first mission start / safehouse / shot 3
  { x: -40, z: -184, r: 16 }, // shot-3 staging
  { x: -8, z: -186, r: 16 },  // shot-4 staging
];

function nearNoTreeZone(x, z) {
  for (const zn of NO_TREE_ZONES) {
    if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return true;
  }
  return false;
}

function isRoad(x, z) {
  const gap = WORLD.roadGap;
  const half = WORLD.roadWidth / 2 + 2;
  const mx = Math.abs(((x + gap / 2) % gap + gap) % gap - gap / 2);
  const mz = Math.abs(((z + gap / 2) % gap + gap) % gap - gap / 2);
  return mx < half || mz < half;
}

// Canvas texture: pastel facade with a lit/unlit window grid.
function facadeTexture(baseHex, litRatio, rng) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const base = '#' + baseHex.toString(16).padStart(6, '0');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  // subtle vertical shading
  const grad = g.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.14)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  // windows
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = rng() < litRatio;
      g.fillStyle = lit ? '#ffe9a8' : '#1d2b3a';
      g.fillRect(10 + col * 22, 12 + row * 24, 14, 15);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const PASTEL = [0xffb3c1, 0xffd6a5, 0xfdffb6, 0xcaffbf, 0x9bf6ff, 0xa0c4ff, 0xbdb2ff, 0xffc6ff, 0xffadad, 0xcaffbf];
const SHIRT_COLORS = [0xff1744, 0xffea00, 0x00e676, 0x2979ff, 0xff6d00, 0xd500f9, 0x00e5ff, 0xff4081, 0x76ff03, 0xffd600];

export function buildWorld(scene) {
  const rng = mulberry32(1337);
  const W = {
    peds: [],
    geckos: [],
    trees: [],
    buildings: [],
    sailboats: [],
    beacon: null,
    beaconRing: null,
    startMarker: null,
    safehouse: null,
    isRoad,
    districtAt,
  };

  // ---- sky light ----
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.95);
  scene.add(hemi);
  // soft ambient so shadowed facades never go pure black
  const amb = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfff2d9, 2.1);
  sun.position.set(120, 180, 60);
  scene.add(sun);

  // ---- ground ----
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x9aa78f });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(640, 640), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // ---- roads (grid) + sidewalks + dashes ----
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb9b3a4 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
  for (let k = -5; k <= 5; k++) {
    const c = k * WORLD.roadGap;
    // road strips
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, 640), roadMat);
    rx.rotation.x = -Math.PI / 2; rx.position.set(c, 0.02, 0); scene.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(640, WORLD.roadWidth), roadMat);
    rz.rotation.x = -Math.PI / 2; rz.position.set(0, 0.02, c); scene.add(rz);
    // sidewalks (lighter border strips)
    const sx = new THREE.Mesh(new THREE.PlaneGeometry(6, 640), walkMat);
    sx.rotation.x = -Math.PI / 2; sx.position.set(c + WORLD.roadWidth / 2 + 3, 0.015, 0); scene.add(sx);
    const sx2 = sx.clone(); sx2.position.x = c - WORLD.roadWidth / 2 - 3; scene.add(sx2);
    const sz = new THREE.Mesh(new THREE.PlaneGeometry(640, 6), walkMat);
    sz.rotation.x = -Math.PI / 2; sz.position.set(0, 0.015, c + WORLD.roadWidth / 2 + 3); scene.add(sz);
    const sz2 = sz.clone(); sz2.position.z = c - WORLD.roadWidth / 2 - 3; scene.add(sz2);
    // dashes
    for (let d = -288; d <= 288; d += 32) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7), dashMat);
      d1.rotation.x = -Math.PI / 2; d1.position.set(c, 0.04, d); scene.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), dashMat);
      d2.rotation.x = -Math.PI / 2; d2.position.set(d, 0.04, c); scene.add(d2);
    }
  }

  // ---- beach sand + turquoise ocean + foam + sailboats + umbrellas ----
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 640),
    new THREE.MeshLambertMaterial({ color: 0xf2ddae })
  );
  sand.rotation.x = -Math.PI / 2; sand.position.set(-284, 0.03, 0);
  scene.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 640),
    new THREE.MeshLambertMaterial({ color: 0x19b5c9 })
  );
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-320, -0.25, 0);
  scene.add(ocean);
  // foam strips
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  for (let z = -300; z <= 300; z += 40) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 26), foamMat);
    f.rotation.x = -Math.PI / 2; f.position.set(-301, 0.05, z + rng() * 10);
    scene.add(f);
  }
  // sailboats
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1, 1.6),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    hull.position.y = 0.4; boat.add(hull);
    const sail = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 4.5, 4),
      new THREE.MeshLambertMaterial({ color: [0xff5252, 0xffd54f, 0x4fc3f7, 0x69f0ae, 0xe040fb][i] })
    );
    sail.position.y = 2.8; sail.rotation.y = Math.PI / 4; boat.add(sail);
    boat.position.set(-312 - rng() * 6, -0.1, -260 + i * 110 + rng() * 30);
    scene.add(boat);
    W.sailboats.push(boat);
  }
  // beach umbrellas
  const umbColors = [0xff5252, 0xffd54f, 0x4fc3f7, 0xff4081, 0x69f0ae];
  for (let i = 0; i < 10; i++) {
    const u = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6),
      new THREE.MeshLambertMaterial({ color: 0x8d6e63 })
    );
    pole.position.y = 1.3; u.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: umbColors[i % umbColors.length] })
    );
    top.position.y = 2.9; u.add(top);
    u.position.set(-292 + rng() * 16, 0, -280 + i * 58 + rng() * 20);
    scene.add(u);
  }

  // ---- buildings (pastel, per district, windows lit) ----
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  for (let bx = -4; bx <= 4; bx++) {
    for (let bz = -4; bz <= 4; bz++) {
      const cx = bx * WORLD.roadGap + WORLD.roadGap / 2;
      const cz = bz * WORLD.roadGap + WORLD.roadGap / 2;
      if (cx < -260) continue; // beach/ocean strip
      const d = districtAt(cx, cz);
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const ox = (rng() - 0.5) * 22;
        const oz = (rng() - 0.5) * 22;
        const x = cx + ox;
        const z = cz + oz;
        if (isRoad(x, z)) continue;
        const downtown = d.name === 'DOWNTOWN';
        const h = downtown ? 16 + rng() * 30 : 7 + rng() * 13;
        const w = 9 + rng() * 9;
        const dep = 9 + rng() * 9;
        const pastel = PASTEL[Math.floor(rng() * PASTEL.length)];
        const tex = facadeTexture(pastel, 0.35 + rng() * 0.3, rng);
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep), mat);
        b.position.set(x, h / 2, z);
        scene.add(b);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.7, dep + 0.6), roofMat);
        roof.position.set(x, h + 0.35, z);
        scene.add(roof);
        // neon strip on Neon Row
        if (d.name === 'NEON ROW' && rng() < 0.6) {
          const strip = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.2, 0.5, 0.3),
            new THREE.MeshBasicMaterial({ color: [0xe040fb, 0x00e5ff, 0xffea00][Math.floor(rng() * 3)] })
          );
          strip.position.set(x, h * 0.72, z + dep / 2 + 0.15);
          scene.add(strip);
        }
        W.buildings.push(b);
      }
    }
  }

  // ---- trees (never in no-tree zones, never on roads) ----
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
  const leafMats = [0x2e7d32, 0x43a047, 0x66bb6a].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  for (let i = 0; i < 130; i++) {
    const x = -300 + rng() * 600;
    const z = -300 + rng() * 600;
    if (isRoad(x, z)) continue;
    if (nearNoTreeZone(x, z)) continue;
    if (x < -262) continue; // keep the beach clear
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6), trunkMat);
    trunk.position.y = 1.2; t.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 + rng(), 8, 6),
      leafMats[Math.floor(rng() * leafMats.length)]
    );
    leaves.position.y = 3.4; t.add(leaves);
    t.position.set(x, 0, z);
    scene.add(t);
    W.trees.push(t);
  }
  // palms along the beach
  for (let i = 0; i < 16; i++) {
    const z = -290 + i * 38 + rng() * 12;
    const x = -272 + rng() * 8;
    if (nearNoTreeZone(x, z)) continue;
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5, 6), trunkMat);
    trunk.position.y = 2.5; trunk.rotation.z = 0.18; t.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.6, 7),
      new THREE.MeshLambertMaterial({ color: 0x2e9e4f })
    );
    leaves.position.set(0.9, 5.2, 0); t.add(leaves);
    t.position.set(x, 0, z);
    scene.add(t);
    W.trees.push(t);
  }

  // ---- streetlights along roads ----
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x455a64 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4 });
  for (let k = -4; k <= 4; k++) {
    for (let d = -256; d <= 256; d += 64) {
      const x = k * WORLD.roadGap + 13;
      const z = d;
      if (x < -260) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
      pole.position.set(x, 3, z); scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), poleMat);
      arm.position.set(x - 1, 5.9, z); scene.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampMat);
      lamp.position.set(x - 2, 5.8, z); scene.add(lamp);
    }
  }

  // ---- peds: 64, scale 1.5, bright shirts, in groups ----
  const skinMats = [0xf1c27d, 0xe0ac69, 0x8d5524, 0xffdbac].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const shirtMats = SHIRT_COLORS.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
  let placed = 0;
  let guard = 0;
  while (placed < 64 && guard++ < 400) {
    // group anchor: on a sidewalk next to a road
    const gx = -280 + rng() * 560;
    const gz = -280 + rng() * 560;
    if (gx < -258) continue;
    if (!isRoad(gx, gz) && Math.abs(gx % 64) > 16 && Math.abs(gz % 64) > 16) continue;
    if (nearNoTreeZone(gx, gz)) continue;
    const groupSize = 2 + Math.floor(rng() * 3);
    for (let j = 0; j < groupSize && placed < 64; j++) {
      const ped = new THREE.Group();
      const shirt = shirtMats[Math.floor(rng() * shirtMats.length)];
      const skin = skinMats[Math.floor(rng() * skinMats.length)];
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), shirt);
      body.position.y = 1.05; ped.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
      head.position.y = 1.72; ped.add(head);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), pantsMat);
      legL.position.set(-0.16, 0.31, 0); ped.add(legL);
      const legR = legL.clone(); legR.position.x = 0.16; ped.add(legR);
      ped.scale.setScalar(1.5);
      ped.position.set(gx + (rng() - 0.5) * 3, 0, gz + (rng() - 0.5) * 3);
      scene.add(ped);
      W.peds.push({
        mesh: ped,
        heading: rng() * Math.PI * 2,
        speed: 0.8 + rng() * 1.1,
        road: Math.abs(gx % 64) < Math.abs(gz % 64) ? 'x' : 'z',
        roadCoord: Math.abs(gx % 64) < Math.abs(gz % 64) ? Math.round(gx / 64) * 64 : Math.round(gz / 64) * 64,
        phase: rng() * Math.PI * 2,
      });
      placed++;
    }
  }

  // ---- 20 Golden Geckos (collectible) ----
  const geckoMat = new THREE.MeshLambertMaterial({ color: 0xffd600, emissive: 0x7a5c00 });
  for (let i = 0; i < 20; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), geckoMat);
    body.scale.set(1.6, 0.55, 0.8); body.position.y = 0.5; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), geckoMat);
    head.position.set(0.85, 0.55, 0); g.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 6), geckoMat);
    tail.rotation.z = Math.PI / 2 + 0.35; tail.position.set(-0.95, 0.5, 0); g.add(tail);
    let x, z, tries = 0;
    do {
      x = -250 + rng() * 500;
      z = -280 + rng() * 560;
      tries++;
    } while ((isRoad(x, z) || nearNoTreeZone(x, z)) && tries < 30);
    g.position.set(x, 0, z);
    g.rotation.y = rng() * Math.PI * 2;
    scene.add(g);
    W.geckos.push({ mesh: g, x, z, taken: false, phase: rng() * Math.PI * 2 });
  }

  // ---- safehouse (pink cylinder at MO'S) + mission start marker ----
  const safe = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.3, 24),
    new THREE.MeshBasicMaterial({ color: 0xff4081, transparent: true, opacity: 0.55 })
  );
  safe.position.set(-40, 0.15, -192);
  scene.add(safe);
  W.safehouse = safe;
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 5, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  marker.position.set(-40, 2.5, -192);
  scene.add(marker);
  W.startMarker = marker;

  // ---- beacon: pulsing ring + vertical beam at current target ----
  const beacon = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.4, 5.6, 32),
    new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2;
  beacon.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  beam.position.y = 30;
  beacon.add(beam);
  beacon.visible = false;
  scene.add(beacon);
  W.beacon = beacon;
  W.beaconRing = ring;

  return W;
}

export function updateWorld(dt, t, W, S) {
  // peds wander along their road
  for (const p of W.peds) {
    const step = p.speed * dt;
    if (p.road === 'x') {
      p.mesh.position.x += Math.cos(p.heading) * step;
      p.mesh.position.z = p.roadCoord + 13;
      if (Math.abs(p.mesh.position.x) > 300) p.heading += Math.PI;
    } else {
      p.mesh.position.z += Math.sin(p.heading) * step;
      p.mesh.position.x = p.roadCoord + 13;
      if (Math.abs(p.mesh.position.z) > 300) p.heading += Math.PI;
    }
    p.mesh.rotation.y = -p.heading + (p.road === 'x' ? 0 : Math.PI / 2);
    // walk bob
    p.mesh.position.y = Math.abs(Math.sin(t * 6 + p.phase)) * 0.06;
  }
  // geckos bob + spin
  for (const g of W.geckos) {
    if (g.taken) continue;
    g.mesh.position.y = 0.15 + Math.sin(t * 2.2 + g.phase) * 0.18;
    g.mesh.rotation.y += dt * 0.8;
  }
  // sailboats bob
  for (const b of W.sailboats) {
    b.position.y = -0.1 + Math.sin(t * 0.9 + b.position.z) * 0.12;
    b.rotation.z = Math.sin(t * 0.7 + b.position.z) * 0.03;
  }
  // beacon pulse
  if (W.beacon.visible) {
    const s = 1 + Math.sin(t * 4) * 0.18;
    W.beaconRing.scale.setScalar(s);
    W.beaconRing.material.opacity = 0.6 + Math.sin(t * 4) * 0.25;
  }
  // start marker spin
  if (W.startMarker.visible) {
    W.startMarker.rotation.y += dt * 1.2;
  }
}
