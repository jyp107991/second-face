using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core.Stats;
using SecondFace.Game.Fighting;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The motion and posture gate (docs/PEOPLE_MOTION.md, binding: "humans that look and move like humans"). People made
    /// by the game's own code (<see cref="PeopleService.Animate"/> for residents, <see cref="Walker.Animate"/> for the
    /// player's body) with every runtime system on, played through every state the game shows them in (the four idles on
    /// flat and sloped ground, looking at someone round them, each gesture and its end, the conversation turn, walking,
    /// jogging, sneaking, straight and round a bend, two people talking, and fighting: each weapon's ready stance, aim and
    /// shots, blows, a block, a crit's stagger, cover, a throw, a reload, the weapon carried over a walk, hands up, a fall
    /// and the get-up, through the game's own fight view), measured every frame by <see cref="MotionProbe"/> and held to
    /// the limits taken from real people (§2 there; the fight's from real fighters, §2.7). Writes test-results/motion_gate.json and .md; captures
    /// from the game camera (default and closest zoom), the conversation view and human height. Any measure past its
    /// limit fails the gate (S2).
    /// </summary>
    public class HumanMotionGateTests
    {
        /// <summary>The quick set (every CI run): women and men, slim, broad and heavy, young and old, several peoples and
        /// trades' clothes; the last is made as the player's body.</summary>
        public static readonly string[] Quick =
        {
            "Female_Adult_01", "Female_Adult_09", "Business_Female_02", "Construction_Female_01", "Male_Adult_08", "Male_Adult_03",
            "Construction_Male_03", "Male_Adult_12", "Police_Male_07", "Female_Adult_04",
        };

        private const float Lane = 7f;
        private static readonly string[] Gestures = { "talk", "talk_b", "argue", "drink", "wave", "stretch", "yawn", "yawn_b" };

        // ---------------------------------------------------------------- limits (docs/PEOPLE_MOTION.md §2)

        public sealed class Lim
        {
            public string M;
            public float Lo = float.NegativeInfinity, Hi = float.PositiveInfinity, CapLo = float.NegativeInfinity, CapHi = float.PositiveInfinity;
            public float MeanMax = float.PositiveInfinity, Over = float.PositiveInfinity, OverFrac = 1f;
        }

        private const float Inf = float.PositiveInfinity;

        // ---------------------------------------------------------------- the arm's hang by build (docs/qa/motion_calibration.md §9)
        /// <summary>A man's upper arm hangs further out the broader his trunk where the elbow hangs (docs/qa/arm_build_evidence.md:
        /// Cau et al., Shewhorak's walkers, the clearance geometry on ANSUR II; the coordinator's decision, 2026-11-18): standing,
        /// A1 ≤ 20 + <see cref="A1PerCm"/>·e, where e is his BODY's breadth at the hanging elbow past ANSUR II men's median at
        /// his stature (<see cref="AnsurWaistShare"/> of it: the median of waist breadth over stature, 4,082 men, nude), held
        /// to <see cref="BuildMaxCm"/>, the edge of the data. The body's breadth: his TorsoProfile as built (the game's own
        /// garment layers left out) less twice his base's baked top (docs/qa/gates/motion_build_tops.json: a shirt 0.3 cm a
        /// side, a knit 0.6, a jacket or coat 1.3; a top that cannot be classified a jacket's, the stricter limit). The base
        /// limit of 20 already holds real people's ordinary clothes, so clothes counted into e would count twice. The
        /// conservative end of the evidence (k 0.43 of its 0.43-1.29° per cm). Women keep 20 until a woman's reference
        /// exists; the cap stays 28.</summary>
        public const float A1PerCm = 0.37f, AnsurWaistShare = 0.18588f, BuildMaxCm = 9f;
        private static readonly Dictionary<string, float> BuildCm = new();
        private static readonly Dictionary<string, string> BuildTop = new();
        private static Newtonsoft.Json.Linq.JObject _tops;
        private static (string Class, float Cm) Top(string id)
        {
            if (_tops == null)
            {
                var path = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "docs", "qa", "gates", "motion_build_tops.json"));
                _tops = File.Exists(path) ? Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(path)) : new Newtonsoft.Json.Linq.JObject();
            }
            var cls = (string)_tops["bases"]?[id] ?? "jacket";
            var cm = (float?)_tops["allowance_cm"]?[cls] ?? 1.3f;
            return (cls, cm);
        }

        /// <summary>A man's e (cm; 0 for a woman, or where his trunk is no broader than the median).</summary>
        private static float Build(GameObject go, Animator a, bool male, string id)
        {
            if (!male || a == null) return 0f;
            var tp = go.GetComponentInChildren<TorsoProfile>();
            var hips = a.GetBoneTransform(HumanBodyBones.Hips); var up = a.GetBoneTransform(HumanBodyBones.LeftUpperArm);
            var lo = a.GetBoneTransform(HumanBodyBones.LeftLowerArm); var upR = a.GetBoneTransform(HumanBodyBones.RightUpperArm);
            if (tp == null || hips == null || up == null || lo == null || upR == null) return 0f;
            // the stature: the body's own mesh at its bind, as the audit measures it (a renderer's bounds are padded: 7-9 cm over)
            var top = float.MinValue; var baked = new Mesh();
            foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>())
            {
                if (r.sharedMesh == null) continue;
                r.BakeMesh(baked, false);
                var m = r.transform.localToWorldMatrix;
                foreach (var v in baked.vertices) top = Mathf.Max(top, m.MultiplyPoint3x4(v).y);
            }
            Object.Destroy(baked);
            if (top == float.MinValue) return 0f;
            var stature = (top - go.transform.position.y) * 100f;
            // the hanging elbow's height in the profile's frame (the hips' at rest): the shoulder joints less the upper arm
            var elbowY = 0.5f * (up.position.y + upR.position.y) - (lo.position - up.position).magnitude - hips.position.y;
            // the profile as built (its Rx: Sample adds the game's garment layers worn over it)
            if (tp.Rx == null || tp.Rx.Length < 2) return 0f;
            var f = (elbowY / Mathf.Max(0.01f, go.transform.lossyScale.y) - tp.Bottom) / tp.Step;
            if (f < 0f || f > tp.Rx.Length - 1) return 0f;
            var i0 = Mathf.Min((int)f, tp.Rx.Length - 2);
            var rx = Mathf.Lerp(tp.Rx[i0], tp.Rx[i0 + 1], f - i0);
            var built = 2f * rx * go.transform.lossyScale.x * 100f;
            var (cls, side) = Top(id);
            var breadth = built - 2f * side;
            var e = Mathf.Clamp(breadth - AnsurWaistShare * stature, 0f, BuildMaxCm);
            BuildTop[id] = $"{cls} {side:0.0}";
            Debug.Log($"HumanMotionGate build: {id} trunk at the hanging elbow {built:0.0} cm as built, its top a {cls} ({side:0.0} cm a side), the body {breadth:0.0}, stature {stature:0.0} cm, the median {AnsurWaistShare * stature:0.0}, e {e:0.0}");
            return e;
        }
        private static Lim L(string m, float lo, float hi, float capLo, float capHi) => new() { M = m, Lo = lo, Hi = hi, CapLo = capLo, CapHi = capHi };

        private static readonly Lim F4 = new() { M = "F4", MeanMax = 3f, Over = 10f, OverFrac = 0.02f };
        private static readonly Lim C1 = L("C1", -Inf, 0.5f, -Inf, 1.5f);
        private static readonly Lim A6 = L("A6", 50f, Inf, 35f, Inf);
        private static readonly Lim F1 = L("F1", -1.5f, 2.5f, -3f, 4f);
        private static readonly Lim F2 = L("F2", -2f, 2f, -4f, 4f);

        /// <summary>Standing, the upper arm's hang: 20 (28) for everyone, raised for a broad man by his build (Build).</summary>
        private static readonly Lim StandA1 = L("A1", -Inf, 20f, -Inf, 28f);

        private static readonly Lim[] StandLimits =
        {
            StandA1, L("A2", 5f, 35f, 0f, 50f), L("A3", -Inf, 30f, -Inf, 40f), L("A4", -Inf, 6f, -Inf, 10f),
            L("A5", 8f, 55f, 3f, 75f), L("S1", -Inf, 6f, -Inf, 10f), L("H1", -15f, 8f, -25f, 12f), L("H2", -Inf, 30f, -Inf, 45f),
            L("H3", -Inf, 10f, -Inf, 15f), F1, F2, L("F3w", 8f, 32f, 5f, 40f), L("F3a", -Inf, 12f, -Inf, 20f), L("F3s", -Inf, 25f, -Inf, 35f), F4, C1,
            new() { M = "F5", MeanMax = 0.12f }, A6,
            L("K1", -Inf, 8f, -Inf, 12f), L("K2", -Inf, 6f, -Inf, 10f), L("K3", -Inf, 5f, -Inf, 8f), L("K4", -Inf, 2f, -Inf, 4f), L("K5", -Inf, 10f, -Inf, 20f),
        };

        private static Lim[] GestureLimits(string g) => new[]
        {
            C1, F1, F2, F4, L("H1", -25f, 15f, -30f, 20f), L("H2", -Inf, 30f, -Inf, 45f),
            g is "stretch" or "stretch_m" or "yawn" or "yawn_b" ? L("S1", -Inf, 20f, -Inf, 20f) : L("S1", -Inf, 10f, -Inf, 10f),
        };

        private static readonly Lim[] TurnLimits = { F4, F1, F2, C1, L("T1", -Inf, 20f, -Inf, 20f) };

        private static readonly Lim[] WalkLimits =
        {
            new() { M = "W1", MeanMax = 8f, Over = 15f, OverFrac = 0.05f }, new() { M = "W2", MeanMax = 0.10f }, L("W6", -1.5f, 2.5f, -3f, 4f),
            L("W3", -Inf, 35f, -Inf, 45f), L("W4", -25f, 8f, -32f, 12f), L("W5", -Inf, 25f, -Inf, 35f), C1, A6,
        };

        /// <summary>Jogging swings the arms further than walking: real joggers at the game's jog pace (CMU 35, 16; 2.7-3.4 m/s)
        /// swing the upper arm 39-52° at p98 (docs/qa/motion_calibration.md §3.2, 2026-11-17).</summary>
        private static readonly Lim[] JogLimits = WalkLimits.Select(l => l.M == "W3" ? L("W3", -Inf, 55f, -Inf, 65f) : l).ToArray();

        /// <summary>The pace each gait is played at for this body at the game's speeds (P1: the playback rate, the clip's own
        /// cadence times it; Pace keeps it within its RateMin-RateMax) and the cadence that gives (P2, steps a minute: walking
        /// 80-135, Hollman et al. 2011, Frimenko et al. 2015; jogging and running 145-200, Cavanagh &amp; Kram 1989, Heiderscheit et
        /// al. 2011; the clip QA's norms, tools/unity/motion/clip_qa.py). A clip played past its natural cadence (a misread frame
        /// rate, a woman's slow walk hurried to the player's pace) reads here (T6, docs/MOTION_ROOT_CAUSE.md §7).</summary>
        private static readonly Lim[] PaceWalkLimits = { L("P1", 0.8f, 1.25f, 0.8f, 1.25f), L("P2", 80f, 135f, 80f, 135f) };
        private static readonly Lim[] PaceJogLimits = { L("P1", 0.8f, 1.25f, 0.8f, 1.25f), L("P2", 145f, 200f, 145f, 200f) };

        private static readonly Lim[] TalkLimits = StandLimits.Concat(new[] { L("T2", -Inf, 20f, -Inf, 20f), L("T3", 0.9f, 1.6f, 0.9f, 1.6f) }).ToArray();

        // ---------------------------------------------------------------- the fight's states (docs/PEOPLE_MOTION.md §2.7)
        // Real fighters' p2…p98 as the limit, their min…max as the cap, each state's trials pooled (docs/qa/motion_calibration.md
        // §7, accepted for WP2 2026-11-17; the long-gun aim provisional: two actors, a mimed gun). They apply only while the
        // game shows the fight's own stance: quiet standing's and walking's limits above are not loosened by them. Kb is the
        // more bent knee; WG1 the weapon's main grip from the palm's centre and WG2 the off hand's palm from its grip (cm,
        // COMBAT.md A1).

        private static readonly Lim[] GuardLegsHead =
        {
            L("K1", -Inf, 67f, -Inf, 81f), L("Kb", -Inf, 75.5f, -Inf, 94.5f), L("H1", -26.9f, 10.3f, -33.0f, 14.0f), L("H2", -Inf, 55.9f, -Inf, 59.5f),
            L("H3", -Inf, 19.5f, -Inf, 21.5f), L("F2", -Inf, 9.8f, -Inf, 14.4f), L("F3w", 21.2f, 70.4f, 3.9f, 79.2f),
        };
        private static readonly Lim[] GuardArms = { L("A1", -Inf, 103f, -Inf, 119f), L("A2", 112.8f, 146.9f, 109.3f, 149.9f) };
        private static readonly Lim[] StrikeLegsHead =
        {
            L("K1", -Inf, 82f, -Inf, 89f), L("Kb", -Inf, 90.5f, -Inf, 97.1f), L("H1", -41.9f, 16.8f, -53.3f, 22.9f), L("H2", -Inf, 56.8f, -Inf, 65.9f),
            L("H3", -Inf, 22.1f, -Inf, 25.7f), L("F2", -Inf, 13.2f, -Inf, 14.7f), L("F3w", 16.4f, 83.2f, 1.3f, 90.5f),
        };
        private static readonly Lim[] StrikeArms = { L("A1", -Inf, 88.5f, -Inf, 112f), L("A2", 83.9f, 140.5f, 41.1f, 145.7f) };
        /// <summary>The long-gun aim from three actors (docs/qa/motion_calibration.md §8, combat set v4, 2026-11-17: CMU 79_96, 80_03
        /// and 100STYLE's Swat_ID, the third bending both knees as real shooters do; the head from 79_96 and 100STYLE). It
        /// replaced §7's provisional two-actor column (K1 ≤ 2.2, both actors standing straight) on 2026-11-18.</summary>
        private static readonly Lim[] AimLegs = { L("K1", -Inf, 33.5f, -Inf, 34.9f), L("Kb", -Inf, 37.2f, -Inf, 38.0f), L("F2", -Inf, 1.8f, -Inf, 1.9f), L("F3w", 23.4f, 44.7f, 23.3f, 44.7f) };
        private static readonly Lim[] AimHead = { L("H1", -7.1f, 0.6f, -7.1f, 1.6f), L("H2", 15.7f, 33.3f, 15.1f, 33.7f), L("H3", 7.9f, 16.3f, 7.8f, 16.7f) };
        private static readonly Lim[] AimArms = { L("A1", 54.8f, 86.2f, 50.2f, 90.5f), L("A2", 119.7f, 146.1f, 119.5f, 146.6f) };
        /// <summary>A two-handed weapon's blows from three actors (§8: CMU 79, 80, 124): the arms rise far higher than a punch's and
        /// the elbows open, the stance wider; the head as the unarmed strike's until a two-handed actor's head can be read.</summary>
        private static readonly Lim[] Strike2Legs = { L("K1", -Inf, 36.1f, -Inf, 39.3f), L("Kb", -Inf, 54.9f, -Inf, 57.6f), L("F2", -Inf, 15.1f, -Inf, 15.3f), L("F3w", 23.1f, 66.0f, 22.1f, 66.4f) };
        private static readonly Lim[] Strike2Arms = { L("A1", -Inf, 122.5f, -Inf, 129.4f), L("A2", 13.8f, 128.6f, 11.6f, 135.2f) };
        /// <summary>A slip or duck from a blow, from four actors (§8: ACCAD Male2, Male1, Female1, CMU 77).</summary>
        private static readonly Lim[] DodgeLegsHead =
        {
            L("K1", -Inf, 122.6f, -Inf, 124f), L("Kb", -Inf, 127.9f, -Inf, 129.2f), L("H1", -47.5f, 3.9f, -54f, 7.9f), L("H2", -Inf, 54.4f, -Inf, 55.4f),
            L("H3", -Inf, 18.2f, -Inf, 21f), L("F2", -Inf, 6.6f, -Inf, 10.5f), L("F3w", 13.2f, 110.8f, 7.1f, 139.8f),
        };
        private static readonly Lim[] CrouchLimits =
        {
            L("K1", 16.7f, 147f, 16.1f, 148f), L("Kb", -Inf, 148f, -Inf, 148f), L("H1", -44.7f, 33.8f, -53.3f, 35.4f), L("H2", -Inf, 92.1f, -Inf, 93.2f),
            L("H3", -Inf, 36.7f, -Inf, 45.6f), L("F2", -Inf, 17.1f, -Inf, 17.2f), L("F3w", 18.9f, 50.6f, 16.0f, 51.0f), L("A1", -Inf, 134f, -Inf, 135f),
            L("A2", -Inf, 140.7f, -Inf, 141.5f),
        };
        private static readonly Lim WG1 = L("WG1", -Inf, 1f, -Inf, 2f), WG2 = L("WG2", -Inf, 2f, -Inf, 3f);

        /// <summary>The limits for a fight's state set (the gate's state "combat:&lt;set&gt;:&lt;what&gt;"; Core's table names
        /// each state's set: <see cref="CombatMotion"/>). Where real fighters were measured (guard, strike, aim, crouch) their
        /// limits; where they were not, the nearest measured state's for the legs, head and feet, the arms by their hold on the
        /// weapon (WG1, WG2), and the owner's rule that nothing clips (C1) always.</summary>
        private static Lim[] CombatLimits(string set) => set switch
        {
            // the unarmed and one-handed guard (fists up: the guard's arms)
            "guard" => GuardLegsHead.Concat(GuardArms).Concat(new[] { F1, F4, C1, WG1 }).ToArray(),
            // a weapon's ready stance (low ready: the guard's legs and head, the arms on the weapon)
            "ready" => GuardLegsHead.Concat(new[] { F1, F4, C1, WG1, WG2 }).ToArray(),
            // blows (feet pivot and step: no F4, which real fighters were not measured on)
            "strike" => StrikeLegsHead.Concat(StrikeArms).Concat(new[] { F1, C1, WG1, WG2 }).ToArray(),
            // a two-handed weapon's blows (§8): their own legs and arms, the unarmed strike's head
            "strike2" => Strike2Legs.Concat(StrikeLegsHead.Where(l => l.M is "H1" or "H2" or "H3")).Concat(Strike2Arms).Concat(new[] { F1, C1, WG1, WG2 }).ToArray(),
            // a slip or a duck (§8): the dodgers' legs, head and feet (the arms are thrown about)
            "dodge" => DodgeLegsHead.Concat(new[] { F1, C1 }).ToArray(),
            // the long gun's aim and its shots (provisional)
            "aim" => AimLegs.Concat(AimHead).Concat(AimArms).Concat(new[] { F1, F4, C1, WG1, WG2 }).ToArray(),
            // the pistol's aim on the long gun's captured stance: its legs; no stock at the cheek, so the head as standing (§2.1)
            "aim_pistol" => AimLegs.Concat(new[] { AimHead[0], L("H2", -Inf, 30f, -Inf, 45f), L("H3", -Inf, 10f, -Inf, 15f), F1, F4, C1, WG1, WG2 }).ToArray(),
            "crouch" => CrouchLimits.Concat(new[] { F1, F4, C1, WG1, WG2 }).ToArray(),
            // a reload is a gesture with a weapon (§2.2)
            "reload" => new[] { C1, F1, F2, F4, L("H1", -25f, 15f, -30f, 20f), L("H2", -Inf, 30f, -Inf, 45f), L("S1", -Inf, 10f, -Inf, 10f), WG1 },
            // hands up raises the shoulders as a stretch does (§2.2's stretch)
            "yield" => new[] { C1, F1, F2, F4, L("H1", -25f, 15f, -30f, 20f), L("H2", -Inf, 30f, -Inf, 45f), L("S1", -Inf, 20f, -Inf, 20f) },
            // struck, and a throw: the strike's legs, head and feet (violent motion; the arms are thrown about)
            "hit" or "throw" => StrikeLegsHead.Concat(new[] { F1, C1 }).ToArray(),
            // up from the ground: nothing clips (no real people's limits for rising measured yet: reviewed by eye)
            "rise" => new[] { C1 },
            // the weapon carried over a walk: walking's own limits but the arms' swing (the arms hold the weapon)
            "carry" => WalkLimits.Where(l => l.M != "W3" && l.M != "A6").Concat(new[] { WG1, WG2 }).ToArray(),
            _ => StandLimits,
        };

        private static Lim[] LimitsFor(string state)
        {
            if (state.StartsWith("combat:")) return CombatLimits(state.Split(':')[1]);
            if (state.StartsWith("gesture:")) return GestureLimits(state.Substring(8));
            if (state == "pace:walk") return PaceWalkLimits;
            if (state == "pace:jog") return PaceJogLimits;
            if (state == "turn") return TurnLimits;
            if (state.EndsWith(":jog")) return JogLimits;
            if (state.StartsWith("walk:") || state.StartsWith("bend:")) return WalkLimits;
            if (state == "talk") return TalkLimits;
            return StandLimits;
        }

        // ---------------------------------------------------------------- the gate

        /// <summary>The feet, close (a review tool, run by name): four people as the game makes them, standing, then two talking
        /// as the game sets them, each pair of feet from four sides at shin height and from the game camera's pitch, 1200 px;
        /// and the lowest skin of each foot against the ground, logged.</summary>
        [UnityTest, Timeout(900000), Category("Heavy")]
        public IEnumerator FeetCloseUp()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            if (cat == null || assets == null) { Assert.Ignore("not built"); yield break; }
            yield return BootTests.Clear();
            var root = new GameObject("feet");
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.transform.SetParent(root.transform); ground.transform.localScale = new Vector3(40f, 1f, 40f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            ground.GetComponent<Renderer>().sharedMaterial.color = new Color(0.62f, 0.6f, 0.56f);
            var sun = new GameObject("sun").AddComponent<Light>(); sun.transform.SetParent(root.transform);
            sun.type = LightType.Directional; sun.intensity = 1.5f; sun.shadows = LightShadows.Soft; sun.transform.rotation = Quaternion.Euler(50f, 150f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(0.6f, 0.6f, 0.62f);
            var ids = new[] { "Female_Adult_01", "Male_Adult_01", "Business_Female_02", "Construction_Male_03" };
            var made = new List<(string Id, GameObject Go)>();
            for (var i = 0; i < ids.Length; i++)
            {
                var go = Object.Instantiate(cat.Get(ids[i]), new Vector3(i * 3f, 0f, 0f), Quaternion.identity, root.transform);
                var p = RbPeople.Of(ids[i]);
                RbDress.Apply(go, RbPeople.DyesFor(p, "feet_" + ids[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                var amb = PeopleService.Animate(a, assets.Locomotion, ids[i], p?.Male ?? true); amb.MinGap = amb.MaxGap = 1e6f;
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                made.Add((ids[i], go));
            }
            yield return Wait(3f);
            var cam = new GameObject("cam") { tag = "MainCamera" }.AddComponent<Camera>(); cam.transform.SetParent(root.transform);
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.7f, 0.75f, 0.8f); cam.nearClipPlane = 0.05f;
            IEnumerator Shots(string tag)
            {
                foreach (var (id, go) in made)
                {
                    var a = go.GetComponentInChildren<Animator>();
                    var lf = a.GetBoneTransform(HumanBodyBones.LeftFoot).position; var rf = a.GetBoneTransform(HumanBodyBones.RightFoot).position;
                    var mid = (lf + rf) * 0.5f; mid.y = 0.08f;
                    // the lowest skin under each foot, against the ground (y 0)
                    var smr = go.GetComponentsInChildren<SkinnedMeshRenderer>().OrderByDescending(r => r.sharedMesh.vertexCount).First();
                    var mesh = new Mesh(); smr.BakeMesh(mesh, true);
                    var l2w = Matrix4x4.TRS(smr.transform.position, smr.transform.rotation, Vector3.one);
                    float lowL = 9f, lowR = 9f;
                    foreach (var v0 in mesh.vertices)
                    {
                        var v = l2w.MultiplyPoint3x4(v0);
                        if ((v - lf).sqrMagnitude < 0.2f * 0.2f) lowL = Mathf.Min(lowL, v.y);
                        if ((v - rf).sqrMagnitude < 0.2f * 0.2f) lowR = Mathf.Min(lowR, v.y);
                    }
                    Object.Destroy(mesh);
                    Debug.Log($"FeetCloseUp {tag} {id}: lowest skin by the left foot {lowL * 100f:0.0} cm, right {lowR * 100f:0.0} cm; ankles {lf.y * 100f:0.0} / {rf.y * 100f:0.0} cm up");
                    cam.fieldOfView = 35f;
                    for (var k = 0; k < 4; k++)
                    {
                        var dir = Quaternion.Euler(0f, 90f * k + go.transform.eulerAngles.y, 0f) * Vector3.forward;
                        cam.transform.SetPositionAndRotation(mid + dir * 1.3f + Vector3.up * 0.15f, Quaternion.LookRotation(-dir + Vector3.down * 0.1f, Vector3.up));
                        yield return ScreenshotTests.Capture($"feet_{tag}_{id}_{k}", 900, 600);
                    }
                    // as the game camera sees them (pitch 48°, closest zoom), the whole person
                    cam.fieldOfView = 28f;
                    var rot = Quaternion.Euler(48f, go.transform.eulerAngles.y + 180f, 0f);
                    cam.transform.SetPositionAndRotation(go.transform.position + Vector3.up * 1.0f - rot * Vector3.forward * 4.5f, rot);
                    yield return ScreenshotTests.Capture($"feet_{tag}_{id}_game", 900, 900);
                }
            }
            yield return Shots("stand");
            // two talking, as the game sets them: the first two face each other at 1.3 m and turn as the game turns them
            made[1].Go.transform.SetPositionAndRotation(made[0].Go.transform.position + Vector3.forward * 1.3f, Quaternion.Euler(0f, 180f, 0f));
            yield return Wait(0.5f);
            var runner = root.AddComponent<Runner>();
            runner.StartCoroutine(Walkabout.Face(made[0].Go.transform, made[1].Go.transform.position));
            yield return Wait(3f);
            yield return Shots("talk");
            Object.Destroy(root);
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }

        /// <summary>G1 and G2 (docs/PEOPLE_MOTION.md §2.6): every Rocketbox person's layers stand off the body as real clothes do
        /// (radial ease from apparel norms: a jacket ~1-1.6 cm), and each layer worn over another stands further out than it.</summary>
        [Test]
        public void LayersStandOffAsClothDoes()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            if (cat == null || cat.People.Length == 0) { Assert.Ignore("no Rocketbox catalogue built"); return; }
            var limit = new Dictionary<string, float>
            {
                ["cargo"] = 0.7f, ["boots"] = 1.3f, ["gaiter"] = 0.9f, ["bomber"] = 1.0f, ["vest"] = 1.4f, ["straps"] = 1.8f,
                ["cape"] = 2.0f, ["belt"] = 1.8f, ["wraps"] = 0.4f, ["shins"] = 1.6f,
            };
            var over = new[] { ("straps", "vest"), ("vest", "bomber"), ("cape", "bomber"), ("belt", "cargo"), ("belt", "vest"), ("shins", "cargo"), ("shins", "boots"), ("boots", "cargo") };
            var wrong = new List<string>();
            var n = 0;
            foreach (var e in cat.People)
            {
                var set = e?.Prefab != null ? e.Prefab.GetComponentInChildren<RbLayerSet>(true) : null;
                if (set == null || set.Data == null) { wrong.Add($"{e?.Id}: no layers built"); continue; }
                var layers = set.Layers;
                n++;
                foreach (var (id, layer) in layers)
                    if (limit.TryGetValue(id, out var cm) && layer.Thickness * 100f > cm + 1e-3f) wrong.Add($"{e.Id} {id}: {layer.Thickness * 100f:0.0} cm off the body (G1 ≤ {cm})");
                foreach (var (outer, inner) in over)
                    if (layers.TryGetValue(outer, out var o) && layers.TryGetValue(inner, out var i) && o.Thickness <= i.Thickness && !(outer == "boots" && inner == "cargo"))
                        wrong.Add($"{e.Id}: {outer} ({o.Thickness * 100f:0.0} cm) not over {inner} ({i.Thickness * 100f:0.0} cm) (G2)");
            }
            Assert.That(n, Is.GreaterThan(0), "no layer sets");
            Assert.That(wrong, Is.Empty, string.Join("; ", wrong.Take(40)));
#else
            Assert.Ignore("editor only");
#endif
        }

        /// <summary>Every captured clip imported as its sidecar says (docs/PEOPLE_MOTION.md W1): a walk, an idle or a jog that
        /// does not loop plays one cycle and then holds its last frame, and the body is dragged along on it.</summary>
        [Test]
        public void TheCapturedClipsLoopAsTheirSidecarsSay()
        {
#if UNITY_EDITOR
            var wrong = new List<string>();
            var n = 0;
            foreach (var json in Directory.GetFiles(Path.Combine(Application.dataPath, "SecondFace", "Motion"), "*.json"))
            {
                var side = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(json));
                var loop = side.Value<bool?>("loop") ?? false;
                var path = "Assets/SecondFace/Motion/" + Path.GetFileNameWithoutExtension(json) + ".fbx";
                foreach (var clip in AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview")))
                {
                    n++;
                    if (clip.isLooping != loop) wrong.Add($"{Path.GetFileName(path)}: loops {clip.isLooping}, its sidecar says {loop}");
                    // and is the whole take its sidecar describes (not a stale cut of an older export)
                    var frames = side.Value<int?>("frames"); var fps = side.Value<float?>("fps") ?? 30f;
                    if (frames is { } f && f > 1 && Mathf.Abs(clip.length - (f - 1) / fps) > 1.5f / fps && Mathf.Abs(clip.length - f / fps) > 1.5f / fps)
                        wrong.Add($"{Path.GetFileName(path)}: {clip.length:0.00} s long, its sidecar says {f} frames ({f / fps:0.00} s)");
                    // and plays in its capture's own time: sampled at the sidecar's rate, from a source whose frame rate is
                    // recorded (a source read at twice its rate played `idle` and `stretch` at double speed, T6, 2026-11-17)
                    if (Mathf.Abs(clip.frameRate - fps) > 0.5f) wrong.Add($"{Path.GetFileName(path)}: sampled at {clip.frameRate} fps, its sidecar says {fps}");
                    if ((side.Value<float?>("src_fps") ?? 0f) <= 0f) wrong.Add($"{Path.GetFileName(path)}: its source's frame rate is not recorded (src_fps)");
                }
                // the pace's table of the moving clips (Pace.Clips) as the sidecars have them
                var name = Path.GetFileNameWithoutExtension(json);
                foreach (var c in Pace.Clips.Where(c => c.Name == name))
                    if (Mathf.Abs(c.Speed - (side.Value<float?>("speed") ?? 0f)) > 0.002f || Mathf.Abs(c.Hip - (side.Value<float?>("hip") ?? 0f)) > 0.002f)
                        wrong.Add($"Pace.Clips {name}: {c.Speed} m/s, hip {c.Hip} m; its sidecar says {side.Value<float?>("speed")} m/s, hip {side.Value<float?>("hip")} m");
            }
            Assert.That(n, Is.GreaterThan(0), "no captured clips found");
            Assert.That(wrong, Is.Empty, string.Join("; ", wrong));
#else
            Assert.Ignore("editor only");
#endif
        }

        [UnityTest, Timeout(3600000)]
        public IEnumerator PeopleStandAndMoveLikePeople() => Fixed(Gate(Quick, "motion_gate", captures: true));

        /// <summary>The gate over the people named in GATE_PEOPLE (a comma list), for a look at a few of the whole cast's
        /// failures without its 35 minutes: written as test-results/motion_gate_pick.*, never a verdict (only the quick set's
        /// and the whole cast's are, docs/PEOPLE_MOTION.md §1.9).</summary>
        [UnityTest, Timeout(3600000)]
        public IEnumerator PickedPeopleStandAndMove()
        {
            var ids = (System.Environment.GetEnvironmentVariable("GATE_PEOPLE") ?? "").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
            if (ids.Length == 0) { Assert.Ignore("no GATE_PEOPLE"); yield break; }
            // (GATE_SHOTS=1: with the captures, every one picked, for a look at them as the gate measured them)
            yield return Fixed(Gate(ids, "motion_gate_pick", captures: System.Environment.GetEnvironmentVariable("GATE_SHOTS") == "1"));
        }

        /// <summary>The gate's frames each a fixed 1/60 s of game time (a phone's frame), whatever the machine running it
        /// takes to draw them: the same code measures the same, run after run (the test machine's frames ran 4-131 ms and
        /// the same code's verdicts differed by 3-6 failures a measure, so "no measure worse" compared noise,
        /// docs/PEOPLE_MOTION.md §1.9, 2026-11-06).</summary>
        private static IEnumerator Fixed(IEnumerator inner)
        {
            var keep = Time.captureDeltaTime;
            Time.captureDeltaTime = 1f / 60f;
            // (two fixed frames before anything is made: the step takes effect from the next frame, and people made in the
            // frame still timed by the editor's clock started from another pose, the first 18 s of two runs of the same code
            // apart, 2026-11-07)
            yield return null; yield return null;
            try { while (inner.MoveNext()) yield return inner.Current; }
            finally { Time.captureDeltaTime = keep; }
        }

        // (4 h: with the skin's points filled in, the whole cast ran past 2 h and the test was stopped in its last batch,
        // 2026-11-08)
        [UnityTest, Timeout(14400000), Category("Heavy")]
        public IEnumerator EveryPersonStandsAndMovesLikePeople() => Fixed(EveryPerson());

        private IEnumerator EveryPerson()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var ids = cat != null ? cat.People.Where(e => e != null && e.Prefab != null).Select(e => e.Id).OrderBy(s => s).ToArray() : new string[0];
#else
            var ids = new string[0];
#endif
            // resumable by chunk (the container restarts every 2-3 hours, and a 90-minute run had to finish in one go,
            // 2026-11-18): each chunk of ten writes its result stamped with the gate inputs' hash of the tree it measured; a
            // run skips every chunk already measured under the tree's hash and measures the rest; the verdict is written only
            // when every chunk is there under that one hash (Chunks.Assemble)
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            var batches = Enumerable.Range(0, (ids.Length + 9) / 10).Select(k => ids.Skip(k * 10).Take(10).ToArray()).ToArray();
            string Hash() => InputsHash("people") + "|" + InputsHash("measures");
            string ChunkPath(int k) => Path.Combine(dir, $"motion_gate_full_{k}.chunk.json");
            var hash = Hash();
            var plan = Chunks.Assemble(batches, Enumerable.Range(0, batches.Length).Select(k => Chunks.Load(ChunkPath(k))).ToArray(), hash);
            Debug.Log($"HumanMotionGate whole cast: {batches.Length} chunks, {batches.Length - plan.ToRun.Count} already measured under this tree's hash, {plan.ToRun.Count} to run");
            foreach (var k in plan.ToRun)
            {
                var failed = new List<string>();
                var measured = new int[1];
                BuildCm.Clear(); BuildTop.Clear();
                yield return Gate(batches[k], $"motion_gate_full_{k}", captures: false, failures: failed, assert: false, measured: measured);
                // (stamped with the hash at its end: a tree changed under a chunk is not this chunk's tree)
                var after = Hash();
                Chunks.Save(ChunkPath(k), new Chunks.Result
                {
                    Hash = after == hash ? hash : after, Ids = batches[k], Measured = measured[0], Failures = failed,
                    Build = BuildCm.Where(kv => kv.Value > 0f).ToDictionary(kv => kv.Key, kv => kv.Value),
                    Top = BuildTop.ToDictionary(kv => kv.Key, kv => kv.Value),
                });
            }
            // one verdict for the whole cast, only when every chunk is there under the tree's hash (the lock counts the gate
            // green only on it: docs/PEOPLE_MOTION.md §1.9; a run stopped in its last batch once wrote 70 of 79 as the cast's)
            hash = Hash();
            var whole = Chunks.Assemble(batches, Enumerable.Range(0, batches.Length).Select(k => Chunks.Load(ChunkPath(k))).ToArray(), hash);
            Assert.That(whole.Complete, Is.True, $"the whole cast is not complete under one hash: chunks {string.Join(", ", whole.ToRun)} to run again");
            BuildCm.Clear(); BuildTop.Clear();
            foreach (var r in whole.Results) { foreach (var kv in r.Build) BuildCm[kv.Key] = kv.Value; foreach (var kv in r.Top) BuildTop[kv.Key] = kv.Value; }
            Verdict("motion_gate_full", whole.Measured, whole.Failures, whole.People, ids.Length);
            Assert.That(whole.Failures, Is.Empty, $"{whole.Failures.Count} measures past their limits:\n" + string.Join("\n", whole.Failures.Take(80)));
        }

        /// <summary>The whole cast's chunks: each chunk's result with the gate inputs' hash it was measured under, and the
        /// assembly of a verdict from them (pure: <see cref="ChunksAssembleOnlyUnderOneHash"/>).</summary>
        public static class Chunks
        {
            public sealed class Result
            {
                public string Hash;
                public string[] Ids = new string[0];
                public int Measured;
                public List<string> Failures = new();
                public Dictionary<string, float> Build = new();
                public Dictionary<string, string> Top = new();
            }

            public sealed class Plan
            {
                public bool Complete;
                public List<int> ToRun = new();
                public List<Result> Results = new();
                public List<string> Failures = new();
                public int Measured, People;
            }

            public static Result Load(string path)
            {
                try { return File.Exists(path) ? JsonConvert.DeserializeObject<Result>(File.ReadAllText(path)) : null; }
                catch (System.Exception) { return null; }
            }

            public static void Save(string path, Result r) => File.WriteAllText(path, JsonConvert.SerializeObject(r, Formatting.Indented));

            /// <summary>Which chunks stand (measured under <paramref name="hash"/>, of the same people) and which are to run
            /// (missing, of another tree, or of other people); complete only when none is to run.</summary>
            public static Plan Assemble(string[][] batches, Result[] found, string hash)
            {
                var plan = new Plan();
                for (var k = 0; k < batches.Length; k++)
                {
                    var r = k < found.Length ? found[k] : null;
                    if (r == null || r.Hash != hash || r.Ids == null || !r.Ids.SequenceEqual(batches[k])) { plan.ToRun.Add(k); continue; }
                    plan.Results.Add(r);
                    plan.Failures.AddRange(r.Failures ?? new List<string>());
                    plan.Measured += r.Measured;
                    plan.People += r.Ids.Length;
                }
                plan.Complete = plan.ToRun.Count == 0;
                return plan;
            }
        }

        [Test]
        public void ChunksAssembleOnlyUnderOneHash()
        {
            var batches = new[] { new[] { "a", "b" }, new[] { "c" } };
            Chunks.Result R(string hash, string[] ids, params string[] fails) => new() { Hash = hash, Ids = ids, Measured = 10 * ids.Length, Failures = fails.ToList() };
            // every chunk under the tree's hash: the verdict, every chunk's failures
            var all = Chunks.Assemble(batches, new[] { R("h", batches[0], "a x A1: p98"), R("h", batches[1], "c y W3: p98") }, "h");
            Assert.That(all.Complete, Is.True);
            Assert.That(all.Failures, Is.EqualTo(new[] { "a x A1: p98", "c y W3: p98" }));
            Assert.That(all.Measured, Is.EqualTo(30)); Assert.That(all.People, Is.EqualTo(3));
            // a chunk missing: no verdict, that chunk to run
            var missing = Chunks.Assemble(batches, new[] { R("h", batches[0]), null }, "h");
            Assert.That(missing.Complete, Is.False); Assert.That(missing.ToRun, Is.EqualTo(new[] { 1 }));
            // a chunk of another tree: run again (mixed hashes never make a verdict)
            var mixed = Chunks.Assemble(batches, new[] { R("old", batches[0]), R("h", batches[1]) }, "h");
            Assert.That(mixed.Complete, Is.False); Assert.That(mixed.ToRun, Is.EqualTo(new[] { 0 }));
            // a chunk of other people (the catalogue changed): run again
            var other = Chunks.Assemble(batches, new[] { R("h", new[] { "a", "z" }), R("h", batches[1]) }, "h");
            Assert.That(other.ToRun, Is.EqualTo(new[] { 0 }));
            // fewer files than chunks
            Assert.That(Chunks.Assemble(batches, new[] { R("h", batches[0]) }, "h").ToRun, Is.EqualTo(new[] { 1 }));
        }

        private sealed class Subject
        {
            public string Id;
            public GameObject Go;
            public Animator A;
            public Ambient Ambient;
            public Gaze Gaze;
            public MotionProbe Probe;
            public Transform Mark;      // a partner's head where the looking states put it
            public GameObject Partner;  // the one they talk with
            public Vector3 Home;
        }

        private sealed class Runner : MonoBehaviour { }

        /// <summary>Waits this long, in frames when the gate's frames are fixed (docs/PEOPLE_MOTION.md §1.9): a wait by
        /// Time.time compared floats whose size depends on how long the editor took to start, so the same wait ended a frame
        /// sooner or later from run to run, every state after it began on another frame and the same code's verdicts differed
        /// (1073 and 1085, 174 lines, 2026-11-07).</summary>
        private static IEnumerator Wait(float seconds)
        {
            if (Time.captureDeltaTime > 0f) { for (int n = Frames(seconds), i = 0; i < n; i++) yield return null; yield break; }
            var t = Time.time; while (Time.time - t < seconds) yield return null;
        }

        private static int Frames(float seconds) => Time.captureDeltaTime > 0f ? Mathf.Max(1, Mathf.RoundToInt(seconds / Time.captureDeltaTime)) : int.MaxValue;

        private IEnumerator Gate(string[] ids, string report, bool captures, List<string> failures = null, bool assert = true, int[] measured = null)
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            if (cat == null || cat.People.Length == 0 || assets == null || assets.Locomotion == null) { Assert.Ignore("no Rocketbox catalogue or locomotion built"); yield break; }
            yield return BootTests.Clear();
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) { c.enabled = false; c.tag = "Untagged"; }
            var root = new GameObject("motion gate");
            var runner = root.AddComponent<Runner>();
            // the ground: flat, and a 10° slope beyond it
            var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flat.name = "flat"; flat.transform.SetParent(root.transform);
            flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
            var slope = GameObject.CreatePrimitive(PrimitiveType.Cube);
            slope.name = "slope"; slope.transform.SetParent(root.transform);
            slope.transform.localScale = new Vector3(200f, 1f, 30f);
            slope.transform.rotation = Quaternion.Euler(-10f, 0f, 0f);
            slope.transform.position = new Vector3(0f, 0f, 70f) - slope.transform.rotation * new Vector3(0f, 0.5f, 0f);
            var groundMat = flat.GetComponent<Renderer>().sharedMaterial;
            if (groundMat != null) groundMat.color = new Color(0.58f, 0.55f, 0.5f);
            var grounds = new Collider[] { flat.GetComponent<Collider>(), slope.GetComponent<Collider>() };
            var sun = new GameObject("sun").AddComponent<Light>();
            sun.transform.SetParent(root.transform);
            sun.type = LightType.Directional; sun.intensity = 1.6f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(45f, 150f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.55f, 0.56f, 0.6f);

            // the people, as the game makes them
            var people = new List<Subject>();
            for (var i = 0; i < ids.Length; i++)
            {
                var prefab = cat.Get(ids[i]);
                if (prefab == null) continue;
                var home = new Vector3((i - (ids.Length - 1) * 0.5f) * Lane, 0f, 0f);
                var go = Object.Instantiate(prefab, home, Quaternion.identity, root.transform);
                go.name = "gate_" + ids[i];
                var p = RbPeople.Of(ids[i]);
                RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + ids[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                Assert.That(a, Is.Not.Null, ids[i] + "'s animator");
                var asPlayer = ids.Length > 1 && i == ids.Length - 1 && report == "motion_gate";
                Ambient amb = null;
                if (asPlayer) Walker.Animate(a, assets.Locomotion, p?.Male ?? true);
                else amb = PeopleService.Animate(a, assets.Locomotion, ids[i], p?.Male ?? true);
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;   // measured every frame, seen or not
                if (amb != null) { amb.MinGap = amb.MaxGap = 1e6f; }   // the gestures are played by the gate, each in turn
                var probe = a.gameObject.AddComponent<MotionProbe>();
                probe.Person = ids[i] + (asPlayer ? " (player)" : "");
                probe.Ground = grounds;
                // the first person, and the first man (their strides differ: one woman's trace hid the men's skate), traced
                var traced = i == 0 || (ids[i].Contains("Male") && !ids.Take(i).Any(x => x.Contains("Male")));
                // (and anyone named in GATE_TRACE, for a look at their frames: "_" and their name in the trace's file name)
                var also = System.Environment.GetEnvironmentVariable("GATE_TRACE");
                var named = !traced && !string.IsNullOrEmpty(also) && also.Split(',').Contains(ids[i]);
                if (traced || named)
                {
                    probe.TracePath = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", report + (named ? "_" + ids[i] : i == 0 ? "" : "_m") + "_trace.csv"));
                    Directory.CreateDirectory(Path.GetDirectoryName(probe.TracePath));   // (CI has no test-results folder yet: DirectoryNotFound, 2026-11-16)
                    File.Delete(probe.TracePath.Replace(".csv", "_soles.csv"));   // (it is appended to: each run afresh)
                    probe.TraceState = "";   // every state (the feet, frame by frame)
                    File.WriteAllText(probe.TracePath, "state,t,rootx,rootz,heelL,ballL,ankleLz,heelR,ballR,ankleRz,speed,hipsz,dipL,clearL,liftL,lockL,dipR,clearR,liftR,lockR,sink,low,eL,eR,gL,gR,slipL,slipR,rL,rR,a1L,a1R,poleL,poleR,flexL,flexR,adaptL,adaptR,surfL,surfR,hgapL,hgapR,dL0,dL1,dL2,dL3,dL4,dL5,dR0,dR1,dR2,dR3,dR4,dR5,holdtL,holdbL,holdyL,holdgL,holdtR,holdbR,holdyR,holdgR,a4L,a4R,flankL,flankR,outL,fwdL,outR,fwdR,saLclip,saL0,saL1,saL2,saL3,saL4,saL5,saRclip,saR0,saR1,saR2,saR3,saR4,saR5,flankHoldL,flankHoldR,kneeL,kneeR,valgusL,valgusR,sink,pushPartL,pushDegL,pushPartR,pushDegR,restPartL,restDepL,restBodyL,restYL,restDegL,restPartR,restDepR,restBodyR,restYR,restDegR,pushDepL,pushDepR\n");
                }
                Assert.That(probe.Calibrate(), Is.True, $"{ids[i]}: {probe.Error}");
                BuildCm[ids[i]] = Build(go, a, p?.Male ?? ids[i].Contains("Male"), ids[i]);
                var mark = new GameObject("mark_" + ids[i]).transform;
                mark.SetParent(root.transform);
                // (the player's body has no Ambient in the game: it neither idles by a hash nor gestures)
                people.Add(new Subject { Id = ids[i], Go = go, A = a, Ambient = amb, Gaze = a.GetComponent<Gaze>(), Probe = probe, Mark = mark, Home = home });
            }
            Assert.That(people.Count, Is.GreaterThan(0), "no people made");
            yield return Wait(1f);

            void Record(string state, MotionProbe.K? kind) { foreach (var s in people) { s.Probe.State = state; s.Probe.Kind = kind; } }
            void Stop() { foreach (var s in people) s.Probe.Kind = null; }
            void Place(Vector3 offset, float yaw)
            {
                foreach (var s in people)
                {
                    var at = s.Home + offset;
                    var ray = new Ray(at + Vector3.up * 5f, Vector3.down);
                    var y = 0f;
                    foreach (var g in grounds) if (g.Raycast(ray, out var hit, 20f)) y = Mathf.Max(y, hit.point.y);
                    s.Go.transform.SetPositionAndRotation(new Vector3(at.x, y, at.z), Quaternion.Euler(0f, yaw, 0f));
                }
            }

            // 0. the pace each gait plays at for this body at the game's speeds, and the cadence it gives (P1, P2)
            foreach (var s in people)
            {
                var hip = Pace.Hip(s.A); var set = Pace.ClipsOf(s.A);
                foreach (var (state, v) in new[] { ("pace:walk", Townsfolk.WalkSpeed), ("pace:walk", Walker.WalkSpeed), ("pace:jog", Walker.JogSpeed) })
                {
                    var (speed, rate) = Pace.For(v, hip, set, Pace.Female(s.A));
                    var gait = set.FirstOrDefault(c => Mathf.Abs(c.Speed - speed) < 1e-4f).Name;
                    var clip = gait == null ? null : s.A.runtimeAnimatorController.animationClips.FirstOrDefault(c => c.name == gait);
                    Add(s.Probe, state, "P1", rate);
                    // (each gait clip is one stride, two steps: the converters cut one)
                    if (clip != null && clip.length > 0f) Add(s.Probe, state, "P2", 2f * 60f * rate / clip.length);
                }
            }

            // 1. standing: each of their sex's idles on the flat (Ambient.IdlesOf)
            for (var idle = 0; idle < Ambient.IdleCount; idle++)
            {
                foreach (var s in people) s.A.SetFloat("Idle", Mathf.Min(idle, Ambient.IdlesOf(s.A) - 1));
                yield return Wait(1.2f);
                Record("idle" + idle, MotionProbe.K.Stand);
                foreach (var s in people) if (idle >= Ambient.IdlesOf(s.A)) s.Probe.Kind = null;
                yield return Wait(6f);
                Stop();
            }
            // (what the foot plant and the arm clearance did, for the report: a goal the foot did not reach, a body without
            // its torso measured)
            foreach (var s in people)
            {
                var fp = s.A.GetComponent<FootPlant>(); var ac = s.A.GetComponent<ArmClearance>();
                Debug.Log($"HumanMotionGate systems: {s.Probe.Person}: foot goals missed by {(fp != null ? fp.GoalError * 100f : Vector2.zero)} cm, sink {(fp != null ? fp.Sink * 100f : 0f):0.0} cm; arm clearance {(ac != null && ac.Ready ? (ac.SkinReady ? "ready on the skin" : "ready on the SECTIONS (no BodySkin)") : "NOT READY")}, depth {(ac != null ? ac.Depth() * 100f : 0f):0.0} cm, turned {(ac != null ? ac.Turned : Vector2.zero)}; cost {(ac != null && ac.CostFrames > 0 ? ac.CostMs / ac.CostFrames : 0):0.000} ms a frame, skin posed {(ac != null && ac.CostFrames > 0 && ac.Skin != null ? (float)ac.Skin.Poses / ac.CostFrames : 0):0.0}x a frame at {(ac != null && ac.Skin is { Poses: > 0 } sk2 ? sk2.PoseMs / sk2.Poses : 0):0.000} ms, {(ac != null && ac.Skin != null ? ac.Skin.Count : 0)} points, {(ac != null && ac.Skin != null && ac.CostFrames > 0 ? ac.Skin.DepthCalls / ac.CostFrames : 0)} depth asks a frame; stages {(ac != null && ac.CostFrames > 0 ? string.Join("/", ac.StageMs.Select(x => (x / ac.CostFrames).ToString("0.00"))) : "")} ms");
            }
            // 2. on the slope (facing up it), then back
            Place(new Vector3(0f, 0f, 70f), 0f);
            foreach (var s in people) s.A.SetFloat("Idle", 0f);
            yield return Wait(1.5f);
            Record("slope", MotionProbe.K.Stand);
            yield return Wait(5f);
            Stop();
            Place(Vector3.zero, 0f);
            yield return Wait(1.5f);
            // 3. looking at someone round them (the gaze alone)
            foreach (var angle in new[] { 0, 45, 90, 135 })
            {
                foreach (var s in people)
                {
                    s.Mark.position = s.Go.transform.position + Quaternion.Euler(0f, angle, 0f) * Vector3.forward * 1.3f + Vector3.up * 1.6f;
                    if (s.Gaze != null) s.Gaze.Target = s.Mark;
                }
                yield return Wait(1.2f);
                Record("look" + angle, MotionProbe.K.Stand);
                yield return Wait(3f);
                Stop();
            }
            foreach (var s in people) if (s.Gaze != null) s.Gaze.Target = null;
            yield return Wait(1f);
            // 4. each gesture, then the moments after it
            foreach (var g in Gestures)
            {
                foreach (var s in people) if (s.Ambient != null) s.Ambient.Gesture(g);
                Record("gesture:" + g, MotionProbe.K.Gesture);
                // (only those whose sex's captures hold it: a woman's stretch and yawns are not played by men)
                foreach (var s in people) if (!Ambient.Can(s.A, g)) s.Probe.Kind = null;
                yield return Wait(0.5f);
                for (int n = Frames(15f), f0 = 0; f0 < n && people.Any(s => Playing(s.A)); f0++) yield return null;
                Stop();
                yield return Wait(0.6f);
                Record("after:" + g, MotionProbe.K.Stand);
                foreach (var s in people) if (!Ambient.Can(s.A, g)) s.Probe.Kind = null;
                yield return Wait(2f);
                Stop();
            }
            // 5. the conversation turn: someone behind them speaks; they turn as the game turns them
            foreach (var s in people)
            {
                s.Mark.position = s.Go.transform.position - s.Go.transform.forward * 1.3f + Vector3.up * 1.6f;
                if (s.Gaze != null) s.Gaze.Target = s.Mark;
            }
            yield return Wait(0.5f);
            Record("turn", MotionProbe.K.Turn);
            foreach (var s in people) runner.StartCoroutine(Walkabout.Face(s.Go.transform, s.Mark.position));
            yield return Wait(1.1f);
            foreach (var s in people)
            {
                var to = s.Mark.position - s.Probe.HeadPosition; to.y = 0f;
                Add(s.Probe, "turn", "T1", Vector3.Angle(s.Probe.ChestForward(), to.normalized));
            }
            Stop();
            foreach (var s in people) if (s.Gaze != null) s.Gaze.Target = null;
            // 6. walking, jogging, sneaking: straight from a standstill to a stop, and round a 3 m bend
            Camera walkCam = null;
            foreach (var (name, v, sneak, accel) in new[] { ("sneak", 0.85f, true, 6f), ("walk", Townsfolk.WalkSpeed, false, 6f), ("walk_player", Walker.WalkSpeed, false, Walker.Acceleration), ("jog", Walker.JogSpeed, false, Walker.Acceleration) })
            {
                Place(new Vector3(0f, 0f, -30f), 0f);
                foreach (var s in people) { s.A.SetBool("Sneak", sneak); s.A.SetFloat("Speed", 0f); }
                yield return Wait(1.2f);
                Record("walk:" + name, MotionProbe.K.Walk);
                // each at the game's pace for the state, whoever walks it (the same for both sexes)
                var vOf = people.Select(s => v).ToArray();
                var speedOf = new float[people.Count]; var travelledOf = new float[people.Count];
                var lengthOf = vOf.Select(x => Mathf.Min(45f, x * 7f)).ToArray();
                var frames = 0; var nextFrame = 0f;
                while (Enumerable.Range(0, people.Count).Any(i => travelledOf[i] < lengthOf[i]))
                {
                    var dt = Time.deltaTime;
                    for (var i = 0; i < people.Count; i++)
                    {
                        var s = people[i];
                        if (travelledOf[i] >= lengthOf[i]) continue;
                        var left = lengthOf[i] - travelledOf[i];
                        var stopping = speedOf[i] * speedOf[i] / (2f * accel);
                        speedOf[i] = left <= stopping ? Mathf.Max(0.05f, speedOf[i] - accel * dt) : Mathf.Min(vOf[i], speedOf[i] + accel * dt);
                        var step = Mathf.Min(left, speedOf[i] * dt);
                        travelledOf[i] += step;
                        s.Go.transform.position += Vector3.forward * step;
                        Pace.Set(s.A, speedOf[i], sneak, 0.12f, dt);   // as the game's walker sets it
                        if (travelledOf[i] >= lengthOf[i]) { s.A.SetFloat("Speed", 0f); s.Probe.Kind = null; }   // (each stops as the walk's end does)
                    }
                    var travelled = travelledOf[0]; var length = lengthOf[0];
                    if (captures && (name is "walk" or "jog") && travelled > length * 0.45f && travelled < length && frames < 10 && Time.time >= nextFrame)
                    {
                        nextFrame = Time.time + (name == "jog" ? 0.06f : 0.1f);
                        var s0 = people[0].Go.transform;
                        walkCam ??= new GameObject("walk camera") { tag = "MainCamera" }.AddComponent<Camera>();
                        walkCam.fieldOfView = 30f; walkCam.clearFlags = CameraClearFlags.SolidColor; walkCam.backgroundColor = new Color(0.7f, 0.75f, 0.8f);
                        walkCam.transform.SetPositionAndRotation(s0.position + Vector3.up * 0.95f - Vector3.right * 4.2f + Vector3.forward * 0.2f, Quaternion.LookRotation(Vector3.right, Vector3.up));
                        var keep = Time.timeScale; Time.timeScale = 0f;   // the frame held while it is captured
                        yield return ScreenshotTests.Capture($"motion_{name}_{frames}", 700, 700);
                        Time.timeScale = keep;
                        frames++;
                        continue;
                    }
                    yield return null;
                }
                foreach (var s in people) s.A.SetFloat("Speed", 0f);
                Stop();
                if (walkCam != null) { Object.Destroy(walkCam.gameObject); walkCam = null; }
                yield return Wait(1f);
                if (name is "walk" or "jog")
                {
                    // round a bend of 3 m radius, at speed (each at their own, as on the straight)
                    Place(new Vector3(0f, 0f, -10f), -90f);
                    var centres = people.Select(s => s.Go.transform.position + Vector3.forward * 3f).ToList();
                    var thetaOf = new float[people.Count];
                    for (var i = 0; i < people.Count; i++) Pace.Set(people[i].A, vOf[i], false, 0f);
                    yield return Wait(0.8f);
                    Record("bend:" + name, MotionProbe.K.Walk);
                    for (int n1 = Frames(6f), f1 = 0; f1 < n1; f1++)
                    {
                        var dt = Time.deltaTime;
                        for (var i = 0; i < people.Count; i++)
                        {
                            var s = people[i];
                            thetaOf[i] += vOf[i] / 3f * dt;
                            var theta = thetaOf[i];
                            var pos = centres[i] + new Vector3(-Mathf.Sin(theta), 0f, -Mathf.Cos(theta)) * 3f;
                            var tangent = new Vector3(-Mathf.Cos(theta), 0f, Mathf.Sin(theta));
                            s.Go.transform.SetPositionAndRotation(pos, Quaternion.LookRotation(tangent, Vector3.up));
                            Pace.Set(s.A, vOf[i], false, 0.12f, dt);
                        }
                        yield return null;
                    }
                    Stop();
                    foreach (var s in people) s.A.SetFloat("Speed", 0f);
                    yield return Wait(1f);
                }
                foreach (var s in people) s.A.SetBool("Sneak", false);
            }
            // 7. two people talking, as the game sets them: the other turned to face, both looking at each other's head, the
            // opening gesture, then the talk
            Place(Vector3.zero, 0f);
            yield return Wait(1f);
            var partnerId = cat.Get("Male_Adult_01") != null ? "Male_Adult_01" : people[0].Id;
            foreach (var s in people)
            {
                var pp = Object.Instantiate(cat.Get(partnerId), s.Go.transform.position + Vector3.forward * 1.3f + Vector3.right * 0.25f, Quaternion.Euler(0f, 180f, 0f), root.transform);
                var pa = pp.GetComponentInChildren<Animator>();
                var pam = PeopleService.Animate(pa, assets.Locomotion, "partner_" + s.Id, RbPeople.Of(partnerId)?.Male ?? true);
                pam.MinGap = pam.MaxGap = 1e6f;
                pa.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                s.Partner = pp;
            }
            yield return Wait(0.3f);
            foreach (var s in people) runner.StartCoroutine(Walkabout.Face(s.Go.transform, s.Partner.transform.position));
            yield return Wait(0.8f);
            foreach (var s in people)
            {
                var ph = s.Partner.GetComponentInChildren<Animator>().GetBoneTransform(HumanBodyBones.Head);
                if (s.Gaze != null) s.Gaze.Target = ph;
                var pg = s.Partner.GetComponentInChildren<Gaze>();
                if (pg != null) pg.Target = s.A.GetBoneTransform(HumanBodyBones.Head);
                if (s.Ambient != null) s.Ambient.Gesture("talk");
            }
            Record("gesture:talk (conversation)", MotionProbe.K.Gesture);
            yield return Wait(0.5f);
            for (int n2 = Frames(15f), f2 = 0; f2 < n2 && people.Any(s => Playing(s.A)); f2++) yield return null;
            Stop();
            yield return Wait(0.6f);
            Record("talk", MotionProbe.K.Stand);
            yield return Wait(4f);
            foreach (var s in people)
            {
                var to = s.Partner.transform.position - s.Go.transform.position; to.y = 0f;
                Add(s.Probe, "talk", "T2", Vector3.Angle(s.Probe.ChestForward(), to.normalized));
                Add(s.Probe, "talk", "T3", to.magnitude);
            }
            Stop();

            // 8. fighting (§2.7)
            if (assets.Combat != null && people.Count > 0 && Fighter.HasLayers(people[0].A))
                yield return Fighting(people, root, runner, assets.Combat, captures, (st, k) => Record(st, k), Stop, Place);
            else Debug.LogWarning("HumanMotionGate: the fight's motion is not built: its states are not measured (Second Face/Build the fight's motion and weapons)");

            // the captures: the game camera (default and closest zoom), the conversation view, human height
            if (captures)
            {
                var cam = new GameObject("gate camera") { tag = "MainCamera" }.AddComponent<Camera>();
                cam.transform.SetParent(root.transform);
                cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.7f, 0.75f, 0.8f);
                cam.nearClipPlane = 0.2f; cam.farClipPlane = 500f;
                // the conversation view, as the game frames it
                {
                    var a0 = people[0];
                    var shots = ConversationCamera.Begin(cam, a0.Go.transform, a0.Partner.transform, 0f);
                    yield return Wait(0.3f);
                    yield return ScreenshotTests.Capture("motion_conversation", 1600, 720);
                    shots.End();
                    yield return Wait(0.3f);
                    foreach (var b in cam.GetComponents<Behaviour>()) if (b.GetType().Name == "CinemachineBrain") Object.Destroy(b);
                    yield return null;
                }
                foreach (var s in people) { Object.Destroy(s.Partner); if (s.Gaze != null) s.Gaze.Target = null; }
                yield return Wait(1f);
                foreach (var k in report == "motion_gate_pick" ? Enumerable.Range(0, people.Count).ToArray() : new[] { 0, people.Count / 2, people.Count - 1 })
                {
                    var s = people[k];
                    var focus = s.Go.transform.position + Vector3.up * 1.3f;
                    foreach (var (dist, label) in new[] { (OrbitRig.MinDistance, "8m"), (20f, "20m") })
                    {
                        cam.fieldOfView = 28f;
                        var rot = Quaternion.Euler(50f, 210f, 0f);
                        cam.transform.SetPositionAndRotation(focus - rot * Vector3.forward * dist, rot);
                        yield return ScreenshotTests.Capture($"motion_game_{label}_{s.Id}", 1600, 900);
                    }
                    cam.fieldOfView = 30f;
                    var side = Quaternion.LookRotation(-s.Go.transform.right, Vector3.up);
                    cam.transform.SetPositionAndRotation(s.Go.transform.position + Vector3.up * 0.95f + s.Go.transform.right * 4.2f, side);
                    yield return ScreenshotTests.Capture($"motion_side_{s.Id}", 1000, 1000);
                    var front = Quaternion.LookRotation(-s.Go.transform.forward, Vector3.up);
                    cam.transform.SetPositionAndRotation(s.Go.transform.position + Vector3.up * 0.95f + s.Go.transform.forward * 4.2f, front);
                    yield return ScreenshotTests.Capture($"motion_front_{s.Id}", 1000, 1000);
                }
                Object.Destroy(cam.gameObject);
            }

            // the verdict
            var fails = failures ?? new List<string>();
            var table = new List<Dictionary<string, object>>();
            foreach (var s in people)
            {
                if (s.Probe.Error != null) fails.Add($"{s.Probe.Person}: {s.Probe.Error}");
                foreach (var (st, (d, where)) in s.Probe.WorstClip) Debug.Log($"HumanMotionGate clip: {s.Probe.Person} {st}: {where}");
                foreach (var (st, (d, where)) in s.Probe.WorstHand) Debug.Log($"HumanMotionGate hand off: {s.Probe.Person} {st}: {where}");
                if (s.Probe.SkinFit != null) Debug.Log($"HumanMotionGate skin fit: {s.Probe.Person}: {s.Probe.SkinFit}; {s.Probe.SkinWhy}");
                foreach (var (st, where) in s.Probe.ArmWhere) Debug.Log($"HumanMotionGate arm contact: {s.Probe.Person} {st}: {where}");
                foreach (var (st, pk) in s.Probe.SwingPeak) Debug.Log($"HumanMotionGate swing peak: {s.Probe.Person} {st}: {pk.Arm} {pk.A:0.0}° (forward {pk.Sag:0.0}, out {pk.Side:0.0})");
                foreach (var (st, (nn, rest, sum)) in s.Probe.ArmDiag)
                {
                    if (nn == 0) continue;
                    string M(int q, float scale = 1f) => (sum[q] / nn * scale).ToString("0.0");
                    Debug.Log($"HumanMotionGate arms: {s.Probe.Person} {st}: resting {rest * 100 / nn}%, L gapE {M(0, 100)} gapH {M(1, 100)} cm in {M(4)} fwd {M(5)} carry {M(6)} out {M(7)} roll {M(12)} back {M(14)}; R gapE {M(2, 100)} gapH {M(3, 100)} cm in {M(10)} fwd {M(11)} carry {M(8)} out {M(9)} roll {M(13)} back {M(15)}");
                }
                BuildCm.TryGetValue(s.Id, out var buildE);
                foreach (var (state, measures) in s.Probe.Samples)
                    foreach (var lim0 in LimitsFor(state))
                    {
                        // (standing, a man's A1 by his build: A1PerCm)
                        var lim = lim0;
                        if (lim0.M == "A1" && buildE > 0f && LimitsFor(state).Contains(StandA1))
                            lim = new Lim { M = lim0.M, Lo = lim0.Lo, Hi = lim0.Hi + A1PerCm * buildE, CapLo = lim0.CapLo, CapHi = lim0.CapHi, MeanMax = lim0.MeanMax, Over = lim0.Over, OverFrac = lim0.OverFrac };
                        if (!measures.TryGetValue(lim.M, out var vals) || vals.Count == 0) continue;
                        var sorted = vals.OrderBy(x => x).ToList();
                        float P(double q) => sorted[Mathf.Clamp((int)System.Math.Round(q * (sorted.Count - 1)), 0, sorted.Count - 1)];
                        var p2 = P(0.02); var p50 = P(0.5); var p98 = P(0.98); var min = sorted[0]; var max = sorted[^1];
                        var mean = vals.Average();
                        var over = float.IsInfinity(lim.Over) ? 0f : vals.Count(x => x > lim.Over) / (float)vals.Count;
                        var why = new List<string>();
                        if (p98 > lim.Hi) why.Add($"p98 {p98:0.0} > {lim.Hi:0.0}");
                        if (p2 < lim.Lo) why.Add($"p2 {p2:0.0} < {lim.Lo:0.0}");
                        if (max > lim.CapHi) why.Add($"max {max:0.0} > cap {lim.CapHi:0.0}");
                        if (min < lim.CapLo) why.Add($"min {min:0.0} < cap {lim.CapLo:0.0}");
                        if (mean > lim.MeanMax) why.Add($"mean {mean:0.00} > {lim.MeanMax:0.00}");
                        if (over > lim.OverFrac) why.Add($"{over:P0} of frames over {lim.Over:0}");
                        table.Add(new Dictionary<string, object>
                        {
                            ["person"] = s.Probe.Person, ["state"] = state, ["measure"] = lim.M, ["n"] = vals.Count, ["p2"] = p2, ["p50"] = p50,
                            ["p98"] = p98, ["min"] = min, ["max"] = max, ["mean"] = mean, ["over"] = over, ["pass"] = why.Count == 0, ["why"] = string.Join("; ", why),
                        });
                        if (why.Count > 0) fails.Add($"{s.Probe.Person} {state} {lim.M}: {string.Join("; ", why)}");
                    }
            }
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, report + ".json"), JsonConvert.SerializeObject(table, Formatting.Indented));
            File.WriteAllText(Path.Combine(dir, report + ".md"), Markdown(table));
            Debug.Log($"HumanMotionGate {report}: {table.Count} measures, {table.Count(r => !(bool)r["pass"])} past their limits\n" + string.Join("\n", fails.Take(200)));
            if (measured != null) measured[0] += table.Count;
            if (report == "motion_gate") Verdict(report, table.Count, fails, ids.Length, ids.Length);
            Object.Destroy(root);
            yield return null;
            if (assert) Assert.That(fails, Is.Empty, $"{fails.Count} measures past their limits (docs/PEOPLE_MOTION.md):\n" + string.Join("\n", fails.Take(80)));
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }

        /// <summary>
        /// 8. Fighting (docs/PEOPLE_MOTION.md §2.7): each person in a fight's view as the game makes one
        /// (<see cref="CombatViews.ForBody"/>: the fighter on their animator, the weapon from their pack, every runtime system
        /// on), through every state the fight shows, each weapon in turn: its ready stance; a long gun's and a pistol's aim, a
        /// shot and a burst, the reload; blows by weapon and sex and a block; down into cover and the crouch held; a throw; a
        /// crit's stagger; the long gun carried over a walk; hands up; a fall and the captured get-up. The probe measures every
        /// frame as it does the walks; the more bent knee (Kb) and the weapon's grips (WG1, WG2) are measured here.
        /// </summary>
        private static IEnumerator Fighting(List<Subject> people, GameObject root, Runner runner, CombatSet set, bool captures,
            System.Action<string, MotionProbe.K?> record, System.Action stop, System.Action<Vector3, float> place)
        {
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            foreach (var s in people) { if (s.Partner != null) Object.Destroy(s.Partner); if (s.Gaze != null) s.Gaze.Target = null; }
            place(Vector3.zero, 0f);
            yield return Wait(1f);
            var fx = new CombatFx(root.transform);
            var ahead = Vector3.forward * 8f;
            var views = new List<AnimatedUnitView>();
            Camera cam = null;
            if (captures)
            {
                cam = new GameObject("fight camera") { tag = "MainCamera" }.AddComponent<Camera>();
                cam.transform.SetParent(root.transform);
                cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.7f, 0.75f, 0.8f); cam.fieldOfView = 28f;
                cam.enabled = false;
            }

            // (each person's records under the set of the state they play, so its limits are that state's: combat set v4's
            // two-handed blows are `strike2`, its slips and ducks `dodge`, a woman's miss a duck where a man's may be a block;
            // `per` names a person's state, else everyone's is `state`)
            IEnumerator Measure(string state, float hold, System.Func<AnimatedUnitView, IEnumerator> act, MotionProbe.K kind = MotionProbe.K.Stand, System.Func<int, string> per = null)
            {
                record(state, kind);
                if (per != null) for (var k = 0; k < people.Count; k++) people[k].Probe.State = per(k);
                var running = 0;
                if (act != null)
                    foreach (var v in views)
                    {
                        if (v == null) continue;
                        running++;
                        runner.StartCoroutine(Counted(act(v), () => running--));
                    }
                for (int n = Frames(hold), cap = Frames(25f), i = 0; (i < n || running > 0) && i < cap; i++)
                {
                    yield return null;
                    for (var k = 0; k < people.Count && k < views.Count; k++) Grips(people[k], views[k], per != null ? per(k) : state);
                }
                stop();
            }
            // the set a person's state is measured under: the gate of the state the table plays for them
            string SetOf(int k, string state, string otherwise) => CombatMotion.State(state)?.Gate ?? otherwise;

            IEnumerator Shoot(AnimatedUnitView v, int rounds) { for (var i = 0; i < rounds; i++) yield return v.OnFire(v.Body.position + ahead + Vector3.up * 1.1f, true, i, rounds); }
            IEnumerator Blows(AnimatedUnitView v, int n) { for (var i = 0; i < n; i++) { yield return v.OnStrike(v.Body.position + ahead * 0.12f, true); yield return Wait(0.9f); } }
            IEnumerator Then(System.Action a, float s) { a(); yield return Wait(s); }
            IEnumerator Throw(AnimatedUnitView v)
            {
                var arc = new List<Vector3>();
                PlaceholderUnitView.ArcPoints(v.Body.position + Vector3.up * 1.5f, v.Body.position + ahead, arc);
                yield return v.OnThrow(arc, "w_frag");
                yield return Wait(0.8f);
            }
            IEnumerator Rise(AnimatedUnitView v)
            {
                v.OnRise();
                yield return null;
                for (var t = 0f; t < 20f && v.Rising; t += Time.deltaTime) yield return null;
            }
            IEnumerator Shot(string name, int k)
            {
                if (cam == null) yield break;
                var s = people[k];
                var focus = s.Go.transform.position + Vector3.up * 1.2f;
                cam.enabled = true;
                foreach (var (dist, label) in new[] { (OrbitRig.MinDistance, "8m"), (20f, "20m") })
                {
                    var rot = Quaternion.Euler(50f, 210f, 0f);
                    cam.transform.SetPositionAndRotation(focus - rot * Vector3.forward * dist, rot);
                    yield return ScreenshotTests.Capture($"motion_fight_{name}_{label}_{s.Id}", 1600, 900);
                }
                cam.enabled = false;
            }

            foreach (var (item, arms) in new[] { ("w_carbine556", "rifle"), ("w_pistol9", "pistol"), ("w_machete", "melee"), ((string)null, "unarmed"), ("w_sledge", "club2") })
            {
                views.Clear();
                foreach (var s in people) views.Add(CombatViews.ForBody(GateUnit(s.Id, item), s.Go.transform, runner, fx, set, Female(s.Id), theirs: false));
                yield return Wait(1.2f);
                yield return Measure($"combat:{(arms is "unarmed" or "melee" ? "guard" : "ready")}:{arms}", 3f, null);
                if (arms is "unarmed" or "rifle") yield return Shot("ready_" + arms, 0);
                if (arms is "rifle" or "pistol")
                {
                    var aim = arms == "rifle" ? "aim" : "aim_pistol";
                    // the aim held as the game holds it (a held shot: overwatch), then turned onto a target and fired
                    foreach (var v in views) if (v != null) { v.Unit.Watch = new Watch(); v.OnHold(Watch.Overwatch); runner.StartCoroutine(v.OnAim(v.Body.position + ahead)); }
                    yield return Wait(1.6f);
                    yield return Measure($"combat:{aim}:{arms}", 2.5f, null);
                    yield return Shot("aim_" + arms, 0);
                    yield return Measure($"combat:{aim}:{arms}_shot", 0f, v => Shoot(v, 1));
                    yield return Measure($"combat:{aim}:{arms}_burst", 0f, v => Shoot(v, 3));
                    foreach (var v in views) if (v != null) v.Unit.Watch = null;
                    yield return Wait(2f);
                    yield return Measure($"combat:reload:{arms}", 0f, v => v.OnReload());
                    if (arms == "rifle")
                    {
                        // carried over a walk (the gate drives the body as the game's walker does; the fighter carries)
                        place(new Vector3(0f, 0f, -30f), 0f);
                        foreach (var v in views) v?.Fighter.Locomote(true, false);
                        yield return Wait(0.5f);
                        record("combat:carry:rifle", MotionProbe.K.Walk);
                        float speed = 0f, travelled = 0f; const float length = 9f;
                        while (travelled < length)
                        {
                            var dt = Time.deltaTime;
                            var left = length - travelled;
                            speed = left <= speed * speed / (2f * Walker.Acceleration) ? Mathf.Max(0.05f, speed - Walker.Acceleration * dt) : Mathf.Min(Walker.WalkSpeed, speed + Walker.Acceleration * dt);
                            var step = Mathf.Min(left, speed * dt);
                            travelled += step;
                            foreach (var s in people) { s.Go.transform.position += Vector3.forward * step; Pace.Set(s.A, speed, false, 0.12f, dt); }
                            yield return null;
                            for (var k = 0; k < people.Count; k++) Grips(people[k], views[k], "combat:carry:rifle");
                        }
                        foreach (var s in people) s.A.SetFloat("Speed", 0f);
                        stop();
                        foreach (var v in views) v?.Fighter.Locomote(false, false);
                        place(Vector3.zero, 0f);
                        yield return Wait(1.2f);
                        // down into cover, the crouch held, and up
                        yield return Measure("combat:crouch:rifle", 3.5f, v => Then(() => v.OnStance("crouch"), 0.1f));
                        yield return Shot("crouch_rifle", 0);
                        foreach (var v in views) v?.OnStance("stand");
                        yield return Wait(1.2f);
                        yield return Measure("combat:throw:rifle", 0f, Throw);
                        yield return Measure("combat:hit:rifle", 2.5f, v => Then(() => v.OnHit(v.Body.position + ahead, "torso", "crit"), 0.1f));
                    }
                }
                else
                {
                    var held = arms == "melee" ? Arms.Melee : arms == "club2" ? Arms.Club2 : Arms.Unarmed;
                    yield return Measure($"combat:strike:{arms}", 0f, v => Blows(v, 3),
                        per: k => $"combat:{SetOf(k, CombatMotion.Strike(held, Female(people[k].Id), 0), "strike")}:{arms}");
                    yield return Measure($"combat:strike:{arms}_block", 0f, v => Then(() => v.OnMiss(v.Body.position + ahead * 0.12f, true), 1.8f),
                        per: k => $"combat:{SetOf(k, CombatMotion.Miss(held, Female(people[k].Id), true, 0), "strike")}:{arms}_block");
                }
                if (arms == "unarmed")
                {
                    yield return Measure("combat:yield:unarmed", 2.5f, v => Then(v.OnYield, 0.1f));
                    foreach (var v in views) v?.OnEnd();
                    yield return Wait(1f);
                    views.Clear();
                    foreach (var s in people) views.Add(CombatViews.ForBody(GateUnit(s.Id, null), s.Go.transform, runner, fx, set, Female(s.Id), theirs: false));
                    yield return Wait(1f);
                    foreach (var v in views) v?.OnFall(v.Body.position + ahead);
                    yield return Wait(2.5f);
                    yield return Measure("combat:rise:unarmed", 0f, Rise);
                }
                foreach (var v in views) v?.OnEnd();
                yield return Wait(1.5f);
                place(Vector3.zero, 0f);
                yield return Wait(0.5f);
            }
            if (cam != null) Object.Destroy(cam.gameObject);
        }

        private static IEnumerator Counted(IEnumerator inner, System.Action done)
        {
            try { while (inner.MoveNext()) yield return inner.Current; }
            finally { done(); }
        }

        /// <summary>The more bent knee (Kb), and the weapon's hold (WG1: its main grip from the palm; WG2: the off hand from its
        /// grip, cm) for one person this frame.</summary>
        private static void Grips(Subject s, AnimatedUnitView v, string state)
        {
            var a = s.A;
            var hipL = a.GetBoneTransform(HumanBodyBones.LeftUpperLeg).position; var hipR = a.GetBoneTransform(HumanBodyBones.RightUpperLeg).position;
            var kneeL = a.GetBoneTransform(HumanBodyBones.LeftLowerLeg).position; var kneeR = a.GetBoneTransform(HumanBodyBones.RightLowerLeg).position;
            var ankleL = a.GetBoneTransform(HumanBodyBones.LeftFoot).position; var ankleR = a.GetBoneTransform(HumanBodyBones.RightFoot).position;
            Add(s.Probe, state, "Kb", Mathf.Max(Vector3.Angle(kneeL - hipL, ankleL - kneeL), Vector3.Angle(kneeR - hipR, ankleR - kneeR)));
            if (v?.Fighter == null) return;
            if (v.Fighter.InHand && v.Fighter.MainError >= 0f) Add(s.Probe, state, "WG1", v.Fighter.MainError * 100f);
            if (v.Fighter.OffError >= 0f) Add(s.Probe, state, "WG2", v.Fighter.OffError * 100f);
        }

        /// <summary>A gate person as a fight's unit, holding <paramref name="item"/> (null: fists).</summary>
        private static BattleUnit GateUnit(string id, string item)
        {
            var inv = Inv.Empty();
            if (item != null) { Inv.AddItem(inv, Inv.MakeItem(item)); Inv.Equip(inv, 0); }
            var u = new BattleUnit { C = new Combatant { Id = id, Name = id, Team = "gate", Sheet = Sheet.Empty(id), Inv = inv, Ap = 8, Morale = 60 } };
            u.Place(0, 0);
            return u;
        }

        private static bool Female(string id) { var p = RbPeople.Of(id); return p != null ? !p.Male : id.Contains("Female"); }

        /// <summary>The gate's verdict where the lock reads it (docs/qa/gates/motion_gate.json; tools/qa/people_gate.mjs, run by
        /// npm run check and CI): while it is red nothing with a person in it goes to the owner (docs/PEOPLE_MOTION.md §1.8).</summary>
        private static void Verdict(string report, int measures, List<string> fails, int people, int cast)
        {
            var path = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "docs", "qa", "gates", "motion_gate.json"));
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string lastGreen = null;
            try { if (File.Exists(path)) lastGreen = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(path)).Value<string>("lastGreen"); } catch (System.Exception) { }
            var now = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var green = fails.Count == 0;
            var verdict = new Dictionary<string, object>
            {
                ["date"] = now, ["set"] = report, ["people"] = InputsHash("people"), ["measures"] = InputsHash("measures"),
                ["bodies"] = people, ["cast"] = cast, ["green"] = green, ["cells"] = measures, ["failures"] = fails.Count,
                // each measure's failures (the lock holds every later verdict to no more of any); the fight's states
                // (docs/PEOPLE_MOTION.md §2.7) count as measures of their own, "<measure> combat:<set>", so a fight's
                // limits and the standing and walking states' are each held to themselves
                ["byMeasure"] = fails.Select(MeasureKey).GroupBy(m => m).OrderBy(g => g.Key, System.StringComparer.Ordinal)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ["lastGreen"] = green ? now : lastGreen, ["failing"] = fails.OrderBy(f => f.Contains(" combat:") ? 1 : 0).Take(80).ToList(),
                // each man's build past the median (cm; docs/qa/motion_calibration.md §9): his A1 limit standing is 20 + 0.37·e
                ["buildCm"] = BuildCm.Where(kv => kv.Value > 0f).OrderBy(kv => kv.Key, System.StringComparer.Ordinal).ToDictionary(kv => kv.Key, kv => (float)System.Math.Round(kv.Value, 2)),
                // each man's base's baked top and its allowance a side (cm; docs/qa/gates/motion_build_tops.json)
                ["buildTop"] = BuildTop.OrderBy(kv => kv.Key, System.StringComparer.Ordinal).ToDictionary(kv => kv.Key, kv => kv.Value),
            };
            File.WriteAllText(path, JsonConvert.SerializeObject(verdict, Formatting.Indented));
        }

        /// <summary>A failure's key in the verdict's byMeasure: its measure, and for a fight's state its set
        /// ("C1 combat:guard"); a failure reads "&lt;person&gt; &lt;state&gt; &lt;measure&gt;: ...".</summary>
        public static string MeasureKey(string fail)
        {
            var head = fail.Substring(0, Mathf.Max(0, fail.IndexOf(": "))).Split(' ');
            var fight = head.FirstOrDefault(t => t.StartsWith("combat:"));
            return fight == null ? head.Last() : $"{head.Last()} {string.Join(":", fight.Split(':').Take(2))}";
        }

        /// <summary>What the verdict was measured on (docs/qa/gates/motion_gate_inputs.json, as tools/qa/people_gate.mjs
        /// hashes it): SHA-256 over each file's path and the SHA-256 of its bytes, in path order. A verdict whose hashes are
        /// not the tree's is stale and counts as red.</summary>
        public static string InputsHash(string key)
        {
            var root = Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));
            var spec = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(Path.Combine(root, "docs", "qa", "gates", "motion_gate_inputs.json")));
            var files = new SortedSet<string>(System.StringComparer.Ordinal);
            foreach (var pattern in spec[key].Select(t => (string)t))
            {
                var paths = new List<string> { root };
                var segs = pattern.Split('/');
                for (var i = 0; i < segs.Length; i++)
                {
                    var last = i == segs.Length - 1;
                    var re = new System.Text.RegularExpressions.Regex("^" + System.Text.RegularExpressions.Regex.Escape(segs[i]).Replace("\\*", "[^/]*") + "$");
                    var next = new List<string>();
                    foreach (var p in paths)
                    {
                        if (!Directory.Exists(p)) continue;
                        var names = (last ? Directory.GetFiles(p) : Directory.GetDirectories(p)).Select(Path.GetFileName).OrderBy(n => n, System.StringComparer.Ordinal);
                        foreach (var n in names) if (re.IsMatch(n)) next.Add(Path.Combine(p, n));
                    }
                    paths = next;
                }
                foreach (var f in paths) files.Add(Path.GetRelativePath(root, f).Replace('\\', '/'));
            }
            using var sha = System.Security.Cryptography.SHA256.Create();
            var sb = new StringBuilder();
            foreach (var rel in files)
            {
                var h = sha.ComputeHash(File.ReadAllBytes(Path.Combine(root, rel)));
                sb.Append(rel).Append('\n').Append(System.BitConverter.ToString(h).Replace("-", "").ToLowerInvariant()).Append('\n');
            }
            return System.BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()))).Replace("-", "").ToLowerInvariant();
        }

        /// <summary>A gesture is still playing on the gesture layer.</summary>
        private static bool Playing(Animator a)
        {
            var layer = a.GetLayerIndex(Ambient.GestureLayer);
            if (layer < 0) return false;
            return a.IsInTransition(layer) || !a.GetCurrentAnimatorStateInfo(layer).IsName("none") || a.GetLayerWeight(layer) > 0.05f;
        }

        private static void Add(MotionProbe probe, string state, string measure, float value)
        {
            if (!probe.Samples.TryGetValue(state, out var m)) probe.Samples[state] = m = new Dictionary<string, List<float>>();
            if (!m.TryGetValue(measure, out var l)) m[measure] = l = new List<float>();
            l.Add(value);
        }

        /// <summary>Each measure's worst person and state, and every failure.</summary>
        private static string Markdown(List<Dictionary<string, object>> table)
        {
            var sb = new StringBuilder();
            sb.AppendLine("# Motion and posture gate (docs/PEOPLE_MOTION.md)");
            sb.AppendLine();
            sb.AppendLine($"{table.Count} measures; {table.Count(r => !(bool)r["pass"])} past their limits.");
            sb.AppendLine();
            sb.AppendLine("| Measure | Worst person | State | p2 | p50 | p98 | min | max | mean | Pass |");
            sb.AppendLine("|---|---|---|---|---|---|---|---|---|---|");
            foreach (var g in table.GroupBy(r => (string)r["measure"]).OrderBy(g => g.Key))
            {
                var worst = g.OrderBy(r => (bool)r["pass"]).ThenByDescending(r => System.Convert.ToSingle(r["p98"])).First();
                sb.AppendLine($"| {g.Key} | {worst["person"]} | {worst["state"]} | {worst["p2"]:0.0} | {worst["p50"]:0.0} | {worst["p98"]:0.0} | {worst["min"]:0.0} | {worst["max"]:0.0} | {worst["mean"]:0.00} | {(g.All(r => (bool)r["pass"]) ? "yes" : $"**no** ({g.Count(r => !(bool)r["pass"])})")} |");
            }
            sb.AppendLine();
            sb.AppendLine("## Failures");
            foreach (var r in table.Where(r => !(bool)r["pass"]))
                sb.AppendLine($"- {r["person"]} · {r["state"]} · {r["measure"]}: {r["why"]}");
            return sb.ToString();
        }
    }
}
