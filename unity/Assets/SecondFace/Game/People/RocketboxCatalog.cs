using System;
using System.Collections.Generic;
using SecondFace.Core.Npc;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>The game's Rocketbox people as prefabs (L3; built by Second Face/Build Rocketbox people from
    /// Assets/SecondFace/People/Rocketbox): each person's id (Core <see cref="RbPerson"/>) and their prefab, materials bound
    /// (the Person shader on the body with its dye mask, the head and hair as photographed).</summary>
    [CreateAssetMenu(menuName = "Second Face/Rocketbox catalog")]
    public sealed class RocketboxCatalog : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string Id;
            public GameObject Prefab;
        }

        public Entry[] People = new Entry[0];

        private Dictionary<string, GameObject> _by;

        public GameObject Get(string id)
        {
            if (_by == null)
            {
                _by = new Dictionary<string, GameObject>();
                foreach (var e in People) if (e != null && e.Prefab != null && !string.IsNullOrEmpty(e.Id)) _by[e.Id] = e.Prefab;
            }
            return id != null && _by.TryGetValue(id, out var p) ? p : null;
        }

        /// <summary>The ids that have a prefab (Core's people narrowed to them, so nobody is given a person not built).</summary>
        public HashSet<string> Ids()
        {
            var s = new HashSet<string>();
            foreach (var e in People) if (e != null && e.Prefab != null) s.Add(e.Id);
            return s;
        }
    }

    /// <summary>A Rocketbox person dressed in their dyes (the Person shader's _Dye0-2 and the cloth's grime and wear, by a
    /// property block on every renderer whose material dyes).</summary>
    public static class RbDress
    {
        private static readonly int Dye0 = Shader.PropertyToID("_Dye0"), Dye1 = Shader.PropertyToID("_Dye1"), Dye2 = Shader.PropertyToID("_Dye2");
        private static readonly int GrimeId = Shader.PropertyToID("_Grime"), WearId = Shader.PropertyToID("_Wear"), DyeOn = Shader.PropertyToID("_DyeOn");

        public static Color Colour(int hex) => new Color(((hex >> 16) & 255) / 255f, ((hex >> 8) & 255) / 255f, (hex & 255) / 255f, 1f);

        public static void Apply(GameObject go, RbDyes d)
        {
            var mpb = new MaterialPropertyBlock();
            foreach (var r in go.GetComponentsInChildren<Renderer>(true))
            {
                var mats = r.sharedMaterials;
                for (var i = 0; i < mats.Length; i++)
                {
                    var m = mats[i];
                    if (m == null || !m.HasProperty(DyeOn) || m.GetFloat(DyeOn) < 0.5f) continue;
                    r.GetPropertyBlock(mpb, i);
                    mpb.SetColor(Dye0, Colour(d.Top));
                    mpb.SetColor(Dye1, Colour(d.Legs));
                    mpb.SetColor(Dye2, Colour(d.Accent));
                    mpb.SetFloat(GrimeId, (float)d.Grime);
                    // (the bake's own wear map does the knees and elbows: the cloth's overall sun only a share of the role's)
                    mpb.SetFloat(WearId, (float)d.Wear * 0.4f);
                    r.SetPropertyBlock(mpb, i);
                }
            }
            // and what they wear over it (the wardrobe rule: layered, rigged, never a clean tee alone)
            var layers = go.GetComponentInChildren<RbLayerSet>(true);
            if (layers != null && d.Layers != null) layers.Wear(d.Layers, d);
        }
    }
}
