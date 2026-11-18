#if UNITY_EDITOR
using NUnit.Framework;
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
            CombatAnimatorBuild.Rebuild();
            Debug.Log($"GateBatchSetup: {people} people grounded, {clips} clips configured, the fight's layers rebuilt");
        }
    }
}
#endif
