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
- Bases: the Rocketbox people of the sex whose group (judged by eye, data/rocketbox_ancestry.json) is nearest the target,
  in the order given (Indigenous Americans and Pacific Islanders from East Asian faces first: their nearest relatives
  among the library's peoples); never one in headgear, never a bearded one for a people whose men's beards are sparse,
  never one in a religious head covering outside its own people; a dark photograph is never lightened by more than a
  third (it turns ashy)."""
import random

CANDELA = {'Brazil': (0.09, 0.82, 0.09), 'Chile': (0.48, 0.49, 0.05), 'Colombia': (0.29, 0.60, 0.11),
           'Mexico': (0.56, 0.37, 0.05), 'Peru': (0.64, 0.29, 0.0)}      # (American, European, African)
TONE = {'north_european': -0.35, 'mediterranean': -0.18, 'east_asian': -0.23, 'southeast_asian': -0.12, 'south_asian': 0.08,
        'latin_american': -0.07, 'indigenous_american': 0.08, 'east_african': 0.77, 'west_african': 0.81}
UNDERTONE = {'east_asian': 0.35, 'southeast_asian': 0.35, 'south_asian': 0.15, 'latin_american': 0.15, 'indigenous_american': 0.15,
             'north_european': -0.3, 'mediterranean': -0.05}
# the VALID group a Rocketbox base of a given (by-eye) people is taken as, for the difference
SOURCE = {'north_european': 'White', 'mediterranean': 'MENA', 'latin_american': 'Hispanic', 'east_asian': 'Asian',
          'southeast_asian': 'Asian', 'west_african': 'Black'}
BASES = {
    'latin_american': ['latin_american', 'mediterranean', 'north_european'],
    'indigenous_american': ['east_asian', 'southeast_asian', 'latin_american', 'mediterranean'],
    'mediterranean': ['mediterranean', 'latin_american', 'north_european'],
    'west_african': ['west_african', 'latin_american', 'mediterranean'],
    'east_african': ['west_african', 'mediterranean', 'latin_american'],
    'east_asian': ['east_asian', 'southeast_asian', 'latin_american'],
    'southeast_asian': ['southeast_asian', 'east_asian', 'latin_american'],
    'pacific': ['east_asian', 'southeast_asian', 'latin_american', 'mediterranean'],
}
# a base is never: wearing headgear (data/rocketbox_gear.json: helmet, hat, mask); bearded, for a people whose men's beards
# are sparse (Core PEOPLE_RESEARCH §6: East and Southeast Asian, Indigenous American men; Pacific Islanders by their
# validated faces); or, outside its own people, wearing a religious head covering
HEADGEAR = ('helmet', 'hat', 'mask')
SPARSE_BEARD = {'east_asian', 'southeast_asian', 'indigenous_american', 'pacific'}
OWN_PEOPLE_ONLY = {'Female_Adult_10': 'mediterranean', 'Male_Adult_15': 'mediterranean'}   # a hijab, a skullcap (judged by eye)


def base_ok(base, target, gear, beards):
    if any(g in gear.get(base, []) for g in HEADGEAR): return False
    if target in SPARSE_BEARD and base in beards: return False
    if base in OWN_PEOPLE_ONLY and OWN_PEOPLE_ONLY[base] != target: return False
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
