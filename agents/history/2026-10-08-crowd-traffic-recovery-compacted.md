# Crowd passing, quieter radio and traffic recovery — 2026-10-08

## Scope and state
- Fix NPC pavement deadlocks, loud vehicle radio, feet through car floors and stalled AI cars.
- Local work only. No commit, push or deployment authorized by this continuation.
- Preserve the prior traffic/radio/frontage, supplied locomotion and cinematic work described in the other 2026-10-08 handoffs. Unrelated vendor brown-plaid source remains untouched.

## Implementation
- `crowd.js`: 10 Hz spatial-hash predictive avoidance, smooth lateral movement and 60 Hz swept clearance. Opposing walkers have reserved pavement bands; stationary groups stand toward shops. Actual velocity drives facing/idle selection. Both direction streams, pauses and social gestures remain.
- Important failed approach: unconstrained sidesteps/overtaking passed a uniform-speed fixture but wedged walkers at random pauses and standing groups in the real scene. Direction bands and 0.55 m clearance resolve this; do not restore unrestricted crossing into the opposing band.
- `vehicle-radio.js`: gain 0.38 to 0.10. `background-audio.js`: cabin ambience 0.13 to 0.28, outside 0.32; existing fades/mute/filters retained.
- `seated-legs.js`: one-time CCD fit to `vehicle-parts.js` car/bus foot targets. NPC static seat palettes cached by model/profile, geometry and maps shared. Player caches fitted pose per vehicle. Extraction blends from the actual car seat palette.
- `traffic-recovery.js`: bounded hybrid A* using forward/reverse steering arcs and real swept collision footprints. After stalls, find detours or nearby traffic loops, retry when blocked. Global search throttle and fixed pool retained. Replanning must preserve the partial-detour pose; clearing recovery prematurely would snap to the old route through an obstacle. Held/owned takeover suspends movement/recovery.
- Runtime HTML loads the two new modules. README documents behaviour and performance choices.

## Verification
- `verify-crowd-passing.cjs`: 180/96 walkers with varying speeds, pauses and stationary groups for 120 simulated seconds. Every walker progresses at least 129 m; no off-pavement NPCs, minimum separation >=0.55 m, no blocked walkers at finish.
- `verify-driver-traffic-recovery.cjs`: 16 car/bus NPC drivers and player in all three cars meet foot targets within 0.025 m. Player soles >=0.319 m above car origin. Actual 180-NPC scene progresses >=132 m per walker over two minutes, no blocked walkers/off-pavement cases. Obstructed AI car completes detour and continues 223 m, zero obstacle collisions/browser errors.
- `verify-traffic-reroute.cjs`: blocked street switches to cross street; temporary full blockage preserves pose, retries and resumes. Maximum step 0.0775 m; no teleport.
- `verify-living-street.cjs` passed entry audio, mixed traffic, on-foot speeds/pause and mobile startup before final reserved-band/replan refinements.
- `verify-traffic-radio.cjs`: final desktop/touch playback at gain 0.10, mute/exit, arrows and cabin/chase passed. Mixed traffic over 120 seconds: zero overlaps/off-road cases, 38 recoveries, 27/36 moving at finish. Zero page/shader errors.
- `verify-social-interactions.cjs`: rickshaw/car extraction, fitted car seat transition, entry/exit, car motion/brake and Hindi bump reactions passed. One player body, NPC-only drivers. Side-view red-car screenshot confirms no feet under the body.
- `verify-published.cjs` against local `dist/index.html`: offline boot, 9 tiles, 180 NPCs, 24 rickshaws + 12 cars, audio, pause/tour/walk, smooth traffic and cinematic/locomotion settings passed. No HTTP/page/boot/shader errors.
- `npm run build`: 55 runtime files / 268.7 MiB. Source assets and QA excluded.

## Resume
- Dev server on 127.0.0.1:8096. Run GPU tests sequentially to avoid excess memory.
- All requested fixes complete locally. QA artifacts: crowd-passing-simulation.json, driver-traffic-recovery.json, traffic-radio-validation.json, social-interactions-validation.json, publication-validation.json, car-feet-fixed.png.
- Open local preview with `?update=crowd-traffic-recovery-20261008`. No Netlify changes in this task.
## Publication follow-up
- User now explicitly authorized GitHub push and Netlify production deployment.
- Reuse the verified 55-file offline build and existing Netlify site `04838829-b67d-498d-9129-1c5727534e95`.
- Publish the completed game changes, including earlier uncommitted cinematic, locomotion, traffic, radio, frontage and NPC work. Leave unused police-car and vendor brown-plaid sources uncommitted.
- Game changes committed and pushed to `origin/main` as `340e777` (91 files). Git LFS uploaded all 13 required model/audio objects.
- Netlify production deploy `6ac8195f5b87ec8b1f2a2b52` succeeded on the existing site; live URL `https://gta-india-fahimc.netlify.app/?v=6ac8195f`.
- Live `verify-published.cjs` passed: 9 tiles, 180 NPCs, 24 rickshaws + 12 cars, startup/audio, pause/tour/walk, smooth traffic, cinematic reflections/sky and supplied locomotion. Zero HTTP/page/boot/shader errors.
- Ten critical live files match local `dist` SHA256. HTML comparison normalizes Netlify's injected hosting comment; scripts match byte-for-byte.
- Publication supersedes the earlier local-only state in this handoff. Next work starts from the published game; unused police-car and vendor brown-plaid sources remain untracked.
