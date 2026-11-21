// SOLARA — config.js
// World constants, weapons, ranks, radio, crew, missions and the shared
// state S. Written fresh from the R5-mirror spec.

export const WORLD = {
  size: 640,
  half: 320,
  roadGap: 64,
  roadWidth: 20,
  beachX: -268,
  oceanX: -300,
  blockSize: 50,
};

export const DISTRICTS = [
  { name: 'MARINA BAY', x: -210, z: -210, r: 90, color: 0x4fc3f7, grip: 55 },
  { name: 'OLD PORT', x: -210, z: 210, r: 90, color: 0xffb74d, grip: 45 },
  { name: 'DOWNTOWN', x: 0, z: 0, r: 110, color: 0xff5252, grip: 30 },
  { name: 'NEON ROW', x: 0, z: -190, r: 80, color: 0xe040fb, grip: 35 },
  { name: 'PALM HEIGHTS', x: 190, z: -190, r: 90, color: 0x69f0ae, grip: 50 },
  { name: 'DOCKSIDE', x: 190, z: 190, r: 90, color: 0xffd54f, grip: 40 },
  { name: 'SOLARA BEACH', x: -280, z: 0, r: 90, color: 0xfff176, grip: 50 },
];

export const WEAPONS = [
  { name: 'VESPER', kind: 'pistol', mag: 12, dmg: 34, rate: 0.16, range: 90, auto: false },
  { name: 'JACKAL', kind: 'smg', mag: 30, dmg: 16, rate: 0.09, range: 70, auto: true },
  { name: 'LONGSHOT', kind: 'rifle', mag: 8, dmg: 80, rate: 0.7, range: 160, auto: false },
  { name: 'RIOT', kind: 'shotgun', mag: 6, dmg: 22, rate: 0.8, range: 40, auto: false },
  { name: 'FISTS', kind: 'melee', mag: Infinity, dmg: 12, rate: 0.35, range: 3, auto: true },
];

export const RANKS = ['ROOKIE', 'RUNNER', 'HUSTLER', 'FIXER'];

export function rankFor(jobs) {
  if (jobs >= 8) return 'FIXER';
  if (jobs >= 5) return 'HUSTLER';
  if (jobs >= 2) return 'RUNNER';
  return 'ROOKIE';
}

export const RADIO = [
  { name: 'PUERTO 88.3', desc: 'latin gold' },
  { name: 'CELESTE 98.1', desc: 'synthwave' },
  { name: 'SOLARA 98.3', desc: 'daytime' },
  { name: 'NEON 101.5', desc: 'night drive' },
];

export const CREW = {
  MARA: { key: 'KeyZ', label: 'GHOST', desc: '-1 wanted star', cd: 90 },
  SULLY: { key: 'KeyX', label: 'PIT CREW', desc: 'full repair in car', cd: 60 },
  KIKI: { key: 'KeyC', label: 'LOOKOUT', desc: 'patrols revealed 20s', cd: 60 },
};

export const MISSIONS = [
  { name: 'First Fix', giver: 'LUPE', type: 'goto', target: [-40, -192], time: 180, reward: 400,
    brief: "Meet Lupe at MO'S on Neon Row. She has your first job." },
  { name: 'Tow Job', giver: 'SULLY', type: 'driveTo', target: [192, 192], time: 240, reward: 650,
    brief: 'Sully needs a car moved to Dockside. Grab wheels and drive it there.' },
  { name: "Marco's Run", giver: 'MARCO', type: 'driveTo', target: [-192, 192], time: 210, reward: 800,
    brief: "Marco's package goes to Old Port. Drive it there, no scratches." },
  { name: 'The Ledger', giver: 'BRANDT', type: 'hold', target: [64, 64], time: 240, reward: 1100,
    brief: "Brandt's ledger is in the Downtown office. Hold the spot 5s to lift it." },
  { name: "Aurora's Light", giver: 'AURORA', type: 'goto', target: [-262, -40], time: 200, reward: 900,
    brief: 'Aurora waits on the beach boardwalk. Walk the sand, hear her out.' },
  { name: 'Hot Wheels', giver: 'LUPE', type: 'carjack', target: [0, -128], time: 180, reward: 1000,
    brief: 'Lupe wants a fresh ride. Jack any car on Neon Row and bring it to the mark.' },
  { name: 'Heat Wave', giver: 'SULLY', type: 'escape', target: [256, -192], time: 300, reward: 1400,
    brief: "The heat is on. Lose the cops, then reach Sully's hideout in Palm Heights." },
  { name: 'The Solara Job', giver: 'BRANDT', type: 'finale', target: [-128, 0], time: 360, reward: 5000,
    brief: 'The big one. Hold the bank door 5s, then drive the getaway to the Marina.',
    stage1Target: [-192, -192] },
];

export function createState() {
  return {
    time: 0,
    paused: false,
    mapOpen: false,
    started: false,
    px: -40,
    pz: 60,
    heading: Math.PI * 0.75,
    speed: 0,
    health: 100,
    armour: 40,
    cash: 250,
    wanted: 0,
    evading: 0,
    seen: false,
    soundOn: true,
    dialogueUntil: 0,
    autopilot: false,
    jackedAt: -99,
    gripBonus: 0,
    shotMode: false,
    weaponIdx: 0,
    ammo: 12,
    reserve: 48,
    inCar: false,
    car: null,
    carSpeed: 0,
    missionIdx: 0,
    missionActive: false,
    missionTime: 0,
    missionStage: 0,
    missionHold: 0,
    jobsDone: 0,
    rank: 'ROOKIE',
    crewCd: { MARA: 0, SULLY: 0, KIKI: 0 },
    lookoutUntil: 0,
    station: 0,
    radioOn: true,
    waypoint: null,
    shotsFired: 0,
    hits: 0,
    carsJacked: 0,
    arrests: 0,
    message: '',
    messageUntil: 0,
    over: false,
    geckosGot: 0,
    geckosTotal: 20,
    carHealth: 100,
  };
}

// Deterministic seeded RNG so the city is the same every load.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function districtAt(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = Math.hypot(x - d.x, z - d.z);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best;
}
