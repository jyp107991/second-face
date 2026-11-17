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
    /// Turn-based fights in the open world (P6.4; DESIGN_UNITY §5.2; the rules are Core <see cref="Battle"/>). A fight
    /// starts when someone standing near the walker turns hostile (their definition's hostileIf comes true: a choice in a
    /// conversation): the walker, everyone hostile within <see cref="Reach"/> and everyone whose ally condition holds
    /// stand where they are and take turns by initiative. The companions following the player (<see cref="PartyFollowers"/>)
    /// fight on the player's side under the player's hand (DESIGN_UNITY §5: direct control): on the player's turn and on each
    /// companion's, a tap on the ground shows the walk and its AP (a second tap goes), a tap on an enemy opens the radial
    /// with the attacks and their odds; the bar holds the AP, end turn, reload and patch up. Others act by the battle's AI,
    /// step by step, each step played out (a walk, a shot with its tracer, a hit or a miss said, a fall into the ragdoll).
    /// The dead are written into the game (their placements no longer stand, the quests see them dead); companions go down
    /// instead, and get up wounded when it is over (Core <see cref="Party.AfterFight"/>); the player's defeat ends the
    /// game back at the title.
    /// </summary>
    public sealed class Combat : MonoBehaviour
    {
        public Walkabout Walkabout;
        public PeopleService People;
        public float Reach = 30f;
        /// <summary>How far an ally whose condition holds joins from (a rifle on the rise above the square).</summary>
        public float AllyReach = 80f;
        public bool Active => _battle != null && _battle.Active;
        /// <summary>The fight ended: victory, fled, defeat or truce.</summary>
        public event System.Action<string> Ended;
        /// <summary>A fight is about to start (the game saves).</summary>
        public event System.Action Starting;

        private Battle _battle;
        private readonly Dictionary<BattleUnit, Transform> _bodies = new();
        private readonly Dictionary<BattleUnit, Townsperson> _people = new();
        private BattleUnit _player;
        /// <summary>The units under the player's hand (the player and the companions fighting beside them), and the one whose
        /// turn it is now (null on anyone else's).</summary>
        private readonly HashSet<BattleUnit> _controlled = new();
        private readonly HashSet<BattleUnit> _companions = new();
        private BattleUnit _acting;
        private bool _playerDone;
        private Vector3? _pendingMove;
        private LineRenderer _path, _tracer;
        private SecondFace.Game.UI.CombatHud _hud;
        /// <summary>The fight's HUD is up (true) or down (false): the walkabout's own buttons and eye give way to it.</summary>
        public event System.Action<bool> Shown;
        private float _nextCheck;

        private void Update()
        {
            if (Active || Walkabout == null || Walkabout.Walker == null || People == null) return;
            if (Time.unscaledTime < _nextCheck) return;
            _nextCheck = Time.unscaledTime + 0.5f;
            if (!Walkabout.Busy) Check();
        }

        /// <summary>The game's difficulty (enemy aim and damage; the settings' choice), read as each fight starts.</summary>
        public static System.Func<(int HitMod, double DmgMul)> Difficulty;

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
            var g = Walkabout.Game;
            var at = Walkabout.Walker.transform.position;
            var hostile = People.StandingPeople.Where(p => p.Def?.HostileIf != null && (at - p.transform.position).sqrMagnitude < Reach * Reach
                                                           && Logic.Test(p.Def.HostileIf, g) && !Dead(g, p) && !WithPlayer(g, p)).ToList();
            if (hostile.Count == 0) return false;
            Starting?.Invoke();   // (saved first: a fight lost goes back to just before it)
            StartCoroutine(Fight(hostile, Time.unscaledTime - _talkAt < 5f));
            return true;
        }

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
            u.Place(body.transform.position.x, body.transform.position.z);
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
            u.Place(p.transform.position.x, p.transform.position.z);
            _bodies[u] = p.transform;
            _people[u] = p;
            p.Held = true;
            if (p.Agent != null && p.Agent.enabled && p.Agent.isOnNavMesh) p.Agent.ResetPath();
            return u;
        }

        private IEnumerator Fight(List<Townsperson> hostiles, bool ourMove = false)
        {
            var g = Walkabout.Game;
            _bodies.Clear(); _people.Clear(); _controlled.Clear(); _companions.Clear();
            _acting = null;
            var units = new List<BattleUnit>();
            var pc = new Combatant
            {
                Id = "pc", Name = string.IsNullOrEmpty(g.Pc.Sheet.Name) ? "You" : g.Pc.Sheet.Name, Team = "player", Sheet = g.Pc.Sheet,
                Inv = g.Pc.Inventory, Morale = 70, IsPlayer = true,
            };
            _player = new BattleUnit { C = pc };
            var wp = Walkabout.Walker.transform.position;
            _player.Place(wp.x, wp.z);
            _bodies[_player] = Walkabout.Walker.transform;
            _controlled.Add(_player);
            units.Add(_player);
            foreach (var h in hostiles) units.Add(UnitOf(h, true));
            // the party: every companion following the player, under the player's hand
            if (Walkabout.Party != null)
                foreach (var (id, body) in Walkabout.Party.Fighters()) units.Add(CompanionUnit(id, body));
            // allies: anyone near whose ally condition holds
            foreach (var p in People.StandingPeople)
                if (p.Def?.Ally != null && !hostiles.Contains(p) && (wp - p.transform.position).sqrMagnitude < AllyReach * AllyReach && Logic.Test(p.Def.Ally, g) && !Dead(g, p) && !WithPlayer(g, p))
                    units.Add(UnitOf(p, false));
            _battle = new Battle(new NavField(this), new Rng(g.RngState != 0 ? g.RngState : 7u));
            var (hitMod, dmgMul) = Difficulty != null ? Difficulty() : (0, 1.0);
            _battle.EnemyHitMod = hitMod; _battle.EnemyDmgMul = dmgMul;
            _battle.Start(units, false, ourMove);
            Debug.Log("Combat: " + string.Join(", ", units.Select(x => $"{x.C.Name} ({(x == _player ? "you" : x.Hostile ? "hostile" : "ally")}, hp {x.C.Sheet.Hp})")));
            Walkabout.Walker.GoTo(Walkabout.Walker.transform.position);
            ShowBar(true);
            Say(Strings.Get("combat.start"));
            if (Walkabout.Input != null) Walkabout.Input.GroundTap = OnGround;
            var shown = 0;
            var quiet = 0;   // turns in a row in which nobody spent anything
            while (_battle.Active)
            {
                var u = _battle.NextTurn();
                if (u == null) break;
                FlushLog(ref shown);
                var logged = _battle.Log.Count;
                if (_controlled.Contains(u)) yield return PlayerTurn(u);
                else yield return AiTurn(u);
                quiet = u.C.Ap >= CombatRules.MaxAp(u.C) && _battle.Log.Count == logged ? quiet + 1 : 0;
                if (quiet >= _battle.Order.Count * 3) { _battle.Standoff(); _quietUntil = Time.unscaledTime + 60f; }
                _battle.EndTurn();
                FlushLog(ref shown);
                yield return null;
            }
            FlushLog(ref shown);
            yield return Finish();
        }

        // ---- the player's turn -------------------------------------------------------------------------------------

        /// <summary>A turn under the player's hand: their own, or a companion's (DESIGN_UNITY §5, direct control).</summary>
        private IEnumerator PlayerTurn(BattleUnit u)
        {
            _acting = u;
            _playerDone = false;
            _pendingMove = null;
            Refresh();
            Say(u == _player ? Strings.Get("combat.your_turn", u.C.Ap) : $"{Strings.Get("combat.their_turn", u.C.Name)} {Strings.Get("combat.ap", u.C.Ap, CombatRules.MaxAp(u.C))}");
            while (!_playerDone && _battle.Active) yield return null;
            ClearPath();
            _acting = null;
        }

        private bool OnGround(Vector3 point)
        {
            if (!Active || _acting == null || _battle.Current != _acting || _busy) return true;
            if (!NavMesh.SamplePosition(point, out var hit, 2f, NavMesh.AllAreas)) return true;
            var cost = _battle.MoveCost(_acting, hit.position.x, hit.position.z);
            if (cost == int.MaxValue || cost > _acting.C.Ap) { Say(Strings.Get("combat.too_far")); DrawPath(hit.position, false); _pendingMove = null; return true; }
            if (_pendingMove != null && (_pendingMove.Value - hit.position).sqrMagnitude < 1.2f)
            {
                _pendingMove = null;
                StartCoroutine(Run(MoveUnit(_acting, hit.position)));
                return true;
            }
            _pendingMove = hit.position;
            DrawPath(hit.position, true);
            Say(Strings.Get("combat.move_cost", cost));
            return true;
        }

        /// <summary>A tap on someone in a fight: the attacks with their odds (or nothing, for a friend).</summary>
        public bool Tapped(Interactable it, Vector2 screen)
        {
            if (!Active) return false;
            var me = _acting;
            if (me == null || _battle.Current != me || _busy) return true;
            var target = _bodies.FirstOrDefault(kv => kv.Value == it.transform || it.transform.IsChildOf(kv.Value)).Key;
            if (target == null || !target.Hostile || !target.Alive) return true;
            var ui = UIService.Instance;
            var verbs = new List<RadialVerb>();
            var snap = _battle.Preview(me, target);
            RadialVerb Verb(string id, (bool Ok, string Reason, int Chance, int Ap) pv) =>
                new(id, pv.Ok, pv.Ok ? Strings.Get("combat.odds", pv.Chance, pv.Ap) : null);
            verbs.Add(Verb("attack", snap));
            var w = CombatRules.WeaponOf(me.C).def;
            if (!CombatRules.IsMelee(w)) { verbs.Add(Verb("aim_head", _battle.Preview(me, target, "head"))); verbs.Add(Verb("aim_legs", _battle.Preview(me, target, "legL"))); }
            if (w.Burst != null) verbs.Add(Verb("burst", _battle.Preview(me, target, null, true)));
            var title = $"{target.C.Name} · {Strings.Get("combat.chance", Strings.Get("verb.attack"), snap.Chance)}";
            if (!snap.Ok && snap.Reason != null) title += $" · {snap.Reason}";
            if (ui == null) { StartCoroutine(Run(AttackUnit(me, target, null, false))); return true; }
            ui.Open(new RadialMenu(ui.ToPanel(screen), title, verbs, v =>
            {
                var aimed = v == "aim_head" ? "head" : v == "aim_legs" ? "legL" : null;
                StartCoroutine(Run(AttackUnit(me, target, aimed, v == "burst")));
            }));
            return true;
        }

        /// <summary>A turn under the player's hand (theirs or a companion's) is up and waiting for a choice.</summary>
        public bool PlayersTurn => Active && _acting != null && _battle.Current == _acting && !_busy && !_playerDone;

        /// <summary>The companions fighting beside the player in the fight on now, by id (empty outside a fight).</summary>
        public List<string> CompanionsFighting => _battle == null ? new List<string>() : _companions.Select(u => u.C.Id).ToList();

        /// <summary>Everyone on the player's side in the fight on now, by id ("pc" for the player; empty outside a fight).</summary>
        public List<string> Allies => _battle == null ? new List<string>() : _battle.Units.Where(u => !u.Hostile).Select(u => u.C.Id).ToList();

        /// <summary>The turn under the player's hand played as the allies' AI would play it (the playthrough tests; later an
        /// auto-turn).</summary>
        public IEnumerator PlayerTurnByAi()
        {
            if (!PlayersTurn) yield break;
            _busy = true;
            yield return AiTurn(_acting);
            _busy = false;
            _playerDone = true;
        }

        private bool _busy;
        private IEnumerator Run(IEnumerator step)
        {
            _busy = true;
            ClearPath();
            yield return step;
            _busy = false;
            Refresh();
            if (_acting == null || _acting.C.Ap <= 0 || !_acting.Alive || !_battle.Active || _battle.CheckEnd()) _playerDone = true;
        }

        // ---- the others' turns -----------------------------------------------------------------------------------------

        private IEnumerator AiTurn(BattleUnit u)
        {
            Say(Strings.Get("combat.their_turn", u.C.Name));
            yield return new WaitForSeconds(0.35f);
            for (var step = 0; step < 10 && _battle.Active && u.Alive && !u.Fled && u.C.Ap > 0; step++)
            {
                var ap = u.C.Ap;
                var a = _battle.Choose(u);
                Debug.Log($"Combat AI: {u.C.Name} ({u.C.Ap} AP) {a.Kind}{(a.Target != null ? " " + a.Target.C.Name : "")} at {Time.realtimeSinceStartup:0.0}s");
                switch (a.Kind)
                {
                    case "wait": step = 99; break;
                    case "attack": case "burst": yield return AttackUnit(u, a.Target, null, a.Kind == "burst"); break;
                    case "move": yield return MoveUnit(u, new Vector3((float)a.X, 0f, (float)a.Z)); break;
                    case "reload": _battle.Reload(u); yield return new WaitForSeconds(0.3f); break;
                    case "heal": _battle.UseItem(u, Battle.HealItem, (int)Walkabout.Game.Minutes); yield return new WaitForSeconds(0.3f); break;
                    case "surrender":
                        u.Fled = true; u.Surrendered = true; Say(Strings.Get("combat.surrender", u.C.Name)); step = 99; break;
                    case "flee":
                        yield return MoveUnit(u, new Vector3((float)a.X, 0f, (float)a.Z));
                        u.Fled = true; Say(Strings.Get("combat.fled", u.C.Name)); step = 99; break;
                }
                if (u.C.Ap == ap) break;
                Refresh();
            }
        }

        // ---- playing a step out ------------------------------------------------------------------------------------

        private IEnumerator MoveUnit(BattleUnit u, Vector3 to)
        {
            if (!_bodies.TryGetValue(u, out var body) || body == null) yield break;
            if (!NavMesh.SamplePosition(new Vector3(to.x, body.position.y, to.z), out var hit, 3f, NavMesh.AllAreas)) yield break;
            var path = new NavMeshPath();
            if (!NavMesh.CalculatePath(body.position, hit.position, NavMesh.AllAreas, path) || path.status == NavMeshPathStatus.PathInvalid) yield break;
            // as far along the path as the AP goes
            var metres = Mathf.Min(PathLength(path), u.C.Ap * (float)Battle.MetresPerAp);
            var goal = PointAlong(path, metres);
            var t0 = Time.time;
            // a fight's moves are at a jog (a walk across a square under fire reads as a stroll, and drags the turn)
            if (u == _player)
            {
                Walkabout.Walker.GoTo(goal);
                Walkabout.Walker.Agent.speed = Mathf.Max(Walkabout.Walker.Agent.speed, Walker.JogSpeed);
                while (Walkabout.Walker != null && Walkabout.Walker.Goal != null && Time.time - t0 < 6f) yield return null;
            }
            else if (_people.TryGetValue(u, out var p) && p.Agent != null && p.Agent.enabled && p.Agent.isOnNavMesh)
            {
                var pace = p.Agent.speed;
                p.Agent.speed = Walker.JogSpeed;
                p.Agent.SetDestination(goal);
                yield return null;
                while (p != null && p.Agent.pathPending && Time.time - t0 < 2f) yield return null;
                // there when within the agent's own stopping distance (a townsperson stops 0.4 m short: the old 0.3 m test
                // never passed, and every move waited out its cap)
                while (p != null && p.Agent.isOnNavMesh && p.Agent.remainingDistance > p.Agent.stoppingDistance + 0.1f && Time.time - t0 < 6f) yield return null;
                if (p != null && p.Agent != null) p.Agent.speed = pace;
            }
            else { body.position = goal; yield return null; }
            var end = body.position;
            _battle.Moved(u, end.x, end.z, Mathf.Max(0.5f, metres));
        }

        private IEnumerator AttackUnit(BattleUnit att, BattleUnit def, string aimed, bool burst)
        {
            if (!_bodies.TryGetValue(att, out var a) || !_bodies.TryGetValue(def, out var d) || a == null || d == null) yield break;
            // turn to face
            var to = d.position - a.position; to.y = 0f;
            if (to.sqrMagnitude > 0.01f)
            {
                var from = a.rotation; var goal = Quaternion.LookRotation(to.normalized, Vector3.up);
                for (var t = 0f; t < 1f; t += Time.deltaTime / 0.25f) { if (a == null) yield break; a.rotation = Quaternion.Slerp(from, goal, t); yield return null; }
            }
            var hit = _battle.Attack(att, def, aimed, burst);
            if (hit == null) yield break;
            var melee = CombatRules.IsMelee(hit.Weapon);
            var shots = Mathf.Max(1, hit.Result.RoundsFired);
            for (var i = 0; i < shots; i++)
            {
                var h = i < hit.Result.Hits.Count ? hit.Result.Hits[i] : null;
                if (!melee) yield return Tracer(a.position + Vector3.up * 1.35f + a.forward * 0.4f, d.position + Vector3.up * 1.1f + (h != null && h.Hit ? Vector3.zero : Random.insideUnitSphere * 0.9f));
                else yield return new WaitForSeconds(0.2f);
                if (h != null && h.Hit) Flinch(def);
            }
            var any = hit.Result.Hits.Where(h => h.Hit).ToList();
            if (any.Count == 0) Say(Strings.Get("combat.miss", att.C.Name, def.C.Name));
            else Say(Strings.Get(any.Any(h => h.Crit) ? "combat.crit" : "combat.hit", att.C.Name, def.C.Name, hit.Result.Damage));
            foreach (var u in new[] { def }.Concat(hit.Splash.Select(s => s.Unit)))
                if (!u.Alive) Fell(u, a.position);
            yield return new WaitForSeconds(0.35f);
        }

        private void Flinch(BattleUnit u)
        {
            if (!_bodies.TryGetValue(u, out var body) || body == null) return;
            var amb = body.GetComponentInChildren<Ambient>();
            if (amb != null) amb.Gesture("wave");
        }

        private void Fell(BattleUnit u, Vector3 from)
        {
            Say(Strings.Get("combat.down", u.C.Name));
            if (!_bodies.TryGetValue(u, out var body) || body == null) return;
            var anim = body.GetComponentInChildren<Animator>();
            if (anim != null)
            {
                var rag = anim.GetComponent<Ragdoll>() ?? anim.gameObject.AddComponent<Ragdoll>();
                var push = (body.position - from); push.y = 0f;
                rag.Fall(push.normalized * 120f + Vector3.up * 20f, body.position + Vector3.up * 1.2f);
            }
            if (_people.TryGetValue(u, out var p) && p.Agent != null) p.Agent.enabled = false;
        }

        private IEnumerator Tracer(Vector3 from, Vector3 to)
        {
            if (_tracer == null) _tracer = Line("tracer", new Color(1f, 0.86f, 0.6f, 1f), 0.035f);
            _tracer.positionCount = 2;
            _tracer.SetPosition(0, from); _tracer.SetPosition(1, to);
            _tracer.enabled = true;
            var flash = new GameObject("muzzle").AddComponent<Light>();
            flash.type = LightType.Point; flash.range = 5f; flash.intensity = 3f; flash.color = new Color(1f, 0.8f, 0.5f);
            flash.transform.position = from;
            yield return new WaitForSeconds(0.07f);
            _tracer.enabled = false;
            Destroy(flash.gameObject);
            yield return new WaitForSeconds(0.12f);
        }

        // ---- the end -------------------------------------------------------------------------------------------------

        private IEnumerator Finish()
        {
            var g = Walkabout.Game;
            if (Walkabout.Input != null) Walkabout.Input.GroundTap = null;
            ClearPath();
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
            yield return new WaitForSeconds(outcome == "defeat" || outcome == "beaten" ? 2.5f : 1f);
            ShowBar(false);
            _battle = null;
            Walkabout.Quests.Update();
            Ended?.Invoke(outcome);
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
                _hud ??= new SecondFace.Game.UI.CombatHud(ui,
                    () => { if (Mine()) _playerDone = true; },
                    () => { if (Mine()) { _battle.Reload(_acting); Refresh(); } },
                    () => { if (Mine() && _battle.UseItem(_acting, Battle.HealItem, (int)Walkabout.Game.Minutes)) Refresh(); });
                if (_hud.Root.parent == null) ui.Hud.Add(_hud.Root);
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
        }

        private readonly List<SecondFace.Game.UI.CombatHud.Fighter> _fighters = new();

        /// <summary>The turn order and the bars over heads, every frame of a fight (people move; the camera turns).</summary>
        private void LateUpdate()
        {
            if (_hud == null || _battle == null || !_battle.Active || _hud.Root.parent == null) return;
            var cam = Walkabout != null && Walkabout.Stage != null ? Walkabout.Stage.Camera : Camera.main;
            var ui = UIService.Instance;
            if (cam == null || ui == null) return;
            // the order from the one acting on, as the rest of the round and the next will go
            var order = _battle.Order;
            var start = Mathf.Max(0, order.IndexOf(_battle.Current));
            for (var i = 0; i < order.Count; i++)
            {
                var u = order[(start + i) % order.Count];
                if (_fighters.Count <= i) _fighters.Add(new SecondFace.Game.UI.CombatHud.Fighter());
                var f = _fighters[i];
                f.Name = u.C.Name; f.Hostile = u.Hostile; f.Player = u == _player; f.Current = u == _battle.Current;
                f.Down = !u.Alive || u.Fled || u.Surrendered;
                f.Hp = u.C.Sheet.Hp; f.MaxHp = SecondFace.Core.Stats.Sheet.Derived(u.C.Sheet).MaxHp;
                f.Over = _bodies.TryGetValue(u, out var body) && body != null ? Over(body) : Vector3.zero;
            }
            if (_fighters.Count > order.Count) _fighters.RemoveRange(order.Count, _fighters.Count - order.Count);
            // (placed from the camera's own view, not the window's pixels: a camera drawing to another size, a capture,
            // put the bars in the top corner)
            var area = _hud.Area;
            _hud.Show(_fighters, w =>
            {
                if (w == Vector3.zero || area.x <= 0f) return null;
                var v = cam.WorldToViewportPoint(w);
                if (v.z <= 0f || v.x < 0f || v.y < 0f || v.x > 1f || v.y > 1f) return null;
                return new Vector2(v.x * area.x, (1f - v.y) * area.y);
            });
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

        // ---- the path preview --------------------------------------------------------------------------------------------

        private LineRenderer Line(string name, Color c, float width)
        {
            var lr = new GameObject(name).AddComponent<LineRenderer>();
            lr.transform.SetParent(transform, false);
            lr.material = new Material(Shader.Find("Sprites/Default"));
            lr.startColor = lr.endColor = c; lr.startWidth = lr.endWidth = width;
            lr.enabled = false;
            return lr;
        }

        private void DrawPath(Vector3 to, bool ok)
        {
            if (_path == null) _path = Line("combat-path", Color.white, 0.08f);
            var path = new NavMeshPath();
            // (from whoever is moving: the player, or the companion whose turn it is)
            var from = _acting != null && _bodies.TryGetValue(_acting, out var body) && body != null ? body : Walkabout.Walker != null ? Walkabout.Walker.transform : null;
            if (from == null || !NavMesh.CalculatePath(from.position, to, NavMesh.AllAreas, path)) { ClearPath(); return; }
            _path.startColor = _path.endColor = ok ? new Color(0.55f, 0.95f, 0.7f, 0.9f) : new Color(1f, 0.45f, 0.35f, 0.9f);
            _path.positionCount = path.corners.Length;
            for (var i = 0; i < path.corners.Length; i++) _path.SetPosition(i, path.corners[i] + Vector3.up * 0.08f);
            _path.enabled = true;
        }

        private void ClearPath() { if (_path != null) _path.enabled = false; }

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

        private sealed class NavField : IBattleField
        {
            private readonly Combat _c;
            public NavField(Combat c) { _c = c; }

            private Vector3 Ground(double x, double z, float y)
            {
                var p = new Vector3((float)x, y, (float)z);
                return NavMesh.SamplePosition(p, out var hit, 3f, NavMesh.AllAreas) ? hit.position : p;
            }

            private float YOf(BattleUnit u) => _c._bodies.TryGetValue(u, out var t) && t != null ? t.position.y : 0f;

            public double PathLength(BattleUnit u, double x, double z)
            {
                var from = Ground(u.PX, u.PZ, YOf(u)); var to = Ground(x, z, YOf(u));
                var path = new NavMeshPath();
                if (!NavMesh.CalculatePath(from, to, NavMesh.AllAreas, path) || path.status != NavMeshPathStatus.PathComplete) return double.PositiveInfinity;
                return Combat.PathLength(path);
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
                var eye = new Vector3((float)x, y + 1.5f, (float)z);
                var at = new Vector3((float)b.PX, YOf(b) + 1.1f, (float)b.PZ);
                return Clear(eye, at);
            }

            public string Cover(BattleUnit att, BattleUnit def)
            {
                var d = new Vector3((float)def.PX, YOf(def), (float)def.PZ);
                var a = new Vector3((float)att.PX, YOf(att), (float)att.PZ);
                var dir = a - d; dir.y = 0f;
                if (dir.magnitude < 2f) return "none";
                dir.Normalize();
                bool Blocked(float h) =>
                    Physics.Raycast(d + Vector3.up * h, dir, out var hit, 1.6f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore) && hit.collider.GetComponentInParent<Animator>() == null;
                if (Blocked(1.45f)) return "full";
                return Blocked(0.7f) ? "half" : "none";
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
                        var p = new Vector3((float)(u.PX + System.Math.Cos(ang) * r), y, (float)(u.PZ + System.Math.Sin(ang) * r));
                        if (NavMesh.SamplePosition(p, out var hit, 1f, NavMesh.AllAreas)) yield return (hit.position.x, hit.position.z);
                    }
            }
        }
    }
}
