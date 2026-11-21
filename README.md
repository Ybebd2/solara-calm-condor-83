# SOLARA — Vice City of the Sun

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/Ybebd2/solara-calm-condor-83/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/Ybebd2/solara-calm-condor-83/reward.svg)](https://make.fun/bounty/gta6-01)

A GTA-style open-world game built for the **gta6-01** bounty on [make.fun](https://make.fun/bounty/gta6-01): 8 jobs across 7 districts, a full wanted system with police cruisers, officers and a searchlight helicopter, crew abilities, radio stations, 20 Golden Geckos to collect, and a bright Vice-City-inspired sunlit city.

Referral: [https://make.fun/r/mpd7ezsn](https://make.fun/r/mpd7ezsn)

## Play

```sh
npx tsx serve.ts
# open http://localhost:4173
```

- **WASD** move · **mouse drag** orbit camera · **Shift** sprint · **Space** jump
- **E** start mission · **F** enter/exit car · **R** reload · **1–5** weapons
- **Q** radio · **M** map · **F9** autopilot · **Z/X/C** crew · **Esc** pause

## The 8 jobs

1. **First Fix** (Lupe) — meet Lupe at MO'S on Neon Row.
2. **Tow Job** (Sully) — drive a car to Dockside.
3. **Marco's Run** — deliver the package to Old Port.
4. **The Ledger** (Brandt) — hold the Downtown office 5s.
5. **Aurora's Light** — walk the beach boardwalk to Aurora.
6. **Hot Wheels** (Lupe) — jack a fresh ride on Neon Row.
7. **Heat Wave** (Sully) — lose the cops, reach Palm Heights.
8. **The Solara Job** (Brandt) — hold the bank door 5s, then drive the getaway to the Marina.

## Tech

Three.js r187 vendored locally, ES modules, no build step. `main.ts` copies `game/` + `screenshots/` into `/output` and writes `dossier.json` with the make.fun dossier library.
