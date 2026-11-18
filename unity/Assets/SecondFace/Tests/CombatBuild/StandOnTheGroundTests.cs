#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.EditorTools;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>
    /// Every avatar a clip is played from or onto stands on its ground (docs/MOTION_ROOT_CAUSE.md §9, 2026-11-18). Unity reads
    /// an avatar's feet-bottom height as its configured T-pose ankle's height over the model's root and its humanScale as the
    /// T-pose's centre of mass over that root, and maps every frame against the T-pose: (1) each captured clip's T-pose stands
    /// as its actor stands in the take (the T-pose ankles' mean height the take's flat-foot ankles' mean over its floor, each
    /// foot at the actor's own flat-foot pitch), (2) each person's T-pose stands on the model's root as its bind does, and (3)
    /// every clip that plays in place keeps its take's own height over that floor (Original), never "from the feet", which
    /// Unity reads at the take's first key (a gait's touchdown or flight: the jog 8 cm into the floor). A take that travels
    /// (a fall) keeps its height as root motion, and a seated one (no standing stance) its T-pose and its feet as before.
    /// </summary>
    public class StandOnTheGroundTests
    {
        private const string Motion = "Assets/SecondFace/Motion/";

        private static float Pitch(Vector3 d) => Mathf.Atan2(-d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg;

        [Test]
        public void EveryClipsTPoseStandsAsItsActorStandsInTheTake()
        {
            var wrong = new List<string>(); var report = new List<string>();
            var n = 0;
            foreach (var path in Directory.GetFiles(Motion, "*.fbx").Concat(Directory.GetFiles(CombatImportPostprocessor.MotionDir, "*.fbx")).Select(p => p.Replace('\\', '/')).OrderBy(p => p))
            {
                n++;
                var name = Path.GetFileNameWithoutExtension(path);
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                var json = Path.ChangeExtension(path, ".json");
                var travels = File.Exists(json) && (Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(json)).Value<bool?>("root") ?? false);
                var seated = imp.userData != null && imp.userData.EndsWith(" seated");
                var clips = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview__")).ToList();
                if (travels || seated)
                {
                    // (a take that travels keeps its height as root motion; a seated one, with no standing stance to stand its
                    // T-pose by, keeps the converters' T-pose and its feet on the floor at its first key, as before 2026-11-18)
                    var st0 = TakeStance.Measure(path, TakeStance.Leg(imp.humanDescription, model));
                    if (seated && st0.Standing) wrong.Add($"{name}: marked seated but stands ({st0.Keys[0]}/{st0.Keys[1]} standing keys)");
                    // (the everyday motion's fall keeps its height as root motion; the fight's travelling clips bake it as
                    // captured, CombatImportPostprocessor: never from the feet)
                    var fight = path.StartsWith(CombatImportPostprocessor.MotionDir);
                    foreach (var clip in clips)
                    {
                        var st1 = AnimationUtility.GetAnimationClipSettings(clip);
                        if (travels && !fight && (st1.heightFromFeet || st1.keepOriginalPositionY)) wrong.Add($"{name}: travels, its height not root motion");
                        if (travels && fight && (st1.heightFromFeet || !st1.keepOriginalPositionY)) wrong.Add($"{name}: travels, its height not as captured");
                    }
                    report.Add($"{name}: {(travels ? "travels" : "seated")}, the converters' T-pose");
                    continue;
                }
                var st = TakeStance.Measure(path, TakeStance.Leg(imp.humanDescription, model));
                if (!st.Standing) wrong.Add($"{name}: no standing stance found, yet not marked seated");
                var w = TakeStance.World(imp.humanDescription.skeleton, model);
                var tA = (w["LeftFoot"].p.y + w["RightFoot"].p.y) * 0.5f; var sA = (st.Ankle[0] + st.Ankle[1]) * 0.5f;
                if (Mathf.Abs(tA - sA) > 0.001f) wrong.Add($"{name}: the T-pose ankles stand {tA * 100f:0.00} cm over the root, the take's flat feet {sA * 100f:0.00} over its floor");
                foreach (var (side, pre) in new[] { (0, "Left"), (1, "Right") })
                {
                    var pT = Pitch(w[pre + "Toes"].p - w[pre + "Foot"].p); var pS = Pitch(st.Dir[side]);
                    if (Mathf.Abs(pT - pS) > 0.5f) wrong.Add($"{name}: the T-pose's {pre.ToLower()} foot pitched {pT:0.0}°, the take's flat foot {pS:0.0}°");
                }
                // what Unity reads: the avatar's feet-bottom heights are the configured T-pose ankles
                var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().First();
                var go = Object.Instantiate(model);
                var a = go.GetComponent<Animator>(); a.avatar = avatar; a.Rebind();
                var fb = (a.leftFeetBottomHeight + a.rightFeetBottomHeight) * 0.5f;
                if (Mathf.Abs(fb - sA) > 0.001f) wrong.Add($"{name}: Unity's feet-bottom height {fb * 100f:0.00} cm, the take's flat feet {sA * 100f:0.00}");
                report.Add($"{name}: flat feet {st.Ankle[0] * 100f:0.00}/{st.Ankle[1] * 100f:0.00} cm, feet-bottom {a.leftFeetBottomHeight * 100f:0.00}/{a.rightFeetBottomHeight * 100f:0.00}, humanScale {a.humanScale:0.0000}");
                Object.DestroyImmediate(go);
                // the take's own height over its floor
                foreach (var clip in clips)
                {
                    var s = AnimationUtility.GetAnimationClipSettings(clip);
                    if (s.heightFromFeet) wrong.Add($"{name}: its height from the feet (Unity reads them at the take's first key)");
                    if (!s.keepOriginalPositionY) wrong.Add($"{name}: plays in place, its height not the take's own");
                }
            }
            Debug.Log("StandOnTheGroundTests: the clips' T-poses\n" + string.Join("\n", report));
            Assert.That(n, Is.GreaterThan(0), "no captured clips found");
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        [Test]
        public void EveryPersonsTPoseStandsOnTheRootAsTheBindDoes()
        {
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            Assert.That(cat, Is.Not.Null, "the catalog");
            var wrong = new List<string>(); var n = 0;
            foreach (var e in cat.People.Where(e => e != null && e.Prefab != null))
            {
                var path = $"Assets/SecondFace/People/Rocketbox/{e.Id}/{e.Id}.fbx";
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (model == null) continue;
                n++;
                var go = Object.Instantiate(model);
                var a = go.GetComponent<Animator>(); a.Rebind();
                float Bind(HumanBodyBones b) => go.transform.InverseTransformPoint(a.GetBoneTransform(b).position).y;
                var bind = (Bind(HumanBodyBones.LeftFoot) + Bind(HumanBodyBones.RightFoot)) * 0.5f;
                var fb = (a.leftFeetBottomHeight + a.rightFeetBottomHeight) * 0.5f;
                if (Mathf.Abs(fb - bind) > 0.001f) wrong.Add($"{e.Id}: the T-pose ankles {fb * 100f:0.00} cm over the root, the bind's {bind * 100f:0.00}");
                Object.DestroyImmediate(go);
            }
            Assert.That(n, Is.GreaterThan(0), "no bodies found");
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }
    }
}
#endif
