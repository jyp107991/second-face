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
            LocomotionBuild.Rebuild();
            CombatAnimatorBuild.Rebuild();
            var ctl = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>(LocomotionBuild.ControllerPath);
            var sm = ctl.layers[0].stateMachine;
            Assert.That(sm.defaultState != null && sm.defaultState.motion != null, Is.True, "the base layer's locomotion has its motion");
            Assert.That(sm.states.Any(s => s.state.name == SecondFace.Core.Combat.CombatMotion.StanceBase && s.state.motion == sm.defaultState.motion), Is.True, "fight_stand shares it");
            Debug.Log($"GateBatchSetup: {people} people grounded, {clips} clips configured, the fight's layers rebuilt");
        }
    }
}
#endif
