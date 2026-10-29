using System;
using System.Collections.Generic;
using SecondFace.Core.Npc;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// The player's sculpted face (BUILD_PLAN §6.B.5, P4 step 2): slider values by Core <see cref="Sculpt"/> id, applied as
    /// blend-shape weights to every skinned mesh under the person that carries the sculptor's shapes: the body at LOD0
    /// and LOD1, and the hair, brows, lashes, eyes and collars refitted to it by the build, so the face changes as one.
    /// <see cref="Aged"/> blends to the same face older (the photograph). The sculptor screen (P5) writes the values and
    /// calls <see cref="Apply"/>; a save keeps <see cref="Values"/>.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class FaceSculpt : MonoBehaviour
    {
        [Serializable]
        public struct Entry
        {
            public string Id;
            public float Value;
            public Entry(string id, float value) { Id = id; Value = value; }
        }

        [SerializeField] private List<Entry> values = new();
        [Range(0f, 1f)] public float Aged;
        /// <summary>The hair greyed (mh_build's &lt;id&gt;__&lt;hair&gt;_aged_d), worn while the face is mostly aged.</summary>
        public Texture AgedHair;
        /// <summary>The hair's colour chosen at creation (alpha 0: the texture's own); greys towards ash with
        /// <see cref="Aged"/> (on the player's recolouring hair shader, P5.3i).</summary>
        public Color HairColour;
        public static readonly Color AshGrey = new(0.62f, 0.6f, 0.57f, 1f);

        private readonly Dictionary<SkinnedMeshRenderer, Dictionary<string, int>> _index = new();

        /// <summary>The slider values, by slider id.</summary>
        public Dictionary<string, float> Values
        {
            get
            {
                var d = new Dictionary<string, float>();
                foreach (var e in values) if (!string.IsNullOrEmpty(e.Id)) d[e.Id] = e.Value;
                return d;
            }
        }

        /// <summary>Replaces the slider values (and applies them).</summary>
        public void Set(IReadOnlyDictionary<string, float> face)
        {
            values.Clear();
            if (face != null) foreach (var kv in face) values.Add(new Entry(kv.Key, kv.Value));
            Apply();
        }

        /// <summary>Sets one slider (and applies the face).</summary>
        public void Set(string id, float value)
        {
            var i = values.FindIndex(e => e.Id == id);
            if (i >= 0) values[i] = new Entry(id, value); else values.Add(new Entry(id, value));
            Apply();
        }

        /// <summary>The renderers the face drives (those whose mesh has any of the sculptor's shapes).</summary>
        public IReadOnlyCollection<SkinnedMeshRenderer> Renderers { get { Index(); return _index.Keys; } }

        private void OnEnable() => Apply();

        private void Index()
        {
            if (_index.Count > 0) return;
            var wanted = new HashSet<string>(Sculpt.Shapes());
            foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var mesh = r.sharedMesh;
                if (mesh == null) continue;
                Dictionary<string, int> map = null;
                for (var k = 0; k < mesh.blendShapeCount; k++)
                {
                    var name = mesh.GetBlendShapeName(k);
                    if (!wanted.Contains(name)) continue;
                    (map ??= new Dictionary<string, int>())[name] = k;
                }
                if (map != null) _index[r] = map;
            }
        }

        /// <summary>Looks again for the renderers that carry the shapes (after garments are put on or taken off) and applies.</summary>
        public void Refresh()
        {
            _index.Clear();
            Apply();
        }

        /// <summary>Writes the weights to every driven renderer.</summary>
        public void Apply()
        {
            Index();
            var weights = Sculpt.Weights(Values, Aged);
            foreach (var kv in _index)
            {
                if (kv.Key == null) continue;
                foreach (var (shape, weight) in weights)
                    if (kv.Value.TryGetValue(shape, out var k)) kv.Key.SetBlendShapeWeight(k, weight);
            }
            // the skin older with the face (the Skin shader blends to its aged bake, P4.9); merged into each renderer's
            // block, which also carries the wardrobe's hidden mask
            _block ??= new MaterialPropertyBlock();
            foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var m = r.sharedMaterial;
                if (m == null) continue;
                if (m.HasProperty(AgedId) && m.GetTexture(AgedMapId) != null)
                {
                    r.GetPropertyBlock(_block);
                    _block.SetFloat(AgedId, Aged);
                    r.SetPropertyBlock(_block);
                }
                else if (r.name.Contains("Hair_") && HairColour.a > 0.001f && m.HasProperty(RecolourId))   // own or a piece
                {
                    // the chosen colour, greying with age (the photograph is fully aged)
                    r.GetPropertyBlock(_block);
                    var c = Color.Lerp(HairColour, AshGrey, Aged * 0.85f);
                    c.a = 1f;
                    _block.SetColor(RecolourId, c);
                    r.SetPropertyBlock(_block);
                }
                else if (AgedHair != null && r.name.StartsWith("Hair_") && m.HasProperty(BaseMapId))
                {
                    // the hair greys with the face (a texture swap past halfway: the photograph is fully aged)
                    r.GetPropertyBlock(_block);
                    _block.SetTexture(BaseMapId, Aged >= 0.5f ? AgedHair : m.GetTexture(BaseMapId));
                    r.SetPropertyBlock(_block);
                }
            }
        }

        private static readonly int AgedId = Shader.PropertyToID("_Aged");
        private static readonly int AgedMapId = Shader.PropertyToID("_AgedMap");
        private static readonly int BaseMapId = Shader.PropertyToID("_BaseMap");
        private static readonly int RecolourId = Shader.PropertyToID("_Recolour");
        private MaterialPropertyBlock _block;
    }
}
