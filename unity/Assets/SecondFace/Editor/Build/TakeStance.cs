using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// A clip's avatar configuration stood on its take's floor (docs/MOTION_ROOT_CAUSE.md §9, 2026-11-18). Unity reads a
    /// clip avatar's feet-bottom height as its configured T-pose ankle's height over the model's root, its humanScale as the
    /// T-pose's centre of mass over that root, and the foot's pose as a turn from the T-pose foot: the T-pose is the ground
    /// every frame of the take is mapped against. The converters' T-pose (`t_pose_key`) stood wherever the capture's base pose
    /// put it: the ankles 3.0-9.5 cm over the root (left and right up to 2.3 cm apart) where the actors' flat feet stand 4.8-12.3
    /// cm over their takes' floors, and the CMU feet 2-11° flatter than the actors stand on them, so every body's stance soles
    /// were mapped centimetres into the floor or over it (the bare retarget's jog −9 cm, CMU 141's jog and ACCAD Female1's
    /// idles +4-7 cm on a body grounded the same way). Here the configuration is stood as the actor stands in the take: the
    /// hips set so the T-pose ankles' mean height is the take's own flat-foot ankles' mean over the take's floor, and each
    /// foot at the actor's own flat-foot turn (its pitch and roll; the T-pose's heading kept). Measured on the file as
    /// recorded (a copy read as a Generic take): a foot's flat keys are its flattest standing keys (the larger of its ankle's
    /// and its toe joint's heights over their own floors, the median of their lowest 15 %, within 1 cm of its least).
    /// </summary>
    public static class TakeStance
    {
        public struct Stand
        {
            /// <summary>Each foot's ankle over the take's floor in its flat keys (m; left, right).</summary>
            public float[] Ankle;
            /// <summary>Each foot's world turn at its flat key of median pitch.</summary>
            public Quaternion[] Foot;
            /// <summary>Each foot's ankle-to-toe line there.</summary>
            public Vector3[] Dir;
            public int[] Keys;
            /// <summary>The take stands on its feet: each foot has at least three flat keys (within 3 cm of both floors) with the
            /// hips at least <see cref="StandShare"/> of the T-pose's leg over the floor (a seated take, a sit's, has none).</summary>
            public bool Standing;
        }

        /// <summary>Standing: the hips over the take's floor at least this share of the T-pose's hips-to-ankle length (a
        /// crouched sneak's 0.95, a seated hold's about 0.55).</summary>
        public const float StandShare = 0.75f;

        /// <summary>The configured T-pose's hips over its ankles (m).</summary>
        public static float Leg(HumanDescription hd, GameObject model)
        {
            var w = World(hd.skeleton, model);
            return w["Hips"].p.y - (w["LeftFoot"].p.y + w["RightFoot"].p.y) * 0.5f;
        }

        private static float Median(IEnumerable<float> v) { var s = v.OrderBy(x => x).ToList(); return s.Count == 0 ? float.NaN : s[s.Count / 2]; }
        private static float Pitch(Vector3 d) => Mathf.Atan2(-d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg;

        /// <summary>The take as recorded: a copy of the file read as a Generic clip (outside the motion folder, so no
        /// postprocessor configures it), sampled at every key.</summary>
        public static Stand Measure(string path, float leg)
        {
            var copy = "Assets/TakeStance_" + Path.GetFileName(path);
            AssetDatabase.DeleteAsset(copy);
            if (!AssetDatabase.CopyAsset(path, copy)) throw new IOException($"TakeStance: could not copy {path}");
            GameObject go = null;
            try
            {
                var imp = (ModelImporter)AssetImporter.GetAtPath(copy);
                imp.userData = ""; imp.animationType = ModelImporterAnimationType.Generic; imp.avatarSetup = ModelImporterAvatarSetup.NoAvatar;
                imp.importAnimation = true; imp.clipAnimations = imp.defaultClipAnimations;
                imp.materialImportMode = ModelImporterMaterialImportMode.None;
                imp.SaveAndReimport();
                var clip = AssetDatabase.LoadAllAssetsAtPath(copy).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
                go = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(copy));
                go.transform.position = Vector3.zero;
                var all = go.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First());
                var s = new Stand { Ankle = new float[2], Foot = new Quaternion[2], Dir = new Vector3[2], Keys = new int[2], Standing = true };
                var n = Mathf.Max(1, Mathf.RoundToInt(clip.length * clip.frameRate));
                var hipsT = all["Hips"];
                for (var side = 0; side < 2; side++)
                {
                    var pre = side == 0 ? "Left" : "Right";
                    var foot = all[pre + "Foot"]; var toes = all[pre + "Toes"];
                    var an = new List<float>(); var to = new List<float>(); var rot = new List<Quaternion>(); var dir = new List<Vector3>(); var hi = new List<float>();
                    for (var k = 0; k <= n; k++)
                    {
                        clip.SampleAnimation(go, clip.length * k / n);
                        an.Add(foot.position.y); to.Add(toes.position.y); rot.Add(foot.rotation); dir.Add(toes.position - foot.position); hi.Add(hipsT.position.y);
                    }
                    float Floor(List<float> v) => Median(v.OrderBy(x => x).Take(Mathf.Max(2, Mathf.RoundToInt(0.15f * v.Count))));
                    var fa = Floor(an); var ft = Floor(to);
                    // the flattest standing keys: the ankle's and the toe joint's heights over their own floors, the larger of the
                    // two within 1 cm of its least (a foot whose ankle and toe never reach their floors together, CMU 07's and 08's
                    // right feet by 1.4-1.8 cm, still has a flat stance); none within 3 cm, or the hips never standing: no stance
                    var up = Enumerable.Range(0, an.Count).Where(i => hi[i] - fa >= StandShare * leg).ToList();
                    var least = up.Count > 0 ? up.Min(i => Mathf.Max(an[i] - fa, to[i] - ft)) : float.MaxValue;
                    var flat = up.Where(i => Mathf.Max(an[i] - fa, to[i] - ft) <= least + 0.01f).ToList();
                    if (least > 0.03f || flat.Count < 3) { s.Standing = false; if (flat.Count == 0) flat = Enumerable.Range(0, an.Count).ToList(); }
                    var mid = flat.OrderBy(i => Pitch(dir[i])).ToList()[flat.Count / 2];
                    s.Ankle[side] = Median(flat.Select(i => an[i]));
                    s.Foot[side] = rot[mid]; s.Dir[side] = dir[mid]; s.Keys[side] = flat.Count;
                }
                return s;
            }
            finally
            {
                if (go != null) Object.DestroyImmediate(go);
                AssetDatabase.DeleteAsset(copy);
            }
        }

        /// <summary>Each configured bone's world place and turn: the configuration's local transforms chained by the model's
        /// hierarchy from its first entry (the root, whatever name Unity stored for it).</summary>
        public static Dictionary<string, (Vector3 p, Quaternion r)> World(SkeletonBone[] sk, GameObject model)
        {
            var parent = model.GetComponentsInChildren<Transform>(true).Where(t => t != model.transform && t.parent != null)
                .GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First().parent == model.transform ? sk[0].name : g.First().parent.name);
            var local = sk.GroupBy(b => b.name).ToDictionary(g => g.Key, g => g.First());
            var w = new Dictionary<string, (Vector3 p, Quaternion r)>();
            (Vector3 p, Quaternion r) W(string name)
            {
                if (w.TryGetValue(name, out var x)) return x;
                var b = local[name];
                if (name == sk[0].name || !parent.TryGetValue(name, out var pn) || !local.ContainsKey(pn)) return w[name] = (b.position, b.rotation);
                var pw = W(pn);
                return w[name] = (pw.p + pw.r * b.position, pw.r * b.rotation);
            }
            foreach (var b in local.Keys) W(b);
            return w;
        }

        public static string ParentOf(GameObject model, string bone, SkeletonBone[] sk)
        {
            var t = model.GetComponentsInChildren<Transform>(true).FirstOrDefault(x => x.name == bone);
            return t == null || t.parent == null ? null : t.parent == model.transform ? sk[0].name : t.parent.name;
        }

        /// <summary>The configuration stood as the actor stands in the take (see the class): returns the changed description
        /// and what was changed.</summary>
        public static HumanDescription Stood(HumanDescription hd, GameObject model, Stand st, out string note)
        {
            var sk = hd.skeleton.ToArray();
            var w = World(sk, model);
            var tA = new[] { w["LeftFoot"].p.y, w["RightFoot"].p.y };
            var dz = (st.Ankle[0] + st.Ankle[1]) * 0.5f - (tA[0] + tA[1]) * 0.5f;
            var feet = "";
            for (var i = 0; i < sk.Length; i++)
            {
                var name = sk[i].name;
                if (name == "Hips") sk[i].position += Quaternion.Inverse(w[ParentOf(model, "Hips", sk)].r) * new Vector3(0f, dz, 0f);
                if (name == "LeftFoot" || name == "RightFoot")
                {
                    var side = name == "LeftFoot" ? 0 : 1;
                    var pre = side == 0 ? "Left" : "Right";
                    var dT = w[pre + "Toes"].p - w[name].p; var dF = st.Dir[side];
                    var yaw = Vector3.SignedAngle(new Vector3(dF.x, 0f, dF.z), new Vector3(dT.x, 0f, dT.z), Vector3.up);
                    sk[i].rotation = Quaternion.Inverse(w[ParentOf(model, name, sk)].r) * (Quaternion.AngleAxis(yaw, Vector3.up) * st.Foot[side]);
                    feet += $"; {pre} foot pitch {Pitch(dT):0.0} -> {Pitch(dF):0.0}";
                }
            }
            note = $"T-pose ankles {tA[0] * 100f:0.00}/{tA[1] * 100f:0.00} cm over the root, the take's flat feet {st.Ankle[0] * 100f:0.00}/{st.Ankle[1] * 100f:0.00} over its floor ({st.Keys[0]}/{st.Keys[1]} keys): hips {dz * 100f:+0.00;-0.00} cm{feet}";
            hd.skeleton = sk;
            return hd;
        }
    }
}
