using SecondFace.Game;
using SecondFace.Game.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The world's assets for the app (step 23): <see cref="WorldAssets"/> at <see cref="AssetPath"/> names the terrain
    /// layer set, the scatter catalogue, the detail set, the place set and the sky profile (each built by its own menu),
    /// and the Boot scene's <see cref="Bootstrap"/> holds it, so a player build carries them. Both committed; the build
    /// guard refuses a build whose Boot scene does not hold it.
    /// </summary>
    public static class WorldAssetsBuild
    {
        public const string AssetPath = "Assets/SecondFace/World/WorldAssets.asset";

        [MenuItem("Second Face/Build world assets")]
        public static WorldAssets Build()
        {
            var a = AssetDatabase.LoadAssetAtPath<WorldAssets>(AssetPath);
            var fresh = a == null;
            if (fresh) a = ScriptableObject.CreateInstance<WorldAssets>();
            a.Layers = AssetDatabase.LoadAssetAtPath<BiomeLayerSet>(TerrainLayerLibrary.SetPath);
            a.Catalog = AssetDatabase.LoadAssetAtPath<ScatterCatalog>("Assets/SecondFace/World/ScatterCatalog.asset");
            a.Details = AssetDatabase.LoadAssetAtPath<DetailSet>("Assets/SecondFace/World/DetailSet.asset");
            a.Places = AssetDatabase.LoadAssetAtPath<PlaceSet>("Assets/SecondFace/World/PlaceSet.asset");
            a.Sky = AssetDatabase.LoadAssetAtPath<SkyProfile>("Assets/SecondFace/Sky/SkyProfile.asset");
            if (fresh) AssetDatabase.CreateAsset(a, AssetPath); else EditorUtility.SetDirty(a);
            AssetDatabase.SaveAssets();
            if (!a.Complete) Debug.LogWarning("WorldAssetsBuild: some of the world's assets are missing (build terrain layers, scatter catalog, detail meshes, places, sky assets)");
            return a;
        }

        /// <summary>Builds the world assets and puts them on the Boot scene's Bootstrap (opens and saves the scene).</summary>
        [MenuItem("Second Face/Wire the Boot scene")]
        public static void WireBoot()
        {
            var a = Build();
            var complete = a.Complete;   // before the scene opens: opening it unloads the loaded references
            var scene = EditorSceneManager.OpenScene(ProjectSetup.ScenePath, OpenSceneMode.Single);
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            if (boot == null) { Debug.LogError("WorldAssetsBuild: no Bootstrap in the Boot scene"); return; }
            boot.World = a;
            EditorUtility.SetDirty(boot);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
            Debug.Log($"WorldAssetsBuild: the Boot scene holds {AssetPath} (complete: {complete})");
        }
    }
}
