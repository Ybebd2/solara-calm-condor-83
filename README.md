# SOLARA — Grand Theft Solara

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/Ybebd2/solara-calm-condor-83/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/Ybebd2/solara-calm-condor-83/reward.svg)](https://make.fun/bounty/gta6-01)

A GTA-style open-world game built for the **gta6-01** bounty on make.fun:
one bright coastal city, 8 story jobs, cops, crew, radio, and 20 Golden
Geckos hidden across the map.

Referral: `mpd7ezsn` — https://make.fun/r/mpd7ezsn

## Play

Open `game/index.html` in a browser (or `node serve.ts` and visit
http://localhost:8123/). Click **NEW GAME**.

- **WASD** move · **mouse drag** orbit camera · **Shift** sprint · **Space** jump
- **E** start mission / interact · **F** enter & exit cars
- **R** reload · **1–5** weapons (VESPER, JACKAL, LONGSHOT, RIOT, FISTS)
- **Q** radio · **M** map · **F9** autopilot · **Z/X/C** crew (MARA ghost, SULLY pit crew, KIKI lookout)
- **Esc** pause

## The city

7 districts — Marina Bay, Old Port, Downtown, Neon Row, Palm Heights,
Dockside, Solara Beach — with a turquoise ocean, sailboats, beach
umbrellas, 64 pedestrians in bright shirts, and a white police helicopter
whose searchlight beam is computed live from its lamp.

## The jobs

1. **First Fix** (Lupe) — meet at MO'S. 2. **Tow Job** (Sully) — drive a car
   to Dockside. 3. **Marco's Run** — package to Old Port. 4. **The Ledger**
   (Brandt) — hold the Downtown office 5s. 5. **Aurora's Light** — walk the
   beach boardwalk. 6. **Hot Wheels** (Lupe) — jack a ride on Neon Row.
7. **Heat Wave** (Sully) — lose the cops, reach Palm Heights. 8. **The
   Solara Job** (Brandt) — hold the bank door 5s, then drive the getaway
   to the Marina. Finish all 8 and you are the Fixer of Solara.

## Tech

Three.js r187 vendored locally, ES modules, no build step, no npm deps.
`main.ts` (Node 22) copies `game/` + `screenshots/` to `/output` and
writes `dossier.json` with the make.fun dossier library.

## License

MIT — see LICENSE.
