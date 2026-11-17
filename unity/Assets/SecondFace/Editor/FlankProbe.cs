using System.Collections.Generic;
using System.Linq;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>A diagnostic (temporary): each person named in FLANK_PROBE posed as the game holds a resting arm (the neutral
    /// pose and idle clips sampled, the upper arm at each of FLANK_ABD° out from the world's down, the forearm toward the
    /// hand's place beside the thigh), the flank correctives at full weight, and how deep the arm's lower third and forearm
    /// by the elbow (and the upper arm above, less ArmClearance.UpperGive) sit in the body by the game's own skin
    /// (BodySkin.Depth): the worst over the poses, tagged by what judged it (s: the side's points, f: points facing
    /// front, back, up or down).</summary>
    public static class FlankProbe
    {
        public static void Run()
        {
            var ids = (System.Environment.GetEnvironmentVariable("FLANK_PROBE") ?? "Police_Male_06").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
            var abds = (System.Environment.GetEnvironmentVariable("FLANK_ABD") ?? "6,8,10,12,14,17").Split(',').Select(float.Parse).ToArray();
            var clips = new List<(string, AnimationClip)>();
            foreach (var n in new[] { "idle", "idle_b", "idle_c" })
            {
                var c = AssetDatabase.LoadAllAssetsAtPath($"Assets/SecondFace/Motion/{n}.fbx").OfType<AnimationClip>().FirstOrDefault(x => !x.name.StartsWith("__preview"));
                if (c != null) clips.Add((n, c));
            }
            var lines = new List<string>();
            foreach (var id in ids) Probe(id, clips, abds, lines);
            System.IO.File.WriteAllLines("test-results/flank_probe.txt", lines);
            Debug.Log("FlankProbe:\n" + string.Join("\n", lines));
        }

        /// <summary>For each person in FLANK_PROBE (the neutral pose): the torso's skin points the flank correctives move out from the
        /// spine's line rather than in toward it (cm), the worst listed.</summary>
        public static void Moves()
        {
            var ids = (System.Environment.GetEnvironmentVariable("FLANK_PROBE") ?? "Police_Male_06").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
            var lines = new List<string>();
            foreach (var id in ids)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
                if (prefab == null) continue;
                var go = Object.Instantiate(prefab);
                go.hideFlags = HideFlags.HideAndDontSave;
                go.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
                try
                {
                    var anim = go.GetComponentInChildren<Animator>();
                    var hp = new HumanPoseHandler(anim.avatar, anim.transform);
                    var hpose = new HumanPose();
                    hp.GetHumanPose(ref hpose);
                    for (var k = 0; k < hpose.muscles.Length; k++) hpose.muscles[k] = 0f;
                    hp.SetHumanPose(ref hpose);
                    hp.Dispose();
                    var skin = go.GetComponent<BodySkin>();
                    skin.Bind();
                    var hips = anim.GetBoneTransform(HumanBodyBones.Hips).position; var neck = anim.GetBoneTransform(HumanBodyBones.Neck).position;
                    skin.FlankL = skin.FlankR = 0f; skin.Pose();
                    var p0 = (Vector3[])skin.P.Clone(); var n0 = (Vector3[])skin.N.Clone();
                    skin.FlankL = skin.FlankR = 1f; skin.Pose();
                    var outs = new List<(float, string)>(); int moved = 0, outN = 0;
                    for (var i = skin.Begin(BodySkin.Part.Torso); i < skin.End(BodySkin.Part.Torso); i++)
                    {
                        var mv = skin.P[i] - p0[i];
                        if (mv.magnitude < 0.002f) continue;
                        moved++;
                        var sp = hips + Vector3.Project(p0[i] - hips, neck - hips);
                        var o = p0[i] - sp; o.y = 0f;
                        var outward = Vector3.Dot(mv, o.normalized);
                        if (outward <= 0.001f) continue;
                        outN++;
                        outs.Add((outward, $"{i} at ({p0[i].x * 100f:0},{(p0[i].y - hips.y) * 100f:0},{p0[i].z * 100f:0}) n ({n0[i].x:0.0},{n0[i].y:0.0},{n0[i].z:0.0}) moved ({mv.x * 100f:0.0},{mv.y * 100f:0.0},{mv.z * 100f:0.0}) out {outward * 100f:0.0}"));
                    }
                    lines.Add($"{id}: torso points moved {moved}, out from the spine {outN}: " + string.Join(" | ", outs.OrderByDescending(x => x.Item1).Take(6).Select(x => x.Item2)));
                }
                finally { Object.DestroyImmediate(go); }
            }
            System.IO.File.WriteAllLines("test-results/flank_probe.txt", lines);
        }

        private static void Probe(string id, List<(string, AnimationClip)> clips, float[] abds, List<string> lines)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
            if (prefab == null) { lines.Add($"{id}: no prefab"); return; }
            var poses = new List<(AnimationClip Clip, float T)> { (null, 0f) };
            foreach (var (_, c) in clips) foreach (var t in new[] { 0.2f, 0.6f }) poses.Add((c, t * c.length));
            // [side][abd]: worst contact (cm), its tag, how many poses push (over 0.3 cm); and the same with no flank
            var worst = new float[2, abds.Length]; var tag = new string[2, abds.Length]; var pushes = new int[2, abds.Length]; var worst0 = new float[2, abds.Length];
            for (var s = 0; s < 2; s++) for (var a = 0; a < abds.Length; a++) { worst[s, a] = worst0[s, a] = -9f; tag[s, a] = ""; }
            for (var a = 0; a < abds.Length; a++)
                foreach (var (clip, time) in poses)
                {
                    var go = Object.Instantiate(prefab);
                    go.hideFlags = HideFlags.HideAndDontSave;
                    go.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
                    var sampling = false;
                    try
                    {
                        var anim = go.GetComponentInChildren<Animator>();
                        if (clip == null)
                        {
                            var hp = new HumanPoseHandler(anim.avatar, anim.transform);
                            var hpose = new HumanPose();
                            hp.GetHumanPose(ref hpose);
                            for (var k = 0; k < hpose.muscles.Length; k++) hpose.muscles[k] = 0f;
                            hp.SetHumanPose(ref hpose);
                            hp.Dispose();
                        }
                        else
                        {
                            if (!AnimationMode.InAnimationMode()) AnimationMode.StartAnimationMode();
                            sampling = true;
                            AnimationMode.BeginSampling();
                            AnimationMode.SampleAnimationClip(go, clip, time);
                            AnimationMode.EndSampling();
                        }
                        for (var s = 0; s < 2; s++)
                        {
                            var (d1, f, d0) = One(go, anim, s == 0 ? -1 : 1, abds[a]);
                            if (d1 > worst[s, a]) { worst[s, a] = d1; tag[s, a] = f; }
                            if (d1 > 0.003f) pushes[s, a]++;
                            worst0[s, a] = Mathf.Max(worst0[s, a], d0);
                        }
                    }
                    finally
                    {
                        if (sampling) AnimationMode.StopAnimationMode();
                        Object.DestroyImmediate(go);
                    }
                }
            for (var s = 0; s < 2; s++)
            {
                var sb = new System.Text.StringBuilder($"{id} {(s == 0 ? "L" : "R")}:");
                for (var a = 0; a < abds.Length; a++) sb.Append($" {abds[a]:0}:{worst[s, a] * 100f:+0.0;-0.0}{tag[s, a]}({pushes[s, a]})");
                sb.Append("  | no flank:");
                for (var a = 0; a < abds.Length; a++) sb.Append($" {abds[a]:0}:{worst0[s, a] * 100f:+0.0;-0.0}");
                lines.Add(sb.ToString());
            }
        }

        /// <summary>One arm placed at <paramref name="abd"/>° and measured: its worst contact with the flank at full weight (m),
        /// what judged it, and its worst with none.</summary>
        private static (float, string, float) One(GameObject go, Animator anim, int side, float abd)
        {
            var skin = go.GetComponent<BodySkin>();
            Transform B(HumanBodyBones b) => anim.GetBoneTransform(b);
            var root = anim.transform;
            var hips = B(HumanBodyBones.Hips);
            skin.Bind();
            if (!skin.Ready) return (-9f, "?", -9f);
            var first = side < 0 ? BodySkin.Part.UpperArmL : BodySkin.Part.UpperArmR;
            var tu = B(side < 0 ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm);
            var tl = B(side < 0 ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm);
            var th = B(side < 0 ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand);
            var hip = B(side < 0 ? HumanBodyBones.LeftUpperLeg : HumanBodyBones.RightUpperLeg);
            var knee = B(side < 0 ? HumanBodyBones.LeftLowerLeg : HumanBodyBones.RightLowerLeg);
            var outward = root.right * side; var fwd = root.forward;
            var S = tu.position; var l1 = (tl.position - S).magnitude; var l2 = (th.position - tl.position).magnitude;
            var ra = abd * Mathf.Deg2Rad;
            var ua = (Vector3.down * Mathf.Cos(ra) + outward * Mathf.Sin(ra)).normalized;
            tu.rotation = Quaternion.FromToRotation(tl.position - S, ua) * tu.rotation;
            var E = tl.position;
            skin.FlankL = skin.FlankR = 0f;
            skin.Pose();
            // the hand's place beside the thigh (ArmClearance.RestArm's Place, from the elbow)
            var dir = (Quaternion.AngleAxis(-side * 15f, Vector3.up) * outward).normalized;
            var wristY = E.y - l2 * 0.97f;
            var leg = knee.position - hip.position;
            var tt = Mathf.Clamp01((wristY - 0.08f - hip.position.y) / Mathf.Min(-1e-3f, leg.y));
            var axis = hip.position + leg * tt;
            var surf = float.MinValue;
            var thigh = side < 0 ? BodySkin.Part.ThighL : BodySkin.Part.ThighR;
            void Look(int lo, int hi, bool lowOnly)
            {
                for (var i = lo; i < hi; i++)
                {
                    if (lowOnly && !skin.Low(i)) continue;
                    var p = skin.P[i];
                    if (p.y > wristY + 0.02f || p.y < wristY - 0.19f) continue;
                    var o = p - axis; o.y = 0f;
                    if (Vector3.Dot(o, dir) <= 0f || Vector3.Dot(o, outward) < -0.02f) continue;
                    surf = Mathf.Max(surf, Vector3.Dot(o, dir));
                }
            }
            Look(skin.Begin(thigh), skin.End(thigh), false);
            Look(skin.Begin(BodySkin.Part.Torso), skin.End(BodySkin.Part.Torso), true);
            if (surf == float.MinValue) surf = 0.08f;
            var flat = new Vector3(axis.x, 0f, axis.z) + dir * (surf + 0.015f + 0.004f);
            var he = new Vector2(flat.x - E.x, flat.z - E.z).magnitude; var heMax = l2 * Mathf.Sin(25f * Mathf.Deg2Rad);
            if (he > heMax) { var ef = new Vector3(E.x, 0f, E.z); flat = ef + (flat - ef).normalized * heMax; he = heMax; }
            var wrist = new Vector3(flat.x, E.y - Mathf.Sqrt(Mathf.Max(0.2f * l2 * l2, l2 * l2 - he * he)), flat.z);
            var fa = (wrist - E).normalized;
            var fwdPerp = Vector3.ProjectOnPlane(fwd, ua).normalized;
            for (var k = 0; k < 40 && Vector3.Angle(ua, fa) < 10f; k++) fa = Vector3.RotateTowards(fa, fwdPerp, Mathf.Deg2Rad, 0f).normalized;
            var bend = Vector3.Angle(ua, fa);
            if (bend > 28f) fa = Vector3.RotateTowards(fa, ua, (bend - 28f) * Mathf.Deg2Rad, 0f).normalized;
            if (Vector3.Angle(fa, Vector3.down) > 25f) fa = Vector3.RotateTowards(Vector3.down, fa, 25f * Mathf.Deg2Rad, 0f).normalized;
            tl.rotation = Quaternion.FromToRotation(th.position - E, fa) * tl.rotation;
            float Worst(float w, out string f)
            {
                skin.FlankL = skin.FlankR = w;
                skin.Pose();
                var best = -1f; f = "";
                for (var i = skin.Begin(first); i < skin.End(first + 1); i++)
                {
                    var p = skin.P[i];
                    var up = false;
                    if (i < skin.Begin(first + 1)) up = Vector3.Dot(p - S, ua) / l1 < 2f / 3f;
                    else if ((p - E).magnitude > 0.12f) continue;
                    if (!skin.Depth(p, out var d, out var n)) continue;
                    if (up) d -= 0.025f;   // (ArmClearance.UpperGive)
                    if (d <= best) continue;
                    best = d;
                    f = Mathf.Abs(Vector3.Dot(n, outward)) > 0.6f ? "s" : "f";
                }
                return best;
            }
            var d0 = Worst(0f, out _);
            var d1 = Worst(1f, out var tagged);
            return (d1, tagged, d0);
        }
    }
}
