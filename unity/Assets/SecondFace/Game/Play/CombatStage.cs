using System.Collections;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Combat;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// Playing the fight out (COMBAT.md A9, B7, B9): every step, the player's or the AI's, is played by the fighters' views
    /// (<see cref="IUnitView"/>), the camera following the one acting and framing each shot within the overhead pitch,
    /// numbers and words floating up from what it did (Core <see cref="Floats"/>: each round's hit as it lands, then the
    /// statuses, falls, breaking nerves and surrenders it left), at the settings' pace (Core <see cref="CombatPace"/>: the
    /// speed divides every beat; skip takes the other side's pauses and framing away; a walk of theirs nobody on the
    /// player's side sees at either end is made at once, beside the others', the body catching up out of sight).
    /// </summary>
    public sealed partial class Combat
    {
        private readonly HashSet<BattleUnit> _fallen = new();
        private readonly List<FloatEvent> _events = new();
        private bool _stepDone;

        /// <summary>The view of a fighter (made once: the animation package's, else the placeholder), at the fight's pace.</summary>
        private IUnitView ViewOf(BattleUnit u)
        {
            if (u == null) return null;
            if (!_views.TryGetValue(u, out var v))
            {
                var body = BodyOf(u);
                if (body == null) return null;
                v = MakeView != null ? MakeView(u, body, this, _fx) : null;
                v ??= new PlaceholderUnitView(u, body, this, _fx, u == _player ? Walkabout.Walker : null, _people.TryGetValue(u, out var p) ? p : null, !_controlled.Contains(u));
                _views[u] = v;
            }
            v.Pace = _pace;
            return v;
        }

        private bool Theirs(BattleUnit u) => !_controlled.Contains(u);

        /// <summary>Whether anyone of the player's side (still in the fight) would see someone standing at a point.</summary>
        private bool SeenByUs(double x, double z)
        {
            foreach (var o in _battle.Units)
                if (!o.Hostile && o.InFight && _battle.SeesPoint(o, x, z)) return true;
            return false;
        }

        /// <summary>Waits for a body still walking a walk begun without waiting (a few seconds at most).</summary>
        private IEnumerator Arrive(BattleUnit u)
        {
            var v = ViewOf(u);
            var t0 = Time.time;
            while (v != null && v.Moving && Time.time - t0 < 4f) yield return null;
        }

        private IEnumerator Beat(float seconds, bool theirs) => CombatFx.Wait(_pace.Seconds(seconds, theirs));

        // ---- floats ------------------------------------------------------------------------------------------------------

        private void FloatOver(BattleUnit u, string text, string kind)
        {
            var body = BodyOf(u);
            if (_hud == null || body == null || string.IsNullOrEmpty(text)) return;
            _hud.Float(Over(body), text, kind);
        }

        private void Floats_(IEnumerable<FloatEvent> events, Dictionary<BattleUnit, int> shown)
        {
            foreach (var e in events)
            {
                FloatOver(e.Unit, e.Text, e.Kind);
                if (shown != null && (e.Kind == "hit" || e.Kind == "crit" || e.Kind == "graze")) shown[e.Unit] = (shown.TryGetValue(e.Unit, out var s) ? s : 0) + e.Amount;
            }
        }

        /// <summary>What an action did beyond its hits' own numbers (statuses, falls, a breaking nerve, a surrender), floated
        /// up; the fallen go down, the yielded throw down their weapons.</summary>
        private void ShowChanges(FightPicture before, Dictionary<BattleUnit, int> shown)
        {
            if (_battle == null || before == null) return;
            _events.Clear();
            Floats.Changes(_battle, before, _events, Strings.Get, shown);
            foreach (var e in _events)
            {
                FloatOver(e.Unit, e.Text, e.Kind);
                if (e.Kind == "yield") ViewOf(e.Unit)?.OnYield();
            }
            foreach (var u in _battle.Units)
                if (!u.Alive && !_fallen.Contains(u)) { var b = BodyOf(u); Fell(u, b != null ? b.position - b.forward : Vector3.zero); }
            MarksDirty();
        }

        private void Fell(BattleUnit u, Vector3 from)
        {
            if (!_fallen.Add(u)) return;
            Say(Strings.Get("combat.down", u.C.Name));
            ViewOf(u)?.OnFall(from);
        }

        // ---- the others' turns (B9) ------------------------------------------------------------------------------------

        private IEnumerator AiTurn(BattleUnit u)
        {
            // (a sequence in flight that keeps Unity points across frames: the floating origin waits for it, §19.1)
            var hold = WorldOrigin.Hold("a fighter's turn", 60f);
            try { yield return AiTurnBody(u); }
            finally { WorldOrigin.Release(hold); }
        }

                private IEnumerator AiTurnBody(BattleUnit u)
        {
            var theirs = Theirs(u);
            var visible = !u.Hostile || SeenByUs(u.PX, u.PZ);
            _camera?.Follow(BodyOf(u), theirs, visible);
            Say(Strings.Get("combat.their_turn", u.C.Name));
            yield return Beat(0.35f, theirs && visible);
            for (var step = 0; step < 12 && _battle.Active && u.Alive && !u.Fled && u.C.Ap > 0; step++)
            {
                var ap = u.C.Ap; var minor = u.C.MinorUsed; var stance = u.C.Stance;
                var a = _battle.Choose(u);
                Debug.Log($"Combat AI: {u.C.Name} ({u.C.Ap} AP) {a} at {Time.realtimeSinceStartup:0.0}s ({_battle.LastDecisionMs:0.0} ms)");
                switch (a.Kind)
                {
                    case "wait": step = 99; break;
                    case "attack": case "burst": yield return AttackUnit(u, a.Target, a.Aimed, a.Kind == "burst"); break;
                    case "move": yield return MoveUnit(u, WorldOrigin.ToUnity(a.X, 0f, a.Z)); break;
                    case "surrender":
                    {
                        var pic = Floats.Picture(_battle);
                        _battle.Surrender(u);
                        Say(Strings.Get("combat.surrender", u.C.Name));
                        ShowChanges(pic, null);
                        step = 99;
                        break;
                    }
                    case "flee":
                    {
                        var pic = Floats.Picture(_battle);
                        _battle.Flee(u);
                        ShowChanges(pic, null);
                        yield return MoveUnit(u, WorldOrigin.ToUnity(a.X, 0f, a.Z));
                        // (no exits known to the field: out of the fight at the move, as before)
                        if (!u.Fled && !_battle.HasExits(u)) u.Fled = true;
                        if (u.Fled) { Say(Strings.Get("combat.fled", u.C.Name)); step = 99; }
                        break;
                    }
                    default:
                        yield return PlayStep(u, a);
                        if (!_stepDone) step = 99;
                        break;
                }
                if (u.C.Ap == ap && u.C.MinorUsed == minor && u.C.Stance == stance) break;
                Refresh();
            }
        }

        /// <summary>Carries out and plays an AI step that is not a walk or an attack (Core <see cref="Battle.Execute"/>):
        /// throws along their arc, held shots, suppression's rounds, stances, reloads, items, prisoners, a shout.</summary>
        private IEnumerator PlayStep(BattleUnit u, AiStep a)
        {
            var theirs = Theirs(u);
            var v = ViewOf(u);
            yield return Arrive(u);
            var pic = Floats.Picture(_battle);
            var shown = new Dictionary<BattleUnit, int>();
            var from = v?.Body != null ? v.Body.position : Vector3.zero;
            var r = _battle.Execute(u, a, (int)Walkabout.Game.Minutes);
            _stepDone = r.Done;
            if (r.Throw != null && v?.Body != null)
            {
                var land = WorldOrigin.ToUnity(r.Throw.X, from.y, r.Throw.Z);
                if (_overlay != null) land.y = _overlay.GroundY(land.x, land.z, from.y);
                PlaceholderUnitView.ArcPoints(from + Vector3.up * 1.5f, land, _arc);
                _camera?.Frame(from, land, theirs);
                yield return v.OnThrow(_arc, a.Item);
                _events.Clear(); Floats.FromThrow(r.Throw, _events, Strings.Get); Floats_(_events, shown);
                _camera?.Release();
            }
            foreach (var h in r.Hits)
            {
                var d = BodyOf(h.Defender);
                if (v?.Body == null || d == null) continue;
                _camera?.Frame(v.Body.position, d.position, theirs);
                yield return v.OnAim(d.position);
                var rounds = Mathf.Max(1, h.Result?.RoundsFired ?? 1);
                for (var i = 0; i < rounds; i++) yield return v.OnFire(d.position + Vector3.up * 1.1f + Random.insideUnitSphere * (h.Kind == "suppress" ? 1.2f : 0.2f), h.Kind != "suppress", i, rounds);
                _events.Clear(); Floats.FromHit(h, _events, Strings.Get); Floats_(_events, shown);
                _camera?.Release();
            }
            if (a.Kind == "overwatch" || a.Kind == "cover" || a.Kind == "suppress") v?.OnHold(a.Kind);
            if (a.Kind == "stance") v?.OnStance(u.C.Stance);
            if (a.Kind == "reload" && r.Done && v != null) yield return v.OnReload();
            ShowChanges(pic, shown);
            ShowWatches();
            yield return Beat(0.3f, theirs);
        }

        // ---- playing a step out ------------------------------------------------------------------------------------

        /// <summary>A walk: as far along the NavMesh path as the AP go (at the stance's pace); the body walks it (waited for,
        /// unless it is theirs and out of the player's sight at both ends); then the rules move the unit and fire the shots
        /// held for it, each played (a tracer, a flinch, the number); the walk of one under the player's hand may be undone if
        /// nobody saw it.</summary>
        private IEnumerator MoveUnit(BattleUnit u, Vector3 to)
        {
            var v = ViewOf(u);
            if (v?.Body == null) yield break;
            var body = v.Body;
            if (!NavMesh.SamplePosition(new Vector3(to.x, body.position.y, to.z), out var hit, 3f, NavMesh.AllAreas)) yield break;
            var path = new NavMeshPath();
            if (!NavMesh.CalculatePath(body.position, hit.position, NavMesh.AllAreas, path) || path.status == NavMeshPathStatus.PathInvalid) yield break;
            // as far along the path as the AP goes (at the stance's pace: a crouch or a crawl goes less far for the AP)
            var metres = Mathf.Min(PathLength(path), (float)_battle.Reach(u));
            var goal = PointAlong(path, metres);
            _corners.Clear();
            var left = metres;
            _corners.Add(body.position);
            for (var i = 1; i < path.corners.Length && left > 0f; i++)
            {
                var seg = Vector3.Distance(path.corners[i - 1], path.corners[i]);
                _corners.Add(seg <= left ? path.corners[i] : Vector3.Lerp(path.corners[i - 1], path.corners[i], left / Mathf.Max(1e-4f, seg)));
                left -= seg;
            }
            var theirs = Theirs(u);
            var record = theirs ? null : _battle.BeginMove(u);
            var startAt = body.position; var startFacing = body.rotation;
            double goalX = WorldOrigin.WorldX(goal.x), goalZ = WorldOrigin.WorldZ(goal.z);   // (the battle's own terms, kept across the walk's yields)
            var corePath = _battle.PathFor(u, goalX, goalZ);
            var seenStart = !theirs || SeenByUs(u.PX, u.PZ);
            var seenEnd = !theirs || SeenByUs(goalX, goalZ);
            var pic = Floats.Picture(_battle);
            MoveOutcome moved;
            if (_pace.WaitsForWalk(theirs, seenStart, seenEnd))
            {
                _camera?.Follow(body, theirs, seenStart || seenEnd);
                yield return v.OnMove(goal, _corners, true);
                var end = body.position;
                moved = _battle.Moved(u, WorldOrigin.WorldX(end.x), WorldOrigin.WorldZ(end.z), Mathf.Max(0.5f, metres));
            }
            else
            {
                // (out of the player's sight at both ends: made at once, the body catching up while the others act)
                yield return v.OnMove(goal, _corners, false);
                moved = _battle.Moved(u, goalX, goalZ, Mathf.Max(0.5f, metres));
                if (moved.Reactions.Count > 0) yield return Arrive(u);
            }
            // the shots held for the walk (overwatch, cover fire, a suppressor): a tracer each, a flinch, the number
            var shown = new Dictionary<BattleUnit, int>();
            foreach (var r in moved.Reactions)
            {
                var wv = ViewOf(r.Attacker);
                if (wv?.Body == null) continue;
                var struck = r.Result != null && r.Result.Hits.Any(h => h.Hit);
                yield return wv.OnAim(body.position);
                yield return wv.OnFire(body.position + Vector3.up * 1.1f + (struck ? Vector3.zero : Random.insideUnitSphere * 0.9f), struck, 0);
                if (struck) v.OnHit(wv.Body.position, r.Result.Hits.First(h => h.Hit).Part, "hit");
                _events.Clear(); Floats.FromHit(r, _events, Strings.Get); Floats_(_events, shown);
            }
            ShowChanges(pic, shown);
            if (!u.Alive && !_fallen.Contains(u)) Fell(u, body.position + body.forward);
            if (record != null)
            {
                _battle.EndMove(record, moved, corePath);
                _undo = record.Undoable ? new UndoState { Record = record, At = startAt, Facing = startFacing, View = v } : null;
                if (!record.Undoable && record.Blocked == "seen") Say(Strings.Get("combat.undo.seen"));
            }
        }

        /// <summary>An attack: the camera frames the two; the shooter aims; the rules resolve it; cover fire that answered it
        /// plays first; then each round (or the blow) with its hit reaction and number as it lands; a stray, a riposte, a
        /// follow-through; what it left (statuses, falls, a breaking nerve); the camera eases back.</summary>
        private IEnumerator AttackUnit(BattleUnit att, BattleUnit def, string aimed, bool burst)
        {
            var av = ViewOf(att); var dv = ViewOf(def);
            if (av?.Body == null || dv?.Body == null) yield break;
            var theirs = Theirs(att);
            yield return Arrive(att);
            var a = av.Body; var d = dv.Body;
            _camera?.Frame(a.position, d.position, theirs);
            yield return av.OnAim(d.position);
            var pic = Floats.Picture(_battle);
            var hit = _battle.Attack(att, def, aimed, burst);
            if (hit == null) { _camera?.Release(); yield break; }
            var shown = new Dictionary<BattleUnit, int>();
            // cover fire answered first
            foreach (var r in hit.Interrupts)
            {
                var cv = ViewOf(r.Attacker);
                if (cv?.Body == null) continue;
                var struck = r.Result != null && r.Result.Hits.Any(h => h.Hit);
                yield return cv.OnAim(a.position);
                yield return cv.OnFire(a.position + Vector3.up * 1.1f + (struck ? Vector3.zero : Random.insideUnitSphere * 0.9f), struck, 0);
                if (struck) av.OnHit(cv.Body.position, "torso", "hit");
                _events.Clear(); Floats.FromHit(r, _events, Strings.Get); Floats_(_events, shown);
            }
            var melee = CombatRules.IsMelee(hit.Weapon);
            if (hit.Kind == "throw")
            {
                var land = WorldOrigin.ToUnity(hit.BlastX, d.position.y, hit.BlastZ);
                PlaceholderUnitView.ArcPoints(a.position + Vector3.up * 1.5f, land, _arc);
                yield return av.OnThrow(_arc);
                _events.Clear(); Floats.FromHit(hit, _events, Strings.Get); Floats_(_events, shown);
            }
            else if (hit.Result != null && att.Alive)
            {
                var rounds = Mathf.Max(1, hit.Result.RoundsFired);
                for (var i = 0; i < rounds; i++)
                {
                    var h = i < hit.Result.Hits.Count ? hit.Result.Hits[i] : null;
                    var struck = h != null && h.Hit;
                    var at = d.position + Vector3.up * 1.1f + (struck ? Vector3.zero : Random.insideUnitSphere * 0.9f);
                    if (!melee) yield return av.OnFire(at, struck, i, rounds);
                    else yield return av.OnStrike(at, struck);
                    if (h == null) continue;
                    var kind = !h.Hit ? "miss" : h.Crit ? "crit" : h.Damage <= Floats.Graze ? "graze" : "hit";
                    if (h.Hit) dv.OnHit(a.position, h.Part, kind);
                    else dv.OnMiss(a.position, melee);
                    var text = kind == "miss" ? Strings.Get("combat.float.miss") : kind == "crit" ? Strings.Get("combat.float.crit", h.Damage) : kind == "graze" ? Strings.Get("combat.float.graze", h.Damage) : Strings.Get("combat.float.damage", h.Damage);
                    FloatOver(def, text, kind);
                    if (h.Hit) shown[def] = (shown.TryGetValue(def, out var s) ? s : 0) + h.Damage;
                    if (h.Crippled != null) FloatOver(def, Strings.Get(Floats.CrippleKey(h.Crippled)), "status");
                }
                foreach (var (u, dmg) in hit.Splash) { FloatOver(u, Strings.Get("combat.float.damage", dmg), "hit"); shown[u] = (shown.TryGetValue(u, out var s) ? s : 0) + dmg; }
            }
            if (hit.Stray != null) { _events.Clear(); Floats.FromHit(hit.Stray, _events, Strings.Get); Floats_(_events, shown); }
            foreach (var f in hit.Followups)
            {
                var fv = ViewOf(f.Attacker); var tv = ViewOf(f.Defender);
                if (fv?.Body != null && tv?.Body != null)
                {
                    yield return fv.OnAim(tv.Body.position);
                    yield return fv.OnStrike(tv.Body.position, f.Result != null && f.Result.Hits.Any(x => x.Hit));
                }
                _events.Clear(); Floats.FromHit(f, _events, Strings.Get); Floats_(_events, shown);
            }
            var any = hit.Result?.Hits.Where(h => h.Hit).ToList() ?? new List<HitResult>();
            if (any.Count == 0) Say(Strings.Get("combat.miss", att.C.Name, def.C.Name));
            else Say(Strings.Get(any.Any(h => h.Crit) ? "combat.crit" : "combat.hit", att.C.Name, def.C.Name, hit.Result.Damage));
            ShowChanges(pic, shown);
            yield return Beat(0.35f, theirs);
            _camera?.Release();
        }

        /// <summary>Suppression (the player's): the rounds poured at the target, the pin floated over them, the shot held.</summary>
        private IEnumerator SuppressUnit(BattleUnit att, BattleUnit def)
        {
            var av = ViewOf(att); var d = BodyOf(def);
            if (av?.Body == null || d == null) yield break;
            _camera?.Frame(av.Body.position, d.position, false);
            yield return av.OnAim(d.position);
            var pic = Floats.Picture(_battle);
            var h = _battle.Suppress(att, def);
            if (h != null)
            {
                var rounds = Mathf.Max(1, h.Result?.RoundsFired ?? 3);
                for (var i = 0; i < rounds; i++) yield return av.OnFire(d.position + Vector3.up * 1.0f + Random.insideUnitSphere * 1.2f, false, i, rounds);
                av.OnHold("suppress");
            }
            ShowChanges(pic, null);
            yield return Beat(0.3f, false);
            _camera?.Release();
        }

        /// <summary>A throw (the player's): the arc, the landing (scattered by the skill), each one caught and what it left.</summary>
        private IEnumerator ThrowUnit(BattleUnit u, string item, Vector3 at)
        {
            var v = ViewOf(u);
            if (v?.Body == null) yield break;
            var from = v.Body.position;
            _camera?.Frame(from, at, false);
            var pic = Floats.Picture(_battle);
            var t = _battle.Throw(u, item, WorldOrigin.WorldX(at.x), WorldOrigin.WorldZ(at.z));
            if (t == null) { _camera?.Release(); yield break; }
            var land = WorldOrigin.ToUnity(t.X, at.y, t.Z);
            if (_overlay != null) land.y = _overlay.GroundY(land.x, land.z, at.y);
            PlaceholderUnitView.ArcPoints(from + Vector3.up * 1.5f, land, _arc);
            yield return v.OnThrow(_arc, item);
            var shown = new Dictionary<BattleUnit, int>();
            _events.Clear(); Floats.FromThrow(t, _events, Strings.Get); Floats_(_events, shown);
            ShowChanges(pic, shown);
            yield return Beat(0.35f, false);
            _camera?.Release();
        }

        private IEnumerator ReloadUnit(BattleUnit u)
        {
            var v = ViewOf(u);
            if (!_battle.Reload(u)) { Say(Strings.Get("combat.why.no_ammo")); yield break; }
            if (v != null) yield return v.OnReload();
        }

        private IEnumerator StanceUnit(BattleUnit u, string stance)
        {
            var pic = Floats.Picture(_battle);
            if (_battle.SetStance(u, stance)) ViewOf(u)?.OnStance(stance);
            ShowChanges(pic, null);
            yield return Beat(0.15f, false);
        }

        /// <summary>A held shot (the player's): overwatch all round, or cover fire over one of ours (or anyone of the side);
        /// the turn's AP go to it.</summary>
        private IEnumerator Hold(BattleUnit u, string mode, BattleUnit covered)
        {
            var ok = mode == "cover" ? _battle.CoverFire(u, covered) : _battle.Overwatch(u);
            if (ok) ViewOf(u)?.OnHold(mode);
            ShowWatches();
            yield return Beat(0.2f, false);
        }

        /// <summary>A step with no motion of its own yet (a switch, a patch, a shout, a prisoner taken): done, and what it left
        /// floated up.</summary>
        private IEnumerator Simple(BattleUnit u, System.Func<bool> act)
        {
            var pic = Floats.Picture(_battle);
            act();
            ShowChanges(pic, null);
            yield return Beat(0.2f, false);
        }

        /// <summary>Every shot held now, on the ground (B5: cones and rings; hidden ambushes left out), and what lies on the
        /// ground (fire, oil, smoke, chem, water, current).</summary>
        private void ShowWatches()
        {
            if (_overlay == null || _battle == null) return;
            _overlay.ShowWatches(_battle.Watches(), u => BodyOf(u) is { } b && b != null ? b.position : (Vector3?)null);
            if (_battle.Surfaces.Count > 0 || _overlay.SurfacesShown) _overlay.ShowSurfaces(_battle.Surfaces, Walkabout != null && Walkabout.Walker != null ? Walkabout.Walker.transform.position.y : 0f);
        }
    }
}
