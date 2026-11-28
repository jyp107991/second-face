#if UNITY_EDITOR
using System.Linq;
using UnityEngine;

namespace SecondFace.EditorTools
{
    // TEMP (relaunch 16; never committed): step 1's build in one editor run: the people re-parented, the people built again
    // (prefabs, flank correctives, skin points, layers), the fight's facts with their turns and seats baked again.
    public static class R16Build
    {
        public static void Step1()
        {
            RocketboxImportPostprocessor.ReparentAll();
            var all = System.IO.Directory.GetFiles(RocketboxImportPostprocessor.People, "*.fbx", System.IO.SearchOption.AllDirectories);
            var left = all.Count(p => !(UnityEditor.AssetImporter.GetAtPath(p.Replace('\\', '/')) is UnityEditor.ModelImporter m) || !RocketboxImportPostprocessor.ForMoves(m.humanDescription));
            if (left > 0) { Debug.LogError($"R16Build.Step1: {left} of {all.Length} people not re-parented: stopped before the build"); return; }
            RocketboxPeopleBuild.Build();
            CombatAnimatorBuild.RefreshFacts();
            Debug.Log("R16Build.Step1 done");
        }
    }
}
#endif
