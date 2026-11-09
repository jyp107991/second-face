using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The flank correctives (docs/PEOPLE_MOTION.md A1, C1): where a resting upper arm lies against the side of the chest,
    /// real flesh gives on both sides, the chest wall's and the arm's own, and the arm hangs near the vertical. A skinned
    /// mesh gives nowhere: lowered from its bind pose, the lower upper arm of a broad body lies 1-3 cm inside the ribcage's
    /// side, and kept out of it the arm hung 15-25° off the vertical (the men's resting arms, 742 of the whole cast's 1513
    /// failures, 2026-11-07; every contact that held them out was the upper arm 10-20 cm below the shoulder against the
    /// torso 30-40 cm above the hips). Each person gets two blend shapes on the body's own mesh, "sf_flank_L" and
    /// "sf_flank_R": with the upper arm hanging <see cref="RestAbd"/>° out from the torso's line, the overlap of the two
    /// surfaces (plus <see cref="Clear"/>) is taken <see cref="TorsoShare"/> by the chest's side, pressed in toward the
    /// spine (at most <see cref="TorsoMax"/>), and the rest by the arm's inner side, pressed in toward its bone (at most
    /// <see cref="ArmMax"/>), smoothed over the surface and welded at its seams. Written beside the FBX as
    /// &lt;id&gt;_flank.bytes: the import (RocketboxImportPostprocessor) adds the shapes to the body's mesh, RocketboxLayers
    /// carries them into the shells cut from it and into the game's skin points (BodySkin), and ArmClearance weighs them
    /// by how near the arm hangs to the body, every frame.
    /// </summary>
    public static class BodyCorrectives
    {
        public const string Magic = "RBF1";
        public const string ShapeL = "sf_flank_L", ShapeR = "sf_flank_R";
        /// <summary>The reference: the upper arm this far out from the torso's line (degrees), the forearm bent 15° forward.</summary>
        public const float RestAbd = 6f;
        /// <summary>Made room for beyond touching (m): the game keeps an arm 3 mm off the body (ArmClearance.SkinMargin).</summary>
        public const float Clear = 0.003f;
        /// <summary>The most each side gives (m). (5 and 2.5 cm, for the men whose padded jackets and vests are in the body's
        /// own mesh, the overlap 6-10 cm, moved the whole cast only 1053 -> 1030 and turned one forearm past its cap, A3:
        /// their arms are held out by gear at the torso's side and back, the belt and the thighs, not the chest's side,
        /// 2026-11-07.)</summary>
        public const float TorsoMax = 0.06f, ArmMax = 0.04f, TorsoShare = 0.6f;   // (the arm's 2 cm held the gear-held men's elbows 2-4.5 cm into their vests at the out-angle's most, the arm pushed out to 30-40°, A1, their overlap 6-10 cm: 4, 2026-11-08)
        /// <summary>The chest's side gives this much (m) from <see cref="DeepBelow"/> under the elbow up: the broad men's elbows
        /// at the reference lay 6-8 cm into their waists, a jacket's with them (A1 462 -> 451 at 4 cm, 2026-11-08).</summary>
        public const float TorsoDeep = 0.06f, DeepBelow = 0.02f;
        /// <summary>How much of the forearm from the elbow the waist gives for (a share of its length: about 12 cm).</summary>
        public const float ForeReach = 0.45f;   // (4 and 2 cm, 2026-11-08: A1 462 -> 451 but A4 83 -> 85 on the gear-held men whose correctives changed, their hands by the thighs 6.0-6.3 cm: back to 2.5 and 1.5)
        /// <summary>The arm's places the overlap is taken over (degrees out from the reference, and forward or back of it):
        /// where a resting arm really lies as the body sways and the idles shift.</summary>
        private static readonly (float Out, float Fwd)[] Sweep = { (0f, 0f), (-3f, 0f), (4f, 0f), (0f, -8f), (0f, 8f), (4f, -8f), (4f, 8f) };

        public static string PathFor(string fbxPath) => fbxPath.Substring(0, fbxPath.Length - Path.GetExtension(fbxPath).Length) + "_flank.bytes";

        /// <summary>The deltas (the body mesh's own space, per vertex, zero where none) read from a file's bytes, for a mesh
        /// of <paramref name="vertexCount"/> vertices; false when the file is not for it.</summary>
        public static bool Read(byte[] bytes, int vertexCount, out Vector3[] left, out Vector3[] right)
        {
            left = right = null;
            if (bytes == null || bytes.Length < 12) return false;
            using var r = new BinaryReader(new MemoryStream(bytes));
            if (new string(r.ReadChars(4)) != Magic) return false;
            if (r.ReadInt32() != vertexCount) return false;
            left = new Vector3[vertexCount]; right = new Vector3[vertexCount];
            foreach (var side in new[] { left, right })
            {
                var n = r.ReadInt32();
                for (var k = 0; k < n; k++)
                {
                    var i = r.ReadInt32();
                    var d = new Vector3(r.ReadSingle(), r.ReadSingle(), r.ReadSingle());
                    if (i >= 0 && i < vertexCount) side[i] = d;
                }
            }
            return true;
        }

        /// <summary>Reads the deltas beside a person's FBX (null when there are none or they are for another mesh).</summary>
        public static (Vector3[] L, Vector3[] R) ReadFor(string fbxPath, int vertexCount)
        {
            var path = PathFor(fbxPath);
            if (!File.Exists(path)) return (null, null);
            return Read(File.ReadAllBytes(path), vertexCount, out var l, out var r) ? (l, r) : (null, null);
        }

        /// <summary>Measures a person (a prefab instance at its bind pose, made from <paramref name="fbxPath"/>) and writes
        /// its flank deltas; true when written.</summary>
        public static bool Build(GameObject go, string fbxPath, string id)
        {
            var anim = go.GetComponentInChildren<Animator>();
            var smr = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.sharedMesh != null).OrderByDescending(r => r.sharedMesh.vertexCount).FirstOrDefault();
            if (anim == null || !anim.isHuman || anim.avatar == null || smr == null) return false;
            var mesh = smr.sharedMesh;
            var pos = mesh.vertices; var bw = mesh.boneWeights; var bp = mesh.bindposes;
            if (bw.Length != pos.Length) return false;
            var copy = Object.Instantiate(go);
            copy.hideFlags = HideFlags.HideAndDontSave;
            try
            {
                var cAnim = copy.GetComponentInChildren<Animator>();
                var cSmr = copy.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.sharedMesh == mesh);
                if (cAnim == null || cSmr == null) return false;
                Transform B(HumanBodyBones b) => cAnim.GetBoneTransform(b);
                // the neutral pose (every muscle at 0), then each arm hung as the reference
                var hp = new HumanPoseHandler(cAnim.avatar, cAnim.transform);
                var hpose = new HumanPose();
                hp.GetHumanPose(ref hpose);
                for (var k = 0; k < hpose.muscles.Length; k++) hpose.muscles[k] = 0f;
                hp.SetHumanPose(ref hpose);
                hp.Dispose();
                var root = cAnim.transform;
                var hips = B(HumanBodyBones.Hips); var neck = B(HumanBodyBones.Neck);
                if (hips == null || neck == null) return false;
                var down = (hips.position - neck.position).normalized;
                foreach (var (u, l, h, side) in new[] { (HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, -1), (HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, 1) })
                {
                    var tu = B(u); var tl = B(l); var th = B(h);
                    if (tu == null || tl == null || th == null) return false;
                    var outward = Vector3.ProjectOnPlane(root.right * side, down).normalized;
                    var ua = (down * Mathf.Cos(RestAbd * Mathf.Deg2Rad) + outward * Mathf.Sin(RestAbd * Mathf.Deg2Rad)).normalized;
                    tu.rotation = Quaternion.FromToRotation(tl.position - tu.position, ua) * tu.rotation;
                    var fwd = Vector3.ProjectOnPlane(root.forward, ua).normalized;
                    var fa = (ua * Mathf.Cos(15f * Mathf.Deg2Rad) + fwd * Mathf.Sin(15f * Mathf.Deg2Rad)).normalized;
                    tl.rotation = Quaternion.FromToRotation(th.position - tl.position, fa) * tl.rotation;
                }
                var baked = new Mesh();
                cSmr.BakeMesh(baked, true);
                var l2w = Matrix4x4.TRS(cSmr.transform.position, cSmr.transform.rotation, Vector3.one);
                var wp = baked.vertices; var wn = baked.normals;
                Object.DestroyImmediate(baked);
                if (wp.Length != pos.Length || wn.Length != pos.Length) return false;
                for (var i = 0; i < wp.Length; i++) { wp[i] = l2w.MultiplyPoint3x4(wp[i]); wn[i] = (cSmr.transform.rotation * wn[i]).normalized; }
                var bones = cSmr.bones;

                // the body's own surface (never the hair's, the lashes', the eyes')
                var use = new bool[pos.Length];
                var mats = smr.sharedMaterials;
                for (var sub = 0; sub < mesh.subMeshCount; sub++)
                {
                    var name = sub < mats.Length && mats[sub] != null ? mats[sub].name.ToLowerInvariant() : "";
                    if (name.Contains("opacity") || name.Contains("hair") || name.Contains("lash") || name.Contains("eye")) continue;
                    foreach (var i in mesh.GetTriangles(sub)) use[i] = true;
                }
                // each vertex's part by the bones that move it (by place, posed, a chest's side inside the hanging arm lies
                // nearer the arm's bone than the spine and reads as the arm's): 0 the torso, 1 the left upper arm, 2 the
                // right, 3 anything else or a mix (the armpit's own seam)
                var fam = new Dictionary<Transform, int>();
                foreach (var hb in new[] { HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.UpperChest, HumanBodyBones.Neck, HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder })
                    if (B(hb) != null) fam[B(hb)] = 0;
                if (B(HumanBodyBones.LeftUpperArm) != null) fam[B(HumanBodyBones.LeftUpperArm)] = 1;
                if (B(HumanBodyBones.RightUpperArm) != null) fam[B(HumanBodyBones.RightUpperArm)] = 2;
                // (and the forearms, 4 and 5: the elbow and the forearm by it rest on the waist, which gives for them too)
                if (B(HumanBodyBones.LeftLowerArm) != null) fam[B(HumanBodyBones.LeftLowerArm)] = 4;
                if (B(HumanBodyBones.RightLowerArm) != null) fam[B(HumanBodyBones.RightLowerArm)] = 5;
                for (var hb = HumanBodyBones.Hips; hb < HumanBodyBones.LastBone; hb++)
                    if (B(hb) != null && !fam.ContainsKey(B(hb))) fam[B(hb)] = 3;
                var boneFam = new int[bones.Length];
                for (var k = 0; k < bones.Length; k++)
                {
                    boneFam[k] = 3;
                    for (var t = bones[k]; t != null; t = t.parent)
                        if (fam.TryGetValue(t, out var f)) { boneFam[k] = f; break; }
                }
                var part = new int[pos.Length];
                for (var i = 0; i < pos.Length; i++)
                {
                    part[i] = 3;
                    if (!use[i]) continue;
                    var b = bw[i];
                    var w = new float[6];
                    void Fam(int bi, float wt) { if (wt > 0f && bi >= 0 && bi < bones.Length) w[boneFam[bi]] += wt; }
                    Fam(b.boneIndex0, b.weight0); Fam(b.boneIndex1, b.weight1); Fam(b.boneIndex2, b.weight2); Fam(b.boneIndex3, b.weight3);
                    for (var f = 0; f < 6; f++) if (f != 3 && w[f] >= 0.6f) part[i] = f;
                }
                // the spine's line, for the torso's own radius about it
                var spineLo = hips.position; var spineHi = neck.position;
                Vector3 SpineAt(float y) => Vector3.Lerp(spineLo, spineHi, Mathf.Clamp01((y - spineLo.y) / Mathf.Max(1e-4f, spineHi.y - spineLo.y)));

                var amount = new float[2][]; var dirs = new Vector3[2][];
                var report = new List<string>();
                for (var s = 0; s < 2; s++)
                {
                    var side = s == 0 ? -1 : 1;
                    var armPart = s == 0 ? 1 : 2;
                    var tu = B(s == 0 ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm);
                    var tl = B(s == 0 ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm);
                    var S = tu.position; var E = tl.position; var l1 = (E - S).magnitude;
                    var ax = (E - S) / l1;
                    var e1 = Vector3.ProjectOnPlane(root.right * side, ax).normalized; var e2 = Vector3.Cross(ax, e1);
                    amount[s] = new float[pos.Length]; dirs[s] = new Vector3[pos.Length];
                    // the arm's surface about its bone: the furthest it stands from the bone, by length (5 % bins) and turn (15°)
                    const int TB = 20, PB = 24;
                    var rA = new float[TB, PB];
                    for (var i = 0; i < pos.Length; i++)
                    {
                        if (part[i] != armPart) continue;
                        var v = wp[i] - S; var t = Vector3.Dot(v, ax) / l1;
                        if (t < 0f || t > 1f) continue;
                        var rv = v - ax * (t * l1);
                        var phi = Mathf.Atan2(Vector3.Dot(rv, e2), Vector3.Dot(rv, e1)) * Mathf.Rad2Deg;
                        int tb = Mathf.Min(TB - 1, (int)(t * TB)), pb = ((int)Mathf.Floor((phi + 360f) / 15f)) % PB;
                        rA[tb, pb] = Mathf.Max(rA[tb, pb], rv.magnitude);
                    }
                    var rAMax = new float[TB];
                    for (var tb0 = 0; tb0 < TB; tb0++) for (var pb0 = 0; pb0 < PB; pb0++) rAMax[tb0] = Mathf.Max(rAMax[tb0], rA[tb0, pb0]);
                    // the forearm's surface about its bone by the elbow, the same way (its first ForeReach of its length)
                    var foreP = s == 0 ? 4 : 5;
                    var W = B(s == 0 ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand).position;
                    var l2 = (W - E).magnitude; var axF = (W - E) / Mathf.Max(1e-4f, l2);
                    var f1 = Vector3.ProjectOnPlane(root.right * side, axF).normalized; var f2 = Vector3.Cross(axF, f1);
                    const int FB = 10;
                    var rF = new float[FB, PB];
                    for (var i = 0; i < pos.Length; i++)
                    {
                        if (part[i] != foreP) continue;
                        var u = wp[i] - E; var t2 = Vector3.Dot(u, axF) / l2;
                        if (t2 < 0f || t2 > ForeReach) continue;
                        var rv = u - axF * (t2 * l2);
                        var phi = Mathf.Atan2(Vector3.Dot(rv, f2), Vector3.Dot(rv, f1)) * Mathf.Rad2Deg;
                        int tb = Mathf.Min(FB - 1, (int)(t2 / ForeReach * FB)), pb = ((int)Mathf.Floor((phi + 360f) / 15f)) % PB;
                        rF[tb, pb] = Mathf.Max(rF[tb, pb], rv.magnitude);
                    }
                    var rFMax = new float[FB];
                    for (var tb0 = 0; tb0 < FB; tb0++) for (var pb0 = 0; pb0 < PB; pb0++) rFMax[tb0] = Mathf.Max(rFMax[tb0], rF[tb0, pb0]);
                    // the torso's surface about the spine, level, by height (1.5 cm) and turn (5°), this side only
                    const float YB = 0.015f; const int QB = 72;
                    var yLo = E.y - 0.14f; var yHi = S.y;
                    var nyb = Mathf.Max(1, Mathf.CeilToInt((yHi - yLo) / YB));
                    var rT = new float[nyb, QB];
                    int YBin(float y) => Mathf.Clamp((int)((y - yLo) / YB), 0, nyb - 1);
                    int QBin(Vector3 h) => ((int)Mathf.Floor((Mathf.Atan2(h.z, h.x) * Mathf.Rad2Deg + 360f) / 5f)) % QB;
                    for (var i = 0; i < pos.Length; i++)
                    {
                        if (part[i] != 0 || wp[i].y < yLo || wp[i].y > yHi) continue;
                        var h = wp[i] - SpineAt(wp[i].y); h.y = 0f;
                        if (Vector3.Dot(h, root.right) * side <= 0f) continue;
                        var yb = YBin(wp[i].y); var qb = QBin(h);
                        rT[yb, qb] = Mathf.Max(rT[yb, qb], h.magnitude);
                    }
                    float overT = 0f, overA = 0f; int nT = 0, nA = 0;
                    for (var i = 0; i < pos.Length; i++)
                    {
                        if (part[i] == 0)
                        {
                            // the chest's side inside the hanging arm, wherever in the sweep it lies: pressed in toward the spine
                            var bestO = 0f; var bestEase = 0f;
                            foreach (var (so, sf) in Sweep)
                            {
                                var rot = Quaternion.AngleAxis(-sf, Vector3.Cross(ax, root.forward).normalized * 1f) * Quaternion.AngleAxis(so * side, root.forward);
                                var v = Quaternion.Inverse(rot) * (wp[i] - S); var t = Vector3.Dot(v, ax) / l1;
                                if (t < 0.15f || t > 1.05f) continue;
                                var rv = v - ax * (t * l1);
                                var phi = Mathf.Atan2(Vector3.Dot(rv, e2), Vector3.Dot(rv, e1)) * Mathf.Rad2Deg;
                                int tb = Mathf.Clamp((int)(t * TB), 0, TB - 1), pb = ((int)Mathf.Floor((phi + 360f) / 15f)) % PB;
                                var ra = rAMax[tb];   // (the arm's widest at this length, whichever way it is rolled: at rest the upper arm is rolled in up to 65°, TwistMax, and another side of the sleeve faces the chest than the reference's)
                                if (ra <= 0f) continue;
                                var oo = ra + Clear - rv.magnitude;
                                var ee = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.15f, 0.3f, t)) * Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(1.05f, 0.9f, t));
                                if (oo * ee > bestO * bestEase || bestEase == 0f) { if (oo > 0f) { bestO = oo; bestEase = ee; } }
                            }
                            // and inside the forearm by the elbow (the elbow rests on the waist with the forearm hanging by the hip:
                            // the upper arm's alone left the broad men's elbows 1-2 cm into their waists at the out-angle's most,
                            // A1 21-25°, 2026-11-08)
                            foreach (var (so, sf) in Sweep)
                            {
                                var rot = Quaternion.AngleAxis(-sf, Vector3.Cross(ax, root.forward).normalized * 1f) * Quaternion.AngleAxis(so * side, root.forward);
                                var u = Quaternion.Inverse(rot) * (wp[i] - S) - (E - S);
                                var t2 = Vector3.Dot(u, axF) / l2;
                                if (t2 < -0.02f || t2 > ForeReach) continue;
                                var rv = u - axF * (t2 * l2);
                                var phi = Mathf.Atan2(Vector3.Dot(rv, f2), Vector3.Dot(rv, f1)) * Mathf.Rad2Deg;
                                int tb = Mathf.Clamp((int)(t2 / ForeReach * FB), 0, FB - 1), pb = ((int)Mathf.Floor((phi + 360f) / 15f)) % PB;
                                var ra = rFMax[tb];
                                if (ra <= 0f) continue;
                                var oo = ra + Clear - rv.magnitude;
                                var ee = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(ForeReach, 0.6f * ForeReach, t2));
                                if (oo * ee > bestO * bestEase || bestEase == 0f) { if (oo > 0f) { bestO = oo; bestEase = ee; } }
                            }
                            if (bestO <= 0f) continue;
                            var inward = -wn[i]; inward.y = 0f;
                            if (inward.sqrMagnitude < 0.04f) continue;   // (a surface facing up or down is not the chest's side)
                            overT = Mathf.Max(overT, bestO); nT++;
                            // (deeper from a little under the elbow up, where the elbow rests on the waist; under it the hip's side,
                            // where the hand rests, gives as before: given 4 cm there too, the hands of the gear-held men stood
                            // 6.0-6.3 cm off it, A4 83 -> 85, 2026-11-08)
                            var cap = wp[i].y >= E.y - DeepBelow ? TorsoDeep : TorsoMax;
                            amount[s][i] = Mathf.Min(cap, TorsoShare * bestO) * bestEase;
                            dirs[s][i] = inward.normalized;
                        }
                        else if (part[i] == armPart)
                        {
                            // the arm's inner side inside the chest's, wherever in the sweep it lies: pressed in toward its bone
                            var v = wp[i] - S; var t = Vector3.Dot(v, ax) / l1;
                            if (t < 0.2f || t > 1f) continue;
                            var o = 0f;
                            foreach (var (so, sf) in Sweep)
                            {
                                var rot = Quaternion.AngleAxis(-sf, Vector3.Cross(ax, root.forward).normalized) * Quaternion.AngleAxis(so * side, root.forward);
                                var pw = S + rot * v;
                                if (pw.y < yLo || pw.y > yHi) continue;
                                var h = pw - SpineAt(pw.y); h.y = 0f;
                                var yb = YBin(pw.y); var qb = QBin(h);
                                var rt = Mathf.Max(rT[yb, qb], Mathf.Max(rT[yb, (qb + 1) % QB], rT[yb, (qb + QB - 1) % QB]));
                                if (rt <= 0f) continue;
                                o = Mathf.Max(o, rt + Clear - h.magnitude);
                            }
                            if (o <= 0f) continue;
                            var rv = v - ax * (t * l1);
                            if (rv.sqrMagnitude < 1e-6f) continue;
                            overA = Mathf.Max(overA, o); nA++;
                            var ease = Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(0.2f, 0.35f, t));
                            amount[s][i] = Mathf.Min(ArmMax, (1f - TorsoShare) * o) * ease;
                            dirs[s][i] = -rv.normalized;
                        }
                    }
                    report.Add($"{(s == 0 ? "L" : "R")} chest {nT} points, over {overT * 100f:0.0} cm; arm {nA}, over {overA * 100f:0.0} cm");
                }

                // smoothed over the surface (neighbours by triangle, seams welded by place)
                var nbr = new List<int>[pos.Length];
                for (var sub = 0; sub < mesh.subMeshCount; sub++)
                {
                    var tris = mesh.GetTriangles(sub);
                    for (var t = 0; t + 2 < tris.Length; t += 3)
                        for (var e = 0; e < 3; e++)
                        {
                            int a = tris[t + e], b = tris[t + (e + 1) % 3];
                            if (!use[a] || !use[b]) continue;
                            (nbr[a] ??= new List<int>()).Add(b); (nbr[b] ??= new List<int>()).Add(a);
                        }
                }
                var weld = new Dictionary<(int, int, int), List<int>>();
                for (var i = 0; i < pos.Length; i++)
                {
                    if (!use[i]) continue;
                    var key = (Mathf.RoundToInt(pos[i].x * 1e4f), Mathf.RoundToInt(pos[i].y * 1e4f), Mathf.RoundToInt(pos[i].z * 1e4f));
                    if (!weld.TryGetValue(key, out var g)) weld[key] = g = new List<int>();
                    g.Add(i);
                }
                var outL = new Vector3[pos.Length]; var outR = new Vector3[pos.Length];
                for (var s = 0; s < 2; s++)
                {
                    var a = amount[s]; var d = dirs[s];
                    // (never shallower than a vertex needs: smoothed toward neighbours that need nothing, the dents of the coarse
                    // jackets, vertices 3-6 cm apart, kept a third of their depth: the chest's side moved 0.3-0.7 cm where the
                    // broad men's elbows rested on it, 2-4 cm in, A1 21-25°, 2026-11-08)
                    var need = (float[])a.Clone();
                    // the chest's and the arm's apart (they press opposite ways): a vertex keeps its own part's direction
                    for (var pass = 0; pass < 3; pass++)
                    {
                        var next = (float[])a.Clone();
                        for (var i = 0; i < pos.Length; i++)
                        {
                            if (nbr[i] == null) continue;
                            var sum = 0f; var c = 0;
                            foreach (var j in nbr[i]) { if (part[j] != part[i]) continue; sum += a[j]; c++; }
                            if (c == 0) continue;
                            var avg = sum / c;
                            // the first pass spreads (a dent's edge never steps), the next two smooth
                            next[i] = Mathf.Max(need[i], pass == 0 ? Mathf.Max(a[i], 0.5f * (a[i] + avg)) : 0.5f * (a[i] + avg));
                            if (next[i] > 0f && d[i] == Vector3.zero)
                                foreach (var j in nbr[i]) if (part[j] == part[i] && d[j] != Vector3.zero) { d[i] = d[j]; break; }
                        }
                        a = next;
                    }
                    foreach (var g in weld.Values)
                    {
                        if (g.Count < 2) continue;
                        var m = 0f; var dir = Vector3.zero;
                        foreach (var i in g) { m = Mathf.Max(m, a[i]); dir += d[i]; }
                        dir = dir.sqrMagnitude > 1e-8f ? dir.normalized : Vector3.zero;
                        foreach (var i in g) { a[i] = m; d[i] = dir; }
                    }
                    var o = s == 0 ? outL : outR;
                    for (var i = 0; i < pos.Length; i++)
                    {
                        if (a[i] < 1e-4f || d[i] == Vector3.zero) continue;
                        // from the world back to the mesh's own space, through this vertex's skinning as posed
                        var b = bw[i];
                        var m = new Matrix4x4();
                        void Add(int bi, float w) { if (w <= 0f) return; var mm = bones[bi].localToWorldMatrix * bp[bi]; for (var k = 0; k < 16; k++) m[k] += mm[k] * w; }
                        Add(b.boneIndex0, b.weight0); Add(b.boneIndex1, b.weight1); Add(b.boneIndex2, b.weight2); Add(b.boneIndex3, b.weight3);
                        o[i] = m.inverse.MultiplyVector(d[i] * a[i]);
                    }
                }
                var path = PathFor(fbxPath);
                using (var ms = new MemoryStream())
                {
                    using (var w = new BinaryWriter(ms, System.Text.Encoding.UTF8, true))
                    {
                        w.Write(Magic.ToCharArray());
                        w.Write(pos.Length);
                        foreach (var o in new[] { outL, outR })
                        {
                            var idx = Enumerable.Range(0, pos.Length).Where(i => o[i] != Vector3.zero).ToList();
                            w.Write(idx.Count);
                            foreach (var i in idx) { w.Write(i); w.Write(o[i].x); w.Write(o[i].y); w.Write(o[i].z); }
                        }
                    }
                    var bytes = ms.ToArray();
                    if (!File.Exists(path) || !File.ReadAllBytes(path).SequenceEqual(bytes)) File.WriteAllBytes(path, bytes);
                }
                Debug.Log($"BodyCorrectives: {id}: {string.Join("; ", report)}; {outL.Count(v => v != Vector3.zero)} + {outR.Count(v => v != Vector3.zero)} vertices");
                return true;
            }
            finally { Object.DestroyImmediate(copy); }
        }
    }
}
