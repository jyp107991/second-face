namespace SecondFace.EditorTools
{
    /// <summary>Temporary (the gate agent's batch, not committed): the builds and checks in one editor session.</summary>
    public static class GateBatchChain
    {
        public static void Run()
        {
            LocomotionBuild.Rebuild();
            CombatAnimatorBuild.Rebuild();
            LocalizationBuild.Build();
        }

        /// <summary>The three builds, then every clip's avatar checked.</summary>
        public static void RunAndCheck()
        {
            UnityEngine.Debug.Log($"GateBatchChain: {MotionImportPostprocessor.ConfigureAll()} clips configured from their T-pose");
            Run();
            MotionImportCheck.Run();
        }

        /// <summary>After motion set v6.1's import: the locomotion controller rebuilt, then every clip's avatar checked.</summary>
        public static void Import()
        {
            LocomotionBuild.Rebuild();
            MotionImportCheck.Run();
        }
    }
}
