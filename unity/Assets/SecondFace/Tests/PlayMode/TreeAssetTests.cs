#if UNITY_EDITOR
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Game.World;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>
    /// The card trees as imported (tools/unity/kits/trees.py → Kits/Trees): each a LODGroup of three levels within the
    /// triangle budgets of BUILD_PLAN §6.L, every material slot naming a texture that exists. Editor-only asset checks;
    /// they live beside the PlayMode tests because the EditMode folder is shared with the .NET Core build.
    /// </summary>
    public class TreeAssetTests
    {
        private static int Triangles(Renderer r)
        {
            var mesh = r.GetComponent<MeshFilter>()?.sharedMesh;
            if (mesh == null) return 0;
            var n = 0; for (var i = 0; i < mesh.subMeshCount; i++) n += (int)mesh.GetIndexCount(i) / 3;
            return n;
        }

        [Test]
        public void EveryTreeHasThreeLodsWithinBudget()
        {
            var trees = ModelLibrary.Load().Values.Where(e => ModelLibrary.IsCardTree(e)).ToList();
            Assert.That(trees, Is.Not.Empty, "no card trees in the model library (Kits/Trees/trees.json)");
            foreach (var path in trees.SelectMany(ModelLibrary.VariantPaths))
            {
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                Assert.That(model, Is.Not.Null, path);
                var group = model.GetComponent<LODGroup>();
                Assert.That(group, Is.Not.Null, $"{path}: no LODGroup");
                var lods = group.GetLODs();
                Assert.That(lods.Length, Is.EqualTo(3), path);
                var tris = lods.Select(l => l.renderers.Sum(Triangles)).ToArray();
                Assert.That(tris[0], Is.InRange(500, 3000), $"{path} LOD0");
                Assert.That(tris[1], Is.LessThan(tris[0] / 2), $"{path} LOD1");
                Assert.That(tris[2], Is.LessThanOrEqualTo(8), $"{path} LOD2 (the crossed impostor)");
                Assert.That(lods[0].screenRelativeTransitionHeight, Is.GreaterThan(lods[1].screenRelativeTransitionHeight), path);
            }
        }

        [Test]
        public void EveryTreeSlotNamesATextureThatExists()
        {
            var lib = TextureLibrary.Load();
            foreach (var path in ModelLibrary.Load().Values.Where(e => ModelLibrary.IsCardTree(e)).SelectMany(ModelLibrary.VariantPaths))
                foreach (var r in AssetDatabase.LoadAssetAtPath<GameObject>(path).GetComponentsInChildren<Renderer>())
                    foreach (var m in r.sharedMaterials)
                    {
                        var key = m.name.StartsWith("mat_") ? m.name.Substring(4) : m.name;
                        if (key.StartsWith("card:") || key.StartsWith("card_"))
                            Assert.That(File.Exists($"Assets/SecondFace/Kits/Trees/tex/card_{key.Substring(5)}.png"), Is.True, $"{path}: {m.name}");
                        else
                            Assert.That(lib.ContainsKey(key), Is.True, $"{path}: {m.name} is not a library material");
                    }
        }
    }
}
#endif
