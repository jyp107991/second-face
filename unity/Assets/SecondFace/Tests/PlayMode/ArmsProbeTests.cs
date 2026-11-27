// TEMP (never commit): ArmsStayOutOfTheBody's townsfolk under configs (editor hand-off 1127d)
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Core.Save;
using SecondFace.Game;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace SecondFace.Tests
{
    public class ArmsProbeTests : IPrebuildSetup
    {
        public void Setup() => new BootTests().Setup();

        [UnityTearDown]
        public IEnumerator TearDown() { Time.captureDeltaTime = 0f; yield return BootTests.Clear(); }

        private static IEnumerator Boot(System.Action<Bootstrap> done)
        {
            if (Directory.Exists(BootTests.SavesDir)) Directory.Delete(BootTests.SavesDir, true);
            Bootstrap.MakeSession = () => new Session(new DirectoryBackend(BootTests.SavesDir));
            Walkabout.StartAt = "shale";
            SceneManager.LoadScene("Boot");
            yield return null;
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && boot.Title == null) yield return null;
            for (var i = 0; i < 2; i++) yield return null;
            BootTests.Press(boot.Title.NewButton);
            var creation = boot.UI.Top as CreationScreen;
            for (var i = 0; i < 3; i++) yield return null;
            BootTests.Press(creation.Content.Q<UnityEngine.UIElements.Button>("origin-" + SecondFace.Core.Stats.Creation.Origins()[0].Id));
            creation.Content.Q<UnityEngine.UIElements.TextField>("name").value = "Ash Corran";
            Assert.That(creation.Finish(), Is.True);
            while (Time.realtimeSinceStartup - t0 < 360f && (boot.Walkabout == null || !boot.Walkabout.Ready)) yield return null;
            Assert.That(boot.Walkabout.Ready, Is.True);
            done(boot);
        }

        private static string States(Animator a)
        {
            if (a == null) return "";
            var sb = new StringBuilder();
            for (var l = 0; l < a.layerCount; l++)
            {
                var w = l == 0 ? 1f : a.GetLayerWeight(l);
                if (w < 0.01f) continue;
                var ci = a.GetCurrentAnimatorClipInfo(l);
                var top = ci.Length > 0 ? ci.OrderByDescending(c => c.weight).First() : default;
                sb.Append($"L{l} {w:0.00} {(ci.Length > 0 ? top.clip.name + " " + top.weight.ToString("0.00") : "-")}; ");
            }
            var sp = a.parameters.Any(p => p.name == "Speed") ? a.GetFloat("Speed") : -1f;
            return sb + $"speed {sp:0.00}";
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator TownsfolksArmsUnderConfigs()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            boot.Stage.Clock.SetHour(12);
            boot.Stage.Sky.Apply();
            walk.Rig.Limit(walk.Rig.PitchMin, walk.Rig.PitchMax, 1.2f, walk.Rig.DistanceMax, 0f);
            walk.Rig.Follow(walk.Walker.transform); walk.Rig.View(walk.Walker.transform.eulerAngles.y, 24f, 2.4f);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 12f) yield return null;
            var log = new StringBuilder();
            var cfg = (System.Environment.GetEnvironmentVariable("ARMS_CFG") ?? "base,fix60,fix15,nostride,noout,norest,alloff,fix60alloff,base").Split(',');
            var frames = int.TryParse(System.Environment.GetEnvironmentVariable("ARMS_FRAMES"), out var nf) ? nf : 180;
            foreach (var c in cfg)
            {
                var seen = walk.People.Residents.Where(r => r.Person != null && r.Person.Full && r.Person.gameObject.activeInHierarchy)
                    .Select(r => (Who: r.Rb?.Id ?? r.Body, C: r.Person.Animator != null ? r.Person.Animator.GetComponent<ArmClearance>() : null))
                    .Where(x => x.C != null && x.C.Ready && x.C.enabled).ToList();
                var all = c.Contains("alloff");
                foreach (var (_, a) in seen)
                {
                    a.StrideEnd = !(all || c == "nostride"); a.OutRetry = !(all || c == "noout"); a.RestOutRetry = !(all || c == "norest");
                }
                Time.captureDeltaTime = c.StartsWith("fix60") ? 1f / 60f : c.StartsWith("fix15") ? 1f / 15f : c.StartsWith("fix30") ? 1f / 30f : 0f;
                for (var i = 0; i < 20; i++) yield return null;
                var each = new float[seen.Count]; var where = new string[seen.Count]; var eachDt = new float[seen.Count];
                var dts = new List<float>(); var deepDts = new List<float>(); var deepFrames = 0; var g0 = Time.time; var r0 = Time.realtimeSinceStartup;
                for (var f = 0; f < frames; f++)
                {
                    yield return null;
                    var dt = Time.deltaTime; dts.Add(dt); var any = false;
                    for (var i = 0; i < seen.Count; i++)
                    {
                        if (seen[i].C == null) continue;
                        var d = seen[i].C.Depth();
                        if (d > each[i]) { each[i] = d; where[i] = seen[i].C.DepthWhere + " | " + States(seen[i].C.GetComponent<Animator>()); eachDt[i] = dt; }
                        if (d > 0.012f) any = true;
                    }
                    if (any) { deepFrames++; deepDts.Add(dt); }
                }
                dts.Sort(); deepDts.Sort();
                float Med(List<float> v) => v.Count == 0 ? float.NaN : v[v.Count / 2];
                var max = each.Length > 0 ? each.Max() : 0f;
                var over = each.Count(x => x >= 0.012f);
                log.AppendLine($"arms_probe: {c}: {seen.Count} folk, {frames} frames over {Time.time - g0:0.00} s game / {Time.realtimeSinceStartup - r0:0.0} s real; dt median {Med(dts) * 1000f:0.0} ms (max {dts.Last() * 1000f:0.0}); max {max * 100f:0.00} cm; folk >= 1.2 cm: {over}; frames with any >1.2: {deepFrames}, their dt median {Med(deepDts) * 1000f:0.0} ms");
                log.AppendLine("arms_probe:   " + string.Join(", ", Enumerable.Range(0, seen.Count).OrderByDescending(i => each[i]).Take(8).Select(i => $"{seen[i].Who} {each[i] * 100f:0.0} @dt {eachDt[i] * 1000f:0} ({where[i]})")));
            }
            Time.captureDeltaTime = 0f;
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/arms_probe.txt"), log.ToString());
            Debug.Log(log.ToString());
        }
    }
}
