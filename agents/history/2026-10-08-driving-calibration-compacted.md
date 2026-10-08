# Vehicle alignment, recovery and fourth NPC

## Context and fixes
- Continues uncommitted NPC-interactions worktree after production deploy
  6ac7dcf7. User reported cushion clipping, sideways entry, stuck contacts,
  excessive collision clearance, loud reactions, reversed houses/vehicles and
  requested the model in npc/. Preserve all previous interaction changes.
- Pelvis is now solved to a per-vehicle `driver.hip` cushion anchor rather than
  placing a standing root at the seat. Cached visual offset blends during entry.
  Red/white seating was lowered/backed up after roof/windscreen clipping appeared
  in frame review; car legs reach forward toward pedals. Main player stays single.
- Extraction stopped after the victim is released. Previously its target-facing
  code overwrote entry heading through the final frame, leaving player sideways.
- White hatchback and bus scanned fronts were -Z. Loader bakes a rotation only
  for those two. Blue/red already face +Z. Door/wheel/seat coordinates use the
  normalized frame. Original vehicle source files remain unchanged.
- Collision footprints use 92% car width / 94% length, 2.5 cm SAT margin and
  17 cm foot clearance. Rickshaw footprint is tightened too. Penetration measures
  include other vehicles, road boundaries and props. Movement can reduce an
  existing penetration, allowing reverse recovery while refusing deeper overlap.
- Hindi voice gain reduced from .85 to .28 nearby (.04 minimum).
- `buildings.place` uses explicit street-facing vectors for seed/streamed facades.
  Near scan LOD hides its distant masonry proxy so it cannot cover the facade.
- Added `npc/npc male brown.glb`: original 92,518 triangles, separate repaired
  and decimated runtime copy 24,000 triangles, 2K maps, preserved skin weights.
  Retargeted Mixamo idle/walk included in offline bundles. Shared per-type pools
  expand to 24 locomotion + 16 interaction skeletons, fixed 180/96 pedestrians;
  desktop variant counts 46/44/45/45. Source model is untouched.

## Verification
- `review-vehicle-frames.cjs` captures seven points from approach through seated
  state for primary rickshaw and all four cars/bus, including skeletal landmarks.
  Screenshots identified and resolved sideways turning and red/white clipping.
- `verify-driving-fixes.cjs` passed all four forward driving/braking checks,
  pelvis anchor errors below 0.035 m, 272 street-facing scans, fixed palette and
  pedestrian budgets. Impact stops forward travel. Injected 7 cm overlap clears
  under actual reverse input (more than 2 m travel), zero resulting penetration.
- 120-second crowd/traffic checks pass with 93 moving pedestrians, 0.64 m minimum
  separation, no off-pavement pedestrians, zero vehicle overlaps/off-road actors.
  Walk/run, audio-before-fade, pause and 96-pedestrian/12-vehicle touch boot pass.
- Occupied rickshaw/car entry, actual driving/exit and bump speech checks pass;
  measured reaction gain .249 versus old .85. No browser errors.
- New runtime build contains 40 files / 228.3 MiB; sources/credentials/artifacts
  stay excluded. 24-position map streaming passed: 9 tiles, bounded mesh counts
  (1827–1859), zero pavement ray misses/blocked static road samples, no errors.
  Packaged offline smoke passed, including audio, pause/overview/walking and
  smooth traffic; about 58 fps measured on this workstation.

## Boundaries and resume
- Existing main HEAD 9c4d1d9; all implementation remains in working tree. Never
  include unrelated `vendor/brown plaid shirt 3d model.glb` in publication.
- Fused car scans still have imperfect movable door seams and opaque windows.
  Custom rig transitions are not vehicle-entry mocap or GTA animation parity.
- Production details and per-command Git safe.directory are in prior handoffs.
- Production updated to deploy `6ac7ec1ccffbaae8047723d2` at the existing Netlify
  site. Upload completed first attempt. Remote seating/vehicle/interaction/speech,
  building and brown NPC scripts match local dist bytes. Live smoke passes:
  180 pedestrians, 4 NPC sources/palettes, 24 moving rickshaws, 9 streamed tiles,
  sound and controls, zero HTTP/browser/boot/shader errors; about 58 fps here.
