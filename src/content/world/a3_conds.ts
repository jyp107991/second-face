import type { GameState } from '../../engine/core/state';
import { test, type Cond } from '../../engine/world/logic';

/**
 * Act 3 and the endings (B6): the conditions every Act 3 slice shares. The Long Night (B5d) and the arcology slice (B4b,
 * parked off main) are read ONLY through this file: no other B6 file names one of their flags. Then the Act 3 state
 * the slices pass to each other, the gates of the five endings, the modifiers the epilogue reads (`modValue`), the
 * muster's needs, the readiness acts, the amendment's clauses, and at the end the registry of Act 3's flags (each with its
 * values, so the next slice reads without guessing). Nothing here sums good and evil: every gate reads local state (flags,
 * a settlement's standing, a faction's respect, a person's trust, a companion's approval).
 * Story notes: story/B6_NOTES_SECRET.md (§1 the reads, §4 the gates, §5 the modifiers; "As built" for the B5d mapping).
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const NOT = (c: Cond): Cond => ({ not: c });

// ---------------------------------------------------------------- the companions

export const TAMSIN = 'npc_c9_03', WREN = 'npc_rd_03', ILYA = 'npc_sh_17', ODILE = 'npc_nb_03', ASH = 'npc_of_03', NINE = 'npc_md_nine', KES = 'npc_hs_01';
export type CompanionKey = 'tamsin' | 'wren' | 'ilya' | 'odile' | 'ash' | 'nine' | 'kes';

/** Each companion's own flags (U8): the join, the leaving (any `<c>_left` value; a won-back companion has it cleared to
 * false), and what puts them out of the story for good (gone home, gone for good, dead). */
export const COMPANIONS: Record<CompanionKey, { id: string; joined: string; left: string; gone?: Cond }> = {
  tamsin: { id: TAMSIN, joined: 'tam_joined', left: 'tam_left', gone: ANY(F('tam_home'), F('a3_tamsin_dead')) },
  wren: { id: WREN, joined: 'wren_joined', left: 'wren_left', gone: F('wren_hanged') },
  ilya: { id: ILYA, joined: 'ilya_recruited', left: 'ilya_left' },
  odile: { id: ODILE, joined: 'odile_joined', left: 'odile_left', gone: F('odile_gone') },
  ash: { id: ASH, joined: 'ash_joined', left: 'ash_left', gone: ANY(F('ash_gone'), F('a3_ash', 'self')) },
  nine: { id: NINE, joined: 'nine_joined', left: 'nine_left', gone: ANY(F('nine_gone'), F('nine_disposed'), F('a3_nine_struck')) },
  kes: { id: KES, joined: 'kes_joined', left: 'kes_left' },
};
export const COMPANION_KEYS = Object.keys(COMPANIONS) as CompanionKey[];
/** On the player's side: joined, not left, not gone. Travelling (`inParty`) or waiting somewhere; these gather at the
 * Spire's close in Act 3 (21a). */
export const ON_SIDE = (c: CompanionKey): Cond => {
  const d = COMPANIONS[c];
  return ALL(F(d.joined), NOT(F(d.left)), ...(d.gone ? [NOT(d.gone)] : []));
};
export const IN = (id: string): Cond => ({ inParty: id });

// ---------------------------------------------------------------- §1.1 the Long Night (B5d), reconciled to its real flags

/** Act 2 is closed: the Long Night's dawn has come and the alliance is decided. Act 3 opens on it. */
export const LN_DONE: Cond = F('ln_done');
/** The Long Night's alliance (`ln_alliance`). B5d adds a fifth side, `none` (the player stood with nobody and the forecast
 * was kept). With `ln_done` but no alliance (a hand-made state), the alliance reads as `truce`: the safe default. */
export type Side = 'choir' | 'guild' | 'ledger' | 'truce' | 'none';
export const SIDES: Side[] = ['choir', 'guild', 'ledger', 'truce', 'none'];
export const LN = (side: Side): Cond => (side === 'truce' ? ANY(F('ln_alliance', 'truce'), ALL(LN_DONE, NOT(F('ln_alliance')))) : F('ln_alliance', side));
/** How the night came out for the side chosen (`ln_band`: strong ≥ 4, mixed 2–3, thin ≤ 1; a truce and none have their own). */
export type Band = 'strong' | 'mixed' | 'thin' | 'truce' | 'none';
export const LN_BAND = (b: Band): Cond => F('ln_band', b);
/** What Openfield is at the dawn (`ln_openfield`). */
export const OPENFIELD = (v: 'stands' | 'scorched' | 'guild' | 'evicted' | 'burned'): Cond => F('ln_openfield', v);
/** Keystone 8 as the plan's alias names it: Openfield burned in the Long Night. */
export const MASON_BURNED: Cond = OPENFIELD('burned');
/** Keystone 8 itself (`ks_mason` = lives | dead | exiled). Unset reads as alive. `MASON_SCARRED`: pulled out of the burning
 * door alive. */
export const MASON_DEAD: Cond = F('ks_mason', 'dead');
export const MASON_EXILED: Cond = F('ks_mason', 'exiled');
export const MASON_LIVES: Cond = NOT(MASON_DEAD);
export const MASON_SCARRED: Cond = F('ln_mason_burned');
/** Keystone 7 (`ks_calla` = free | imprisoned; `ln_calla` = freed | taken). B5d never kills her: `CALLA_DEAD` reads only her
 * own body (a later fight). With the night over and nothing set, she reads as held (the safe default). */
export const CALLA_DEAD: Cond = { dead: 'npc_sh_05' };
export const CALLA_FREE: Cond = ALL(NOT(CALLA_DEAD), ANY(F('ks_calla', 'free'), F('ln_calla', 'freed')));
export const CALLA_HELD: Cond = ALL(NOT(CALLA_DEAD), NOT(CALLA_FREE), ANY(F('ks_calla', 'imprisoned'), ALL(LN_DONE, NOT(F('ks_calla')))));
/** Keystone 9 touched in the Long Night (`ks_sarr` = dead, `ln_sarr` = lives | dead), or her body. Unset reads as alive. */
export const SARR_DEAD: Cond = ANY(F('ks_sarr', 'dead'), F('ln_sarr', 'dead'), { dead: 'npc_nb_01' });
export const SARR_ALIVE: Cond = NOT(SARR_DEAD);
/** Kennel Seven, the Ashlands' reserve (`an_reserve` = concern | sealed | player | leaderless). The plan's three aliases,
 * plus B5d's fourth state: the command unit broken, the reserve nobody's (`HOUNDS_FERAL`). Unset or sealed: asleep. */
export const HOUNDS_PLAYER: Cond = F('an_reserve', 'player');
export const HOUNDS_CONCERN: Cond = F('an_reserve', 'concern');
export const HOUNDS_FERAL: Cond = F('an_reserve', 'leaderless');
export const HOUNDS_ASLEEP: Cond = NOT(ANY(HOUNDS_PLAYER, HOUNDS_CONCERN, HOUNDS_FERAL));
/** The guild's hounds made to lie down with the core at the Long Night. */
export const HOUNDS_LAID_DOWN: Cond = F('ln_hounds', 'stood_down');
/** Ash's red line crossed on the night (`ash_redline` = longnight); B6 reads only that he is gone. */
export const ASH_LN_REDLINE: Cond = F('ash_redline', 'longnight');
export const ASH_GONE: Cond = F('ash_gone');
/** Ash's orders refused: before the night, or at the knife itself (`refused_late`). */
export const ASH_REFUSED: Cond = ANY(F('ash_orders', 'refused'), F('ash_orders', 'refused_late'));
/** The city's unit as the night leaves it (a real U8 flag; the night only reads it). */
export const NINE_CONSCIENCE: Cond = F('nine_stance', 'conscience');
export const NINE_DEPUTY: Cond = F('nine_stance', 'deputy');
export const NINE_BACK: Cond = F('ln_nine_back');
/** The night's other leavings Act 3 reads. */
export const LN_PEOPLE = (v: 'heard' | 'outside' | 'removed' | 'relocated'): Cond => F('ln_people', v);
export const LN_STORES = (v: 'choir' | 'guild' | 'half' | 'precinct' | 'split' | 'shore' | 'north' | 'lost'): Cond => F('ln_stores', v);
export const LN_OWED: Cond = F('ln_owed');
export const LN_CITY_WARRANT: Cond = F('ln_city_warrant');
export const LN_FORECAST_KEPT: Cond = F('ln_forecast_kept');
export const LN_LEASH_SPREADS: Cond = F('ln_leash', 'spreads');
/** A pre-Scald board with nobody in it, for the mast (19b B): the shore's pump controller, the digger's, or the army's
 * shunter board out of Kelso's shed, still carried. */
export const MAST_BOARD: Cond = ANY({ item: 'j_controller' }, { item: 'j_tm_controller' }, { item: 'k_an_board' });
/** The same boards one by one (B6d hands one to the Hollow), each with what giving it away settles: the shunter's board is
 * B5d's `q_an_board`, which ends at the mast as it ends at Yard Nine or Spindle. */
export const MAST_BOARDS: { item: string; settles: { set: string; value: string }[] }[] = [
  { item: 'j_controller', settles: [] }, { item: 'j_tm_controller', settles: [] }, { item: 'k_an_board', settles: [{ set: 'an_board', value: 'mast' }] },
];

// ---------------------------------------------------------------- §1.2 the arcology slice (B4b, built): its flags, read only here

export const B4B = {
  inside: F('hc_inside'),
  done: F('a2_halcyon_done'),
  sotoMet: F('hc_soto_met'),
  offer: (v: 'accepted' | 'refused' | 'feigned'): Cond => F('hc_offer', v),
  contract: (v: 'citizen' | 'infiltrator' | 'guest'): Cond => F('hc_contract', v),
  leash: (v: 'cut' | 'sold' | 'seized' | 'left'): Cond => F('hc_leash', v),
  longlived: (v: 'exposed' | 'soto' | 'kept'): Cond => F('hc_longlived', v),
  reserve: F('hc_reserve'),
  clinic: F('hc_clinic'),
  kesContract: F('hc_kes_contract'),
  garden: (v: 'skirts' | 'openfield' | 'sold' | 'caught'): Cond => F('hc_garden', v),
  funicular: (v: 'down' | 'stayed' | 'reported'): Cond => F('hc_funicular', v),
};
/** Every flag the arcology slice's draft writes (for tests "with and without B4b"). */
export const B4B_FLAGS = ['hc_inside', 'a2_halcyon_done', 'hc_soto_met', 'hc_offer', 'hc_contract', 'hc_leash', 'hc_longlived', 'hc_reserve', 'hc_clinic', 'hc_kes_contract', 'hc_garden', 'hc_funicular'];
/** A buyer for what is under the Spire, from the arcology. Every B4b-fed key has an Act 3 alternate (C_BUYER below). */
export const C_BUYER_B4B: Cond = ANY(B4B.offer('accepted'), B4B.offer('feigned'));
/** Kes's lineage spoken; heard by the arcology's Chair only with B4b. */
export const KES_LINEAGE: Cond = F('kes_lineage', 'speak');
export const KES_LINEAGE_HEARD: Cond = ALL(KES_LINEAGE, B4B.inside);
/** The Skirts' strike still unsettled. B6 never arms its break (that would resolve it behind the player's back). */
export const STRIKE_OUT: Cond = NOT(F('hs_shift'));

// ---------------------------------------------------------------- Act 3's own state, shared between slices

export const A3_OPEN: Cond = F('a3_open');
export const ORDER_READ: Cond = F('a3_order_read');
/** The Sallow's places (19: `q_a3_return` reaches the Sallow at any of them, or by the road scenes' own flag). */
export const SALLOW_MAPS = ['c9_mouth', 'shale', 'drywells', 'overpass', 'tollhouse', 'signalhill', 'saltpan', 'orchard', 'wheel', 'windpumps', 'wild:sallow'];
export const IN_SALLOW: Cond = ANY(F('a3_in_sallow'), ...SALLOW_MAPS.map((m): Cond => ({ at: m })));
export const AT_KNOCK: Cond = F('a3_at_knock');
/** The guild at Knock (20a): the Long Night's guild side, a buyer from the arcology, or the guild holding the Line or the
 * kennel boards. B6f sets `a3_guild_in` from this; hounds on leads come with it when the guild has hounds to bring. */
export const GUILD_IN_PLAY: Cond = ANY(LN('guild'), C_BUYER_B4B, F('rc_line', 'guild'), F('nw_controllers', 'guild'));
export const HOUNDS_IN_PLAY: Cond = ALL(GUILD_IN_PLAY, ANY(F('nw_controllers', 'guild'), LN('guild'), HOUNDS_CONCERN));
/** Who leads the column: Lowe, or his sergeant if he is dead. Who leads the Unwritten: Petra, or `npc_a3_u1`. */
export const LOWE = 'npc_md_01', REYES = 'npc_md_12', PETRA = 'npc_of_02', HALE = 'npc_kn_out_lead', QUILL = 'npc_cr_11';
/** Lowe dead: before Act 3, or at the door (B6j: on the apron he stands as `npc_md_01_apron`, which `{ dead: LOWE }` does not see). */
export const LOWE_DEAD: Cond = ANY({ dead: LOWE }, { dead: `${LOWE}_apron` });
export const PETRA_DEAD: Cond = { dead: PETRA };
export const HALE_ALIVE: Cond = NOT({ dead: HALE });
/** The reserve's case at the Court won by a principle (20e: −30 to Lowe's stand-down). */
export const RESERVE_STAYED: Cond = ANY(F('ca_reserve', 'stayed'), F('ca_reserve', 'attendance'));

/** B6b: who holds Unit 9's title when the city recalls it ("the schedule reads the register"). An Act 3 outcome first
 * (`a3_nine_keeper`: the title bought at the gate, or the Court holding the unit its own keeper); then the Court's
 * registration (`ca_deed`); then an unregistered deed that was lawfully made (witnessed by a captain, or bought at the
 * desk); otherwise the city's (its own deed, a voided or unregistered forgery, or none). Later slices read these, never
 * `nine_deed` alone (Nine's break at the door, its epilogue slide). */
const DEED_UNREGISTERED_LAWFUL: Cond = ALL(NOT(F('ca_deed')), NOT(F('nine_deed_void')), ANY(F('nine_deed_how', 'witnessed'), F('nine_deed_how', 'bought')));
export const NINE_KEEPER_SELF: Cond = ANY(F('a3_nine_keeper', 'self'), ALL(NOT(F('a3_nine_keeper')), ANY(F('ca_deed', 'self'), F('ca_deed', 'irregular'), ALL(DEED_UNREGISTERED_LAWFUL, F('nine_deed', 'self')))));
export const NINE_KEEPER_PLAYER: Cond = ANY(F('a3_nine_keeper', 'player'), ALL(NOT(F('a3_nine_keeper')), ANY(F('ca_deed', 'citizen'), ALL(DEED_UNREGISTERED_LAWFUL, F('nine_deed', 'player')))));
export const NINE_KEEPER_CITY: Cond = NOT(ANY(NINE_KEEPER_SELF, NINE_KEEPER_PLAYER));
/** The title on the Court's register with a keeper who is not the city. */
export const NINE_REGISTERED: Cond = ANY(F('ca_deed', 'self'), F('ca_deed', 'citizen'), F('ca_deed', 'irregular'));
/** The recall is open: the notice has come, nothing has answered it, and Nine is still on the player's side. */
export const RECALL_OPEN: Cond = ALL(F('a3_recall_due'), NOT(F('a3_recall')), ON_SIDE('nine'));

/** B6n: on the player's side and willing to sit with them. ON_SIDE, less a Tamsin broken in Act 2: `tam_broken` takes
 * her out of the party without `tam_left` (U8 S3), and only the door wins her back (B6j clears it). The fire at the close
 * reads this; the close's gathering (B6l) should too. */
export const WITH_YOU = (c: CompanionKey): Cond => (c === 'tamsin' ? ALL(ON_SIDE(c), NOT(F('tam_broken'))) : ON_SIDE(c));
/** Kes numbed by the Concern at Knock, mid-siege (§7; B6j sets `a3_kes_numbed`). Read by her last night at the fire. */
export const KES_NUMBED: Cond = F('a3_kes_numbed');
/** B6o: the Long Night's red lines for the ones who were not at it (B5d makes Ash and Odile leave at its dawn only when they
 * stood there; B6o makes the rest leave at the first word after it, or at the fire). Ash's: the night stood against Openfield
 * (the guild's side or the city's). Odile's: her price, Imelda Sarr walking out alive, broken however Sarr died. */
export const ASH_LN_CROSSED: Cond = ALL(LN_DONE, ANY(LN('guild'), LN('ledger')));
export const ODILE_PRICE_BROKEN: Cond = ALL(F('odile_price', 'sarr'), SARR_DEAD);
/** The knife on the lane at the Long Night stopped: Sarr alive because somebody stood in its way (Odile's price, kept in the open). */
export const SARR_SPARED: Cond = F('ln_sarr', 'lives');
/** Ash's orders falling on himself on the steps (§7, B6p): low approval and the player's "make it clean" (U8 S3), unless the
 * player took the sentence back at the fire (`a3_ash_clean_back`; U8's `ash_stance` is never rewritten). Said at the fire. */
export const ASH_SELF_RISK: Cond = ALL(F('ash_stance', 'clean'), { approval: { companion: ASH, lte: 19 } }, NOT(F('a3_ash_clean_back')));

// ---------------------------------------------------------------- §4.1 the gates of the five endings

export const SASH_WORN: Cond = F('a3_sash', 'worn');
export const SASH_REFUSED: Cond = F('a3_sash', 'refused');
/** The steps are done and the vault is open, the sash worn or not. */
export const AT_VAULT: Cond = ALL(F('a3_pnr'), F('a3_sash'));

/** A: the Plan. Always open at the vault; worn → A1 (sign what must be signed), refused → A2 (walk out). */
export const A: Cond = AT_VAULT;
export const A1: Cond = ALL(A, SASH_WORN);
export const A2: Cond = ALL(A, SASH_REFUSED);

/** B: the forecasting core destroyed. */
export const B_MEANS: Cond = ANY(
  F('a3_unwritten', 'with_you'),
  LN('choir'),
  ALL(IN(ASH), ASH_REFUSED),
  { item: 'k_a3_charge' },
  ALL(F('a3_bram_cut'), { skill: 'mechanics', gte: 50 }),
);
export const B: Cond = ALL(AT_VAULT, B_MEANS);

/** C: the core signed over to the Concern through the guild (the Board wanted the Magistrate's signature, so the sash). */
export const C_BUYER: Cond = ANY(C_BUYER_B4B, LN('guild'), F('a3_concern_terms', 'accepted'));
export const C: Cond = ALL(AT_VAULT, SASH_WORN, C_BUYER, { item: 'k_a3_transfer' });

/** D: every forecast read out to everyone through the relay chain to Signal Hill. */
export const D_VOICE: Cond = F('a3_mast', 'raised');
export const D_READER: Cond = ANY(
  ALL(IN(NINE), ANY(NINE_CONSCIENCE, F('nine_log_given'))),
  ALL(F('a3_ally_seventeen'), F('nw_dam', 'truth')),
  ALL(F('a3_ally_saints'), F('bw_static', 'kept')),
  { origin: 'archive_clerk' },
  { skill: 'science', gte: 65 },
);
export const D_PEOPLE: Cond = ANY(
  LN('choir'), { member: 'choir', rank: 'sibling' }, { standing: { settlement: 'openfield', gte: 20 } },
  F('a3_unwritten', 'with_you'), CALLA_FREE, F('a3_ally_choir'),
  F('a3_ally_wheel'), ALL(F('a3_c9', 'opened'), { standing: { settlement: 'cistern9', gte: 20 } }),
);
export const D_ARCHIVE: Cond = ANY(F('a3_archive', 'open'), F('a3_c9', 'opened'), ALL({ item: 'k_ar_refusals' }, F('tam_why')));
export const D: Cond = ALL(AT_VAULT, D_VOICE, D_READER, D_PEOPLE, D_ARCHIVE);

/** E: the Magistrate's Amendment: the sash taken and the law rewritten from inside, in the Court's own register. An
 * uncatalogued register is in the Court's keeping, so `E_REG` holds on a state that never touched it. */
export const E_FILE: Cond = ANY(F('ar_verdict', 'contested'), F('ar_verdict', 'agreed'), F('a3_file', 'contested'));
export const E_PREC: Cond = { flag: 'ca_precedents', gte: 2 };
export const E_REG: Cond = ANY(NOT(F('prec_register', 'catalogued')), F('a3_register_back'));
export const E: Cond = ALL(AT_VAULT, SASH_WORN, E_FILE, E_PREC, E_REG);

/** The five ends by their `a3_end` value, each with its gate (the vault's choice offers all five with `showLocked`). */
export type End = 'plan' | 'unwritten' | 'concern' | 'opensky' | 'amendment';
export const ENDS: Record<End, Cond> = { plan: A, unwritten: B, concern: C, opensky: D, amendment: E };
/** Every key of every gate, by name (for tests and the slices; the player never sees these names: the tracker
 * `q_a3_hold` lists allies, things carried and standing instead). */
export const KEYS: Record<string, Cond> = { B_MEANS, C_BUYER, D_VOICE, D_READER, D_PEOPLE, D_ARCHIVE, E_FILE, E_PREC, E_REG };

/** E's clauses (§4.2): the chair amends one to three in its first season, each from a precedent the player holds. */
export const CLAUSES: { id: string; needs: Cond }[] = [
  { id: 'fines', needs: F('prec_forecast_fine', 'void') },
  { id: 'living', needs: F('prec_unrecorded', 'yields') },
  { id: 'keeper', needs: ANY(F('prec_unit_keeper', 'self'), F('prec_recall', 'keeper')) },
  { id: 'refuse', needs: F('prec_refuse_benefit') },
  { id: 'reserve', needs: F('prec_reserve') },
  { id: 'passenger', needs: F('dk_prec_passenger') },
  { id: 'speech', needs: F('prec_sedition') },
];

// ---------------------------------------------------------------- §2.3 the muster and §5 the readiness acts

/** The allies called home by letter (B6c writes the letters; each needs its owed flag or local standing). */
export type Ally = 'shale' | 'dogs' | 'choir' | 'wheel' | 'shift' | 'stand' | 'boats' | 'barges' | 'gangs' | 'saints' | 'seventeen';
export const ALLY_NEEDS: Record<Ally, Cond> = {
  shale: ANY({ standing: { settlement: 'shale', gte: 15 } }, { member: 'shale_militia' }),
  dogs: ANY(F('wren_exodus'), { rep: { faction: 'rust_dogs', respect: 15 } }),
  choir: ANY(F('sky_rite'), { standing: { settlement: 'openfield', gte: 15 } }, LN('choir')),
  wheel: ANY({ member: 'wheel' }, { standing: { settlement: 'wheel', gte: 15 } }),
  shift: ANY(F('hs_shift', 'won'), F('hs_shift', 'revolt')),
  stand: F('dk_stand_owed'),
  boats: F('ds_boats_owed'),
  barges: F('nw_barges_owed'),
  gangs: ANY(F('bw_turf', 'peace'), F('bw_three_crews')),
  saints: F('bw_static', 'kept'),
  seventeen: F('nw_dam', 'truth'),
};
export const ALLY = (a: Ally): Cond => F(`a3_ally_${a}`);
/** Where each ally counts: at Knock's door (20e), and at the close for the readiness count (M7). */
export const ALLIES_AT_KNOCK: Ally[] = ['shale', 'dogs', 'choir', 'wheel'];
export const ALLIES_AT_CLOSE: Ally[] = ['choir', 'wheel', 'stand', 'gangs', 'saints'];

/** B6c: the road home (19). It is open from the order's reading until the player has a way home or is at Knock. The rides
 * by the Long Night's side: the wardens' car (the city's side), the guild's first class (the guild's), Openfield's carts
 * (the Choir's); a truce has every side's debt to call, by asking (`ln_owed`); a member of the side may ride with it too.
 * The Wheel carries road-kin and friends; the player's own buggy, if it is fit to drive. `none` has no side's ride. */
export const HOME_OPEN: Cond = ALL(ORDER_READ, NOT(F('a3_route_home')), NOT(AT_KNOCK));
export const ORME = 'npc_kn_factor';
const TRUCE_OWED: Cond = ALL(LN('truce'), LN_OWED);
export const RIDE_COLUMN: Cond = ALL(ANY(LN('ledger'), { member: 'wardens' }, TRUCE_OWED), NOT(ALL(LOWE_DEAD, { dead: REYES })));
export const RIDE_FIRST: Cond = ALL(ANY(LN('guild'), { member: 'tollmen', rank: 'hand' }, TRUCE_OWED), NOT({ dead: ORME }));
export const RIDE_CARTS: Cond = ALL(ANY(LN('choir'), { member: 'choir' }, TRUCE_OWED), NOT(LN_PEOPLE('removed')), NOT(LN_PEOPLE('relocated')));
export const RIDE_WHEEL: Cond = ANY(ALLY_NEEDS.wheel, ALLY('wheel'));
export const RIDE_BUGGY: Cond = ALL(F('dr_buggy'), NOT(F('dr_buggy_hurt')));
/** Stood against the guild at the Long Night (and not one of its own): its riders remember it on the road. */
export const AGAINST_GUILD: Cond = ALL(ANY(LN('choir'), LN('ledger')), NOT({ member: 'tollmen' }));

/** B6f: Knock under the column (20a). Linnet in Act 3, by her Act 1 fate: in the column as a ward-cadet (she ran to the
 * city on her own), with the Rust Dogs on the slope (taken to Shale, the Dogs called to Knock), at Mags's in Shale (taken
 * to Shale), or at home beside Maud (she stayed). A cadet who stands down comes home. `a3_linnet` records where the player
 * found her; `LINNET_AT` is the live answer (the map's placements and the epilogue read it). */
const LIN_RAN: Cond = F('kn_linnet_will_run');
const LIN_TO_SHALE: Cond = ALL(F('kn_linnet_to_shale'), NOT(LIN_RAN));
export const LINNET_COLUMN: Cond = ALL(LIN_RAN, NOT(F('a3_linnet_down')));
export const LINNET_DOGS: Cond = ALL(LIN_TO_SHALE, ALLY('dogs'));
export const LINNET_SHALE: Cond = ALL(LIN_TO_SHALE, NOT(ALLY('dogs')));
export const LINNET_KNOCK: Cond = ANY(F('a3_linnet_down'), ALL(NOT(LIN_RAN), NOT(F('kn_linnet_to_shale'))));
export const LINNET_AT: Mod = { id: 'linnet', values: [{ id: 'column', if: LINNET_COLUMN }, { id: 'dogs', if: LINNET_DOGS }, { id: 'shale', if: LINNET_SHALE }, { id: 'knock' }] };
/** Knock's water while the hatch is shut: Dry Wells' carts (its station put right in Act 1), Openfield's barrels (B6c), the
 * column's own barrels (asked of its captain), the windpump turning again on a deeper draw (with Corin), or a cup a head. */
export const KNOCK_WATER: Mod = { id: 'knock_water', values: [
  { id: 'drywells', if: ANY(F('dw_outcome', 'restored'), F('dw_outcome', 'freed')) },
  { id: 'carts', if: F('a3_carts_water') },
  { id: 'column', if: F('a3_column_water') },
  { id: 'pump', if: F('a3_well', 'deepened') },
  { id: 'ration' },
] };
export const KNOCK_WATERED: Cond = ANY(...KNOCK_WATER.values.filter((v) => v.if).map((v) => v.if!));
/** The column at Knock: camped from the order until the door is settled. The guild's people there, alive under either of
 * their placements (Act 1's and Act 3's), Hale not sent off or killed (B6g's `a3_hale`). */
export const COLUMN_HERE: Cond = ALL(A3_OPEN, NOT(F('a3_c9')));
export const ORME_HERE: Cond = ALL(NOT({ dead: ORME }), NOT({ dead: 'npc_kn_factor_a3' }));
export const HALE_HERE: Cond = ALL(HALE_ALIVE, NOT({ dead: 'npc_kn_out_lead_a3' }), NOT(F('a3_hale', 'gone')), NOT(F('a3_hale', 'dead')));
/** B6g: what the Long Night left between the player and the Unwritten (B5d's flags, read only here): Petra caught by the guild's
 * riders when the player shouted (her face held to their lamps, sold to the city), Petra talked out of her knife, the knife
 * told to go ahead, and Ash gone west with the Unwritten after carrying it. */
export const PETRA_TAKEN: Cond = F('ln_petra_taken');
export const PETRA_DOWN: Cond = F('ln_petra_down');
export const PETRA_KNIFE: Cond = F('ln_knife_blessed');
export const ASH_WITH_UNWRITTEN: Cond = F('ash_unwritten');
/** B6h: inside the Cistern (20c). The player has been inside (by any way: `a3_in_how`); MOTHER dark (her panel burned by the
 * Unwritten, or put to sleep by Bram); Tamsin still inside, never out and never joined (she meets the player there, and
 * counts as in the room at the ring); Bram's letter answered (Act 1's `q_a1_bram`, finished at the hatch's slot or in person). */
export const INSIDE: Cond = F('a3_inside');
export const MOTHER_DARK: Cond = ANY(F('a3_mother', 'burned'), F('a3_mother', 'asleep'));
export const TAM_INSIDE: Cond = ALL(F('c9_tamsin_inside'), NOT(ANY(F('tam_out'), { knows: 'tamsin_replied' })), NOT(F('tam_joined')));
export const BRAM_ANSWERED: Cond = ANY({ knows: 'bram_answered_truth' }, { knows: 'bram_answered_kind' }, { knows: 'bram_answered_told' });
/** B6i: the ring (20d). Ines is ready for what the ring learns at her table when she already knew MOTHER refused the city or
 * Tamsin's secret: the Archive promised (B6c's letter, or the Grille), Tamsin told her (Act 2), the Archive opened (B6h), the
 * replies' copy read to the ring in her own voice, or her own telling at the table. Unready, Tamsin's card breaks her
 * (`a3_ines` = falls) and Rosalind Teague leads the ring (`TEAGUE_LEADS`: she wants the door welded, and MOTHER asleep). */
export const INES_PREPARED: Cond = ANY(F('a3_archive_promise'), F('tam_secret', 'ines'), F('a3_archive', 'open'), { knows: 'a3_ring_refusals' }, F('a3_ines', 'opens'));
export const TEAGUE_LEADS: Cond = F('a3_ines', 'falls');
/** What striking Reserve 9 off the record makes of its people (Pell's unfit charts; B6j's struck door; slide 3), by the
 * Court's Act 2 ruling on the unrecorded: written down as living people the Court will hear (`yields`); claimed on the spot
 * as abandoned property by the guild's factor at Knock (`claimed`: the trap, the guild there and Orme alive); abandoned
 * property for the next buyer who reads the register (`property`); or nobody's, with no court to hear them (`outside`, or no
 * ruling). `STRUCK_TRAP`: the trap is set; `STRUCK_CLAIMED`: Pell signed into it. */
export const STRUCK_TRAP: Cond = ANY(F('a3_claim', 'held'), ALL(F('prec_unrecorded', 'property'), F('a3_guild_in'), ORME_HERE, NOT(F('a3_claim'))));
export const STRUCK_AS: Mod = { id: 'struck', values: [
  { id: 'yields', if: F('prec_unrecorded', 'yields') },
  { id: 'claimed', if: STRUCK_TRAP },
  { id: 'property', if: F('prec_unrecorded', 'property') },
  { id: 'outside' },
] };
export const STRUCK_CLAIMED: Cond = ALL(F('a3_pell', 'unfit'), STRUCK_TRAP);
/** B6j: the door (20e). The column comes down to the apron (`a3_column_apron`: the door cycled from outside, B6h, or the
 * designate's word to its captain at the camp) and holds at the yellow line for the designate's word; there it stands as
 * `<id>_apron` placements. Who leads it at the line is fixed before it comes down (a death on the apron hands nothing on):
 * Lowe, his sergeant Reyes if he died before, or the senior warden Kress if both did. A fight at the door (`a3_door_fight`)
 * ends when the lead falls (`DOOR_BROKEN`) or yields with two of the four wardens down (`DOOR_YIELDS`): the map's triggers. */
export const KRESS = 'npc_a3_g3';
export const COLUMN_WARDENS = ['npc_a3_g3', 'npc_a3_g4', 'npc_a3_g5', 'npc_a3_g6'];
export const APRON_ID = (id: string): string => `${id}_apron`;
export const COLUMN_APRON: Cond = ALL(COLUMN_HERE, F('a3_column_apron'));
export const LED_BY_LOWE: Cond = NOT({ dead: LOWE });
export const LED_BY_REYES: Cond = ALL({ dead: LOWE }, NOT({ dead: REYES }));
export const LED_BY_KRESS: Cond = ALL({ dead: LOWE }, { dead: REYES });
export const DOOR_FIGHTING: Cond = ALL(F('a3_door_fight'), NOT(F('a3_c9')));
export const DOOR_LEAD_DOWN: Cond = ANY(
  ALL(LED_BY_LOWE, { dead: APRON_ID(LOWE) }), ALL(LED_BY_REYES, { dead: APRON_ID(REYES) }), ALL(LED_BY_KRESS, { dead: APRON_ID(KRESS) }),
);
const WARDEN_DOWN = (id: string): Cond => ANY({ dead: id }, { dead: APRON_ID(id) });
export const DOOR_TWO_DOWN: Cond = ANY(...COLUMN_WARDENS.flatMap((a, i) => COLUMN_WARDENS.slice(i + 1).map((b) => ALL(WARDEN_DOWN(a), WARDEN_DOWN(b)))));
export const DOOR_BROKEN: Cond = ALL(DOOR_FIGHTING, DOOR_LEAD_DOWN);
export const DOOR_YIELDS: Cond = ALL(DOOR_FIGHTING, NOT(DOOR_LEAD_DOWN), DOOR_TWO_DOWN);
/** Tamsin can stand in the door: travelling with the player, or behind it (never out, or gone home into it), and alive. */
export const TAM_CAN_STAND: Cond = ALL(NOT(F('a3_tamsin_dead')), ANY(IN(TAMSIN), TAM_INSIDE, F('tam_home')));
/** What the door left of MOTHER, read whether or not her line after it was heard: `a3_mother` once set (kept | knock |
 * asleep | burned), else by the door (sealed → kept; opened or relocated → knock); unsettled, `lockdown`. */
export const MOTHER_AFTER: Mod = { id: 'mother', values: [
  { id: 'burned', if: F('a3_mother', 'burned') }, { id: 'asleep', if: F('a3_mother', 'asleep') },
  { id: 'knock', if: ANY(F('a3_mother', 'knock'), ALL(NOT(F('a3_mother')), ANY(F('a3_c9', 'opened'), F('a3_c9', 'relocated')))) },
  { id: 'kept', if: ANY(F('a3_mother', 'kept'), ALL(NOT(F('a3_mother')), F('a3_c9', 'sealed'))) },
  { id: 'lockdown' },
] };

/** The readiness hub's eight acts at the close (`d_a3_ready`, B6m): each adds 1 to `a3_ready`, once (`a3_ready_<id>`). */
export const READY_ACTS: { id: string; needs: Cond }[] = [
  { id: 'choir', needs: ALLY('choir') },
  { id: 'stand', needs: ALLY('stand') },
  { id: 'gangs', needs: ALLY('gangs') },
  { id: 'wheel', needs: ALLY('wheel') },
  { id: 'lowe', needs: F('a3_lowe', 'stood_down') },
  { id: 'saints', needs: ALLY('saints') },
  { id: 'nine', needs: ANY(F('nine_log_given'), NINE_CONSCIENCE) },
  { id: 'warned', needs: { flag: 'a3_warned', gte: 3 } },
];

// ---------------------------------------------------------------- §5 the modifiers (ordered; first match wins; the last is the default)

export interface Mod { id: string; values: { id: string; if?: Cond }[] }

/** The value a modifier takes on this state: its first value whose condition holds (the last has none). */
export function modValue(g: GameState, m: Mod): string {
  for (const v of m.values) if (!v.if || test(v.if, g)) return v.id;
  return m.values[m.values.length - 1].id;
}

const END_IS = (e: End): Cond => F('a3_end', e);

/** M1 the Leash. Without B4b it stays the Concern's unless the core goes to it too. */
export const M1_LEASH: Mod = { id: 'leash', values: [
  { id: 'cut', if: B4B.leash('cut') },
  { id: 'yours', if: B4B.leash('seized') },
  { id: 'sold', if: B4B.leash('sold') },
  { id: 'spread', if: END_IS('concern') },
  { id: 'theirs' },
] };
/** M2 the Sink. */
export const M2_SINK: Mod = { id: 'sink', values: [
  { id: 'lost', if: ALL(END_IS('unwritten'), NOT(F('sk_pumps', 'seized'))) },
  { id: 'held', if: ALL(END_IS('unwritten'), F('sk_pumps', 'seized')) },
  { id: 'saved', if: F('sk_saved') },
  { id: 'relieved', if: ALL(F('sk_flooded'), F('nw_sink_relief')) },
  { id: 'flooded' },
] };
/** M3 Halcyon. "Burned" works without B4b: the Shift armed, Maren alive, and the reserve held by the player. */
export const M3_HALCYON: Mod = { id: 'halcyon', values: [
  { id: 'opened', if: B4B.longlived('exposed') },
  { id: 'burned', if: ALL(ANY(F('hs_shift', 'won'), F('hs_shift', 'revolt')), F('ks_maren', 'lives'), ANY(B4B.leash('cut'), HOUNDS_PLAYER), NOT(END_IS('concern'))) },
  { id: 'risen', if: END_IS('concern') },
  { id: 'reformed', if: B4B.longlived('soto') },
  { id: 'stands' },
] };
/** M4 the Cistern. MOTHER (`a3_mother`) is a line inside every value. A sealed reserve is relocated by the chair's first
 * signed act under A1, C, or E without the reserve clause, unless the Court stayed the order on consent. */
export const M4_CISTERN: Mod = { id: 'cistern', values: [
  { id: 'opened', if: F('a3_c9', 'opened') },
  { id: 'walked', if: ALL(F('a3_c9', 'relocated'), F('a3_c9_after', 'walked')) },
  { id: 'sold', if: F('a3_c9_how', 'sold') },
  { id: 'relocated', if: ANY(F('a3_c9', 'relocated'), ALL(F('a3_c9', 'sealed'), SASH_WORN,
    ANY(END_IS('plan'), END_IS('concern'), ALL(END_IS('amendment'), NOT(F('a3_amend_reserve')))), NOT(F('ca_reserve', 'stayed')))) },
  { id: 'struck', if: F('a3_c9_how', 'struck') },
  { id: 'sealed' },
] };
/** M5 Kennel Seven. B5d's fourth state (the command unit broken: the reserve nobody's) is `feral`. */
export const M5_HOUNDS: Mod = { id: 'hounds', values: [
  { id: 'yours', if: HOUNDS_PLAYER },
  { id: 'woken', if: ANY(END_IS('concern'), HOUNDS_CONCERN, F('a3_hounds_in')) },
  { id: 'feral', if: HOUNDS_FERAL },
  { id: 'dormant' },
] };
/** M6 the sash. */
export const M6_SASH: Mod = { id: 'sash', values: [{ id: 'amended', if: END_IS('amendment') }, { id: 'worn', if: SASH_WORN }, { id: 'refused' }] };
/** M7 the sky (D only): the price of reading everything aloud, by the readiness count. */
export const M7_SKY: Mod = { id: 'sky', values: [{ id: 'held', if: { flag: 'a3_ready', gte: 5 } }, { id: 'hard', if: { flag: 'a3_ready', gte: 2 } }, { id: 'burning' }] };
/** M9 a place's own standing, by band (local reputation, never karma). */
export const M9_STANDING = (settlement: string): Mod => ({ id: `standing_${settlement}`, values: [
  { id: 'loved', if: { standing: { settlement, gte: 25 } } },
  { id: 'liked', if: { standing: { settlement, gte: 10 } } },
  { id: 'hated', if: { standing: { settlement, lte: -15 } } },
  { id: 'none' },
] });
export const MODS: Mod[] = [M1_LEASH, M2_SINK, M3_HALCYON, M4_CISTERN, M5_HOUNDS, M6_SASH, M7_SKY];
/** M8 the clauses (E only): the `a3_amend_<id>` the chair chose. */
export const CLAUSES_CHOSEN = (g: GameState): string[] => CLAUSES.filter((c) => test(F(`a3_amend_${c.id}`), g)).map((c) => c.id);

/** R49's home (slide 27, `ep_home`; B6v): the chair under A1, C and E; otherwise wherever the player's life is. */
export const EP_HOME: Mod = { id: 'home', values: [
  { id: 'city', if: ALL(SASH_WORN, ANY(END_IS('plan'), END_IS('concern'), END_IS('amendment'))) },
  { id: 'knock', if: ANY(F('a3_c9', 'opened'), { standing: { settlement: 'cistern9', gte: 10 } }) },
  { id: 'shale', if: ALL(F('a3_shale', 'free'), { standing: { settlement: 'shale', gte: 10 } }) },
  { id: 'road', if: ANY({ member: 'wheel' }, F('wren_after', 'road'), F('kes_after', 'road')) },
  { id: 'nowhere' },
] };
/** B6b: Unit 9's deed as the end reads it (its slide's `× nine_deed`): the keeper the recall found. */
export const NINE_DEED: Mod = { id: 'nine_deed', values: [{ id: 'self', if: NINE_KEEPER_SELF }, { id: 'player', if: NINE_KEEPER_PLAYER }, { id: 'city' }] };

/** The epilogue's slides in play order (§6.2; `ep_<slide>` holds the variant shown). The coordinator's default: only
 * the slides whose subject the player met are shown (B6s–B6v give each slide its `applies`). */
export const EP_SLIDES = ['steps', 'ledger', 'cistern', 'knock', 'shale', 'dogs', 'guild', 'choir', 'precinct', 'sink', 'crown', 'edges', 'skirts', 'line', 'shore', 'teeth', 'wet', 'wheel', 'ashlands', 'tamsin', 'wren', 'ilya', 'odile', 'ash', 'nine', 'kes', 'r49'];

/*
 * ---------------------------------------------------------------- the Act 3 flag registry
 * Every Act 3 flag, its values and the slice that sets it. Each slice adds its own lines here as it lands.
 *
 * B6a (built):
 *   a3_open                  true            the order has come (world event a3_order); Act 3 is open
 *   a3_order_read            true            the fourth order read in the pack (d_a3_order_read); starts q_a3_return
 *   a3_summoned              true            the Ledger's card has come (world event a3_summons); starts q_a3_spire and q_a3_hold
 *   a3_recall_due            true            the recall notice for Unit 9 has come (the order's fourth sheet, or a3_recall_notice)
 *   ev_armed_a3_*            number          the engine's own arming time for each a3 world event
 * B6b (built; dialogue/a3_order.ts, dialogue/a3_court.ts on the Court's bench, npcs/a3.ts, maps md_precinct/md_ring/md_docks):
 *   a3_recall                declined | stayed | handed | court | bought | hidden | fought | taken   the recall answered: at the
 *                            Precinct gate (d_a3_recall), by post (d_a3_courier: declined | stayed), or by the Court (court | taken)
 *   a3_recall_met            true            the recall wardens have stopped Nine at the gate once
 *   a3_recall_stay           true            the recall put before the Court; the wardens wait at the gate on the ruling
 *   a3_recall_watched        true            a slip past the wardens failed; the sneak is not offered again
 *   a3_recall_fight          true            the recall wardens drawn on (their hostileIf; a3_recall = fought)
 *   a3_nine_hid              clover | hulls  where a hidden Nine waits (placements md_ring/npc_md_nine_clover,
 *                                            md_docks/npc_md_nine_hulls, tree d_a3_nine_hid);  a3_nine_fetched  true once it rejoins
 *   a3_nine_keeper           self | player   Nine's keeper as Act 3 settled it (the Court's keeper ground; the title bought at the
 *                                            gate). U8's nine_deed is never rewritten: read NINE_KEEPER_* / NINE_DEED instead
 *   nine_disposed            true            handed, taken, or returned by the Court; Nine leaves the party and is never placed again
 *   ca_recall                kept | returned (courtCase);  prec_recall  keeper (a precedent: ca_precedents +1)
 *   ca_reserve               stayed | attendance | privilege | upheld (courtCase);  prec_reserve  consent | attendance
 *                            (each a precedent; privilege is a courtesy, not a precedent; upheld: the Court endorsed the order)
 *   knowledge: a3_courier_met, a3_court_heard (objections lie to the Court; also starts q_ca_court), a3_drop_heard (the
 *                            couriers' slot at the Spire's foot, for B6r's drop)
 * B6d (built; dialogue/a3_mast.ts, map signalhill via tools/maps/gen_signalhill.py, map wheel, world event a3_verity_band):
 *   a3_mast                  raised | narrow   settled for good either way; raised only with a keeper (D_VOICE reads raised)
 *   a3_mast_how              x | c | b | t | v | k   the route that let it speak wide (set first; t sets keeper hollow with it)
 *   a3_mast_keeper           hollow | wheel | knock   who holds the hill and the knife switch at the foot until the player's word
 *                            comes up the wire (B6r: the keeper throws it); knock: the switch's handle is with the player
 *   a3_aerial_found          true            the crown (the mast's top section) dug out of the gully, a line up the crack
 *   a3_hollow_heard          true            Tally's Act 3 greeting heard;  a3_hollow_paid  true  the Hollow's sixty paid
 *   a3_hollow_gone           true            the Hollow walked west (timer a3_hollow_leave, 8 h after the hill went to Knock)
 *   a3_wheel_up              true            the Wheel's keeper (Dario Oduya) is on the hill (timer a3_wheel_up, a day after)
 *   an_board                 mast            B5d's flag, written through MAST_BOARDS: the shunter's board went into the head box
 *   knowledge: a3_list_heard, a3_broadcast_seen (the rack's isolated circuit; also relay_log_read), a3_crown_told,
 *                            a3_hollow_price, a3_verity_band (Verity's letter), a3_ledger_granted (the grid said GRANTED)
 * B6c (built; dialogue/a3_road.ts, world/a3_letters.ts, world/a3_roads.ts; hooks on Lowe, Reyes, Femi's board, Doria, the Ring's buggies):
 *   a3_route_home            column | first | carts | wheel | buggy | foot   how the player came home: a ride's scene sets its own on
 *                            arrival (or on getting down at Shale); foot = under their own steam (on foot, the Line, a caravan),
 *                            set by world event a3_home_road at Knock when no ride was taken. (The plan's `line` folds into foot.)
 *   a3_ride                  column | first | carts | buggy | wheel   the ride boarded (set on departure; a reopened scene resumes)
 *   a3_in_sallow             true            a ride came down into the Sallow (also any Sallow map: IN_SALLOW)
 *   a3_at_knock              true            a ride arrived at Knock, or world event a3_home (the player at Knock after the order)
 *   a3_ally_<ally>           true            a muster letter's reply (world/a3_letters.ts; one per ALLY_NEEDS key, alternates by
 *                                            recipient); knowledge a3_ally_<ally> with it
 *   a3_archive_promise       true            Ines's reply to let_ines_refusals (Act 2 or Act 3, the replies' copy held); knowledge
 *                                            ines_promised_archive
 *   a3_lowe_asked            down | unsure | on | none   what the player told Lowe at Tollhouse 9 in the column's car (B6f/B6j may read)
 *   a3_carts_water           true            Openfield's carts brought water barrels to a dry Knock (B6f: Knock's water)
 *   a3_riders                paid | talked | fought   the guild's riders on the road home (only against the guild);  a3_riders_fight
 *                                            true  their hostileIf
 *   a3_refugees              water | tolls | wheel | told   what the player did for Openfield's walkers on the road
 *   knowledge: a3_ride_column / a3_ride_first / a3_ride_carts (a side's offer by post), a3_lowe_clause (the order has no line for
 *                            a designate who says no), a3_column_seen, a3_trader_news, a3_first_folder (Orme's folder),
 *                            a3_wheel_ride;  memory npc_c9_01 player_wrote_refusals (the copy sent home)
 *                            (Linnet drives the column's car when kn_linnet_will_run: B6f reads a3_route_home = column with it)
 * B6e (built; dialogue/a3_shale.ts, map shale via tools/maps/gen_shale.py, npcs npc_a3_g7/g8 (Pike's hands), g13/g14 (Dogs)):
 *   a3_buyout                true            the buyout came due in front of the player (Shale's road triggers, or the first Act 3
 *                                            word in the town); starts q_a3_ride. Open while RIDE_OPEN (a3_shale.ts): Ada and Pike alive
 *   ks_ada                   stays | resigns | dead   keystone 3; dead only in the street fight, and only under ADA_FALLS (the
 *                                            militia never drilled and Jonah dead); unset = the ride never came due (or still open)
 *   a3_shale                 free | company | dogs | abandoned   Ada stays → free; gone (resigned or dead) → abandoned if
 *                                            shale_withers, else dogs if rd_coup, else company (resigned) or free (dead)
 *   a3_pike                  refused | paid | void | exposed | robbed | put_off | signed   how the contract ended (refused: Ada
 *                                            talked round; void: Odile's sheet unwound or torn at the counter; exposed: the Tollhouse page)
 *   a3_mags                  told | exposed | kept | runs   Mags's brokerage: she told Ada herself, the player told Ada, the player
 *                                            kept it, or the company town is hers to run (set with a3_shale = company); unset = never found
 *   a3_sh_fight              true            the hands drawn on (their hostileIf; Issa's and Benno's ally);  a3_sh_after  true  the
 *                                            street told how it ended (trigger a3_street_after → d_a3_street, or Issa)
 *   a3_sh_safe               true            the guild's copy out of Pike's strongbox at night (item k_a3_contract until Ada burns it)
 *   odile_sheet              torn            U8's flag, rewritten only when the sheet is torn at Pike's counter (from player | kept)
 *   knowledge: a3_buyout_notice, a3_buyout_why, a3_buyout_read (Ada's account), a3_ada_waits, a3_buyout_terms (Pike's three
 *                            hundred), a3_buyout_sheet (the price rests on Odile's sheet), a3_buyout_forward (brought forward the
 *                            morning after Openfield), a3_buyout_clause, a3_mags_hand, a3_buyout_priced / a3_buyout_fair (Teo's
 *                            reading), a3_buyout_street (Issa's warning)
 * B6n (built; dialogue/a3_fire.ts: the fire at the Spire's close (prop a3_fire on md_spire, lit on a3_summoned), the scenes of
 *      Tamsin, Wren, Ilya and Kes; hooks in overpass.ts and hs_kes.ts):
 *   a3_<c>_last              together | apart | none   (c = tamsin | wren | ilya | kes) the last night's romance beat: together =
 *                            committed at or through the fire; apart = the romance ended there (declined, the count, the list,
 *                            or a committed romance elsewhere); none = the last night as friends. Unset = not had, or deferred.
 *                            The epilogue's together still reads the romance's own flag (tam_romance together; wren_rom,
 *                            ilya_rom, kes_rom committed), which the fire writes when it commits or ends a romance
 *   a3_<c>_night             true            the last night's beat was had (deferrals included: "not tonight", no well, sober < 30)
 *   a3_<c>_word              true            the player gave their word on the companion's line for the ending (Tamsin: not to
 *                            count people / sign the door; Wren: not to sell it to the Concern; Ilya: not to sit in the chair;
 *                            Kes: not to hand the Concern the eyes). B6r: a leaving at the vault can name the word broken
 *   wren_left / kes_left     guild           left on hearing of a guild night they were not at (at the first camp or meeting
 *                            after it, in their own trees; or at the fire if gathered at the close). B5d's longnight covers
 *                            the ones who were there
 *   romance flags written    tam_romance together | declined | stopped | ended, tam_r2_later, tam_listed; wren_rom roof |
 *                            committed | no | ended; ilya_rom committed | no | ended; kes_rom dark | committed | no | ended;
 *                            romance_partner set on a commitment, cleared when the romance holding it ends
 *   (read, set by B6j)       a3_kes_numbed   KES_NUMBED: Kes's opener at the fire says her hand goes to her neck since Knock
 * B6f (built; dialogue/a3_knock.ts, holding scenes in dialogue/a3_forces.ts for B6g, npcs/a3_knock.ts, map c9_mouth via
 *      tools/maps/gen_knock.py: the opening's placements step aside on a3_open, Act 3's take their places):
 *   a3_at_knock / a3_in_sallow  true         also set by Knock's trigger a3_arrive (the first walk into the north half once the
 *                                            order is read; opens d_a3_home whether or not a ride or B6c's a3_home came first)
 *   a3_guild_in / a3_hounds_in  true         Knock's triggers a3_guild / a3_hounds (GUILD_IN_PLAY / HOUNDS_IN_PLAY, on the same
 *                                            walk in): the guild's party (Hale, Dace as guide) / its two handlers are placed
 *   a3_lowe_heard            true            Lowe (or Reyes, Lowe dead) at the column's table: the attendance clause heard
 *   a3_column_water          true            the column's own barrels down the lane (Lowe on trust ≥ 20, else Speech 45)
 *   a3_well                  deepened        Corin's windpump turning again (Mechanics 40, or Survival 40); KNOCK_WATER reads
 *                                            drywells | carts | column | pump | ration (first match)
 *   a3_maud_home             true            Maud met at the hatch (trust +10);  a3_maud_secret  true  her sold letter said
 *                                            (trust ≥ 20: home +10, the hatch at seven +5, what she wants +5)
 *   a3_maud                  eased | forgiven | told   the answer to the letter (eased only for a player who knows the city
 *                                            has MOTHER's returns);  knowledge a3_maud_letter_ask (ask MOTHER who wrote it: B6h)
 *   a3_linnet                column | dogs | shale | knock   where the player met her in Act 3 (LINNET_AT is the live answer:
 *                                            the epilogue reads that);  a3_linnet_down  true  the cadet stood down (clause 30),
 *                                            home;  a3_linnet_stay  true  asked to stay in the column for Knock (B6j may read);
 *                                            a3_linnet_maud  true  she went to Maud;  a3_linnet_after  road | maud  (at home)
 *   a3_dace                  guide | knock | square | quit   the guild's guide when it came, else home; his 42 paid on
 *                                            Orme's book, or talked out of guiding (Speech 45)
 *   a3_corin_met             true;  a3_corin  holds | down   the slope at the door (B6j: down = no rifle on the rise)
 *   knowledge: a3_lowe_clause, a3_attend_how (B6j: "come and tell me, or stand on the apron"), a3_lowe_names, a3_lowe_guild
 *                            (B6g: he has not read Orme's paper), a3_cadet_charter, a3_mother_named, a3_mother_pause,
 *                            a3_mother_logs_maud, a3_hatch_offered (B6h: Ines offers the hatch), a3_ines_refused,
 *                            a3_corin_hale (B6g: Maud decides Hale), a3_corin_past, a3_column_seen;  memories npc_md_01
 *                            a3_third_word ("home"), a3_grief_told; npc_kn_linnet a3_trusted / a3_stood_down; npc_c9_01
 *                            a3_told_refusals (the Archive promise told at the Grille, not by letter)
 *   a3_archive_promise       true            also at the Grille in lockdown (the replies' copy held, told to Ines)
 * B6o (built; dialogue/a3_fire_ii.ts, built into d_a3_fire by lastNightsII(): Odile's, Ash's and Nine's last nights at the fire;
 *      Ash and Tamsin at Knock's first camp, spread into ch1_cistern.ts and openfield.ts; the Long Night's red lines for Ash and
 *      Odile when they were not at it, spread into openfield.ts and ninebridge.ts):
 *   a3_odile_last            settled | open  her tab read out at the fire: paid at the bottom, or left open at the player's asking
 *   a3_ash_last              burned | none   burned: the letter burned at the fire tonight (ash_orders written refused); none: the
 *                                            last night as friends had with the letter where it stood (or never between them)
 *   a3_nine_last             log | none      log: "when it matters" kept (the log it held back, given or read at the fire); none:
 *                                            the drains, the last night as friends
 *   a3_odile_night / a3_ash_night / a3_nine_night  true   the last night's beat was had
 *   a3_odile_word            true            the player's word that Sarr answers for the riders in daylight (D or E fits it)
 *   a3_ash_word              true            the player's word not to wear the sash (said to Ash: B6p can read it against a3_sash)
 *   a3_nine_word             true            the player's word not to destroy the core (Nine's line: B6r can read it at the door)
 *   a3_ash_heard             people | water | unsure   undecided orders: what the player said they would sign first (B6p reads
 *                                            it with what the hand does; it decides nothing at the fire)
 *   a3_ash_clean_back        true            "make it clean" (U8 ash_stance = clean) taken back at the fire; ASH_SELF_RISK reads it
 *   a3_ash_tam               true            Ash and Tamsin's quarrel at Knock's first camp had (once)
 *   U8 flags written         ash_orders refused | warned | undecided | other (asked again, burned, or taken back at the fire;
 *                            first asked there if never answered), ash_orders_known + ash_orders_how told (told at the fire,
 *                            approval 35+), nine_log_given (+ knowledge nine_log_copy; the log held back, given when it mattered:
 *                            D_READER and the readiness act read it), ash_gone + ash_redline longnight, odile_gone + odile_left price
 *   (read)                   ASH_LN_CROSSED, ODILE_PRICE_BROKEN, SARR_SPARED, ASH_SELF_RISK (B6p: the self branch), NINE_KEEPER_SELF
 * B6g (built; dialogue/a3_forces.ts written whole over B6f's holding scenes: the Unwritten (d_a3_petra, Petra's or Juniper's
 *      nodes; d_a3_thaddeus, d_a3_rhoda), Orme's paper, Hale, the handlers, d_a3_burning; world event a3_burning; map c9_mouth):
 *   a3_unwritten             with_you | gone | stopped | burning   with_you: turned to the city's book under the Spire, coming
 *                                            east (B6l places them at the close); gone: talked home; stopped: lamp and oil taken
 *                                            in the dark, or the three drawn on and down; burning: let go down the grate
 *   a3_uw_how                core | home | lamp | fought | let   how a3_unwritten was settled (fought: the map's a3_uw_after)
 *   a3_uw_fight              petra | juniper   drawn on (who led): their hostileIf and placements until a3_unwritten is set
 *   a3_uw_watched            true            the lamp and oil tried for and caught: the sneak is not offered again
 *   a3_uw_rhoda              true            Rhoda pushed the oil away from her (lowers the talk and the sneak)
 *   a3_mother / a3_archive   burned          world event a3_burning (the next two o'clock with the player at Knock after
 *                                            a3_unwritten = burning): MOTHER's panel and the Archive burned; the residents on the
 *                                            hand pump and the emergency stores; the Grille dark (d_a3_grille's first entry)
 *   a3_guild                 paper_held | refused   Orme's paper taken (item k_a3_intake, in the pack; given back → refused) or
 *                                            refused (or torn: a3_guild_torn true, final). Only with GUILD_IN_PLAY
 *   a3_hale                  answered | gone | dead   Maud's judgement (answered: he rebuilds the post-house with Dace, has put
 *                                            down the guild's sash and walks nobody up the road; gone: rode north alone), or
 *                                            drawn on (a3_hale_fight true until the map's a3_hale_after sets dead)
 *   kn_owes_orme             false           Act 1's debt to Orme squared by carrying her paper
 *   knowledge: a3_uw_met, a3_uw_aim, a3_uw_shaft (the grate is the way down), a3_uw_rule (they act only with the player on the
 *                            slope), a3_uw_turn (the grate is the Cistern's air: a fire opens the door for the city), a3_uw_chalk,
 *                            a3_petra_father, a3_petra_night, a3_thad_met/a3_thad_supply, a3_rhoda_met/a3_rhoda_press,
 *                            a3_intake_terms / a3_intake_sign / a3_intake_held / a3_orme_stake, a3_hale_met / a3_hale_job /
 *                            a3_weighhouse (B6j: what "sold" costs, said by the man who walks them) / a3_hale_due / a3_hale_door /
 *                            a3_hale_boards, a3_handlers_met / a3_hounds_for / a3_hounds_whose;  memories npc_kn_maud
 *                            a3_judged_hale, npc_kn_factor a3_paper_refused / a3_paper_torn / a3_told_weighhouse, npc_c9_02
 *                            a3_told_burning
 * B6h (built; dialogue/a3_cistern.ts: the ways in (d_a3_way, its nodes spread into Knock's d_kn_hatch and d_kn_door), the faces,
 *      MOTHER at her panel and the letter, the Archive, the residents, the inside props; map cistern9 via tools/maps/gen_ch1.py):
 *   a3_inside                true            the player has been inside the Cistern (any way)
 *   a3_in_how                hatch | shaft | door | tamsin | bram   the first way in (never rewritten): MOTHER held the tray lift
 *                                            (Speech 40 / Science 45) | down the grate and the pump run | the great door's
 *                                            manual cycle from outside (Mechanics 50; q_a3_cistern goes straight to its door
 *                                            stage) | Tamsin's service phrase at the hatch | Bram lifted the grate from below
 *   a3_lift                  hatch | tamsin  MOTHER holds the tray lift for the player (and by whose asking); the hatch is then
 *                                            a ladder both ways while she is up
 *   a3_shaft_open            true            the pump run open (down the grate, Bram's ladder, or the wheel turned from inside)
 *   a3_door_cycled           true            the great door opened from outside on its manual cycle: it stands open (B6j)
 *   a3_column_apron          true            with the door open, the column came down the lane to the apron and holds at the
 *                                            yellow line for the designate's word (B6j's door scene starts from here)
 *   a3_lowe_held             asked | silence   what the player did at the line: told the column to hold, or said nothing
 *                                            (it holds either way: "silence is not a word")
 *   a3_slip_read             true            MOTHER's own slip read back to her at the hatch (−10 to the hatch)
 *   a3_bram_coming           true            Bram answered at the slot and is coming up the intake (the grate offers his lamp)
 *   a3_faces                 true            the faces scene (cistern9 trigger a3_faces, the first step inside)
 *   a3_tam_inside_join       true            Tamsin, never out, met the player inside and came (with U8's tam_met, tam_out,
 *                                            tam_joined and join); met and asked to stay, she waits among the beds (TAM_INSIDE)
 *   a3_mother_met            true            MOTHER at her panel (or her dark panel, with Bram) met inside
 *   a3_letter_read           true            the Ledger's first letter opened (at the panel, or later from the pack:
 *                                            d_a3_first_letter); item k_a3_first_letter given unopened (knowledge a3_letter_given)
 *   a3_mother_ask            open | sealed | ring | unsure   MOTHER's one question, "Should I open the door?", and the answer
 *                                            (B6i/B6j may read; it decides nothing by itself)
 *   a3_archive               open | sealed   Ines at the Archive: open (on her promise and the replies' copy, no check; or Speech
 *                                            50); sealed (the check failed, or the player told her it was hers to keep shut)
 *   a3_ines_met / a3_pell_met / a3_bram_met / a3_teague_met  true   first met face to face inside
 *   U8 / Act 1 flags written tam_met, tam_out, tam_joined (the inside join); knowledge bram_answered_truth | kind | told
 *                            (q_a1_bram finished at the hatch's slot or in person)
 *   knowledge: a3_letter_given, a3_maud_letter_who (MOTHER: Elspeth Halloran wrote the letter Maud sold), a3_ines_beans (Ines's
 *                            message for Maud), a3_faces_for_maud (the residents told the player their faces, for Maud; told
 *                            her in d_a3_maud), a3_archive_told, a3_archive_orders (the city's four orders seen),
 *                            a3_mother_printed (MOTHER printed her own replies into the Archive's folder), a3_ines_remembers
 *                            (the Archive burned; Ines remembers every word), a3_ines_ring (Ines: sit at the table and she
 *                            calls the ring; B6i's a3_ring_called is the ring sitting), a3_mother_why_ring, a3_pell_hungry,
 *                            a3_bram_spares, a3_teague_weld (Bram could weld the seam properly: B6j's welded route), tam_seen;
 *                            memories npc_c9_01 a3_door_cycled / a3_archive_opened / a3_archive_asked, npc_c9_04
 *                            a3_door_cycled, npc_kn_maud a3_door_cycled / a3_letter_who / a3_faces_told, npc_md_01
 *                            a3_door_held / a3_door_silent, npc_c9_03 a3_service_phrase
 * B6i (built; dialogue/a3_ring.ts, d_a3_council at the council table (talk prop council_table on cistern9, via
 *      tools/maps/gen_ch1.py): the ring sits once a3_inside and the door is unsettled; the vote, Tamsin's card, Pell, Bram):
 *   a3_tam_card              true            Tamsin told the ring MOTHER hid her (Tamsin travelling, tam_secret kept | mother)
 *   a3_ines                  opens | seals | falls   Ines at the ring: opens = she has told the room what she knows (the copy
 *                                            read aloud, her own telling, the Archive opened, or ready when the card came);
 *                                            seals = she would keep the door (her word failed, or no Archive at the vote);
 *                                            falls = the card came and she was not ready (INES_PREPARED): Teague leads
 *                                            (TEAGUE_LEADS). Set at the latest when the vote is asked for
 *   a3_pell                  unfit | fit | refused   Pell's sixty charts: FIT FOR RELOCATION ticked no (Speech 40; no check for
 *                                            clinic_aide), the truth (fit, all but Sayer Quist), or the lie refused (he sends
 *                                            nothing; last quarter's FIT stands). STRUCK_AS reads what striking means (yields |
 *                                            claimed | property | outside); STRUCK_CLAIMED = unfit and the trap live (B6j)
 *   a3_bram_cut              true            Bram told how a caretaker of MOTHER's make is fed: couriers' paper, one trunk, two
 *                                            couplings, the first never wakes (B_MEANS with Mechanics 50). Open even with
 *                                            MOTHER burned; also from the table after the vote or the door
 *   a3_ring                  sealed | open | city   the vote: the leader's default (Teague or a sealing Ines: sealed; an opening
 *                                            Ines: open), or the player's one speech against it (checks)
 *   a3_ring_word             shut | open | city | yours   what the player said at the vote (whatever the room did with it)
 *   a3_mother                asleep          Teague's order after a sealed vote under her, Bram at the coupling (never under
 *                                            Ines; never with MOTHER burned); a3_bram_stopped  true  the player stopped him
 *   knowledge: a3_ring_called (the ring sitting), a3_ring_heard, a3_ring_teague, a3_ring_sayer, a3_ring_refusals (the copy
 *                            read aloud by Ines), a3_ines_told (her own telling), a3_ring_hatch (Ines's story of the two at the
 *                            hatch; Teague named as the one who told), a3_pell_forms, a3_pell_struck (what striking means, told),
 *                            a3_caretaker_sleep, a3_trunk;  memories npc_c9_01 a3_stood_with_tamsin / a3_fell / a3_told_hatch /
 *                            a3_ring_copy, npc_c9_06 a3_leads / a3_named_informer / a3_crossed, npc_c9_02 a3_unfit_signed,
 *                            npc_c9_04 a3_told_trunk / a3_stopped / a3_put_her_down, npc_c9_03 a3_card_told
 * Planned (the slice named sets it; values as the plan fixes them):
 *   a3_recall                declined | stayed | handed | court | bought | hidden | fought | taken          B6b
 *   nine_disposed            true                                                                        B6b
 *   ca_recall / prec_recall  kept | returned / keeper                                                    B6b (court)
 *   ca_reserve               stayed | attendance | privilege | upheld                                    B6b (court)
 *   prec_reserve             consent | attendance                                                        B6b (court)
 *   a3_route_home            column | first | carts | line | wheel | buggy | foot                        B6c
 *   a3_in_sallow             true (the road home reached the Sallow)                                     B6c
 *   a3_at_knock              true                                                                        B6c / B6f (Knock's trigger)
 *   a3_ally_<ally>           true, one per ALLY_NEEDS key                                                B6c
 *   a3_archive_promise       true                                                                        B6c
 *   a3_mast                  raised | narrow;  a3_mast_how  x | c | b | t | v | k;  a3_mast_keeper  hollow | wheel | knock   B6d
 *   a3_aerial_found          true (the aerial's top section found in the gully: q_a3_mast's objective)    B6d
 *   ks_ada                   stays | resigns | dead;  a3_shale  free | company | dogs | abandoned        B6e
 *   a3_pike                  exposed | paid | robbed | put_off | signed                                   B6e
 *   a3_guild_in / a3_hounds_in  true (from GUILD_IN_PLAY / HOUNDS_IN_PLAY)                               B6f
 *   a3_lowe_heard, a3_maud_secret  true;  a3_maud / a3_corin / a3_dace  (by B6f)                          B6f
 *   a3_linnet                column | dogs | shale | knock                                               B6f
 *   a3_unwritten             with_you | gone | stopped | burning                                         B6g
 *   a3_guild                 paper_held | refused;  a3_hale  answered | gone | dead                       B6g
 *   a3_inside, a3_faces, a3_letter_read  true;  a3_in_how  hatch | shaft | door | tamsin | bram           B6h
 *   a3_archive               open | sealed | burned                                                      B6h / B6g
 *   a3_tam_card, a3_bram_cut  true;  a3_ines  opens | seals | falls;  a3_pell  unfit | fit | refused       B6i
 *   a3_ring                  sealed | open | city                                                        B6i
 *   a3_c9                    sealed | opened | relocated                                                 B6j
 *   a3_c9_how                lowe | welded | struck | fought | ines | sold | order | forced              B6j
 *   a3_lowe                  stood_down | yielded | dead | carried                                       B6j
 *   a3_tam_door, a3_tamsin_dead, a3_nine_struck, a3_door_fight  true                                     B6j
 *   a3_mother                kept | knock | asleep | burned                                              B6g / B6i / B6j
 *   a3_c9_after              walked | held                                                               B6k
 *   a3_concern_terms         accepted | refused;  a3_register_back  true;  ca_calla, prec_sedition       B6l
 *   a3_ready (count), a3_ready_<act>  true;  a3_warned (count);  a3_pnr  true                            B6m
 *   a3_<c>_last              together | apart | none   (tamsin, wren, ilya, kes, odile, ash, nine)       B6n / B6o
 *   a3_kes_numbed            true                                                                        B6j / B6n
 *   a3_sash                  worn | refused;  a3_file  contested | failed;  a3_ash  between | faced | struck | self | away   B6p
 *   a3_end                   plan | unwritten | concern | opensky | amendment                            B6q
 *   a3_amend_<clause>        true, one per CLAUSES id;  a3_vault_fight  true                              B6r
 *   ep_<slide>               the variant id shown, one per EP_SLIDES entry;  ep_home  (EP_HOME)          B6s–B6v
 */
