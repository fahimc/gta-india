"""Bake the user-supplied clips separately, preserving existing idle/jump motion.
First run convert-mixamo.py in Blender with 'Walking (1)' 'Running (1)'.
"""
import hashlib,json,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
runtime=ROOT/'assets/animations/mixamo-locomotion.js'
def read_pack(path):
    return json.loads(re.search(r'window\.\w+=(.*);',path.read_text(encoding='utf-8'),re.S).group(1))
pack=read_pack(runtime)
provenance_path=ROOT/'assets/animations/provenance.json'
provenance=json.loads(provenance_path.read_text(encoding='utf-8'))
for clip,filename in [('walk','Walking (1)'),('run','Running (1)')]:
    out=ROOT/f'artifacts/player-{clip}-baked.js'
    subprocess.run([sys.executable,str(ROOT/'scripts/bake-mixamo.py'),'--source',f'assets/animations/{filename}.glb','--clips',clip,'--clip-name',clip,'--output',str(out)],check=True)
    new=read_pack(out)
    assert new['bones']==pack['bones'] and new['stride']==pack['stride']
    assert new['characterSha256']==pack['characterSha256']
    assert new['clips'][clip]['nominalSpeed']>.1
    source=ROOT/f'assets/animations/{filename}.fbx'
    metadata=dict(title=filename,sourceFile=source.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),duration=new['clips'][clip]['duration'],frames=new['clips'][clip]['frames'],nominalSpeed=new['clips'][clip]['nominalSpeed'],received='2026-10-08',processing='Independent bind-axis retargeting to existing player; horizontal travel removed')
    pack['clips'][clip]={**new['clips'][clip],'sourceFile':metadata['sourceFile'],'sourceSha256':metadata['sha256']}
    provenance['clips'][clip]=metadata
pack['source']='Adobe Mixamo: Breathing Idle / supplied Walking (1) / supplied Running (1) / Unarmed Jump'
provenance['downloadSettingsNote']='Settings recorded above apply to the original downloads. User-supplied walk/run settings are not independently confirmed; baked runtime is 60 fps.'
runtime.write_text('/* Retargeted motion; rebuild: python scripts/replace-player-locomotion.py */\nwindow.QUARTER_MIXAMO='+json.dumps(pack,separators=(',',':'))+';\n',encoding='utf-8')
provenance_path.write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8')
print('Replaced walk/run; retained idle/jump')
