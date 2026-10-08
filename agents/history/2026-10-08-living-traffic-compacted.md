# Faster movement, dense crowd and moving traffic

## Purpose and implementation
- User requested faster walking/running, sound before the opening fade, more
  pedestrians, moving rickshaw traffic and a GTA-style HUD without the bottom bar.
- Player speeds are 2.6 m/s walking and 5.4 m/s sprinting. Mixamo walk/run blend
  thresholds match the new speeds; cadence remains driven by actual movement.
- Crowd budget is 180 desktop / 96 touch, still using 18 shared motion palettes
  and three shared model/texture sources. Walk speed is 1.20–1.42 m/s.
- Audio prepares during loading. Enter Old Quarter awaits playback before
  starting the fade and simulation; desktop and touch need that entry gesture.
- `traffic.js` reuses rickshaw meshes/materials, with 24 desktop / 12 touch
  actors and one shared seated-driver skeleton. Three nearby block loops follow
  map position without growing the pool. Fixed 20 Hz decisions use left-hand
  lanes, queue braking, collision footprints, junction reservations and checks
  that the intersection exit is clear. Narrow seed street has one moving lane.
  Vehicle render poses interpolate between steps for smooth movement.
- `game-hud.js` adds a circular radar, nearby vehicle prompt and Escape/Menu pause
  panel. Settings are retained in the pause menu; touch has sprint/jump/vehicle
  controls. World motion pauses; ambience continues.

## Verification and resolved issues
- `verify-living-street.cjs`: audio playing event occurs while scene is covered,
  followed by fade; 120 simulated seconds produce no rickshaw overlaps or
  off-road actors, with 16 moving and 7.3 km aggregate travel. NPC separation
  remains above 1.45 m and all stay on pavement. Walk/run states and 2.6/5.4 m/s
  speeds, pause/resume and 96 NPC / 12 vehicle touch startup passed.
- Fixed task-introduced traffic deadlock by releasing junctions after clearance
  and refusing entry when the outlet is occupied. Primary parked vehicle can
  still create a local queue; other streets continue flowing.
- Fixed a task-introduced mobile startup failure from a stale removed `.hint`
  lookup. Touch startup and audio now pass.
- Static tile continuity checks ignore moving traffic as an intentional road
  obstruction. Travel across 24 map positions keeps 9 tiles and 24 traffic
  actors, bounded mesh counts, deterministic layouts and covered pavements.
- Keyboard driving crossed z=150 into tile 1,2; offline file startup plays
  looped audio with 180 NPCs; touch boot has 96 NPCs and no errors.
- `npm run build` packages 33 runtime files. Offline packaged smoke test passes
  with 180 NPCs, 24 rickshaws, sound and no HTTP/shader/boot errors; about 56 fps
  measured on this development workstation. Cold WebGL tests launched together
  timed out; sequential rerun passed. Run GPU browser checks sequentially here.

## Publication and resume
- Continue using existing GitHub `fahimc/gta-india` main and Netlify project
  `gta-india-fahimc` (04838829-b67d-498d-9129-1c5727534e95), URL
  https://gta-india-fahimc.netlify.app. Manual CLI deploy remains in use.
- On this volume use per-command Git safe.directory=I:/Projects/gta-india.
- Load the publication handoff for LFS/build details. Before the next release,
  check worktree/remote state, build, run the living-street and streaming checks
  sequentially, deploy and run `verify-published.cjs <production-url>`.
- Gameplay commit `84e8cfd` was pushed to main and published as Netlify deploy
  `6ac73ae08fa886bb14bfc9a8`. Initial CLI attempt returned 422; retry against the
  explicit existing site ID completed successfully, without changing site setup.
- Public smoke check passed: 9 tiles, 180 NPCs, 24 moving rickshaws, playing
  looped sound, working pause/overview/walk transitions, smooth interpolated
  vehicle motion and zero HTTP/shader/boot errors. About 57 fps measured here.
  Production street/traffic/HUD/audio script hashes match the local dist build.
- The release confirmation is a documentation-only follow-up to the gameplay
  commit; it does not change the deployed runtime.
