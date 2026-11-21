// SOLARA — world.js
// Builds the city: sky, ocean + beach, road grid, pastel buildings with
// shaped roofs and window grids, palms, lamps, 64 peds in bright shirts,
// 20 Golden Geckos. Spawn (-40,60) and mission start (-40,-192) are kept
// clear of trees so the default view is never blocked.

import * as THREE from 'three';
import { WORLD, DISTRICTS } from './config.js';

const SPAWN_CLEAR = [{ x: -40, z: 60, r: 20 }, { x: -40, z: -192, r: 20 }];

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function districtAt(x, z) {
  let best = null;
  let bestD = 1e9;
  for (const d of DISTRICTS) {
    const dx = x - d.x;
    const dz = z - d.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

function makeWindowTexture(color) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(20,30,50,0.85)';
  for (let y = 8; y < 120; y += 16) {
    for (let x = 6; x < 58; x += 14) {
      g.fillRect(x, y, 9, 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld(scene, S) {
  const rand = seededRand(1337);
  const updaters = [];
  const peds = [];
  const geckos = [];
  const colliders = [];

  // --- sky, light ---
  scene.background = new THREE.Color(0x7ec8f7);
  scene.fog = new THREE.Fog(0x9fd8f7, 180, 520);
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a9a6a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.9);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // --- ground ---
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x7fae5a });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size + 260, WORLD.size + 260), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.x = -80;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- ocean (turquoise) + foam + beach sand ---
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(140, WORLD.size + 260),
    new THREE.MeshLambertMaterial({ color: 0x2fd4c8 })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(WORLD.oceanX - 70, 0.02, 0);
  scene.add(ocean);
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(6, WORLD.size + 260),
    new THREE.MeshLambertMaterial({ color: 0xeafcff })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(WORLD.oceanX + 2, 0.04, 0);
  scene.add(foam);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(34, WORLD.size + 260),
    new THREE.MeshLambertMaterial({ color: 0xf2dd9e })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(WORLD.beachX - 15, 0.03, 0);
  sand.receiveShadow = true;
  scene.add(sand);

  // sailboats on the ocean
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xd94f3d });
  for (let i = 0; i < 5; i++) {
    const bx = WORLD.oceanX - 30 - rand() * 60;
    const bz = -240 + i * 110 + rand() * 30;
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 2.6), hullMat);
    hull.position.y = 0.6;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
    mast.position.y = 5;
    boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 7), sailMat);
    sail.position.set(2.2, 5, 0);
    boat.add(sail);
    boat.position.set(bx, 0, bz);
    boat.rotation.y = rand() * Math.PI;
    scene.add(boat);
    updaters.push((dt, t) => { boat.position.y = Math.sin(t * 0.7 + i) * 0.25; boat.rotation.z = Math.sin(t * 0.5 + i) * 0.03; });
  }

  // beach umbrellas
  const umbrellaColors = [0xff5252, 0xffd54f, 0x4fc3f7, 0xe040fb, 0x69f0ae];
  for (let i = 0; i < 10; i++) {
    const ux = WORLD.beachX - 8 - rand() * 18;
    const uz = -280 + i * 58 + rand() * 20;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }));
    pole.position.set(ux, 1.3, uz);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 8), new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }));
    top.position.set(ux, 3, uz);
    scene.add(top);
  }

  // --- roads: grid every 64m, width 20 ---
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const centerMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const roads = [];
  for (let i = -4; i <= 4; i++) {
    const c = i * WORLD.roadGap;
    if (c < -WORLD.size / 2 - 10 || c > WORLD.size / 2 + 10) continue;
    roads.push({ x: c, z: 0, vertical: true });
    roads.push({ x: 0, z: c, vertical: false });
  }
  for (const r of roads) {
    const len = WORLD.size + 40;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(r.vertical ? WORLD.roadWidth : len, r.vertical ? len : WORLD.roadWidth), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(r.x, 0.05, r.z);
    road.receiveShadow = true;
    scene.add(road);
    // sidewalks
    const sw1 = new THREE.Mesh(new THREE.PlaneGeometry(r.vertical ? 4 : len, r.vertical ? len : 4), sidewalkMat);
    sw1.rotation.x = -Math.PI / 2;
    sw1.position.set(r.vertical ? r.x - WORLD.roadWidth / 2 - 2 : r.x, 0.06, r.vertical ? r.z : r.z - WORLD.roadWidth / 2 - 2);
    scene.add(sw1);
    const sw2 = sw1.clone();
    sw2.position.set(r.vertical ? r.x + WORLD.roadWidth / 2 + 2 : r.x, 0.06, r.vertical ? r.z : r.z + WORLD.roadWidth / 2 + 2);
    scene.add(sw2);
    // lane dashes
    const n = Math.floor(len / 12);
    for (let k = 0; k < n; k++) {
      const off = -len / 2 + 6 + k * 12;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(r.vertical ? 0.4 : 3, r.vertical ? 3 : 0.4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(r.vertical ? r.x : off, 0.07, r.vertical ? off : r.z);
      scene.add(dash);
    }
    const cen = new THREE.Mesh(new THREE.PlaneGeometry(r.vertical ? 0.5 : len, r.vertical ? len : 0.5), centerMat);
    cen.rotation.x = -Math.PI / 2;
    cen.position.set(r.x, 0.07, r.z);
    scene.add(cen);
  }

  // --- buildings: pastel, shaped, window grids, roof details ---
  const pastel = ['#ffd9e8', '#ffe9b0', '#c8f7d4', '#c5e8ff', '#e8d5ff', '#ffc9a8', '#d8f3dc', '#fff3b0'];
  const winTexCache = {};
  function winTex(color) {
    if (!winTexCache[color]) winTexCache[color] = makeWindowTexture(color);
    return winTexCache[color];
  }
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5d6d7e });
  const acMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
  for (let gx = -4; gx <= 4; gx++) {
    for (let gz = -4; gz <= 4; gz++) {
      const bx = gx * WORLD.roadGap;
      const bz = gz * WORLD.roadGap;
      if (bx < -WORLD.beachX - 10 && bx > WORLD.beachX) { /* beach strip: skip most */ }
      if (bx <= WORLD.beachX + 6) continue; // beach / ocean strip
      if (Math.abs(bx) > WORLD.size / 2 - 20 || Math.abs(bz) > WORLD.size / 2 - 20) continue;
      // skip road crossings
      if (Math.abs(bx % WORLD.roadGap) < 1 && Math.abs(bz % WORLD.roadGap) < 1) continue;
      const d = districtAt(bx, bz);
      const color = pastel[Math.floor(rand() * pastel.length)];
      const w = 18 + rand() * 16;
      const dep = 18 + rand() * 16;
      const h = 8 + rand() * rand() * 34;
      const mat = new THREE.MeshLambertMaterial({ map: winTex(color) });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep), mat);
      b.position.set(bx + (rand() - 0.5) * 8, h / 2, bz + (rand() - 0.5) * 8);
      b.castShadow = true;
      b.receiveShadow = true;
      scene.add(b);
      colliders.push({ x: b.position.x, z: b.position.z, r: Math.max(w, dep) * 0.62 });
      // roof slab + AC boxes (shaped roof, not flat)
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.8, dep * 0.9), roofMat);
      roof.position.set(b.position.x, h + 0.4, b.position.z);
      scene.add(roof);
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), acMat);
      ac.position.set(b.position.x + w * 0.2, h + 1.4, b.position.z);
      scene.add(ac);
      const ac2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 1.8), acMat);
      ac2.position.set(b.position.x - w * 0.25, h + 1.3, b.position.z - dep * 0.2);
      scene.add(ac2);
      // neon sign strip in Neon Row
      if (d && d.name === 'NEON ROW' && rand() < 0.6) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.7, 1.2, 0.4),
          new THREE.MeshBasicMaterial({ color: [0xe040fb, 0x00e5ff, 0xffea00][Math.floor(rand() * 3)] })
        );
        sign.position.set(b.position.x, h * 0.75, b.position.z + dep / 2 + 0.3);
        scene.add(sign);
      }
    }
  }

  // --- palms + round trees (clear of spawn / mission start) ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
  const palmMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x43a047 });
  function clearOfSpawn(x, z) {
    for (const c of SPAWN_CLEAR) {
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r) return false;
    }
    return true;
  }
  for (let i = 0; i < 90; i++) {
    const tx = -300 + rand() * 600;
    const tz = -300 + rand() * 600;
    if (tx <= WORLD.beachX + 6) continue;
    if (Math.abs(tx % WORLD.roadGap) < 14 || Math.abs(tz % WORLD.roadGap) < 14) continue;
    if (!clearOfSpawn(tx, tz)) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 5 + rand() * 2, 6), trunkMat);
    trunk.position.set(tx, 2.8, tz);
    trunk.castShadow = true;
    scene.add(trunk);
    if (rand() < 0.55) {
      // palm fronds
      for (let f = 0; f < 5; f++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 4), palmMat);
        const a = (f / 5) * Math.PI * 2;
        frond.position.set(tx + Math.cos(a) * 1.2, 5.8, tz + Math.sin(a) * 1.2);
        frond.rotation.z = Math.cos(a) * 0.9;
        frond.rotation.x = -Math.sin(a) * 0.9;
        scene.add(frond);
      }
    } else {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2 + rand(), 8, 6), leafMat);
      crown.position.set(tx, 6.2, tz);
      crown.castShadow = true;
      scene.add(crown);
    }
  }

  // --- street lamps along roads (fixture + pole, light comes from source) ---
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4 });
  const lampPositions = [];
  for (let i = -4; i <= 4; i++) {
    const c = i * WORLD.roadGap;
    for (let k = -4; k <= 4; k += 2) {
      const off = k * WORLD.roadGap;
      lampPositions.push([c + 11, off]);
      lampPositions.push([c - 11, off + 32]);
    }
  }
  for (const [lx, lz] of lampPositions) {
    if (lx <= WORLD.beachX + 6) continue;
    if (Math.abs(lx) > 310 || Math.abs(lz) > 310) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
    pole.position.set(lx, 3, lz);
    scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), poleMat);
    arm.position.set(lx, 5.9, lz);
    scene.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.5), lampHeadMat);
    head.position.set(lx + 0.9, 5.85, lz);
    scene.add(head);
  }

  // --- peds: 64, scale 1.5, bright shirts, in groups on sidewalks ---
  const shirtColors = [0xff5252, 0xffd54f, 0x69f0ae, 0x4fc3f7, 0xe040fb, 0xff9800, 0x00e5ff, 0xffea00];
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  for (let g = 0; g < 16; g++) {
    const gx = -280 + rand() * 560;
    const gz = -280 + rand() * 560;
    if (gx <= WORLD.beachX + 6) continue;
    const n = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < n && peds.length < 64; j++) {
      const px = gx + (rand() - 0.5) * 6;
      const pz = gz + (rand() - 0.5) * 6;
      const ped = new THREE.Group();
      const shirt = new THREE.MeshLambertMaterial({ color: shirtColors[Math.floor(rand() * shirtColors.length)] });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.3, 8), shirt);
      body.position.y = 1.35;
      body.castShadow = true;
      ped.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), skinMat);
      head.position.y = 2.25;
      ped.add(head);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), legMat);
      legL.position.set(-0.18, 0.45, 0);
      ped.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.18;
      ped.add(legR);
      ped.scale.setScalar(1.5);
      ped.position.set(px, 0, pz);
      ped.rotation.y = rand() * Math.PI * 2;
      scene.add(ped);
      peds.push({
        mesh: ped,
        hx: px, hz: pz,
        phase: rand() * Math.PI * 2,
        speed: 0.3 + rand() * 0.5,
        dir: rand() * Math.PI * 2,
      });
    }
  }

  // --- Golden Geckos: 20 collectibles, HUD counter + minimap dots ---
  const geckoMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const geckoRingMat = new THREE.MeshBasicMaterial({ color: 0xfff176 });
  for (let i = 0; i < 20; i++) {
    const gx = -250 + rand() * 540;
    const gz = -280 + rand() * 560;
    if (gx <= WORLD.beachX + 6) { i--; continue; }
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), geckoMat);
    body.position.y = 1;
    g.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 6, 16), geckoRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1;
    g.add(ring);
    g.position.set(gx, 0, gz);
    scene.add(g);
    geckos.push({ mesh: g, x: gx, z: gz, taken: false, phase: rand() * Math.PI * 2 });
  }

  function update(dt, t) {
    for (const u of updaters) u(dt, t);
    for (const p of peds) {
      p.phase += dt * p.speed;
      const nx = p.hx + Math.cos(p.dir) * Math.sin(p.phase) * 3;
      const nz = p.hz + Math.sin(p.dir) * Math.sin(p.phase) * 3;
      p.mesh.position.set(nx, 0, nz);
      p.mesh.rotation.y = p.dir + Math.sin(p.phase) * 0.4;
    }
    for (const g of geckos) {
      if (g.taken) continue;
      g.mesh.position.y = 0.3 + Math.sin(t * 2 + g.phase) * 0.25;
      g.mesh.rotation.y += dt * 1.5;
    }
  }

  return {
    peds,
    geckos,
    colliders,
    update,
    districtAt,
    collectGeckoNear(x, z) {
      for (const g of geckos) {
        if (g.taken) continue;
        const dx = g.x - x;
        const dz = g.z - z;
        if (dx * dx + dz * dz < 4) {
          g.taken = true;
          g.mesh.visible = false;
          return true;
        }
      }
      return false;
    },
    geckosTaken() { return geckos.filter((g) => g.taken).length; },
  };
}
