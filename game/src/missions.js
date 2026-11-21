// SOLARA — missions.js
// 8 jobs, TYPE-BASED completion: goto (on foot), driveTo (in a car),
// hold (stand 5s), carjack (in a car at mark), escape (wanted==0),
// finale (hold 5s then drive to Marina). Beacon ring + vertical beam
// at the current target; big yellow start cylinder; pink safehouse.

import * as THREE from 'three';

export const MISSIONS = [
  { name: 'First Fix', giver: 'LUPE', type: 'goto', target: [-40, -192], time: 180, reward: 400, brief: "Meet Lupe at MO'S on Neon Row. She has your first job." },
  { name: 'Tow Job', giver: 'SULLY', type: 'driveTo', target: [192, 192], time: 240, reward: 650, brief: 'Sully needs a car moved to Dockside. Grab wheels and drive it there.' },
  { name: "Marco's Run", giver: 'MARCO', type: 'driveTo', target: [-192, 192], time: 210, reward: 800, brief: "Marco's package goes to Old Port. Drive it there, no scratches." },
  { name: 'The Ledger', giver: 'BRANDT', type: 'hold', target: [64, 64], time: 240, reward: 1100, brief: "Brandt's ledger is in the Downtown office. Hold the spot 5s to lift it." },
  { name: "Aurora's Light", giver: 'AURORA', type: 'goto', target: [-262, -40], time: 200, reward: 900, brief: 'Aurora waits on the beach boardwalk. Walk the sand, hear her out.' },
  { name: 'Hot Wheels', giver: 'LUPE', type: 'carjack', target: [0, -128], time: 180, reward: 1000, brief: 'Lupe wants a fresh ride. Jack any car on Neon Row and bring it to the mark.' },
  { name: 'Heat Wave', giver: 'SULLY', type: 'escape', target: [256, -192], time: 300, reward: 1400, brief: "The heat is on. Lose the cops, then reach Sully's hideout in Palm Heights." },
  { name: 'The Solara Job', giver: 'BRANDT', type: 'finale', target: [-128, 0], time: 360, reward: 5000, brief: 'The big one. Hold the bank door 5s, then drive the getaway to the Marina.' },
];

const DIALOGUE = {
  LUPE: ["Kai, you made it. First job's easy — just show up.", "Nice wheels, by the way. Lupe approves.", "One more thing — don't scratch the paint."],
  SULLY: ['Tow it, park it, get paid. Simple.', 'You drive like my grandma. Faster!', 'Good. Sully remembers who delivers.'],
  MARCO: ['Package. Old Port. No questions.', 'You ask too many questions, Kai.', 'Delivered clean. Marco owes you one.'],
  BRANDT: ['The ledger. Get it and get out.', 'Downtown office. Five seconds. Go.', 'Clean work. The Solara Job is next.'],
  AURORA: ['The beach at dusk… you came.', 'Listen to the waves. Then listen to me.', 'Thank you, Kai. The light is yours.'],
};

export function createMissions(scene, S, audio) {
  // start marker: big yellow cylinder at current mission start (-40,-192)
  const startMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.55 });
  const startMarker = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 6, 20), startMat);
  startMarker.position.set(-40, 3, -192);
  scene.add(startMarker);
  // safehouse pink cylinder at MO'S (-40,-192)
  const safeMat = new THREE.MeshBasicMaterial({ color: 0xff80ab, transparent: true, opacity: 0.4 });
  const safehouse = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 7, 20), safeMat);
  safehouse.position.set(-40, 3.5, -192);
  scene.add(safehouse);
  // beacon: pulsing yellow ring + vertical beam at current target
  const beaconRing = new THREE.Mesh(
    new THREE.TorusGeometry(4, 0.35, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffea00 })
  );
  beaconRing.rotation.x = Math.PI / 2;
  scene.add(beaconRing);
  const beaconBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
  );
  scene.add(beaconBeam);
  beaconRing.visible = false;
  beaconBeam.visible = false;

  let dialogueLine = '';
  let dialogueSpeaker = '';

  function current() { return MISSIONS[S.missionIdx]; }

  function startMission() {
    const m = current();
    if (!m) return;
    S.missionActive = true;
    S.missionTime = m.time;
    S.missionStage = 0;
    S.missionHold = 0;
    S.message = m.name.toUpperCase() + ' — ' + m.brief;
    S.messageUntil = S.time + 5;
    showDialogue(m.giver, DIALOGUE[m.giver] ? DIALOGUE[m.giver][0] : m.brief);
    audio.beep();
  }

  function showDialogue(speaker, line) {
    dialogueSpeaker = speaker;
    dialogueLine = line;
    S.dialogueUntil = S.time + 6;
  }

  function completeMission() {
    const m = current();
    S.cash += m.reward;
    S.jobsDone++;
    S.rank = S.jobsDone >= 8 ? 'FIXER' : S.jobsDone >= 5 ? 'HUSTLER' : S.jobsDone >= 2 ? 'RUNNER' : 'ROOKIE';
    S.missionActive = false;
    S.missionStage = 0;
    S.missionHold = 0;
    S.message = 'JOB DONE +$' + m.reward;
    S.messageUntil = S.time + 4;
    audio.cash();
    if (S.jobsDone >= 8) {
      S.message = 'ALL 8 JOBS DONE — YOU ARE THE FIXER OF SOLARA';
      S.messageUntil = S.time + 8;
    }
    S.missionIdx = Math.min(S.missionIdx + 1, MISSIONS.length - 1);
    if (S.jobsDone >= MISSIONS.length) S.missionIdx = MISSIONS.length - 1;
  }

  function failMission() {
    S.missionActive = false;
    S.missionStage = 0;
    S.missionHold = 0;
    S.message = 'JOB FAILED — time ran out';
    S.messageUntil = S.time + 4;
    audio.fail();
  }

  function distTo(x, z) {
    const dx = S.px - x;
    const dz = S.pz - z;
    return Math.hypot(dx, dz);
  }

  function update(dt) {
    const m = current();
    if (!m) return;
    // beacon at current target (finale stage 1 = Marina)
    const target = m.type === 'finale' && S.missionStage === 1 ? [-192, -192] : m.target;
    beaconRing.visible = S.missionActive;
    beaconBeam.visible = S.missionActive;
    if (S.missionActive) {
      const pulse = 1 + Math.sin(S.time * 4) * 0.12;
      beaconRing.scale.set(pulse, pulse, 1);
      beaconRing.position.set(target[0], 0.3, target[1]);
      beaconBeam.position.set(target[0], 30, target[1]);
    }
    startMarker.visible = !S.missionActive;
    const nearStart = distTo(-40, -192) < 6;
    if (!S.missionActive && nearStart && S.jobsDone < MISSIONS.length) {
      S.message = 'Press E to start: ' + m.name + ' ($' + m.reward + ')';
      S.messageUntil = S.time + 0.2;
    }
    if (!S.missionActive) return;
    S.missionTime -= dt;
    if (S.missionTime <= 0) {
      failMission();
      return;
    }
    const d = distTo(target[0], target[1]);
    if (m.type === 'goto') {
      if (d < 7 && !S.inCar) completeMission();
    } else if (m.type === 'driveTo') {
      if (d < 7 && S.inCar) completeMission();
    } else if (m.type === 'hold') {
      if (d < 7) {
        S.missionHold += dt;
        if (S.missionHold >= 5) completeMission();
      } else {
        S.missionHold = 0;
      }
    } else if (m.type === 'carjack') {
      if (d < 9 && S.inCar) completeMission();
    } else if (m.type === 'escape') {
      if (d < 7 && S.wanted === 0) completeMission();
    } else if (m.type === 'finale') {
      if (S.missionStage === 0) {
        if (d < 7) {
          S.missionHold += dt;
          if (S.missionHold >= 5) {
            S.missionStage = 1;
            S.missionHold = 0;
            S.message = 'GO! Drive the getaway to the Marina!';
            S.messageUntil = S.time + 4;
          }
        } else {
          S.missionHold = 0;
        }
      } else if (d < 7 && S.inCar) {
        completeMission();
      }
    }
    // two-way dialogue: Kai replies after the giver speaks
    if (S.dialogueUntil > 0 && S.time > S.dialogueUntil - 3 && dialogueSpeaker) {
      // reply shown via HUD dialogue box (speaker KAI)
    }
  }

  return {
    missions: MISSIONS,
    current,
    startMission,
    completeMission,
    failMission,
    update,
    showDialogue,
    getDialogue() {
      if (S.time > S.dialogueUntil) return null;
      return { speaker: dialogueSpeaker, line: dialogueLine };
    },
    distToTarget() {
      const m = current();
      if (!m) return 0;
      const target = m.type === 'finale' && S.missionStage === 1 ? [-192, -192] : m.target;
      return distTo(target[0], target[1]);
    },
  };
}
