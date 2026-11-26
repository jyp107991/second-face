#if UNITY_EDITOR
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    // TEMP probe (never committed): each person's forefoot in the bind pose, as the gate's MotionProbe picks its ball (the lowest
    // foot vertex within 4 cm behind to 2 cm past the toe joint): where it lies against the toe joint (along, under), and how much
    // of it the toes' bone moves (its skin weight), beside the lowest vertex of the metatarsal row (behind the joint) and of the
    // toes' row (past it). A rolling forefoot (the foot turned about the toe joint, the toes kept flat) moves a vertex by the
    // foot bone's share of it.
    public class FootWeightProbeTests
    {
        [Test]
        public void Forefeet()
        {
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var sb = new StringBuilder("person,side,which,vertex,along,acrossAbs,height,underJoint,wFoot,wToe,wOther,jointH\n");
            foreach (var e in cat.People)
            {
                if (e == null || e.Prefab == null) continue;
                var go = (GameObject)PrefabUtility.InstantiatePrefab(e.Prefab);
                try
                {
                    var a = go.GetComponentInChildren<Animator>();
                    var smr = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).OrderByDescending(r => r.sharedMesh != null ? r.sharedMesh.vertexCount : 0).First();
                    var baked = new Mesh(); smr.BakeMesh(baked, true);
                    var v = baked.vertices.Select(p => smr.transform.TransformPoint(p)).ToArray();
                    var bw = smr.sharedMesh.boneWeights; var bones = smr.bones;
                    foreach (var (side, fb, tb, kb) in new[] { ("L", HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes, HumanBodyBones.LeftLowerLeg), ("R", HumanBodyBones.RightFoot, HumanBodyBones.RightToes, HumanBodyBones.RightLowerLeg) })
                    {
                        var foot = a.GetBoneTransform(fb); var toe = a.GetBoneTransform(tb); var knee = a.GetBoneTransform(kb);
                        if (foot == null || toe == null || knee == null) continue;
                        var ankle = foot.position; var j = toe.position;
                        var fwd = j - ankle; fwd.y = 0f; var toesAlong = fwd.magnitude; fwd /= toesAlong;
                        var tipEnd = j + (j - ankle).normalized * 0.07f;
                        float Seg(Vector3 p, Vector3 s0, Vector3 s1) { var d = s1 - s0; var t = Mathf.Clamp01(Vector3.Dot(p - s0, d) / Mathf.Max(1e-8f, d.sqrMagnitude)); return (p - (s0 + d * t)).magnitude; }
                        float W(int i, Transform t) { var b = bw[i]; float s = 0f; if (bones[b.boneIndex0] == t) s += b.weight0; if (bones[b.boneIndex1] == t) s += b.weight1; if (bones[b.boneIndex2] == t) s += b.weight2; if (bones[b.boneIndex3] == t) s += b.weight3; return s; }
                        int best = -1, met = -1, toes = -1; float yb = float.MaxValue, ym = float.MaxValue, yt = float.MaxValue;
                        for (var i = 0; i < v.Length; i++)
                        {
                            var p = v[i];
                            if (p.y > ankle.y + 0.03f) continue;
                            var dShin = Seg(p, knee.position, ankle); var dFoot = Mathf.Min(Seg(p, ankle, j), Seg(p, j, tipEnd));
                            if (dFoot >= dShin) continue;
                            var o = p - ankle; o.y = 0f;
                            var along = Vector3.Dot(o, fwd);
                            if (along > toesAlong - 0.04f && along < toesAlong + 0.02f && p.y < yb) { yb = p.y; best = i; }
                            if (along > toesAlong - 0.04f && along < toesAlong - 0.005f && p.y < ym) { ym = p.y; met = i; }
                            if (along > toesAlong + 0.005f && along < toesAlong + 0.04f && p.y < yt) { yt = p.y; toes = i; }
                        }
                        foreach (var (which, i) in new[] { ("gate", best), ("met", met), ("toes", toes) })
                        {
                            if (i < 0) continue;
                            var o = v[i] - ankle; o.y = 0f;
                            var along = Vector3.Dot(o, fwd); var across = Mathf.Abs(Vector3.Dot(o, Vector3.Cross(Vector3.up, fwd)));
                            var wf = W(i, foot); var wt = W(i, toe);
                            sb.Append($"{e.Id},{side},{which},{i},{along * 100f:0.00},{across * 100f:0.00},{(v[i].y - Mathf.Min(ym, yt)) * 100f:0.00},{(toesAlong - along) * 100f:0.00},{wf:0.00},{wt:0.00},{1f - wf - wt:0.00},{(j.y - v[i].y) * 100f:0.00}\n");
                        }
                    }
                    Object.DestroyImmediate(baked);
                }
                finally { Object.DestroyImmediate(go); }
            }
            var path = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", "forefeet.csv"));
            File.WriteAllText(path, sb.ToString());
            Debug.Log("FOREFEET written " + path);
        }
    }
}
#endif
