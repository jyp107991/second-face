// Dump a glTF's skin joints (names, parents, rest transforms) and its animation clips.
import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const skin = root.listSkins()[0];
const joints = skin.listJoints();
console.log('joints', joints.length);
const parentOf = new Map();
for (const n of root.listNodes()) for (const c of n.listChildren()) parentOf.set(c, n);
const f3 = (a) => a.map((v) => v.toFixed(3)).join(',');
for (const j of joints) {
  const p = parentOf.get(j);
  console.log(j.getName(), '<', p ? p.getName() : '-', 't', f3(j.getTranslation()), 'r', f3(j.getRotation()), 's', f3(j.getScale()));
}
console.log('--- clips');
for (const a of root.listAnimations()) {
  const ch = a.listChannels();
  const s0 = ch[0]?.getSampler();
  const times = s0?.getInput();
  const n = times?.getCount() ?? 0;
  const dur = n ? times.getElement(n - 1, [])[0] : 0;
  const paths = new Set(ch.map((c) => c.getTargetPath()));
  console.log(a.getName(), 'channels', ch.length, 'frames', n, 'dur', dur.toFixed(2), 'paths', [...paths].join('/'), 'interp', s0?.getInterpolation());
}
