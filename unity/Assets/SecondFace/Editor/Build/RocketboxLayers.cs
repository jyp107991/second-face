using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The layers a Rocketbox person wears over their own clothes (the wardrobe rule; owner 2026-11-06: "a stroll in
    /// california"), cut from that person's own skin: each layer keeps the triangles of the body's surface that lie where
    /// the garment lies (by the bone that moves them and by height against the body's own joints), offsets them outward by
    /// the cloth's thickness along the surface's normals, hems the open edges back to the body, and keeps each vertex's own
    /// bone weights, so the layer fits this body exactly and moves with it, never through it. UVs are a box projection at
    /// the cloth's real scale (a tile is 30 cm). Written to &lt;id&gt;_layers.bytes beside the person (gzip: RbLayerSet reads it)
    /// with an RbLayerSet on the prefab; the cloths are SecondFace/Cloth materials over tools/unity/people/rb_fabrics.py's
    /// textures. Also measures whether the body's own legs and arms are bare.
    /// </summary>
    public static class RocketboxLayers
    {
        public const string Fabrics = "Assets/SecondFace/People/Rocketbox/Layers/Fabrics";

        private enum Fam { None, Torso, Neck, Head, Shoulder, UpperArm, Forearm, Hand, Finger, Thigh, Shin, Foot }

        private struct V
        {
            public Vector3 P;      // in the body's frame at rest (x right, y up, z forward), m
            public Vector3 N;
            public Fam F;
            public int Side;       // -1 left, +1 right, 0 middle
            public bool Skin;
        }

        /// <summary>The body's own joints at rest, in its frame.</summary>
        private sealed class Joints
        {
            public float Hips, Waist, Chest, ChestTop, Neck, NeckTop, Knee, Ankle;
            public Vector3 ShoulderL, ShoulderR, WristL, WristR, HandL, HandR, KneeL, KneeR, AnkleL, AnkleR;
        }

        private sealed class Def
        {
            public string Id;
            public RbLayerSet.Fabric Cloth;
            public RbLayerSet.Dye Colour;
            public float Thick;
            public Func<V, Joints, bool> Keep;
            public Func<V, Joints, float> ThickAt;   // optional per-vertex thickness (boots: thin at the foot, a shaft over the trousers)
            public float Tile = 0.3f;
        }

        private static readonly Def[] Defs =
        {
            // work trousers, from the hips to the top of the boot
            new() { Id = "cargo", Cloth = RbLayerSet.Fabric.Twill, Colour = RbLayerSet.Dye.Legs, Thick = 0.006f,
                Keep = (v, j) => ((v.F is Fam.Thigh or Fam.Shin) && v.P.y >= j.Ankle + 0.06f) || (v.F == Fam.Torso && v.P.y <= j.Hips + 0.07f) },
            // boots: the foot and a shaft to mid-shin, over the trousers' hem (the sole stays where it is: no foot through the ground)
            new() { Id = "boots", Cloth = RbLayerSet.Fabric.Leather, Colour = RbLayerSet.Dye.Leather, Thick = 0.004f, Tile = 0.2f,
                Keep = (v, j) => v.F == Fam.Foot || (v.F == Fam.Shin && v.P.y <= j.Ankle + 0.2f),
                ThickAt = (v, j) => v.N.y < -0.35f ? 0f : v.F == Fam.Foot ? (v.P.y < 0.03f ? 0.003f : 0.004f) : Mathf.Lerp(0.006f, 0.012f, Mathf.InverseLerp(j.Ankle + 0.02f, j.Ankle + 0.08f, v.P.y)) },
            // a neck gaiter worn down: the neck and a bib on the upper chest and back
            new() { Id = "gaiter", Cloth = RbLayerSet.Fabric.Knit, Colour = RbLayerSet.Dye.Accent, Thick = 0.008f,
                Keep = (v, j) => (v.F == Fam.Neck && v.P.y <= j.NeckTop - 0.03f)
                                 || ((v.F is Fam.Torso or Fam.Shoulder) && Mathf.Abs(v.P.x) <= 0.11f && (v.P.z > 0f ? v.P.y >= j.ChestTop - 0.02f : v.P.y >= j.Neck - 0.03f)) },
            // a work jacket: torso to the waist, sleeves to the wrist, a stand collar
            new() { Id = "bomber", Cloth = RbLayerSet.Fabric.Twill, Colour = RbLayerSet.Dye.Shell, Thick = 0.009f,
                Keep = (v, j) => ((v.F is Fam.Torso or Fam.Shoulder) && v.P.y >= j.Waist - 0.04f) || v.F == Fam.UpperArm
                                 || (v.F == Fam.Forearm && Vector3.Distance(v.P, v.Side < 0 ? j.WristL : j.WristR) > 0.025f) || (v.F == Fam.Neck && v.P.y <= j.Neck + 0.04f) },
            // a harness vest: torso and shoulders, sleeveless, a round neck at the front, to the waist
            new() { Id = "vest", Cloth = RbLayerSet.Fabric.Canvas, Colour = RbLayerSet.Dye.Shell, Thick = 0.013f,
                Keep = (v, j) => (v.F is Fam.Torso or Fam.Shoulder) && v.P.y >= j.Waist - 0.06f && !(v.P.y > j.ChestTop - 0.03f && Mathf.Abs(v.P.x) < 0.075f && v.P.z > 0f)
                                 && Vector3.Distance(v.P, v.P.x < 0 ? j.ShoulderL : j.ShoulderR) > 0.05f },
            // its webbing: two shoulder straps front and back and a band at the waist
            new() { Id = "straps", Cloth = RbLayerSet.Fabric.Webbing, Colour = RbLayerSet.Dye.Dark, Thick = 0.017f, Tile = 0.15f,
                Keep = (v, j) => (v.F is Fam.Torso or Fam.Shoulder) && v.P.y >= j.Waist - 0.06f
                                 && ((Mathf.Abs(Mathf.Abs(v.P.x) - 0.095f) < 0.02f && v.P.y >= j.Chest - 0.06f) || Mathf.Abs(v.P.y - (j.Waist + 0.0f)) < 0.025f) },
            // a shoulder cape: the shoulders, the upper chest, the back to below the shoulder blades, the top of the arms
            new() { Id = "cape", Cloth = RbLayerSet.Fabric.Canvas, Colour = RbLayerSet.Dye.Accent, Thick = 0.019f,
                Keep = (v, j) => v.F == Fam.Shoulder || ((v.F is Fam.Torso) && (v.P.y >= j.ChestTop - 0.06f || (v.P.z < -0.02f && v.P.y >= j.Chest - 0.08f)))
                                 || (v.F == Fam.UpperArm && Vector3.Distance(v.P, v.P.x < 0 ? j.ShoulderL : j.ShoulderR) < 0.13f) || (v.F == Fam.Neck && v.P.y <= j.Neck + 0.02f) },
            // a belt at the hips, over the trousers and the vest's hem
            new() { Id = "belt", Cloth = RbLayerSet.Fabric.Leather, Colour = RbLayerSet.Dye.Leather, Thick = 0.017f, Tile = 0.2f,
                Keep = (v, j) => v.F == Fam.Torso && Mathf.Abs(v.P.y - (j.Hips + 0.035f)) < 0.028f },
            // arm wraps: the forearm's lower half and the palm, the fingers bare
            new() { Id = "wraps", Cloth = RbLayerSet.Fabric.Canvas, Colour = RbLayerSet.Dye.Linen, Thick = 0.004f, Tile = 0.15f,
                Keep = (v, j) => (v.F == Fam.Forearm && Vector3.Distance(v.P, v.Side < 0 ? j.WristL : j.WristR) < 0.14f) || v.F == Fam.Hand },
            // shin guards: the front of the shin, knee to boot, over the trousers and the boot's shaft
            new() { Id = "shins", Cloth = RbLayerSet.Fabric.Leather, Colour = RbLayerSet.Dye.Leather, Thick = 0.015f, Tile = 0.2f,
                Keep = (v, j) => (v.F is Fam.Shin or Fam.Thigh) && v.P.y >= j.Ankle + 0.1f && v.P.y <= j.Knee + 0.06f
                                 && v.P.z > Mathf.Lerp(v.Side < 0 ? j.AnkleL.z : j.AnkleR.z, v.Side < 0 ? j.KneeL.z : j.KneeR.z, Mathf.InverseLerp(j.Ankle, j.Knee, v.P.y)) },
        };

        /// <summary>The cloths (made once, from the fabric textures).</summary>
        public static Material[] Materials()
        {
            var shader = Shader.Find("SecondFace/Cloth");
            var names = Enum.GetNames(typeof(RbLayerSet.Fabric)).Select(n => n.ToLowerInvariant()).ToArray();
            var mats = new Material[names.Length];
            for (var i = 0; i < names.Length; i++)
            {
                var path = $"{Fabrics}/{names[i]}.mat";
                var m = AssetDatabase.LoadAssetAtPath<Material>(path);
                var fresh = m == null;
                if (fresh) m = new Material(shader);
                m.shader = shader;
                var col = AssetDatabase.LoadAssetAtPath<Texture2D>($"{Fabrics}/{names[i]}_color.png");
                var nrmPath = $"{Fabrics}/{names[i]}_normal.png";
                if (AssetImporter.GetAtPath(nrmPath) is TextureImporter ti && ti.textureType != TextureImporterType.NormalMap)
                {
                    ti.textureType = TextureImporterType.NormalMap; ti.SaveAndReimport();
                }
                var nrm = AssetDatabase.LoadAssetAtPath<Texture2D>(nrmPath);
                if (col != null) m.SetTexture("_BaseMap", col);
                if (nrm != null) m.SetTexture("_BumpMap", nrm);
                m.SetFloat("_BumpScale", 1f);
                m.SetColor("_BaseColor", Color.white);
                m.SetFloat("_Dyed", 1f);
                m.SetFloat("_Smoothness", names[i] == "leather" ? 0.38f : 0.18f);
                m.SetFloat("_Cull", 0f);
                m.SetFloat("_Cutoff", 0.01f);
                if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
                mats[i] = m;
            }
            return mats;
        }

        /// <summary>Cuts the layers from a person at rest (a prefab's contents being built), writes them beside it and puts an
        /// RbLayerSet on it. False when it is not a person.</summary>
        public static bool Build(GameObject go, string dir, string id, Material[] cloths)
        {
            var anim = go.GetComponentInChildren<Animator>();
            var smr = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.sharedMesh != null).OrderByDescending(r => r.sharedMesh.vertexCount).FirstOrDefault();
            if (anim == null || !anim.isHuman || smr == null) return false;
            var mesh = smr.sharedMesh;
            var root = anim.transform;
            Transform B(HumanBodyBones b) => anim.GetBoneTransform(b);
            Vector3 Local(Vector3 world) => root.InverseTransformPoint(world);
            var j = new Joints
            {
                Hips = Local(B(HumanBodyBones.Hips).position).y,
                Waist = Local(B(HumanBodyBones.Spine).position).y,
                Chest = Local((B(HumanBodyBones.Chest) ?? B(HumanBodyBones.Spine)).position).y,
                ChestTop = Local((B(HumanBodyBones.UpperChest) ?? B(HumanBodyBones.Chest)).position).y,
                Neck = Local(B(HumanBodyBones.Neck).position).y,
                NeckTop = Local(B(HumanBodyBones.Head).position).y,
                ShoulderL = Local(B(HumanBodyBones.LeftUpperArm).position), ShoulderR = Local(B(HumanBodyBones.RightUpperArm).position),
                WristL = Local(B(HumanBodyBones.LeftHand).position), WristR = Local(B(HumanBodyBones.RightHand).position),
                KneeL = Local(B(HumanBodyBones.LeftLowerLeg).position), KneeR = Local(B(HumanBodyBones.RightLowerLeg).position),
                AnkleL = Local(B(HumanBodyBones.LeftFoot).position), AnkleR = Local(B(HumanBodyBones.RightFoot).position),
            };
            j.Knee = (j.KneeL.y + j.KneeR.y) * 0.5f; j.Ankle = (j.AnkleL.y + j.AnkleR.y) * 0.5f;
            // the upper chest sits high on some rigs: the chest's top is a little under the neck
            j.ChestTop = Mathf.Min(j.ChestTop, j.Neck - 0.06f);

            // each bone's family: the nearest humanoid bone up its chain
            var fam = new Dictionary<Transform, (Fam, int)>();
            void Mark(HumanBodyBones b, Fam f, int side) { var t = B(b); if (t != null) fam[t] = (f, side); }
            Mark(HumanBodyBones.Hips, Fam.Torso, 0); Mark(HumanBodyBones.Spine, Fam.Torso, 0); Mark(HumanBodyBones.Chest, Fam.Torso, 0); Mark(HumanBodyBones.UpperChest, Fam.Torso, 0);
            Mark(HumanBodyBones.Neck, Fam.Neck, 0); Mark(HumanBodyBones.Head, Fam.Head, 0);
            foreach (var (s, side) in new[] { ("Left", -1), ("Right", 1) })
            {
                Mark(Parse(s + "Shoulder"), Fam.Shoulder, side); Mark(Parse(s + "UpperArm"), Fam.UpperArm, side); Mark(Parse(s + "LowerArm"), Fam.Forearm, side);
                Mark(Parse(s + "Hand"), Fam.Hand, side); Mark(Parse(s + "UpperLeg"), Fam.Thigh, side); Mark(Parse(s + "LowerLeg"), Fam.Shin, side);
                Mark(Parse(s + "Foot"), Fam.Foot, side); Mark(Parse(s + "Toes"), Fam.Foot, side);
                foreach (var f in new[] { "Thumb", "Index", "Middle", "Ring", "Little" })
                    foreach (var p in new[] { "Proximal", "Intermediate", "Distal" }) Mark(Parse(s + f + p), Fam.Finger, side);
            }
            (Fam, int) FamOf(Transform t)
            {
                for (var c = t; c != null; c = c.parent) if (fam.TryGetValue(c, out var f)) return f;
                return (Fam.None, 0);
            }
            var bones = smr.bones;
            var boneFam = bones.Select(b => b != null ? FamOf(b) : (Fam.None, 0)).ToArray();

            // the vertices at rest, in the body's frame; which are skin (no dye group in the body's mask)
            var pos = mesh.vertices; var nor = mesh.normals; var uv = mesh.uv; var bw = mesh.boneWeights;
            var toWorld = smr.transform.localToWorldMatrix;
            var dye = DyeMask(dir, smr);
            var bodySub = BodySubmesh(smr);
            var inBody = new bool[pos.Length];
            if (bodySub >= 0) foreach (var i in mesh.GetTriangles(bodySub)) inBody[i] = true;
            var V = new V[pos.Length];
            for (var i = 0; i < pos.Length; i++)
            {
                var (f, side) = i < bw.Length ? boneFam[bw[i].boneIndex0] : (Fam.None, 0);
                var p = Local(toWorld.MultiplyPoint3x4(pos[i]));
                var n = root.InverseTransformDirection(toWorld.MultiplyVector(nor[i])).normalized;
                var skin = !inBody[i] || dye == null || i >= uv.Length || Sum(dye, uv[i]) < 0.15f;
                V[i] = new V { P = p, N = n, F = f, Side = side != 0 ? side : (p.x < 0 ? -1 : 1), Skin = skin };
            }
            // bare legs and arms: most of the lower shin's or the forearm's surface is skin
            float Share(Func<V, bool> where) { var all = V.Where(where).ToList(); return all.Count == 0 ? 0f : all.Count(v => v.Skin) / (float)all.Count; }
            var bareLegs = Share(v => v.F == Fam.Shin && v.P.y > j.Ankle + 0.1f && v.P.y < j.Knee - 0.05f) > 0.5f;
            var bareArms = Share(v => v.F == Fam.Forearm) > 0.5f;

            // the triangles a layer may use: the body's and the head's (the neck), never the hair's or the lashes'
            var tris = new List<int>();
            for (var sub = 0; sub < mesh.subMeshCount; sub++)
            {
                var mats = smr.sharedMaterials;
                var name = sub < mats.Length && mats[sub] != null ? mats[sub].name.ToLowerInvariant() : "";
                if (name.Contains("opacity") || name.Contains("hair") || name.Contains("lash") || name.Contains("eye")) continue;
                tris.AddRange(mesh.GetTriangles(sub));
            }
            var meshScale = Mathf.Max(1e-4f, smr.transform.lossyScale.y);
            var invRoot = Quaternion.Inverse(root.rotation);

            using var ms = new MemoryStream();
            using (var gz = new GZipStream(ms, System.IO.Compression.CompressionLevel.Optimal, true))
            using (var w = new BinaryWriter(gz))
            {
                w.Write("RBL1".ToCharArray());
                var bp = mesh.bindposes;
                w.Write(bp.Length);
                foreach (var m in bp) for (var k = 0; k < 16; k++) w.Write(m[k]);
                w.Write(Defs.Length);
                var report = new List<string>();
                foreach (var def in Defs)
                {
                    var keep = new bool[pos.Length];
                    for (var i = 0; i < pos.Length; i++) keep[i] = def.Keep(V[i], j);
                    var kept = new List<int>();
                    for (var t = 0; t + 2 < tris.Count; t += 3)
                        if (keep[tris[t]] && keep[tris[t + 1]] && keep[tris[t + 2]]) { kept.Add(tris[t]); kept.Add(tris[t + 1]); kept.Add(tris[t + 2]); }
                    WriteLayer(w, def, kept, pos, nor, bw, V, j, meshScale, out var nv, out var yMin, out var yMax);
                    report.Add($"{def.Id} {nv}");
                }
                Debug.Log($"RocketboxLayers: {id}: {string.Join(", ", report)}; bare legs {bareLegs}, bare arms {bareArms}");
            }
            var outPath = $"{dir}/{id}_layers.bytes";
            File.WriteAllBytes(outPath, ms.ToArray());
            AssetDatabase.ImportAsset(outPath);
            var set = go.GetComponent<RbLayerSet>() ?? go.AddComponent<RbLayerSet>();
            set.Data = AssetDatabase.LoadAssetAtPath<TextAsset>(outPath);
            set.BareLegs = bareLegs; set.BareArms = bareArms;
            set.Fabrics = cloths;
            set.Built = RbLayerSet.Version;
            return true;
        }

        private static HumanBodyBones Parse(string name) => (HumanBodyBones)Enum.Parse(typeof(HumanBodyBones), name);

        private static void WriteLayer(BinaryWriter w, Def def, List<int> kept, Vector3[] pos, Vector3[] nor, BoneWeight[] bw, V[] V, Joints j, float meshScale,
            out int count, out float yMin, out float yMax)
        {
            // the layer's own vertices: each kept body vertex offset outward (in the mesh's own units), and a hem: every open
            // edge (by position: a UV seam is not an edge of the garment) turned back down to the body
            var map = new Dictionary<int, int>();
            var P = new List<Vector3>(); var N = new List<Vector3>(); var U = new List<Vector2>(); var W = new List<BoneWeight>(); var T = new List<int>();
            var inner = new Dictionary<int, int>();
            var lo = float.MaxValue; var hi = float.MinValue; var outermost = 0f;
            Vector2 Uv(V v, float tile)
            {
                var a = new Vector3(Mathf.Abs(v.N.x), Mathf.Abs(v.N.y), Mathf.Abs(v.N.z));
                var q = v.P / tile;
                return a.x >= a.y && a.x >= a.z ? new Vector2(q.z, q.y) : a.y >= a.z ? new Vector2(q.x, q.z) : new Vector2(q.x, q.y);
            }
            int Out(int i)
            {
                if (map.TryGetValue(i, out var k)) return k;
                var thick = def.ThickAt != null ? def.ThickAt(V[i], j) : def.Thick;
                outermost = Mathf.Max(outermost, thick);
                k = P.Count;
                P.Add(pos[i] + nor[i].normalized * (thick / meshScale)); N.Add(nor[i]); U.Add(Uv(V[i], def.Tile)); W.Add(bw[i]);
                map[i] = k;
                lo = Mathf.Min(lo, V[i].P.y); hi = Mathf.Max(hi, V[i].P.y);
                return k;
            }
            int In(int i)
            {
                if (inner.TryGetValue(i, out var k)) return k;
                k = P.Count;
                P.Add(pos[i] + nor[i].normalized * (0.0015f / meshScale)); N.Add(nor[i]); U.Add(Uv(V[i], def.Tile) + new Vector2(0.02f, 0f)); W.Add(bw[i]);
                inner[i] = k;
                return k;
            }
            for (var t = 0; t < kept.Count; t += 3) { T.Add(Out(kept[t])); T.Add(Out(kept[t + 1])); T.Add(Out(kept[t + 2])); }
            // the open edges, welded by position
            string Key(int i) { var p = pos[i]; return $"{Mathf.RoundToInt(p.x * 1e4f)},{Mathf.RoundToInt(p.y * 1e4f)},{Mathf.RoundToInt(p.z * 1e4f)}"; }
            var edges = new Dictionary<(string, string), (int A, int B, int Count)>();
            for (var t = 0; t < kept.Count; t += 3)
                for (var e = 0; e < 3; e++)
                {
                    var a = kept[t + e]; var b = kept[t + (e + 1) % 3];
                    var ka = Key(a); var kb = Key(b);
                    var key = string.CompareOrdinal(ka, kb) < 0 ? (ka, kb) : (kb, ka);
                    edges[key] = edges.TryGetValue(key, out var x) ? (x.A, x.B, x.Count + 1) : (a, b, 1);
                }
            foreach (var (_, (a, b, c)) in edges)
            {
                if (c != 1) continue;
                var oa = Out(a); var ob = Out(b); var ia = In(a); var ib = In(b);
                T.Add(oa); T.Add(ib); T.Add(ob);
                T.Add(oa); T.Add(ia); T.Add(ib);
            }
            count = P.Count;
            yMin = lo; yMax = hi;
            // (its thickness as built: the outermost offset of any of its vertices, what G1 holds it to)
            w.Write(def.Id); w.Write((byte)def.Cloth); w.Write((byte)def.Colour); w.Write(count > 0 ? outermost : def.Thick);
            w.Write(count > 0 ? yMin : 0f); w.Write(count > 0 ? yMax : 0f);
            w.Write(count);
            for (var i = 0; i < count; i++)
            {
                w.Write(P[i].x); w.Write(P[i].y); w.Write(P[i].z);
                w.Write(N[i].x); w.Write(N[i].y); w.Write(N[i].z);
                w.Write(U[i].x); w.Write(U[i].y);
                var b = W[i];
                w.Write((byte)b.boneIndex0); w.Write((byte)b.boneIndex1); w.Write((byte)b.boneIndex2); w.Write((byte)b.boneIndex3);
                var s = b.weight0 + b.weight1 + b.weight2 + b.weight3;
                if (s <= 0f) s = 1f;
                var q0 = Mathf.RoundToInt(b.weight0 / s * 255f); var q1 = Mathf.RoundToInt(b.weight1 / s * 255f); var q2 = Mathf.RoundToInt(b.weight2 / s * 255f);
                var q3 = Mathf.Max(0, 255 - q0 - q1 - q2);
                w.Write((byte)q0); w.Write((byte)q1); w.Write((byte)q2); w.Write((byte)q3);
            }
            w.Write(T.Count);
            foreach (var t in T) w.Write(t);
        }

        /// <summary>The body material's dye mask (RGB: the garments' dye groups), read from its file (the imported texture is
        /// not readable).</summary>
        private static Texture2D DyeMask(string dir, SkinnedMeshRenderer smr)
        {
            foreach (var m in smr.sharedMaterials)
            {
                if (m == null || !m.name.ToLowerInvariant().EndsWith("_body")) continue;
                var path = $"{dir}/{m.name}_dye.png";
                if (!File.Exists(path)) continue;
                var t = new Texture2D(2, 2, TextureFormat.RGBA32, false, true);
                t.LoadImage(File.ReadAllBytes(path));
                return t;
            }
            return null;
        }

        private static int BodySubmesh(SkinnedMeshRenderer smr)
        {
            var mats = smr.sharedMaterials;
            for (var i = 0; i < mats.Length; i++) if (mats[i] != null && mats[i].name.ToLowerInvariant().EndsWith("_body")) return i;
            return -1;
        }

        private static float Sum(Texture2D t, Vector2 uv)
        {
            var c = t.GetPixelBilinear(uv.x, uv.y);
            return c.r + c.g + c.b;
        }
    }
}
