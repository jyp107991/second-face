using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>Everything a playable build needs rebuilt after the content or the people change, in order: the places
    /// from the exported maps, the Rocketbox people's prefabs and catalogue, the world assets that name them.</summary>
    public static class PlayBuild
    {
        [MenuItem("Second Face/Prepare a playable build")]
        public static void Prepare()
        {
            PlaceBuilder.Build();
            RocketboxPeopleBuild.Build();
            WorldAssetsBuild.Build();
            AssetDatabase.SaveAssets();
            Debug.Log("PlayBuild: places, people and world assets rebuilt");
        }
    }
}
