# Supplied player walking and running

## Scope and implementation
- User supplied `assets/animations/Walking (1).fbx` and `Running (1).fbx` to
  replace the player's awkward walk/run. Continue the uncommitted driving and
  NPC work described in `2026-10-08-driving-calibration-compacted.md`.
- Converted both FBX files with Blender 4.2. Both contain 65 animation bones,
  matching the existing Mixamo source rest rig; no source character is loaded.
- Added `--source` and `--clip-name` to `scripts/bake-mixamo.py`, retaining its
  previous defaults. `scripts/replace-player-locomotion.py` bakes each source
  independently, checks bone order/stride/target hash, and replaces only walk
  and run in `assets/animations/mixamo-locomotion.js`. Idle/jump compared exactly
  equal to their prior data. NPC packs remain unchanged.
- Walk is 64 frames / 1.05 s / nominal 1.55945 m/s. Run is 40 frames / 0.65 s /
  nominal 5.42732 m/s. Existing speed-calibrated playback uses these values;
  actual walking remains 2.6 m/s and sprinting 5.4 m/s. Retargeting preserves
  vertical movement and strips horizontal travel.
- Source SHA256 values are in `assets/animations/provenance.json` and each
  runtime clip. Supplied download settings are unconfirmed; baking is 60 fps.
  FBX and converted animation GLB working files remain ignored. README records
  the conversion and replacement commands. Runtime pack is 1,180,004 bytes.

## Verification
- `verify-player-locomotion.cjs` passes against localhost and the packaged
  `file:///.../dist/index.html`: 256 sampled poses over road/curb heights,
  sole errors below 0.002 m, loop seams below 0.001 rad, actual keyboard walk/
  run speeds and states, return to idle, and no browser errors.
- Reviewed side-on walking/running screenshots at different phases and live
  keyboard-driven captures. No inverted arms, sideways heading or foot burial
  observed. `review-mixamo.cjs` now enters the game before capturing poses and
  uses a road camera position that avoids parked-vehicle occlusion.
- `npm run build` passes: 40 runtime files, 228.2 MiB. Packaged animation test
  confirms the replacement source filenames. `git diff --check` passes.

## Publication and resume
- This task updated local source and dist only; no commit, push or deployment.
  Production remains the prior Netlify deploy `6ac7ec1ccffbaae8047723d2`.
- Local review: `http://127.0.0.1:8096/india.html`. GPU browser checks should run
  sequentially. Pose screenshots and validation JSON live under ignored
  `artifacts/`, including a pre-replacement pack for local comparison.
- Git HEAD remains `9c4d1d9`. Use per-command
  `git -c safe.directory=I:/Projects/gta-india`. Preserve the existing worktree
  and unrelated `vendor/brown plaid shirt 3d model.glb`.
