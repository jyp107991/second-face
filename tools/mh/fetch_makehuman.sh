#!/usr/bin/env bash
# Fetch the CC0 MakeHuman 1.2.0 asset data (base mesh, targets, skins, rigs, proxies) into $1 (default: .mh_src).
# Only the *assets* are used (CC0 1.0); no MakeHuman source code (AGPL) is used or shipped.
set -euo pipefail
OUT="${1:-.mh_src}"
mkdir -p "$OUT"
ZIP="$OUT/mhmac.zip"
[ -f "$ZIP" ] || curl -sSL -o "$ZIP" https://download.tuxfamily.org/makehuman/releases/makehuman-community-1.2.0-macos.zip
python3 -I - "$ZIP" "$OUT" <<'PY'
import os, sys, zipfile
zpath, out = sys.argv[1], sys.argv[2]
pre = 'MakeHuman.app/Contents/Resources/makehuman/data/'
keep = ('3dobjs/', 'targets/', 'rigs/', 'skins/', 'eyes/', 'eyebrows/', 'eyelashes/', 'hair/', 'teeth/', 'tongue/',
        'proxymeshes/', 'clothes/', 'expressions/', 'poseunits/', 'modifiers/', 'animations/', 'poses/')
z = zipfile.ZipFile(zpath)
n = 0
for i in z.infolist():
    if not i.filename.startswith(pre) or i.is_dir():
        continue
    rel = i.filename[len(pre):]
    if not rel.startswith(keep):
        continue
    dst = os.path.join(out, 'data', rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'wb') as f:
        f.write(z.read(i))
    n += 1
print('extracted', n, 'files to', os.path.join(out, 'data'))
PY
