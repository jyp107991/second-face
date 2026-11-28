using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.EditorTools;
using SecondFace.Game.Fighting;
using SecondFace.Game.People;
using SecondFace.Game.World;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>TEMP (relaunch 16, never committed; asked 2026-11-28 17:4xZ): the player's own skeletons (player_f, player_m: MakeHuman
    /// models) against each whole-body fight clip's and each sit's own actor, bare, measured as the cast's turns are baked
    /// (CombatAnimatorBuild.BakeTurnAt: the hips' turn onto the actor's, each thigh's, the shift, the shanks' and feet's residual), beside
    /// two of the cast (FA01, MA08) measured the same way in the same run. Nothing is written into the combat set.</summary>
    public class PlayerTurnProbeTests
    {
        [Test]
        public void ThePlayersFightAndSitPosesAgainstTheActors()
        {
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            Assert.That(assets != null && cat != null && assets.PlayerF != null && assets.PlayerM != null, Is.True, "built");
            string Key(GameObject prefab)
            {
                var go = Object.Instantiate(prefab); go.hideFlags = HideFlags.HideAndDontSave;
                try { var a = go.GetComponentInChildren<Animator>(); a.Rebind(); return CombatSet.SkeletonKey(a); }
                finally { Object.DestroyImmediate(go); }
            }
            var bodies = new[] { ("player_f", assets.PlayerF, true), ("player_m", assets.PlayerM, false), ("Female_Adult_01", cat.Get("Female_Adult_01"), true), ("Male_Adult_08", cat.Get("Male_Adult_08"), false) };
            var lines = new List<string>();
            var sum = new List<string>();
            foreach (var (id, prefab, female) in bodies)
            {
                var key = Key(prefab);
                var clips = CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer).Select(s => s.ClipFor(female)).Where(c => c != null).Distinct().OrderBy(c => c, System.StringComparer.Ordinal).ToList();
                var hips = new List<float>(); var thighs = new List<float>(); var shifts = new List<float>(); var res = new List<float>();
                lines.Add($"{id} (skeleton {key}): {clips.Count} whole-body clips of its sex, and the sits");
                foreach (var clip in clips)
                {
                    var tu = CombatAnimatorBuild.BakeTurn(clip, key, prefab, out var n, out var h, out var sh, out var th, out var r);
                    if (tu == null) { lines.Add($"  {clip}: not measured (no clip or no humanoid avatar)"); continue; }
                    hips.Add(h); thighs.Add(th); shifts.Add(sh); res.Add(r);
                    lines.Add(string.Format(System.Globalization.CultureInfo.InvariantCulture, "  {0}: {1} samples, hips up to {2:0.0}°, thighs up to {3:0.0}°, shift up to {4:0.0} cm, shanks and feet left within {5:0.00}°", clip, n, h, th, sh * 100f, r));
                }
                var sh2 = new List<float>(); var th2 = new List<float>();
                foreach (var (state, clip, path) in CombatAnimatorBuild.SeatStates())
                {
                    var tu = CombatAnimatorBuild.BakeTurnAt(path, clip, key, prefab, out var n, out var h, out var sh, out var th, out var r);
                    if (tu == null) { lines.Add($"  {state} ({path}): not measured"); continue; }
                    sh2.Add(h); th2.Add(th);
                    lines.Add(string.Format(System.Globalization.CultureInfo.InvariantCulture, "  {0} ({1}): {2} samples, hips up to {3:0.0}°, thighs up to {4:0.0}°, shift up to {5:0.0} cm, shanks and feet left within {6:0.00}°", state, path, n, h, th, sh * 100f, r));
                }
                float Q(List<float> v, float q) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp(Mathf.CeilToInt(q * s.Count) - 1, 0, s.Count - 1)]; }
                sum.Add(string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0} ({1}): the fight clips' hips turn median {2:0.0}°, max {3:0.0}°; thighs median {4:0.0}°, max {5:0.0}°; shift max {6:0.0} cm; residual max {7:0.00}°; the sits' hips max {8:0.0}°, thighs max {9:0.0}°",
                    id, key, Q(hips, 0.5f), hips.DefaultIfEmpty(float.NaN).Max(), Q(thighs, 0.5f), thighs.DefaultIfEmpty(float.NaN).Max(), shifts.DefaultIfEmpty(float.NaN).Max() * 100f, res.DefaultIfEmpty(float.NaN).Max(), sh2.DefaultIfEmpty(float.NaN).Max(), th2.DefaultIfEmpty(float.NaN).Max()));
            }
            var all = sum.Concat(new[] { "" }).Concat(lines).ToList();
            System.IO.File.WriteAllLines(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "player_turns.txt"), all);
            Debug.Log("PLAYER TURNS\n" + string.Join("\n", all));
        }
    }
}
