# NPC drivers, social crowds and vehicle takeovers

## Implementation
- Main playable character is instantiated once. Traffic and parked vehicles use
  the three supplied NPC models, with shared seated palettes.
- `npc-actors.js` adds 3 seated, 6 conversational and 3 extraction palettes to
  the existing 18 locomotion palettes. Geometry/materials remain shared; actor
  counts stay fixed at 180 desktop / 96 touch and 24 / 12 traffic rickshaws.
- Crowd includes 36 desktop social actors in facing groups, 12 shop loiterers,
  and independently paused walkers. Spatial neighbor lookup drives passing and
  swept clearance. Social layout is reassigned when map tiles retire.
- `vehicle-actions.js` coordinates approach, reaching/pulling, entry and exit.
  Taken traffic actors stop following AI; four original parked vehicles are also
  drivable. Extracted NPCs use six bounded walking/idle actors. Reset cancels
  transitions and releases traffic holds. Vehicles use shape-specific collision.
- `vehicle-parts.js` extracts conservative door and inner wheel triangles from
  fused car scans. Requires all corners within bounds to avoid stretched body
  fragments. Mesh geometry is unique only where indices change.
- Six original synthesized Hindi bump/takeover reactions use Madhur/Swara voices,
  embedded for offline playback. Source text/provider/hashes are recorded in
  `assets/voices/provenance.json`. Entry gesture unlocks WebAudio; cooldown,
  spatial volume/panning and background ducking limit overlap. No GTA recordings.
- Transitions are custom skeletal poses and IK, not GTA motion capture. Fused
  scan door edges/interiors still need authored assets for production quality.

## Verification and resolved failures
- Initial door extraction used TypedArray.map for object values, causing startup
  failure. Array.from fixes it. All-corner selection avoids long crossing triangles.
- Narrow pavement groups initially gridlocked walkers. Planner now uses circular
  clearance, wider passing offsets and a lateral-only escape when forward motion
  is blocked. A 120-second simulation ends with 93 pedestrians moving, minimum
  separation 0.64 m, zero off-pavement NPCs, zero traffic overlaps/off-road actors
  and 16 moving rickshaws. Walk/run speeds, pause and 96/12 touch startup pass.
- Social interaction check covers one player, NPC drivers, rickshaw/car extraction,
  real car driving/braking/exit and keyboard bump triggering Hindi speech.
- All social checks passed with zero browser errors. A 24-position streaming
  check retained 9 tiles and bounded mesh counts (1802–1834), deterministic
  layouts, full pavement coverage and no blocked static road samples. Packaged
  offline smoke passed with 180 NPCs, 24 vehicles, sound and no HTTP, boot or
  shader errors; about 59 fps on this workstation.
- `scripts/verify-social-interactions.cjs [url]` can check local or public release;
  long simulation is `verify-living-street.cjs`. GPU tests run sequentially here.

## Publication and boundaries
- User requested publication to existing Netlify site. Build whitelist includes
  38 runtime files, about 211.6 MiB. Voices are embedded runtime JS; source MP3s,
  scans, screenshot attachments and artifacts are excluded from dist.
- Same manual Netlify deployment as previous handoff: site
  04838829-b67d-498d-9129-1c5727534e95, https://gta-india-fahimc.netlify.app.
- Use per-command Git safe.directory=I:/Projects/gta-india. Preserve unrelated
  untracked `vendor/brown plaid shirt 3d model.glb`; do not stage it.
- Published production deploy `6ac7dcf7bd83cc51b12c99fa`. Initial CLI upload
  returned 422 "no records matched" after transferring files; the explicit-site
  retry reused uploads and completed. Live street/crowd/takeover/speech bundles
  match local dist bytes. Netlify badge setting remains disabled.
- Public smoke passed: 9 streamed tiles, 180 pedestrians, 24 moving traffic
  actors, NPC driver sources, sound playback, pause/Tour/Walk controls and zero
  HTTP, browser, boot or shader errors. About 59 fps measured on this workstation.
- This request authorizes Netlify publication. Current implementation remains
  in the local worktree; GitHub main was verified at 9c4d1d9 before deployment.
