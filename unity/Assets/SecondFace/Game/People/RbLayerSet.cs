using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using SecondFace.Core.Npc;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// A Rocketbox person's layers (the wardrobe rule; owner 2026-11-06: "how is this post apocalyptic/cyberpunk? they look
    /// like they are going for a stroll in california"): work trousers, boots, a gaiter, a jacket, a harness vest and its
    /// straps, a shoulder cape, a belt, arm wraps, shin guards, each cut from this person's own skin at build time (Editor
    /// RocketboxLayers: the body's surface offset outward by the cloth's thickness, hemmed, with the body's own bone weights,
    /// so it fits this body exactly and moves with it, never through it). Stored compact (<see cref="Data"/>); a layer's
    /// mesh is made the first time someone of this body wears it and shared by everyone of that body after. Worn as Core
    /// <see cref="RbLayers"/> chooses, dyed from the person's <see cref="RbDyes"/>, weathered by their grime and wear.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class RbLayerSet : MonoBehaviour
    {
        public const int Version = 1;

        /// <summary>The shells (gzip): "RBL1", the bind poses, then per layer its id, fabric, dye slot, thickness, the
        /// heights it covers, and its vertices (position, normal, uv, four bone indices and weights) and triangles.</summary>
        public TextAsset Data;
        /// <summary>The body's own legs are bare below the knee (shorts, a skirt): work trousers go on whatever the trade.</summary>
        public bool BareLegs;
        public bool BareArms;
        /// <summary>The cloths, by <see cref="Fabric"/> order.</summary>
        public Material[] Fabrics = new Material[0];
        public int Built = 0;

        public enum Fabric { Canvas, Twill, Knit, Leather, Webbing }
        /// <summary>Which of the person's colours a layer takes.</summary>
        public enum Dye { Top, Legs, Accent, Shell, Leather, Linen, Dark }

        public sealed class Layer
        {
            public string Id;
            public Fabric Cloth;
            public Dye Colour;
            public float Thickness, YMin, YMax;
            public Mesh Mesh;
        }

        private static readonly Dictionary<TextAsset, Dictionary<string, Layer>> Cache = new();
        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor"), GrimeId = Shader.PropertyToID("_Grime"), WearId = Shader.PropertyToID("_Wear");

        /// <summary>What this body can wear (read once, shared).</summary>
        public IReadOnlyDictionary<string, Layer> Layers => Read(Data);

        public static Dictionary<string, Layer> Read(TextAsset data)
        {
            if (data == null) return new Dictionary<string, Layer>();
            if (Cache.TryGetValue(data, out var have)) return have;
            var layers = new Dictionary<string, Layer>();
            using (var gz = new GZipStream(new MemoryStream(data.bytes), CompressionMode.Decompress))
            using (var r = new BinaryReader(gz))
            {
                if (new string(r.ReadChars(4)) != "RBL1") throw new InvalidDataException("not a layer set");
                var nb = r.ReadInt32();
                var bind = new Matrix4x4[nb];
                for (var b = 0; b < nb; b++)
                {
                    var m = new Matrix4x4();
                    for (var k = 0; k < 16; k++) m[k] = r.ReadSingle();
                    bind[b] = m;
                }
                var nl = r.ReadInt32();
                for (var l = 0; l < nl; l++)
                {
                    var layer = new Layer { Id = r.ReadString(), Cloth = (Fabric)r.ReadByte(), Colour = (Dye)r.ReadByte(), Thickness = r.ReadSingle(), YMin = r.ReadSingle(), YMax = r.ReadSingle() };
                    var nv = r.ReadInt32();
                    var pos = new Vector3[nv]; var nor = new Vector3[nv]; var uv = new Vector2[nv]; var bw = new BoneWeight[nv];
                    for (var i = 0; i < nv; i++)
                    {
                        pos[i] = new Vector3(r.ReadSingle(), r.ReadSingle(), r.ReadSingle());
                        nor[i] = new Vector3(r.ReadSingle(), r.ReadSingle(), r.ReadSingle());
                        uv[i] = new Vector2(r.ReadSingle(), r.ReadSingle());
                        bw[i] = new BoneWeight
                        {
                            boneIndex0 = r.ReadByte(), boneIndex1 = r.ReadByte(), boneIndex2 = r.ReadByte(), boneIndex3 = r.ReadByte(),
                            weight0 = r.ReadByte() / 255f, weight1 = r.ReadByte() / 255f, weight2 = r.ReadByte() / 255f, weight3 = r.ReadByte() / 255f,
                        };
                    }
                    var nt = r.ReadInt32();
                    var tris = new int[nt];
                    for (var i = 0; i < nt; i++) tris[i] = r.ReadInt32();
                    var mesh = new Mesh { name = "layer_" + layer.Id };
                    if (nv > 65535) mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
                    mesh.vertices = pos; mesh.normals = nor; mesh.uv = uv; mesh.boneWeights = bw; mesh.bindposes = bind;
                    mesh.triangles = tris;
                    mesh.RecalculateTangents();
                    mesh.RecalculateBounds();
                    mesh.UploadMeshData(true);
                    layer.Mesh = mesh;
                    layers[layer.Id] = layer;
                }
            }
            Cache[data] = layers;
            return layers;
        }

        private readonly Dictionary<string, SkinnedMeshRenderer> _worn = new();

        /// <summary>The body's own renderer (the layers share its bones).</summary>
        public SkinnedMeshRenderer Body()
        {
            SkinnedMeshRenderer best = null;
            foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (!r.name.StartsWith("layer_") && r.sharedMesh != null && (best == null || r.sharedMesh.vertexCount > best.sharedMesh.vertexCount)) best = r;
            return best;
        }

        /// <summary>Puts on these layers (and takes off any others), dyed and weathered for this person.</summary>
        public void Wear(IEnumerable<string> ids, RbDyes d)
        {
            var want = new HashSet<string>(ids ?? Array.Empty<string>());
            if (BareLegs && want.Count > 0) want.Add("cargo");
            var all = Layers;
            var body = Body();
            if (body == null) return;
            foreach (var (id, r) in _worn) if (r != null) r.gameObject.SetActive(want.Contains(id));
            var mpb = new MaterialPropertyBlock();
            foreach (var id in want)
            {
                if (!all.TryGetValue(id, out var layer)) continue;
                if (!_worn.TryGetValue(id, out var r) || r == null)
                {
                    var go = new GameObject("layer_" + id);
                    go.transform.SetParent(body.transform.parent, false);
                    go.transform.localPosition = body.transform.localPosition; go.transform.localRotation = body.transform.localRotation; go.transform.localScale = body.transform.localScale;
                    r = go.AddComponent<SkinnedMeshRenderer>();
                    r.sharedMesh = layer.Mesh;
                    r.bones = body.bones;
                    r.rootBone = body.rootBone;
                    r.localBounds = body.localBounds;
                    r.updateWhenOffscreen = false;
                    r.skinnedMotionVectors = false;
                    var f = (int)layer.Cloth;
                    if (f < Fabrics.Length) r.sharedMaterial = Fabrics[f];
                    _worn[id] = r;
                }
                r.gameObject.SetActive(true);
                r.GetPropertyBlock(mpb);
                mpb.SetColor(BaseColorId, RbDress.Colour(Colour(layer.Colour, d)));
                mpb.SetFloat(GrimeId, Mathf.Clamp01((float)d.Grime + 0.15f));
                mpb.SetFloat(WearId, Mathf.Clamp01((float)d.Wear * 0.7f));
                r.SetPropertyBlock(mpb);
            }
            // the arms keep clear of what is worn over the torso as of the torso itself
            var profile = GetComponentInChildren<TorsoProfile>();
            if (profile != null && profile.Bins > 0)
            {
                var gx = new float[profile.Bins];
                var hips = GetComponentInChildren<Animator>()?.GetBoneTransform(HumanBodyBones.Hips);
                var baseY = hips != null ? transform.InverseTransformPoint(hips.position).y : 1f;
                foreach (var id in want)
                {
                    if (!all.TryGetValue(id, out var layer)) continue;
                    for (var k = 0; k < profile.Bins; k++)
                    {
                        var y = baseY + profile.Bottom + k * profile.Step;
                        if (y >= layer.YMin && y <= layer.YMax) gx[k] = Mathf.Max(gx[k], layer.Thickness);
                    }
                }
                profile.Wearing(new[] { (gx, gx) });
            }
            // and of each layer where it lies over the skin
            var skin = GetComponentInChildren<BodySkin>();
            if (skin != null)
            {
                var thick = new Dictionary<string, float>();
                foreach (var id in want) if (all.TryGetValue(id, out var layer)) thick[id] = layer.Thickness;
                skin.Wear(thick);
            }
        }

        private static int Colour(Dye slot, RbDyes d) => slot switch
        {
            Dye.Top => d.Top,
            Dye.Legs => d.Legs,
            Dye.Accent => d.Accent,
            Dye.Shell => d.Shell != 0 ? d.Shell : d.Accent,
            Dye.Leather => d.Leather != 0 ? d.Leather : 0x3b2a1e,
            Dye.Linen => 0xb5a98e,
            _ => 0x262321,
        };
    }
}
