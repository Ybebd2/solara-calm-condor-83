// SOLARA — shots.js
// Staged screenshot cameras (?shot=1..4). Each shot STAGES the scene —
// it does not just move the camera. S.shotMode = true so police never
// ram the player out of frame.

export function applyShot(n, S, player, vehicles, police, missions) {
  const q = parseInt(n, 10);
  if (!q || q < 1 || q > 4) return null;
  S.shotMode = true;
  S.started = true;
  let camPos;
  let camLook;
  if (q === 1) {
    // start menu: keep menu visible, camera over downtown looking east
    // at street + gold/teal skyscrapers
    camPos = [-236, 9, 84];
    camLook = [-40, 26, -20];
    S.px = -40;
    S.pz = 60;
    S.heading = Math.PI * 0.75;
  } else if (q === 2) {
    // packed street: Kai in a dedicated red sports car, driving
    // east on road z=64; 8 traffic cars tight ahead in both lanes
    // (bumper-to-bumper 6m spacing); wanted 1
    const playerCar = vehicles.spawnPlayerCar(0xd32f2f);
    vehicles.placeCarAt(playerCar, -40, 64, Math.PI / 2);
    S.inCar = true;
    S.car = playerCar;
    S.carSpeed = 12;
    S.px = -40;
    S.pz = 64;
    S.heading = Math.PI / 2;
    for (let i = 0; i < 8 && i < vehicles.traffic.length; i++) {
      const c = vehicles.traffic[i];
      const lane = i % 2 === 0 ? 5 : -5;
      vehicles.placeCarAt(c, -30 + i * 6, 64 + lane, Math.PI / 2);
    }
    S.wanted = 1;
    camPos = [-64, 6, 78];
    camLook = [-20, 2, 64];
  } else if (q === 3) {
    // Kai on foot at mission start; mission 0 started; Lupe dialogue;
    // wanted 2
    S.inCar = false;
    S.car = null;
    S.px = -40;
    S.pz = -184;
    S.heading = Math.PI;
    S.missionIdx = 0;
    S.missionActive = true;
    S.missionTime = 180;
    S.missionStage = 0;
    S.wanted = 2;
    missions.showDialogue('LUPE', "Kai, you made it. First job's easy — just show up.");
    camPos = [-46, 1.7, -184];
    camLook = [-39, 1.25, -184];
  } else {
    // neon chase: mission 5 started; heli up; wanted 3
    S.inCar = false;
    S.car = null;
    S.px = -8;
    S.pz = -186;
    S.heading = Math.PI;
    S.missionIdx = 5;
    S.missionActive = true;
    S.missionTime = 180;
    S.missionStage = 0;
    S.wanted = 3;
    police.setHeliAlt(26);
    camPos = [36, 10, -220];
    camLook = [-12, 10, -176];
  }
  return { camPos, camLook };
}
