using System.Collections;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Combat;
using SecondFace.Core.Inventory;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// A turn under the player's hand (COMBAT.md B1–B5, B8, B10): the reachable bands drawn on the ground as soon as they
    /// are worked out (a few points a frame), the AI's intents worked out one enemy a frame (as the difficulty shows them),
    /// a tap on the ground previews the walk and a second tap on its end goes (a double tap goes at once), a tap on someone
    /// opens their radial (the shot card follows the verb pointed at), the cluster's actions, a throw aimed on the ground
    /// and thrown with a second tap, undo of a walk nobody saw, end turn asked again while AP are left; the pad and the
    /// keys do the same with a cursor on the ground.
    /// </summary>
    public sealed partial class Combat
    {
        /// <summary>The reachable grid's spacing (metres) and how long a frame may spend on it (milliseconds).</summary>
        public const float ReachStep = 1.0f, ReachBudgetMs = 4f, CommitWithin = 1.2f, EndArmSeconds = 4f, CursorSpeed = 7f;

        private sealed class WalkPreview
        {
            public double X, Z;
            public Vector3 End;
            public MovePlan Plan;
            public ThreatInfo Threats;
            public MoveCard Card;
        }

        private sealed class UndoState
        {
            public MoveUndo Record;
            public Vector3 At;
            public Quaternion Facing;
            public IUnitView View;
        }

        private WalkPreview _preview;
        private string _throwItem;
        private ThrowPlan _throwPlan;
        private Vector3? _throwAt;
        private int _spend;
        private bool _endArmed;
        private float _endArmedAt;
        private UndoState _undo;
        private readonly Dictionary<BattleUnit, BattleUnit> _intents = new();
        private readonly Queue<BattleUnit> _intentQueue = new();
        private ReachJob _reach;
        private bool _reachDrawn;
        private Vector3 _cursor;
        private bool _cursorOn;
        private int _cycle = -1;
        private readonly System.Diagnostics.Stopwatch _watch = new();
        private readonly List<Vector3> _corners = new(), _shots = new(), _arc = new();
        private readonly List<string> _cardLines = new();
        private readonly List<(Vector3 At, string Level)> _shieldPts = new();
        private bool _busy;

        // ---- what the tests and the HUD read --------------------------------------------------------------------------

        /// <summary>A turn under the player's hand (theirs or a companion's) is up and waiting for a choice.</summary>
        public bool PlayersTurn => Active && _acting != null && _battle.Current == _acting && !_busy && !_playerDone;
        /// <summary>The one under the player's hand whose turn it is (null on anyone else's).</summary>
        public BattleUnit Acting => _acting;
        /// <summary>A walk is previewed (its card).</summary>
        public MoveCard PreviewCard => _preview?.Card;
        /// <summary>A throw is being aimed (its item), and the plan at the aim.</summary>
        public string Throwing => _throwItem;
        public ThrowPlan ThrowPreview => _throwPlan;
        /// <summary>The last walk can be taken back.</summary>
        public bool UndoReady => _undo != null && _battle != null && _battle.CanUndo(_undo.Record);
        /// <summary>End turn has been pressed once with AP left (press again to end).</summary>
        public bool EndTurnArmed => _endArmed;
        /// <summary>The reachable area of the one acting is worked out and drawn.</summary>
        public bool ReachReady => _reach != null && _reach.Done && _reachDrawn;
        public ReachMap ReachMap => _reach?.Map;
        /// <summary>The intents shown now (an enemy and whom they mean to go for).</summary>
        public IReadOnlyDictionary<BattleUnit, BattleUnit> IntentsShown => _intents;
        /// <summary>The last radial a tap on someone opened (tests choose from it).</summary>
        public RadialMenu LastRadial { get; private set; }

        /// <summary>The companions fighting beside the player in the fight on now, by id (empty outside a fight).</summary>
        public List<string> CompanionsFighting => _battle == null ? new List<string>() : _companions.Select(u => u.C.Id).ToList();
        /// <summary>Everyone on the player's side in the fight on now, by id ("pc" for the player; empty outside a fight).</summary>
        public List<string> Allies => _battle == null ? new List<string>() : _battle.Units.Where(u => !u.Hostile).Select(u => u.C.Id).ToList();
        /// <summary>Everyone on the other side in the fight on now, by id (empty outside a fight).</summary>
        public List<string> Enemies => _battle == null ? new List<string>() : _battle.Units.Where(u => u.Hostile).Select(u => u.C.Id).ToList();

        /// <summary>The body of a fighter in the fight on now (null when it has none).</summary>
        public Transform BodyOf(BattleUnit u) => u != null && _bodies.TryGetValue(u, out var b) ? b : null;

        // ---- the turn ------------------------------------------------------------------------------------------------

        /// <summary>A turn under the player's hand: their own, or a companion's (DESIGN_UNITY §5, direct control).</summary>
        private IEnumerator PlayerTurn(BattleUnit u)
        {
            _acting = u;
            _playerDone = false;
            _endArmed = false;
            _undo = null;
            _cycle = -1;
            ClearPreview();
            ExitThrow();
            _cursorOn = false;
            _camera?.Follow(BodyOf(u), false);
            _hud?.Banner(u == _player ? Strings.Get("combat.your_turn", u.C.Ap) : Strings.Get("combat.their_turn", u.C.Name));
            Refresh();
            Say(u == _player ? Strings.Get("combat.your_turn", u.C.Ap) : $"{Strings.Get("combat.their_turn", u.C.Name)} {Strings.Get("combat.ap", u.C.Ap, CombatRules.MaxAp(u.C))}");
            ShowWatches();
            QueueIntents();
            while (!_playerDone && _battle.Active) yield return null;
            ClearPreview();
            ExitThrow();
            _overlay?.HideReach();
            _overlay?.HideCursor();
            _reach = null; _reachDrawn = false;
            _intents.Clear(); _intentQueue.Clear();
            _undo = null;
            _endArmed = false;
            _acting = null;
            MarksDirty();
        }

        /// <summary>Every frame of a fight: end turn's second press waits so long; on a turn under the player's hand the
        /// reachable area is worked out within the frame's budget and drawn when whole, and one enemy's intent is worked out.</summary>
        private void FightUpdate()
        {
            if (_endArmed && Time.unscaledTime - _endArmedAt > EndArmSeconds) { _endArmed = false; Refresh(); }
            if (!PlayersTurn) return;
            if (_throwItem == null)
            {
                if (_reach == null || _reach.StaleFor(_acting)) { _reach = _battle.BeginReach(_acting, ReachStep); _reachDrawn = false; }
                if (!_reach.Done)
                {
                    _watch.Restart();
                    while (!_battle.ContinueReach(_reach, 8) && _watch.Elapsed.TotalMilliseconds < ReachBudgetMs) { }
                }
                if (_reach.Done && !_reachDrawn && _overlay != null)
                {
                    _overlay.ShowReach(_reach.Map, BodyY(_acting));
                    _reachDrawn = true;
                }
            }
            if (_intentQueue.Count > 0)
            {
                var foe = _intentQueue.Dequeue();
                if (foe.InFight && !foe.Surrendered)
                {
                    var keep = foe.Intent;
                    var (target, _) = _battle.PredictIntent(foe);
                    foe.Intent = keep;
                    _intents[foe] = target;
                    MarksDirty();
                }
            }
        }

        /// <summary>The enemies whose coming target the difficulty shows (Core <see cref="Intents"/>), to work out one a frame.</summary>
        private void QueueIntents()
        {
            _intents.Clear(); _intentQueue.Clear();
            if (_battle == null || _acting == null) return;
            foreach (var foe in _battle.EnemiesOf(_acting))
            {
                if (foe.Surrendered) continue;
                var seen = _battle.EnemiesOf(foe).Any(p => _battle.Sees(p, foe));
                if (Intents.Shown(_battle.Difficulty, foe, seen)) _intentQueue.Enqueue(foe);
            }
        }

        private float BodyY(BattleUnit u) => BodyOf(u) is { } b && b != null ? b.position.y : Walkabout != null && Walkabout.Walker != null ? Walkabout.Walker.transform.position.y : 0f;

        private static float Flat(Vector3 a, Vector3 b) { a.y = 0f; b.y = 0f; return Vector3.Distance(a, b); }

        // ---- the ground: preview, then go (B2, B10) ------------------------------------------------------------------

        /// <summary>A tap on the ground in a fight, as a finger's (tests; the pad's act at its cursor goes the same way).</summary>
        public bool TapGround(Vector3 point) => OnGround(point);

        /// <summary>The held shots, the intents and the marks worked out afresh (after something changed the fight from
        /// outside a step: a test, a scripted event).</summary>
        public void Redraw()
        {
            if (!Active) return;
            ShowWatches();
            QueueIntents();
            MarksDirty();
            Refresh();
        }

        /// <summary>A tap on the ground in a fight (the touch controls' ground tap; the pad's act at its cursor).</summary>
        private bool OnGround(Vector3 point)
        {
            if (!Active || _acting == null || _battle.Current != _acting || _busy) return true;
            if (!NavMesh.SamplePosition(point, out var hit, 2f, NavMesh.AllAreas)) return true;
            var p = hit.position;
            if (_throwItem != null) { AimThrow(p); return true; }
            DisarmEnd();
            if (_preview != null && Flat(_preview.End, p) < CommitWithin)
            {
                if (!_preview.Plan.Ok) { Say(_preview.Card.Why ?? Strings.Get("combat.too_far")); return true; }
                var end = _preview.End;
                ClearPreview();
                StartCoroutine(Run(MoveUnit(_acting, end), true));
                return true;
            }
            PreviewWalk(p);
            return true;
        }

        /// <summary>Previews a walk to a point: the path by band, the shots it draws, its hazard; the card at its end (AP and
        /// band, the cover there against those who would see it, whom it flanks, the shots, who watches); shields where the
        /// cover stands; the AP it would spend lit; the marks over everyone as if the one acting stood there.</summary>
        public bool PreviewWalk(Vector3 p)
        {
            if (!PlayersTurn) return false;
            var plan = _battle.PlanMove(_acting, p.x, p.z);
            if (plan.Ap == int.MaxValue || plan.Path == null) { ClearPreview(); Say(Strings.Get("combat.why.no_way")); return false; }
            var threats = _battle.ThreatsAt(_acting, p.x, p.z);
            var card = MoveCard.From(plan, threats, Strings.Get);
            _preview = new WalkPreview { X = p.x, Z = p.z, End = p, Plan = plan, Threats = threats, Card = card };
            _corners.Clear();
            foreach (var (x, z) in plan.Path) _corners.Add(new Vector3((float)x, p.y, (float)z));
            _shots.Clear();
            foreach (var (_, x, z, _) in plan.Reactions) _shots.Add(new Vector3((float)x, p.y, (float)z));
            Vector3? hazard = null;
            if (plan.Hazard != null)
                foreach (var (cx, cz) in SurfaceGrid.Cells(plan.Path))
                    if (_battle.Surfaces.Peek(cx, cz) == plan.Hazard) { var (hx, hz) = SurfaceGrid.Centre(cx, cz); hazard = new Vector3((float)hx, p.y, (float)hz); break; }
            var mul = Stances.MoveMul(_acting.C.Stance);
            var act = System.Math.Max(0, _acting.C.Ap - CombatRules.AttackAp(_acting.C)) * Battle.MetresPerAp / mul;
            var dash = _acting.C.Ap * Battle.MetresPerAp / mul;
            _overlay?.ShowPath(_corners, act, dash, _shots, hazard, p.y);
            _cardLines.Clear();
            if (card.Ok) _cardLines.Add(card.CoverLine);
            _cardLines.AddRange(card.Lines);
            if (card.Ok) _cardLines.Add(Strings.Get("combat.move.tap_again"));
            _hud?.ShowPoint(p, card.Headline, _cardLines, card.Ok);
            _shieldPts.Clear();
            if (card.Ok && _battle.Geometry != null)
                foreach (var piece in _battle.Geometry.CoverAround(p.x, p.z))
                    _shieldPts.Add((p + new Vector3((float)piece.DX, 0f, (float)piece.DZ) * 0.6f + Vector3.up * (piece.Level == "full" ? 1.3f : 0.85f), piece.Level));
            _hud?.Shields(_shieldPts);
            _spend = plan.Ap;
            Refresh();
            return true;
        }

        /// <summary>Takes back what is previewed (a walk, a throw being aimed): the pad's east, a test.</summary>
        public void CancelPreview()
        {
            if (_throwItem != null) { ExitThrow(); Refresh(); return; }
            if (_preview != null) { ClearPreview(); Refresh(); }
        }

        private void ClearPreview()
        {
            _preview = null;
            _spend = 0;
            _overlay?.HidePath();
            _hud?.HidePoint();
            MarksDirty();
        }

        // ---- a throw: aim on the ground, throw with a second tap (B5) -----------------------------------------------

        private void EnterThrow(string item)
        {
            if (!PlayersTurn || item == null) return;
            ClearPreview();
            _throwItem = item;
            _throwPlan = null; _throwAt = null;
            _overlay?.HideReach(); _reachDrawn = false;
            Say(Strings.Get("combat.throw.aim"));
            Refresh();
        }

        private void ExitThrow()
        {
            if (_throwItem == null && _throwPlan == null) return;
            _throwItem = null; _throwPlan = null; _throwAt = null;
            _spend = 0;
            _overlay?.HideArea();
            _hud?.HidePoint();
            MarksDirty();
        }

        /// <summary>Aims the throw at a point: its footprint (by kind) and arc, its card (the cost, how many it catches, ours
        /// named, how far it may scatter), ours in it flagged over their heads; a second tap there throws.</summary>
        public bool AimThrow(Vector3 p)
        {
            if (!PlayersTurn || _throwItem == null) return false;
            var plan = _battle.PlanThrow(_acting, _throwItem, p.x, p.z);
            if (_throwAt != null && Flat(_throwAt.Value, p) < 1.0f && plan.Ok)
            {
                var item = _throwItem;
                ExitThrow();
                StartCoroutine(Run(ThrowUnit(_acting, item, p)));
                return true;
            }
            _throwAt = p; _throwPlan = plan;
            var body = BodyOf(_acting);
            PlaceholderUnitView.ArcPoints((body != null ? body.position : p) + Vector3.up * 1.5f, p + Vector3.up * 0.1f, _arc);
            _overlay?.ShowArea(p, (float)plan.Radius, (float)plan.Scatter, plan.Kind, _arc, plan.Ok, p.y);
            var card = ThrowCard.From(plan, ItemName(_throwItem), Strings.Get);
            _cardLines.Clear();
            _cardLines.AddRange(card.Lines);
            if (card.Why != null) _cardLines.Add(card.Why);
            else _cardLines.Add(Strings.Get("combat.move.tap_again"));
            _hud?.ShowPoint(p, card.Headline, _cardLines, card.Ok);
            _spend = plan.Ap;
            Refresh();
            return true;
        }

        private static string ItemName(string id) => id != null && Items.Has(id) ? Items.Def(id).Name ?? id : id;

        // ---- someone tapped: the radial with every verb and the card (B3, B10) -----------------------------------------

        /// <summary>A tap on someone in a fight: on an enemy the attacks with their odds, suppression and the demand to yield
        /// (the shot card beside, following the verb pointed at, the camera framing the two); on a yielded enemy taking them
        /// prisoner; on one of ours cover fire and patching up; while a throw is aimed, the throw at their feet.</summary>
        public bool Tapped(Interactable it, Vector2 screen)
        {
            if (!Active) return false;
            var me = _acting;
            if (me == null || _battle.Current != me || _busy) return true;
            var target = _bodies.FirstOrDefault(kv => kv.Value == it.transform || it.transform.IsChildOf(kv.Value)).Key;
            if (target == null) return true;
            return Target(target, screen);
        }

        /// <summary>The radial over a fighter (what a tap on them opens; the pad opens it at its cursor).</summary>
        public bool Target(BattleUnit target, Vector2 screen)
        {
            var me = _acting;
            if (!PlayersTurn || target == null) return true;
            if (_throwItem != null && BodyOf(target) is { } tb && tb != null) { AimThrow(tb.position); return true; }
            var verbs = CombatActions.OnTarget(_battle, me, target, Strings.Get);
            if (verbs.Count == 0) return true;
            ClearPreview();
            DisarmEnd();
            var snap = verbs[0].Shot;
            var ui = UIService.Instance;
            if (ui == null) { if (snap != null && snap.Ok) StartCoroutine(Run(AttackUnit(me, target, null, false))); return true; }
            var title = snap != null ? $"{target.C.Name} · {Strings.Get("combat.card.chance", snap.Chance)}" : target.C.Name;
            var radial = new RadialMenu(ui.ToPanel(screen), title, verbs.Select(v => new RadialVerb(v.Action.Id, v.Action.Open, v.Action.Note)).ToList(), id => Chosen(me, target, id));
            if (snap != null) _hud?.ShowCard(target.C.Name, ShotCard.From(snap, Strings.Get));
            _spend = verbs[0].Action.Ap;
            radial.Focused += id =>
            {
                var v = verbs.FirstOrDefault(x => x.Action.Id == id);
                if (v.Shot != null) _hud?.ShowCard(target.C.Name, ShotCard.From(v.Shot, Strings.Get));
                _spend = v.Action.Ap;
                Refresh();
            };
            radial.Gone += () =>
            {
                _hud?.HideCard();
                StartCoroutine(AfterRadial());
            };
            var a = BodyOf(me); var d = BodyOf(target);
            if (a != null && d != null) _camera?.Frame(a.position, d.position, false);
            LastRadial = radial;
            ui.Open(radial);
            Refresh();
            return true;
        }

        /// <summary>The radial closed: unless a verb's step began with it (the ring closes before it reports the choice), the
        /// camera eases back to the one acting.</summary>
        private IEnumerator AfterRadial()
        {
            yield return null;
            if (_busy || !Active) yield break;
            _spend = 0;
            _camera?.Release();
            Refresh();
        }

        private void Chosen(BattleUnit me, BattleUnit target, string id)
        {
            if (!Mine()) return;
            var minutes = (int)Walkabout.Game.Minutes;
            switch (id)
            {
                case "attack": case "aim_head": case "aim_legs": case "burst":
                    StartCoroutine(Run(AttackUnit(me, target, id == "aim_head" ? "head" : id == "aim_legs" ? "legL" : null, id == "burst")));
                    break;
                case "suppress": StartCoroutine(Run(SuppressUnit(me, target))); break;
                case "demand": StartCoroutine(Run(Simple(me, () => _battle.Shout(me)))); break;
                case "take_prisoner": StartCoroutine(Run(Simple(me, () => _battle.TakePrisoner(me, target)))); break;
                case "cover_fire": StartCoroutine(Run(Hold(me, "cover", target))); break;
                case "heal_ally": StartCoroutine(Run(Simple(me, () => _battle.UseItemOn(me, target, Battle.HealItems(me.C).FirstOrDefault(), minutes)))); break;
            }
        }

        // ---- the cluster (B8, B10) ----------------------------------------------------------------------------------

        /// <summary>A cluster button: a stance, a throw, a switch, patching up, undo, a reload, a held shot, end turn.</summary>
        public void OnAction(string id)
        {
            if (!Mine()) return;
            var me = _acting;
            var ui = UIService.Instance;
            var at = _hud?.ActionButton(id) is { } b ? b.worldBound.center : new Vector2(900f, 560f);
            if (id != "end_turn") DisarmEnd();
            switch (id)
            {
                case "end_turn":
                    if (me.C.Ap > 0 && !_endArmed)
                    {
                        _endArmed = true; _endArmedAt = Time.unscaledTime;
                        Say(Strings.Get("combat.end_turn.confirm", me.C.Ap));
                        Refresh();
                    }
                    else { _endArmed = false; _playerDone = true; }
                    break;
                case "undo": UndoWalk(); break;
                case "reload": StartCoroutine(Run(ReloadUnit(me))); break;
                case "swap": StartCoroutine(Run(Simple(me, () => _battle.Swap(me)))); break;
                case "heal":
                {
                    var item = Battle.HealItems(me.C).FirstOrDefault() ?? Battle.HealItem;
                    StartCoroutine(Run(Simple(me, () => _battle.UseItem(me, item, (int)Walkabout.Game.Minutes))));
                    break;
                }
                case "stance":
                    if (ui == null) break;
                    ui.Open(new RadialMenu(at, Strings.Get("combat.stance"), CombatActions.StanceChoices(_battle, me, Strings.Get).Select(a => new RadialVerb(a.Id, a.Open, a.Note)).ToList(),
                        v => { if (Mine()) StartCoroutine(Run(StanceUnit(me, v == "crouch" ? Stances.Crouch : v == "prone" ? Stances.Prone : Stances.Stand))); }));
                    break;
                case "throw":
                {
                    if (_throwItem != null) { ExitThrow(); Say(Strings.Get("combat.throw.cancel")); Refresh(); break; }
                    var items = Battle.Throwables(me.C);
                    if (items.Count == 0) break;
                    if (items.Count == 1 || ui == null) { EnterThrow(items[0]); break; }
                    ui.Open(new RadialMenu(at, Strings.Get("combat.throw"),
                        items.Select((item, i) => new RadialVerb("throw_" + i, me.C.Ap >= (Battle.Throwable(me.C, item)?.Ap ?? 99), Strings.Get("combat.card.ap", Battle.Throwable(me.C, item)?.Ap ?? 0), ItemName(item), "throw")).ToList(),
                        v => { if (Mine() && int.TryParse(v.Substring(6), out var k) && k < items.Count) EnterThrow(items[k]); }));
                    break;
                }
                case "overwatch":
                    if (ui == null) { StartCoroutine(Run(Hold(me, "overwatch", null))); break; }
                    ui.Open(new RadialMenu(at, Strings.Get("combat.overwatch"), CombatActions.Holds(_battle, me, Strings.Get).Select(a => new RadialVerb(a.Id, a.Open, a.Note)).ToList(),
                        v => { if (Mine()) StartCoroutine(Run(Hold(me, v == "cover_fire" ? "cover" : "overwatch", null))); }));
                    break;
            }
        }

        private void DisarmEnd()
        {
            if (!_endArmed) return;
            _endArmed = false;
            Refresh();
        }

        /// <summary>Takes back the last walk (B8): only one nobody of the other side saw, that drew no shot and rolled no dice,
        /// with nothing done since; the body is put back where it stood.</summary>
        public bool UndoWalk()
        {
            if (!Mine() || _undo == null || !_battle.CanUndo(_undo.Record)) return false;
            if (!_battle.Undo(_undo.Record)) return false;
            _undo.View?.Place(_undo.At, _undo.Facing);
            _undo = null;
            ClearPreview();
            Say(Strings.Get("combat.undo.done"));
            _camera?.Follow(BodyOf(_acting), false);
            QueueIntents();
            ShowWatches();
            Refresh();
            return true;
        }

        private void OnPortrait(int index)
        {
            if (_battle == null || index < 0 || index >= _fighterCount) return;
            var body = BodyOf(_slots[index].Unit);
            if (body != null) _camera?.Look(body);
        }

        /// <summary>Plays a step of the player's choosing out: what was shown of the preview goes; when it is done the turn's
        /// marks, held shots and intents are worked out afresh; the turn ends by itself when nothing is left to spend (unless
        /// the walk that spent it can still be taken back). <paramref name="keepUndo"/>: the step is a walk (it makes the undo).</summary>
        private IEnumerator Run(IEnumerator step, bool keepUndo = false)
        {
            _busy = true;
            ClearPreview();
            if (!keepUndo) _undo = null;
            _overlay?.HideReach(); _reachDrawn = false;
            _overlay?.HideCursor();
            Refresh();
            yield return step;
            _busy = false;
            ShowWatches();
            QueueIntents();
            Refresh();
            var undoable = _undo != null && _battle != null && _battle.CanUndo(_undo.Record);
            if (_acting == null || (_acting.C.Ap <= 0 && !undoable) || !_acting.Alive || !_battle.Active || _battle.CheckEnd()) _playerDone = true;
        }

        /// <summary>The turn under the player's hand played as the allies' AI would play it (the playthrough tests; later an
        /// auto-turn).</summary>
        public IEnumerator PlayerTurnByAi()
        {
            if (!PlayersTurn) yield break;
            _busy = true;
            ClearPreview();
            ExitThrow();
            yield return AiTurn(_acting);
            _busy = false;
            _playerDone = true;
        }

        // ---- the pad and the keys (B10) -----------------------------------------------------------------------------

        /// <summary>The pad in a fight: the left stick moves a cursor on the ground from the one acting (the camera's way up
        /// the screen), south acts at it (the radial over a fighter there, else the walk's preview, then the walk), the
        /// d-pad's left and right go from fighter to fighter, east takes a preview or a throw back, the d-pad up undoes,
        /// west ends the turn, north puts the pad on the cluster's buttons. The camera's own controls stay the camera's.</summary>
        private bool OnPad(PadFrame f, float dt)
        {
            if (!PlayersTurn) { _cursorOn = false; _overlay?.HideCursor(); return true; }
            var body = BodyOf(_acting);
            var cam = Walkabout != null && Walkabout.Stage != null ? Walkabout.Stage.Camera : null;
            if (!_cursorOn && body != null) { _cursor = body.position; }
            var amount = Mathf.Clamp01(f.Move.magnitude);
            if (amount > PadInput.Dead && cam != null)
            {
                var fwd = cam.transform.forward; fwd.y = 0f;
                var right = cam.transform.right; right.y = 0f;
                var dir = right.normalized * f.Move.x + fwd.normalized * f.Move.y;
                var next = _cursor + dir.normalized * (CursorSpeed * amount * dt);
                if (body != null) next = body.position + Vector3.ClampMagnitude(next - body.position, 30f);
                if (NavMesh.SamplePosition(next, out var hit, 2f, NavMesh.AllAreas)) next = hit.position;
                _cursor = next;
                _cursorOn = true;
            }
            if (f.Next || f.Prev)
            {
                var foes = _battle.Units.Where(u => u != _acting && (u.InFight || u.Surrendered) && !(u.Hidden && u.Hostile) && BodyOf(u) != null)
                    .OrderBy(u => u.Hostile ? 0 : 1).ThenBy(u => Battle.Distance(_acting, u)).ToList();
                if (foes.Count > 0)
                {
                    _cycle = (_cycle + (f.Next ? 1 : -1) + foes.Count) % foes.Count;
                    _cursor = BodyOf(foes[_cycle]).position;
                    _cursorOn = true;
                    _camera?.Look(BodyOf(foes[_cycle]));
                }
            }
            if (_cursorOn) _overlay?.ShowCursor(_cursor);
            if (f.Cancel)
            {
                if (_throwItem != null) { ExitThrow(); Say(Strings.Get("combat.throw.cancel")); Refresh(); }
                else if (_preview != null) { ClearPreview(); Say(Strings.Get("combat.move.cancelled")); Refresh(); }
            }
            if (f.Undo) UndoWalk();
            if (f.EndTurn) OnAction("end_turn");
            if (f.Pack) _hud?.ActionButton("end_turn")?.Focus();
            if (f.Act && _cursorOn)
            {
                var near = _battle.Units.Where(u => u != _acting && BodyOf(u) != null && Flat(BodyOf(u).position, _cursor) < 0.9f).OrderBy(u => Flat(BodyOf(u).position, _cursor)).FirstOrDefault();
                if (near != null && cam != null)
                {
                    var s = cam.WorldToScreenPoint(BodyOf(near).position + Vector3.up * 1.2f);
                    Target(near, new Vector2(s.x, s.y));
                }
                else OnGround(_cursor);
            }
            return true;
        }
    }
}
