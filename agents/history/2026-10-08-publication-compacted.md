# Initial GitHub and Netlify publication

## Context
- Static Babylon.js game. User requested publication to `fahimc/gta-india` and Netlify.
- The remote repository was empty. Workspace was previously outside Git.
- The detailed origin street connects to deterministic 80 m blocks, a streamed 3x3
  neighbourhood, 44 desktop / 32 mobile pedestrians and 18 shared motion palettes.
- Authored buildings, player, NPCs, rickshaw, parked vehicles and Mixamo clips are
  included locally. Runtime JS asset bundles support offline file launches.

## Publication setup
- `main` is the initial branch; origin is `https://github.com/fahimc/gta-india.git`.
- Source GLB, FBX and MP3 files use Git LFS. Runtime JavaScript bundles stay in Git.
- `npm run build` produces `dist/` using an explicit runtime whitelist, with both
  `/` and `/india.html` entry points. Source scans, QA artifacts and credentials
  are never copied into the publish directory.
- `netlify.toml` sets the build command and `dist` publish directory. Netlify's
  local linking state is ignored. No runtime environment secrets are required.
- This workspace's volume does not record ownership: use per-command Git
  `-c safe.directory=I:/Projects/gta-india` here rather than a global wildcard.

## Verification and resume
- Prior tile tests: deterministic revisits, bounded mesh counts after 161 tile
  creations / 152 retirements, continuous roads and ray-tested pavements.
- Keyboard driving across a tile boundary, offline boot and mobile crowd passed.
- Desktop visual review was about 60 fps on the development machine.
- Publication is in progress; confirm GitHub `main` and Netlify production URL
  before recording deployment as complete. Do not infer success from upload alone.
