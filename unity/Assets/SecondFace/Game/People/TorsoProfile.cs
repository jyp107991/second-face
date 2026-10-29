using System;
using System.Collections.Generic;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// A body's torso as cross-sections (the owner's note: arms never sink into a body): measured in the editor from the
    /// body and what it wears (not the arms, the lower legs, the hair; Editor <c>TorsoMeasure</c>), in the hips' frame
    /// at rest (x to the body's right, y up, z forward), one ellipse every <see cref="Step"/> m of height from
    /// <see cref="Bottom"/>; with how the body's own shapes (the player's build and muscle) widen or narrow it at full
    /// weight; and what the person wears over it (<see cref="Wearing"/>). <see cref="ArmClearance"/> keeps the arms out of
    /// it. Measured at build time: on the phone the people's meshes are not readable.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class TorsoProfile : MonoBehaviour
    {
        public const int Version = 1;

        [Serializable]
        public struct Shape
        {
            public string Name;
            public float[] Rx, Rz;
        }

        /// <summary>The <see cref="Version"/> this was measured at (0: never).</summary>
        public int Measured;
        public float Bottom = -0.45f, Step = 0.025f;
        public float[] Cx, Cz, Rx, Rz;
        /// <summary>The hips' rotation relative to the body at rest: the frame turns with the hips as they move.</summary>
        public Quaternion HipsRest = Quaternion.identity;
        public List<Shape> Shapes = new();
        /// <summary>The renderer whose blend-shape weights set how much of each shape is on.</summary>
        public SkinnedMeshRenderer Body;

        private int[] _shapeIndex;
        private float[] _wornRx, _wornRz;

        public int Bins => Rx?.Length ?? 0;

        /// <summary>What is worn over the body (P4.13: a person dressed at runtime from the wardrobe): each garment's
        /// measured stand-off beyond the bare body per bin (<see cref="WardrobeSet.Garment"/> Rx, Rz), the widest of them
        /// added to every section. Null or empty: the bare body.</summary>
        public void Wearing(IEnumerable<(float[] Rx, float[] Rz)> garments)
        {
            _wornRx = _wornRz = null;
            if (garments == null || Bins == 0) return;
            foreach (var (gx, gz) in garments)
            {
                if (gx == null || gz == null || gx.Length != Bins || gz.Length != Bins) continue;
                _wornRx ??= new float[Bins];
                _wornRz ??= new float[Bins];
                for (var k = 0; k < Bins; k++)
                {
                    _wornRx[k] = Mathf.Max(_wornRx[k], gx[k]);
                    _wornRz[k] = Mathf.Max(_wornRz[k], gz[k]);
                }
            }
        }

        /// <summary>The cross-section at a height in the frame (false above or below the measured torso).</summary>
        public bool Sample(float y, out float cx, out float cz, out float rx, out float rz)
        {
            cx = cz = rx = rz = 0f;
            if (Bins < 2) return false;
            var f = (y - Bottom) / Step;
            if (f < 0f || f > Bins - 1) return false;
            var i = Mathf.Min((int)f, Bins - 2);
            var t = f - i;
            cx = Mathf.Lerp(Cx[i], Cx[i + 1], t);
            cz = Mathf.Lerp(Cz[i], Cz[i + 1], t);
            rx = Mathf.Lerp(Rx[i], Rx[i + 1], t);
            rz = Mathf.Lerp(Rz[i], Rz[i + 1], t);
            if (_wornRx != null)
            {
                rx += Mathf.Lerp(_wornRx[i], _wornRx[i + 1], t);
                rz += Mathf.Lerp(_wornRz[i], _wornRz[i + 1], t);
            }
            if (Body != null && Body.sharedMesh != null && Shapes.Count > 0)
            {
                if (_shapeIndex == null || _shapeIndex.Length != Shapes.Count)
                {
                    _shapeIndex = new int[Shapes.Count];
                    for (var s = 0; s < Shapes.Count; s++) _shapeIndex[s] = Body.sharedMesh.GetBlendShapeIndex(Shapes[s].Name);
                }
                for (var s = 0; s < Shapes.Count; s++)
                {
                    if (_shapeIndex[s] < 0) continue;
                    var w = Body.GetBlendShapeWeight(_shapeIndex[s]) / 100f;
                    if (Mathf.Abs(w) < 1e-3f) continue;
                    rx += w * Mathf.Lerp(Shapes[s].Rx[i], Shapes[s].Rx[i + 1], t);
                    rz += w * Mathf.Lerp(Shapes[s].Rz[i], Shapes[s].Rz[i + 1], t);
                }
            }
            return rx > 0.02f && rz > 0.02f;
        }
    }
}
