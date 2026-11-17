#if UNITY_EDITOR
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>A diagnostic (run by name, not part of the gate): each gait clip played in place at its own cadence on a
    /// body as the game makes it, its planted foot's backward speed under the hips (the stride's natural speed on that
    /// body), against what Pace assumes (the clip's speed scaled by the body's hip height over the actor's).</summary>
    public class PaceCalibrationTests
    {
        [UnityTest, Timeout(1800000), Category("Heavy")]
        public IEnumerator GaitsNaturalSpeedOnBodies()
        {
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            var lines = new List<string>();
            var ids = (System.Environment.GetEnvironmentVariable("PACE_PEOPLE") ?? "Business_Female_01,Construction_Male_02,Male_Adult_11").Split(',');
            foreach (var id in ids)
            {
                var p = RbPeople.Of(id);
                var male = p?.Male ?? true;
                var sets = male ? Pace.MenSets : Pace.WomenSets;
                for (var g = 0; g < sets.Length; g++)
                    foreach (var c in sets[g])
                    {
                        var go = Object.Instantiate(cat.Get(id), Vector3.zero, Quaternion.identity);
                        var a = go.GetComponentInChildren<Animator>();
                        a.runtimeAnimatorController = assets.Locomotion;
                        a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                        a.SetFloat("Sex", male ? 0f : 1f); a.SetFloat("Gait", g);
                        var fp = go.AddComponent<FootPlant>(); fp.enabled = false;   // its hip measure only
                        yield return null;
                        var hip = Pace.Hip(a);
                        a.SetFloat("Speed", c.Speed); a.SetFloat("LocoRate", 1f);
                        for (var i = 0; i < 60; i++) yield return null;
                        var fl = a.GetBoneTransform(HumanBodyBones.LeftFoot); var fr = a.GetBoneTransform(HumanBodyBones.RightFoot);
                        var tl = a.GetBoneTransform(HumanBodyBones.LeftToes); var tr = a.GetBoneTransform(HumanBodyBones.RightToes);
                        // four points of the soles (each ankle, each ball): a point within 1 cm of the lowest it goes is down on
                        // the ground in the capture, so in place it runs back under the hips at the stride's own speed
                        var pts = new[] { fl, tl, fr, tr };
                        var prev = pts.Select(x => x.position).ToArray();
                        var ys = new List<(int k, float y, float v)>();
                        for (var i = 0; i < 240; i++)
                        {
                            yield return null;
                            var dt = Time.deltaTime;
                            for (var k = 0; k < 4; k++) { ys.Add((k, pts[k].position.y, -(pts[k].position.z - prev[k].z) / dt)); prev[k] = pts[k].position; }
                        }
                        var speeds = new List<float>();
                        for (var k = 0; k < 4; k++)
                        {
                            var min = ys.Where(x => x.k == k).Min(x => x.y);
                            speeds.AddRange(ys.Where(x => x.k == k && x.y < min + 0.01f).Select(x => x.v));
                        }
                        speeds.Sort();
                        var med = speeds.Count > 0 ? speeds[speeds.Count / 2] : 0f;
                        var pace = c.Speed * hip / c.Hip;
                        lines.Add($"{id} set {g} {c.Name}: clip {c.Speed:0.000} m/s (actor hip {c.Hip:0.0000}); body hip {hip:0.0000} humanScale {a.humanScale:0.0000}; Pace's natural {pace:0.000}; measured stance speed {med:0.000} (n {speeds.Count}); ratio {med / pace:0.000}");
                        Object.Destroy(go);
                        yield return null;
                    }
            }
            Time.captureDeltaTime = keep;
            File.WriteAllLines(Path.Combine(Application.dataPath, "..", "test-results", "pace_calibration.txt"), lines);
            Debug.Log(string.Join("\n", lines));
        }
    }
}
#endif
