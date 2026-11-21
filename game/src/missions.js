// SOLARA — missions.js
// The 8 jobs. Completion is TYPE-BASED: goto (on foot), driveTo (in a
// car), hold (stand 5s), carjack (in a car at the mark), escape (reach
// the target with wanted == 0), finale (hold 5s then drive to the Marina).
// Start marker: big yellow cylinder at the current mission's start point.
// Beacon: pulsing ring + vertical beam at the current target.

import { MISSIONS, rankFor } from './config.js';

export function createMissions(S, W, hud) {
  const M = {
    missions: MISSIONS,
    start: [-40, -192],
    update,
    tryStart,
    current() { return MISSIONS[S.missionIdx]; },
  };

  function currentTarget() {
    const m = MISSIONS[S.missionIdx];
    if (!m) return null;
    if (m.type === 'finale' && S.missionStage === 1) return m.stage1Target;
    return m.target;
  }

  function placeMarkers() {
    const m = MISSIONS[S.missionIdx];
    if (!m) {
      W.startMarker.visible = false;
      W.beacon.visible = false;
      return;
    }
    W.startMarker.visible = !S.missionActive;
    W.startMarker.position.set(M.start[0], 2.5, M.start[1]);
    const t = currentTarget();
    W.beacon.visible = S.missionActive;
    W.beacon.position.set(t[0], 0, t[1]);
  }

  function tryStart(S2) {
    if (S2.missionActive || S2.missionIdx >= MISSIONS.length) return false;
    const d = Math.hypot(S2.px - M.start[0], S2.pz - M.start[1]);
    if (d > 7) return false;
    const m = MISSIONS[S2.missionIdx];
    S2.missionActive = true;
    S2.missionTime = m.time;
    S2.missionStage = 0;
    S2.missionHold = 0;
    hud.showMessage(m.giver + ': ' + m.name + ' — ' + m.brief);
    hud.showDialogue(m.giver, m.brief);
    placeMarkers();
    return true;
  }

  function complete(S2) {
    const m = MISSIONS[S2.missionIdx];
    S2.cash += m.reward;
    S2.jobsDone += 1;
    S2.rank = rankFor(S2.jobsDone);
    S2.missionActive = false;
    S2.missionHold = 0;
    S2.missionStage = 0;
    S2.missionIdx += 1;
    hud.showMessage('JOB DONE  +$' + m.reward + '  —  ' + S2.rank);
    hud.showDialogue('KAI', 'Job done. ' + (S2.jobsDone >= 8 ? 'That was the last one.' : 'What is next?'));
    if (S2.jobsDone >= 8) {
      hud.showMessage('ALL 8 JOBS DONE — YOU ARE THE FIXER OF SOLARA');
      S2.over = true;
    }
    // next mission starts where this one ended
    M.start = [m.target[0], m.target[1]];
    if (m.type === 'finale') M.start = [-192, -192];
    placeMarkers();
  }

  function fail(S2, why) {
    const m = MISSIONS[S2.missionIdx];
    S2.missionActive = false;
    S2.missionHold = 0;
    S2.missionStage = 0;
    hud.showMessage('JOB FAILED: ' + why + ' — ' + m.name + ' (press E to retry)');
    placeMarkers();
  }

  function update(dt, S2) {
    placeMarkers();
    if (!S2.missionActive) return;
    const m = MISSIONS[S2.missionIdx];
    if (!m) return;
    S2.missionTime -= dt;
    if (S2.missionTime <= 0) {
      fail(S2, "time's up");
      return;
    }
    const t = currentTarget();
    const d = Math.hypot(S2.px - t[0], S2.pz - t[1]);
    switch (m.type) {
      case 'goto':
        if (d < 7 && !S2.inCar) complete(S2);
        break;
      case 'driveTo':
        if (d < 9 && S2.inCar) complete(S2);
        break;
      case 'hold':
        if (d < 7) {
          S2.missionHold += dt;
          if (S2.missionHold >= 5) complete(S2);
        } else {
          S2.missionHold = Math.max(0, S2.missionHold - dt * 2);
        }
        break;
      case 'carjack':
        if (d < 12 && S2.inCar) complete(S2);
        break;
      case 'escape':
        if (d < 9 && S2.wanted === 0) complete(S2);
        break;
      case 'finale':
        if (S2.missionStage === 0) {
          if (d < 7) {
            S2.missionHold += dt;
            if (S2.missionHold >= 5) {
              S2.missionStage = 1;
              S2.missionHold = 0;
              hud.showMessage('BANK DOOR OPEN — DRIVE THE GETAWAY TO THE MARINA');
              placeMarkers();
            }
          } else {
            S2.missionHold = Math.max(0, S2.missionHold - dt * 2);
          }
        } else if (d < 9 && S2.inCar) {
          complete(S2);
        }
        break;
      default:
        break;
    }
  }

  placeMarkers();
  return M;
}
