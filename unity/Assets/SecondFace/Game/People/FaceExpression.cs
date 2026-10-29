using SecondFace.Core.Npc;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Puts a face from Core <see cref="Expressions"/> on a person (P5.3l): every skinned mesh under them carrying the
    /// expression units (the body, and the brows, lashes and eyes refitted to it) gets the face's weights, every other unit
    /// back to none. People built before the units were baked have none of them and keep their face.
    /// </summary>
    public static class FaceExpression
    {
        /// <summary>Sets a face (by name) on a person; returns how many unit weights were set.</summary>
        public static int Set(GameObject person, string face)
        {
            if (person == null) return 0;
            var weights = Expressions.Of(face);
            var set = 0;
            foreach (var r in person.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var mesh = r.sharedMesh;
                if (mesh == null) continue;
                for (var k = 0; k < mesh.blendShapeCount; k++)
                {
                    var name = mesh.GetBlendShapeName(k);
                    if (!name.StartsWith(Expressions.Prefix)) continue;
                    var unit = name.Substring(Expressions.Prefix.Length);
                    var w = weights.TryGetValue(unit, out var v) ? v : 0f;
                    r.SetBlendShapeWeight(k, w * 100f);
                    if (w > 0f) set++;
                }
            }
            return set;
        }
    }
}
