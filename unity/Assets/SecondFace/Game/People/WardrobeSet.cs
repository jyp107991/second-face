using System;
using System.Collections.Generic;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// A person base's wardrobe (BUILD_PLAN §6.D): the garments built for it on its own rig (tools/unity/people/mh_build.py,
    /// `wardrobe` in the brief; <c>&lt;base&gt;.wardrobe.json</c>), each with its slot, whether it hides the hair, the
    /// MakeHuman base vertices of the body it covers, and its bound prefab (built by Second Face/Build player wardrobes).
    /// </summary>
    [CreateAssetMenu(menuName = "Second Face/Wardrobe set")]
    public sealed class WardrobeSet : ScriptableObject
    {
        [Serializable]
        public sealed class Garment
        {
            public string Id;
            public string Slot;
            public bool HidesHair;
            public int[] Hides;
            public GameObject Prefab;
            /// <summary>How far the garment stands off the bare body, per height bin of the base's
            /// <see cref="TorsoProfile"/> (m, half-width and half-depth; its sleeves and anything below the knee left out):
            /// the arms keep clear of the cloth too (P4.13; measured by WardrobeBuild).</summary>
            public float[] Rx, Rz;
        }

        public string Base;
        /// <summary>What the base wears to start with.</summary>
        public string[] Outfit = Array.Empty<string>();
        public List<Garment> Garments = new();

        public Garment Find(string id) => Garments.Find(g => g.Id == id);
    }
}
