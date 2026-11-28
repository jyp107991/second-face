using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Microsoft Rocketbox avatars (MIT, docs/PEOPLE_RESEARCH.md §7): the four under evaluation (Assets/ThirdParty/Rocketbox)
    /// and the game's people (Assets/SecondFace/People/Rocketbox, L3: each person's FBX with its head as photographed or
    /// opened, its body's clothes made neutral by the outfit bake, tools/unity/people/rb_outfit.py). Their FBX as a humanoid
    /// (3ds Max biped bones, Bip01), each vertex's height on the body written into its colour (red: 0 at the soles, 1 at
    /// the crown) for the Person shader's grime; their textures with the normal maps marked so and the dye masks linear
    /// (data, not colour). Scoped to those folders; Rocketbox's own postprocessor is project-wide and is not used.
    /// The game's people are re-parented at import (<see cref="Moves"/>, docs/MOTION_ROOT_CAUSE.md §16 (a)): the Biped hangs the
    /// clavicles from the neck and the thighs from the spine, so a bend of either moved the shoulder and hip joints and Unity's
    /// humanoid, which reads the body's orientation from those joints, turned the whole skeleton 2-19° from the clips' actors
    /// (cause B). The hierarchy is changed before the avatar is built, the bind kept in the world, so the skinning is unchanged.
    /// </summary>
    public sealed class RocketboxImportPostprocessor : AssetPostprocessor
    {
        public override uint GetVersion() => 5;

        private const string Dir = "Assets/ThirdParty/Rocketbox/";
        public const string People = "Assets/SecondFace/People/Rocketbox/";

        private bool Ours => assetPath.StartsWith(Dir) || assetPath.StartsWith(People);

        private void OnPreprocessModel()
        {
            if (!Ours) return;
            var imp = (ModelImporter)assetImporter;
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.importAnimation = false;
            imp.importBlendShapes = true;
            imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            if (assetPath.StartsWith(People))
            {
                // (the FBX's own materials only name the slots: RocketboxPeopleBuild puts the people's in their place)
                imp.meshCompression = ModelImporterMeshCompression.Off;
                imp.isReadable = false;
            }
        }

        /// <summary>The Biped bones the people's import re-parents (bone, the file's parent, the parent at import): the thighs to
        /// the pelvis and the clavicles to the upper chest, as a human's hip joints sit in the pelvis and the shoulder girdle on
        /// the rib cage (docs/MOTION_ROOT_CAUSE.md §16 (a)).</summary>
        public static readonly (string Bone, string From, string To)[] Moves =
        {
            ("Bip01 L Thigh", "Bip01 Spine", "Bip01 Pelvis"), ("Bip01 R Thigh", "Bip01 Spine", "Bip01 Pelvis"),
            ("Bip01 L Clavicle", "Bip01 Neck", "Bip01 Spine2"), ("Bip01 R Clavicle", "Bip01 Neck", "Bip01 Spine2"),
        };

        private static readonly FieldInfo ParentField = typeof(SkeletonBone).GetField("parentName", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);

        private static string ParentName(SkeletonBone b) => ParentField?.GetValue(b) as string;

        private static SkeletonBone WithParent(SkeletonBone b, string parent)
        {
            object boxed = b;
            ParentField?.SetValue(boxed, parent);
            return (SkeletonBone)boxed;
        }

        /// <summary>Whether a person's configuration is the re-parented hierarchy's: its T-pose entries for the moved bones name
        /// their new parents (<see cref="Reparent"/> wrote them), or it is empty (a fresh mapping, which Unity fills from the
        /// hierarchy as this import leaves it).</summary>
        public static bool ForMoves(HumanDescription hd)
        {
            if (hd.skeleton == null || hd.skeleton.Length == 0) return true;
            foreach (var (bone, _, to) in Moves)
            {
                var e = hd.skeleton.FirstOrDefault(b => b.name == bone);
                if (e.name == bone && ParentName(e) != to) return false;
            }
            return true;
        }

        /// <summary>Before the avatar and the clips are made (Unity's own order for this callback): the moved bones put under
        /// their new parents with their world place and turn kept, where the person's configuration is for it.</summary>
        private void OnPostprocessMeshHierarchy(GameObject root)
        {
            if (!assetPath.StartsWith(People)) return;
            var imp = (ModelImporter)assetImporter;
            if (!ForMoves(imp.humanDescription)) return;
            var all = root.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First());
            foreach (var (bone, from, to) in Moves)
                if (all.TryGetValue(bone, out var c) && all.TryGetValue(to, out var p) && c.parent != p) c.SetParent(p, true);
        }

        /// <summary>
        /// One person's configured T-pose rewritten for the re-parented hierarchy (<see cref="Moves"/>): each moved bone's entry
        /// put in its new parent's frame from the T-pose's own world pose (the chain as the file has it), its parent named, the
        /// rest as it was; then imported again, which re-parents the hierarchy to match. Runs once per person (idempotent:
        /// a configuration already for the moves is left). The positions go back as the getter gave them: on these stored
        /// configurations the setter keeps what it is given (scaled by the file's scale, as Ground does for a fresh one, every
        /// bone came in 100 times too small: tried 2026-11-28, caught by the check below and restored). After the import every
        /// unmoved bone's entry must read as it did and every moved bone's T-pose stand where it stood in the world; else the
        /// configuration is put back as it was.
        /// </summary>
        public static bool Reparent(string path)
        {
            var imp = AssetImporter.GetAtPath(path) as ModelImporter;
            if (imp == null || !path.StartsWith(People) || !File.Exists(path)) return false;
            var hd = imp.humanDescription;
            if (hd.skeleton == null || hd.skeleton.Length == 0 || ForMoves(hd)) return false;
            if (ParentField == null) { Debug.LogError("RocketboxImportPostprocessor: SkeletonBone has no parentName field"); return false; }
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (model == null) return false;
            var tr = model.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First());
            foreach (var (bone, from, _) in Moves)
                if (!tr.TryGetValue(bone, out var t) || t.parent == null || t.parent.name != from)
                {
                    Debug.LogError($"RocketboxImportPostprocessor: {path}: {bone} hangs from {(t == null || t.parent == null ? "nothing" : t.parent.name)}, not {from}, with the configuration still the file's");
                    return false;
                }
            var w = TakeStance.World(hd.skeleton, model);
            var sk = hd.skeleton.ToArray();
            foreach (var (bone, _, to) in Moves)
            {
                var i = System.Array.FindIndex(sk, b => b.name == bone);
                if (i < 0 || !w.ContainsKey(to)) { Debug.LogError($"RocketboxImportPostprocessor: {path}: no T-pose entry for {bone} or {to}"); return false; }
                var (pp, pr) = w[to]; var (cp, cr) = w[bone];
                sk[i].position = Quaternion.Inverse(pr) * (cp - pp);
                sk[i].rotation = Quaternion.Inverse(pr) * cr;
                sk[i] = WithParent(sk[i], to);
            }
            var orig = hd.skeleton.ToArray();
            hd.skeleton = sk;
            imp.humanDescription = hd;
            imp.SaveAndReimport();
            imp = (ModelImporter)AssetImporter.GetAtPath(path);
            // what Unity built from it: the hierarchy moved, the avatar whole, every moved bone's T-pose where it was in the world
            var after = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
            var tn = after.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First());
            var wrong = Moves.Where(m => !tn.TryGetValue(m.Bone, out var t) || t.parent == null || t.parent.name != m.To).Select(m => m.Bone).ToList();
            var now = imp.humanDescription.skeleton;
            var w2 = TakeStance.World(now, after);
            var drift = Moves.Max(m => Mathf.Max((w2[m.Bone].p - w[m.Bone].p).magnitude * 100f, Quaternion.Angle(w2[m.Bone].r, w[m.Bone].r)));
            var moved = new System.Collections.Generic.HashSet<string>(Moves.Select(m => m.Bone));
            var stored = now.GroupBy(b => b.name).ToDictionary(g => g.Key, g => g.First());
            var others = orig.Where(b => !moved.Contains(b.name)).Max(b => stored.TryGetValue(b.name, out var x) ? Mathf.Max((x.position - b.position).magnitude * 100f, Quaternion.Angle(x.rotation, b.rotation)) : 999f);
            if (avatar == null || !avatar.isValid || !avatar.isHuman || wrong.Count > 0 || drift > 0.01f || others > 0.0001f)
            {
                Debug.LogError($"RocketboxImportPostprocessor: {path}: re-parented, yet the avatar is {(avatar == null ? "missing" : avatar.isValid && avatar.isHuman ? "whole" : "not a valid human")}, unmoved {string.Join(",", wrong)}, the moved bones' T-pose off by up to {drift:0.000} and the others' entries by {others:0.0000} (cm or °): the configuration put back");
                var back = imp.humanDescription; back.skeleton = orig; imp.humanDescription = back; imp.SaveAndReimport();
                return false;
            }
            Debug.Log($"RocketboxImportPostprocessor: {path}: re-parented (thighs to the pelvis, clavicles to the upper chest), the moved T-pose kept within {drift:0.0000}, the others' entries within {others:0.00000} (cm or °)");
            return true;
        }

        /// <summary>Every person re-parented (<see cref="Reparent"/>): a batch run's step after an import with this version.
        /// <c>tools/unity/editor.sh run SecondFace.EditorTools.RocketboxImportPostprocessor.ReparentAll</c>.</summary>
        public static void ReparentAll()
        {
            var paths = Directory.GetFiles(People, "*.fbx", SearchOption.AllDirectories).Select(p => p.Replace('\\', '/')).Where(p => Path.GetFileNameWithoutExtension(p) == Path.GetFileName(Path.GetDirectoryName(p))).OrderBy(p => p).ToList();
            var n = 0;
            foreach (var p in paths)
            {
                var imp = AssetImporter.GetAtPath(p) as ModelImporter;
                if (imp != null && ForMoves(imp.humanDescription)) { n++; continue; }
                if (!Reparent(p)) { Debug.LogError($"RocketboxImportPostprocessor: stopped at {p}: {n} of {paths.Count} people re-parented"); return; }
                n++;
            }
            Debug.Log($"RocketboxImportPostprocessor: re-parented {n} of {paths.Count} people");
        }

        private void OnPostprocessModel(GameObject root)
        {
            if (!assetPath.StartsWith(People)) return;
            var meshes = root.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (meshes.Length == 0) return;
            // the slimmed sleeves, where a base has them (BodySlim, beside the FBX): first, so everything measured from the
            // body's mesh (its heights, the flank correctives, the skin points and the layers) is measured on them
            var slimBody = BodySlim.Body(root);
            var slim = BodySlim.PathFor(assetPath);
            if (slimBody != null && System.IO.File.Exists(slim))
            {
                context.DependsOnSourceAsset(slim);
                var (dp, dn) = BodySlim.ReadFor(assetPath, slimBody.sharedMesh.vertexCount);
                if (dp == null) Debug.LogWarning($"RocketboxImportPostprocessor: {slim} is not for {assetPath}'s body ({slimBody.sharedMesh.vertexCount} vertices)");
                else BodySlim.Apply(slimBody.sharedMesh, dp, dn);
            }
            // each vertex's height on the body, along the mesh's tallest axis (the 3ds Max export stands the bind pose on
            // its own axes), 0 at the lowest vertex of all the person's meshes, 1 at the highest
            var lo = Vector3.positiveInfinity; var hi = Vector3.negativeInfinity;
            foreach (var r in meshes)
            {
                var b = r.sharedMesh.bounds;
                lo = Vector3.Min(lo, b.min); hi = Vector3.Max(hi, b.max);
            }
            var size = hi - lo;
            var axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
            foreach (var r in meshes)
            {
                var m = r.sharedMesh;
                var v = m.vertices;
                var c = new Color[v.Length];
                for (var i = 0; i < v.Length; i++)
                    c[i] = new Color(Mathf.Clamp01((v[i][axis] - lo[axis]) / Mathf.Max(size[axis], 1e-4f)), 0f, 0f, 1f);
                m.colors = c;
            }
            // the flank correctives, once measured (BodyCorrectives, beside the FBX): on the body's own mesh, the largest
            Mesh body = null;
            foreach (var r in meshes) if (r.sharedMesh != null && (body == null || r.sharedMesh.vertexCount > body.vertexCount)) body = r.sharedMesh;
            var flank = BodyCorrectives.PathFor(assetPath);
            if (body == null || !System.IO.File.Exists(flank)) return;
            context.DependsOnSourceAsset(flank);
            var (fl, fr) = BodyCorrectives.ReadFor(assetPath, body.vertexCount);
            if (fl == null) { Debug.LogWarning($"RocketboxImportPostprocessor: {flank} is not for {assetPath}'s body ({body.vertexCount} vertices)"); return; }
            if (body.GetBlendShapeIndex(BodyCorrectives.ShapeL) < 0) body.AddBlendShapeFrame(BodyCorrectives.ShapeL, 100f, fl, null, null);
            if (body.GetBlendShapeIndex(BodyCorrectives.ShapeR) < 0) body.AddBlendShapeFrame(BodyCorrectives.ShapeR, 100f, fr, null, null);
        }

        private void OnPreprocessTexture()
        {
            if (!Ours) return;
            var imp = (TextureImporter)assetImporter;
            var low = assetPath.ToLowerInvariant();
            if (low.Contains("normal"))
            {
                imp.textureType = TextureImporterType.NormalMap;
                imp.convertToNormalmap = false;
            }
            imp.maxTextureSize = assetPath.StartsWith(People) ? 1024 : 2048;
            if (low.EndsWith("_dye.png"))
            {
                imp.sRGBTexture = false;
                imp.alphaIsTransparency = false;
                imp.alphaSource = TextureImporterAlphaSource.FromInput;
            }
            if (low.Contains("opacity")) imp.alphaIsTransparency = true;
        }
    }
}
