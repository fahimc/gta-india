# Old Quarter — living street

Open `india.html` in a desktop browser, or serve this folder with
`python -m http.server 8096 --bind 127.0.0.1` and visit
`http://127.0.0.1:8096/india.html`. Keep `street.js`, `crowd.js`, `npc-palettes.js`, `rickshaw-asset.js`, `building-asset.js`, `player-character.js`, `assets/` and
`background-audio.js`, `parked-vehicles.js`, `vendor/` beside the HTML. Engine, materials and character are bundled; offline
`file://` launch is verified. The untouched starter is `artifacts/india-original.html`.

## Controls

- **Walk** leaves the overview and follows the controllable character.
- **WASD / arrows** move on foot; drag the scene to orbit the camera.
- **E / Drive** enters the rickshaw when within 3.6 m. **E / Exit** steps out when stopped.
- Driving: **W / S** accelerate or reverse, **A / D** steer, **Space** brakes.
- **Shift** runs; **Space** jumps on foot; **R** resets the character, vehicle and overview camera.
- Touch: left joystick moves or drives, drag to look, tap **Jump** on foot or hold **Brake** while driving.
- **Wet**, **Daylight / Golden** and **Native / Balanced** change presentation.

## Crowd and performance

The crowd now uses the supplied **`npc-man-1.glb`**, with 20,917 vertices /
18,763 triangles, normalized to 1.78 m. The source export contained 55 skin joints,
but all vertices were assigned to the hip and the joint node transforms were
missing. `scripts/repair-npc-bind.py` reconstructs the bind transforms from the
inverse-bind matrices, aligns the rig to the mesh and assigns smooth weights from
anatomical bone segments. This produces `assets/npc-man-1-runtime.glb`; the supplied
file remains unchanged. Automated heat weighting failed on the scan topology;
the deterministic segment weights are used instead.

The supplied **`npc male 2.glb`** joins the existing crowd with 21,284 triangles.
Its missing joint transforms are restored by `python scripts/repair-npc-bind.py --second`;
its authored multi-joint weights are preserved. The centered Z-up bind rig is aligned
to the ground-aligned Y-up mesh. Sources remain untouched.

Mixamo idle/walk is baked separately for each rig. Rebuild NPC 2 with
`python scripts/bake-mixamo.py --target assets/npc-male-2-runtime.glb --output assets/animations/npc-2-mixamo.js --global-name NPC_2_MIXAMO --clips idle,walk`.
44 pedestrians on desktop / 32 on touch devices mix all three NPC models. Each type
shares geometry and original textures. Four walking and two idle palettes per type
provide GPU instances: 18 evaluated skeletons total, independent of crowd count.
Height variation, phase offsets, pauses and opposing pavement lanes remain.
Both runtime GLBs and motion packs are bundled for offline use.

The supplied **`woman npc 1.glb`** appears as 14 of the 44 desktop pedestrians
(and 10 of the 32 touch pedestrians). The repaired runtime copy has 25,301 triangles
rather than 74,415, plus shared 2K PBR textures; the original asset stays untouched.
Rebuild in order: `python scripts/repair-npc-bind.py --woman`, Blender
`--python scripts/prepare-woman-npc.py`, then
`python scripts/bake-mixamo.py --target assets/woman-npc-1-runtime.glb --output assets/animations/woman-mixamo.js --global-name WOMAN_MIXAMO --clips idle,walk`
and `python scripts/embed-scene-assets.py`. The rig uses its authored skin weights,
with top-four normalized influences after decimation. Her idle/walk motion is
retargeted separately to the repaired skeleton. `scripts/review-woman.cjs` captures
the walking model in the street.

The drivable vehicle now uses the supplied **`rickshaw.glb`**. Its source has
1,896,545 triangles / 1,006,192 vertices. A Blender decimation runtime copy has
104,309 triangles, preserving the authored UVs, colour, roughness and normal maps.
`scripts/prepare-scene-assets.py -- rickshaw` runs inside Blender; then
`scripts/split-rickshaw-wheels.py` separates clean inner tyre/rim regions for rolling and steering. It checks all
triangle corners for painted body surfaces and uses conservative wheel bounds.
Fused outer edges, the front suspension fork, fenders and mudguards stay fixed on the chassis; the single
scan is not an independently authored wheel rig. The runtime vehicle is 2.35 m tall, with a matching
collision footprint, seat position and hand targets. Wheel segmentation is based
on the inspected mesh geometry rather than an authored vehicle rig.
`assets/rickshaw-data.js` embeds the runtime GLB. The original model is unchanged.
Rebuild all embedded model scripts with `python scripts/embed-scene-assets.py`.

Twelve selected buildings use the three supplied models: four **`old building 1.glb`**
instances (64,246 triangles per source) and four **`old building 2.glb`** instances
(43,556 triangles per source), plus four **`old building 3.glb`** instances
(44,171 triangles per source). Each type shares a single geometry and 2K PBR texture
set. The second building's geometry is retained at its existing triangle budget.
Facade fitting ignores the wide ground skirt. Masonry party walls close adjoining
plot seams, and continuous paving foundations plus a broad world floor support
all building bases, steps and joined corners. The former gaps between blocks are
closed. Other buildings remain procedural.
Rebuild the second model with Blender `scripts/prepare-scene-assets.py -- building2`,
then `python scripts/embed-scene-assets.py`. Source GLBs remain unchanged.

**`background.mp3`** loops at 32% volume after the first click, tap or keypress,
as required by browser audio activation. The top-bar music button toggles sound.
Playback pauses in hidden tabs and resumes when returning if enabled. The embedded
`assets/background-data.js` also supports offline `file://` playback.

The playable character uses the supplied **`character2-rigged.glb`**, with its
original 65-bone Mixamo skeleton, skin weights and PBR textures. It has 23,935
vertices / 19,226 triangles and is normalized to 1.78 m, facing the movement
direction. The Tripo Mixamo rigging setting supplied **no animation clips**.
The playable character now uses genuine motion-capture clips downloaded from
the user's signed-in **Adobe Mixamo** session: **Breathing Idle**, **Unarmed Walk
Forward**, **Unarmed Run Forward** and **Unarmed Jump**. Downloads use FBX Binary,
Without Skin, 60 fps, no keyframe reduction; walk and run use In Place.

`scripts/convert-mixamo.py` converts the FBX files with the installed Blender 4.2.
`scripts/combine-mixamo.py` combines their identical source rigs;
`scripts/bake-mixamo.py` retargets all 65 bones, correcting the different bone axes
and the Tripo rig's relaxed bind pose. Just copying bone names would deform the
arms. The compact baked runtime data is approximately 1.22 MB, with no source
character mesh, material or texture loaded into the scene. Source file hashes
and download settings are recorded in `assets/animations/provenance.json`.

Idle/walk/run crossfade on one skeleton with shared locomotion phase. Playback
speed is calibrated from the captured planted-foot velocity and driven by actual
movement speed to reduce sliding. Horizontal root motion is removed; vertical
motion and running flight remain. Sole grounding samples only the cached foot
vertices. Jump is a non-looping takeoff/flight/landing action, with a short blend
at each end, no repeat in the air, and a grounded recovery. Its captured flight
height raises the visible character; the prototype's existing planar collision
checks remain in use. Jump does not vault obstacles or add rigid-body physics.

One character and skeleton are reused on foot and in the driver's seat. Entering
the rickshaw reparents that character to the moving vehicle; exiting restores
its grounded walking pose. A cached seated pose aligns its wrists to the real
handlebar grips. The new body participates in nearby shadows and wet reflections.
The original GLB is unchanged; `assets/character2-data.js` embeds it for offline
launch, and the bundled meshoptimizer decoder handles its compressed geometry.

Two sampled, closed pavement loops have straight north/south lanes and rounded
turns. The facades were moved back to expose usable pavements. Decisions run at
10 Hz; fixed 60 Hz movement interpolates velocity, follows queues, takes seeded
short pauses and yields to the player. A swept-step check enforces player clearance.
GPU pose palettes update at 30 Hz. A small foot-vertex subset calibrates each
pose's lowest sole; the full mesh is never CPU-skinned per pedestrian.

Instances have individual frustum bounds and a 58 m distance cutoff. Only nearby
characters enter directional shadow and puddle reflection passes. Static buildings
retain material/neighbourhood batching and frozen transforms; moving vehicle
parts retain local transforms, with separate spinning axles and front steering.
Vehicle movement uses a bounded bicycle model, substeps and obstacle checks.

Desktop Native includes half-resolution screen-space ambient occlusion, a native
colour buffer, 2048 px PCF shadows and atmosphere. Balanced disables AO; touch and
WebGL1 omit it. Shadows refresh while actors move rather than caching ghost poses.
The original paving top-face UV axes and contact material were corrected.

## Validation

`node scripts/verify.cjs` runs the browser checks using this workstation's bundled
Playwright and Edge. Start the local HTTP server first. It verifies actual keyboard
and joystick input, vehicle motion/steering/braking/reverse/exit, character walking,
48 sole-grounding poses, five simulated minutes of crowd navigation, player
avoidance, offline launch, WebGL1 compatibility and the touch profile.

`node scripts/verify-character.cjs` checks all four loaded clips, six animated limbs,
256 sole-grounding poses at road and pavement heights, walking/running,
idle transitions, jump height/recovery/repeat rejection, seated hand placement,
enter/exit reuse and shadow registration.
Its results and close-up renders are saved as `artifacts/character2-*`.
`node scripts/review-replacements.cjs` captures the new NPC group and seated driver.
`node scripts/verify-asset-integration.cjs` checks twelve shared building instances,
2K texture limits, pavement clearance/foundations, and eight wheel rotation angles
while checking that the body stays fixed. Images and results are in `artifacts/`.
The five-minute navigation simulation skips animation evaluation; motion and sole
contact are checked separately on 48 captured walk poses.
`node scripts/review-mixamo.cjs` captures side views at three phases of each clip.

Screenshots and machine-specific frame measurements are in `artifacts/`;
`artifacts/validation.json` records the last successful run. Performance is a
measurement of this browser/workstation, not a promise for other devices.

## Quality scope

This is an improved procedural prototype, not GTA6 visual parity. The player uses
retargeted Mixamo motion capture; the crowd also uses retargeted Mixamo idle/walk motion and shares one face and
body. The next major art improvements are more character archetypes, authored
cloth weights for the NPC scarf, richer shop interiors and environment assets.
The rickshaw uses kinematic collision, not suspension or a full rigid-body simulation.

## Asset credits

- **NPC Man 1**, **Rickshaw**, and **Old Building 1**, supplied by the user. Runtime changes: repaired
  NPC bind transforms/weights and Mixamo retargeting; vehicle decimation and wheel
  segmentation. Original GLBs remain unchanged.
- **Faquir**, by **FedeOde**, retained as an unused source in this project. Embedded metadata identifies
  [the original model](https://sketchfab.com/3d-models/faquir-30a4d0f1c0754b8e970875be2e2e11d8)
  and [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
  Local changes: normalization, rigging, analytical movement and clothing tints.
  The supplied GLB is preserved unchanged.
- **Babylon.js 9.0.0** engine and glTF loader, Babylon.js authors, Apache-2.0.
- **Character 2**, supplied by the user, Tripo3D model with Mixamo-compatible
  rigging. Original mesh, skeleton and texture maps are preserved.
- **Adobe Mixamo**: Breathing Idle, Unarmed Walk Forward, Unarmed Run Forward and
  Unarmed Jump, downloaded on 7 October 2026 and retargeted into this game.
  [Mixamo project-use information](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html).
- **meshoptimizer 0.24** decoder, Arseny Kapoulkine, MIT; license in `vendor/`.
- Street geometry and embedded surface artwork come from the supplied starter.

No Git repository was present, and no commit, publication or deployment was made.
`character1.png` appeared during implementation and is preserved as supplied; it
is a 2D reference image. The implemented crowd uses the 3D `npc-man-1.glb` runtime copy.

`node scripts/verify-new-assets.cjs` checks all three NPC rigs across 60 walk poses each,
shared model counts, sampled ground coverage under every plot, audio loop wrapping
and mute/resume. Review captures and results are saved in `artifacts/`.

## Supplied parked vehicles

All four `vehicles/` models are placed along the kerb: blue car at z=22 on the
left, red car at z=32 on the right, white car at z=44 on the left and bus at z=54.5
on the right. These are parked scenery with collision boundaries; the rickshaw
remains drivable. Vehicles receive lighting, cast shadows and enter wet reflections.
The source files are untouched. Their combined 7,442,201 source triangles become
199,999 runtime triangles (45,000 per car / 64,999 for the bus). The red car's
75 separate materials and the bus's eight are consolidated into padded texture
atlases, one material per vehicle. Maximum map dimensions are 2K. Final exported
mesh coordinates are normalized to street scale; the bus retains its source
proportions at 2.5 m wide. Foot and vehicle collision bounds follow these footprints,
and the pavements plus a continuous central driving route remain clear.

Rebuild in order: `node scripts/decode-vehicles.cjs`, Blender
`--python scripts/prepare-vehicles.py`, `python scripts/atlas-vehicles.py`,
`python scripts/normalize-vehicles.py`, then `python scripts/embed-scene-assets.py`.
Decoded intermediates are stored under `artifacts/vehicles-decoded/`; normalized
runtime GLBs and metadata are in `assets/vehicles/`. Embedded vehicle data supports
offline `file://` launches. `node scripts/verify-vehicles.cjs` checks model budgets,
kerb clearance, collision boundaries and actual driving past / into parked cars.
Review images are `artifacts/vehicle-*.png`.

The third building replaces slots 3 and 6 on both sides. Its original 44,171
triangles are retained; one shared 2K PBR map set supplies four hardware instances.
Rebuild with Blender `--python scripts/prepare-scene-assets.py -- building3`, then
`python scripts/embed-scene-assets.py`. `node scripts/verify-building-3.cjs` checks
shared resources, plot bounds, ground coverage and offline boot, and captures
`artifacts/old-building-3-street.png`.


## Procedural tiled neighbourhood

`tile-world.js` owns a deterministic metre-scale map (seed 40817). Each 80 m
block has four connected street edges, continuous foundations, sidewalks and
rounded pavement routes. The starting street remains the detailed seed scene;
its former end wall and fixed movement/camera limits have been removed.

A 3x3 neighbourhood follows the player or driven rickshaw. New blocks are
constructed one per frame, nearest first; retired block instances are disposed.
Imported building geometry and PBR maps are cached once per model. Near facades
use hardware instances of all three supplied scans; distant blocks use shared
masonry templates. Template UVs preserve metre-scale road/paving/plaster detail.
Sources are bounded by type and dimensions, rather than accumulated per tile.
Shadows and reflections use nearby casters. The seed scene adds a constant cost,
while streamed world geometry remains bounded independently of travel distance.

`asset-cache.js` requests offline JavaScript asset bundles at their first
consumer and deduplicates requests. All three building/NPC types are needed in
the initial neighbourhood, so their shared sources load during scene startup;
subsequent tiles require no additional model downloads. Background audio loads
on the first input. This retains offline file launches.

The fixed crowd budget (44 desktop / 32 touch, 18 shared animation palettes)
follows four nearby map blocks. Agents on retained blocks continue their routes;
those on retired blocks are reassigned into the largest vacant route arcs.
They walk around corners, pause, brake for other pedestrians and yield to the
player. Vehicle/foot collision and pavement height now come from the map grid,
including intersections and negative map coordinates.

Validation: `node scripts/verify-tile-world.cjs` checks repeated generation and
retirement over 24 map positions, deterministic revisits, bounded mesh counts,
road continuity, ray-tested pavement coverage and NPC separation. Review image:
`artifacts/procedural-streets.png`. `node scripts/verify-tile-driving.cjs` checks
actual keyboard driving over a tile boundary, offline demand loading and the
32-agent mobile configuration. JSON results live in `artifacts/tile-world*.json`.


## Build and publish

Run `npm run build` to create the deployable `dist/` directory. It contains the
playable entry points at `/` and `/india.html`, vendored engine scripts and the
runtime asset bundles. Source GLBs, temporary Mixamo downloads, validation files,
screenshots and local Netlify state are excluded from the web bundle.

The GitHub repository is https://github.com/fahimc/gta-india. Source GLB/FBX/MP3
files are stored with Git LFS; install Git LFS before cloning source models.
Retargeted animation data is incorporated into the game bundles, while the
standalone downloaded Mixamo working files remain local.

Netlify reads `netlify.toml`: build command `npm run build`, publish directory
`dist`. Once the project is linked with `netlify link`, `npm run deploy` builds
and publishes production. No runtime API keys are required.
