"""The Rocketbox body catalogue (L2, owner 2026-11-05: outfits lore-bound): every Rocketbox person and every person opened
from a locked face, with who they are (sex, apparent age, people) and what their body's clothes may stand for once the
outfit bake (rb_outfit.py) has re-dyed them and taken off their prints and insignia: a style, and the outfit roles
(Core Outfits) a body of that style dresses. Silhouettes the wardrobe rule forbids whatever their colour are left out
with the reason: farmer's dungarees, sportswear and swimwear, party clothes, a chef's whites and hairnet, masks and
helmets that hide the face, religious dress.
Usage: python rb_bodies.py <outfit bake dir (per person: outfit.json)> > data/rb_bodies.json"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda n: json.load(open(os.path.join(HERE, 'data', n)))
AGES = D('rocketbox_ages.json')['ages']
ANC = D('rocketbox_ancestry.json')['ancestry']
GEAR = D('rocketbox_gear.json')['gear']
OPENED = D('opened_v1.json')['jobs']

# style -> the outfit roles a body of that style can dress (Core Outfits.Roles)
ROLES = {
    'work':    ['labourer', 'settler', 'fisher', 'drifter', 'nomad', 'tech', 'raider'],
    'casual':  ['settler', 'trader', 'street', 'tech', 'drifter', 'nomad', 'pilgrim', 'medic'],
    'street':  ['street', 'raider', 'tech', 'drifter'],
    'coat':    ['trader', 'settler', 'tech', 'nomad', 'drifter', 'medic'],
    'formal':  ['corp', 'gilded'],
    'medic':   ['medic'],
    'field':   ['guard', 'raider', 'nomad', 'labourer', 'drifter'],
    'heavy':   ['labourer', 'guard', 'raider'],
    'shirt':   ['guard', 'trader', 'settler', 'tech', 'corp'],
}
# each body's style, from its clothes as shipped (docs/evidence/unity/p4/outfits/as_shipped_*.jpg)
STYLE = {
    'Business_Female_01': 'formal', 'Business_Female_02': 'formal', 'Business_Female_03': 'formal', 'Business_Female_04': 'formal',
    'Business_Male_01': 'formal', 'Business_Male_02': 'formal', 'Business_Male_03': 'formal', 'Business_Male_04': 'formal',
    'Business_Male_05': 'formal', 'Business_Male_06': 'shirt', 'Business_Male_07': 'shirt',
    'Construction_Female_01': 'work', 'Construction_Male_02': 'work', 'Construction_Male_03': 'work', 'Construction_Male_05': 'work',
    'Construction_Male_06': 'work', 'Construction_Male_07': 'work', 'Construction_Male_08': 'work',
    'Delivery_Male_01': 'work', 'Gardener_Male_01': 'work', 'Wood_Male_01': 'work',
    'Female_Adult_01': 'casual', 'Female_Adult_02': 'casual', 'Female_Adult_03': 'street', 'Female_Adult_04': 'street',
    'Female_Adult_05': 'formal', 'Female_Adult_07': 'casual', 'Female_Adult_08': 'casual', 'Female_Adult_09': 'coat',
    'Female_Adult_11': 'casual', 'Female_Adult_12': 'street', 'Female_Adult_13': 'casual', 'Female_Adult_14': 'casual',
    'Female_Adult_15': 'casual', 'Female_Adult_17': 'casual',
    'Male_Adult_01': 'casual', 'Male_Adult_02': 'casual', 'Male_Adult_03': 'coat', 'Male_Adult_04': 'street',
    'Male_Adult_05': 'work', 'Male_Adult_06': 'casual', 'Male_Adult_07': 'casual', 'Male_Adult_08': 'casual',
    'Male_Adult_09': 'street', 'Male_Adult_10': 'street', 'Male_Adult_11': 'casual', 'Male_Adult_12': 'casual',
    'Male_Adult_13': 'casual', 'Male_Adult_14': 'casual', 'Male_Adult_16': 'casual', 'Male_Adult_17': 'street',
    'Male_Adult_18': 'street', 'Male_Adult_20': 'street',
    'Medical_Female_01': 'medic', 'Medical_Female_02': 'medic', 'Medical_Female_03': 'work',
    'Medical_Male_01': 'medic', 'Medical_Male_02': 'work', 'Medical_Male_03': 'medic',
    'Military_Female_01': 'field', 'Military_Female_02': 'field', 'Military_Male_01': 'field', 'Military_Male_02': 'field',
    'Military_Male_03': 'field', 'Military_Male_04': 'field', 'Military_Male_05': 'field', 'Military_Male_06': 'field',
    'Pilot_Female_01': 'shirt', 'Pilot_Female_02': 'shirt', 'Pilot_Male_01': 'shirt', 'Pilot_Male_02': 'shirt', 'Pilot_Male_03': 'shirt',
    'Police_Male_01': 'shirt', 'Police_Male_03': 'shirt', 'Police_Male_04': 'shirt', 'Police_Male_05': 'shirt',
    'Police_Male_06': 'field', 'Police_Male_07': 'field', 'Security_Female_01': 'shirt', 'Security_Male_01': 'shirt',
    'Fire_Male_01': 'heavy', 'Fire_Male_02': 'heavy', 'Fire_Male_03': 'heavy', 'Fire_Male_04': 'heavy', 'Fire_Male_05': 'heavy',
    'Fire_Male_06': 'heavy', 'Fire_Male_07': 'heavy', 'Fire_Female_01': 'heavy', 'Fire_Female_02': 'heavy', 'Fire_Female_03': 'heavy',
    'Sports_Female_02': 'street', 'Sports_Male_04': 'casual',
}
OUT = {
    'Construction_Male_04': "farmer's dungarees (owner rule: no dungarees)",
    'Construction_Male_01': 'a welder\'s visor down over the face',
    'Chef_Female_01': "a chef's whites and a hairnet (costume)",
    'Female_Party_01': 'party clothes (modern fashion)', 'Female_Party_02': 'party clothes (modern fashion)',
    'Sports_Female_01': 'swimwear', 'Sports_Male_01': 'swimwear', 'Sports_Male_02': 'a football kit', 'Sports_Male_03': 'a football kit',
    'Medical_Male_04': 'a surgical mask and cap over the face', 'Medical_Male_05': 'a surgical mask and gown over the face',
    'Female_Adult_06': 'religious dress', 'Female_Adult_10': 'religious dress', 'Male_Adult_15': 'religious dress',
    'Male_Adult_19': 'religious dress', 'Male_Adult_21': 'religious dress',
    'Police_Female_01': 'a riot helmet over the face', 'Police_Male_02': 'a balaclava and helmet over the face',
    'Military_Male_06': 'a cap left on (its face is used opened, the Black picks)',
    'Male_Adult_18': 'a hood up over the head (its face is carried onto a whole head, the Black picks)',
}
FACE_GEAR = {'helmet', 'mask', 'cap', 'hat', 'beret', 'hood', 'beanie', 'balaclava', 'hijab', 'keffiyeh', 'skullcap', 'visor', 'headset', 'goggles'}


def people_of(n):
    a = ANC.get(n, '?').rstrip('?')
    return a if a and a not in ('unseen', 'masked') else None


def own_eligible(g):
    """a garment that may keep its own colour: denim (blue, low chroma), leather and dark work cloth"""
    L, a, b = g['lab']
    import math
    ch = math.hypot(a, b); hue = math.degrees(math.atan2(b, a)) % 360
    if 215 <= hue <= 285 and 5 <= ch <= 28 and 18 <= L <= 62 and g['part'] == 'legs': return 'denim'
    if 25 <= hue <= 80 and 8 <= ch <= 35 and 12 <= L <= 45: return 'leather'
    return None


def entry(n, src, bake, opened=None):
    sex = 'f' if 'Female' in n else 'm'
    base = opened['base'] if opened else n
    face = n
    if opened:
        lab = opened.get('label', '')
        face = lab.split("'s")[0].split(',')[0].strip() if lab else base
        if face not in AGES: face = base
    e = dict(id=opened['name'] if opened else n, source=src, sex=opened['sex'] if opened else sex,
             age=AGES.get(face), people=opened['people'] if opened else people_of(n), body=base, face=face)
    if opened: e['face_of'] = opened.get('label', '')
    # the face sculptor's shape keys: on every opened face's own export, and on a library body's calibration export
    e['sculpt'] = bool(opened) or bool(RBLIB and os.path.exists(os.path.join(RBLIB, n, n + '_sculpt.fbx')))
    style = STYLE.get(base)
    out = OUT.get(base) if not opened else None
    if not opened:
        g = set(x.lower() for x in GEAR.get(n, []))
        if g & FACE_GEAR and n not in STYLE_OK_GEAR: out = out or ('head gear left on: ' + ', '.join(sorted(g & FACE_GEAR)))
    if opened and base in OUT and base not in ('Female_Adult_06', 'Female_Adult_10', 'Male_Adult_15', 'Male_Adult_19', 'Male_Adult_21'):
        out = OUT[base]
    if style is None and out is None: out = 'no style assigned'
    e['style'] = style
    e['roles'] = ROLES.get(style, []) if not out else []
    if out: e['out'] = out
    oj = os.path.join(bake, e['id'], 'outfit.json')
    if os.path.exists(oj):
        o = json.load(open(oj))
        ch = {}
        for g in o['groups']:
            c = g.get('channel', -1)
            if c < 0 or c in ch: continue
            ch[c] = dict(part=g['part'], lab=g['lab'], own=own_eligible(g), pattern=g['pattern'])
        e['dye'] = [ch.get(c) for c in range(3)]
        e['body_mat'] = o['body_mat']
    else:
        e['dye'] = None
    return e


RBLIB = None   # the scratch library (rblib/), set by the main run

# head gear that is not over the face and reads as working kit (hard hats on labourers): kept
STYLE_OK_GEAR = {'Construction_Female_01', 'Construction_Male_02', 'Construction_Male_03', 'Construction_Male_05',
                 'Construction_Male_06', 'Construction_Male_07', 'Construction_Male_08', 'Wood_Male_01', 'Delivery_Male_01'}

if __name__ == '__main__':
    bake = sys.argv[1]
    S = os.path.dirname(os.path.dirname(os.path.abspath(bake)))
    rblib = os.path.join(os.path.dirname(os.path.abspath(bake.rstrip('/'))), '..', 'rblib')
    RBLIB = rblib
    people = []
    names = sorted(AGES.keys() | set(STYLE) | set(OUT))
    # (a locked face opened: the opened person stands for it, the capped original is not used)
    replaced = {j['base'] for j in OPENED if j['name'].startswith('cap_') and j['label'].startswith(j['base'])}
    replaced |= {j['label'].split("'s")[0] for j in OPENED}
    for n in names:
        e = entry(n, 'rblib/' + n, bake)
        if n in replaced and not e.get('out'):
            e['out'] = 'its face is used opened (people_final)'; e['roles'] = []
        people.append(e)
    for j in OPENED:
        people.append(entry(j['base'], 'people_final/' + j['name'], bake, opened=j))
    usable = [p for p in people if not p.get('out')]
    json.dump(dict(_about=__doc__.split('\n')[0] + ' Generated by tools/unity/people/rb_bodies.py.',
                   roles_by_style=ROLES, people=people,
                   counts=dict(all=len(people), usable=len(usable),
                               women=sum(1 for p in usable if p['sex'] == 'f'), men=sum(1 for p in usable if p['sex'] == 'm'))),
              sys.stdout, indent=1)
