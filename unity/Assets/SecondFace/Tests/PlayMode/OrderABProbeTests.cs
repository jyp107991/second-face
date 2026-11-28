using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;
using SecondFace.Game.Fighting;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>TEMP (relaunch 16, never committed; ruled 16:05Z): SeatTurn against ClipTurnFirst in a sit-to-fight crossfade, both orders:
    /// twin 1 has the sit's turn put on first, twin 2 the fight clip's; the hips' and thighs' difference while both act, and how far each
    /// correction reaches then.</summary>
    public class OrderABProbeTests
    {
        private readonly List<GameObject> _made = new();
        [UnityTearDown] public IEnumerator CleanUp() { foreach (var g in _made) if (g != null) Object.Destroy(g); _made.Clear(); yield return null; }

        private sealed class Runner : MonoBehaviour { }

        [DefaultExecutionOrder(-30)]
        private sealed class Driver : MonoBehaviour
        {
            public SeatTurn S1, S2; public Fighter F1, F2;
            private void LateUpdate()
            {
                if (S1 != null && F1 != null) { S1.Turn(); F1.TurnOntoTheActor(); }   // the sit's turn first
                if (S2 != null && F2 != null) { F2.TurnOntoTheActor(); S2.Turn(); }   // the fight clip's first
            }
        }

        private static double Ang(Quaternion a, Quaternion b) => ClearanceJobTests.Ang(a, b);

        [UnityTest, Timeout(900000)]
        public IEnumerator TheSitAndTheFightClipBothWays()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null; WorldAssets assets = null;
#endif
            if (cat == null || controller == null || assets == null || assets.Combat == null) { Assert.Ignore("not built"); yield break; }
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            yield return null;
            var lines = new List<string>();
            try
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(g);
                g.transform.localScale = new Vector3(20f, 1f, 20f); g.transform.position = new Vector3(0f, -0.5f, 0f);
                Physics.SyncTransforms();
                var host = new GameObject("order host"); _made.Add(host);
                var fx = new CombatFx(host.transform);
                var runner = host.AddComponent<Runner>();
                foreach (var (id, model, male) in Bodies(cat, assets))
                {
                    var w = new Walker[2]; var v = new AnimatedUnitView[2];
                    for (var k = 0; k < 2; k++)
                    {
                        w[k] = Walker.Create(model, controller, new Vector3(k * 2f, 0f, 0f), 0f, male);
                        w[k].gameObject.name = "order twin " + id; _made.Add(w[k].gameObject);
                        if (w[k].Agent != null) w[k].Agent.enabled = false;
                        w[k].enabled = false;
                        var u = new BattleUnit { C = new Combatant { Id = id, Name = id, Team = "gate", Sheet = Sheet.Empty(id), Inv = Inv.Empty(), Ap = 8, Morale = 60 } };
                        u.Place(0, 0);
                        v[k] = CombatViews.ForBody(u, w[k].transform, runner, fx, assets.Combat, !male, theirs: false);
                    }
                    yield return Frames(30);
                    var s = w.Select(x => x.Animator.GetComponent<SeatTurn>()).ToArray();
                    var f = v.Select(x => x != null ? x.Fighter : null).ToArray();
                    var c = w.Select(x => x.Animator.GetComponentInChildren<ClipTurnFirst>()).ToArray();
                    if (s.Any(x => x == null) || f.Any(x => x == null)) { lines.Add($"{id}: no SeatTurn ({s.Count(x => x != null)}) or no Fighter ({f.Count(x => x != null)})"); continue; }
                    lines.Add($"{id}: skeleton {CombatSet.SkeletonKey(w[0].Animator)}, a seat turn baked for it {assets.Combat.SeatTurnOf(Animator.StringToHash("sit"), CombatSet.SkeletonKey(w[0].Animator), 0.5f, out _, out _, out _, out _)}");
                    foreach (var x in s) { x.enabled = false; x.Set = assets.Combat; }   // (the game's set: CombatViews.Install is the boot's)
                    foreach (var x in c) if (x != null) x.enabled = false;
                    var drv = host.AddComponent<Driver>(); drv.S1 = s[0]; drv.F1 = f[0]; drv.S2 = s[1]; drv.F2 = f[1];
                    // sit, then the fight's aim while seated: the full layer weighs in over the sit
                    foreach (var x in w) x.Animator.CrossFadeInFixedTime("sit", 0.25f, 0);
                    yield return Frames(60);
                    var sitTag = w[0].Animator.GetCurrentAnimatorStateInfo(0).IsTag("sit");
                    lines.Add($"{id}: the sit's own turn before the aim (the driver puts it on) {Ang(Quaternion.identity, s[0].TurnRot):0.0000}°");
                    lines.Add($"{id}: seated (the base layer's state tagged sit) {sitTag}; seats in the set {(assets.Combat.Seats != null ? assets.Combat.Seats.Length : 0)}");
                    var hips = w.Select(x => x.Animator.GetBoneTransform(HumanBodyBones.Hips)).ToArray();
                    var thL = w.Select(x => x.Animator.GetBoneTransform(HumanBodyBones.LeftUpperLeg)).ToArray();
                    for (var k = 0; k < 2; k++) runner.StartCoroutine(v[k].OnAim(w[k].transform.position + w[k].transform.forward * 8f + Vector3.up));
                    double worstH = 0, worstT = 0; float seatMax = 0f, clipMax = 0f; var both = 0;
                    for (var i = 0; i < 90; i++)
                    {
                        yield return null;
                        var ih0 = Quaternion.Inverse(w[0].transform.rotation); var ih1 = Quaternion.Inverse(w[1].transform.rotation);
                        var dh = Ang(ih0 * hips[0].rotation, ih1 * hips[1].rotation);
                        var dt = Ang(ih0 * thL[0].rotation, ih1 * thL[1].rotation);
                        worstH = System.Math.Max(worstH, dh); worstT = System.Math.Max(worstT, dt);
                        var sa = (float)Ang(Quaternion.identity, s[0].TurnRot); var fa = (float)Ang(Quaternion.identity, f[0].TurnRot);
                        seatMax = Mathf.Max(seatMax, sa); clipMax = Mathf.Max(clipMax, fa);
                        if (sa > 0.001f && fa > 0.001f) both++;
                    }
                        lines.Add($"{id}: both corrections acting in {both} of 90 frames (the sit's turn up to {seatMax:0.0000}°, the fight clip's up to {clipMax:0.0000}°); the two orders' hips apart up to {worstH:0.0000}°, left thigh {worstT:0.0000}°");
                    Object.Destroy(drv);
                    foreach (var x in w) Object.Destroy(x.gameObject);
                    yield return null;
                }
            }
            finally { Time.captureDeltaTime = keep; }
            Debug.Log("ORDER AB\n" + string.Join("\n", lines));
        }

        /// <summary>The sit's own turn in the game's own order (SeatTurn and ClipTurnFirst enabled, no driver): how far it turns while
        /// seated before the aim, and both corrections through the aim (the orders' pre-check, ruled 2026-11-28).</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheSitsOwnTurnInTheGamesOrder()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null; WorldAssets assets = null;
#endif
            if (cat == null || controller == null || assets == null || assets.Combat == null) { Assert.Ignore("not built"); yield break; }
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            yield return null;
            var lines = new List<string>();
            try
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(g);
                g.transform.localScale = new Vector3(20f, 1f, 20f); g.transform.position = new Vector3(0f, -0.5f, 0f);
                Physics.SyncTransforms();
                var host = new GameObject("order host"); _made.Add(host);
                var fx = new CombatFx(host.transform);
                var runner = host.AddComponent<Runner>();
                foreach (var (id, model, male) in Bodies(cat, assets))
                {
                    var w = Walker.Create(model, controller, Vector3.zero, 0f, male);
                    w.gameObject.name = "order one " + id; _made.Add(w.gameObject);
                    if (w.Agent != null) w.Agent.enabled = false;
                    w.enabled = false;
                    var u = new BattleUnit { C = new Combatant { Id = id, Name = id, Team = "gate", Sheet = Sheet.Empty(id), Inv = Inv.Empty(), Ap = 8, Morale = 60 } };
                    u.Place(0, 0);
                    var v = CombatViews.ForBody(u, w.transform, runner, fx, assets.Combat, !male, theirs: false);
                    yield return Frames(30);
                    var s = w.Animator.GetComponent<SeatTurn>();
                    var f = v != null ? v.Fighter : null;
                    if (s == null || f == null) { lines.Add($"{id}: no SeatTurn or no Fighter"); continue; }
                    s.Set = assets.Combat;
                    w.Animator.CrossFadeInFixedTime("sit", 0.25f, 0);
                    float sitMax = 0f, sitSum = 0f; var sitOn = 0;
                    for (var i = 0; i < 60; i++) { yield return null; var a = (float)Ang(Quaternion.identity, s.TurnRot); sitMax = Mathf.Max(sitMax, a); sitSum += a; if (a > 0.001f) sitOn++; }
                    lines.Add($"{id}: skeleton {CombatSet.SkeletonKey(w.Animator)}; seated {w.Animator.GetCurrentAnimatorStateInfo(0).IsTag("sit")}; the sit's own turn before the aim: up to {sitMax:0.0000}°, mean {sitSum / 60f:0.0000}°, acting in {sitOn} of 60 frames; SeatTurn enabled {s.enabled}; the fight's whole-body layer weighs {w.Animator.GetLayerWeight(w.Animator.GetLayerIndex(SecondFace.Core.Combat.CombatMotion.FullLayer)):0.000} (the sit's turn acts only on what it leaves); a seat turn baked for it {assets.Combat.SeatTurnOf(Animator.StringToHash("sit"), CombatSet.SkeletonKey(w.Animator), 0.5f, out _, out _, out _, out _)}");
                    runner.StartCoroutine(v.OnAim(w.transform.position + w.transform.forward * 8f + Vector3.up));
                    float seatMax = 0f, clipMax = 0f; var both = 0;
                    for (var i = 0; i < 90; i++) { yield return null; var sa = (float)Ang(Quaternion.identity, s.TurnRot); var fa = (float)Ang(Quaternion.identity, f.TurnRot); seatMax = Mathf.Max(seatMax, sa); clipMax = Mathf.Max(clipMax, fa); if (sa > 0.001f && fa > 0.001f) both++; }
                    lines.Add($"{id}: through the aim, the sit's turn up to {seatMax:0.0000}°, the fight clip's up to {clipMax:0.0000}°, both acting in {both} of 90 frames");
                    Object.Destroy(w.gameObject);
                    yield return null;
                }
            }
            finally { Time.captureDeltaTime = keep; }
            Debug.Log("SIT TURN\n" + string.Join("\n", lines));
            File.WriteAllLines(Path.Combine(Application.dataPath, "..", "test-results", "sit_turn.txt"), lines);
        }

        /// <summary>The bodies: the player's two (their skeletons have the seat turns baked) and two of the cast's.</summary>
        private static IEnumerable<(string Id, GameObject Model, bool Male)> Bodies(RocketboxCatalog cat, WorldAssets assets)
        {
            if (assets.PlayerF != null) yield return ("player_f", assets.PlayerF, false);
            if (assets.PlayerM != null) yield return ("player_m", assets.PlayerM, true);
            foreach (var id in new[] { "Female_Adult_01", "Male_Adult_08" })
            {
                var person = SecondFace.Core.Npc.RbPeople.Of(id);
                yield return (id, cat.Get(id), person?.Male ?? id.Contains("Male"));
            }
        }

        private static IEnumerator Frames(int n) { for (var i = 0; i < n; i++) yield return null; }
    }
}
