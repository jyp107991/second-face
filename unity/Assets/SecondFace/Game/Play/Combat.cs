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
    /// stand where they are and take turns by initiative. On the player's turn a tap on the ground shows the walk and its
    /// AP (a second tap goes), a tap on an enemy opens the radial with the attacks and their odds; the bar holds the AP,
    /// end turn, reload and patch up. Others act by the battle's AI, step by step, each step played out (a walk, a shot
    /// with its tracer, a hit or a miss said, a fall into the ragdoll). The dead are written into the game (their
    /// placements no longer stand, the quests see them dead); the player's defeat ends the game back at the title.
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
        private bool _playerDone;
        private Vector3? _pendingMove;
        private LineRenderer _path, _tracer;
        private VisualElement _bar;
        private Label _apLabel, _logLabel;
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
                                                           && Logic.Test(p.Def.HostileIf, g) && !Dead(g, p)).ToList();
            if (hostile.Count == 0) return false;
            Starting?.Invoke();   // (saved first: a fight lost goes back to just before it)
            StartCoroutine(Fight(hostile, Time.unscaledTime - _talkAt < 5f));
            return true;
        }

        private static bool Dead(GameState g, Townsperson p) => p.Def != null && g.Npcs.TryGetValue(p.Def.Id, out var n) && n.Dead == true;

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
            _bodies.Clear(); _people.Clear();
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
            units.Add(_player);
            foreach (var h in hostiles) units.Add(UnitOf(h, true));
            // allies: anyone near whose ally condition holds
            foreach (var p in People.StandingPeople)
                if (p.Def?.Ally != null && !hostiles.Contains(p) && (wp - p.transform.position).sqrMagnitude < AllyReach * AllyReach && Logic.Test(p.Def.Ally, g) && !Dead(g, p))
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
                if (u == _player) yield return PlayerTurn();
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

        private IEnumerator PlayerTurn()
        {
            _playerDone = false;
            _pendingMove = null;
            Refresh();
            Say(Strings.Get("combat.your_turn", _player.C.Ap));
            while (!_playerDone && _battle.Active) yield return null;
            ClearPath();
        }

        private bool OnGround(Vector3 point)
        {
            if (!Active || _battle.Current != _player || _busy) return true;
            if (!NavMesh.SamplePosition(point, out var hit, 2f, NavMesh.AllAreas)) return true;
            var cost = _battle.MoveCost(_player, hit.position.x, hit.position.z);
            if (cost == int.MaxValue || cost > _player.C.Ap) { Say(Strings.Get("combat.too_far")); DrawPath(hit.position, false); _pendingMove = null; return true; }
            if (_pendingMove != null && (_pendingMove.Value - hit.position).sqrMagnitude < 1.2f)
            {
                _pendingMove = null;
                StartCoroutine(Run(MoveUnit(_player, hit.position)));
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
            if (_battle.Current != _player || _busy) return true;
            var target = _bodies.FirstOrDefault(kv => kv.Value == it.transform || it.transform.IsChildOf(kv.Value)).Key;
            if (target == null || !target.Hostile || !target.Alive) return true;
            var ui = UIService.Instance;
            var verbs = new List<RadialVerb>();
            var snap = _battle.Preview(_player, target);
            verbs.Add(new RadialVerb("attack", snap.Ok));
            var w = CombatRules.WeaponOf(_player.C).def;
            if (!CombatRules.IsMelee(w)) { verbs.Add(new RadialVerb("aim_head", _battle.Preview(_player, target, "head").Ok)); verbs.Add(new RadialVerb("aim_legs", _battle.Preview(_player, target, "legL").Ok)); }
            if (w.Burst != null) verbs.Add(new RadialVerb("burst", _battle.Preview(_player, target, null, true).Ok));
            var title = $"{target.C.Name} · {Strings.Get("combat.chance", Strings.Get("verb.attack"), snap.Chance)}";
            if (!snap.Ok && snap.Reason != null) title += $" · {snap.Reason}";
            if (ui == null) { StartCoroutine(Run(AttackUnit(_player, target, null, false))); return true; }
            ui.Open(new RadialMenu(ui.ToPanel(screen), title, verbs, v =>
            {
                var aimed = v == "aim_head" ? "head" : v == "aim_legs" ? "legL" : null;
                StartCoroutine(Run(AttackUnit(_player, target, aimed, v == "burst")));
            }));
            return true;
        }

        /// <summary>The player's turn is up and waiting for a choice.</summary>
        public bool PlayersTurn => Active && _battle.Current == _player && !_busy && !_playerDone;

        /// <summary>The player's turn played as the allies' AI would play it (the playthrough tests; later an auto-turn).</summary>
        public IEnumerator PlayerTurnByAi()
        {
            if (!PlayersTurn) yield break;
            _busy = true;
            yield return AiTurn(_player);
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
            if (_player.C.Ap <= 0 || !_battle.Active || _battle.CheckEnd()) _playerDone = true;
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
                if (u == _player) continue;
                if (!g.Npcs.TryGetValue(u.C.Id, out var save)) g.Npcs[u.C.Id] = save = new NpcSave();
                save.Hp = u.C.Sheet.Hp;
                if (!u.Alive) save.Dead = true;
            }
            foreach (var p in _people.Values) if (p != null) p.Held = false;
            var outcome = _battle.Outcome ?? "truce";
            Say(Strings.Get(outcome == "defeat" ? "combat.lost" : outcome == "truce" ? "combat.truce" : "combat.won"));
            yield return new WaitForSeconds(outcome == "defeat" ? 2.5f : 1f);
            ShowBar(false);
            _battle = null;
            Walkabout.Quests.Update();
            Ended?.Invoke(outcome);
        }

        // ---- the bar ---------------------------------------------------------------------------------------------------

        private void ShowBar(bool on)
        {
            var ui = UIService.Instance;
            if (ui == null) return;
            if (_bar == null)
            {
                _bar = new VisualElement { name = "combat-bar" };
                _bar.AddToClassList("sf-plate");
                _bar.style.position = Position.Absolute; _bar.style.bottom = 24; _bar.style.left = new Length(30, LengthUnit.Percent); _bar.style.right = new Length(30, LengthUnit.Percent);
                _bar.style.flexDirection = FlexDirection.Column; _bar.style.alignItems = Align.Center;
                _apLabel = new Label { name = "combat-ap" }; _apLabel.AddToClassList("sf-hud__quest");
                _logLabel = new Label { name = "combat-log" }; _logLabel.AddToClassList("sf-hud__line"); _logLabel.style.whiteSpace = WhiteSpace.Normal;
                var row = new VisualElement(); row.style.flexDirection = FlexDirection.Row;
                row.Add(Button(Strings.Get("combat.reload"), () => { if (Mine()) { _battle.Reload(_player); Refresh(); } }));
                row.Add(Button(Strings.Get("combat.heal"), () => { if (Mine() && _battle.UseItem(_player, Battle.HealItem, (int)Walkabout.Game.Minutes)) Refresh(); }));
                row.Add(Button(Strings.Get("combat.end_turn"), () => { if (Mine()) _playerDone = true; }));
                _bar.Add(_apLabel); _bar.Add(_logLabel); _bar.Add(row);
            }
            if (on) { if (_bar.parent == null) ui.Hud.Add(_bar); }
            else _bar.RemoveFromHierarchy();
        }

        private bool Mine() => Active && _battle.Current == _player && !_busy;

        private static Button Button(string text, System.Action click)
        {
            var b = new Button(click) { text = text };
            b.AddToClassList("sf-choice");
            b.style.minWidth = 140; b.style.minHeight = 56; b.style.marginLeft = 6; b.style.marginRight = 6;
            return b;
        }

        private void Refresh()
        {
            if (_apLabel == null || _battle == null) return;
            var cur = _battle.Current;
            _apLabel.text = cur == _player ? Strings.Get("combat.ap", _player.C.Ap, CombatRules.MaxAp(_player.C)) : Strings.Get("combat.their_turn", cur?.C.Name ?? "");
        }

        private readonly List<string> _lines = new();
        private void Say(string line)
        {
            _lines.Add(line);
            while (_lines.Count > 3) _lines.RemoveAt(0);
            if (_logLabel != null) _logLabel.text = string.Join("\n", _lines);
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
            if (Walkabout.Walker == null || !NavMesh.CalculatePath(Walkabout.Walker.transform.position, to, NavMesh.AllAreas, path)) { ClearPath(); return; }
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
