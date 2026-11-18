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
            var cls = _tops["bases"]?[id]?.Value<string>() ?? "jacket";
            var cm = _tops["allowance_cm"]?[cls]?.Value<float?>() ?? 1.3f;
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
