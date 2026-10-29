using System.Collections.Generic;
using System.Linq;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Measures each person prefab's torso into a <see cref="TorsoProfile"/> (the owner's note: arms never sink into a
    /// body; <see cref="ArmClearance"/> reads it at runtime, where the meshes are not readable): the LOD0 body and what it
    /// wears, baked at rest, every vertex but the arms', the lower legs' and the hair's (by the bone that moves it most),
    /// in the hips' frame, as an ellipse per <see cref="TorsoProfile.Step"/> m of height; and each of the body's own
    /// shapes ("body-…", the player's build and muscle) at full weight, as the change it makes. A prefab already measured
    /// at the profile's version is left alone (a rebuild of the people measures afresh).
    /// </summary>
    public static class TorsoMeasure
    {
        private static readonly string[] Skip = { "hair", "brow", "lash", "eye", "teeth", "tongue" };

        [MenuItem("Second Face/Measure torsos")]
        public static void MeasureAll() => MeasureEvery(false);

        public static int MeasureEvery(bool force)
        {
            var n = 0;
            foreach (var guid in AssetDatabase.FindAssets("t:Prefab", new[] { WorldAssetsBuild.PeopleDir }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (System.IO.Path.GetFileNameWithoutExtension(path).Contains("__")) continue;   // a garment (WardrobeBuild), worn by a body
                var asset = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                var anim = asset != null ? asset.GetComponentInChildren<Animator>() : null;
                if (anim == null || !anim.isHuman) continue;
                var have = anim.GetComponent<TorsoProfile>();
                if (!force && have != null && have.Measured == TorsoProfile.Version) continue;
                var root = PrefabUtility.LoadPrefabContents(path);
                try
                {
                    if (Measure(root)) { PrefabUtility.SaveAsPrefabAsset(root, path); n++; }
                }
                finally { PrefabUtility.UnloadPrefabContents(root); }
            }
            if (n > 0) Debug.Log($"TorsoMeasure: {n} torsos measured");
            return n;
        }

        /// <summary>Measures a person (a prefab's contents, at rest) into its profile; false when it is not a person.</summary>
        public static bool Measure(GameObject root)
        {
            var anim = root.GetComponentInChildren<Animator>();
            if (anim == null || !anim.isHuman) return false;
            var hips = anim.GetBoneTransform(HumanBodyBones.Hips);
            if (hips == null) return false;
            var skip = new HashSet<Transform>();
            for (var b = HumanBodyBones.LeftUpperArm; b <= HumanBodyBones.RightHand; b++)
                if (b != HumanBodyBones.Neck && b != HumanBodyBones.Head && b != HumanBodyBones.LeftEye && b != HumanBodyBones.RightEye && b != HumanBodyBones.Jaw
                    && b != HumanBodyBones.LeftShoulder && b != HumanBodyBones.RightShoulder && b != HumanBodyBones.Chest && b != HumanBodyBones.Spine)
                    Add(anim.GetBoneTransform(b));
            for (var b = HumanBodyBones.LeftThumbProximal; b <= HumanBodyBones.RightLittleDistal; b++) Add(anim.GetBoneTransform(b));
            foreach (var b in new[] { HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot, HumanBodyBones.LeftToes, HumanBodyBones.RightToes })
                Add(anim.GetBoneTransform(b));
            void Add(Transform t) { if (t != null) skip.Add(t); }
            // below every arm and leg bone in the list: their children (twist and roll bones) are theirs too
            foreach (var t in skip.ToList()) foreach (var c in t.GetComponentsInChildren<Transform>(true)) skip.Add(c);

            var renderers = root.GetComponentsInChildren<SkinnedMeshRenderer>(true)
                .Where(r => r.sharedMesh != null && !Skip.Any(s => r.name.ToLowerInvariant().Contains(s))).ToList();
            if (renderers.Any(r => r.name.Contains("_LOD"))) renderers = renderers.Where(r => r.name.Contains("_LOD0")).ToList();
            if (renderers.Count == 0) return false;

            var p = anim.GetComponent<TorsoProfile>() ?? anim.gameObject.AddComponent<TorsoProfile>();
            p.HipsRest = Quaternion.Inverse(anim.transform.rotation) * hips.rotation;
            var frame = anim.transform.rotation;
            var scale = Mathf.Max(0.01f, anim.transform.lossyScale.y);
            var bins = Mathf.RoundToInt((1.2f) / p.Step) + 1;   // from -0.45 to +0.75 m about the hips
            var (cx, cz, rx, rz) = Sections(renderers, skip, hips, frame, scale, p.Bottom, p.Step, bins);
            p.Cx = cx; p.Cz = cz; p.Rx = rx; p.Rz = rz;
            // the body's own shapes (the player's build and muscle), each at full weight against the rest
            p.Shapes.Clear();
            p.Body = renderers.FirstOrDefault(r => Shapes(r).Any());
            if (p.Body != null)
                foreach (var name in Shapes(p.Body).ToList())
                {
                    var set = renderers.Select(r => (r, i: r.sharedMesh.GetBlendShapeIndex(name))).Where(x => x.i >= 0).ToList();
                    foreach (var (r, i) in set) r.SetBlendShapeWeight(i, 100f);
                    var (_, _, srx, srz) = Sections(renderers, skip, hips, frame, scale, p.Bottom, p.Step, bins);
                    foreach (var (r, i) in set) r.SetBlendShapeWeight(i, 0f);
                    p.Shapes.Add(new TorsoProfile.Shape
                    {
                        Name = name,
                        Rx = srx.Select((v, k) => v - rx[k]).ToArray(),
                        Rz = srz.Select((v, k) => v - rz[k]).ToArray(),
                    });
                }
            p.Measured = TorsoProfile.Version;
            var waist = Mathf.RoundToInt((0.1f - p.Bottom) / p.Step);
            Debug.Log($"TorsoMeasure: {root.name}: {renderers.Count} meshes; at the hips ±{rx[Mathf.RoundToInt(-p.Bottom / p.Step)]:0.000} × ±{rz[Mathf.RoundToInt(-p.Bottom / p.Step)]:0.000} m, the waist ±{rx[waist]:0.000} m; {p.Shapes.Count} shapes");
            return true;
        }

        private static IEnumerable<string> Shapes(SkinnedMeshRenderer r)
        {
            var m = r.sharedMesh;
            for (var i = 0; i < m.blendShapeCount; i++)
            {
                var n = m.GetBlendShapeName(i);
                if (n.StartsWith("body-")) yield return n;
            }
        }

        /// <summary>The torso's sections: per height bin the middle and half-width (x) and half-depth (z), gaps filled
        /// from the neighbours.</summary>
        private static (float[] Cx, float[] Cz, float[] Rx, float[] Rz) Sections(List<SkinnedMeshRenderer> renderers, HashSet<Transform> skip,
            Transform hips, Quaternion frame, float scale, float bottom, float step, int bins)
        {
            var minX = Enumerable.Repeat(float.MaxValue, bins).ToArray();
            var maxX = Enumerable.Repeat(float.MinValue, bins).ToArray();
            var minZ = Enumerable.Repeat(float.MaxValue, bins).ToArray();
            var maxZ = Enumerable.Repeat(float.MinValue, bins).ToArray();
            var inv = Quaternion.Inverse(frame);
            var baked = new Mesh();
            foreach (var r in renderers)
            {
                r.BakeMesh(baked, false);
                var verts = baked.vertices;
                var weights = r.sharedMesh.boneWeights;
                var bones = r.bones;
                for (var i = 0; i < verts.Length; i++)
                {
                    if (i < weights.Length)
                    {
                        var bi = weights[i].boneIndex0;
                        if (bi >= 0 && bi < bones.Length && bones[bi] != null && skip.Contains(bones[bi])) continue;
                    }
                    var local = inv * (r.transform.TransformPoint(verts[i]) - hips.position) / scale;
                    var k = Mathf.FloorToInt((local.y - bottom) / step + 0.5f);
                    if (k < 0 || k >= bins) continue;
                    minX[k] = Mathf.Min(minX[k], local.x); maxX[k] = Mathf.Max(maxX[k], local.x);
                    minZ[k] = Mathf.Min(minZ[k], local.z); maxZ[k] = Mathf.Max(maxZ[k], local.z);
                }
            }
            Object.DestroyImmediate(baked);
            var cx = new float[bins]; var cz = new float[bins]; var rx = new float[bins]; var rz = new float[bins];
            var have = new bool[bins];
            for (var k = 0; k < bins; k++)
            {
                if (maxX[k] < minX[k]) continue;
                have[k] = true;
                cx[k] = (minX[k] + maxX[k]) / 2f; rx[k] = (maxX[k] - minX[k]) / 2f;
                cz[k] = (minZ[k] + maxZ[k]) / 2f; rz[k] = (maxZ[k] - minZ[k]) / 2f;
            }
            for (var k = 0; k < bins; k++)
            {
                if (have[k]) continue;
                int a = k - 1, b = k + 1;
                while (a >= 0 && !have[a]) a--;
                while (b < bins && !have[b]) b++;
                if (a < 0 && b >= bins) continue;
                if (a < 0) { cx[k] = cx[b]; cz[k] = cz[b]; rx[k] = rx[b]; rz[k] = rz[b]; continue; }
                if (b >= bins) { cx[k] = cx[a]; cz[k] = cz[a]; rx[k] = rx[a]; rz[k] = rz[a]; continue; }
                var t = (k - a) / (float)(b - a);
                cx[k] = Mathf.Lerp(cx[a], cx[b], t); cz[k] = Mathf.Lerp(cz[a], cz[b], t);
                rx[k] = Mathf.Lerp(rx[a], rx[b], t); rz[k] = Mathf.Lerp(rz[a], rz[b], t);
            }
            return (cx, cz, rx, rz);
        }
    }
}
