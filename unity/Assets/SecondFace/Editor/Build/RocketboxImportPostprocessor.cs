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
    /// </summary>
    public sealed class RocketboxImportPostprocessor : AssetPostprocessor
    {
        public override uint GetVersion() => 3;

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

        private void OnPostprocessModel(GameObject root)
        {
            if (!assetPath.StartsWith(People)) return;
            // each vertex's height on the body, along the mesh's tallest axis (the 3ds Max export stands the bind pose on
            // its own axes), 0 at the lowest vertex of all the person's meshes, 1 at the highest
            var meshes = root.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (meshes.Length == 0) return;
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
