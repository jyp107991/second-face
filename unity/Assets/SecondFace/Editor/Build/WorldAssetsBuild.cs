using System.Linq;
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
    /// and the walkabout's people with their locomotion controller (step 25),
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
            // every person's torso measured for the arms' clearance (the owner's note: nothing sinks into a body)
            TorsoMeasure.MeasureEvery(false);
            // the walkabout (step 25): the drifter walks, the other P2 people stand about the town
            a.Walker = Person("p3_drifter_m");
            // the people are made from the player's two bases (P4.13; WorldAssets.PlayerF/M); the P2 people stand in only
            // while the bases are not built
            a.Townsfolk = new[] { "p1_labourer_m", "p2_settler_f", "p5_street_m", "p6_nomad_f", "p4_gilded_f" }.Select(Person).Where(g => g != null).ToArray();
            a.Locomotion = LocomotionBuild.Build();
            a.Sack = AssetDatabase.LoadAssetAtPath<Material>("Assets/SecondFace/Materials/Library/burlap.mat");
            a.Cast = new WorldAssets.CastEntry[0];   // the per-person cast models are retired (P4.13 step 6)
            // the player's bodies for the pack's figure (P5.3h), as WardrobeBuild made them
            a.PlayerM = AssetDatabase.LoadAssetAtPath<GameObject>($"{PeopleDir}/player_m.prefab");
            a.PlayerF = AssetDatabase.LoadAssetAtPath<GameObject>($"{PeopleDir}/player_f.prefab");
            if (fresh) AssetDatabase.CreateAsset(a, AssetPath); else EditorUtility.SetDirty(a);
            AssetDatabase.SaveAssets();
            if (!a.Complete) Debug.LogWarning("WorldAssetsBuild: some of the world's assets are missing (build terrain layers, scatter catalog, detail meshes, places, sky assets)");
            return a;
        }

        public const string PeopleDir = "Assets/SecondFace/Prefabs/people";

        /// <summary>A P2 person as a prefab with their materials bound (the model's own slots are placeholders that
        /// <see cref="PeopleMaterials"/> binds in the editor; an instance made at runtime would stand white). Built when
        /// missing, committed: a rebuild renumbers the prefab.</summary>
        public static GameObject Person(string name) => Person(name, PeopleTestScene.Dir, false);
        public static GameObject Person(string name, string modelDir) => Person(name, modelDir, false);

        public static GameObject Person(string name, string modelDir, bool force)
        {
            var path = $"{PeopleDir}/{name}.prefab";
            var existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (existing != null && !force) return existing;
            var model = AssetDatabase.LoadAssetAtPath<GameObject>($"{modelDir}/{name}.fbx");
            if (model == null) { Debug.LogWarning($"WorldAssetsBuild: no {modelDir}/{name}.fbx (tools/unity/people/mh_build.py)"); return null; }
            System.IO.Directory.CreateDirectory(PeopleDir);
            var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
            PeopleMaterials.Bind(go, modelDir);
            var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
            Object.DestroyImmediate(go);
            return prefab;
        }

        /// <summary>Rebuilds the bound person prefabs (after mh_build changed the models: new parts, the LOD levels).</summary>
        [MenuItem("Second Face/Rebuild people prefabs")]
        public static void RebuildPeople()
        {
            foreach (var n in new[] { "p1_labourer_m", "p2_settler_f", "p3_drifter_m", "p4_gilded_f", "p5_street_m", "p6_nomad_f" }) Person(n, PeopleTestScene.Dir, true);
            AssetDatabase.SaveAssets();
            Debug.Log("WorldAssetsBuild: people prefabs rebuilt");
        }

        /// <summary>Builds the world's and the interface's assets and puts them on the Boot scene's Bootstrap (opens and
        /// saves the scene).</summary>
        [MenuItem("Second Face/Wire the Boot scene")]
        public static void WireBoot()
        {
            var a = Build();
            var ui = UIBuild.Build();
            var complete = a.Complete;   // before the scene opens: opening it unloads the loaded references
            var scene = EditorSceneManager.OpenScene(ProjectSetup.ScenePath, OpenSceneMode.Single);
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            if (boot == null) { Debug.LogError("WorldAssetsBuild: no Bootstrap in the Boot scene"); return; }
            boot.World = a;
            boot.Interface = ui;
            EditorUtility.SetDirty(boot);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
            Debug.Log($"WorldAssetsBuild: the Boot scene holds {AssetPath} (complete: {complete})");
        }
    }
}
