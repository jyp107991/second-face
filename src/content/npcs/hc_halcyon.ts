import type { NpcDef } from '../../engine/npc/defs';

/**
 * Halcyon (B4b): the arcology on the caldera's rim above the Skirts. The top station and the gate, the gardens under glass,
 * the citizens' terraces, floor nine of the Clinic floors, the Board's floor and its hall, the works under the gardens. The
 * Board and its citizens wear clean synthetics with lit seams (the megacity's rich: that is their costume, and their hair is
 * kept tidy because it is cut for them); the staff who came up from the Skirts wear the Concern's issue over what they own;
 * the gardeners are Skirts people in work clothes. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B4 (B4b).
 */
const HC = { team: 'neutral', settlement: 'halcyon' } as const;
const stand = (spot: string) => [{ from: 0, to: 24, spot, activity: 'idle' as const }];
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });
/** The Clean on the hill: they turn on whoever raises the alarm (a blown trunk, a ward emptied by force, a fight at the Board). */
const clean = { team: 'concern', settlement: 'halcyon', faction: 'concern', role: 'corp' as const, hostileIf: { flag: 'hc_alarm' }, courage: 70, minor: true };

export const HALCYON_NPCS: NpcDef[] = [
  {
    // the Chair of the Board: perfect manners, and under them very little left
    id: 'npc_hc_01', name: 'Adair Halverson', look: { seed: 4201, frame: 'broad', age: 58, ancestry: 'north_european', over: { hair: { style: 'cut_sidepart', color: 0xc8c4bc }, weathering: 0 } }, role: 'gilded',
    level: 8, ...HC, courage: 20, dialogue: 'd_hc_chair', faction: 'concern', attrs: { presence: 10, wits: 9, senses: 4 }, skills: { speech: 80, barter: 70, science: 60 }, tolls: 2000,
    schedule: stand('chair'),
    barks: ['How kind of you to come.', 'Nobody has to decide anything today.', 'We were here before, and we shall be here after. How kind of you to come.'],
  },
  {
    // Director of the Board: the younger faction; the Concern's human face
    id: 'npc_hc_02', name: 'Pilar Soto', look: { seed: 4202, frame: 'narrow', age: 40, ancestry: 'latin_american', over: { hair: { style: 'ponytail01', color: 0x1a1410 }, weathering: 0 } }, role: 'gilded',
    level: 6, ...HC, courage: 40, dialogue: 'd_hc_soto', faction: 'concern', attrs: { presence: 9, wits: 10 }, skills: { speech: 75, barter: 75 }, tolls: 1500,
    schedule: stand('soto'),
    barks: ['Purchase is kinder than war. Ask anyone who has seen one.', 'The Chair sends his regards. Sometimes he sends them twice.', 'Sit. I would rather talk to you than about you.'],
  },
  {
    // the Clinic floors' chief: the one person on the hill who is old and looks it, by choice
    id: 'npc_hc_05', name: 'Dr Noor Qadir', look: { seed: 4205, frame: 'narrow', age: 70, ancestry: 'mediterranean', over: { hair: { style: 'ponytail01', color: 0xb8b0a8 }, weathering: 0.25 } }, role: 'medic',
    level: 6, ...HC, courage: 45, dialogue: 'd_hc_qadir', faction: 'concern', attrs: { wits: 10, presence: 7, grit: 7 }, skills: { medicine: 90, science: 75, speech: 50 }, tolls: 400,
    surgeon: { stock: ['ch_neural_regent', 'ch_skin_weave', 'ch_legs_strider', 'ch_eye_concern'], fee: 40 },
    schedule: stand('qadir'),
    barks: ['Nobody on this floor is dying. Please lower your voice.', 'I have read every chart on nine. Have you read one?', 'They knew how the world worked before it ended. Somebody has to keep that.'],
  },
  {
    // the gardens' keeper: born on Nursery, thirty years under glass
    id: 'npc_hc_07', name: 'Yaw Boateng', look: { seed: 4207, frame: 'broad', age: 57, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x8a8680 }, facialHair: 'short_beard', weathering: 0.5 } }, role: 'labourer',
    level: 3, ...HC, courage: 50, dialogue: 'd_hc_yaw', attrs: { senses: 8, wits: 7, grit: 7 }, skills: { survival: 65, science: 40, speech: 35 }, tolls: 30,
    schedule: [{ from: 6, to: 20, spot: 'yaw', activity: 'work' }, sleep('yaw_lodge', 20, 6)],
    barks: ['Leaves come down before they\'re ready. I sweep them before they know.', 'Rain at ten and four. You can set a clock by it, and they do.', 'One tree. They watch it like it was a person.'],
  },
  {
    // reception at the arch: the Board's guest list, on the station side of the screen
    id: 'npc_hc_08', name: 'Mireille Aubert', look: { seed: 4208, frame: 'narrow', age: 35, ancestry: 'north_european', over: { hair: { style: 'ponytail01', color: 0x6a5440 }, weathering: 0 } }, role: 'corp',
    level: 3, ...HC, courage: 30, dialogue: 'd_hc_aubert', faction: 'concern', attrs: { presence: 8, wits: 8 }, skills: { speech: 55, barter: 45 }, tolls: 120,
    schedule: stand('aubert'),
    barks: ['Reception. Face to the lens, please.', 'The Board\'s guests are received. Everyone else is processed.', 'Welcome to Halcyon. Mind the step; it is the only one.'],
  },
  {
    // the gate's fitter: every contract citizen carries the Concern's work, and he fits it
    id: 'npc_hc_09', name: 'Dr Kenji Arata', look: { seed: 4209, frame: 'broad', age: 47, ancestry: 'east_asian', over: { hair: { style: 'short04', color: 0x141210 }, weathering: 0 } }, role: 'medic',
    level: 4, ...HC, courage: 35, dialogue: 'd_hc_arata', faction: 'concern', attrs: { wits: 9 }, skills: { medicine: 75, science: 60 }, tolls: 300,
    surgeon: { stock: ['ch_eye_concern', 'ch_skin_weave', 'ch_org_voice', 'ch_neural_lattice', 'ch_arm_contract'], fee: 30 },
    schedule: stand('arata'),
    barks: ['A contract is a promise. The implant is how we keep it.', 'Sit back. You will feel the Concern\'s work go in, and then you will not feel it at all.', 'Citizen grade. The best there is, and it reports.'],
  },
  {
    // captain of the Clean on the hill
    id: 'npc_hc_10', name: 'Ingrid Kask', look: { seed: 4210, frame: 'narrow', age: 44, ancestry: 'north_european', over: { hair: { style: 'paint_buzz', color: 0x7a6a58 }, weathering: 0.1, scars: ['brow_cut'] } }, role: 'corp',
    level: 8, team: 'concern', settlement: 'halcyon', faction: 'concern', hostileIf: { flag: 'hc_alarm' }, courage: 85, dialogue: 'd_hc_kask', attrs: { senses: 8, reflex: 8, grit: 8 }, skills: { firearms: 70, speech: 50, security: 50 }, tolls: 90,
    equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 20]],
    schedule: stand('kask'),
    barks: ['The lens decides. I only say it aloud.', 'Halcyon has not had a door forced in ninety years. Do not be the first.', 'Clean boots. Clean hands. It is the uniform.'],
  },
  {
    // the chip line's chief: ninety years of a line that still holds its tolerance
    id: 'npc_hc_11', name: 'Haruka Ono', look: { seed: 4211, frame: 'narrow', age: 52, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0x2a2420 }, weathering: 0.1 } }, role: 'tech',
    level: 4, ...HC, courage: 40, dialogue: 'd_hc_ono', faction: 'concern', attrs: { wits: 10, senses: 8 }, skills: { science: 70, mechanics: 65 }, tolls: 200,
    schedule: stand('ono'),
    barks: ['Line three is down a point. Line three is always down a point.', 'My mother ran the line. Her mother ran the line. The line ran us.', 'Nothing the Concern sells works without what we make down there.'],
  },
  {
    // the keeper of the channel: wired into the grid core since before the line's chief was born
    id: 'npc_hc_12', name: 'Femi Lawal', look: { seed: 4212, frame: 'broad', age: 61, ancestry: 'west_african', over: { hair: { style: 'none', color: 0x888480 }, facialHair: 'stubble', weathering: 0.3 } }, role: 'tech',
    level: 4, ...HC, courage: 30, dialogue: 'd_hc_lawal', faction: 'concern', attrs: { wits: 9, grit: 9 }, skills: { science: 85, security: 60 }, tolls: 0,
    schedule: stand('lawal'),
    barks: ['Forty-one years in this chair.', 'Every port on the slope is a voice in my head. I know Baek\'s arm by its hum.', 'Don\'t touch the cables. They\'re me.'],
  },
  {
    // the car's top brakeman: the Shift's man at the top of the hill
    id: 'npc_hc_13', name: 'Wojtek Mazur', look: { seed: 4213, frame: 'broad', age: 50, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x6a5a48 }, facialHair: 'stubble_heavy', weathering: 0.6 } }, role: 'labourer',
    level: 4, ...HC, courage: 60, dialogue: 'd_hc_mazur', faction: 'the_shift', attrs: { brawn: 8, grit: 8 }, skills: { mechanics: 60, melee: 40, survival: 35 }, tolls: 12,
    schedule: [{ from: 6, to: 22, spot: 'mazur', activity: 'work' }, sleep('mazur_cabin', 22, 6)],
    barks: ['Brake\'s mine. The car goes down when I say.', 'Thirty years at the top of the hill and they still search my lunch.', 'You don\'t ride without paper. That\'s not me. That\'s the paper.'],
  },
  {
    // a citizen-born girl who has never been down the hill
    id: 'npc_hc_14', name: 'Linh Tran', look: { seed: 4214, frame: 'narrow', age: 19, ancestry: 'southeast_asian', over: { hair: { style: 'ponytail01', color: 0x0e0c0a }, weathering: 0 } }, role: 'corp',
    level: 1, ...HC, courage: 40, dialogue: 'd_hc_linh', faction: 'concern', attrs: { wits: 8, reflex: 6 }, skills: { science: 30, speech: 30 }, tolls: 40,
    schedule: stand('linh'),
    barks: ['Is it true there are goats down there?', 'My mother was a gardener. From Nursery. That\'s a place.', 'The car comes up full and goes down empty. I count it.'],
  },
  {
    // the guild's factor on the hill: where the Concern's scrip is taken at par
    id: 'npc_hc_15', name: 'Factor Leander Voight', look: { seed: 4215, frame: 'broad', age: 56, ancestry: 'north_european', over: { hair: { style: 'cut_sidepart', color: 0x8a8070 }, facialHair: 'none', weathering: 0.05 } }, role: 'trader',
    level: 4, ...HC, courage: 35, dialogue: 'd_hc_voight', faction: 'tollmen', attrs: { wits: 9, presence: 7 }, skills: { barter: 75, speech: 55 }, tolls: 1200,
    schedule: stand('voight'),
    barks: ['Par, up here. Par is a word for people who own the slate.', 'The guild buys anything that grows. And anything that knows.', 'I keep the Concern\'s accounts in Tolls. Somebody has to.'],
  },
  {
    // an orderly on floor nine, born on the slope; she carries the holdfast now
    id: 'npc_hc_16', name: 'Abena Asiedu', look: { seed: 4216, frame: 'narrow', age: 33, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b }, weathering: 0.3 } }, role: 'medic',
    level: 2, ...HC, courage: 40, dialogue: 'd_hc_abena', attrs: { wits: 7, grit: 7 }, skills: { medicine: 50, stealth: 30 }, tolls: 15,
    schedule: stand('abena'),
    barks: ['Holdfast at six. I don\'t read the charts.', 'Lev had this job before me. He left. I haven\'t yet.', 'Two-Twelve. I was born at the bottom of the platform. You can smell it on me, they say.'],
  },
  {
    // the Board's old faction: she skied the runs before there was a Skirts
    id: 'npc_hc_17', name: 'Constance Wray', look: { seed: 4217, frame: 'narrow', age: 46, ancestry: 'north_european', over: { hair: { style: 'ponytail01', color: 0xd8c8a8 }, weathering: 0 } }, role: 'gilded',
    level: 4, ...HC, courage: 25, dialogue: 'd_hc_wray', faction: 'concern', attrs: { presence: 9, wits: 8 }, skills: { speech: 60, barter: 55 }, tolls: 900,
    schedule: stand('wray'),
    barks: ['The Chair is the Chair. There is nothing else to say about the Chair.', 'One renews or one is reviewed. I renew.', 'I knew this hill when it had snow on it.'],
  },
  {
    // the Board's younger faction: Soto's man in the hall
    id: 'npc_hc_18', name: 'Aurelio Benedetti', look: { seed: 4218, frame: 'broad', age: 44, ancestry: 'mediterranean', over: { hair: { style: 'cut_sidepart', color: 0x2a2018 }, facialHair: 'none', weathering: 0 } }, role: 'gilded',
    level: 4, ...HC, courage: 35, dialogue: 'd_hc_benedetti', faction: 'concern', attrs: { presence: 8, wits: 9 }, skills: { speech: 60, science: 50 }, tolls: 800,
    schedule: stand('benedetti'),
    barks: ['I was born up here. That makes me the Board\'s youngest, at sixty-one.', 'The Chair\'s courtesy is very old. So is the Chair.', 'Soto buys. The Chair waits. I would rather buy.'],
  },
  {
    // a contract citizen in the refectory who hears everything and repeats it
    id: 'npc_hc_19', name: 'Lorenzo Gallo', look: { seed: 4219, frame: 'broad', age: 38, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, facialHair: 'stubble_light', weathering: 0 } }, role: 'corp',
    level: 2, ...HC, courage: 25, dialogue: 'd_hc_gallo', faction: 'concern', attrs: { presence: 7, senses: 7 }, skills: { speech: 45, barter: 40 }, tolls: 150,
    schedule: stand('gallo'),
    barks: ['The orange is from the tree. The only tree. Have a slice; it is the season.', 'Tenure review in the spring. One renews or one is reviewed.', 'Did you see the designate? Of course you did. You are the designate.'],
  },
  {
    // 9-1182: Saba Mekonnen's husband, in service on floor nine
    id: 'npc_hc_20', name: 'Dawit Mekonnen', look: { seed: 4220, frame: 'broad', age: 39, ancestry: 'east_african', over: { hair: { style: 'paint_buzz', color: 0x100c0a }, facialHair: 'stubble', weathering: 0.5 } }, role: 'labourer',
    level: 2, team: 'neutral', settlement: 'skirts', courage: 30, dialogue: 'd_hc_dawit', attrs: { brawn: 7, grit: 7 }, skills: { survival: 30, mechanics: 35 }, tolls: 0,
    barks: ['(He hums, very low, the same four notes.)', 'Saba. Is Saba all right?', 'Where are my boots?'],
  },
  // the Clean on the hill, in grey that never sees the slope
  { id: 'npc_hc_g1', name: 'Guard', look: { seed: 4231, frame: 'broad', age: 31, ancestry: 'north_european', over: { hair: { style: 'paint_buzz', color: 0x3a3028 } } }, ...clean, level: 7, dialogue: 'd_hc_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: stand('gate_in_a'), barks: ['Face to the lens.', 'Inside the arch, please. Not on the line.'] },
  { id: 'npc_hc_g2', name: 'Guard', look: { seed: 4232, frame: 'narrow', age: 27, ancestry: 'east_african', over: { hair: { style: 'coily_twa', color: 0x0e0c0a } } }, ...clean, level: 7, dialogue: 'd_hc_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: stand('gate_in_b'), barks: ['The Board\'s guests to the left.', 'Contracts to the arch.'] },
  { id: 'npc_hc_g3', name: 'Guard', look: { seed: 4233, frame: 'broad', age: 38, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x1a1410 } } }, ...clean, level: 7, dialogue: 'd_hc_clean', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 20]], schedule: stand('roadpost_a'), barks: ['The road ends here. The yard is for the yard.', 'Gardeners at dawn. Freight at two. Nobody else.'] },
  { id: 'npc_hc_g4', name: 'Guard', look: { seed: 4234, frame: 'broad', age: 29, ancestry: 'south_asian', over: { hair: { style: 'paint_shaved', color: 0x16120e } } }, ...clean, level: 7, dialogue: 'd_hc_clean', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 20]], schedule: stand('roadpost_b'), barks: ['Since the cable house, we count every head.', 'Nobody from the slope comes up.'] },
  { id: 'npc_hc_g5', name: 'Guard', look: { seed: 4235, frame: 'narrow', age: 34, ancestry: 'east_asian', over: { hair: { style: 'ponytail01', color: 0x0e0c0a } } }, ...clean, level: 6, dialogue: 'd_hc_clean', equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('patrol_garden'), barks: ['Do not touch the tree.', 'Paths, please. The beds are the keeper\'s.'] },
  { id: 'npc_hc_g6', name: 'Guard', look: { seed: 4236, frame: 'broad', age: 40, ancestry: 'mediterranean', over: { hair: { style: 'short04', color: 0x2a2018 } } }, ...clean, level: 6, dialogue: 'd_hc_clean', equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('lift_guard'), barks: ['Nine is for staff.', 'The lift reads you. I only watch it.'] },
  { id: 'npc_hc_g7', name: 'Guard', look: { seed: 4237, frame: 'broad', age: 36, ancestry: 'west_african', over: { hair: { style: 'paint_fade', color: 0x0e0c0a } } }, ...clean, level: 7, dialogue: 'd_hc_clean', equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('hall_guard'), barks: ['The Board is at the ball.', 'Glasses, not hands.'] },
  { id: 'npc_hc_g8', name: 'Guard', look: { seed: 4238, frame: 'narrow', age: 30, ancestry: 'north_european', over: { hair: { style: 'paint_buzz', color: 0x8a7a68 } } }, ...clean, level: 7, dialogue: 'd_hc_clean', equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('lobby_guard'), barks: ['The designate. Go through.', 'The Board is pleased.'] },
  { id: 'npc_hc_g9', name: 'Guard', look: { seed: 4239, frame: 'broad', age: 45, ancestry: 'indigenous_american', over: { hair: { style: 'cut_crop', color: 0x2a2420 } } }, ...clean, level: 7, dialogue: 'd_hc_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: stand('core_door'), barks: ['Nobody goes near the core door.', 'The line is the line. The core is not your business.'] },
];
