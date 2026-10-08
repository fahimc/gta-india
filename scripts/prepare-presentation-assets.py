"""Encode generated art for shipping; original PNG pixels remain unchanged."""
import base64,json,hashlib
from io import BytesIO
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'assets/presentation'
for name in ['old-quarter-keyart','golden-hour-sky']:
    source=folder/f'{name}.png'
    Image.open(source).convert('RGB').save(folder/f'{name}.webp',quality=91,method=6)
sky=(folder/'golden-hour-sky.webp').read_bytes()
(folder/'sky-data.js').write_text('/* Generated panoramic sky, embedded for offline playback. */\nwindow.QUARTER_SKY_IMAGE='+json.dumps('data:image/webp;base64,'+base64.b64encode(sky).decode())+';\n',encoding='utf-8')
records={name:{'originalSha256':hashlib.sha256((folder/f'{name}.png').read_bytes()).hexdigest(),'runtimeSha256':hashlib.sha256((folder/f'{name}.webp').read_bytes()).hexdigest(),'tool':'Built-in Codex image generation','generated':'2026-10-08','promptFile':'keyart-prompt.md' if name=='old-quarter-keyart' else 'sky-prompt.md'} for name in ['old-quarter-keyart','golden-hour-sky']}
(folder/'provenance.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print('Prepared generated title artwork and embedded panoramic sky')
