using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>A diagnostic (run by name): each captured gait's source skeleton against its sidecar's "hip", and a few
    /// bodies' own hips, as Unity's humanoid retarget scales them (Animator.humanScale).</summary>
    public static class PaceProbe
    {
        public static void Run()
        {
            var lines = new System.Collections.Generic.List<string>();
            foreach (var json in Directory.GetFiles("Assets/SecondFace/Motion", "*.json").OrderBy(x => x))
            {
                var j = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(json));
                var fbx = json.Replace(".json", ".fbx");
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(fbx);
                if (model == null) continue;
                var go = Object.Instantiate(model);
                var a = go.GetComponent<Animator>() ?? go.AddComponent<Animator>();
                var avatar = AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<Avatar>().FirstOrDefault();
                a.avatar = avatar;
                a.Rebind();
                var hips = a.isHuman ? a.GetBoneTransform(HumanBodyBones.Hips) : null;
                var low = go.GetComponentsInChildren<Transform>().Min(t => t.position.y);
                var lf = a.isHuman ? a.GetBoneTransform(HumanBodyBones.LeftFoot) : null;
                lines.Add($"clip {Path.GetFileNameWithoutExtension(json)} src {j.Value<string>("src")} speed {j.Value<float>("speed"):0.000} jsonhip {j.Value<float>("hip"):0.0000} humanScale {(a.isHuman ? a.humanScale : 0f):0.0000} hipsY {(hips != null ? hips.position.y : 0f):0.0000} lowest {low:0.0000} ankleY {(lf != null ? lf.position.y : 0f):0.0000}");
                Object.DestroyImmediate(go);
            }
            var cat = AssetDatabase.LoadAssetAtPath<SecondFace.Game.People.RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            foreach (var id in new[] { "Business_Female_01", "Female_Adult_07", "Female_Adult_11", "Construction_Male_02", "cap_Police_Male_03n", "Male_Adult_11" })
            {
                var e = cat.People.FirstOrDefault(x => x.Id == id);
                if (e == null) continue;
                var go = Object.Instantiate(e.Prefab);
                var a = go.GetComponentInChildren<Animator>();
                a.Rebind();
                var hips = a.GetBoneTransform(HumanBodyBones.Hips);
                lines.Add($"body {id} humanScale {a.humanScale:0.0000} hipsY {hips.position.y - go.transform.position.y:0.0000}");
                Object.DestroyImmediate(go);
            }
            File.WriteAllLines(Path.Combine(Application.dataPath, "..", "test-results", "pace_probe.txt"), lines);
            Debug.Log("PaceProbe: " + lines.Count);
        }
    }
}
