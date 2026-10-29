using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The Addressables skeleton (BUILD_PLAN §6.A.7): content loads by address with its materials bound, and is released.
    /// The entries are refreshed before play mode (asset creation cannot run inside it); the editor plays from the asset
    /// database, the player from the bundles built with it.
    /// </summary>
    public class AddressablesSmokeTests : IPrebuildSetup
    {
        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build addressable content");
#endif
        }

        [UnityTest]
        public IEnumerator AKitPieceLoadsByAddressWithItsMaterialsBound()
        {
            var handle = Addressables.InstantiateAsync("kits-shelter/wall_straight");
            yield return handle;
            Assert.That(handle.Status, Is.EqualTo(AsyncOperationStatus.Succeeded), handle.OperationException?.Message);
            var go = handle.Result;
            var renderers = go.GetComponentsInChildren<Renderer>();
            Assert.That(renderers, Is.Not.Empty);
            var names = renderers.SelectMany(r => r.sharedMaterials).Where(m => m != null).Select(m => m.name).ToList();
            Assert.That(names, Is.Not.Empty);
            Assert.That(names.Where(n => n.StartsWith("mat_")), Is.Empty, "placeholder materials: the prefab was saved before binding");
            Assert.That(Addressables.ReleaseInstance(go), Is.True);
        }

        [UnityTest]
        public IEnumerator EveryTreeLoadsByLabel()
        {
            var handle = Addressables.LoadResourceLocationsAsync("tree");
            yield return handle;
            Assert.That(handle.Status, Is.EqualTo(AsyncOperationStatus.Succeeded));
            Assert.That(handle.Result.Count, Is.EqualTo(9), "three species × three seeds");
            Assert.That(handle.Result.All(l => l.PrimaryKey.StartsWith("kits-trees/")), Is.True);
            Addressables.Release(handle);
        }
    }
}
