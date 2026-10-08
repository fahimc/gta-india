"""Offline model wrappers; run after rebuilding the runtime GLBs."""
import base64
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name,variable in [('female-casual','FEMALE_CASUAL_BASE64'),('female-lehenga','FEMALE_LEHENGA_BASE64'),('npc-brown','NPC_BROWN_BASE64'),('npc-man-1','NPC_MAN_1_BASE64'),('npc-male-2','NPC_MALE_2_BASE64'),('woman-npc-1','WOMAN_NPC_1_BASE64'),('rickshaw','RICKSHAW_BASE64'),('old-building-1','OLD_BUILDING_1_BASE64'),('old-building-2','OLD_BUILDING_2_BASE64'),('old-building-3','OLD_BUILDING_3_BASE64')]:
    raw=(root/f'assets/{name}-runtime.glb').read_bytes()
    (root/f'assets/{name}-data.js').write_text('window.'+variable+'="'+base64.b64encode(raw).decode()+'";\n',encoding='utf8')
audio=base64.b64encode((root/'background.mp3').read_bytes()).decode()
(root/'assets/background-data.js').write_text('window.QUARTER_BACKGROUND_AUDIO="data:audio/mpeg;base64,'+audio+'";\n',encoding='utf8')

import json
vehicles={p.stem.replace("-runtime",""):base64.b64encode(p.read_bytes()).decode() for p in (root/"assets/vehicles").glob("*-runtime.glb")}
(root/"assets/vehicles-data.js").write_text("window.QUARTER_VEHICLES="+json.dumps(vehicles,separators=(",",":"))+";\n",encoding="utf8")

(root/"assets/radio-data.js").write_text('window.QUARTER_RADIO_AUDIO="data:audio/mpeg;base64,'+base64.b64encode((root/"music/Aaja Re.mp3").read_bytes()).decode()+'";\n',encoding="utf8")
