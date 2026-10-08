# Cinematic flow and raster rendering

## Context and delivered work
- User requested a GTA6-inspired AAA presentation/rendering flow, specifically
  using Codex image generation. Continues local supplied-locomotion work;
  `2026-10-08-supplied-locomotion-compacted.md` remains relevant for player clips.
- Built-in image generation produced two original project assets: Indian street
  title artwork and a 2:1 golden-hour sky panorama. Original PNGs, WebPs, prompts
  and SHA256 provenance live under `assets/presentation/`. The generated scene
  in the title artwork is promotional art, not actual gameplay geometry.
- `prepare-presentation-assets.py` reproducibly converts originals to WebP and
  embeds the panorama for offline playback. Title image is 435,330 bytes; sky
  WebP is 106,540 bytes; embedded sky JS is 142,172 bytes. Preserve the PNGs.
- `cinematic-ui.css/js` introduce a responsive artwork title screen with live
  text/buttons, display/atmosphere choices, control help, matching pause flow,
  and a brief letterbox/arrival reveal without blocking movement. Audio still
  starts before fade. Reduced-motion animation and modal keyboard focus work.
  Before-game Escape no longer opens the hidden game pause menu. HUD children
  outside pause are inert while pause is open. Local display choices persist.
- Routine loading text now describes the neighbourhood rather than engine
  details. Recovery controls disappear after successful startup.

## Rendering decisions
- `cinematic-rendering.js` owns a fixed pool of 22 desktop / 10 touch puddles,
  seeded along the same x=80*n / z=80*n-16 roads as the tiled map. Pool objects
  are reused as focus changes. There is one shared planar target with nearby
  architecture and actors, and one cached 256 px vehicle cubemap on WebGL2
  desktop Cinematic. Static cubemap refresh is distance-triggered (16 m), with
  bounded render lists. Vehicle geometry/materials retain existing sharing.
- Cinematic: 1024 px planar target, 4x MSAA, modest bloom and existing AO.
  Desktop Performance: 512 px mirror and no AO/bloom/local vehicle probe.
  Touch Performance: 256 px mirror every third frame, FXAA, no AO/bloom/probe;
  Touch Cinematic raises the mirror to 512 px every second frame. WebGL1 omits
  the HDR pipeline and vehicle probe, preserving planar water reflections.
- Default is golden hour after rain; restrained road wet sheen / vehicle coat
  preserve authored surface maps. Shadows now follow focus over streamed roads.
- Replaced the flat-looking custom sky shader with an unlit panorama material;
  the panorama also supplies the rough environment cubemap. Upload is 2048x1024
  for WebGL1 repeat/mipmap compatibility. Sphere UVs require vScale=-1/vOffset=1.
  StandardMaterial emissiveColor must stay black when using the emissive texture
  here: a bright additive emissive color washed out all cloud detail.
- Finishing pipeline is attached after AO when changing quality. Water render
  lists keep sky first so list caps cannot discard its background.
- These are raster planar/cubemap reflections, not ray tracing or GTA6 parity.
  Existing asset/simulation limitations in earlier histories still apply.

## Verification and publication
- `verify-cinematic-flow.cjs` passes against packaged offline `dist/index.html`:
  desktop 1440x900, phone 390x844 at DPR 2, landscape 900x500, and WebGL1.
  Reviewed title, atmosphere/help panels, gameplay, pause and sky/reflections.
  Tests cover audio-before-fade, toggles, modal dismissal, pool identity and road
  placement across positive/negative map positions, nonblank GPU reflection
  pixels, and zero browser/boot/material shader errors in all profiles.
- `review-cinematic-rendering.cjs` captures low/wide lighting/reflection views.
  Intermediate desktop measurements were about 38–47 fps on this workstation;
  this is not a guarantee for other devices.
- Packaged `verify-player-locomotion.cjs` passes: supplied walk/run selected,
  256 grounded samples, loop seams under .001 rad, actual 2.6/5.4 m/s movement,
  walk/run/idle transitions and zero browser errors.
- Build passes: 45 runtime files, 228.8 MiB. `build-site.cjs` now copies linked
  CSS plus the whitelisted title WebP and sky script. Source PNGs/prompts and
  review artifacts are excluded. Syntax and `git diff --check` pass.
- Local only: no commit, push or Netlify deployment. Prior production remains
  `6ac7ec1ccffbaae8047723d2`. Git HEAD remains `9c4d1d9`; earlier changes remain
  uncommitted. Preserve unrelated `vendor/brown plaid shirt 3d model.glb`.
- Preview at `http://127.0.0.1:8096/india.html?look=cinematic-20261008`.
  Use per-command `git -c safe.directory=I:/Projects/gta-india`. Run GPU tests
  sequentially. Generated image paths are in the project, not only Codex cache.

## Production release follow-up
- User subsequently authorized Netlify publication. Rebuilt the same 45 runtime
  files / 228.8 MiB and deployed to existing site
  `04838829-b67d-498d-9129-1c5727534e95`. Production deploy is now
  `6ac7fe885233c2906a520e84`, superseding the local-only status above.
- First upload returned the known Netlify 422 `no records matched`; retrying the
  same explicit site/files found everything uploaded and completed successfully.
- Production HTML, street/render/UI scripts and CSS, generated title/sky runtime
  data, and player animation pack match local dist SHA256 bytes.
- Updated `verify-published.cjs` to capture the new title and assert cinematic
  targets, sky and supplied clip selection. Live smoke passes: startup/audio,
  pause/tour/walk controls, 9 tiles, 3 building types, 180 shared pedestrians,
  24 traffic rickshaws, smooth movement, 22 puddles, 1024 px planar target,
  256 px vehicle probe, bloom, and zero HTTP/browser/boot/shader errors.
  About 44 fps measured during this live smoke on this workstation.
- Public review: `https://gta-india-fahimc.netlify.app/?v=6ac7fe88`.
  No Git commit or GitHub push was requested or performed.
