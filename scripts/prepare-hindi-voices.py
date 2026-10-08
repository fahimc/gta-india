"""Create original Hindi NPC reactions and an offline runtime bundle.
Requires edge-tts; install into a separate tooling directory, not the game.
"""
import asyncio
import base64
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'artifacts/tts-runtime'))
import edge_tts

LINES = [
    ('male-watch', 'अरे भाई, देख कर चलो!', 'hi-IN-MadhurNeural', 'bump'),
    ('male-careful', 'संभल कर! रास्ता देखो।', 'hi-IN-MadhurNeural', 'bump'),
    ('male-vehicle', 'अरे! मेरी गाड़ी!', 'hi-IN-MadhurNeural', 'vehicle'),
    ('female-watch', 'अरे, ज़रा देख कर चलिए!', 'hi-IN-SwaraNeural', 'bump'),
    ('female-careful', 'ध्यान से चलिए!', 'hi-IN-SwaraNeural', 'bump'),
    ('female-vehicle', 'अरे! क्या कर रहे हो?', 'hi-IN-SwaraNeural', 'vehicle'),
]

async def main():
    folder = ROOT / 'assets/voices'
    folder.mkdir(exist_ok=True)
    runtime, provenance = [], []
    for key, text, voice, event in LINES:
        target = folder / (key + '.mp3')
        if not target.exists() or target.stat().st_size < 100:
            await edge_tts.Communicate(text, voice, rate='+12%').save(str(target))
        raw = target.read_bytes()
        runtime.append(dict(key=key, text=text, gender='female' if key.startswith('female') else 'male', event=event,
                            src='data:audio/mpeg;base64,' + base64.b64encode(raw).decode()))
        provenance.append(dict(key=key, text=text, voice=voice, event=event,
                               sha256=hashlib.sha256(raw).hexdigest()))
        print(key, len(raw))
    (ROOT / 'assets/npc-voices-data.js').write_text('window.QUARTER_NPC_VOICES=' + json.dumps(runtime, ensure_ascii=True) + ';\n', encoding='utf-8')
    (folder / 'provenance.json').write_text(json.dumps(dict(source='Original dialogue, synthesized Hindi speech',
        provider='Microsoft Edge Read Aloud / edge-tts 7.2.8', date='2026-10-08', lines=provenance), ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    asyncio.run(main())
