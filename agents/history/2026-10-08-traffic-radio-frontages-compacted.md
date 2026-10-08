# Traffic, cabin view, NPC variety and continuous tile frontages

## Requirements and state
- Preserve existing moving rickshaws while adding cars; use supplied female NPCs,
  vary clothing, support arrows, play supplied music in vehicles, and use a close
  camera behind the driver. Follow-up: close building gaps using the tile map.
- Local implementation only. No commit, Git push or Netlify release authorized
  by this request. Production remains `6ac7fe885233c2906a520e84`.
- Git HEAD remains `9c4d1d9`; previous tasks' changes remain uncommitted. Preserve
  unrelated `vendor/brown plaid shirt 3d model.glb`. Use per-command
  `git -c safe.directory=I:/Projects/gta-india`.

## Implementation
- Traffic: 24 rickshaws + 12 cars desktop, 12 + 6 on touch. Blue/red/white cars
  instance the prepared parked assets and share materials, wheel/door partitions
  and NPC drivers. Parts are prepared once before traffic is cloned. Fleet records
  include moving cars for takeovers. Shape-aware SAT queues and street checks use
  each vehicle's real footprint; ground offsets survive cloning.
- Added supplied `npc/female+character+3d+model.glb` and
  `npc/female lehenga+choli+3d+model.glb`: authored bind transforms were already
  valid; no old bind repair was applied. Blender reduces them to 23,999 / 24,000
  triangles with 2K maps, preserving skins. Retargeted idle/walk packs each match
  all 65 bones. `prepare-female-npcs.py`, embed script and provenance regenerate
  runtime copies without modifying originals.
- Six crowd models, unchanged 180 / 96 pedestrians. 24 walk + 12 idle + 24
  interaction palettes (60 total). Only visible walk/idle/talk palettes update.
  `npc-clothing.js` supplies eight per-instance clothing multipliers with bone/
  sampled skin masks. Geometry/textures remain shared. Added females use female
  Hindi reactions too.
- Cabin camera defaults behind the seated player; C or touch View switches chase.
  Portrait uses fixed horizontal FOV. `vehicle-cabin.js` lazily creates interior
  visibility copies of entered vehicle scan meshes and supplements car trim.
  Full exterior returns on leaving/switching view. Skinned characters are
  excluded: no cabin player clones. Scan glass/frame boundaries remain approximate.
- Existing arrow mappings were verified on foot and forward/reverse in five
  vehicle records. Canvas gets keyboard focus on entry. View button explicitly
  uses pointer-events:auto because interface parent disables pointer events.
- `vehicle-radio.js` embeds supplied `music/Aaja Re.mp3` (197.96 s), loops/resumes
  in vehicles, fades/pause on foot, observes global mute and tab visibility.
  Speaker EQ 95 Hz high-pass / 4.8 kHz low-pass, mild compression, gain .38.
  Ambient mix .13 inside / .32 outside, coordinated with Hindi speech ducking.
- Tile gaps: seed street previously caused two entire 80m edge skips despite
  only occupying part of them. Tile generator now subtracts seed facade intervals
  from frontage 5.2..74.8m and fills remaining spans with adjoining facades.
  Fixed end shop participates in seed intervals. Permanent structural backing
  stays at all LODs, set well behind scans to avoid covering shopfronts. Narrow
  seed seams use overlapping party masses rather than tiny facade models.
  Foundations still cover the whole tile. Intersections retain road openings.

## Verification
- `verify-traffic-radio.cjs`: desktop/touch pass, model/geometry/palette counts,
  eight colours, arrow walk/forward/reverse, five vehicle records, C/touch View,
  no player visibility copies, radio entry/mute/exit/resume, zero page/shader errors.
  Desktop mixed traffic simulation 2,400 x .05s: no overlaps/off-road agents,
  about 9.3 km summed travel and 20 vehicles moving at end. Approximately 39 fps
  desktop / 57 touch measured on this workstation, not device guarantees.
- `verify-building-frontages.cjs`: 180 edges over five positive/negative streaming
  locations, zero uncovered frontage, 9 active tiles, permanent backing enabled.
  Visuals reviewed for seed ends, procedural street and intersection.
- `verify-social-interactions.cjs`: occupied rickshaw/car extraction, entry/exit,
  door animation, car motion/braking, one player body, social groups and actual
  walking bump/Hindi speech pass with no browser errors.
- `verify-published.cjs` against local `dist/index.html`: offline package/startup,
  sound-before-fade, pause/tour/walk, smooth traffic, cinematic targets, correct
  supplied locomotion clips, zero HTTP/page/boot/shader errors. This was a local
  package check, not a production publication.
- `npm run build`: 53 runtime files / 268.7 MiB. Source GLBs/music/QA excluded;
  offline wrappers, female clips, cabin/clothing/radio modules included.
- Artifacts: `traffic-radio-validation.json`, `frontage-validation.json`,
  `social-interactions-validation.json`, `publication-validation.json` and cabin/
  frontage/female screenshots under `artifacts/` (not publication files).

## Resume
- Preview `http://127.0.0.1:8096/india.html?update=traffic-radio-frontages-20261008`.
  Run GPU tests sequentially. The dev server already runs on 8096.
- User may next request deployment. Rebuild and use established explicit Netlify
  site `04838829-b67d-498d-9129-1c5727534e95`; known first-upload 422 can be
  retried with identical site/files. No production change was performed here.
