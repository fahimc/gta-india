"""Combine the three converted Mixamo motion-only files into one bake source."""
import copy
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'assets/animations'
document, binary = None, bytearray()
for name in ['idle', 'walk', 'run', 'jump']:
    raw = (root / f'{name}.glb').read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    source = json.loads(raw[20:20 + length])
    data = raw[28 + length:]
    if document is None:
        document = copy.deepcopy(source)
        document['bufferViews'] = []
        document['accessors'] = []
        document['animations'] = []
    else:
        assert source['nodes'] == document['nodes'], 'Source rigs differ; retarget separately'
    views, accessors = len(document['bufferViews']), len(document['accessors'])
    for view in source['bufferViews']:
        view['byteOffset'] = view.get('byteOffset', 0) + len(binary)
        document['bufferViews'].append(view)
    for accessor in source['accessors']:
        accessor['bufferView'] += views
        document['accessors'].append(accessor)
    for animation in source['animations']:
        animation['name'] = name
        for sampler in animation['samplers']:
            sampler['input'] += accessors
            sampler['output'] += accessors
        document['animations'].append(animation)
    binary.extend(data)
    binary.extend(b'\0' * (-len(binary) % 4))
document['buffers'] = [dict(byteLength=len(binary))]
json_bytes = json.dumps(document, separators=(',', ':')).encode()
json_bytes += b' ' * (-len(json_bytes) % 4)
output = struct.pack('<III', 0x46546c67, 2, 28 + len(json_bytes) + len(binary))
output += struct.pack('<II', len(json_bytes), 0x4e4f534a) + json_bytes
output += struct.pack('<II', len(binary), 0x004e4942) + binary
(root / 'mixamo-direct.glb').write_bytes(output)
print('Combined downloaded clips:', len(output), 'bytes')
