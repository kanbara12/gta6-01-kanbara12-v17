# SUNCOAST: HEATLINE

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kanbara12/gta6-01-kanbara12-v17/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kanbara12/gta6-01-kanbara12-v17/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built with Three.js.
Drive the HEATLINE GT along a beachfront sunset, run cargo for the fixer Rae,
sweep enemy yards on foot, and outrun a 3-star heat while the police heli
SKY-1 watches from above. No Rockstar names, characters, map or assets —
Suncoast City, its people and its story are all original.

## Play

Serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and play in a desktop browser. No network request is
made while playing: Three.js is vendored minified under `game/vendor/`, and
every sound is synthesized live with WebAudio.

- **W A S D** — drive / walk (Shift: boost, Space: brake / shoot on foot)
- **F** — enter / exit the car · **H** — hide the HUD · **C** — camera
- **E** — pick up / deliver cargo at the glowing marker
- **Mouse click** — fire the pistol on foot

## Story — 8 jobs, $22,450

| Job | Fixer | Run | Payout |
| --- | --- | --- | --- |
| 1 | Rae | Pier pickup → garage drop | $2,500 |
| 2 | Rae | Beachfront courier | $2,500 |
| 3 | Sable | Downtown crates | $3,300 |
| 4 | Marlo | Yard sweep, on foot | $3,650 |
| 5 | Rae | Ocean Ave getaway, 3-star heat | $2,400 |
| 6 | Sable | Marina run | $2,300 |
| 7 | Marlo | Rooftop handoff | $2,300 |
| 8 | Rae | The Heatline — final run | $2,250 |

Starting cash is $1,250. Each completed job raises REP by 1 and may raise the
wanted level; police cruisers pursue with collision avoidance, and the SKY-1
heli tracks you with its spotlight. Drifting pays $50 a chain.

## Technical source outline

- `game/index.html` — page, HUD DOM, import map (`three` → vendored minified build)
- `game/src/main.js` — renderer, game loop, input, cameras, shot/autotest modes
- `game/src/city.js` — Suncoast City: ocean, beach, Ocean Ave, buildings, palms, ferris wheel, sun
- `game/src/vehicles.js` — HEATLINE GT, traffic, police cruisers, SKY-1 heli + spotlight
- `game/src/people.js` — pedestrians, Rae / Sable / Marlo, on-foot player, enemies + health bars
- `game/src/missions.js` — 8-job state machine, payouts, wanted level, drift scoring
- `game/src/hud.js` — HUD, minimap, police panel, banners, start screen
- `game/src/audio.js` — original synthesized WebAudio: engine, siren, gunshot, chimes
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|chase|mission|dusk`)
- `game/vendor/three.module.min.js` — Three.js r160, minified official build
- `main.ts` — entry program: copies `game/` + `screenshots/`, writes `dossier.json`

## Screenshots

Real renders of the game's own code, taken headless at 1280×720:

1. `1-start.jpg` — Job 1/8, wide high shot: ferris wheel, ocean, sun, palms
2. `2-play.jpg` — Job 2/8, low rear 3/4 at 141 km/h, SKY-1 heli + spotlight, Rae
3. `3-chase.jpg` — Job 5/8, Ocean Ave at dusk, wanted 3, DRIFT x3 +$150, Sable, police panel
4. `4-mission.jpg` — Job 4/8, on foot, pistol muzzle flash, 3 enemies, Marlo, TARGETS 2/3

## License

MIT — see `LICENSE`.
