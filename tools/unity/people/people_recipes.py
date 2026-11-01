"""Recipes for harmonised people (owner, 2026-11-01): for each of the game's ancestries (Core Faces.Ancestries), what
VALID shape mixture a person takes, which Rocketbox people make the nearest starting faces, and the person's colouring;
each with its evidence. Used by harmonise_batch.py.
- Latin American: a mixture of Indigenous American, European and African ancestry in the proportions measured per
  country (Ruiz-Linares et al. 2014, PLoS Genet 10:e1004572, CANDELA, 7,342 people, Table 1: American / African /
  European ancestry Brazil 0.09/0.09/0.82, Chile 0.48/0.05/0.49, Colombia 0.29/0.11/0.60, Mexico 0.56/0.05/0.37, Peru
  0.64/0.00/0.29; its samples are urban and student-heavy, so lean European). Each person draws a country, then their own
  proportions around its mean (a Dirichlet of concentration 12); the European part takes VALID's White shape and the
  Mediterranean tone (Latin America's European ancestry is mostly Iberian); the skin tone is the mixture of the three
  peoples' tones. Never made from a Black base.
- East African (the Horn): VALID's Black shape with 25-45 % of its Middle Eastern one (Pagani et al. 2012, AJHG
  91:83: some Ethiopians carry 40-50 % of their genome closer to non-African, Levant-like, populations).
- Indigenous American, Middle Eastern / North African (the game's Mediterranean), West African, East Asian: VALID's own
  validated group. Southeast Asian: VALID's Asian group with the Southeast Asian tone (VALID has no Southeast Asian
  group: flagged). Pacific Islander men: VALID's NHPI (no woman of that group was validated). South Asian: no validated
  source in either library, so none are made until one is found.
- Bases: a face (a Rocketbox person, or the several people the library dresses in one face: rocketbox_identities.py)
  serves at most two peoples, and only two close to each other (RELATED), each time with its own draw of the sliders.
  Faces are given out by nearness: every people first takes the faces of its own people (judged by eye,
  data/rocketbox_ancestry.json), then the next-nearest people's in the order given (Indigenous Americans and Pacific
  Islanders from East Asian faces first: their nearest relatives among the library's peoples; Black Africans from
  European faces only last, as the library has one usable Black woman's face and one Black man's), the scarcest
  peoples choosing first at each step (ORDER). Never one in headgear (unless it comes off cleanly), never a bearded one
  for a people whose men's beards are sparse, never one in religious dress (owner: anachronistic in this world); a dark
  photograph is never lightened by more than a third (it turns ashy)."""
import random

CANDELA = {'Brazil': (0.09, 0.82, 0.09), 'Chile': (0.48, 0.49, 0.05), 'Colombia': (0.29, 0.60, 0.11),
           'Mexico': (0.56, 0.37, 0.05), 'Peru': (0.64, 0.29, 0.0)}      # (American, European, African)
TONE = {'north_european': -0.35, 'mediterranean': -0.18, 'east_asian': -0.23, 'southeast_asian': -0.12, 'south_asian': 0.08,
        'latin_american': -0.07, 'indigenous_american': 0.08, 'east_african': 0.77, 'west_african': 0.81}
UNDERTONE = {'east_asian': 0.35, 'southeast_asian': 0.35, 'south_asian': 0.15, 'latin_american': 0.15, 'indigenous_american': 0.15,
             'north_european': -0.3, 'mediterranean': -0.05}
# each slider's two ends, as its shapes are named (Sculpt.cs)
SIDES = {'eye-trans': ('in', 'out'), 'brow-ridge': ('backward', 'forward'), 'mouth-trans': ('backward', 'forward')}
# the VALID group a Rocketbox base of a given (by-eye) people is taken as, for the difference
SOURCE = {'north_european': 'White', 'mediterranean': 'MENA', 'latin_american': 'Hispanic', 'east_asian': 'Asian',
          'southeast_asian': 'Asian', 'west_african': 'Black'}
BASES = {
    'latin_american': ['latin_american', 'mediterranean', 'north_european'],
    'indigenous_american': ['east_asian', 'southeast_asian', 'latin_american', 'mediterranean'],
    'mediterranean': ['mediterranean', 'latin_american', 'north_european'],
    'west_african': ['west_african', 'latin_american', 'mediterranean', 'north_european'],
    'east_african': ['west_african', 'mediterranean', 'latin_american', 'north_european'],
    'east_asian': ['east_asian', 'southeast_asian'],
    'southeast_asian': ['southeast_asian', 'east_asian'],
    'pacific': ['latin_american', 'east_asian', 'southeast_asian'],
}
# the peoples in the order they take their bases at each step of nearness (harmonise_batch.plan): the scarcest first, so
# each base serves the people that most needs it. East Asians are not made: the library has its own East Asian faces
# (as shipped, with the calibrated sliders), and those few faces are needed as the nearest bases for Indigenous
# Americans, Southeast Asians and Pacific Islanders, whom it lacks
ORDER = ['west_african', 'east_african', 'pacific', 'indigenous_american', 'southeast_asian', 'mediterranean', 'latin_american']
# a base is never: wearing headgear (data/rocketbox_gear.json: helmet, hat, mask); bearded, for a people whose men's beards
# are sparse (Core PEOPLE_RESEARCH §6: East and Southeast Asian, Indigenous American men; Pacific Islanders by their
# validated faces); or in religious dress
HEADGEAR = ('helmet', 'hat', 'mask')
SPARSE_BEARD = {'east_asian', 'southeast_asian', 'indigenous_american', 'pacific'}


# deleted from a gear_off base (rocketbox_gear_off.py): these materials, and loose pieces left above the brow (goggles)
GEAR_OFF = ('helmet', 'hat', 'mask', 'flashlight', 'tools', 'equipment', 'knife', 'pistol', 'gun', 'loose_above_brow')
# a base may serve two peoples at most, and only peoples close to each other, each time with its own draw of the
# calibrated sliders (so the two are two people, not one face twice)
RELATED = [{'east_asian', 'southeast_asian', 'indigenous_american', 'pacific'}, {'west_african', 'east_african'},
           {'latin_american', 'mediterranean'}]
MAX_USES = 2


def base_ok(base, target, gear, beards, review=None, hair=None):
    rv = review or {}
    # light (blonde or light brown) hair, data/rocketbox_hair.json, only for a people whose hair is light too: part of it is
    # painted on the scalp, lighter than the skin, and would stay blonde on a person whose hair is dark
    if target != 'north_european' and (hair or {}).get(base, {}).get('light'): return False
    # a Black person's hair is afro-textured or cropped (owner): a base whose loose hair falls below the ears cannot have
    # its hair changed (hair_graft.py), so it never serves a Black people
    if target in ('west_african', 'east_african') and base in rv.get('hair_long', []): return False
    if any(g in gear.get(base, []) for g in HEADGEAR) and base not in rv.get('gear_off', []): return False
    r = rv.get('people', {}).get(base, {})
    if r.get('headwear') in ('hat', 'cap', 'hood', 'helmet'): return False
    # no religious dress at all (owner, 2026-11-01: anachronistic in this world): a hijab and a skullcap are modelled in
    # the head, and under a keffiyeh there is no scalp, so these people wait for a scalp and hair grafted from another head
    if r.get('headwear') in ('hijab', 'keffiyeh', 'skullcap'): return False
    if target in SPARSE_BEARD and r.get('beard') in ('full', 'goatee', 'moustache', 'stubble'): return False
    if target in SPARSE_BEARD and base in beards: return False
    return True


def recipe(ancestry, rng: random.Random):
    """(VALID mixture spec, tone, undertone, hair cluster, eyes cluster, note) for one person of a people."""
    jitter = rng.gauss(0, 0.1)
    if ancestry == 'latin_american':
        country = rng.choice(list(CANDELA))
        a = [rng.gammavariate(max(m, 0.01) * 12, 1) for m in CANDELA[country]]
        s = sum(a); am, eu, af = (x / s for x in a)
        spec = f'AIAN:{am:.2f}+White:{eu:.2f}+Black:{af:.2f}'
        tone = am * TONE['indigenous_american'] + eu * TONE['mediterranean'] + af * TONE['west_african'] + jitter
        und = am * UNDERTONE['indigenous_american'] + eu * UNDERTONE['mediterranean']
        return spec, tone, und, 'latin_american', 'latin_american', f'{country}: American {am:.2f}, European {eu:.2f}, African {af:.2f}'
    if ancestry == 'east_african':
        m = rng.uniform(0.25, 0.45)
        return f'Black:{1 - m:.2f}+MENA:{m:.2f}', TONE['east_african'] + jitter, 0.0, 'east_african', 'east_african', f'Levant-like share {m:.2f}'
    group = {'indigenous_american': 'AIAN', 'mediterranean': 'MENA', 'west_african': 'Black', 'east_asian': 'Asian',
             'southeast_asian': 'Asian', 'pacific': 'NHPI'}[ancestry]
    cl = 'southeast_asian' if ancestry == 'pacific' else ancestry
    return group, TONE[cl] + jitter, UNDERTONE.get(cl, 0.0), cl, cl, ''
