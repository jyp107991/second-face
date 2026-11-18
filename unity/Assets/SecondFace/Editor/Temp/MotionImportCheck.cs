using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace SecondFace.EditorTools
{
    /// <summary>Temporary (the gate agent's v6.1 import check, not committed): every captured clip's avatar as imported (its
    /// stamp, mapping, configuration), and a gesture's hands as Unity retargets them against the capture's own transforms.</summary>
    public static class MotionImportCheck
    {
        private const string Dir = "Assets/SecondFace/Motion/";
        private const string Tmp = "Assets/SecondFace/Editor/Temp/";

        public static void Run()
        {
            var sb = new StringBuilder();
            foreach (var path in Directory.GetFiles(Dir, "*.fbx").OrderBy(p => p))
            {
                var imp = (ModelImporter)AssetImporter.GetAtPath(path.Replace('\\', '/'));
                var hd = imp.humanDescription;
                var hand = hd.human.Where(h => h.humanName is "LeftHand" or "RightHand").Select(h => h.humanName + "=" + h.boneName);
                var av = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                sb.AppendLine($"{Path.GetFileNameWithoutExtension(path)}: stamp {(imp.userData ?? "").Split(' ').FirstOrDefault()} {(imp.userData ?? "").Length}; " +
                              $"human {hd.human.Length} [{string.Join(", ", hand)}]; skeleton {hd.skeleton.Length}; avatar {(av == null ? "none" : $"valid {av.isValid} human {av.isHuman}")}");
            }
            foreach (var name in new[] { "wave", "argue", "talk", "walk" }) sb.AppendLine(Hands(name));
            var outp = Path.Combine(Application.dataPath, "..", "test-results", "motion_import_check.txt");
            File.WriteAllText(outp, sb.ToString());
            Debug.Log("MotionImportCheck\n" + sb);
        }

        private static string Hands(string name)
        {
            var src = Dir + name + ".fbx";
            var raw = Tmp + "raw_" + name + ".fbx";
            AssetDatabase.CopyAsset(src, raw);
            var ri = (ModelImporter)AssetImporter.GetAtPath(raw);
            ri.animationType = ModelImporterAnimationType.Generic; ri.importAnimation = true; ri.resampleCurves = false;
            ri.animationCompression = ModelImporterAnimationCompression.Off; ri.materialImportMode = ModelImporterMaterialImportMode.None;
            ri.SaveAndReimport();
            try
            {
                var rawClip = AssetDatabase.LoadAllAssetsAtPath(raw).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
                var rawGo = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(raw));
                var humClip = AssetDatabase.LoadAllAssetsAtPath(src).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
                var humGo = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(src));
                var anim = humGo.GetComponent<Animator>() ?? humGo.AddComponent<Animator>();
                anim.avatar = AssetDatabase.LoadAllAssetsAtPath(src).OfType<Avatar>().First();
                anim.applyRootMotion = false;
                var g = PlayableGraph.Create("check");
                var o = AnimationPlayableOutput.Create(g, "o", anim);
                var cp = AnimationClipPlayable.Create(g, humClip); cp.SetApplyFootIK(false);
                o.SetSourcePlayable(cp);
                Transform F(GameObject go, string n) => go.GetComponentsInChildren<Transform>().First(t => t.name == n);
                var bones = new[] { "Hips", "LeftLowerArm", "LeftWristTwist", "LeftHand", "RightLowerArm", "RightWristTwist", "RightHand" };
                var rb = bones.Select(b => F(rawGo, b)).ToArray(); var hb = bones.Select(b => F(humGo, b)).ToArray();
                var restL = rb[3].localRotation; var restR = rb[6].localRotation;   // the hands' rest under their twist bones
                var err = new Dictionary<string, List<float>>();
                void Add(string k, float v) { if (!err.TryGetValue(k, out var l)) err[k] = l = new List<float>(); l.Add(v); }
                var n = Mathf.Max(2, Mathf.RoundToInt(rawClip.length * 30f));
                for (var i = 0; i < n; i++)
                {
                    var t = rawClip.length * i / (n - 1);
                    rawClip.SampleAnimation(rawGo, t);
                    cp.SetTime(t); g.Evaluate();
                    Quaternion R(Transform[] s, int k) => Quaternion.Inverse(s[0].rotation) * s[k].rotation;   // relative to the hips
                    foreach (var (side, fa, tw, h) in new[] { ("L", 1, 2, 3), ("R", 4, 5, 6) })
                    {
                        Add($"{side} hand game vs capture", Quaternion.Angle(R(hb, h), R(rb, h)));
                        Add($"{side} forearm game vs capture", Quaternion.Angle(R(hb, fa), R(rb, fa)));
                        // the forearm split into its direction (elbow to wrist) and its roll about it, in the hips' frame
                        Vector3 D(Transform[] s2) => Quaternion.Inverse(s2[0].rotation) * (s2[h].position - s2[fa].position);
                        var dg = D(hb); var dc = D(rb);
                        Add($"{side} forearm direction game vs capture", Vector3.Angle(dg, dc));
                        var swing = Quaternion.FromToRotation(dc, dg);
                        var rest = Quaternion.Inverse(swing * R(rb, fa)) * R(hb, fa);   // what is left once the direction is matched: the roll
                        Add($"{side} forearm roll game vs capture", Quaternion.Angle(Quaternion.identity, rest));
                        Add($"{side} hand position game vs capture (cm)", 100f * (Quaternion.Inverse(hb[0].rotation) * (hb[h].position - hb[0].position) - Quaternion.Inverse(rb[0].rotation) * (rb[h].position - rb[0].position)).magnitude);
                        Add($"{side} capture's wrist turn off its rest (what the old mapping dropped)", Quaternion.Angle(rb[h].localRotation, side == "L" ? restL : restR));
                    }
                }
                g.Destroy(); Object.DestroyImmediate(rawGo); Object.DestroyImmediate(humGo);
                return $"{name} ({n} samples): " + string.Join("; ", err.Select(kv =>
                {
                    var l = kv.Value.OrderBy(x => x).ToList();
                    return $"{kv.Key} p50 {l[l.Count / 2]:0.0} p98 {l[Mathf.Min(l.Count - 1, (int)(l.Count * 0.98f))]:0.0} max {l[^1]:0.0}";
                }));
            }
            finally { AssetDatabase.DeleteAsset(raw); }
        }
    }
}
