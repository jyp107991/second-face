"""Brings the staged combat set into the Unity project (COMBAT.md WP2): the v3 clips (MANIFEST.json's `use`, `use_with_ik`
and `stopgap_hand_keyed` groups; `do_not_use` stays out) to Assets/SecondFace/Combat/Motion/, and the 13 weapons (FBX,
sidecar, both lore variants' maps) to Assets/SecondFace/Combat/Weapons/<name>/. Each file gets a .meta with a stable GUID
(an MD5 of the project path, so a re-run writes the same GUIDs and nothing that refers to them breaks). The import
settings themselves are the editor's (Editor/Build/CombatImportPostprocessor.cs): Humanoid, avatar from the T-pose bind,
loop and root motion per clip from Core's CombatMotion table.

Each clip's sidecar is copied with an `events` block filled in where the staging left none: the impact frame of a strike
(the striking hand's fastest frame), a throw's release (the throwing hand's), read off the FBX's own curves by
clip_events.py. Existing events (a rifle's fire frames, a reload's magazine) are kept as staged.

    python3 -I tools/unity/combat/stage_combat.py <staging combat dir> <unity Assets dir>
"""
import hashlib, json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import clip_events  # noqa: E402


def guid(rel):
    return hashlib.md5(('secondface-combat:' + rel).encode()).hexdigest()


def meta(path, rel, kind):
    g = guid(rel)
    if kind == 'folder':
        body = f'fileFormatVersion: 2\nguid: {g}\nfolderAsset: yes\nDefaultImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    elif kind == 'text':
        body = f'fileFormatVersion: 2\nguid: {g}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'
    else:
        # (models and textures: the importer's settings are the postprocessor's; Unity fills in the rest on import)
        body = f'fileFormatVersion: 2\nguid: {g}\n'
    with open(path + '.meta', 'w') as f:
        f.write(body)


def folder(assets, rel):
    os.makedirs(os.path.join(assets, rel), exist_ok=True)
    meta(os.path.join(assets, rel), 'Assets/' + rel, 'folder')


def main(staging, assets):
    v3 = os.path.join(staging, 'v3')
    man = json.load(open(os.path.join(v3, 'MANIFEST.json')))
    folder(assets, 'SecondFace/Combat')
    folder(assets, 'SecondFace/Combat/Motion')
    folder(assets, 'SecondFace/Combat/Weapons')
    names = []
    for group in ('use', 'use_with_ik', 'stopgap_hand_keyed'):
        for name, entry in man[group].items():
            names.append((name, group, entry))
    for name, group, entry in sorted(names):
        rel = f'SecondFace/Combat/Motion/{name}'
        shutil.copyfile(os.path.join(v3, name + '.fbx'), os.path.join(assets, rel + '.fbx'))
        meta(os.path.join(assets, rel + '.fbx'), 'Assets/' + rel + '.fbx', 'model')
        side = json.load(open(os.path.join(v3, name + '.json')))
        side['group'] = group
        if 'why' in entry: side['qa_why'] = entry['why']
        ev = side.get('events') or {}
        found = clip_events.events_for(os.path.join(v3, name + '.fbx'), name, side)
        for k, v in found.items():
            ev.setdefault(k, v)
        if ev: side['events'] = ev
        with open(os.path.join(assets, rel + '.json'), 'w') as f:
            json.dump(side, f, indent=1)
            f.write('\n')
        meta(os.path.join(assets, rel + '.json'), 'Assets/' + rel + '.json', 'text')
    wdir = os.path.join(staging, 'weapons')
    for w in sorted(os.listdir(wdir)):
        src = os.path.join(wdir, w)
        if not os.path.isdir(src): continue
        folder(assets, f'SecondFace/Combat/Weapons/{w}')
        for fn in sorted(os.listdir(src)):
            ext = os.path.splitext(fn)[1].lower()
            if ext not in ('.fbx', '.json', '.png', '.jpg'): continue
            rel = f'SecondFace/Combat/Weapons/{w}/{fn}'
            shutil.copyfile(os.path.join(src, fn), os.path.join(assets, rel))
            meta(os.path.join(assets, rel), 'Assets/' + rel, 'text' if ext == '.json' else 'model')
    print(f'{len(names)} clips, {len([d for d in os.listdir(wdir) if os.path.isdir(os.path.join(wdir, d))])} weapons')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
