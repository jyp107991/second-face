using System.Collections;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using SecondFace.Game.People;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.UIElements;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// Turn-based fights in the open world (P6.4; DESIGN_UNITY §5.2; COMBAT.md; the rules are Core <see cref="Battle"/>). A
    /// fight starts when someone standing near the walker turns hostile (their definition's hostileIf comes true: a choice
    /// in a conversation): the walker, everyone hostile within <see cref="Reach"/> and everyone whose ally condition holds
    /// stand where they are and take turns by initiative; come on unaware from a sneak, the hostiles lose their first turn
    /// (the surprise round). The companions following the player (<see cref="PartyFollowers"/>) fight on the player's side
    /// under the player's hand (DESIGN_UNITY §5: direct control). On a turn under the player's hand the reachable area is on
    /// the ground (the move-and-act band and the dash), a tap on the ground previews the walk (its path, AP, the cover at its
    /// end, the shots it draws, whom it flanks, who would see it) and a second tap goes; a tap on an enemy opens the radial
    /// with every attack and its odds, the target's card listing the reasons; the cluster holds a stance, a throw (aimed on
    /// the ground with its footprint and arc, thrown with a second tap), a switch of weapon, patching up, undo of a walk
    /// nobody saw, a reload, a held shot (overwatch, cover fire) and end turn (asked again while AP are left); the pad does
    /// the same with a cursor. Others act by the battle's AI, step by step, each step played out by the fighters' views
    /// (<see cref="IUnitView"/>: the animation package's hooks), at the settings' pace (skip cuts their show; their walks
    /// out of the player's sight are made at once, beside the others'), the camera easing to the one acting and framing
    /// each shot, never cutting. Numbers float up from every hit; the end says how it went. The dead are written into the
    /// game (their placements no longer stand, the quests see them dead); companions go down instead, and get up wounded
    /// when it is over (Core <see cref="Party.AfterFight"/>); the player's defeat ends the game back at the title.
    /// </summary>
    public sealed partial class Combat : MonoBehaviour
    {
        public Walkabout Walkabout;
        public PeopleService People;
        public float Reach = 30f;
        /// <summary>How far an ally whose condition holds joins from (a rifle on the rise above the square).</summary>
        public float AllyReach = 80f;
        /// <remarks>On until the fight is wholly over (its dead written, the beaten back up): the battle itself stops a frame
        /// before that, and a hostility check in that frame started a second fight with the dead still standing on paper
        /// (they came back at the health they had, and the old fight's end then cleared the new one, 2026-11-17).</remarks>
        public bool Active => _battle != null;
        /// <summary>The fight ended: victory, fled, defeat or truce.</summary>
        public event System.Action<string> Ended;
        /// <summary>A fight is about to start (the game saves).</summary>
        public event System.Action Starting;

        /// <summary>The fight's views of its fighters (the animation package sets this to its own; null: the placeholder,
        /// today's behaviour). Given the unit, its body, the fight and the shared effects.</summary>
        public static System.Func<BattleUnit, Transform, Combat, CombatFx, IUnitView> MakeView;
        /// <summary>The settings' pace (combat speed, skip), read as each turn begins (<see cref="Bootstrap"/> sets it).</summary>
        public static System.Func<CombatPace> Pace;

        private Battle _battle;
        private readonly Dictionary<BattleUnit, Transform> _bodies = new();
        private readonly Dictionary<BattleUnit, Townsperson> _people = new();
        private readonly Dictionary<BattleUnit, IUnitView> _views = new();
        private BattleUnit _player;
        /// <summary>The units under the player's hand (the player and the companions fighting beside them), and the one whose
        /// turn it is now (null on anyone else's).</summary>
        private readonly HashSet<BattleUnit> _controlled = new();
        private readonly HashSet<BattleUnit> _companions = new();
        private BattleUnit _acting;
        /// <summary>The terms of the pit bout on now (null in a real fight).</summary>
        private PitTerms _pit;
        private bool _playerDone;
        private SecondFace.Game.UI.CombatHud _hud;
        private CombatOverlay _overlay;
        private CombatCamera _camera;
        private CombatFx _fx;
        private CombatPace _pace = CombatPace.Normal;
        /// <summary>The fight's HUD is up (true) or down (false): the walkabout's own buttons and eye give way to it.</summary>
        public event System.Action<bool> Shown;
        private float _nextCheck;

        /// <summary>The battle on now (null outside a fight; tests and tools read it).</summary>
        public Battle Battle => _battle;
        /// <summary>The ground's marks (the reachable area, a preview, a throw, held shots).</summary>
        public CombatOverlay Overlay => _overlay;
        /// <summary>The fight's camera director.</summary>
        public CombatCamera CameraDirector => _camera;
        /// <summary>The pace the fight plays at now.</summary>
        public CombatPace CurrentPace => _pace;

        private void Update()
        {
            if (Active) { FightUpdate(); return; }
            if (Walkabout == null || Walkabout.Walker == null || People == null) return;
            if (Time.unscaledTime < _nextCheck) return;
            _nextCheck = Time.unscaledTime + 0.5f;
            if (!Walkabout.Busy) Check();
        }

        /// <summary>The game's difficulty (enemy aim and damage; the settings' choice), read as each fight starts.</summary>
        public static System.Func<(int HitMod, double DmgMul)> Difficulty;
        /// <summary>The settings' difficulty by id (story, normal, hard): how the hostile side's AI plays (Core
        /// <see cref="CombatDifficulty"/>), read as each fight starts.</summary>
        public static System.Func<string> DifficultyName;

        private float _talkAt = -100f;
        private float _quietUntil = -100f;   // (a fight that broke off: not taken up again at once)

        /// <summary>Starts a fight if anyone standing near has turned hostile. <paramref name="fromTalk"/>: the story just
        /// moved on in words (a conversation's choice): a fight that starts from it is the player's side's move first.</summary>
        public bool Check(bool fromTalk = false)
        {
            if (fromTalk) _talkAt = Time.unscaledTime;
            if (Active || Walkabout?.Walker == null || People == null) return false;
            if (People.Settling || Time.unscaledTime < _quietUntil) return false;
            if (Walkabout.Game?.Pc?.Sheet != null && Walkabout.Game.Pc.Sheet.Hp <= 0) return false;   // (down: the defeat is under way)   // (the people the story just moved are still being stood up: looked at again soon)
            var hostile = Turned();
            if (hostile.Count == 0) return false;
            Starting?.Invoke();   // (saved first: a fight lost goes back to just before it)
            StartCoroutine(Fight(hostile, Time.unscaledTime - _talkAt < 5f));
            return true;
        }

        /// <summary>Everyone standing near the walker who is hostile now (and alive, and not travelling with them).</summary>
        private List<Townsperson> Turned()
        {
            var g = Walkabout.Game;
            var at = Walkabout.Walker.transform.position;
            return People.StandingPeople.Where(p => p.Def != null && (at - p.transform.position).sqrMagnitude < Reach * Reach
                                                    && Hostile(g, p) && !Dead(g, p) && !WithPlayer(g, p)).ToList();
        }

        /// <summary>Hostile now: their content's condition holds (a camp that turns on the player once a flag is set), or a
        /// word came to blows (the content's <c>fight</c>: their save says so, as the web game kept it).</summary>
        public static bool Hostile(GameState g, Townsperson p) =>
            p.Def != null && ((p.Def.HostileIf != null && Logic.Test(p.Def.HostileIf, g)) || (g.Npcs.TryGetValue(p.Def.Id, out var s) && s.Hostile == true));

        /// <summary>A fight the story asks for (the content's <c>combat</c> and <c>fight</c> events, port of the web game's
        /// refreshHostility + startCombat): once the people the story just moved are standing (a few seconds at most), the
        /// hostility is tested again and the fight starts with whoever has turned, the player's side first. With a
        /// <paramref name="target"/> (the person being talked to) they turn hostile and are in it; with
        /// <paramref name="pit"/> it is a pit bout with them alone (<see cref="Pit"/>: fists and blades, nobody dies, the
        /// terms pay by the outcome). A truce that held after a lost fight does not stop it: the story asked.</summary>
        public IEnumerator Provoke(Townsperson target = null, PitTerms pit = null)
        {
            var t0 = Time.unscaledTime;
            while (People != null && People.Settling && Time.unscaledTime - t0 < 5f) yield return null;
            Begin(target, pit);
        }

        /// <summary>Starts the fight <see cref="Provoke"/> asks for at once: false when there is none to have (nobody has
        /// turned, the opponent is dead, a fight is on).</summary>
        public bool Begin(Townsperson target = null, PitTerms pit = null)
        {
            if (Active || Walkabout?.Walker == null || People == null) return false;
            var g = Walkabout.Game;
            if (g?.Pc?.Sheet == null || g.Pc.Sheet.Hp <= 0) return false;
            List<Townsperson> hostile;
            if (pit != null)
            {
                if (target == null || target.Def == null || Dead(g, target)) return false;
                hostile = new List<Townsperson> { target };
            }
            else
            {
                Turn(target);
                hostile = Turned();
                if (target != null && target.Def != null && !Dead(g, target) && !hostile.Contains(target)) hostile.Insert(0, target);
            }
            if (hostile.Count == 0) return false;
            _quietUntil = -100f;
            _talkAt = Time.unscaledTime;
            Starting?.Invoke();
            StartCoroutine(Fight(hostile, true, pit));
            return true;
        }

        /// <summary>Someone turns on the player (a word that came to blows): their save says hostile from now on, as the web
        /// game kept it, so a fight near them takes them in.</summary>
        public void Turn(Townsperson person)
        {
            var g = Walkabout != null ? Walkabout.Game : null;
            if (g == null || person == null || person.Def == null || Dead(g, person)) return;
            if (!g.Npcs.TryGetValue(person.Def.Id, out var save)) g.Npcs[person.Def.Id] = save = new NpcSave();
            save.Hostile = true;
        }

        /// <summary>The bout on now is a pit bout (null otherwise).</summary>
        public PitTerms Bout => Active ? _pit : null;
        /// <summary>How the last pit bout ended: "won", "lost" or "called" (null before any).</summary>
        public string LastBout { get; private set; }
        /// <summary>How the last fight ended, in words (B11; null before any).</summary>
        public FightSummary LastSummary { get; private set; }

        private static bool Dead(GameState g, Townsperson p) => p.Def != null && g.Npcs.TryGetValue(p.Def.Id, out var n) && n.Dead == true;

        /// <summary>A place's body of someone travelling with the player (kept out of sight there): never a side of its own.</summary>
        private static bool WithPlayer(GameState g, Townsperson p) => p.Def != null && g.World.Party.Contains(p.Def.Id);

        /// <summary>A companion following the player, as the battle's unit: their own sheet and pack (what the fight does to
        /// them stays with them), on the player's side, in the body that follows.</summary>
        private BattleUnit CompanionUnit(string id, Townsperson body)
        {
            var g = Walkabout.Game;
            var save = Party.Save(g, id);
            var def = body.Def;
            var c = new Combatant
            {
                Id = id, Name = string.IsNullOrEmpty(def?.Name) ? id : def.Name, Team = "player", Sheet = save.Sheet, Inv = save.Inv,
                Morale = CombatRules.InitialMorale(def?.Courage ?? 60), Courage = def?.Courage, Natural = def?.Natural,
            };
            var u = new BattleUnit { C = c, Hostile = false };
            u.Place(WorldOrigin.WorldX(body.transform.position.x), WorldOrigin.WorldZ(body.transform.position.z));   // (the battle keeps the world's own terms)
            _bodies[u] = body.transform;
            _people[u] = body;
            body.Held = true;
            if (body.Agent != null && body.Agent.enabled && body.Agent.isOnNavMesh) body.Agent.ResetPath();
            _controlled.Add(u);
            _companions.Add(u);
            return u;
        }

        private BattleUnit UnitOf(Townsperson p, bool hostile)
        {
            var (sheet, inv) = NpcStats.Build(p.Def);
            var g = Walkabout.Game;
            if (g.Npcs.TryGetValue(p.Def.Id, out var save) && save.Hp != null) sheet.Hp = save.Hp.Value;
            var c = new Combatant
            {
                Id = p.Def.Id, Name = string.IsNullOrEmpty(p.Def.Name) ? p.Id : p.Def.Name, Team = p.Def.Team, Sheet = sheet, Inv = inv,
                Morale = CombatRules.InitialMorale(p.Def.Courage ?? 50), Courage = p.Def.Courage, Natural = p.Def.Natural,
            };
            var u = new BattleUnit { C = c, Hostile = hostile, Leader = p.Def.Leader == true };
            u.Place(WorldOrigin.WorldX(p.transform.position.x), WorldOrigin.WorldZ(p.transform.position.z));
            _bodies[u] = p.transform;
            _people[u] = p;
            p.Held = true;
            if (p.Agent != null && p.Agent.enabled && p.Agent.isOnNavMesh) p.Agent.ResetPath();
            return u;
        }

        /// <summary>The last fight's fighters' extent (m, the larger of x and z) and the re-centring's shift (tests).</summary>
        public float LastSpan { get; private set; }
        public Vector3 LastRecentre { get; private set; }

        /// <summary>Re-centres the world on the fighters (their bodies' extent's middle): unless a sequence still holds it, a rebase in whole
        /// <see cref="WorldOrigin.FightStep"/>s; a fight wider than a step is said (its farthest fighters then stand that much off the origin).</summary>
        private void Recentre(List<BattleUnit> units)
        {
            LastRecentre = Vector3.zero;
            float x0 = float.MaxValue, x1 = float.MinValue, z0 = float.MaxValue, z1 = float.MinValue;
            foreach (var u in units)
                if (_bodies.TryGetValue(u, out var b) && b != null)
                {
                    var p = b.position;
                    x0 = Mathf.Min(x0, p.x); x1 = Mathf.Max(x1, p.x); z0 = Mathf.Min(z0, p.z); z1 = Mathf.Max(z1, p.z);
                }
            if (x0 > x1) return;
            LastSpan = Mathf.Max(x1 - x0, z1 - z0);
            if (LastSpan > WorldOrigin.FightStep) Debug.Log($"Combat: the fighters span {LastSpan:0} m, more than a re-centring step ({WorldOrigin.FightStep:0} m): the farthest stand about {LastSpan * 0.5f:0} m from the origin");
            if (!RecentringTemp) { Debug.Log("Combat: the fight not re-centred: TEMP switch"); return; }   // TEMP (relaunch 16)
            if (WorldOrigin.Held) { Debug.Log($"Combat: the fight not re-centred: the world held still by {WorldOrigin.Holding}"); return; }
            LastRecentre = WorldOrigin.Recentre(new Vector3((x0 + x1) * 0.5f, 0f, (z0 + z1) * 0.5f));
        }

        private IEnumerator Fight(List<Townsperson> hostiles, bool ourMove = false, PitTerms pit = null)
        {
            var g = Walkabout.Game;
            _bodies.Clear(); _people.Clear(); _controlled.Clear(); _companions.Clear(); _fallen.Clear(); _views.Clear(); _portraits.Clear(); _intents.Clear();
            _acting = null;
            _pit = pit;
            _undo = null;
            LastSummary = null;
            var units = new List<BattleUnit>();
            var pc = new Combatant
            {
                Id = "pc", Name = string.IsNullOrEmpty(g.Pc.Sheet.Name) ? "You" : g.Pc.Sheet.Name, Team = "player", Sheet = g.Pc.Sheet,
                Inv = g.Pc.Inventory, Morale = 70, IsPlayer = true,
            };
            _player = new BattleUnit { C = pc };
            var wp = Walkabout.Walker.transform.position;
            _player.Place(WorldOrigin.WorldX(wp.x), WorldOrigin.WorldZ(wp.z));
            _bodies[_player] = Walkabout.Walker.transform;
            _controlled.Add(_player);
            units.Add(_player);
            // (who has not seen the walker come on them from a sneak is caught unaware: B11's surprise round)
            var sneaking = Walkabout.Walker.Sneaking;
            var unaware = new List<BattleUnit>();
            foreach (var h in hostiles)
            {
                var hu = UnitOf(h, true);
                units.Add(hu);
                if (sneaking && pit == null && h.Awareness < Stealth.Noticed) unaware.Add(hu);
            }
            // (a pit bout is the two of them: no party, no allies)
            if (pit == null)
            {
                // the party: every companion following the player, under the player's hand
                if (Walkabout.Party != null)
                    foreach (var (id, body) in Walkabout.Party.Fighters()) units.Add(CompanionUnit(id, body));
                // allies: anyone near whose ally condition holds
                foreach (var p in People.StandingPeople)
                    if (p.Def?.Ally != null && !hostiles.Contains(p) && (wp - p.transform.position).sqrMagnitude < AllyReach * AllyReach && Logic.Test(p.Def.Ally, g) && !Dead(g, p) && !WithPlayer(g, p))
                        units.Add(UnitOf(p, false));
            }
            _battle = new Battle(new NavField(this), new Rng(g.RngState != 0 ? g.RngState : 7u));
            var (hitMod, dmgMul) = Difficulty != null ? Difficulty() : (0, 1.0);
            _battle.Difficulty = CombatDifficulty.For(DifficultyName != null ? DifficultyName() : "normal");
            _battle.EnemyHitMod = hitMod; _battle.EnemyDmgMul = dmgMul;
            _battle.Start(units, pit != null, ourMove || unaware.Count > 0);
            if (unaware.Count > 0) _battle.Surprise(unaware);
            Debug.Log("Combat: " + string.Join(", ", units.Select(x => $"{x.C.Name} ({(x == _player ? "you" : x.Hostile ? "hostile" : "ally")}, hp {x.C.Sheet.Hp})")) + (unaware.Count > 0 ? $"; {unaware.Count} caught unaware" : ""));
            Walkabout.Walker.GoTo(Walkabout.Walker.transform.position);
            // the fight re-centred before its views, its camera and its first turn (MRC §19.4): once no sequence in flight holds the world
            // still (a word or a use ending; at most 2 s), a rebase brings its centre within 32 m of Unity's origin, where the fight's own
            // systems keep the precision they have there
            var held0 = Time.unscaledTime;
            while (WorldOrigin.Held && Time.unscaledTime - held0 < 2f) yield return null;
            Recentre(units);
            // the views, the ground's marks, the camera
            _fx ??= new CombatFx(transform);
            foreach (var u in units) ViewOf(u);
            if (_overlay == null) { _overlay = new GameObject("combat overlay").AddComponent<CombatOverlay>(); _overlay.transform.SetParent(transform, false); }
            _overlay.Clear();
            _pace = Pace != null ? Pace() : CombatPace.Normal;
            _camera = new CombatCamera(Walkabout.Rig) { Pace = _pace };
            ShowBar(true);
            Say(Strings.Get("combat.start"));
            if (unaware.Count > 0)
            {
                _hud?.Banner(Strings.Get("combat.surprise"), 2.2f);
                foreach (var u in unaware) FloatOver(u, Strings.Get("combat.float.surprised"), "surprised");
            }
            if (Walkabout.Input != null) Walkabout.Input.GroundTap = OnGround;
            if (Walkabout.Pad != null) Walkabout.Pad.Fight = OnPad;
            var shown = 0;
            var quiet = 0;   // turns in a row in which nobody spent anything
            while (_battle.Active)
            {
                _pace = Pace != null ? Pace() : CombatPace.Normal;
                _camera.Pace = _pace;
                var before = Floats.Picture(_battle);
                var u = _battle.NextTurn();
                // (what the turn's start did: a bleed, a burn, the ground; someone caught off guard)
                ShowChanges(before, null);
                if (u == null) break;
                FlushLog(ref shown);
                var logged = _battle.Log.Count;
                MarksDirty();
                if (_controlled.Contains(u)) yield return PlayerTurn(u);
                else yield return AiTurn(u);
                quiet = u.C.Ap >= CombatRules.MaxAp(u.C) && _battle.Log.Count == logged ? quiet + 1 : 0;
                if (quiet >= _battle.Order.Count * 3 || _battle.Stalemate) { _battle.Standoff(); _quietUntil = Time.unscaledTime + 60f; }
                _battle.EndTurn();
                FlushLog(ref shown);
                yield return null;
            }
            FlushLog(ref shown);
            yield return Finish();
        }

        // ---- the end -------------------------------------------------------------------------------------------------

        private IEnumerator Finish()
        {
            var g = Walkabout.Game;
            if (Walkabout.Input != null) Walkabout.Input.GroundTap = null;
            if (Walkabout.Pad != null) Walkabout.Pad.Fight = null;
            ClearPreview();
            _overlay?.Clear();
            _camera?.End();
            if (_pit != null) { yield return FinishBout(g); yield break; }
            // what the fight did to the world: the dead stay dead, the living keep their wounds
            foreach (var u in _battle.Units)
            {
                if (u == _player || _companions.Contains(u)) continue;   // (a companion's wounds are on their own sheet)
                if (!g.Npcs.TryGetValue(u.C.Id, out var save)) g.Npcs[u.C.Id] = save = new NpcSave();
                save.Hp = u.C.Sheet.Hp;
                if (!u.Alive) save.Dead = true;
            }
            // companions who went down get up wounded, never dead
            if (Walkabout.Party != null) Walkabout.Party.AfterFight((int)g.Minutes);
            else Party.AfterFight(g, (int)g.Minutes);
            foreach (var p in _people.Values) if (p != null) p.Held = false;
            var outcome = _battle.Outcome ?? "truce";
            // losing forward: people whose content says what follows when they beat the player leave them on the ground, hurt,
            // and the story goes on (the opening's outriders: a lost fight sent the player back to the title, an hour of play
            // gone, 2026-11-16)
            if (outcome == "defeat")
            {
                var beaten = _battle.Units.Where(u => u != _player && u.Hostile)
                    .Select(u => Registry.Npcs.TryGetValue(u.C.Id, out var d) ? d : null).Where(d => d?.Beaten != null).Distinct().ToList();
                if (beaten.Count > 0)
                {
                    foreach (var d in beaten) Logic.Apply(d.Beaten, g);
                    var hp = System.Math.Max(1, Sheet.Derived(g.Pc.Sheet).MaxHp / 4);
                    g.Pc.Sheet.Hp = hp;
                    if (_player != null) _player.C.Sheet.Hp = hp;
                    outcome = "beaten";
                }
            }
            // (a fight that did not end in a win is not taken up again by itself at once: the beaten get up, a truce holds)
            if (outcome != "victory") _quietUntil = Mathf.Max(_quietUntil, Time.unscaledTime + 120f);
            Say(Strings.Get(outcome == "defeat" || outcome == "beaten" ? "combat.lost" : outcome == "truce" ? "combat.truce" : "combat.won"));
            // (B11: how it ended, in words: the dead, the prisoners, those who got away, the XP)
            LastSummary = FightSummary.Of(_battle, Strings.Get, outcome);
            _hud?.Summary(LastSummary.Title, LastSummary.Lines);
            yield return new WaitForSeconds(outcome == "defeat" || outcome == "beaten" ? 2.5f : 1.6f);
            // (beaten, the player gets up off the ground and the story goes on: left lying, the walker stayed a ragdoll)
            if (outcome == "beaten" && _player != null) ViewOf(_player)?.OnRise();
            // (A1: the weapons back in their holsters and slings, the living back to their own motion)
            foreach (var u in _battle.Units) if (_views.TryGetValue(u, out var ev)) ev.OnEnd();
            ShowBar(false);
            _battle = null;
            Walkabout.Quests.Update();
            Ended?.Invoke(outcome);
        }

        /// <summary>The end of a pit bout (port of the web game's): both fighters get back up off the floor, the loser hurt;
        /// the opponent goes back to what they were doing, nobody's enemy; the terms pay by the outcome (Core
        /// <see cref="Pit.Settle"/>); the game goes on whoever won.</summary>
        private IEnumerator FinishBout(GameState g)
        {
            var terms = _pit;
            var opponent = _battle.Units.FirstOrDefault(u => u != _player && u.Hostile);
            var result = Pit.Settle(g, opponent?.C.Sheet, opponent?.C.Id, _battle.Outcome ?? "truce", terms, Walkabout.Quests);
            LastBout = result;
            if (_player != null) _player.C.Sheet.Hp = g.Pc.Sheet.Hp;
            Say(Strings.Get(result == "won" ? "combat.pit_won" : result == "lost" ? "combat.pit_lost" : "combat.pit_called"));
            _hud?.Summary(Strings.Get(result == "won" ? "combat.pit_won" : result == "lost" ? "combat.pit_lost" : "combat.pit_called"), null);
            yield return new WaitForSeconds(result == "lost" ? 2f : 1f);
            foreach (var u in _battle.Units) ViewOf(u)?.OnRise();
            foreach (var u in _battle.Units) if (_views.TryGetValue(u, out var ev)) ev.OnEnd();
            foreach (var p in _people.Values) if (p != null) p.Held = false;
            ShowBar(false);
            _battle = null;
            _pit = null;
            Walkabout.Quests.Update();
            Ended?.Invoke("pit_" + result);
        }

        // ---- the bar ---------------------------------------------------------------------------------------------------

        // (play-ch1 T44: the turn order along the top, health over every head, the action points and the fight's last lines
        // beside the party, the turn's buttons in the action cluster's place; the HUD's own buttons give way meanwhile)
        private void ShowBar(bool on)
        {
            var ui = UIService.Instance;
            if (ui == null) return;
            if (on)
            {
                if (_hud == null)
                {
                    _hud = new SecondFace.Game.UI.CombatHud(ui);
                    _hud.Pressed += OnAction;
                    _hud.PortraitTapped += OnPortrait;
                }
                if (_hud.Root.parent == null) ui.Hud.Add(_hud.Root);
                _hud.HideSummary(); _hud.HideCard(); _hud.HidePoint();
                _lines.Clear();
                Refresh();
            }
            else _hud?.Close();
            Shown?.Invoke(on);
        }

        /// <summary>The fight's HUD (null outside a fight's first).</summary>
        public SecondFace.Game.UI.CombatHud Hud => _hud;
        /// <summary>The fight's HUD is up (through the fight and its last line, a moment after the battle itself ends).</summary>
        public bool HudUp => _hud != null && _hud.Root.parent != null;

        private bool Mine() => Active && _acting != null && _battle.Current == _acting && !_busy;

        private void Refresh()
        {
            if (_hud == null || _battle == null) return;
            var cur = _battle.Current;
            var mine = cur != null && cur == _acting;
            var status = !mine ? Strings.Get("combat.their_turn", cur?.C.Name ?? "")
                : cur == _player ? Strings.Get("combat.ap", cur.C.Ap, CombatRules.MaxAp(cur.C))
                : $"{cur.C.Name} · {Strings.Get("combat.ap", cur.C.Ap, CombatRules.MaxAp(cur.C))}";
            _hud.Status(status, string.Join("\n", _lines));
            _hud.Mine(mine && !_busy);
            if (cur != null) _hud.Pips(cur.C.Ap, CombatRules.MaxAp(cur.C), mine ? _spend : 0);
            if (mine) _hud.Actions(CombatActions.For(_battle, cur, _undo?.Record, Strings.Get));
            _hud.ArmEndTurn(mine && _endArmed);
            _hud.Lit("throw", mine && _throwItem != null);
            MarksDirty();
        }

        private readonly List<SecondFace.Game.UI.CombatHud.Fighter> _fighters = new();
        private readonly List<TurnSlot> _slots = new();
        private readonly Dictionary<BattleUnit, Texture> _portraits = new();
        private int _fighterCount;
        private bool _marksDirty = true;
        private System.Func<Vector3, Vector2?> _toPanel;
        private Camera _cam;
        private Vector2 _panelArea;

        private void MarksDirty() => _marksDirty = true;

        /// <summary>The turn order and the bars over heads, every frame of a fight (people move; the camera turns); their
        /// marks (cover, flank, sight of the preview, held shots, intents, a throw's catch) when anything has changed.</summary>
        private void LateUpdate()
        {
            if (_camera != null && Active) _camera.Tick();
            // (on through the fight's last seconds too: the last numbers rise, the end is read)
            if (_hud == null || _battle == null || _hud.Root.parent == null) return;
            _cam = Walkabout != null && Walkabout.Stage != null ? Walkabout.Stage.Camera : UnityEngine.Camera.main;
            if (_cam == null || UIService.Instance == null) return;
            if (_marksDirty) { _marksDirty = false; Marks(); }
            for (var i = 0; i < _fighterCount; i++)
            {
                var u = _slots[i].Unit;
                _fighters[i].Over = _bodies.TryGetValue(u, out var body) && body != null ? Over(body) : Vector3.zero;
            }
            // a portrait a frame, as they are drawn (no wait: initials until then)
            for (var i = 0; i < _fighterCount; i++)
            {
                var u = _slots[i].Unit;
                if (_portraits.ContainsKey(u)) continue;
                var body = _bodies.TryGetValue(u, out var b) ? b : null;
                _portraits[u] = body != null ? Portraits.Of(body.gameObject) : null;
                _fighters[i].Portrait = _portraits[u];
                break;
            }
            // (placed from the camera's own view, not the window's pixels: a camera drawing to another size, a capture,
            // put the bars in the top corner)
            _panelArea = _hud.Area;
            _toPanel ??= ToPanel;
            _hud.Frame(_fighters, _fighterCount, _toPanel);
        }

        private Vector2? ToPanel(Vector3 w)
        {
            if (w == Vector3.zero || _panelArea.x <= 0f || _cam == null) return null;
            var v = _cam.WorldToViewportPoint(w);
            if (v.z <= 0f || v.x < 0f || v.y < 0f || v.x > 1f || v.y > 1f) return null;
            return new Vector2(v.x * _panelArea.x, (1f - v.y) * _panelArea.y);
        }

        /// <summary>The fighters as the HUD shows them, and their marks: the order (Core <see cref="TurnOrder"/>), health and
        /// statuses; the cover each has against the one acting (from the previewed point when a walk is previewed), flanked;
        /// an eye on those who would see the previewed point; held shots; the intents the difficulty shows; ours caught in
        /// a throw's footprint.</summary>
        private void Marks()
        {
            _fighterCount = TurnOrder.Fill(_battle, _slots, u => _controlled.Contains(u));
            var acting = _battle.Current;
            var gun = acting != null && !CombatRules.IsMelee(CombatRules.WeaponOf(acting.C).def);
            double ax = acting?.PX ?? 0, az = acting?.PZ ?? 0;
            if (_preview != null && acting == _acting) { ax = _preview.X; az = _preview.Z; }
            for (var i = 0; i < _fighterCount; i++)
            {
                if (_fighters.Count <= i) _fighters.Add(new SecondFace.Game.UI.CombatHud.Fighter());
                var s = _slots[i]; var u = s.Unit; var f = _fighters[i];
                if (f.Name != u.C.Name) { f.Name = u.C.Name; f.Initials = SecondFace.Game.UI.CombatHud.InitialsOf(u.C.Name); }
                f.Hostile = s.Hostile; f.Player = s.Player; f.Controlled = s.Controlled; f.Current = s.Current; f.NextRound = s.NextRound;
                f.Down = !u.InFight; f.Hp = s.Hp; f.MaxHp = s.MaxHp;
                f.Portrait = _portraits.TryGetValue(u, out var tex) ? tex : null;
                f.Statuses.Clear(); f.Statuses.AddRange(s.Statuses);
                f.Cover = null; f.Flanked = false; f.Sees = false; f.Caught = false; f.Intent = null;
                f.Watching = u.Watch != null && !(u.Hidden && u.Hostile);
                if (acting != null && gun && u != acting && u.Hostile != acting.Hostile && !(u.Hidden && u.Hostile))
                {
                    var cs = _battle.CoverAt(acting, ax, az, u, u.PX, u.PZ);
                    var lvl = cs.Level == "half" && cs.HighGround ? "none" : cs.Level;
                    f.Cover = lvl; f.Flanked = cs.Flanked;
                }
                if (_preview?.Threats != null) foreach (var (foe, _) in _preview.Threats.Seen) if (foe == u) f.Sees = true;
                if (_throwPlan != null) foreach (var (cu, ally, _) in _throwPlan.Caught) if (cu == u && ally) f.Caught = true;
                if (_intents.TryGetValue(u, out var it) && it != null) f.Intent = it.C.Name;
            }
        }

        /// <summary>Just over a fighter's head (their head bone when they have one, else their height).</summary>
        private static Vector3 Over(Transform body)
        {
            var anim = body.GetComponentInChildren<Animator>();
            var head = anim != null && anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Head) : null;
            return head != null ? head.position + Vector3.up * 0.32f : body.position + Vector3.up * 2.05f;
        }

        private readonly List<string> _lines = new();
        private void Say(string line)
        {
            _lines.Add(line);
            while (_lines.Count > 2) _lines.RemoveAt(0);
            Refresh();
        }

        private void FlushLog(ref int shown)
        {
            for (; shown < _battle.Log.Count; shown++) { Say(_battle.Log[shown]); Debug.Log("Combat log: " + _battle.Log[shown]); }
        }

        // ---- the path ----------------------------------------------------------------------------------------------------

        private static float PathLength(NavMeshPath p)
        {
            var d = 0f;
            for (var i = 1; i < p.corners.Length; i++) d += Vector3.Distance(p.corners[i - 1], p.corners[i]);
            return d;
        }

        private static Vector3 PointAlong(NavMeshPath p, float metres)
        {
            if (p.corners.Length == 0) return Vector3.zero;
            var left = metres;
            for (var i = 1; i < p.corners.Length; i++)
            {
                var seg = Vector3.Distance(p.corners[i - 1], p.corners[i]);
                if (left <= seg) return Vector3.Lerp(p.corners[i - 1], p.corners[i], seg > 0 ? left / seg : 0f);
                left -= seg;
            }
            return p.corners[p.corners.Length - 1];
        }

        // ---- the world as the battle sees it -------------------------------------------------------------------------------

        /// <summary>TEMP (relaunch 16): the re-centring switched off for a probe; every geometry query traced.</summary>
        public static bool RecentringTemp = true;
        public static List<string> GeoTraceTemp;
        private static string R(double v) => v.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
        private static void T(string s) { GeoTraceTemp?.Add(s); }

        private sealed class NavField : IBattleField, IBattleGeometry
        {
            private readonly Combat _c;
            public NavField(Combat c) { _c = c; }

            // ---- the geometry (Core IBattleGeometry: heights and walks from the NavMesh, cover around a point by raycasts
            // at waist and head height in eight directions; no surfaces or exits from the world yet) ---------------------

            /// <summary>A height to look for the ground from: the walker's (a fight is local).</summary>
            private float HintY => _c.Walkabout != null && _c.Walkabout.Walker != null ? _c.Walkabout.Walker.transform.position.y : 0f;

            public double Height(double x, double z)
            {
                var p = WorldOrigin.ToUnity(x, HintY, z);
                var r = NavMesh.SamplePosition(p, out var hit, 6f, NavMesh.AllAreas) ? hit.position.y : HintY;
                T($"Height({R(x)},{R(z)}) y {R(HintY)} -> {R(r)}");
                return r;
            }

            private static readonly Vector3[] Dirs =
            {
                new(1, 0, 0), new(-1, 0, 0), new(0, 0, 1), new(0, 0, -1),
                new(0.7071f, 0, 0.7071f), new(0.7071f, 0, -0.7071f), new(-0.7071f, 0, 0.7071f), new(-0.7071f, 0, -0.7071f),
            };

            public IReadOnlyList<CoverPiece> CoverAround(double x, double z)
            {
                var g = Ground(x, z, HintY);
                var l = new List<CoverPiece>();
                bool Blocked(Vector3 dir, float h) =>
                    Physics.Raycast(g + Vector3.up * h, dir, out var hit, 1.2f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore) && hit.collider.GetComponentInParent<Animator>() == null;
                foreach (var d in Dirs)
                {
                    var lvl = Blocked(d, 1.45f) ? "full" : Blocked(d, 0.7f) ? "half" : null;
                    if (lvl != null) l.Add(new CoverPiece(d.x, d.z, lvl));
                }
                T($"CoverAround({R(x)},{R(z)}) ground {R(WorldOrigin.WorldX(g.x))},{R(g.y)},{R(WorldOrigin.WorldZ(g.z))} -> {string.Join(" ", l.Select(c => c.DX + "/" + c.DZ + ":" + c.Level))}");
                return l;
            }

            public IReadOnlyList<(double X, double Z)> Path(BattleUnit u, double x, double z)
            {
                var from = Ground(u.PX, u.PZ, YOf(u)); var to = Ground(x, z, YOf(u));
                var path = new NavMeshPath();
                if (!NavMesh.CalculatePath(from, to, NavMesh.AllAreas, path) || path.status != NavMeshPathStatus.PathComplete) return System.Array.Empty<(double, double)>();
                var l = new List<(double X, double Z)>(path.corners.Length + 1) { (u.PX, u.PZ) };
                for (var i = 1; i < path.corners.Length; i++) l.Add((WorldOrigin.WorldX(path.corners[i].x), WorldOrigin.WorldZ(path.corners[i].z)));
                T($"Path({u.C.Id} {R(u.PX)},{R(u.PZ)} -> {R(x)},{R(z)}) -> {string.Join(" ", l.Select(c => R(c.X) + "," + R(c.Z)))}");
                return l;
            }

            public bool SightBetween(double ax, double az, double bx, double bz)
            {
                var y = HintY;
                var r = Clear(Ground(ax, az, y) + Vector3.up * 1.5f, Ground(bx, bz, y) + Vector3.up * 1.1f);
                T($"Sight({R(ax)},{R(az)} -> {R(bx)},{R(bz)}) -> {r}");
                return r;
            }

            public string GroundAt(double x, double z) => null;

            public IReadOnlyList<(double X, double Z)> Exits(BattleUnit u) => System.Array.Empty<(double, double)>();

            private Vector3 Ground(double x, double z, float y)
            {
                var p = WorldOrigin.ToUnity(x, y, z);
                return NavMesh.SamplePosition(p, out var hit, 3f, NavMesh.AllAreas) ? hit.position : p;
            }

            private float YOf(BattleUnit u) => _c._bodies.TryGetValue(u, out var t) && t != null ? t.position.y : 0f;

            public double PathLength(BattleUnit u, double x, double z)
            {
                var from = Ground(u.PX, u.PZ, YOf(u)); var to = Ground(x, z, YOf(u));
                var path = new NavMeshPath();
                if (!NavMesh.CalculatePath(from, to, NavMesh.AllAreas, path) || path.status != NavMeshPathStatus.PathComplete) { T($"PathLength({u.C.Id} -> {R(x)},{R(z)}) -> inf"); return double.PositiveInfinity; }
                var len = Combat.PathLength(path);
                T($"PathLength({u.C.Id} {R(u.PX)},{R(u.PZ)} -> {R(x)},{R(z)}) -> {R(len)}");
                return len;
            }

            private static bool Clear(Vector3 eye, Vector3 at)
            {
                var dir = at - eye;
                var hits = Physics.RaycastAll(eye, dir.normalized, dir.magnitude - 0.4f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
                // people's own bodies (their ragdoll colliders, the walker's) do not block a line
                return hits.All(h => h.collider.GetComponentInParent<Animator>() != null);
            }

            public bool LineOfSight(BattleUnit a, BattleUnit b) => LineOfSightFrom(a.PX, a.PZ, b, YOf(a));
            public bool LineOfSightFrom(double x, double z, BattleUnit b) => LineOfSightFrom(x, z, b, YOf(b));
            private bool LineOfSightFrom(double x, double z, BattleUnit b, float y)
            {
                var eye = WorldOrigin.ToUnity(x, y + 1.5f, z);
                var at = WorldOrigin.ToUnity(b.PX, YOf(b) + 1.1f, b.PZ);
                var r = Clear(eye, at);
                T($"LineOfSight({R(x)},{R(z)} y {R(y)} -> {b.C.Id} {R(b.PX)},{R(b.PZ)} y {R(YOf(b))}) -> {r}");
                return r;
            }

            public string Cover(BattleUnit att, BattleUnit def)
            {
                var d = WorldOrigin.ToUnity(def.PX, YOf(def), def.PZ);
                var a = WorldOrigin.ToUnity(att.PX, YOf(att), att.PZ);
                var dir = a - d; dir.y = 0f;
                if (dir.magnitude < 2f) return "none";
                dir.Normalize();
                bool Blocked(float h) =>
                    Physics.Raycast(d + Vector3.up * h, dir, out var hit, 1.6f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore) && hit.collider.GetComponentInParent<Animator>() == null;
                var cv = Blocked(1.45f) ? "full" : Blocked(0.7f) ? "half" : "none";
                T($"Cover({att.C.Id} {R(att.PX)},{R(att.PZ)} -> {def.C.Id} {R(def.PX)},{R(def.PZ)}) -> {cv}");
                return cv;
            }

            public CombatContext Context(BattleUnit def)
            {
                var clock = _c.Walkabout.Stage != null ? _c.Walkabout.Stage.Clock : null;
                var hour = clock != null ? (clock.Minutes % 1440) / 60.0 : 12.0;
                var night = hour < 5.5 || hour >= 20.5;
                return new CombatContext { Night = night, Darkness = night ? 0.55 : 0, Indoor = false };
            }

            public IEnumerable<(double X, double Z)> Candidates(BattleUnit u, double reach)
            {
                var y = YOf(u);
                for (var r = 1.5; r <= reach + 0.01; r += 1.5)
                    for (var k = 0; k < 12; k++)
                    {
                        var ang = k * Mathf.PI / 6 + r * 0.37;
                        var p = WorldOrigin.ToUnity(u.PX + System.Math.Cos(ang) * r, y, u.PZ + System.Math.Sin(ang) * r);
                        if (NavMesh.SamplePosition(p, out var hit, 1f, NavMesh.AllAreas)) { T($"Candidate({u.C.Id} r {R(r)} k {k}) -> {R(WorldOrigin.WorldX(hit.position.x))},{R(WorldOrigin.WorldZ(hit.position.z))} (Unity {R(hit.position.x)},{R(hit.position.z)})"); yield return (WorldOrigin.WorldX(hit.position.x), WorldOrigin.WorldZ(hit.position.z)); }
                    }
            }
        }
    }
}
