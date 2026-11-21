// SOLARA — police.js
// Wanted system, cruisers + officers, and a detailed white helicopter
// whose searchlight beam is computed LIVE from the lamp under its nose:
// apex at the spotlight, cone to the ground, bright pool at the exact
// hit point. Roadblocks appear at 3+ stars.

import * as THREE from 'three';

export function createPolice(scene, S, audio) {
  const cruisers = [];
  const officers = [];
  const roadblocks = [];
  let heli = null;
  let heliBeam = null;
  let heliPool = null;
  let heliSpot = null;
  let heliAlt = 26;
  let heliAngle = 0;
  let sirenTimer = 0;
  let lastSpawn = 0;

  const cruiserMat = new THREE.MeshLambertMaterial({ color: 0x1a237e });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  function buildCruiser() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 2), cruiserMat);
    body.position.y = 0.65;
    body.castShadow = true;
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 1.8), whiteMat);
    cab.position.set(-0.2, 1.35, 0);
    g.add(cab);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 1.2), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    bar.position.set(-0.2, 1.8, 0);
    g.add(bar);
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
    for (const [wx, wz] of [[1.4, 1], [1.4, -1], [-1.4, 1], [-1.4, -1]]) {
      const w = new THREE.Mesh(wheelGeo, blackMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.38, wz);
      g.add(w);
    }
    scene.add(g);
    return g;
  }

  function buildOfficer() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.48, 1.25, 8), cruiserMat);
    body.position.y = 1.3;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 2.2;
    g.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 10), blackMat);
    hat.position.y = 2.42;
    g.add(hat);
    g.scale.setScalar(1.5);
    scene.add(g);
    return g;
  }

  function buildHeli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.5, 1.9), whiteMat);
    body.castShadow = true;
    g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.6, 8), whiteMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(2.8, 0, 0);
    g.add(nose);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.7), new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
    glass.position.set(1.9, 0.3, 0);
    g.add(glass);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.5), whiteMat);
    tail.position.set(-3.6, 0.3, 0);
    g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.9), new THREE.MeshLambertMaterial({ color: 0x1a237e }));
    fin.position.set(-5.2, 0.8, 0);
    g.add(fin);
    const skidMat = blackMat;
    for (const z of [0.9, -0.9]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), skidMat);
      skid.position.set(0.4, -1.05, z);
      g.add(skid);
    }
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), blackMat);
    rotor.position.y = 1.1;
    g.add(rotor);
    // spotlight lamp under the nose — the beam apex lives here
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfffde7 }));
    lamp.position.set(2.2, -0.85, 0);
    lamp.name = 'spotLamp';
    g.add(lamp);
    // beam: cone from lamp to ground pool, recomputed every frame
    const beamGeo = new THREE.ConeGeometry(3.2, 1, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    heliBeam = new THREE.Mesh(beamGeo, beamMat);
    scene.add(heliBeam);
    const poolGeo = new THREE.CircleGeometry(3.2, 20);
    const poolMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.5, depthWrite: false });
    heliPool = new THREE.Mesh(poolGeo, poolMat);
    heliPool.rotation.x = -Math.PI / 2;
    scene.add(heliPool);
    heliSpot = new THREE.SpotLight(0xfff9c4, 60, 60, 0.45, 0.4, 1);
    scene.add(heliSpot);
    scene.add(heliSpot.target);
    scene.add(g);
    return g;
  }

  function spawnCruiser() {
    const g = buildCruiser();
    const a = Math.random() * Math.PI * 2;
    const x = S.px + Math.cos(a) * 40;
    const z = S.pz + Math.sin(a) * 40;
    g.position.set(x, 0, z);
    cruisers.push({ mesh: g, x, z, heading: a, speed: 0 });
  }

  function spawnOfficer() {
    const g = buildOfficer();
    const a = Math.random() * Math.PI * 2;
    const x = S.px + Math.cos(a) * 12;
    const z = S.pz + Math.sin(a) * 12;
    g.position.set(x, 0, z);
    officers.push({ mesh: g, x, z, heading: a, hp: 100 });
  }

  function spawnRoadblock() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1, 3.4),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff6d00 : 0xffffff })
      );
      stripe.position.set(0, 0.5, (i - 1) * 3.6);
      g.add(stripe);
    }
    const a = Math.random() * Math.PI * 2;
    g.position.set(S.px + Math.cos(a) * 24, 0, S.pz + Math.sin(a) * 24);
    g.rotation.y = a;
    scene.add(g);
    roadblocks.push({ mesh: g });
  }

  function update(dt) {
    const now = S.time;
    // wanted decay while hidden
    if (S.wanted > 0) {
      if (S.shotMode) {
        // staged shots keep wanted fixed
      } else if (!S.seen) {
        S.evading += dt;
        if (S.evading > 12) {
          S.wanted = Math.max(0, S.wanted - 1);
          S.evading = 0;
          S.message = 'HEAT COOLING…';
          S.messageUntil = now + 2;
        }
      } else {
        S.evading = 0;
      }
    }
    // spawn police to match wanted
    const wantCruisers = S.wanted >= 1 ? Math.min(S.wanted, 3) : 0;
    const wantOfficers = S.wanted >= 2 ? Math.min((S.wanted - 1) * 2, 4) : 0;
    if (now - lastSpawn > 2) {
      lastSpawn = now;
      if (cruisers.length < wantCruisers) spawnCruiser();
      if (officers.length < wantOfficers) spawnOfficer();
      if (S.wanted >= 3 && roadblocks.length < 2) spawnRoadblock();
    }
    // cruisers chase
    for (const c of cruisers) {
      const dx = S.px - c.x;
      const dz = S.pz - c.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      const spd = S.shotMode ? 0 : Math.min(20, 8 + S.wanted * 3);
      c.speed = spd;
      c.x += Math.sin(c.heading) * spd * dt;
      c.z += Math.cos(c.heading) * spd * dt;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      if (dist < 3 && !S.shotMode) {
        S.health -= 12 * dt;
        S.seen = true;
        if (S.health <= 0) {
          S.health = 0;
          S.over = true;
          S.arrests++;
          S.message = 'BUSTED!';
          S.messageUntil = now + 3;
        }
      }
    }
    // officers chase on foot
    for (const o of officers) {
      const dx = S.px - o.x;
      const dz = S.pz - o.z;
      const dist = Math.hypot(dx, dz) || 1;
      o.heading = Math.atan2(dx, dz);
      const spd = S.shotMode ? 0 : 5.5;
      o.x += (dx / dist) * spd * dt;
      o.z += (dz / dist) * spd * dt;
      o.mesh.position.set(o.x, 0, o.z);
      o.mesh.rotation.y = o.heading;
      if (dist < 2 && !S.shotMode) {
        S.health -= 8 * dt;
        S.seen = true;
      }
    }
    // helicopter at 3+ stars
    if (S.wanted >= 3 && !heli) {
      heli = buildHeli();
    }
    if (heli) {
      if (S.wanted < 3) {
        heli.visible = false;
        heliBeam.visible = false;
        heliPool.visible = false;
        heliSpot.visible = false;
      } else {
        heli.visible = true;
        heliBeam.visible = true;
        heliPool.visible = true;
        heliSpot.visible = true;
        heliAngle += dt * 0.35;
        const hx = S.px + Math.cos(heliAngle) * 18;
        const hz = S.pz + Math.sin(heliAngle) * 18;
        heli.position.set(hx, heliAlt, hz);
        heli.rotation.y = Math.atan2(S.px - hx, S.pz - hz);
        // --- beam computed LIVE from the lamp under the nose ---
        const lampWorld = new THREE.Vector3();
        heli.getObjectByName('spotLamp').getWorldPosition(lampWorld);
        const hit = new THREE.Vector3(S.px, 0, S.pz);
        const beamLen = lampWorld.distanceTo(hit);
        const mid = lampWorld.clone().add(hit).multiplyScalar(0.5);
        heliBeam.position.copy(mid);
        heliBeam.scale.set(1, beamLen, 1);
        heliBeam.lookAt(hit);
        heliBeam.rotateX(Math.PI / 2);
        heliPool.position.set(hit.x, 0.08, hit.z);
        const poolScale = 1 + Math.sin(now * 3) * 0.08;
        heliPool.scale.set(poolScale, poolScale, 1);
        heliSpot.position.copy(lampWorld);
        heliSpot.target.position.copy(hit);
        // rotor spin
        const rotor = heli.children.find((c) => c.geometry && c.geometry.type === 'BoxGeometry' && c.position.y === 1.1);
        if (rotor) rotor.rotation.y += dt * 18;
      }
    }
    // siren blips
    sirenTimer -= dt;
    if (S.wanted > 0 && sirenTimer <= 0) {
      sirenTimer = 1.4;
      audio.siren();
    }
    // lookout reveals patrols
    if (now < S.lookoutUntil) S.seen = true;
  }

  function tryHit(px, pz, heading, weapon) {
    const range = weapon.range;
    let best = null;
    let bestD = range;
    for (const o of officers) {
      const dx = o.x - px;
      const dz = o.z - pz;
      const d = Math.hypot(dx, dz);
      if (d > range) continue;
      const ang = Math.atan2(dx, dz);
      let dh = ang - heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      if (Math.abs(dh) < 0.35 && d < bestD) { bestD = d; best = o; }
    }
    if (best) {
      best.hp -= weapon.dmg;
      if (best.hp <= 0) {
        best.mesh.visible = false;
        const i = officers.indexOf(best);
        if (i >= 0) officers.splice(i, 1);
        S.wanted = Math.min(5, S.wanted + 1);
        S.seen = true;
      }
      return true;
    }
    // hitting a cruiser engine also counts
    for (const c of cruisers) {
      const dx = c.x - px;
      const dz = c.z - pz;
      const d = Math.hypot(dx, dz);
      if (d > range) continue;
      const ang = Math.atan2(dx, dz);
      let dh = ang - heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      if (Math.abs(dh) < 0.3) return true;
    }
    return false;
  }

  function setHeliAlt(a) { heliAlt = a; }

  return {
    cruisers,
    officers,
    roadblocks,
    update,
    tryHit,
    setHeliAlt,
    policeCount() { return cruisers.length + officers.length + (heli && S.wanted >= 3 ? 1 : 0); },
  };
}
