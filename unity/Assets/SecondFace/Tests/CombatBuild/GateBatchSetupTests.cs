#if UNITY_EDITOR
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using SecondFace.EditorTools;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>Temporary (the gate agent's batch, not committed): the imports' second steps in one EditMode run (the editor's
    /// delayed calls do not run before the tests).</summary>
    public class GateBatchSetupTests
    {
        [Test]
        public void Setup()
        {
            var people = PeopleImportPostprocessor.GroundAll();
            var clips = MotionImportPostprocessor.ConfigureAll();
            // the fight's clips whose imported root settings are not the table's (a table changed after the import: the
            // importer applies it on each import, so these are imported again with it)
            var stale = 0;
            foreach (var c in SecondFace.Core.Combat.CombatMotion.Clips.Concat(SecondFace.Core.Combat.CombatMotion.Spare))
            {
                var path = $"{SecondFace.Core.Combat.CombatMotion.Folder}/{c.Name}.fbx";
                if (!(AssetImporter.GetAtPath(path) is ModelImporter imp) || imp.clipAnimations == null || imp.clipAnimations.Length == 0) continue;
                var apply = c.XZ == SecondFace.Core.Combat.RootXZ.Apply;
                if (!imp.clipAnimations.Any(a => a.lockRootPositionXZ == apply)) continue;
                var all = imp.clipAnimations;
                foreach (var a in all) a.lockRootPositionXZ = !apply;
                imp.clipAnimations = all;
                imp.SaveAndReimport();
                stale++;
            }
            LocomotionBuild.Rebuild();
            CombatAnimatorBuild.Rebuild();
            var ctl = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>(LocomotionBuild.ControllerPath);
            var sm = ctl.layers[0].stateMachine;
            Assert.That(sm.defaultState != null && sm.defaultState.motion != null, Is.True, "the base layer's locomotion has its motion");
            Assert.That(sm.states.Any(s => s.state.name == SecondFace.Core.Combat.CombatMotion.StanceBase && s.state.motion == sm.defaultState.motion), Is.True, "fight_stand shares it");
            Debug.Log($"GateBatchSetup: {people} people grounded, {clips} clips configured, {stale} fight clips imported again for the table's root motion, the fight's layers rebuilt");
        }
    }
}
#endif
