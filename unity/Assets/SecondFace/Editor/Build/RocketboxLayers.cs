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
            public bool ThinSides;   // thinner at the torso's sides, as BodySkin.SideThick (its side panels under the arms)
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
            new() { Id = "bomber", Cloth = RbLayerSet.Fabric.Twill, Colour = RbLayerSet.Dye.Shell, Thick = 0.009f, ThinSides = true,
                ThickAt = (v, j) => v.F == Fam.Torso ? Mathf.Lerp(0.009f, Mathf.Min(0.009f, BodySkin.SideThick), BodySkin.SideShare(v.N.x)) : 0.009f,
                Keep = (v, j) => ((v.F is Fam.Torso or Fam.Shoulder) && v.P.y >= j.Waist - 0.04f) || v.F == Fam.UpperArm
                                 || (v.F == Fam.Forearm && Vector3.Distance(v.P, v.Side < 0 ? j.WristL : j.WristR) > 0.025f) || (v.F == Fam.Neck && v.P.y <= j.Neck + 0.04f) },
            // a harness vest: torso and shoulders, sleeveless, a round neck at the front, to the waist
            new() { Id = "vest", Cloth = RbLayerSet.Fabric.Canvas, Colour = RbLayerSet.Dye.Shell, Thick = 0.013f, ThinSides = true,
                ThickAt = (v, j) => v.F == Fam.Torso ? Mathf.Lerp(0.013f, Mathf.Min(0.013f, BodySkin.SideThick), BodySkin.SideShare(v.N.x)) : 0.013f,
                Keep = (v, j) => (v.F is Fam.Torso or Fam.Shoulder) && v.P.y >= j.Waist - 0.06f && !(v.P.y > j.ChestTop - 0.03f && Mathf.Abs(v.P.x) < 0.075f && v.P.z > 0f)
                                 && Vector3.Distance(v.P, v.P.x < 0 ? j.ShoulderL : j.ShoulderR) > 0.05f },
            // its webbing: two shoulder straps front and back and a band at the waist
            new() { Id = "straps", Cloth = RbLayerSet.Fabric.Webbing, Colour = RbLayerSet.Dye.Dark, Thick = 0.017f, Tile = 0.15f, ThinSides = true,
                ThickAt = (v, j) => v.F == Fam.Torso ? Mathf.Lerp(0.017f, Mathf.Min(0.017f, BodySkin.SideThick), BodySkin.SideShare(v.N.x)) : 0.017f,
                Keep = (v, j) => (v.F is Fam.Torso or Fam.Shoulder) && v.P.y >= j.Waist - 0.06f
                                 && ((Mathf.Abs(Mathf.Abs(v.P.x) - 0.095f) < 0.02f && v.P.y >= j.Chest - 0.06f) || Mathf.Abs(v.P.y - (j.Waist + 0.0f)) < 0.025f) },
            // a shoulder cape: the shoulders, the upper chest, the back to below the shoulder blades, the top of the arms
            new() { Id = "cape", Cloth = RbLayerSet.Fabric.Canvas, Colour = RbLayerSet.Dye.Accent, Thick = 0.019f,
                Keep = (v, j) => v.F == Fam.Shoulder || ((v.F is Fam.Torso) && (v.P.y >= j.ChestTop - 0.06f || (v.P.z < -0.02f && v.P.y >= j.Chest - 0.08f)))
                                 || (v.F == Fam.UpperArm && Vector3.Distance(v.P, v.P.x < 0 ? j.ShoulderL : j.ShoulderR) < 0.13f) || (v.F == Fam.Neck && v.P.y <= j.Neck + 0.02f) },
            // a belt at the hips, over the trousers (6 mm) and its own 5 mm of leather (at 1.7 cm off the skin it stood the
            // resting hand and the arm out where they hang past it, A1/A4, 2026-11-06)
            new() { Id = "belt", Cloth = RbLayerSet.Fabric.Leather, Colour = RbLayerSet.Dye.Leather, Thick = 0.011f, Tile = 0.2f,
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
        /// <summary>For SKIN_DIAG ("id:vertex,id:vertex,..."): the fate of the named vertices (as the gate names them in its clip
        /// lines) and how far the nearest kept skin point is; and, for the person, the body's vertices more than 3 cm from any
        /// kept point of their part, by fate.</summary>
        private static void SkinDiag(string spec, string id, Vector3[] lp, bool[] use, byte[] fate, SkinPart[] partOf, List<int>[] byPart, int cells)
        {
            var mine = spec.Split(',').Select(x => x.Split(':')).Where(x => x.Length == 2 && x[0] == id).Select(x => int.Parse(x[1])).ToList();
            if (mine.Count == 0) return;
            float Near(Vector3 q, int part, out int at)
            {
                var b = float.MaxValue; at = -1;
                for (var p = 0; p < 9; p++)
                {
                    if (part >= 0 && p != part) continue;
                    foreach (var k in byPart[p]) { var d = (lp[k] - q).sqrMagnitude; if (d < b) { b = d; at = k; } }
                }
                return Mathf.Sqrt(b);
            }
            var sb = new System.Text.StringBuilder($"SKIN_DIAG {id}: {cells} points;");
            foreach (var v in mine)
            {
                if (v < 0 || v >= lp.Length) { sb.Append($" v{v} out of range;"); continue; }
                var same = Near(lp[v], (int)partOf[v], out var ks); var any = Near(lp[v], -1, out var ka);
                // the mesh's own density there: the nearest other body vertices
                var nb = new List<float>();
                for (var k = 0; k < lp.Length; k++) if (k != v && use[k]) nb.Add((lp[k] - lp[v]).magnitude);
                nb.Sort();
                sb.Append($" v{v} fate {fate[v]} part {partOf[v]}: nearest kept of its part {same * 100f:0.0} cm (v{ks}), of any {any * 100f:0.0} cm (v{ka} {(ka >= 0 ? partOf[ka] : SkinPart.None)}); mesh neighbours {string.Join("/", nb.Take(4).Select(x => (x * 100f).ToString("0.0")))} cm;");
            }
            var holes = new int[6]; var holesFar = new int[6];
            for (var i = 0; i < lp.Length; i++)
            {
                if (!use[i] || !(partOf[i] is SkinPart.Torso or SkinPart.ThighL or SkinPart.ThighR)) continue;
                var d = Near(lp[i], (int)partOf[i], out _);
                if (d > 0.03f) holes[fate[i]]++;
                if (d > 0.045f) holesFar[fate[i]]++;
            }
            sb.Append($" torso/thigh vertices over 3 cm from a kept point, by fate (2 inside, 4 candidate): {string.Join("/", holes)}; over 4.5 cm: {string.Join("/", holesFar)}");
            Debug.Log(sb.ToString());
        }

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

            var keeps = new List<bool[]>();
            // the flank correctives (BodyCorrectives) the body's mesh has: the shells cut from it take them too
            var (flL, flR) = BodyCorrectives.ReadFor(AssetDatabase.GetAssetPath(mesh), pos.Length);
            using var ms = new MemoryStream();
            using (var gz = new GZipStream(ms, System.IO.Compression.CompressionLevel.Optimal, true))
            using (var w = new BinaryWriter(gz))
            {
                w.Write("RBL2".ToCharArray());
                var bp = mesh.bindposes;
                w.Write(bp.Length);
                foreach (var m in bp) for (var k = 0; k < 16; k++) w.Write(m[k]);
                w.Write(Defs.Length);
                var report = new List<string>();
                foreach (var def in Defs)
                {
                    var keep = new bool[pos.Length];
                    for (var i = 0; i < pos.Length; i++) keep[i] = def.Keep(V[i], j);
                    keeps.Add(keep);
                    var kept = new List<int>();
                    for (var t = 0; t + 2 < tris.Count; t += 3)
                        if (keep[tris[t]] && keep[tris[t + 1]] && keep[tris[t + 2]]) { kept.Add(tris[t]); kept.Add(tris[t + 1]); kept.Add(tris[t + 2]); }
                    WriteLayer(w, def, kept, pos, nor, bw, V, j, meshScale, flL, flR, out var nv, out var yMin, out var yMax);
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
            Skin(go, anim, smr, dir, id, keeps, flL, flR);
            return true;
        }

        private enum SkinPart : byte { None = 255, Torso = 0, ThighL, ThighR, UpperArmL, ForearmL, HandL, UpperArmR, ForearmR, HandR }

        /// <summary>The body's own skin where an arm meets it (<see cref="BodySkin"/>): the body's vertices told apart by
        /// the nearest bone (as the gate's MotionProbe tells them), one kept per cell (the torso and thighs every 2.5 cm,
        /// the hand every 2 cm, the forearm and the lower upper arm every 3 cm), each with its two strongest bones, the
        /// layers that cover it, and whether it is the hips' or thighs' side a resting hand hangs beside.</summary>
        /// <summary>The body's skin points filled in every this far (m) over its triangles, where no vertex stands within
        /// <see cref="FillGap"/>.</summary>
        private const float FillStep = 0.025f, FillGap = 0.02f;
        /// <summary>The covered test's cell and reach (m): a surface over a point, facing its way, this near hides it.</summary>
        private const float CovCell = 0.04f, CovReach = 0.05f;

        /// <summary>A ray from <paramref name="o"/> along <paramref name="d"/> meets the triangle (either face), how far.</summary>
        private static bool RayHits(Vector3 o, Vector3 d, Vector3 a, Vector3 b, Vector3 c, out float dist)
        {
            dist = 0f;
            var e1 = b - a; var e2 = c - a;
            var pv = Vector3.Cross(d, e2);
            var det = Vector3.Dot(e1, pv);
            if (Mathf.Abs(det) < 1e-10f) return false;
            var inv = 1f / det;
            var tv = o - a;
            var u = Vector3.Dot(tv, pv) * inv;
            if (u < 0f || u > 1f) return false;
            var qv = Vector3.Cross(tv, e1);
            var v = Vector3.Dot(d, qv) * inv;
            if (v < 0f || u + v > 1f) return false;
            dist = Vector3.Dot(e2, qv) * inv;
            return dist > 0f;
        }

        private static BoneWeight BlendWeights(BoneWeight a, float wa, BoneWeight b, float wb, BoneWeight c, float wc)
        {
            var acc = new Dictionary<int, float>();
            void Add(int i, float w) { if (w > 0f) acc[i] = (acc.TryGetValue(i, out var x) ? x : 0f) + w; }
            foreach (var (x, s) in new[] { (a, wa), (b, wb), (c, wc) })
            {
                Add(x.boneIndex0, x.weight0 * s); Add(x.boneIndex1, x.weight1 * s); Add(x.boneIndex2, x.weight2 * s); Add(x.boneIndex3, x.weight3 * s);
            }
            var top = acc.OrderByDescending(kv => kv.Value).Take(4).ToList();
            var sum = top.Sum(kv => kv.Value);
            if (sum <= 0f) return a;
            var r = new BoneWeight();
            if (top.Count > 0) { r.boneIndex0 = top[0].Key; r.weight0 = top[0].Value / sum; }
            if (top.Count > 1) { r.boneIndex1 = top[1].Key; r.weight1 = top[1].Value / sum; }
            if (top.Count > 2) { r.boneIndex2 = top[2].Key; r.weight2 = top[2].Value / sum; }
            if (top.Count > 3) { r.boneIndex3 = top[3].Key; r.weight3 = top[3].Value / sum; }
            return r;
        }

        private static void Skin(GameObject go, Animator anim, SkinnedMeshRenderer smr, string dir, string id, List<bool[]> keeps, Vector3[] flL, Vector3[] flR)
        {
            var mesh = smr.sharedMesh;
            var root = anim.transform;
            var boneSrc = anim;   // whose bones the segments are taken from (a posed copy while the parts are told apart)
            Transform B(HumanBodyBones b) => boneSrc.GetBoneTransform(b);
            var pos = mesh.vertices; var nor = mesh.normals; var bw = mesh.boneWeights; var bp = mesh.bindposes;
            var bones = smr.bones;
            if (bw.Length != pos.Length || bones.Length > 255) { Debug.LogWarning($"RocketboxLayers: {id}: no skin points (weights {bw.Length}, bones {bones.Length})"); return; }
            // the vertices as posed now (the prefab at its bind pose), in the world
            var world = new Vector3[pos.Length];
            for (var i = 0; i < pos.Length; i++)
            {
                var b = bw[i];
                var m = bones[b.boneIndex0].localToWorldMatrix * bp[b.boneIndex0];
                world[i] = m.MultiplyPoint3x4(pos[i]);
            }
            // the body's big triangles filled in: a coarse body's vertices stand 3-6 cm apart on the hips, the thighs and the
            // torso's side, and a hand or a forearm resting over a triangle's middle lay 1.7-1.9 cm under its skin while the
            // game's nearest point, 4.4 cm off, read it outside (C1, 2026-11-08). Points every FillStep over each of the body's
            // triangles where no vertex stands within FillGap, skinned by its corners' weights (kept only on the torso and the
            // thighs, below)
            var n0 = pos.Length;
            var fillOf = new List<(int A, int B, int C, float U, float V, float W)>();
            {
                var matsF = smr.sharedMaterials;
                var vcell = new Dictionary<(int, int, int), List<int>>();
                (int, int, int) VC(Vector3 q) => (Mathf.FloorToInt(q.x / FillGap), Mathf.FloorToInt(q.y / FillGap), Mathf.FloorToInt(q.z / FillGap));
                for (var i = 0; i < n0; i++) { var k = VC(world[i]); if (!vcell.TryGetValue(k, out var l)) vcell[k] = l = new List<int>(); l.Add(i); }
                bool Near(Vector3 q)
                {
                    var c = VC(q);
                    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++)
                        if (vcell.TryGetValue((c.Item1 + dx, c.Item2 + dy, c.Item3 + dz), out var l))
                            foreach (var v in l) if ((world[v] - q).sqrMagnitude < FillGap * FillGap) return true;
                    return false;
                }
                var made = new HashSet<(int, int, int)>();
                var fillAt = new List<Vector3>();
                for (var sub = 0; sub < mesh.subMeshCount; sub++)
                {
                    var name = sub < matsF.Length && matsF[sub] != null ? matsF[sub].name.ToLowerInvariant() : "";
                    if (name.Contains("opacity") || name.Contains("hair") || name.Contains("lash") || name.Contains("eye")) continue;
                    var tris = mesh.GetTriangles(sub);
                    for (var t = 0; t + 2 < tris.Length; t += 3)
                    {
                        int a = tris[t], b = tris[t + 1], c = tris[t + 2];
                        var len = Mathf.Max((world[a] - world[b]).magnitude, Mathf.Max((world[b] - world[c]).magnitude, (world[c] - world[a]).magnitude));
                        if (len <= FillStep * 1.5f) continue;
                        var n = Mathf.CeilToInt(len / FillStep);
                        for (var iu = 0; iu <= n; iu++)
                            for (var iv = 0; iv <= n - iu; iv++)
                            {
                                var iw = n - iu - iv;
                                if ((iu == n) || (iv == n) || (iw == n)) continue;   // (the corners are the vertices)
                                float u = iu / (float)n, v = iv / (float)n, w = iw / (float)n;
                                var q = world[a] * u + world[b] * v + world[c] * w;
                                var key = (Mathf.RoundToInt(q.x * 1000f), Mathf.RoundToInt(q.y * 1000f), Mathf.RoundToInt(q.z * 1000f));
                                if (made.Contains(key) || Near(q)) continue;
                                made.Add(key);
                                fillOf.Add((a, b, c, u, v, w)); fillAt.Add(q);
                            }
                    }
                }
                if (fillOf.Count > 0)
                {
                    var n1 = n0 + fillOf.Count;
                    Array.Resize(ref pos, n1); Array.Resize(ref nor, n1); Array.Resize(ref bw, n1); Array.Resize(ref world, n1);
                    var keepsX = new List<bool[]>();
                    foreach (var kp in keeps) { var x = new bool[n1]; Array.Copy(kp, x, Mathf.Min(kp.Length, n0)); keepsX.Add(x); }
                    Vector3[] flLx = flL != null ? new Vector3[n1] : null, flRx = flR != null ? new Vector3[n1] : null;
                    if (flLx != null) Array.Copy(flL, flLx, Mathf.Min(flL.Length, n0));
                    if (flRx != null) Array.Copy(flR, flRx, Mathf.Min(flR.Length, n0));
                    for (var k = 0; k < fillOf.Count; k++)
                    {
                        var (a, b, c, u, v, w) = fillOf[k];
                        var i = n0 + k;
                        pos[i] = pos[a] * u + pos[b] * v + pos[c] * w;
                        nor[i] = (nor[a] * u + nor[b] * v + nor[c] * w).normalized;
                        world[i] = fillAt[k];
                        bw[i] = BlendWeights(bw[a], u, bw[b], v, bw[c], w);
                        foreach (var x in keepsX) x[i] = (x[a] ? 1 : 0) + (x[b] ? 1 : 0) + (x[c] ? 1 : 0) >= 2;
                        if (flLx != null) flLx[i] = flL[a] * u + flL[b] * v + flL[c] * w;
                        if (flRx != null) flRx[i] = flR[a] * u + flR[b] * v + flR[c] * w;
                    }
                    keeps = keepsX; flL = flLx; flR = flRx;
                }
            }
            // the parts told apart where the gate tells them apart (MotionProbe.Calibrate): in the Humanoid's neutral pose,
            // every muscle at 0, the arms down by the body. In the bind pose the arms stand out and the chest's side under
            // them lies nearer the upper arm's line than the spine's: it was left out with the upper arm's top, and arms
            // went 2-4 cm into it unseen, the game's nearest point 4-7 cm off (2026-11-06). The points keep their bind-pose
            // places (world); only which part each is comes from the neutral pose (lp, ln).
            var lp = world; Vector3[] ln = null;
            // (on a copy: posing the person itself and setting it back left float-noise overrides on 88 bones' rotations in
            // the prefabs, 2026-11-06)
            GameObject copy = null;
            if (anim.avatar != null && anim.avatar.isHuman)
            {
                copy = UnityEngine.Object.Instantiate(go);
                copy.hideFlags = HideFlags.HideAndDontSave;
                var cAnim = copy.GetComponentInChildren<Animator>();
                var cSmr = copy.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.sharedMesh == mesh);
                if (cAnim != null && cSmr != null)
                {
                    var hp = new HumanPoseHandler(cAnim.avatar, cAnim.transform);
                    var hpose = new HumanPose();
                    hp.GetHumanPose(ref hpose);
                    for (var k = 0; k < hpose.muscles.Length; k++) hpose.muscles[k] = 0f;
                    hp.SetHumanPose(ref hpose);
                    var baked = new Mesh();
                    cSmr.BakeMesh(baked, true);
                    var l2w = Matrix4x4.TRS(cSmr.transform.position, cSmr.transform.rotation, Vector3.one);
                    lp = baked.vertices; ln = baked.normals;
                    for (var k = 0; k < lp.Length; k++) lp[k] = l2w.MultiplyPoint3x4(lp[k]);
                    if (ln != null && ln.Length == lp.Length) for (var k = 0; k < ln.Length; k++) ln[k] = cSmr.transform.rotation * ln[k]; else ln = null;
                    UnityEngine.Object.DestroyImmediate(baked);
                    hp.Dispose();
                    // (the filled points where their corners are, posed)
                    if (lp.Length == n0 && world.Length > n0)
                    {
                        var lpx = new Vector3[world.Length]; Array.Copy(lp, lpx, n0);
                        var lnx = ln != null ? new Vector3[world.Length] : null; if (lnx != null) Array.Copy(ln, lnx, n0);
                        for (var k = 0; k < fillOf.Count; k++)
                        {
                            var (a, b, c, u, v, w) = fillOf[k];
                            lpx[n0 + k] = lp[a] * u + lp[b] * v + lp[c] * w;
                            if (lnx != null) lnx[n0 + k] = (ln[a] * u + ln[b] * v + ln[c] * w).normalized;
                        }
                        lp = lpx; ln = lnx;
                    }
                    if (lp.Length != world.Length) { lp = world; ln = null; }
                    else boneSrc = cAnim;
                }
            }
            // the segments the gate tells the parts apart by (MotionProbe.Segments)
            var segs = new List<(Vector3 A, Vector3 Bp, SkinPart P)>();
            void Seg(HumanBodyBones a, HumanBodyBones b, SkinPart p) { var ta = B(a); var tb = B(b); if (ta != null && tb != null) segs.Add((ta.position, tb.position, p)); }
            void Tip(HumanBodyBones a, HumanBodyBones from, float len, SkinPart p) { var ta = B(a); var tf = B(from); if (ta != null && tf != null) segs.Add((ta.position, ta.position + (ta.position - tf.position).normalized * len, p)); }
            Seg(HumanBodyBones.Hips, HumanBodyBones.Spine, SkinPart.Torso);
            Seg(HumanBodyBones.Spine, HumanBodyBones.Chest, SkinPart.Torso);
            if (B(HumanBodyBones.UpperChest) != null) { Seg(HumanBodyBones.Chest, HumanBodyBones.UpperChest, SkinPart.Torso); Seg(HumanBodyBones.UpperChest, HumanBodyBones.Neck, SkinPart.Torso); }
            else Seg(HumanBodyBones.Chest, HumanBodyBones.Neck, SkinPart.Torso);
            var spine = segs.Count;   // the segments before this are the spine's (the torso's own axis)
            Seg(HumanBodyBones.LeftShoulder, HumanBodyBones.LeftUpperArm, SkinPart.Torso);
            Seg(HumanBodyBones.RightShoulder, HumanBodyBones.RightUpperArm, SkinPart.Torso);
            Seg(HumanBodyBones.Neck, HumanBodyBones.Head, SkinPart.None);
            if (B(HumanBodyBones.Head) != null) segs.Add((B(HumanBodyBones.Head).position, B(HumanBodyBones.Head).position + Vector3.up * 0.18f, SkinPart.None));
            Seg(HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, SkinPart.UpperArmL);
            Seg(HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, SkinPart.UpperArmR);
            Seg(HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, SkinPart.ForearmL);
            Seg(HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, SkinPart.ForearmR);
            Tip(HumanBodyBones.LeftHand, HumanBodyBones.LeftLowerArm, 0.17f, SkinPart.HandL);
            Tip(HumanBodyBones.RightHand, HumanBodyBones.RightLowerArm, 0.17f, SkinPart.HandR);
            Seg(HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, SkinPart.ThighL);
            Seg(HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, SkinPart.ThighR);
            Seg(HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, SkinPart.None);
            Seg(HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, SkinPart.None);
            Seg(HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes, SkinPart.None);
            Seg(HumanBodyBones.RightFoot, HumanBodyBones.RightToes, SkinPart.None);
            static float Along(Vector3 p, Vector3 a, Vector3 b, out float t)
            {
                var ab = b - a;
                t = Mathf.Clamp01(Vector3.Dot(p - a, ab) / Mathf.Max(ab.sqrMagnitude, 1e-8f));
                return Vector3.Distance(p, a + ab * t);
            }
            // the triangles of the body (and head) only: never the hair's, the lashes', the eyes'
            var use = new bool[pos.Length];
            var mats = smr.sharedMaterials;
            for (var sub = 0; sub < mesh.subMeshCount; sub++)
            {
                var name = sub < mats.Length && mats[sub] != null ? mats[sub].name.ToLowerInvariant() : "";
                if (name.Contains("opacity") || name.Contains("hair") || name.Contains("lash") || name.Contains("eye")) continue;
                foreach (var i in mesh.GetTriangles(sub)) use[i] = true;
            }
            for (var i = n0; i < use.Length; i++) use[i] = true;   // (the filled points: of the body's triangles only)
            var hipsY = root.InverseTransformPoint(anim.GetBoneTransform(HumanBodyBones.Hips).position).y;   // (the bind pose's, not the copy's)
            // the body's triangles by cell, and its vertices' facings, for the covered test (below)
            var wnor = new Vector3[pos.Length];
            for (var i = 0; i < pos.Length; i++) { var b = bw[i]; wnor[i] = (bones[b.boneIndex0].localToWorldMatrix * bp[b.boneIndex0]).MultiplyVector(nor[i]).normalized; }
            var covTris = new List<int>();
            for (var sub = 0; sub < mesh.subMeshCount; sub++)
            {
                var name = sub < mats.Length && mats[sub] != null ? mats[sub].name.ToLowerInvariant() : "";
                if (name.Contains("opacity") || name.Contains("hair") || name.Contains("lash") || name.Contains("eye")) continue;
                covTris.AddRange(mesh.GetTriangles(sub));
            }
            var covGrid = new Dictionary<(int, int, int), List<int>>();
            (int, int, int) CovCellOf(Vector3 q) => (Mathf.FloorToInt(q.x / CovCell), Mathf.FloorToInt(q.y / CovCell), Mathf.FloorToInt(q.z / CovCell));
            for (var t = 0; t + 2 < covTris.Count; t += 3)
            {
                Vector3 a = world[covTris[t]], b = world[covTris[t + 1]], c = world[covTris[t + 2]];
                var lo = Vector3.Min(a, Vector3.Min(b, c)) - Vector3.one * 0.01f; var hi = Vector3.Max(a, Vector3.Max(b, c)) + Vector3.one * 0.01f;
                var cl = CovCellOf(lo); var ch = CovCellOf(hi);
                for (var x = cl.Item1; x <= ch.Item1; x++) for (var y = cl.Item2; y <= ch.Item2; y++) for (var z = cl.Item3; z <= ch.Item3; z++)
                {
                    if (!covGrid.TryGetValue((x, y, z), out var l)) covGrid[(x, y, z)] = l = new List<int>();
                    l.Add(t);
                }
            }
            var covSeen = new HashSet<int>();
            // a point of the torso or a thigh with another surface over it, facing the same way, within CovReach: the skin
            // under a garment of the body's own mesh (a skirt's, a coat's, trousers' over the legs). The game's skin is the
            // outer one, as the gate's is: kept, the hidden skin's points lay nearer a hand pressed 0.9-1.4 cm into the
            // garment than the garment's own, and read it outside (C1, 2026-11-08)
            bool Covered(int i)
            {
                var n = wnor[i];
                if (n.sqrMagnitude < 0.5f) return false;
                var o = world[i] + n * 0.003f;
                covSeen.Clear();
                for (var step = 0f; step <= CovReach + 1e-4f; step += CovCell * 0.5f)
                {
                    if (!covGrid.TryGetValue(CovCellOf(o + n * step), out var l)) continue;
                    foreach (var t in l)
                    {
                        if (!covSeen.Add(t)) continue;
                        int ia = covTris[t], ib = covTris[t + 1], ic = covTris[t + 2];
                        if (ia == i || ib == i || ic == i) continue;
                        var fn = wnor[ia] + wnor[ib] + wnor[ic];
                        if (Vector3.Dot(fn, n) < 0.5f * fn.magnitude) continue;   // (the other thigh, an arm: facing back)
                        if (RayHits(o, n, world[ia], world[ib], world[ic], out var dist) && dist <= CovReach) return true;
                    }
                }
                return false;
            }
            var cells = new Dictionary<(int, int, int, SkinPart), (int I, float D)>();
            var inner = 0;
            // (for SKIN_DIAG only: each vertex's fate, 0 not the body's, 1 no part, 2 a garment's inside, 3 the upper arm's
            // high part, 4 a candidate; and its part)
            var fate = new byte[pos.Length]; var partOf = new SkinPart[pos.Length];
            for (var i = 0; i < partOf.Length; i++) partOf[i] = SkinPart.None;
            for (var i = 0; i < pos.Length; i++)
            {
                if (!use[i]) continue;
                fate[i] = 1;
                var best = float.MaxValue; var part = SkinPart.None; var along = 0f; var axis = Vector3.zero;
                foreach (var (a, b, p) in segs)
                {
                    var d = Along(lp[i], a, b, out var t);
                    if (d < best) { best = d; part = p; along = t; axis = a + (b - a) * t; }
                }
                if (part == SkinPart.None) continue;
                if (i >= n0 && !(part is SkinPart.Torso or SkinPart.ThighL or SkinPart.ThighR)) continue;   // (filled: the body's only)
                partOf[i] = part; fate[i] = 2;
                // the body's surface faces away from its bones: a vertex whose normal faces its bone's axis is a garment's
                // inside (a jacket's lining at the hem, a turned-up cuff), and a hand by it read as outside the body while
                // 4-5 cm into the thigh (2026-11-06)
                if (part is SkinPart.Torso or SkinPart.ThighL or SkinPart.ThighR)
                {
                    var bw0 = bw[i];
                    var n = ln != null ? ln[i].normalized : (bones[bw0.boneIndex0].localToWorldMatrix * bp[bw0.boneIndex0]).MultiplyVector(nor[i]).normalized;
                    // the torso faces away from its spine (from the shoulder's segment, the chest's side under the arm read as
                    // facing in and was left out: arms went 2-3 cm into it unseen, 2026-11-06)
                    if (part == SkinPart.Torso)
                    {
                        var bd = float.MaxValue;
                        for (var k = 0; k < spine; k++)
                        {
                            var dd = Along(lp[i], segs[k].A, segs[k].Bp, out var tt);
                            if (dd < bd) { bd = dd; axis = segs[k].A + (segs[k].Bp - segs[k].A) * tt; }
                        }
                    }
                    var away = lp[i] - axis;
                    if (away.sqrMagnitude > 1e-6f && Vector3.Dot(n, away.normalized) < -0.2f) { inner++; continue; }
                }
                // the upper arm's third nearest the elbow (against the waist a gap shows; higher, the arm rests on the side of
                // the chest, a contact the soft tissue of both takes, hidden in the crease: docs/PEOPLE_MOTION.md C1)
                // (from 0.6, a little above the gate's 0.65: the game's sampled points missed the band's top edge, which the
                // gate saw 1.6-3 cm into the chest's side while walking and gesturing, 2026-11-06)
                if (part is SkinPart.Torso or SkinPart.ThighL or SkinPart.ThighR && Covered(i)) { fate[i] = 5; continue; }
                fate[i] = 3;
                if ((part == SkinPart.UpperArmL || part == SkinPart.UpperArmR) && along < 0.6f) continue;
                fate[i] = 4;
                // (the arms every 1.8 cm: at 3 cm a forearm's inner side between two points lay 1.7 cm into the hip while the
                // nearest point read 1.9 cm out of it, C1, 2026-11-07)
                // (the hands every 1.2 cm: at 2 cm, with the thighs' skin filled in, resting hands held 2 mm off it by their points
                // lay 0.8-1.1 cm into it at fingers between them, C1, 2026-11-08)
                var cell = part switch { SkinPart.HandL or SkinPart.HandR => 0.012f, SkinPart.Torso or SkinPart.ThighL or SkinPart.ThighR => 0.025f, _ => 0.018f };
                // the torso's and thighs' sides, where the arms and hands rest, every 1.5 cm (with the side panels thin under
                // the arms, arms rest on the body itself, and points 3-6 cm apart missed them 2 cm into it, C1, 2026-11-06)
                if (part is SkinPart.Torso or SkinPart.ThighL or SkinPart.ThighR)
                {
                    var nb = root.InverseTransformDirection((bones[bw[i].boneIndex0].localToWorldMatrix * bp[bw[i].boneIndex0]).MultiplyVector(nor[i])).normalized;
                    if (BodySkin.SideShare(nb.x) > 0.3f || Mathf.Abs(nb.x) > 0.45f) cell = 0.015f;
                    // and the tops of what the hips carry (a pouch's, a tool belt's, facing up under a hanging forearm): at 2.5 cm
                    // the game's points there missed a forearm 2 cm into a pouch's top, read from the thigh's side as outside, C1,
                    // 2026-11-07
                    var yLow = root.InverseTransformPoint(world[i]).y;
                    if (nb.y > 0.6f && yLow < hipsY + 0.3f && yLow > hipsY - 0.15f) cell = 0.015f;
                }
                var q = world[i] / cell;
                var key = (Mathf.FloorToInt(q.x), Mathf.FloorToInt(q.y), Mathf.FloorToInt(q.z), part);
                var centre = new Vector3(key.Item1 + 0.5f, key.Item2 + 0.5f, key.Item3 + 0.5f) * cell;
                var dc = (world[i] - centre).sqrMagnitude;
                if (!cells.TryGetValue(key, out var have) || dc < have.D) cells[key] = (i, dc);
            }
            // each vertex's foot as the gate tells it (MotionProbe: the nearest of its segments in the neutral pose, the foot's
            // being the foot to the toes and on 7 cm past them): the soles' points are chosen from these, as the gate's are
            // (by the vertex's own bone the right foot's ball stood 3-5 cm from the gate's along the ground, at the sole's
            // other edge, and was held while the gate's slid, W1/W2, 2026-11-06)
            var footOf = new byte[world.Length];
            {
                var footSegs = new List<(Vector3 A, Vector3 Bp, byte F)>();
                void FS(HumanBodyBones x, HumanBodyBones y, byte t) { var tx = B(x); var ty = B(y); if (tx != null && ty != null) footSegs.Add((tx.position, ty.position, t)); }
                void FT(HumanBodyBones x, HumanBodyBones from, float len, byte t) { var tx = B(x); var tf = B(from); if (tx != null && tf != null) footSegs.Add((tx.position, tx.position + (tx.position - tf.position).normalized * len, t)); }
                FS(HumanBodyBones.Hips, HumanBodyBones.Spine, 0); FS(HumanBodyBones.Spine, HumanBodyBones.Chest, 0);
                if (B(HumanBodyBones.UpperChest) != null) { FS(HumanBodyBones.Chest, HumanBodyBones.UpperChest, 0); FS(HumanBodyBones.UpperChest, HumanBodyBones.Neck, 0); }
                else FS(HumanBodyBones.Chest, HumanBodyBones.Neck, 0);
                FS(HumanBodyBones.LeftShoulder, HumanBodyBones.LeftUpperArm, 0); FS(HumanBodyBones.RightShoulder, HumanBodyBones.RightUpperArm, 0);
                FS(HumanBodyBones.Neck, HumanBodyBones.Head, 0);
                if (B(HumanBodyBones.Head) != null) footSegs.Add((B(HumanBodyBones.Head).position, B(HumanBodyBones.Head).position + Vector3.up * 0.18f, 0));
                FS(HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, 0); FS(HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, 0);
                FS(HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, 0); FS(HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, 0);
                FT(HumanBodyBones.LeftHand, HumanBodyBones.LeftLowerArm, 0.17f, 0); FT(HumanBodyBones.RightHand, HumanBodyBones.RightLowerArm, 0.17f, 0);
                FS(HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, 0); FS(HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, 0);
                FS(HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, 0); FS(HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, 0);
                FS(HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes, 1); FS(HumanBodyBones.RightFoot, HumanBodyBones.RightToes, 2);
                FT(HumanBodyBones.LeftToes, HumanBodyBones.LeftFoot, 0.07f, 1); FT(HumanBodyBones.RightToes, HumanBodyBones.RightFoot, 0.07f, 2);
                for (var i = 0; i < world.Length; i++)
                {
                    var fbd = float.MaxValue; byte fpart = 0;
                    foreach (var (sa, sb, sf) in footSegs) { var sd = Along(lp[i], sa, sb, out _); if (sd < fbd) { fbd = sd; fpart = sf; } }
                    footOf[i] = fpart;
                }
            }
            boneSrc = anim;
            if (copy != null) UnityEngine.Object.DestroyImmediate(copy);
            var byPart = new List<int>[9];
            for (var p = 0; p < 9; p++) byPart[p] = new List<int>();
            foreach (var (key, (i, _)) in cells) byPart[(int)key.Item4].Add(i);
            if (System.Environment.GetEnvironmentVariable("SKIN_DIAG") is { Length: > 0 } diag) SkinDiag(diag, id, lp, use, fate, partOf, byPart, cells.Count);
            for (var p = 0; p < 9; p++) byPart[p].Sort();
            var female = mats.Any(m => m != null && m.name.ToLowerInvariant().TrimStart('s').StartsWith("f") && m.name.ToLowerInvariant().EndsWith("_body"));

            using var ms = new MemoryStream();
            using (var gz = new GZipStream(ms, System.IO.Compression.CompressionLevel.Optimal, true))
            using (var w = new BinaryWriter(gz))
            {
                w.Write("RBS4".ToCharArray());
                w.Write(Defs.Length);
                foreach (var def in Defs) { w.Write(def.Id); w.Write((byte)(def.ThinSides ? 1 : 0)); }
                for (var p = 0; p < 9; p++) w.Write(byPart[p].Count);
                for (var p = 0; p < 9; p++)
                    foreach (var i in byPart[p])
                    {
                        var b = bw[i];
                        // every bone that moves it, as the GPU skins it (RBS4): the two strongest first, then the rest (with only
                        // the two, a hip's point weighted to the pelvis, a thigh and the spine stood 2.5 cm off the skin, and a
                        // forearm went 0.5-1 cm into the hip unseen, C1, 2026-11-07)
                        int b0 = b.boneIndex0, b1 = b.weight1 > 0f ? b.boneIndex1 : b.boneIndex0;
                        var sum = b.weight0 + b.weight1 + b.weight2 + b.weight3;
                        if (sum <= 0f) sum = 1f;
                        var w0 = b.weight0 / sum; var w1 = b.weight1 > 0f ? b.weight1 / sum : 0f;
                        w.Write((byte)b0); w.Write((byte)b1); w.Write(w0); w.Write(w1);
                        var extra = new System.Collections.Generic.List<(int B, float W)>();
                        if (b.weight2 > 0.001f) extra.Add((b.boneIndex2, b.weight2 / sum));
                        if (b.weight3 > 0.001f) extra.Add((b.boneIndex3, b.weight3 / sum));
                        void Put(Vector3 v) { w.Write(v.x); w.Write(v.y); w.Write(v.z); }
                        Put(bp[b0].MultiplyPoint3x4(pos[i])); Put(bp[b0].MultiplyVector(nor[i]).normalized);
                        Put(bp[b1].MultiplyPoint3x4(pos[i])); Put(bp[b1].MultiplyVector(nor[i]).normalized);
                        w.Write((byte)extra.Count);
                        foreach (var (xb, xw) in extra) { w.Write((byte)xb); w.Write(xw); Put(bp[xb].MultiplyPoint3x4(pos[i])); Put(bp[xb].MultiplyVector(nor[i]).normalized); }
                        // low: the hips' and thighs' side, from 25 cm under the hip joints to 15 cm over them
                        var y = root.InverseTransformPoint(world[i]).y;
                        var low = p <= (int)SkinPart.ThighR && y < hipsY + 0.15f && y > hipsY - 0.45f;
                        w.Write((byte)(low ? BodySkin.LowFlag : 0));
                        uint mask = 0;
                        for (var k = 0; k < keeps.Count && k < 32; k++) if (keeps[k][i]) mask |= 1u << k;
                        w.Write(mask);
                        // how far it faces sideways, in the body's frame (where layers thin under the arms)
                        var nw = (bones[b.boneIndex0].localToWorldMatrix * bp[b.boneIndex0]).MultiplyVector(nor[i]);
                        w.Write((byte)Mathf.RoundToInt(BodySkin.SideShare(root.InverseTransformDirection(nw).normalized.x) * 255f));
                        // the flank corrective that moves it (1 left, 2 right), in each of its two bones' frames
                        var fd = flL != null && flL[i] != Vector3.zero ? flL[i] : flR != null && flR[i] != Vector3.zero ? flR[i] : Vector3.zero;
                        var fs = fd == Vector3.zero ? 0 : flL != null && flL[i] != Vector3.zero ? 1 : 2;
                        w.Write((byte)fs);
                        if (fs != 0) { Put(bp[b0].MultiplyVector(fd)); Put(bp[b1].MultiplyVector(fd)); foreach (var (xb, _) in extra) Put(bp[xb].MultiplyVector(fd)); }
                    }
            }
            var outPath = $"{dir}/{id}_skin.bytes";
            File.WriteAllBytes(outPath, ms.ToArray());
            AssetDatabase.ImportAsset(outPath);
            var skin = go.GetComponent<BodySkin>() ?? go.AddComponent<BodySkin>();
            skin.Data = AssetDatabase.LoadAssetAtPath<TextAsset>(outPath);
            skin.Body = smr;
            skin.Carrying = female ? 14f : 10f;
            skin.SoleL = Sole(HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes, 1);
            skin.SoleR = Sole(HumanBodyBones.RightFoot, HumanBodyBones.RightToes, 2);
            // a foot's sole from its own vertices (those the foot or toes bone moves most): as the gate finds its heel and
            // ball (MotionProbe), and the back of the heel and the toe's tip at the sole
            Vector3[] Sole(HumanBodyBones footBone, HumanBodyBones toeBone, byte side)
            {
                var foot = B(footBone); var toe = B(toeBone);
                if (foot == null) return new Vector3[0];
                var ankle = foot.position;
                var ahead = (toe != null ? toe.position : ankle + root.forward * 0.12f) - ankle; ahead.y = 0f;
                var fwd = ahead.sqrMagnitude > 1e-6f ? ahead.normalized : root.forward;
                var toesAlong = Vector3.Dot((toe != null ? toe.position : ankle + fwd * 0.12f) - ankle, fwd);
                var sole = float.MaxValue;
                bool Mine(int i) => footOf[i] == side;
                // (the mesh's own vertices only: the filled points on a foot's triangles moved its heel and ball, W1 0 -> 2,
                // W6 23 -> 36, 2026-11-08)
                for (var i = 0; i < n0; i++) if (Mine(i)) sole = Mathf.Min(sole, world[i].y);
                if (sole == float.MaxValue) return new Vector3[0];
                int heel = -1, back = -1, ball = -1, tip = -1;
                float hy = float.MaxValue, ba = float.MaxValue, by = float.MaxValue, ta = float.MinValue;
                for (var i = 0; i < n0; i++)
                {
                    if (!Mine(i)) continue;
                    var p = world[i]; var along = Vector3.Dot(p - ankle, fwd);
                    if (along < -0.01f && p.y < hy) { hy = p.y; heel = i; }
                    if (along > toesAlong - 0.04f && along < toesAlong + 0.02f && p.y < by) { by = p.y; ball = i; }
                    if (p.y > sole + 0.02f) continue;
                    if (along < ba) { ba = along; back = i; }
                    if (along > ta) { ta = along; tip = i; }
                }
                if (heel < 0 || back < 0 || ball < 0 || tip < 0) return new Vector3[0];
                return new[] { foot.InverseTransformPoint(world[heel]), foot.InverseTransformPoint(world[back]), foot.InverseTransformPoint(world[ball]), (toe != null ? toe : foot).InverseTransformPoint(world[tip]) };
            }
            skin.Built = BodySkin.Version;
            Debug.Log($"RocketboxLayers: {id}: skin points {string.Join("/", byPart.Select(l => l.Count))} ({(female ? "carrying 14°" : "carrying 10°")}; {inner} inside faces left out; parts told apart in the neutral pose)");
        }

        private static HumanBodyBones Parse(string name) => (HumanBodyBones)Enum.Parse(typeof(HumanBodyBones), name);

        private static void WriteLayer(BinaryWriter w, Def def, List<int> kept, Vector3[] pos, Vector3[] nor, BoneWeight[] bw, V[] V, Joints j, float meshScale,
            Vector3[] flL, Vector3[] flR, out int count, out float yMin, out float yMax)
        {
            // the layer's own vertices: each kept body vertex offset outward (in the mesh's own units), and a hem: every open
            // edge (by position: a UV seam is not an edge of the garment) turned back down to the body
            var map = new Dictionary<int, int>();
            var P = new List<Vector3>(); var N = new List<Vector3>(); var U = new List<Vector2>(); var W = new List<BoneWeight>(); var T = new List<int>();
            var inner = new Dictionary<int, int>();
            var src = new List<int>();   // each layer vertex's body vertex (for the flank correctives)
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
                P.Add(pos[i] + nor[i].normalized * (thick / meshScale)); N.Add(nor[i]); U.Add(Uv(V[i], def.Tile)); W.Add(bw[i]); src.Add(i);
                map[i] = k;
                lo = Mathf.Min(lo, V[i].P.y); hi = Mathf.Max(hi, V[i].P.y);
                return k;
            }
            int In(int i)
            {
                if (inner.TryGetValue(i, out var k)) return k;
                k = P.Count;
                P.Add(pos[i] + nor[i].normalized * (0.0015f / meshScale)); N.Add(nor[i]); U.Add(Uv(V[i], def.Tile) + new Vector2(0.02f, 0f)); W.Add(bw[i]); src.Add(i);
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
            // the flank correctives of the body's vertices it was cut from (RBL2): the shell gives with the skin under it
            var any = flL != null && flR != null && src.Any(i => flL[i] != Vector3.zero || flR[i] != Vector3.zero);
            w.Write((byte)(any ? 1 : 0));
            if (!any) return;
            foreach (var i in src)
            {
                var fs = flL[i] != Vector3.zero ? 1 : flR[i] != Vector3.zero ? 2 : 0;
                w.Write((byte)fs);
                if (fs == 0) continue;
                var d = fs == 1 ? flL[i] : flR[i];
                w.Write(d.x); w.Write(d.y); w.Write(d.z);
            }
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
