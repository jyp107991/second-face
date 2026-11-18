#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>Temporary diagnostic (the gate agent's, not committed): the clip's T-pose stood on its take's floor. Unity
    /// reads a clip avatar's feet-bottom height as its configured T-pose ankle's height over the root, and maps the take
    /// against the T-pose: a T-pose that stands higher or lower than the actor stands in the take, or whose feet are not at
    /// the actor's flat-standing angle, moves every body's soles. Here each clip's configuration is (1) as imported, (2) its
    /// hips set so the T-pose ankles stand at the take's own flat-foot ankle height over the take's floor, (3) with the feet
    /// also at the take's flat-foot angle; the clip as Original (the take's floor) or Feet (at start); on the bodies with
    /// their T-pose stood on their root (SoleProbe3Tests.Grounded).</summary>
    public class SoleProbe4Tests
    {
        private static readonly string[] Clips = { "jog", "jog_b", "jog_f", "run", "run_c", "walk", "walk_b", "walk_slow", "walk_d", "walk_f_b", "sneak", "idle_m", "idle_m_b", "idle_f", "idle_f_c" };
        private static readonly string[] Bodies = { "Sports_Male_04", "Medical_Female_01" };

        private static float Q(IList<float> v, float q) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp((int)(s.Count * q), 0, s.Count - 1)]; }

        internal struct Stand { public float[] Ankle; public Quaternion[] Foot; public Vector3[] Dir; public int[] Keys; }

        /// <summary>The take as recorded (the file read as a Generic clip): per foot, its flat-foot keys (the ankle and the toe
        /// joint each within 1.5 cm of their own floors, the median of their lowest 15 %), the ankle's height over the take's
        /// floor (y = 0) there, and the foot's world turn at the key of median pitch.</summary>
        internal static Stand Measure(string path)
        {
            var copy = "Assets/ProbeTmp/raw_" + Path.GetFileName(path);
            AssetDatabase.DeleteAsset(copy);
            AssetDatabase.CopyAsset(path, copy);
            var imp = (ModelImporter)AssetImporter.GetAtPath(copy);
            imp.userData = ""; imp.animationType = ModelImporterAnimationType.Generic; imp.avatarSetup = ModelImporterAvatarSetup.NoAvatar;
            imp.importAnimation = true; imp.clipAnimations = imp.defaultClipAnimations; imp.materialImportMode = ModelImporterMaterialImportMode.None;
            imp.SaveAndReimport();
            var clip = AssetDatabase.LoadAllAssetsAtPath(copy).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
            var go = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(copy));
            var all = go.GetComponentsInChildren<Transform>(true).ToDictionary(t => t.name, t => t);
            var s = new Stand { Ankle = new float[2], Foot = new Quaternion[2], Dir = new Vector3[2], Keys = new int[2] };
            var n = Mathf.Max(1, Mathf.RoundToInt(clip.length * clip.frameRate));
            for (var side = 0; side < 2; side++)
            {
                var pre = side == 0 ? "Left" : "Right";
                var foot = all[pre + "Foot"]; var toes = all[pre + "Toes"];
                var an = new List<float>(); var to = new List<float>(); var rot = new List<Quaternion>(); var dir = new List<Vector3>();
                for (var k = 0; k <= n; k++)
                {
                    clip.SampleAnimation(go, clip.length * k / n);
                    an.Add(foot.position.y); to.Add(toes.position.y); rot.Add(foot.rotation); dir.Add(toes.position - foot.position);
                }
                float Floor(List<float> v) { var q = v.OrderBy(x => x).Take(Mathf.Max(2, Mathf.RoundToInt(0.15f * v.Count))).ToList(); return q[q.Count / 2]; }
                var fa = Floor(an); var ft = Floor(to);
                var flat = Enumerable.Range(0, an.Count).Where(i => an[i] < fa + 0.015f && to[i] < ft + 0.015f).ToList();
                if (flat.Count == 0) flat = Enumerable.Range(0, an.Count).ToList();
                float Pitch(Vector3 d) => Mathf.Atan2(-d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg;
                var byPitch = flat.OrderBy(i => Pitch(dir[i])).ToList();
                var mid = byPitch[byPitch.Count / 2];
                s.Ankle[side] = Q(flat.Select(i => an[i]).ToList(), 0.5f);
                s.Foot[side] = rot[mid]; s.Dir[side] = dir[mid]; s.Keys[side] = flat.Count;
            }
            Object.DestroyImmediate(go);
            AssetDatabase.DeleteAsset(copy);
            return s;
        }

        /// <summary>Each configured bone's world place and turn (the configuration chained by the file's hierarchy).</summary>
        internal static Dictionary<string, (Vector3 p, Quaternion r)> World(SkeletonBone[] sk, Dictionary<string, string> parent)
        {
            var local = sk.GroupBy(b => b.name).ToDictionary(g => g.Key, g => g.First());
            var w = new Dictionary<string, (Vector3 p, Quaternion r)>();
            (Vector3 p, Quaternion r) W(string name)
            {
                if (w.TryGetValue(name, out var x)) return x;
                var b = local[name];
                if (!parent.TryGetValue(name, out var pn) || !local.ContainsKey(pn)) return w[name] = (b.position, b.rotation);
                var pw = W(pn);
                return w[name] = (pw.p + pw.r * b.position, pw.r * b.rotation);
            }
            foreach (var b in local.Keys) W(b);
            return w;
        }

        /// <summary>The configuration stood on the take's floor: the hips moved so the T-pose ankles' mean height is the take's
        /// flat-foot mean, and (feet) each foot turned to the take's flat-foot turn, its heading kept.</summary>
        internal static HumanDescription Stood(HumanDescription hd, Dictionary<string, string> parent, Stand st, bool feet, out string note)
        {
            var sk = hd.skeleton.ToArray();
            var w = World(sk, parent);
            var tA = new[] { w["LeftFoot"].p.y, w["RightFoot"].p.y };
            var dz = (st.Ankle[0] + st.Ankle[1]) * 0.5f - (tA[0] + tA[1]) * 0.5f;
            var rootRot = sk[0].rotation;
            var pitchNote = "";
            for (var i = 0; i < sk.Length; i++)
            {
                if (sk[i].name == "Hips") sk[i].position += Quaternion.Inverse(w[parent["Hips"]].r) * new Vector3(0f, dz, 0f);
                if (feet && (sk[i].name == "LeftFoot" || sk[i].name == "RightFoot"))
                {
                    var side = sk[i].name == "LeftFoot" ? 0 : 1;
                    var pre = side == 0 ? "Left" : "Right";
                    var dT = w[pre + "Toes"].p - w[pre + "Foot"].p; var dF = st.Dir[side];
                    var yaw = Vector3.SignedAngle(new Vector3(dF.x, 0f, dF.z), new Vector3(dT.x, 0f, dT.z), Vector3.up);
                    var want = Quaternion.AngleAxis(yaw, Vector3.up) * st.Foot[side];
                    sk[i].rotation = Quaternion.Inverse(w[parent[sk[i].name]].r) * want;
                    float Pitch(Vector3 d) => Mathf.Atan2(-d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg;
                    pitchNote += $" {pre} foot pitch {Pitch(dT):0.0} -> {Pitch(dF):0.0}";
                }
            }
            note = $"T-pose ankles {tA[0] * 100f:0.00}/{tA[1] * 100f:0.00} cm, take flat-foot ankles {st.Ankle[0] * 100f:0.00}/{st.Ankle[1] * 100f:0.00} (keys {st.Keys[0]}/{st.Keys[1]}): hips {dz * 100f:+0.00;-0.00}{pitchNote}";
            hd.skeleton = sk;
            return hd;
        }

        internal static AnimationClip Import(string src, string tag, HumanDescription hd, bool original)
        {
            var dst = $"Assets/ProbeTmp/fix_{Path.GetFileNameWithoutExtension(src)}_{tag}.fbx";
            AssetDatabase.DeleteAsset(dst);
            AssetDatabase.CopyAsset(src, dst);
            var srcImp = (ModelImporter)AssetImporter.GetAtPath(src);
            var imp = (ModelImporter)AssetImporter.GetAtPath(dst);
            imp.userData = ""; imp.animationType = ModelImporterAnimationType.Human; imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.humanDescription = hd;
            var clips = srcImp.clipAnimations;
            foreach (var c in clips) { c.heightFromFeet = !original; c.keepOriginalPositionY = original; }
            imp.clipAnimations = clips; imp.importAnimation = true; imp.materialImportMode = ModelImporterMaterialImportMode.None;
            imp.SaveAndReimport();
            var clip = AssetDatabase.LoadAllAssetsAtPath(dst).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
            // the clip's own settings as the motion postprocessor makes them (loop blend etc.), with this Y reference
            var s = AnimationUtility.GetAnimationClipSettings(SoleProbeTests.Clip(src));
            s.heightFromFeet = !original; s.keepOriginalPositionY = original;
            AnimationUtility.SetAnimationClipSettings(clip, s);
            return clip;
        }

        [Test]
        public void TheClipsTPoseStoodOnItsTakesFloor()
        {
            var sb = new StringBuilder();
            if (!AssetDatabase.IsValidFolder("Assets/ProbeTmp")) AssetDatabase.CreateFolder("Assets", "ProbeTmp");
            var grounded = Bodies.ToDictionary(id => id, id => SoleProbe3Tests.Grounded(id, out _));
            foreach (var clip in Clips)
            {
                var path = "Assets/SecondFace/Motion/" + clip + ".fbx";
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                var inst = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
                var parent = inst.GetComponentsInChildren<Transform>(true).Where(t => t.parent != null).ToDictionary(t => t.name, t => t.parent.name);
                Object.DestroyImmediate(inst);
                var st = Measure(path);
                var hdHips = Stood(imp.humanDescription, parent, st, false, out var n1);
                var hdFeet = Stood(imp.humanDescription, parent, st, true, out var n2);
                sb.AppendLine($"STAND {clip}: {n2}");
                var variants = new List<(string, AnimationClip, Avatar)>();
                foreach (var (tag, hd, orig) in new[] { ("asis_orig", imp.humanDescription, true), ("hips_orig", hdHips, true), ("feet_orig", hdFeet, true), ("feet_feet", hdFeet, false) })
                {
                    var c = Import(path, tag, hd, orig);
                    var av = AssetDatabase.LoadAllAssetsAtPath($"Assets/ProbeTmp/fix_{clip}_{tag}.fbx").OfType<Avatar>().First();
                    variants.Add((tag, c, av));
                    var model = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/ProbeTmp/fix_{clip}_{tag}.fbx");
                    var g = Object.Instantiate(model); var a = SoleProbeTests.Prep(g, av);
                    sb.AppendLine($"{clip,-10} own {tag,-10}: valid {av.isValid} humanScale {a.humanScale:0.0000} feetBottom {a.leftFeetBottomHeight * 100f:0.00}/{a.rightFeetBottomHeight * 100f:0.00}");
                    Object.DestroyImmediate(g);
                }
                foreach (var id in Bodies)
                {
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
                    foreach (var (tag, c, _) in variants)
                    {
                        var go = Object.Instantiate(prefab); var a = SoleProbeTests.Prep(go, grounded[id]);
                        sb.AppendLine($"{clip,-10} {id,-18} grounded {tag,-10}: {SoleProbe3Tests.StanceOf(go, a, c, false)}");
                        Object.DestroyImmediate(go);
                    }
                }
                foreach (var tag in new[] { "asis_orig", "hips_orig", "feet_orig", "feet_feet" }) AssetDatabase.DeleteAsset($"Assets/ProbeTmp/fix_{clip}_{tag}.fbx");
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "sole_probe4.txt"), sb.ToString());
        }
    }
}
#endif
