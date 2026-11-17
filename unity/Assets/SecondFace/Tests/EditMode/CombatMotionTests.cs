using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;

namespace SecondFace.Tests
{
    /// <summary>
    /// The fight's motion table (COMBAT.md A1–A8; Core <see cref="CombatMotion"/>), checked against the combat set staged in
    /// the project (Assets/SecondFace/Combat/Motion: each clip's FBX and sidecar): every state plays a clip that is there, for
    /// both sexes; every one-shot goes somewhere when it ends (no state is left hanging); loops loop as their sidecars say;
    /// root motion agrees with each clip's travel (README v2 §2: a one-shot over 15 cm is applied or cut, never baked in
    /// place to slide back); women play women's or unlabelled takes, men men's or unlabelled; strikes and throws carry their
    /// impact and release frames, rifle shots their fire frames; every weapon of the content is held as a staged model.
    /// </summary>
    public class CombatMotionTests
    {
        private static string _dir;

        private static string Dir()
        {
            if (_dir != null) return _dir;
            foreach (var start in new[] { System.AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
                for (var d = new DirectoryInfo(start); d != null && _dir == null; d = d.Parent)
                    foreach (var rel in new[] { "unity/Assets/SecondFace/Combat/Motion", "Assets/SecondFace/Combat/Motion" })
                        if (Directory.Exists(Path.Combine(d.FullName, rel))) { _dir = Path.Combine(d.FullName, rel); break; }
            Assert.That(_dir, Is.Not.Null, "Assets/SecondFace/Combat/Motion");
            return _dir;
        }

        private static JObject Side(string clip) => JObject.Parse(File.ReadAllText(Path.Combine(Dir(), clip + ".json")));

        [Test]
        public void EveryStatePlaysAStagedClipForBothSexes()
        {
            var wrong = new List<string>();
            foreach (var s in CombatMotion.States)
                foreach (var female in new[] { false, true })
                {
                    var clip = s.ClipFor(female);
                    if (CombatMotion.Clip(clip) == null) wrong.Add($"{s.Name}: {clip} is not in the table's clips");
                    if (!File.Exists(Path.Combine(Dir(), clip + ".fbx"))) wrong.Add($"{s.Name}: {clip}.fbx not staged");
                    if (!File.Exists(Path.Combine(Dir(), clip + ".json"))) wrong.Add($"{s.Name}: {clip}.json not staged");
                }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
            // one Animator state per clip: the names, and the women's takes' "_f" names, are unique
            var anim = CombatMotion.States.SelectMany(s => new[] { s.AnimName(false), s.AnimName(true) }).Distinct().ToList();
            Assert.That(anim.Count, Is.EqualTo(CombatMotion.States.Length + CombatMotion.States.Count(s => s.ClipF != null && s.ClipF != s.Clip)), "Animator state names are unique");
            Assert.That(CombatMotion.States.Select(s => s.Name).Distinct().Count(), Is.EqualTo(CombatMotion.States.Length), "state names are unique");
            Assert.That(CombatMotion.States.All(s => !s.Name.Contains(".")), Is.True, "no dots in state names (an Animator's paths use them)");
        }

        [Test]
        public void EveryClipOfTheTableIsStagedWithItsSidecar()
        {
            foreach (var c in CombatMotion.Clips.Concat(CombatMotion.Spare))
            {
                Assert.That(File.Exists(Path.Combine(Dir(), c.Name + ".fbx")), Is.True, c.Name + ".fbx");
                var side = Side(c.Name);
                Assert.That(side.Value<int?>("frames"), Is.GreaterThan(1), c.Name + ": frames");
                Assert.That(side.Value<int?>("fps") ?? 30, Is.EqualTo(30), c.Name + ": the set is at 30 fps");
            }
            // (and nothing the manifest keeps out: the four do_not_use clips have captured alternatives)
            foreach (var no in new[] { "fist_cross_ual", "fist_hook_ual", "fist_jab_ual", "getup_back_ual" })
                Assert.That(CombatMotion.Clip(no), Is.Null, no + " is do_not_use");
        }

        [Test]
        public void NoStateIsLeftHanging()
        {
            var names = new HashSet<string>(CombatMotion.States.Select(s => s.Name));
            foreach (var s in CombatMotion.States)
            {
                if (s.Loop) { Assert.That(s.Then, Is.Null, s.Name + ": a loop holds"); continue; }
                if (s.Speed == 0f) { Assert.That(s.Then, Is.Null, s.Name + ": a held frame holds"); continue; }
                Assert.That(s.Then, Is.Not.Null, s.Name + ": a one-shot goes somewhere");
                foreach (Arms a in System.Enum.GetValues(typeof(Arms)))
                    foreach (var crouched in new[] { false, true })
                    {
                        var next = CombatMotion.Next(s, a, crouched);
                        Assert.That(next == CombatMotion.None || names.Contains(next), Is.True, $"{s.Name} → {next} ({a}, crouched {crouched})");
                    }
                Assert.That(s.Cut, Is.InRange(0.05f, 1f), s.Name + ": its cut");
                Assert.That(s.From, Is.LessThan(s.Cut), s.Name + ": entered before it is cut");
            }
            // every beat's state exists for every weapon
            foreach (Arms a in System.Enum.GetValues(typeof(Arms)))
            {
                foreach (var n in new[] { CombatMotion.Idle(a), CombatMotion.Cover(a), CombatMotion.Aim(a), CombatMotion.Carry(a), CombatMotion.Reload(a) })
                    if (n != null) Assert.That(names, Does.Contain(n), $"{a}: {n}");
                for (var i = 0; i < 6; i++)
                    foreach (var f in new[] { false, true })
                    {
                        Assert.That(names, Does.Contain(CombatMotion.Strike(a, f, i)), $"{a} blow {i}");
                        Assert.That(names, Does.Contain(CombatMotion.Miss(a, f, i % 2 == 0, i)), $"{a} miss {i}");
                    }
            }
            foreach (var z in new[] { "head", "torso", "legL" }) foreach (var b in new[] { false, true }) Assert.That(names, Does.Contain(CombatMotion.Heavy(b, z)));
            foreach (var up in new[] { 1.0, 0.0, -1.0 }) foreach (var c in new[] { false, true }) Assert.That(names, Does.Contain(CombatMotion.Rise(up, c)));
        }

        [Test]
        public void LoopsLoopAsTheirSidecarsSay()
        {
            foreach (var s in CombatMotion.States)
                foreach (var f in new[] { false, true })
                {
                    var clip = s.ClipFor(f);
                    var loop = Side(clip).Value<bool?>("loop") ?? false;
                    if (s.Loop) Assert.That(loop, Is.True, $"{s.Name}: {clip} is a loop in its sidecar");
                    // (a one-shot state may be a looping clip's one pass, never a one-shot clip held as a loop)
                }
        }

        /// <summary>README v2 §2: one-shots that travel over 15 cm are applied (or cut); none is baked in place to slide back
        /// at its end. A loop or an in-place one-shot is baked.</summary>
        [Test]
        public void RootMotionAgreesWithEachClipsTravel()
        {
            var wrong = new List<string>();
            foreach (var c in CombatMotion.Clips.Concat(CombatMotion.Spare))
            {
                var side = Side(c.Name);
                var loop = side.Value<bool?>("loop") ?? false;
                var root = side.Value<bool?>("root") ?? false;
                var travel = side["travel_m"] is JArray arr && arr.Count >= 2 ? System.Math.Sqrt(arr[0].Value<double>() * arr[0].Value<double>() + arr[1].Value<double>() * arr[1].Value<double>()) : 0.0;
                if (loop && c.XZ != RootXZ.Bake) wrong.Add($"{c.Name}: a loop plays in place");
                if (!loop && root && c.XZ != RootXZ.Apply) wrong.Add($"{c.Name}: travels {travel:0.00} m (root: true) but is baked in place");
                if (!root && c.XZ == RootXZ.Apply) wrong.Add($"{c.Name}: applied, but its sidecar says it stays within 15 cm");
                if (c.Turn && c.XZ != RootXZ.Apply) wrong.Add($"{c.Name}: a turn applied without its travel");
                if (c.Turn && c.DropTurn) wrong.Add($"{c.Name}: its turn both applied and dropped");
            }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
            // the long cover transitions are cut at their first stride
            foreach (var s in CombatMotion.States.Where(s => s.Name == "cover_leave" || s.Name == "hit_shove"))
                Assert.That(s.Cut, Is.LessThanOrEqualTo(0.35f), s.Name + " is cut");
        }

        /// <summary>combat v2 README §3: a woman plays a woman's take or one whose sex is not recorded, a man a man's or an
        /// unrecorded one; the only exceptions are the men's guard and right hook (no woman's guard or hook is captured: the
        /// women's guard and the one-handed slash's body are a man's, flagged in COMBAT.md). A state only one sex plays is
        /// never picked for the other.</summary>
        [Test]
        public void EachSexPlaysItsOwnTakes()
        {
            var flagged = new HashSet<string> { "fist_guard_accad", "fist_hook_r_accad" };
            var wrong = new List<string>();
            foreach (var s in CombatMotion.States)
                foreach (var female in new[] { false, true })
                {
                    if (s.Only == (female ? "m" : "f")) continue;
                    var clip = s.ClipFor(female);
                    var set = Side(clip).Value<string>("set") ?? "both";
                    if (female && set == "m" && flagged.Contains(clip) && !s.Name.StartsWith("melee_") && !s.Name.EndsWith("_idle") && s.Name != "unarmed_relax") wrong.Add($"{s.Name}: {clip} is flagged only for the guard and the slash");
                    if (female && set == "m" && !flagged.Contains(clip)) wrong.Add($"{s.Name}: a man's take ({clip}) on women");
                    if (!female && set == "f") wrong.Add($"{s.Name}: a woman's take ({clip}) on men");
                }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
            // and the strikes picked by sex are each sex's own (or unlabelled) blows
            foreach (Arms a in System.Enum.GetValues(typeof(Arms)))
                for (var i = 0; i < 6; i++)
                    foreach (var female in new[] { false, true })
                    {
                        var other = female ? "m" : "f";
                        Assert.That(CombatMotion.State(CombatMotion.Strike(a, female, i)).Only, Is.Not.EqualTo(other), $"{a} blow {i} for {(female ? "a woman" : "a man")}");
                        Assert.That(CombatMotion.State(CombatMotion.Miss(a, female, i % 2 == 0, i)).Only, Is.Not.EqualTo(other), $"{a} miss {i}");
                        Assert.That(Side(CombatMotion.State(CombatMotion.Strike(Arms.Unarmed, female, i)).ClipFor(female)).Value<string>("set"), Is.Not.EqualTo(other));
                    }
        }

        [Test]
        public void BlowsThrowsAndShotsCarryTheirFrames()
        {
            foreach (var s in CombatMotion.States)
                foreach (var f in new[] { false, true })
                {
                    var clip = s.ClipFor(f);
                    var side = Side(clip);
                    var frames = side.Value<int>("frames");
                    var ev = side["events"] as JObject;
                    string need = s.Gate == "strike" && !s.Name.Contains("block") ? "impact" : s.Gate == "throw" ? "release" : s.Name is "rifle_fire" or "rifle_burst" ? "fire" : null;
                    if (need == null) continue;
                    Assert.That(ev?[need], Is.Not.Null, $"{s.Name}: {clip} has no {need} frame");
                    foreach (var fr in ev[need].Values<int>())
                    {
                        Assert.That(fr, Is.InRange(1, frames - 2), $"{s.Name}: {clip} {need} at frame {fr} of {frames}");
                        var t = fr / (double)(frames - 1);
                        Assert.That(t, Is.GreaterThan(s.From).And.LessThan(s.Cut), $"{s.Name}: {clip}'s {need} ({t:0.00}) falls inside the part played ({s.From}-{s.Cut})");
                    }
                }
            Assert.That(Side("rifle_burst_cmu")["events"]["fire"].Values<int>().ToArray(), Is.EqualTo(new[] { 7, 10, 13 }));
        }

        [Test]
        public void EveryContentWeaponIsHeldAsAStagedModel()
        {
            var db = ContentFixture.Db();
            var models = new HashSet<string>(CombatMotion.Models);
            var n = 0;
            foreach (var item in SecondFace.Core.Inventory.Items.All.Values.Where(i => i.Weapon != null))
            {
                n++;
                var h = CombatMotion.For(item);
                if (item.Weapon.Kind == "unarmed") { Assert.That(h.Shown, Is.False, item.Id + ": fists"); continue; }
                Assert.That(h.Shown, Is.True, item.Id + " is held as a model");
                Assert.That(models, Does.Contain(h.Model), item.Id);
                Assert.That(h.Variant, Is.InRange(1, 2), item.Id);
                var expect = item.Weapon.Kind switch
                {
                    "pistol" or "arc" => Arms.Pistol,
                    "rifle" or "smg" or "shotgun" => Arms.Rifle,
                    "thrown" => Arms.Thrown,
                    _ => item.Weapon.Hands >= 2 ? Arms.Club2 : Arms.Melee,
                };
                Assert.That(h.Arms, Is.EqualTo(expect), item.Id + "'s grip");
                // (the paint differs by who holds it, the model never does)
                Assert.That(CombatMotion.For(item, "a").Model, Is.EqualTo(CombatMotion.For(item, "b").Model));
            }
            Assert.That(n, Is.GreaterThan(10), "the content's weapons");
            Assert.That(CombatMotion.For(null).Arms, Is.EqualTo(Arms.Unarmed));
            Assert.That(CombatMotion.ByKind(new WeaponDef { Kind = "melee", Hands = 1, DmgType = "blade" }).Model, Is.EqualTo("machete"));
            Assert.That(CombatMotion.Thrown(new ItemDef { Weapon = new WeaponDef { Kind = "thrown", DmgType = "fire" } }).Model, Is.EqualTo("bottle"));
        }

        [Test]
        public void EveryModelHasItsGripsStaged()
        {
            var weapons = Path.Combine(Path.GetDirectoryName(Dir()), "Weapons");
            foreach (var m in CombatMotion.Models)
            {
                var j = JObject.Parse(File.ReadAllText(Path.Combine(weapons, m, m + ".json")));
                var pts = j["points_unity"] as JObject;
                Assert.That(pts?["grip_main"], Is.Not.Null, m + ": grip_main");
                var main = pts["grip_main"].Values<double>().ToArray();
                Assert.That(main.Select(System.Math.Abs).Max(), Is.LessThan(1e-3), m + ": the origin is the main grip");
                var held = CombatMotion.HeldModels.Values.FirstOrDefault(h => h.Model == m);
                var twoHands = CombatMotion.HeldModels.Values.Any(h => h.Model == m && (h.Arms == Arms.Rifle || h.Arms == Arms.Club2));
                if (twoHands && m != "crowbar") Assert.That(pts["grip_off"], Is.Not.Null, m + ": a two-handed weapon's grip_off");
                if (held.Arms == Arms.Pistol || held.Arms == Arms.Rifle) Assert.That(pts["muzzle"], Is.Not.Null, m + ": muzzle");
                Assert.That(File.Exists(Path.Combine(weapons, m, m + ".fbx")), Is.True, m + ".fbx");
                foreach (var v in new[] { "v1", "v2" })
                    foreach (var mat in (JObject)j["variants"][v]["materials"])
                        foreach (var map in new[] { "BaseColor", "Normal", "Mask" })
                        {
                            var file = (string)mat.Value[map];
                            if (file == null) continue;
                            Assert.That(File.Exists(Path.Combine(weapons, m, file)), Is.True, $"{m} {v} {map}: {file}");
                        }
            }
        }

        /// <summary>The ready holds (HandsIk.Hold: a long gun's low ready standing and crouched, a two-handed club's) on bodies of
        /// real proportions (shoulder joints 0.31-0.40 m apart, shoulder-to-palm reach 0.55-0.68 m, the support shoulder level
        /// with the main one or 4 cm higher or lower; the frame is the shoulders' own, so neither stands ahead of the other in
        /// it) with every staged weapon of that kind (its sidecar's grip_off and butt): the off hand within the off arm's reach
        /// (WG2 can hold), the main elbow bent as a real hold bends it (80-120°, never the stopgap's straight arm), the support
        /// elbow 20-100° on a long gun (to 125° with both hands together on a club's handle), and a long gun clear of the
        /// trunk: no point from its butt to its fore-end less than 6 cm ahead of the shoulders' plane over the trunk's breadth
        /// (the shoulder joint sits about mid-depth of the upper chest: a stock resting in the shoulder's pocket lies 6-10 cm
        /// ahead of it).</summary>
        [Test]
        public void TheReadyHoldsReachAndBendOnEveryBody()
        {
            var weapons = Path.Combine(Path.GetDirectoryName(Dir()), "Weapons");
            (double X, double Y, double Z) P(JObject pts, string k) { var a = pts[k].Values<double>().ToArray(); return (a[0], a[1], a[2]); }
            static double Elbow(double d, double reach)
            {
                // a two-bone arm: the upper arm 47 % of the reach, the forearm to the palm 53 %
                double a = 0.47 * reach, b = 0.53 * reach;
                var c = System.Math.Max(-1.0, System.Math.Min(1.0, (a * a + b * b - d * d) / (2 * a * b)));
                return 180.0 - System.Math.Acos(c) * 180.0 / System.Math.PI;
            }
            static double Dist((double X, double Y, double Z) a, (double X, double Y, double Z) b) => System.Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y) + (a.Z - b.Z) * (a.Z - b.Z));
            var wrong = new List<string>();
            foreach (var (arms, crouched, models) in new[] { (Arms.Rifle, false, new[] { "rifle_auto", "rifle_bolt", "shotgun_sawn" }), (Arms.Rifle, true, new[] { "rifle_auto", "rifle_bolt", "shotgun_sawn" }), (Arms.Club2, false, new[] { "bat" }) })
                foreach (var m in models)
                {
                    var hold = CombatMotion.Hold(arms, crouched).Value;
                    var pts = (JObject)JObject.Parse(File.ReadAllText(Path.Combine(weapons, m, m + ".json")))["points_unity"];
                    var off = P(pts, "grip_off");
                    foreach (var width in new[] { 0.31, 0.36, 0.40 })
                        foreach (var reach in new[] { 0.55, 0.62, 0.68 })
                            foreach (var rise in new[] { -0.04, 0.0, 0.04 })
                            {
                                var offShoulder = (-width, rise, 0.0);
                                var (grip, line) = CombatMotion.PlaceHold(hold, offShoulder, reach, reach, off);
                                var offAt = Add(grip, CombatMotion.HoldTurn(line, off));
                                var who = $"{arms}{(crouched ? " crouched" : "")} {m}, shoulders {width} m, reach {reach} m, the off shoulder {rise:+0.00;-0.00} m";
                                var dOff = Dist(offAt, offShoulder);
                                if (dOff > 0.97 * reach) wrong.Add($"{who}: grip_off {dOff:0.00} m from the off shoulder (reach {reach})");
                                var eMain = Elbow(Dist(grip, (0, 0, 0)), reach); var eOff = Elbow(dOff, reach);
                                if (eMain < 80 || eMain > 120) wrong.Add($"{who}: the main elbow {eMain:0}°");
                                if (eOff < 20 || eOff > (arms == Arms.Club2 ? 125 : 100)) wrong.Add($"{who}: the off elbow {eOff:0}°");
                                if (arms != Arms.Rifle) continue;
                                var butt = P(pts, "butt");
                                for (var t = 0.0; t <= 1.0001; t += 0.1)
                                {
                                    var along = (butt.X + (off.X - butt.X) * t, butt.Y + (off.Y - butt.Y) * t, butt.Z + (off.Z - butt.Z) * t);
                                    var at = Add(grip, CombatMotion.HoldTurn(line, along));
                                    if (at.X > -width - 0.05 && at.X < 0.05 && at.Y > -0.62 && at.Y < 0.08 && at.Z < 0.06)
                                    { wrong.Add($"{who}: the gun {at.Z * 100:0} cm ahead of the shoulders over the trunk at {t:0.0} of butt to fore-end"); break; }
                                }
                            }
                }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        private static (double X, double Y, double Z) Add((double X, double Y, double Z) a, (double X, double Y, double Z) b) => (a.X + b.X, a.Y + b.Y, a.Z + b.Z);

        [Test]
        public void TheFightsPaceKeepsMotionHuman()
        {
            Assert.That(CombatMotion.Rate(CombatPace.Normal, false), Is.EqualTo(1f));
            Assert.That(CombatMotion.Rate(new CombatPace(3f, false), false), Is.EqualTo(1.6f).Within(1e-4));
            Assert.That(CombatMotion.Rate(new CombatPace(1f, true), false), Is.EqualTo(1f), "skip leaves our own turns alone");
            Assert.That(CombatMotion.Rate(new CombatPace(1f, true), true), Is.EqualTo(2.5f).Within(1e-4));
            Assert.That(CombatMotion.Rate(new CombatPace(0.5f, false), false), Is.EqualTo(1f), "never slower than captured");
        }
    }
}
