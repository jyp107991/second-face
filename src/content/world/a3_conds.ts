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

/** B6q: the Vault of Accounts (21c), from the steps until the choice (`a3_end`). The ways offered at the reading desk are exactly
 * the gates that hold (ENDS, the Plan by the sash: A1 worn, A2 refused); a way not held is neither offered nor named. B's means and
 * D's reader are chosen there too, each exactly a part of its key: fire (the Unwritten turned, the Choir's night, or Ash travelling
 * with his orders refused), the charge, or Bram's first coupling (B_MEANS is their union); the player's own reading (an archive
 * clerk, or Science 65), Nine travelling, Verity, or the Wet's assessor (D_READER is their union). The reserve's paper lies under
 * the chair's first pen while the door is sealed and the Court has not stayed the order on consent (M4's relocated clause). */
export const VAULT_OPEN: Cond = ALL(AT_VAULT, NOT(F('a3_end')));
export const DOWN_FIRE: Cond = ANY(F('a3_unwritten', 'with_you'), LN('choir'), ALL(IN(ASH), ASH_REFUSED));
export const DOWN_CHARGE: Cond = { item: 'k_a3_charge' };
export const DOWN_COUPLING: Cond = ALL(F('a3_bram_cut'), { skill: 'mechanics', gte: 50 });
export const READ_SELF: Cond = ANY({ origin: 'archive_clerk' }, { skill: 'science', gte: 65 });
export const READ_NINE: Cond = ALL(IN(NINE), ANY(NINE_CONSCIENCE, F('nine_log_given')));
export const READ_VERITY: Cond = ALL(F('a3_ally_saints'), F('bw_static', 'kept'));
export const READ_SEVENTEEN: Cond = ALL(F('a3_ally_seventeen'), F('nw_dam', 'truth'));
export const RESERVE_UNDER_PEN: Cond = ALL(F('a3_c9', 'sealed'), NOT(F('ca_reserve', 'stayed')));

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
/** B6l: the Spire's close (21a), from the Ledger's card until the designate goes up the steps: who came (the map's placements,
 * gen_md_spire.py mirrors these). The companions on the player's side and not on the road with them wait round the fire barrel
 * (`WITH_YOU`, B6n's rule); a Nine hidden from the recall and never fetched walks in written off (`NINE_WALKIN`). The Concern's
 * officer: Director Soto if the player met her at Halcyon (B4b), else Mr Quill. The column's lead: Lowe while he lives, else his
 * sergeant Reyes. The Unwritten turned at Knock (`with_you`). The allies who count at the close send their own. */
export const AT_CLOSE: Cond = ALL(F('a3_summoned'), NOT(F('a3_pnr')));
export const SOTO = 'npc_hc_02';
export const SOTO_COMES: Cond = ALL(B4B.sotoMet, NOT({ dead: SOTO }));
export const QUILL_COMES: Cond = ALL(NOT(SOTO_COMES), NOT({ dead: QUILL }));
export const OFFICER_HERE: Cond = ANY(SOTO_COMES, QUILL_COMES);
export const NINE_WALKIN: Cond = ALL(F('a3_nine_hid'), NOT(F('a3_nine_fetched')));
export const LOWE_CLOSE: Cond = ALL(AT_CLOSE, NOT(LOWE_DEAD));
export const REYES_CLOSE: Cond = ALL(AT_CLOSE, LOWE_DEAD, NOT({ dead: REYES }), NOT({ dead: `${REYES}_apron` }));
export const UW_CLOSE: Cond = ALL(AT_CLOSE, F('a3_unwritten', 'with_you'));
/** The Concern's terms are worse for a designate the Shift marked and the Clean's gate was shut on (B4a). */
export const TERMS_WORSE: Cond = ALL(F('hs_marked'), F('hs_gate_shut'));
/** C_BUYER's second chance (§3): the officer's paper refused at the close (or no officer left alive to offer it), the Grand
 * Factor at Ninebridge holds the same paper for the guild, while she lives and until she has been answered once. */
export const SARR_OFFERS: Cond = ALL(AT_CLOSE, SARR_ALIVE, NOT({ item: 'k_a3_transfer' }), NOT(F('a3_sarr_terms')), ANY(F('a3_concern_terms', 'refused'), NOT(OFFICER_HERE)));
/** E_REG's alternate (§3): the Court's register sold to the catalogue in Act 2, asked back of Keeper Marwood in Act 3. */
export const REGISTER_ASK: Cond = ALL(A3_OPEN, F('prec_register', 'catalogued'), NOT(F('a3_register_back')), NOT(F('a3_pnr')));
/** Keystone 7's trial (case `calla` at the Court): only while Sister Calla is held by the city (B5d's `ks_calla` = imprisoned, or
 * the safe default); her release writes `ks_calla` = free, so `CALLA_FREE` reads it. */
export const CALLA_CASE_OPEN: Cond = ALL(LN_DONE, CALLA_HELD);

/** B6k: after the door (20f). The reserve carried west to the city in the wardens' car (the designate's word, the word forced
 * over the door, or the ring's own vote to go; the guild's paper takes them up the guild's own road instead, and never to
 * Carrick): Precinct Supply receives it at Carrick's buffer, on the designate's word, and the column holds it there until the
 * designate comes (`PLATFORM_OPEN`). `a3_c9_after` = walked (off the car, free in the city) | held (received). */
export const CARRIED_WEST: Cond = ALL(F('a3_c9', 'relocated'), ANY(F('a3_c9_how', 'order'), F('a3_c9_how', 'forced'), F('a3_c9_how', 'consent')));
export const PLATFORM_OPEN: Cond = ALL(CARRIED_WEST, NOT(F('a3_c9_after')));
/** Tamsin walked into the door over the designate's word (`tam_left` = door) and lives: placed where the door left her. She
 * followed the car west when it carried the reserve (Nine took her out of the door): at the buffer while it waits, with them in
 * Carrick if they walked, home at Knock if they were received; otherwise on Knock's apron by the door. */
export const TAM_STOOD: Cond = ALL(F('tam_left', 'door'), NOT(F('a3_tamsin_dead')));
export const TAM_FOLLOWED: Cond = ALL(TAM_STOOD, CARRIED_WEST);
export const TAM_AT_BUFFER: Cond = ALL(TAM_STOOD, PLATFORM_OPEN);
export const TAM_IN_CARRICK: Cond = ALL(TAM_FOLLOWED, F('a3_c9_after', 'walked'));
export const TAM_AT_KNOCK_AFTER: Cond = ALL(TAM_STOOD, F('a3_c9'), NOT(TAM_AT_BUFFER), NOT(TAM_IN_CARRICK));

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
/** B6m: an act at the works' trestle on the close (`d_a3_ready`) is open while the close gathers, its need holds, it has not been
 * asked, and whoever does it is there to be asked. Only Nine's act needs more than its need: a conscience Nine that is no longer on
 * the player's side cannot read its own errors, while its fair copy (`nine_log_given`) can be read without it. The column's act
 * reads `a3_lowe` = stood_down only (the coordinator, on B6j's question: a column that withdrew did not choose to). */
const READY_DOER: Record<string, Cond> = { nine: ANY(WITH_YOU('nine'), F('nine_log_given')) };
export const READY_DONE = (id: string): Cond => F(`a3_ready_${id}`);
export const READY_OPEN = (id: string): Cond => {
  const a = READY_ACTS.find((x) => x.id === id);
  if (!a) throw new Error(`no readiness act ${id}`);
  return ALL(AT_CLOSE, a.needs, NOT(READY_DONE(id)), ...(READY_DOER[id] ? [READY_DOER[id]] : []));
};
/** B6m: the charge, B_MEANS's alternate made at the close (`d_a3_charge`): the Shift's cases (`a3_ally_shift`), which come up with
 * a hand who wires them (Rafe Ansel, the Shift's shot-firer, or Orrin from the cage if Rafe died in the revolt); the six cases out
 * of Number Six's magazine (`k_hs_powder`); or four twists of black powder bought on the road (`j_powder`). Wired by the Shift's
 * hand, by Kes travelling (a Skirts child: they crimp caps before they read), or with Explosives 40. Made once. */
export const RAFE = 'npc_hs_03';
export const SHIFT_CASES: Cond = ALLY('shift');
export const RAFE_WIRES: Cond = ALL(SHIFT_CASES, NOT(F('hs_rafe_dead')), NOT({ dead: RAFE }));
export const CHARGE_POWDER: Cond = ANY(SHIFT_CASES, { item: 'k_hs_powder' }, { item: 'j_powder', count: 4 });
export const CHARGE_OPEN: Cond = ALL(AT_CLOSE, NOT({ item: 'k_a3_charge' }), NOT(F('a3_charge_how')));
/** B6m: the point of no return (§3) is the foot of the Spire's steps while the close gathers; going up sets `a3_pnr`. */
export const PNR_OPEN: Cond = AT_CLOSE;
/** B6p: the steps (21b), from the point of no return until the sash is answered. `a3_sash` is written once, when the steps are
 * done (so AT_VAULT means the steps are behind the player); during the scene the hand's answer is `a3_steps_sash` (worn | refused),
 * which can be taken off again once, under a blade or a friend's gun. Everyone on the player's side stands on the steps (a hidden
 * Nine never fetched stays written off at the close). The second hearing (E_FILE's third way) is open once, before the sash is
 * answered, unless the file already says CONTESTED. */
export const STEPS_OPEN: Cond = ALL(F('a3_pnr'), NOT(F('a3_sash')));
export const STEPS_WORN: Cond = F('a3_steps_sash', 'worn');
export const ON_STEPS = (c: CompanionKey): Cond => (c === 'nine' ? ALL(WITH_YOU('nine'), ANY(IN(NINE), NOT(NINE_WALKIN))) : WITH_YOU(c));
export const HEARING_OPEN: Cond = ALL(STEPS_OPEN, NOT(F('a3_steps_sash')), NOT(F('a3_file')), NOT(F('ar_verdict', 'contested')));
/** The Unwritten's blade: Thaddeus Wolde (`npc_a3_u2`), dead after the fight at Knock (`a3_uw_how` = fought) or on the steps. He
 * comes when the sash is on and the sky is owed by someone: the Unwritten came east for the book (Petra's warning at the close),
 * or Ash refused his own orders and his brothers sent another hand. */
export const THADDEUS = 'npc_a3_u2';
export const THADDEUS_DEAD: Cond = ANY(F('a3_uw_how', 'fought'), { dead: THADDEUS }, { dead: `${THADDEUS}_steps` });
export const BLADE_SENT: Cond = ANY(F('a3_unwritten', 'with_you'), ASH_REFUSED);
export const BLADE_DUE: Cond = ALL(STEPS_OPEN, STEPS_WORN, BLADE_SENT, NOT(THADDEUS_DEAD), NOT(F('a3_blade')));
export const BLADE_FIGHTING: Cond = ALL(F('a3_blade_fight'), NOT(F('a3_blade')));
/** Ash's orders on the steps (§7): who would the sky fall on, if he let it fall on others (U8 S4 `other`): a keystone who wears
 * their forecast gladly, in this order: House Vane risen, Vasha at the head of the Dogs, the Grand Factor alive. */
export const ASH_TARGET: Mod = { id: 'ash_target', values: [
  { id: 'vane', if: ALL(F('ks_vane', 'rises'), NOT(F('cr_celestine_dead')), NOT({ dead: 'npc_cr_01' })) },
  { id: 'vasha', if: ALL(F('rd_coup'), NOT(F('vasha_dead')), NOT({ dead: 'npc_rd_02' })) },
  { id: 'sarr', if: SARR_ALIVE },
  { id: 'none' },
] };
const ASH_HAS_TARGET: Cond = ANY(...ASH_TARGET.values.filter((v) => v.if).map((v) => v.if!));
/** How Ash meets the sash, once it is on (first match): the order falls on himself (low approval and "make it clean", U8 S3, not
 * taken back at the fire; never with the letter burned) · he stands on the step below (the letter burned) · he walks away to put
 * it on somebody else · he decides by what the player says they will sign first · he comes to the player's face. */
export const ASH_MODE: Mod = { id: 'ash_mode', values: [
  { id: 'self', if: ALL(ASH_SELF_RISK, NOT(ASH_REFUSED)) },
  { id: 'between', if: ASH_REFUSED },
  { id: 'away', if: ALL(F('ash_orders', 'other'), ASH_HAS_TARGET) },
  { id: 'weigh', if: ANY(F('ash_orders', 'undecided'), ALL(F('ash_orders_known'), NOT(F('ash_orders')))) },
  { id: 'face' },
] };
export const ASH_MODE_IS = (id: string): Cond => {
  const i = ASH_MODE.values.findIndex((v) => v.id === id);
  if (i < 0) throw new Error(`no ash mode ${id}`);
  const earlier = ASH_MODE.values.slice(0, i).map((v) => v.if!);
  return ALL(...(ASH_MODE.values[i].if ? [ASH_MODE.values[i].if!] : []), ...earlier.map(NOT));
};
export const ASH_DUE: Cond = ALL(STEPS_OPEN, STEPS_WORN, ON_STEPS('ash'), NOT(F('a3_ash')));
/** What the player said they will sign first (Tamsin's question on the steps, or Ash's): the answers a friend of his can stand beside. */
export const SIGN_FRIENDLY: Cond = ANY(F('a3_first_sign', 'people'), F('a3_first_sign', 'nothing'));
export const TAM_ASKS: Cond = ALL(STEPS_OPEN, STEPS_WORN, ON_STEPS('tamsin'), NOT(F('a3_first_sign')));

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

/** B6s: what the epilogue reads (slides 1–6; dialogue/a3_epilogue*.ts). The end reached at the vault (`a3_end`, B6q's choice,
 * played out by B6r) and the Plan's two forms by the sash. */
export const ENDED = (e: End): Cond => END_IS(e);
export const ENDED_A1: Cond = ALL(END_IS('plan'), SASH_WORN);
export const ENDED_A2: Cond = ALL(END_IS('plan'), NOT(SASH_WORN));
/** §5's twelve: a keystone fate still open at the end is fulfilled on schedule under the Plan worn (A1) and the Concern (C),
 * and under the Amendment (E) unless a clause the chair chose covers it (`covers`: CLAUSES ids); never under A2, B or D. */
export const ON_SCHEDULE = (...covers: string[]): Cond => ANY(ENDED_A1, END_IS('concern'), ALL(END_IS('amendment'), ...covers.map((c) => NOT(F(`a3_amend_${c}`)))));
/** The sky's price as the epilogue tells it (D): the price B6r's climax recorded (`ep_sky`), else M7 by the readiness count. */
export const EP_SKY: Mod = { id: 'ep_sky', values: M7_SKY.values.map((v) => (v.if ? { id: v.id, if: ANY(F('ep_sky', v.id), ALL(NOT(F('ep_sky')), v.if)) } : { id: v.id })) };
/** The list's people as the end leaves them (slide 2's lines; each has its own slide as well). Each `*_LATE` is a fate still
 * open at the end and fulfilled on schedule. Ada's is open while the guild's buyout never came due (B6e's `ks_ada` unset) and
 * she and Pike are alive; Kessler's while neither he nor Kade is dead; Kade is the Plan's executioner unless the booth's letter
 * made her read why (`vasha_fate` = spared_why), and not under a chair that holds a forecast is not an act. Wren's rope follows
 * §7 (A1 or C only, her `rope_late`). Calla held stays held unless the chair's clauses on speech or fines cover her. */
export const JONAH_DEAD: Cond = ANY(F('jonah_dead'), { dead: 'npc_sh_02' });
export const ADA_DEAD: Cond = ANY(F('ks_ada', 'dead'), { dead: 'npc_sh_01' });
export const ADA_OPEN: Cond = ALL(NOT(F('ks_ada')), NOT(ADA_DEAD), NOT({ dead: 'npc_sh_04' }));
export const ADA_LATE: Cond = ALL(ADA_OPEN, ON_SCHEDULE());
export const KESSLER_DEAD: Cond = ANY(F('rd_coup'), { dead: 'npc_rd_01' });
export const VASHA_DEAD: Cond = ANY(F('vasha_dead'), { dead: 'npc_rd_02' });
export const VASHA_EXECUTIONER: Cond = ALL(NOT(VASHA_DEAD), NOT(F('vasha_fate', 'spared_why')), ON_SCHEDULE('fines'));
export const KESSLER_LATE: Cond = ALL(NOT(KESSLER_DEAD), NOT(VASHA_DEAD), NOT(F('vasha_fate', 'spared_why')), ON_SCHEDULE());
export const WREN_ROPE_OPEN: Cond = ALL(NOT(F('wren_rope')), NOT(F('wren_hanged')), NOT({ dead: WREN }));
export const WREN_ROPE_LATE: Cond = ALL(WREN_ROPE_OPEN, ANY(ENDED_A1, END_IS('concern')));
export const CALLA_KEPT: Cond = ALL(CALLA_HELD, ON_SCHEDULE('speech', 'fines'));
export const OCHO_DROWNED: Cond = ANY(F('ks_ocho', 'drowned'), { dead: 'npc_sk_01' });
export const VANE_DEAD: Cond = ANY(F('cr_celestine_dead'), { dead: 'npc_cr_01' });
export const VANE_LATE: Cond = ALL(NOT(F('ks_vane')), NOT(VANE_DEAD), ON_SCHEDULE());
export const MAREN_LATE: Cond = ALL(NOT(F('ks_maren')), NOT({ dead: 'npc_hs_02' }), ON_SCHEDULE());
/** A slide's subject met (the coordinator's default 2), read only from what content writes: Chapter One's quests done in person
 * (Shale's trace; the map got from Kessler; Tribute Day faced at the wells, not the `settled` stage, which passes without the
 * player), the overpass's own first meetings, Wren joined, the buyout come due in Shale. Slides 1–4 have no condition: they are
 * always shown. */
const TRIBUTE_FACED: Cond = { quest: 'q_ch1_tribute', stage: ['paid', 'negotiated', 'sabotaged', 'fought'] };
export const MET_SHALE: Cond = ANY({ quest: 'q_ch1_shale', status: 'done' }, TRIBUTE_FACED, F('a3_buyout'));
export const MET_DOGS: Cond = ANY(F('rd_kessler_met'), F('rd_vasha_met'), F('rd_wren_met'), F('wren_joined'), { quest: 'q_ch1_map', status: 'done' }, TRIBUTE_FACED);
/** B6t: slides 7–12's subjects met (dialogue/a3_epilogue_city.ts), read only from what content writes: the place's own first
 * meetings, its quest done, or an outcome only the player's hand settles there. The Precinct's slide has no condition: every road
 * to the steps runs through it. (The Sink's flood alone is not meeting it: it comes on the Spire's verdict, wherever the player is.) */
export const MET_GUILD: Cond = ANY({ quest: 'q_a2_ninebridge', status: 'done' }, F('nb_sarr_met'), F('nb_fen_met'), F('nb_floor_ok'));
export const MET_CHOIR: Cond = ANY({ quest: 'q_a2_openfield', status: 'done' }, F('of_mason_met'), F('of_blight_told'), F('petra_met'), F('doria_met'));
export const MET_SINK: Cond = ANY(F('ocho_met'), F('dagny_met'), F('lusk_met'), F('sk_pumps'));
export const MET_CROWN: Cond = ANY(F('celestine_met'), F('honora_met'), F('verity_met'), F('ks_vane'), F('cr_concern'), F('bw_turf'), F('bw_static'), F('bw_raid'));
export const MET_EDGES: Cond = ANY(F('dr_slate_met'), F('dr_bello_met'), F('dr_leven'), F('dr_buggy'), F('dk_connie_met'), F('dk_kobby_met'), F('dk_dahl_met'), F('dk_crane'),
  F('dk_hulls'), F('dk_cradle'), F('dk_stand_owed'), F('dk_prec_passenger'), F('a3_c9_after'));
/** B6u: slides 13–19's subjects met (dialogue/a3_epilogue_wilds.ts), read the same way. The Ashlands' slide is also shown when the
 * hounds woke (M5 `woken`: the Concern's end, its key to Kennel Seven, or its hounds at Knock), wherever the player was. */
export const MET_SKIRTS: Cond = ANY(F('hs_bell_met'), F('hs_maren_met'), F('hs_shift'), F('hs_parts'), B4B.inside);
export const MET_LINE: Cond = ANY(F('rc_brodsky_met'), F('rc_halina_met'), F('rc_chela_met'), F('rc_kask_met'), F('rc_line'), F('rc_engine'), F('rc_stock'));
export const MET_SHORE: Cond = ANY(F('ds_oona_met'), F('ds_lua_met'), F('ds_hamid_met'), F('ds_claim'), F('ds_court'), F('ds_light'), F('ds_boats_owed'));
export const MET_TEETH: Cond = ANY(F('tm_ragna_met'), F('tm_desmond_met'), F('tm_tova_met'), F('tm_four'), F('tm_digger'), F('tm_shift'));
export const MET_WET: Cond = ANY(F('nw_hedda_met'), F('nw_rhiannon_met'), F('nw_berit_met'), F('nw_magda_met'), F('nw_dam'), F('nw_feud'), F('nw_run'), F('nw_barges_owed'));
export const MET_WHEEL: Cond = ANY({ knows: 'sefa_met' }, { member: 'wheel' }, ALLY('wheel'), F('a3_mast_keeper', 'wheel'));
export const MET_ASHLANDS: Cond = ANY(F('hester_met'), F('an_kelso'), F('an_reserve'), F('an_key'), F('an_kites'), F('an_board'), END_IS('concern'), HOUNDS_CONCERN, F('a3_hounds_in'));
/** B6u: the Ashlands' other outcomes (B5d's flags, read only here): the reserve sealed by its Lieutenant, the kites' beacon cut, the contractor's end at Kelso, the boy
 * on the kite day, the four chalked on Spindle's board. */
export const AN_SEALED: Cond = F('an_reserve', 'sealed');
export const AN_KITES_DOWN: Cond = F('an_kites', 'down');
export const AN_SORLIE = (v: 'gone' | 'out' | 'dead'): Cond => F('an_sorlie', v);
export const AN_KWESI_DEAD: Cond = F('an_kwesi_dead');
export const AN_BOARD_CHALKED: Cond = F('an_board_chalked');
/** B6u: the arcology slice's further outcomes the Skirts' slide reads (B4b, read only here, as B4B's are): floor nine, Nils on the
 * ward, the old Chair retired to his bench. */
export const HC_CLINIC = (v: 'freed' | 'closed' | 'left'): Cond => F('hc_clinic', v);
export const HC_NILS = (v: 'dead' | 'freed'): Cond => F('hc_nils', v);
export const HC_CHAIR_RETIRED: Cond = F('hc_chair', 'retired');
/** B6v: the companions' ends (slides 20–26) and R49 (slide 27; dialogue/a3_epilogue_people.ts), read only from what content writes.
 * A companion's slide shows once the player met them in person (their own first meeting, or joining); Tamsin's has no condition: she
 * was the voice at the Grille. `CHAIR_TOOK`: a sealed reserve relocated by the chair's first signed act (M4 relocated with the door
 * sealed). `EP_CHAIR`: the PC in the sash, in the city (R49's home `city`). `EP_STAYED`: on the player's side at the end and still
 * beside them after it, less the ones the end itself sends away (§7: Tamsin when the chair takes the reserve, Wren under C or when her
 * rope comes due, Ilya under A1, Ash under C, Nine under B, Kes under C or dead), whether or not the climax wrote their leaving.
 * `EP_TOGETHER`: the romance's end is together (§7, by the end reached); R49 shows the partner only then. */
export const MET_COMPANION: Record<CompanionKey, Cond | undefined> = {
  tamsin: undefined,
  wren: ANY(F('rd_wren_met'), F('wren_joined')),
  ilya: ANY(F('ilya_met'), F('ilya_recruited')),
  odile: ANY(F('odile_met'), F('odile_joined')),
  ash: ANY(F('ash_met'), F('ash_joined')),
  nine: ANY(F('nine_met'), F('nine_joined')),
  kes: ANY(F('kes_met'), F('kes_joined')),
};
export const CHAIR_TOOK: Cond = ALL(F('a3_c9', 'sealed'), SASH_WORN, ANY(END_IS('plan'), END_IS('concern'), ALL(END_IS('amendment'), NOT(F('a3_amend_reserve')))), NOT(F('ca_reserve', 'stayed')));
export const EP_CHAIR: Cond = EP_HOME.values.find((v) => v.id === 'city')!.if!;
export const EP_STAYED: Record<CompanionKey, Cond> = {
  tamsin: ALL(WITH_YOU('tamsin'), NOT(CHAIR_TOOK)),
  wren: ALL(ON_SIDE('wren'), NOT(END_IS('concern')), NOT(WREN_ROPE_LATE)),
  ilya: ALL(ON_SIDE('ilya'), NOT(ENDED_A1)),
  odile: ON_SIDE('odile'),
  ash: ALL(ON_SIDE('ash'), NOT(END_IS('concern'))),
  nine: ALL(ON_SIDE('nine'), NOT(END_IS('unwritten'))),
  kes: ALL(ON_SIDE('kes'), NOT(END_IS('concern')), NOT(F('kes_dead'))),
};
/** The romance's end as the end reached allows it (§7), before asking whether the companion stayed: the slides read it where their
 * own selector already says the companion is beside the player. */
export const EP_TOGETHER_END: Record<'tamsin' | 'wren' | 'ilya' | 'kes', Cond> = {
  tamsin: ALL(F('tam_romance', 'together'), ANY(END_IS('unwritten'), END_IS('opensky'), ENDED_A2, ALL(END_IS('amendment'), F('a3_amend_living')))),
  wren: F('wren_rom', 'committed'),
  ilya: ALL(F('ilya_rom', 'committed'), NOT(END_IS('concern')), ANY(NOT(END_IS('amendment')), { approval: { companion: ILYA, gte: 50 } })),
  kes: ALL(F('kes_rom', 'committed'), ANY(NOT(ENDED_A1), { approval: { companion: KES, gte: 60 } })),
};
export const EP_TOGETHER: Record<'tamsin' | 'wren' | 'ilya' | 'kes', Cond> = {
  tamsin: ALL(EP_TOGETHER_END.tamsin, EP_STAYED.tamsin), wren: ALL(EP_TOGETHER_END.wren, EP_STAYED.wren),
  ilya: ALL(EP_TOGETHER_END.ilya, EP_STAYED.ilya), kes: ALL(EP_TOGETHER_END.kes, EP_STAYED.kes),
};

/** B6r: the five ends played out (dialogue/a3_ends.ts, from the desk's "(Go on.)" to the epilogue). The maps mirror these
 * (gen_md_vault.py, gen_md_spire.py). B: the Spire's stair wardens come down when the core is brought down (its last clause: the
 * wardens keep the stair, then the pumps); Lowe lets the party pass only if he stood his column down at the door and trusts the
 * player; the couriers' drop is the other way up. C: the Unwritten's blade comes for the courier with the signed paper while he
 * lives and was not given to the wardens on the steps. D: the night's price is M7's band as the reading leaves the close at dawn
 * (`ep_sky`); Signal Hill's switch handle still in the player's pack (Knock keeps the hill and nobody was sent up) must be sent
 * west before the relay can carry anything. E: the clause picker writes `a3_amend_<id>` and counts `a3_amends` (at most three). */
export const VAULT_WARDENS = ['npc_a3_g19', 'npc_a3_g20', 'npc_a3_g21', 'npc_a3_g22'];
export const VAULT_FIGHTING: Cond = ALL(F('a3_vault_fight'), NOT(F('a3_vault_out')));
export const VAULT_WARDENS_DOWN: Cond = ALL(...VAULT_WARDENS.map((id): Cond => ({ dead: id })));
export const LOWE_LETS_PASS: Cond = ALL(F('a3_lowe', 'stood_down'), { trust: { npc: LOWE, gte: 25 } }, NOT(LOWE_DEAD));
export const CRATES_BLADE: Cond = ALL(NOT(THADDEUS_DEAD), NOT(F('a3_blade', 'wardens')));
export const THAD_CRATES = `${THADDEUS}_crates`;
export const CRATES_FIGHTING: Cond = ALL(F('a3_crates_fight'), NOT(F('a3_crates')));
export const SKY_GUARDS = ['npc_a3_g23', 'npc_a3_g24', 'npc_a3_g25'];
export const SKY_HELD: Cond = M7_SKY.values[0].if!;
export const SKY_HARD: Cond = ALL(M7_SKY.values[1].if!, NOT(SKY_HELD));
export const SKY_BURNING: Cond = NOT(M7_SKY.values[1].if!);
export const SKY_FIGHTING: Cond = ALL(F('a3_sky_fight'), NOT(F('ep_sky')));
export const SKY_GUARDS_DOWN: Cond = ALL(...SKY_GUARDS.map((id): Cond => ({ dead: id })));
export const HANDLE_IN_PACK: Cond = ALL(F('a3_mast_keeper', 'knock'), NOT(F('a3_mast_handle', 'amos')));
export const AMENDS_FULL: Cond = { flag: 'a3_amends', gte: 3 };

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
 * B6j (built; dialogue/a3_door.ts: d_a3_door at the yellow line on Knock's apron (the column's lead, its apron placements and the
 *      map's trigger a3_door_line open it), d_a3_tam_door (Tamsin in the door); "bring the column down" spread into d_a3_lowe;
 *      the hatch and door props' after-door entries spread into knock.ts; Wren's and Tamsin's red lines in their own trees; npcs
 *      npc_a3_g15..g18 (A3_SLOPE_NPCS); map c9_mouth via tools/maps/gen_knock.py; map shale via gen_shale.py, Tamsin's placement):
 *   a3_c9                    sealed | opened | relocated   the door settled (q_a3_cistern ends on it; a3_summons is armed by it)
 *   a3_c9_how                lowe | welded | struck | fought | ines | order | forced | sold | consent   how: lowe = the column
 *                                            stood down (Speech 60, or the formal declining under prec_reserve = attendance);
 *                                            welded from inside (Mechanics 40); struck = Pell's charts UNFIT (read STRUCK_AS);
 *                                            fought = the column broken (the map's four after-triggers); ines = opened by the
 *                                            ring's vote once the column had gone (a3_c9_by says how it went); order = the
 *                                            designate's word; forced = the word, then force over Tamsin in the door; sold =
 *                                            the guild's paper signed (forced over her too: how stays sold, a3_door_forced);
 *                                            consent = the ring voted to go, and walked out (added: the plan had no value for it)
 *   a3_c9_by                 lowe | struck | fought   with a3_c9 = opened: the sealed route that cleared the column first
 *   a3_lowe                  stood_down | withdrawn | yielded | dead | carried   the column's lead at the door (Lowe, or Reyes or
 *                                            Kress leading in his place): withdrawn (added) = the order could not execute
 *                                            (welded, struck) and the column went home without standing down; carried = the
 *                                            order executed (order, forced, sold, consent). Lowe dead at the door: LOWE_DEAD sees
 *                                            his apron instance (npc_md_01_apron); read a3_lowe for who led
 *   a3_column_apron          true            (B6h's flag, also set here) the column down the lane at the yellow line: by
 *                                            "bring the column down" at the camp (d_a3_lowe), or the door cycled from outside
 *   a3_door_word             order | sold | false   the designate's word or signature given and not yet carried out (Tamsin in
 *                                            the door); false once carried out or taken back ("not over her")
 *   a3_tam_door              true | false    Tamsin went into the door over the word or the signature (her red line); false
 *                                            once Nine carried her out of it (a3_tam_carried true)
 *   tam_left                 door | reserve  U8's flag: door = she left the player at the door to stand in it (placed at
 *                                            tam_door, d_a3_tam_door, while it is unsettled; never at Mags's again); reserve =
 *                                            on the player's side elsewhere, she heard of the reserve relocated; her own tree
 *                                            opens on a3_red, no asking her back. A Tamsin broken in Act 2 is won back by a
 *                                            sealed or opened door (tam_broken false)
 *   a3_tamsin_dead           true            she died in the door, only when the designate told the column to force it while
 *                                            she stood in it;  a3_door_forced  true  the door forced over her
 *   a3_nine_asked            true            the captain ordered Unit 9 to take her out of the door (Nine's break, once)
 *   nine_left / nine_gone    door / true     the player's unit ordered by its keeper to take her out: it refused and left for
 *                                            good;  a3_nine_struck  true (+ nine_gone)  the city's conscience unit refused
 *                                            and the wardens struck it off;  a3_nine_spared  true  the designate talked the
 *                                            captain out of it (Speech 45);  a3_nine_countermand  true  a deputy told to refuse
 *   a3_door_fight            true            the column drawn on at the door (its hostileIf; Lowe's, Reyes's; Corin's and the
 *                                            slope's ally): settled by c9_mouth's a3_door_{broken|yields}_{open|shut}
 *   a3_claim                 off | paid | held   Orme's book of claims at the struck door (STRUCK_TRAP): talked down, paid
 *                                            her stake (120), or let her write: held = sealed and struck, and the sixty the
 *                                            guild's salvage the moment they step out (STRUCK_AS reads claimed)
 *   a3_guild                 signed          (B6g's flag) the paper signed at the door; also paper_held | refused there
 *   wren_left                sold            her red line: travelling, at the door (wren_sold); waiting, at her next word
 *   a3_mother                kept | knock    MOTHER's first words after the door (sealed: kept; opened or relocated: knock),
 *                                            unless asleep or burned. MOTHER_AFTER reads it whether or not her line was heard
 *   a3_kes_numbed            true            Kes numbed at the line by the Concern's leash (travelling, kes_link kept, the guild
 *                                            or the Concern in play)
 *   knowledge: a3_door_line (the line seen), a3_door_declined, a3_attending, a3_door_fought_seen, a3_intake_terms;  memories
 *                            npc_md_01 a3_stood_down / a3_declined / a3_drawn_on / a3_forced / a3_attended, npc_kn_maud a3_carried /
 *                            a3_sold / a3_opened / a3_forced / a3_tam_door, npc_c9_01 a3_carried / a3_sold / a3_opened / a3_forced,
 *                            npc_c9_03 a3_in_the_door / a3_door_held / a3_reserve_taken, npc_md_nine a3_ordered_arrest /
 *                            a3_not_ordered / a3_stood_with / a3_told_refuse / a3_told_obey, npc_rd_03 sold_the_reserve,
 *                            npc_c9_05 a3_emptied, npc_kn_factor a3_claim_off / a3_claim_paid / a3_signed, npc_hs_01 a3_numbed_at_door
 * B6k (built; dialogue/a3_after.ts: d_a3_platform at Carrick's buffer (the column's lead, Kress, Ines and Effie at the car, and the
 *      map's trigger a3_buffer open it), d_a3_tam_after (Tamsin after the door), d_a3_ck_ines/_effie (the residents in Carrick after
 *      they walked), d_a3_ap_ines/_ola/_wes/_effie (on Knock's apron after an opened door); after-the-door nodes spread into B6f's
 *      Maud, Corin, Linnet, Knock's others and the Grille, and B6h's Ines, Pell, Bram, Teague and the residents; maps md_docks via
 *      gen_md_docks.py, c9_mouth via gen_knock.py; world event a3_buffer_post, the receipt slip; CARRIED_WEST, PLATFORM_OPEN, TAM_*):
 *   a3_c9_after              walked | held   the reserve carried west (CARRIED_WEST: order | forced | consent; never sold) and held at
 *                                            Carrick's buffer for the designate's word (PLATFORM_OPEN): walked = off the car, free in
 *                                            the city; held = received by Precinct Supply on the designate's word (consent and held:
 *                                            q_a3_platform ends `went`, done; otherwise `held`, failed). Nothing sets it unasked
 *   a3_buffer_how            court | stand | cradle   how they walked: the Harbour court at six (passengers; no check with
 *                                            dk_prec_passenger, else Speech 45), the Stand blacking the car (dk_stand_owed or
 *                                            a3_ally_stand), down the river stairs into the Hulls by night (Stealth 45; they are crew in
 *                                            the Star's crew book). Where they are after: the Boxes (court, stand) or the Star (cradle)
 *   a3_buffer_found          true            the Harbour court found the passenger ruling at the buffer for the first time
 *   a3_buffer_court          adjourned       the court's argument failed: spent; the other ways stay
 *   a3_buffer_watched        true            the cradle's night tried and caught: spent
 *   dk_prec_passenger        true            (B5b's flag) also set by the court at the buffer: E's clause `passenger`
 *   a3_mast_handle           amos            Signal Hill's switch handle given to Amos Crofts of Knock, who keeps the hill (only with
 *                                            a3_mast_keeper = knock, after the door; B6r: who throws the switch)
 *   a3_summoned              true            (B6a) the Ledger's card, at the next seven o'clock anywhere once a3_c9 is set, whatever
 *                                            the door; the same morning as the receipt slip (world event a3_buffer_post) when the
 *                                            reserve was carried west
 *   q_a3_platform            buffer -> walked | went | held   started by the slip, the map's trigger or the scene
 *   Tamsin after the door    TAM_STOOD (tam_left = door, alive): TAM_AT_BUFFER (behind the car, md_docks npc_c9_03_buffer),
 *                                            TAM_IN_CARRICK (with them after: _carrick / _hulls), TAM_AT_KNOCK_AFTER (on the apron by
 *                                            the door: c9_mouth npc_c9_03_after; also when they were received without her). One place
 *                                            only; dead, nowhere (trigger a3_tam_line marks where she died)
 *   knowledge: a3_buffer_seen, a3_buffer_receipt (the Harbour Act hint), a3_buffer_asked (consent: what they want), a3k_maud,
 *                            a3k_hatch_seven (MOTHER opening the hatch to Knock: the stores given under relocation), a3k_grille,
 *                            a3k_r1..r4, a3k_tam_line, a3k_tam_<sealed|opened|sold|held|buffer|carrick>, a3k_in_<ines|pell|bram|teague>;
 *                            memories npc_c9_01 a3_walked_off / a3_received, npc_md_01 a3_received, npc_c9_03 a3_got_them_off,
 *                            npc_kn_maud a3k_seven, npc_kn_r4 a3k_hill, npc_c9_05 a3k_asked
 *   placements:              Knock (opened): npc_c9_01_apron, npc_c9_r1/_r2/_r4_apron; the guild's Hale and handlers are not
 *                            placed after a3_c9_how = sold (they walked the sixty up the guild's road)
 * B6l (built; dialogue/a3_close.ts: who came to the Spire's close (d_a3_close, opened once by md_spire's trigger a3_close), the
 *      Concern's officer d_a3_quill (Soto's nodes s_*, Quill's q_*), the Grand Factor's copy (SARR_* into d_nb_sarr), the register
 *      back (MARWOOD_* into d_ar_keeper, d_a3_acquisitions at the drawer prop ar_acquisitions, COMFORT_* into d_ar_copyist), Lowe or
 *      Reyes (d_a3_lowe_close), the Unwritten (d_a3_petra_close, _thaddeus_close, _rhoda_close), a hidden Nine (d_a3_nine_walkin), the
 *      allies' envoys and readers (d_a3_keziah, _lucan, _ifeoma, _tuan, _verity_close, _seventeen_close), case calla on the Court's
 *      bench (callaCase in md_court.ts); npcs npc_a3_31..34 (npcs/a3_close.ts); map md_spire via gen_md_spire.py (placements on
 *      AT_CLOSE), and home placements stepped aside via gen_md_crown / gen_hc_halcyon / gen_md_precinct / gen_md_bridgeward / gen_openfield):
 *   a3_concern_terms         accepted | refused   the Concern's instrument of transfer for the core (item k_a3_transfer): taken or
 *                                            carried (accepted, the paper given; C_BUYER), refused at the close, or given back
 *                                            (refused). The officer never offers twice; SARR_OFFERS opens the Grand Factor's copy
 *   a3_terms_how             taken | carried   "I'll sign it at the core" or "I'll carry it, that's all I'll promise"
 *   a3_terms_from            officer | sarr   whose copy the paper in the pack is
 *   a3_terms_returned        true            the paper given back to the officer, unsigned (a3_concern_terms = refused)
 *   a3_sarr_terms            accepted | refused   the Grand Factor answered at Ninebridge (refused: final, nobody offers again)
 *   a3_register_back         true            the Court's register (sold to the catalogue in Act 2: prec_register = catalogued, never
 *                                            rewritten) back on the desk under the bench (E_REG's alternate)
 *   a3_register_how          bought | word | lifted   200 Tolls to Keeper Marwood; Speech 50 on Comfort Asamoah's word that it was
 *                                            lent (knowledge a3_comfort_word); lifted from the acquisitions drawer at night (Security 45)
 *   a3_acq_woken             true            the drawer tried and Marwood woke: the S route is spent (she sleeps facing it)
 *   a3_lowe_close            true            the column's lead (Lowe, or Reyes) spoken to at the close
 *   a3_nine_fetched          true            (B6b's flag) also set by a hidden Nine walking in at the close (d_a3_nine_walkin)
 *   ca_calla                 speech | void | privilege | upheld   case calla (only while CALLA_HELD): speech = HELD: speech is not
 *                                            sedition (a precedent: prec_sedition, ca_precedents +1); void = the listing lay on a
 *                                            forecast and the register's FINES heading voids it (no new precedent); privilege = a
 *                                            courtesy to the designate (no precedent); upheld = she stays held
 *   prec_sedition            speech          the Court's new heading (CLAUSES' `speech`)
 *   ks_calla                 free            (B5d's keystone 7) written by her release at the Court (speech | void | privilege), so
 *                                            CALLA_FREE reads it and CALLA_HELD stops
 *   knowledge: a3_close_seen, a3_officer_met, a3_sarr_holds (told the Grand Factor holds the guild's copy), a3_comfort_word,
 *                            a3_lowe_close_met, a3_reyes_close_met, a3_lowe_list (Lowe's folded eviction list: thirty-one names and
 *                            KNOCK), a3_uw_close_met, a3_calla_told, a3_calla_freed, a3_close_choir / _wheel / _stand / _gangs /
 *                            _saints / _seventeen (each envoy or reader heard);  memories npc_ar_03 a3_book_lifted / a3_drawer_tried,
 *                            npc_md_01 a3_gave_list
 * B6m (built; dialogue/a3_ready.ts: the works' trestle d_a3_ready (prop a3_ready on md_spire), the charge d_a3_charge (the same
 *      nodes at the trestle; Rafe Ansel's placement npc_hs_03_close), the point of no return d_a3_pnr (trigger a3_pnr on the steps;
 *      its nodes PNR_NODES also in d_ar_steps and d_ar_doors); the warning letters a3_warn_* in world/a3_letters.ts; q_a3_hold filled):
 *   a3_ready                 0..8 (count)   readiness for the night after the steps; M7 reads it (held >= 5, hard >= 2)
 *   a3_ready_<act>           true           one per READY_ACTS id, asked once at the trestle (READY_OPEN): choir | stand | gangs |
 *                                            wheel | lowe (a3_lowe = stood_down only, never withdrawn) | saints | nine (Nine on the
 *                                            player's side, or its fair copy) | warned (a3_warned >= 3)
 *   a3_warned                1..10 (count)  the living on the city's list who answered the player's letter with their line in it
 *                                            (a3_warn_jonah | _ada | _kessler | _vasha | _calla | _calla_held | _mason | _sarr |
 *                                            _ocho | _vane | _maren; one per person); knowledge a3_warned_<who> on sending
 *   a3_charge_how            shift | cases | powder | kes   how the charge was made: the Shift's two cases wired by its hand
 *                                            (Rafe, or Orrin), Number Six's six cases (k_hs_powder) or four twists of black powder
 *                                            (j_powder) wired with Explosives 40, either of those wired by Kes. Item k_a3_charge, once
 *   a3_pnr                   true           the designate went up the steps from the lamp (d_a3_pnr's "(Go up.)", after its warning).
 *                                            The same option first emits { event: 'save', data: { slot: 'steps', label: 'Before the
 *                                            steps' } } (the save is of the state before a3_pnr), and after it { event: 'goto' } to
 *                                            md_spire's spawn `steps`; decision a3_pnr
 *   knowledge: a3_trestle (the trestle first seen); a3_warned_<who>;  decisions a3_ready_<act>, a3_charge, a3_pnr;
 *                            memories <keystone> a3_warned; trust +3 with whoever promised an act
 *   placements:              md_spire npc_hs_03_close (AT_CLOSE ∧ RAFE_WIRES); hs_skirts Rafe away while he is at the close
 * B6p (built; dialogue/a3_steps.ts: the steps d_a3_steps (opened by B6m's "(Go up.)" after its goto, by the map's trigger a3_steps while
 *      STEPS_OPEN, and by Three's placement), the column's lead at the foot d_a3_steps_lowe; map md_spire via gen_md_spire.py):
 *   a3_sash                  worn | refused   written ONCE, as the player goes down to the steel door at the end of the steps (so
 *                                            AT_VAULT means the steps are done; q_a3_spire moves to vault); decision a3_sash
 *   a3_steps_sash            worn | refused   the hand's answer during the scene (STEPS_WORN); worn can become refused once, by taking
 *                                            it off in front of Ash or the blade;  a3_steps_off  true  it was taken off again
 *   a3_sash_torn             true            the clasp torn out to stop Ash at the lamp (the sash is refused, and torn)
 *   a3_file                  contested | failed   the second hearing on the steps (HEARING_OPEN: once, before the sash is answered, unless
 *                                            ar_verdict = contested); contested is E_FILE's third way. Speech 55 with the plan's mods
 *   a3_first_sign            people | door | nothing | water | unsure   "What's the first thing you'll sign?", asked once the sash is on:
 *                                            by Tamsin (TAM_ASKS: on the steps), else by Ash when his orders are undecided. SIGN_FRIENDLY =
 *                                            people | nothing (B6q/B6r can hold the player to it)
 *   a3_ash                   between | faced | struck | self | away   Ash's orders on the steps (ASH_MODE, once the sash is on; unset =
 *                                            the sash refused at once, or Ash not on the steps): between = the letter burned (refused /
 *                                            refused_late), or undecided and a friendly first sign (he tears it up: ash_orders is NOT
 *                                            rewritten); faced = he came to the face and was heard (Speech 50), or the sash came off, or he
 *                                            was talked out of his own gun at the lamp; struck = he drew, could not fire first, hit the
 *                                            player with the stock and walked away (leave, ash_left = struck); self = the order fell on
 *                                            himself at the lamp (only ASH_SELF_RISK ∧ letter not burned; leave; COMPANIONS.ash.gone);
 *                                            away = ash_orders other with a keystone to put it on (leave, ash_left = orders)
 *   a3_ash_target            vane | vasha | sarr   (away) whom he went to: ASH_TARGET, first match. The keystone's own death flag is
 *                                            written with it: cr_celestine_dead | vasha_dead | ks_sarr = dead. Slides read a3_ash_target for how
 *   a3_ash_scarred           true            Ash took the blade across the face standing between (his `between` end: scarred, alive)
 *   a3_ash_saved             true            talked out of his gun, or the sash torn off, at the lamp (faced)
 *   ash_left                 struck | orders  (U8's flag, new values) Ash walked off the steps: after striking the player / to pay the sky
 *   a3_blade                 ash | talked | wardens | fought | off   the Unwritten's blade (Thaddeus; BLADE_DUE: the sash on ∧ BLADE_SENT
 *                                            (a3_unwritten = with_you ∨ ASH_REFUSED) ∧ alive): Ash took the cut / talked into sitting down
 *                                            (Speech 50) / taken by the wardens (choir −10) / killed on the steps / the sash taken off
 *   a3_blade_fight           true            "(Draw on him.)": Thaddeus's hostileIf (npcs/a3_knock.ts) until a3_blade; the map's trigger
 *                                            a3_blade_after (his steps placement dead) reopens the scene, which sets a3_blade = fought
 *   a3_steps_photo           true            the photograph made again on arrival: { event: 'photo', data: { place: 'md_spire', spot:
 *                                            'steps_sit' } }, once;  knowledge a3_steps_seen
 *   events:                  B6m's GO_UP now ends with { event: 'dialogue', data: { tree: 'd_a3_steps' } } after its goto
 *   placements:              md_spire (all from a3_pnr): npc_ar_01_steps (Three with the sash; its bench placement steps aside),
 *                            <companion>_steps (ON_STEPS ∧ not travelling; a hidden Nine never fetched is not on the steps),
 *                            npc_md_01_steps / npc_md_12_steps (the lead at the foot), npc_a3_u2_steps (the blade: STEPS_OPEN ∧ alive ∧
 *                            not taken by the wardens ∧ (with_you ∨ (BLADE_SENT ∧ STEPS_WORN))); triggers a3_steps, a3_blade_after
 *   decisions:               a3_sash, a3_file, a3_ash, a3_blade
 * B6s (built; the epilogue: dialogue/a3_epilogue_kit.ts (the builder epilogueTree, SlideSpec), a3_epilogue_open.ts (slides 1–6),
 *      a3_epilogue.ts (d_a3_epilogue, the assembly: B6t–B6v add one spread line each); no map, no world event):
 *   ep_<slide>               the variant id shown (set on entering its page): ep_steps unwritten | concern | opensky | amended | worn
 *                            | refused; ep_ledger dark | sold | open_held | open_hard | open_burning | agreed | plan | rerouted;
 *                            ep_cistern = M4's value (opened | walked | sold | relocated | struck | sealed); ep_knock open | dark |
 *                            emptied | kept; ep_shale free | mourned | company | dogs | abandoned | contracted | unasked; ep_dogs
 *                            fulfilled | executioner | kade | pens | exodus | kessler. Unset = not shown (not met, or skipped)
 *   ep_turned                true            a page has been turned ("(Next.)"): "(Skip to the end.)" is offered from then on
 *   ep_skip                  true            the rest skipped: the tree opens on its closing page
 *   ep_done                  true            the closing page reached; its option fires { event: 'credits' } (then the title)
 *   events:                  { event: 'slide', data: SlideData } on entering each page (slide, variant, place, spot, people with their
 *                            `if`, pc.years, light, weather: runtime ask §9.1); every "(Next.)" / skip is an exit with { event:
 *                            'dialogue', data: { tree: 'd_a3_epilogue', name: 'Afterwards' } }: the runtime reopens the tree, whose
 *                            start list (first match) is the router; the end's climax (B6r) opens it the same way
 *   (read, B6q/B6r/B6p)      a3_end (the tree opens only once it is set), a3_sash (M6, ENDED_A1/A2), a3_amend_<clause> (ON_SCHEDULE's
 *                            covers; the Cistern's reserve and passenger clauses), ep_sky held | hard | burning (EP_SKY: B6r's
 *                            record of the night's price wins over the readiness count), a3_ash_target vane | vasha | sarr (whose
 *                            hand, in the twelve's lines), a3_ash = self and a3_blade = fought | ash (the steps' own lines)
 *   (read, met)              MET_SHALE: q_ch1_shale done, Tribute Day faced (q_ch1_tribute paid | negotiated | sabotaged | fought,
 *                            never settled), a3_buyout;  MET_DOGS: rd_kessler_met, rd_vasha_met, rd_wren_met, wren_joined, q_ch1_map
 *                            done, Tribute Day faced
 *   conditions:              ENDED, ENDED_A1, ENDED_A2, ON_SCHEDULE(...covers), EP_SKY, JONAH_DEAD, ADA_DEAD, ADA_OPEN, ADA_LATE,
 *                            KESSLER_DEAD, KESSLER_LATE, VASHA_DEAD, VASHA_EXECUTIONER, WREN_ROPE_OPEN, WREN_ROPE_LATE (§7: A1 or C),
 *                            CALLA_KEPT, OCHO_DROWNED, VANE_DEAD, VANE_LATE, MAREN_LATE, MET_SHALE, MET_DOGS
 * B6q (built; dialogue/a3_vault.ts: the Ledger's last conversation and the choice d_a3_ledger (opened by md_vault's trigger
 *      a3_vault_hall, the racks and the reading desk), d_a3_vault_drop, d_a3_vault_trunk; d_ar_vault's Act 3 entry VAULT_DOOR_*
 *      (md_spire.ts: the steel door open on the stair once AT_VAULT, goto md_vault/door); map md_vault via tools/maps/gen_md_vault.py
 *      (cell; spots door | drop | core | desk; spawns start | door; exit up to md_spire's new spawn from_vault); VAULT_OPEN, DOWN_*,
 *      READ_*, RESERVE_UNDER_PEN after CLAUSES):
 *   a3_end                   plan | unwritten | concern | opensky | amendment   chosen at the reading desk, asked twice ("(No. Not
 *                                            that.)" changes nothing); offered exactly when its gate holds (ENDS: plan as A1 with the
 *                                            sash worn, as A2 with it refused); a way not held is never offered or named. Decision a3_end
 *   a3_down_how              fire | charge | coupling   (unwritten) how it is brought down: fire = DOWN_FIRE (the Unwritten turned,
 *                                            the Choir's night, Ash travelling with his orders refused), charge = k_a3_charge,
 *                                            coupling = a3_bram_cut ∧ Mechanics 50 (Bram's first coupling, under load)
 *   a3_reader                self | nine | verity | seventeen   (opensky) who reads: READ_SELF (archive clerk ∨ Science 65), READ_NINE
 *                                            (travelling, conscience or the log given), READ_VERITY (the Saints, or their boy if Verity
 *                                            is dead), READ_SEVENTEEN
 *   a3_vault_met             true            the hall entered and the Ledger's first words begun (arrive); knowledge a3_vault_seen
 *   knowledge: a3_vault_stair (the stair's trigger), a3_ledger_why, a3_ledger_reserve, a3_ledger_refused (asked to tear the order up:
 *                            it cannot), a3_ledger_unseen, a3_ledger_for, a3_ledger_want, a3_ledger_wait, a3_cost_<sign | walk | down |
 *                            sell | read | amend> (each way's cost heard, only for ways held), a3_vault_drop_seen, a3_vault_shaft,
 *                            a3_vault_trunk_seen
 *   thresholds (B6r):        the choice's last node per act (done_sign | done_walk | done_down | done_sell | done_read | done_amend)
 *                            exits on "(Go on.)" with option id vault.go.<act>; d_a3_ledger's start (LEDGER_START) opens v_after once
 *                            a3_end is set: B6r's climaxes go before it, or on those options
 *   (read)                   AT_VAULT, A1, A2, B, C, D, E and their keys; a3_file, ar_verdict, a3_steps_off (the first words);
 *                            LN(side) (why now); a3_c9, a3_c9_how, a3_c9_after, a3_buffer_how, ca_reserve, prec_unrecorded,
 *                            STRUCK_TRAP, a3_tamsin_dead, MOTHER_DARK (the reserve); tam_met, tam_why, kes_met, kes_link (the
 *                            uncounted); a3_letter_read, knowledge a3_ledger_granted, hc_scald_owned; a3_ready / a3_ready_<act>
 *                            (the night after reading); CLAUSES' needs; the open keystone lines (ADA_OPEN, WREN_ROPE_OPEN, ...);
 *                            a3_terms_from, a3_terms_how, TERMS_WORSE, hc_leash; a3_mast_keeper, a3_mast_handle; companions'
 *                            a3_<c>_word and a3_first_sign (their words at the confirmations)
 * B6t (built; the epilogue's slides 7–12: dialogue/a3_epilogue_city.ts, SLIDES_CITY spread into EP_SPECS; no map, no world event):
 *   ep_<slide>               ep_guild concern | worthless | idle | audited | scheduled | rerouted (by the end); ep_choir open | burned |
 *                            company | evicted | scorched | stands (D, then Openfield as the Long Night left it); ep_precinct failing
 *                            | wall | clauses | contracted | orders | rerouted (by the end); ep_sink = M2's value (lost | held | saved |
 *                            relieved | flooded); ep_crown ash | fallen | risen | broken | late | table (House Vane); ep_edges walked
 *                            | stood | cleared | burned | clover (Carrick, then the Ring). Unset = not shown (not met, or skipped)
 *   (read, met)              MET_GUILD: q_a2_ninebridge done, nb_sarr_met, nb_fen_met, nb_floor_ok;  MET_CHOIR: q_a2_openfield done,
 *                            of_mason_met, of_blight_told, petra_met, doria_met;  MET_SINK: ocho_met, dagny_met, lusk_met, sk_pumps
 *                            (never the flood alone);  MET_CROWN: celestine_met, honora_met, verity_met, ks_vane, cr_concern, bw_turf,
 *                            bw_static, bw_raid;  MET_EDGES: dr_slate_met, dr_bello_met, dr_leven, dr_buggy, dk_connie_met,
 *                            dk_kobby_met, dk_dahl_met, dk_crane, dk_hulls, dk_cradle, dk_stand_owed, dk_prec_passenger, a3_c9_after.
 *                            The Precinct's slide has none
 *   (read, B6p/B6q/B6r)      a3_end, a3_sash, a3_amend_<clause> (one line per clause chosen, under precinct_clauses), a3_ash_target
 *                            sarr | vane (the guild's and the Crown's pages say "Brother Ash", as slide 2 does), knowledge
 *                            a3_warned_sarr (D: she sold first);  a3_lowe, a3_c9 / a3_c9_after / a3_buffer_how (the sixty in Carrick),
 *                            a3_unwritten / a3_uw_how / a3_uw_fight (Petra), a3_register_back
 *   facts later slides keep  Sarr per end as slide 2 (C the Concern's Treasurer; B of nothing; D ruined in daylight unless warned; E
 *                            audited, eleven fines paid; A1 named in the spring; A2 by the spring); under M2 = lost Ocho drowned on his
 *                            clinic's stair carrying the last cot (Anju had the clinic if he drowned in Act 2); Calla free goes back to
 *                            Shale's tent and walks to Openfield for the harvest; Mason's cairn under Openfield's windpump; under C the
 *                            Concern's freight at two carries Fen's lots up the Line
 * B6u (built; the epilogue's slides 13–19: dialogue/a3_epilogue_wilds.ts, SLIDES_WILDS spread into EP_SPECS; no map, no world event):
 *   ep_<slide>               ep_skirts opened | burned | risen | reformed | late | out | stands (M3 first, then the strike: late = still
 *                            out and broken on schedule, out = still out); ep_line through | pilot | shared | guild | levy | timetable
 *                            (C, then rc_line); ep_shore guild | rig | sea | unheard (ds_claim); ep_teeth exposed | ended | fought | kept
 *                            | free (tm_four); ep_wet truth | hidden | exposed | sunk | waiting (nw_dam); ep_wheel receivers | hill | kin
 *                            | turning; ep_ashlands = M5's value (yours | woken | feral | dormant). Unset = not shown (not met, or skipped)
 *   (read, met)              MET_SKIRTS: hs_bell_met, hs_maren_met, hs_shift, hs_parts, hc_inside (B4B.inside);  MET_LINE: rc_brodsky_met,
 *                            rc_halina_met, rc_chela_met, rc_kask_met, rc_line, rc_engine, rc_stock;  MET_SHORE: ds_oona_met, ds_lua_met,
 *                            ds_hamid_met, ds_claim, ds_court, ds_light, ds_boats_owed;  MET_TEETH: tm_ragna_met, tm_desmond_met,
 *                            tm_tova_met, tm_four, tm_digger, tm_shift;  MET_WET: nw_hedda_met, nw_rhiannon_met, nw_berit_met,
 *                            nw_magda_met, nw_dam, nw_feud, nw_run, nw_barges_owed;  MET_WHEEL: knows sefa_met, member wheel,
 *                            a3_ally_wheel, a3_mast_keeper = wheel;  MET_ASHLANDS: hester_met, an_kelso, an_reserve, an_key, an_kites,
 *                            an_board, or the hounds woke (a3_end = concern, HOUNDS_CONCERN, a3_hounds_in) wherever the player was
 *   (read, B6d/B6f/B6q/B6r)  a3_end, a3_sash (ENDED_A1), a3_mast_keeper = wheel (Dario keeps the hill; the receivers' switch), a3_ally_wheel
 *                            (D: the Wheel carried the receivers), a3_hounds_in (M5 woken)
 *   (read, the arcology)     through B4B and HC_* only: hc_inside, hc_leash (M1), hc_longlived (M3), hc_clinic freed | closed | left
 *                            (HC_CLINIC: floor nine), hc_nils dead | freed (HC_NILS), hc_chair = retired (HC_CHAIR_RETIRED: the old Chair
 *                            on his bench), hc_funicular down | stayed | reported (Linh Hoang). Without B4b: M3 only burned | risen |
 *                            stands, M1 only spread | theirs, and the arcology's lines are not shown
 *   (read, the Long Night)   through the aliases only: an_reserve (HOUNDS_PLAYER / _CONCERN / _FERAL, AN_SEALED), an_kites = down
 *                            (AN_KITES_DOWN), an_sorlie out | dead (AN_SORLIE), an_kwesi_dead (AN_KWESI_DEAD), an_board_chalked
 *                            (AN_BOARD_CHALKED)
 *   (read, the places)       hs_shift (STRIKE_OUT: unset = still out, never broken by the epilogue under A2, B or D; MAREN_LATE breaks it
 *                            under A1, C, E as slide 2 does), ks_maren, hs_parts, hs_nils;  rc_line, rc_abe, rc_chela, rc_stock, rc_engine,
 *                            rc_east, rc_derailed, rc_willem_dead;  ds_claim, ds_barge, ds_post, ds_valve, ds_rig, ds_hamid, ds_lua_gone,
 *                            ds_court, ds_light;  tm_four, tm_ragna, tm_digger, tm_digger_concern (with C: it answers the Concern),
 *                            tm_family_in;  nw_dam, nw_mend, nw_keepers, nw_feud, nw_run, nw_patience;  kes_joined (Kes in the Skirts'
 *                            still only if she never joined);  M9 skirts, fourways, hamlet_shore, number_four, ashby, wheel, spindle
 *   conditions:              MET_SKIRTS, MET_LINE, MET_SHORE, MET_TEETH, MET_WET, MET_WHEEL, MET_ASHLANDS, AN_SEALED, AN_KITES_DOWN,
 *                            AN_SORLIE, AN_KWESI_DEAD, AN_BOARD_CHALKED, HC_CLINIC, HC_NILS, HC_CHAIR_RETIRED
 *   facts later slides keep  Kennel Seven is four hundred and twelve hounds; under C the core goes up the funicular in sealed crates and
 *                            the through carries it east; under B no schedule card comes up the river and the Line's law is the clock at
 *                            Four Ways; Kes, never joined, is in the Skirts keeping the Window's lenses (B6v's slide agrees)
 * B6v (built; the epilogue's slides 20–27: dialogue/a3_epilogue_people.ts, SLIDES_PEOPLE spread into EP_SPECS; no map, no world event):
 *   ep_<slide>               ep_tamsin door | taken | inside | stood | reserve | chair | gone | waited | deputy | sheriff | wheel | knock
 *                            | after;  ep_wren hanged | rope_late | gone_sold | gone_concern | gone_guild | gone_girl | gone_floor |
 *                            shale | bridge | road | scout;  ep_ilya hunter | hunted | drunk | chair | shale | road | rest | own;
 *                            ep_odile gone | exchange | auditor | shale | kitchen | span;  ep_ash self | unwritten | gone | between |
 *                            digs | burial;  ep_nine struck | disposed | withdrawn | gone | reader | conscience | assessor | desk;
 *                            ep_kes dead | gone_concern | gone | fits | shift | road | gardens | slack;  ep_r49 chair | board | chosen |
 *                            broken_<knock|shale|road> | broken | known_<knock|shale|road> | known | elsewhere_<knock|shale|road> |
 *                            elsewhere (the end, then EP_HOME's value; nowhere has no suffix). Unset = not shown (not met, or skipped).
 *                            ep_home is not written: R49's home is EP_HOME's value (modValue), and the r49 variant id carries it
 *   (read, met)              MET_COMPANION: rd_wren_met | wren_joined, ilya_met | ilya_recruited, odile_met | odile_joined, ash_met |
 *                            ash_joined, nine_met | nine_joined, kes_met | kes_joined. Tamsin's slide and R49 have none
 *   (read, B6r: pending)     wren_left / kes_left = concern, nine_left = core (B6s's note: the vault's leavings, with leave). The slides
 *                            read the end as well (EP_STAYED), so a climax that writes no leaving still reads right
 *   (read, companions)       tam_romance together | stopped | ended, tam_listed, tam_broken, tam_home, tam_out, tam_left reserve | door
 *                            (TAM_STOOD, TAM_FOLLOWED, TAM_IN_CARRICK), a3_tam_carried, a3_tamsin_dead, a3_tamsin_word; wren_hanged,
 *                            wren_rope, wren_left (sold, with a3_c9_how sold for the door's sale | guild | longnight | block | away |
 *                            kept | floor), wren_after, wren_rom, a3_wren_word; ilya_left spared | bottle | floor, ilya_sober_days ≥ 30,
 *                            ilya_after, ilya_rom, vasha_fate, a3_ilya_word; odile_gone, odile_left, odile_archive, odile_sold_sable,
 *                            odile_sheet torn, odile_price sarr, a3_odile_word, a3_odile_last; a3_ash, a3_ash_target, a3_ash_scarred,
 *                            ash_gone, ash_left, ash_redline, ash_broke, ash_gully_outcome; a3_nine_struck, nine_disposed, a3_recall,
 *                            nine_gone, nine_left, nine_stance (NINE_CONSCIENCE), NINE_DEED, nine_log_given, a3_nine_last, a3_nine_word;
 *                            kes_dead, kes_left, kes_fits, kes_after, kes_link, kes_rom, a3_kes_word, hc_leash cut (B4B.leash)
 *   (read, the fire)         a romance begun (any step, ended included, never no/declined: tam_romance together | open | later |
 *                            stopped | ended, wren_rom / ilya_rom / kes_rom yes | later | later_<roof|well|dark> | <roof|well|dark> |
 *                            committed | ended) gives a line on a companion's page whether they stayed, walked or died; unfinished
 *                            with a3_<c>_night (asked on the last night and put off) or without; a3_<c>_last = none (the last night
 *                            as friends: tamsin, wren, ilya, kes, nine); a3_ash_word with a3_sash worn (his word broken),
 *                            a3_ash_last = burned (the letter burned at the fire)
 *   (people)                 no person's `if` reads a3_end or a3_sash: R49 has a page per end (and home), and its partner and the ones
 *                            who stayed (EP_TOGETHER, EP_STAYED) are evaluated against that page's end and the sash it implies when
 *                            the slide is built (C and E worn; the Plan after the chair refused)
 *   conditions:              MET_COMPANION, CHAIR_TOOK, EP_CHAIR, EP_STAYED, EP_TOGETHER_END, EP_TOGETHER
 * B6r (built; dialogue/a3_ends.ts: the five ends played out, one tree each, opened by the desk's "(Go on.)" (B6q's vault.go.<act>,
 *      now carrying { event: 'dialogue', data: END_TREE[act] }) and by the racks again (v_after's vault.after.<act>): d_a3_end_plan (A1
 *      worn / A2 refused), d_a3_end_unwritten, d_a3_end_concern, d_a3_end_opensky, d_a3_end_amendment; each a list of beats whose start
 *      list resumes at the first beat still due; maps md_vault via gen_md_vault.py, md_spire via gen_md_spire.py; npcs npc_a3_g19..g22
 *      (the Spire's stair wardens), npc_a3_g23..g25 (a Crown house's men); the conditions in the B6r block after EP_TOGETHER):
 *   a3_climax_done           true            the climax played out; its last option "(Afterwards.)" sets it and opens the epilogue
 *                                            ({ event: 'dialogue', data: { tree: 'd_a3_epilogue', name: 'Afterwards' } }); reopened, an
 *                                            end's tree offers the epilogue again
 *   (A1) a3_signed           true            the chair's first sheet signed (the reserve while RESERVE_UNDER_PEN, else the Sink's water);
 *                                            decision a3_first_paper.  a3_stacked  true  the night's stack signed (passives: the open lines
 *                                            of §5's twelve, ADA_LATE … MAREN_LATE, and Sarr).  a3_saluted  true  the column's lead (Lowe,
 *                                            Reyes, or a warden) came down and saluted; the way into the last beat waits until six
 *   a3_tam_walked            true            Tamsin walked away from the chair's first paper (A1 or C with the reserve under the pen and her at
 *                                            the desk; E with the reserve clause not written and her with the player); `leave` only: her slide
 *                                            reads CHAIR_TOOK (B6v's `chair`), so tam_left is NOT written.  Ilya under A1: `leave` only
 *   (A2) a3_walked_up        true            up the stair onto the close (goto md_spire from_vault).  a3_child  met | passed  the docker's
 *                                            girl the lens found: gone down to them, or away without looking; knowledge a3_child_told
 *   (B) a3_down              true            the core brought down (b_last: the Ledger's clause 212 and the hour; xp 200; decision a3_down);
 *                                            the charge taken from the pack when it is the means; the act waits for ten (the tower empty):
 *                                            { until: 22 } unless the hour is already ten
 *   nine_left                core            (U8's flag, new value) Nine's one plea at the core's door (travelling) or on the close (waiting
 *                                            on the steps): withdrawn with its grounds attached; `leave`; decision a3_nine_core
 *   a3_vault_fight           true            the stair wardens drawn on (their hostileIf with ¬a3_vault_out; md_vault's placements
 *                                            npc_a3_g19..g22 `if` VAULT_FIGHTING; combat event); trigger a3_vault_after (all four dead, or
 *                                            a3_vault_beaten) reopens the climax.  a3_vault_beaten  true  the wardens' `beaten` (lost forward)
 *   a3_vault_out             lowe | drop | taken | fought   how the player got out of the dark: Lowe stood aside (LOWE_LETS_PASS: stood
 *                                            down ∧ trust ≥ 25 ∧ alive), the couriers' drop (Stealth 45; failed → hands up or the fight),
 *                                            hands up (or beaten: the card says stair and pumps, nothing about the player), the fight won.
 *                                            decision a3_vault_out.  a3_dark  true  the dark close seen (stars).  decision a3_sash_left (worn:
 *                                            the sash folded on the top step, slide 1's); flag a3_sash_left  true  the same act (B6w: the
 *                                            dark close stays due until it is done, so a save on the dark close keeps the folding to do).
 *                                            a3_vault_up  true  up the stair out of the dark (every way out's exit; B6w: a save taken in the
 *                                            vault after the way out was settled resumes on the stair, beat b_stair, not on the close)
 *   (C) a3_sold              true            the paper signed slowly and read back (TRANSFERRED, AS SCHEDULED BY OTHERS); k_a3_transfer taken;
 *                                            decision a3_sold.  a3_sold_up  true  up to the close at night (goto; { until: 23 })
 *   wren_left / kes_left     concern         (U8's flags, new value) walked out of the vault (travelling; `leave`; approval −40) or found gone
 *                                            from the steps when the player comes up (waiting); never for a companion not on the player's side
 *   a3_crates                talked | guards | let | fought | none   the Unwritten's blade for the courier (Selma Ruud, the signed paper
 *                                            chained to her wrist): talked down (Speech 50), shot by the Concern's men (asked for, or past a
 *                                            failed word), let burn a courtesy copy, fought (a3_crates_fight: Thaddeus's hostileIf,
 *                                            placement npc_a3_u2_crates, trigger a3_crates_after), or nobody (CRATES_BLADE false: dead, or
 *                                            given to the wardens on the steps); decision a3_crates.  placements npc_a3_01_crates (the courier),
 *                                            npc_a3_u2_crates (CRATES_NIGHT ∧ CRATES_BLADE)
 *   (D) a3_handle_sent       courier | wheel   Signal Hill's switch handle sent west (HANDLE_IN_PACK: Knock keeps the hill, no Amos); a
 *                                            duration of four (courier) or three (the Wheel's rider, a3_ally_wheel) days
 *   a3_reading / a3_read_twelve / a3_read_all   true   the reading begun at eight (MOTHER's replies first; the keeper throws the switch:
 *                                            Thanh, Dario, Amos, or whoever carried the handle), the twelve (and the designate's line), everyone's
 *                                            through the night until five (the player's own line among them)
 *   a3_read                  true            the blank last sheet; the Ledger's one line: "Then everyone will have to plan."
 *   a3_read_up               true            up to the close at dawn (goto; the night's price met there)
 *   ep_sky                   held | hard | burning   the night's price as played (SKY_HELD / SKY_HARD / SKY_BURNING, M7's bands of
 *                                            a3_ready): held, a quiet close; hard, a man with a knife and his own line (a3_sky_walk  read |
 *                                            wardens | still); burning, a Crown house's three men at the plinth (npc_a3_g23..g25, placed while
 *                                            SKY_DAWN): fought (a3_sky_fight, their hostileIf; trigger a3_sky_after; a3_sky_beaten their
 *                                            `beaten`), held off by the wardens, or talked off (Speech 55). decision a3_sky
 *   (E) a3_register_up       true            Three's register carried up to the steps (until nine; goto md_spire steps)
 *   a3_amend_<clause>        true | false    one per CLAUSES id, written (true) and struck out (false) freely until the register is closed;
 *                                            only clauses whose need holds; at most three.  a3_amends  number  how many are written
 *   a3_amended               true            the register closed: "Agreed." (an empty page too, when no ruling held can carry a clause);
 *                                            read back by Nine (WITH_YOU) or Three; decision a3_amended
 *   knowledge: a3_child_told;  decisions: a3_first_paper, a3_down, a3_nine_core, a3_vault_out, a3_sash_left, a3_sold, a3_crates, a3_sky,
 *                            a3_amended
 *   triggers:                md_vault a3_vault_after; md_spire a3_crates_after, a3_sky_after (each reopens its end's tree)
 *   options:                 d_a3_ledger's vault.go.<act> and vault.after.<act> open END_TREE[act]
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
