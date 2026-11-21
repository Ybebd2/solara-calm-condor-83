// SOLARA — police.js
// Wanted system, cruisers, foot officers, the detailed white helicopter
// with a searchlight beam computed LIVE from the heli lamp position
// (apex at the spotlight under the nose, bright pool at the exact hit
// point on the ground), and roadblocks at 3+ stars.

import * as THREE from 'three';
import { mulberry32 } from './config.js';

function buildCruiserMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 1.8),
    new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
  cabin.position.set(-0.2, 1.3, 0);
  g.add(cabin);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xff1744 }));
  bar.position.set(-0.2, 1.75, 0);
  g.add(bar);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x2979ff }));
  bar2.position.set(-0.2, 1.75, 0);
  bar2.position.x = 0.45;
  g.add(bar2);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w);
  }
  return g;
}

function buildOfficerMesh() {
  const g = new THREE.Group();
  const uniform = new THREE.MeshLambertMaterial({ color: 0x0d47a1 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), uniform);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.72;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), uniform);
  hat.position.y = 1.94;
  g.add(hat);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.24), uniform);
  legL.position.set(-0.16, 0.31, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  g.add(legR);
  g.scale.setScalar(1.5);
  return g;
}

function buildHeliMesh() {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x10202e });
  const accent = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  // fuselage
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 2.0), white);
  body.position.y = 0;
  g.add(body);
  // nose / cockpit
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 10), glass);
  nose.scale.set(1.4, 0.9, 1.0);
  nose.position.set(2.4, -0.1, 0);
  g.add(nose);
  // tail boom + fin
  const boom = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 0.5), white);
  boom.position.set(-4.2, 0.3, 0);
  g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 1.4), accent);
  fin.position.set(-6.3, 0.9, 0);
  g.add(fin);
  // tail rotor
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  tailRotor.position.set(-6.3, 0.9, 0.4);
  g.add(tailRotor);
  // main rotor mast + blades
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  mast.position.y = 1.1;
  g.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.55;
  const bladeGeo = new THREE.BoxGeometry(9.5, 0.08, 0.5);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const b1 = new THREE.Mesh(bladeGeo, bladeMat);
  rotor.add(b1);
  const b2 = new THREE.Mesh(bladeGeo, bladeMat);
  b2.rotation.y = Math.PI / 2;
  rotor.add(b2);
  g.add(rotor);
  g.userData.rotor = rotor;
  // skids
  const skidMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  for (const wz of [0.9, -0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.12), skidMat);
    skid.position.set(0.3, -1.05, wz);
    g.add(skid);
  }
  // spotlight lamp under the nose (the beam apex lives here)
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff9c4 })
  );
  lamp.position.set(2.0, -0.95, 0);
  g.add(lamp);
  g.userData.lamp = lamp;
  // POLICE marking stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.35, 2.02), accent);
  stripe.position.y = 0.45;
  g.add(stripe);
  return g;
}

export function createPolice(scene) {
  const PO = {
    cruisers: [],
    officers: [],
    heli: null,
    heliAlt: 26,
    roadblocks: [],
    wantedTimer: 0,
    seenTimer: 0,
    update,
    addWanted,
  };
  const rng = mulberry32(4242);
  let blockGroup = null;

  function spawnCruiser(x, z) {
    const mesh = buildCruiserMesh();
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const c = { mesh, heading: 0, speed: 0, hp: 100 };
    PO.cruisers.push(c);
    return c;
  }

  function spawnOfficer(x, z) {
    const mesh = buildOfficerMesh();
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const o = { mesh, hp: 100, heading: 0, phase: rng() * Math.PI * 2 };
    PO.officers.push(o);
    return o;
  }

  function ensureHeli() {
    if (PO.heli) return PO.heli;
    const mesh = buildHeliMesh();
    // beam: cone from the lamp down to the ground + bright pool
    const beamGeo = new THREE.ConeGeometry(3.2, 1, 20, 1, true);
    beamGeo.translate(0, -0.5, 0); // apex at origin, opens downward
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff9c4, transparent: true, opacity: 0.16,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    mesh.add(beam);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.5, depthWrite: false })
    );
    pool.rotation.x = -Math.PI / 2;
    scene.add(pool);
    const spot = new THREE.SpotLight(0xfff2cc, 180, 90, 0.32, 0.5, 1.2);
    scene.add(spot);
    scene.add(spot.target);
    mesh.position.set(-40, PO.heliAlt, 40);
    scene.add(mesh);
    PO.heli = { mesh, beam, pool, spot, angle: 0 };
    return PO.heli;
  }

  function removeHeli() {
    if (!PO.heli) return;
    scene.remove(PO.heli.mesh);
    scene.remove(PO.heli.pool);
    scene.remove(PO.heli.spot);
    scene.remove(PO.heli.spot.target);
    PO.heli = null;
  }

  function setRoadblocks(on, px, pz) {
    if (blockGroup) {
      scene.remove(blockGroup);
      blockGroup = null;
      PO.roadblocks = [];
    }
    if (!on) return;
    blockGroup = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xff6d00 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const spots = [
      [px + 40, pz, 0], [px - 40, pz, 0], [px, pz + 40, Math.PI / 2], [px, pz - 40, Math.PI / 2],
    ];
    for (const [bx, bz, rot] of spots) {
      const barrier = new THREE.Group();
      for (let i = -1; i <= 1; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.5), mat);
        b.position.set(i * 1.3, 0.5, 0);
        barrier.add(b);
        const s = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.52), stripeMat);
        s.position.set(i * 1.3, 0.75, 0);
        barrier.add(s);
      }
      barrier.position.set(bx, 0, bz);
      barrier.rotation.y = rot;
      blockGroup.add(barrier);
      PO.roadblocks.push(barrier);
    }
    scene.add(blockGroup);
  }

  function addWanted(S, n) {
    S.wanted = Math.max(0, Math.min(5, S.wanted + n));
    if (S.wanted > 0) S.seen = true;
  }

  function update(dt, t, S, px, pz, inCar, shotMode) {
    const wanted = S.wanted;
    // --- desired unit counts ---
    const wantCruisers = wanted >= 1 ? Math.min(1 + wanted, 5) : 0;
    const wantOfficers = wanted >= 1 ? Math.min(wanted * 2, 6) : 0;
    while (PO.cruisers.length < wantCruisers) {
      const a = rng() * Math.PI * 2;
      spawnCruiser(px + Math.cos(a) * 70, pz + Math.sin(a) * 70);
    }
    while (PO.cruisers.length > wantCruisers) {
      const c = PO.cruisers.pop();
      scene.remove(c.mesh);
    }
    while (PO.officers.length < wantOfficers) {
      const a = rng() * Math.PI * 2;
      spawnOfficer(px + Math.cos(a) * 30, pz + Math.sin(a) * 30);
    }
    while (PO.officers.length > wantOfficers) {
      const o = PO.officers.pop();
      scene.remove(o.mesh);
    }
    if (wanted >= 2) ensureHeli(); else removeHeli();
    setRoadblocks(wanted >= 3 && !shotMode, px, pz);

    // --- cruisers chase ---
    for (const c of PO.cruisers) {
      const dx = px - c.mesh.position.x;
      const dz = pz - c.mesh.position.z;
      const d = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(-dz, dx);
      let dh = targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
      const chaseSpeed = shotMode ? 2 : Math.min(24, 8 + wanted * 3);
      c.speed += ((d > 6 ? chaseSpeed : 0) - c.speed) * Math.min(1, dt * 2);
      c.mesh.position.x += Math.cos(c.heading) * c.speed * dt;
      c.mesh.position.z += -Math.sin(c.heading) * c.speed * dt;
      c.mesh.rotation.y = -c.heading;
      // ramming the player on foot hurts
      if (d < 2.6 && !inCar && !shotMode) {
        S.health = Math.max(0, S.health - 22 * dt);
        S.message = 'RAMMED BY A CRUISER';
        S.messageUntil = S.time + 1;
      }
    }

    // --- officers chase on foot ---
    for (const o of PO.officers) {
      const dx = px - o.mesh.position.x;
      const dz = pz - o.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 2) {
        const sp = shotMode ? 0.8 : 4.2;
        o.mesh.position.x += (dx / d) * sp * dt;
        o.mesh.position.z += (dz / d) * sp * dt;
        o.heading = Math.atan2(dx, dz);
        o.mesh.rotation.y = o.heading;
        o.mesh.position.y = Math.abs(Math.sin(t * 7 + o.phase)) * 0.06;
      } else if (!shotMode) {
        // arrest / beatdown
        S.health = Math.max(0, S.health - 14 * dt);
        S.message = 'BUSTED — OFFICER ON YOU';
        S.messageUntil = S.time + 1;
      }
    }

    // --- heli orbits + live searchlight beam ---
    if (PO.heli) {
      const h = PO.heli;
      h.angle += dt * 0.45;
      const hx = px + Math.cos(h.angle) * 18;
      const hz = pz + Math.sin(h.angle) * 18;
      const hy = PO.heliAlt + Math.sin(t * 0.8) * 1.5;
      h.mesh.position.set(hx, hy, hz);
      h.mesh.rotation.y = -h.angle + Math.PI / 2;
      h.mesh.userData.rotor.rotation.y += dt * 22;
      // lamp world position = beam apex
      const lampWorld = new THREE.Vector3();
      h.mesh.userData.lamp.getWorldPosition(lampWorld);
      // beam points from lamp toward a spot slightly ahead of the player
      const target = new THREE.Vector3(px + Math.cos(h.angle) * 4, 0, pz + Math.sin(h.angle) * 4);
      const dir = target.clone().sub(lampWorld);
      const len = dir.length();
      dir.normalize();
      // orient the cone: apex at lamp, opening downward toward target
      h.beam.position.copy(lampWorld).sub(h.mesh.position); // local offset
      // simpler: place beam as child of scene? keep as child of heli, aim via lookAt
      h.beam.position.set(2.0, -0.95, 0);
      h.beam.scale.set(1, len, 1);
      // aim the beam: rotate cone so its -Y axis points along dir
      const up = new THREE.Vector3(0, -1, 0);
      h.beam.quaternion.setFromUnitVectors(up, dir.clone().applyQuaternion(h.mesh.quaternion.clone().invert()));
      // bright pool exactly where the beam hits the ground
      h.pool.position.set(target.x, 0.06, target.z);
      const poolScale = 1 + Math.sin(t * 3) * 0.08;
      h.pool.scale.setScalar(poolScale);
      // spotlight follows the same line
      h.spot.position.copy(lampWorld);
      h.spot.target.position.copy(target);
    }

    // --- wanted decay when unseen ---
    if (wanted > 0) {
      PO.wantedTimer += dt;
      if (PO.wantedTimer > 25) {
        S.wanted = Math.max(0, S.wanted - 1);
        PO.wantedTimer = 0;
        if (S.wanted === 0) S.evading = 0;
      }
    } else {
      PO.wantedTimer = 0;
    }
  }

  return PO;
}
