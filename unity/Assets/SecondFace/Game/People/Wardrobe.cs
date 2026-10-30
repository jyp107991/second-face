using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// What a person wears, changed at runtime (BUILD_PLAN §6.D, P4 step 3): the player's garments are separate skinned
    /// meshes built on the same rig; equipping one takes its renderers onto this person's skeleton (bones matched by name),
    /// into this person's levels of detail, and hides the skin it covers through the skin shader's mask (SecondFace/Skin:
    /// a 128 x 128 texture over the MakeHuman base vertices). One garment per slot; a garment that hides the hair (a hat)
    /// switches the hair off while it is worn. A dye is a tint on the garment's material (a property block). The face
    /// sculpt is refreshed so collars and hats follow the face. On the player's cloth shader (SecondFace/Cloth, P4.10) each
    /// slot's garments stand off the layers under them (<see cref="StandOff"/>: a coat over the shirt, boots over the
    /// trousers, all fitted to the bare body) and take the content's grime and wear (<see cref="Weather"/>).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class Wardrobe : MonoBehaviour
    {
        public WardrobeSet Set;
        public bool WearOutfitOnStart = true;

        private sealed class Worn
        {
            public WardrobeSet.Garment Garment;
            public readonly List<SkinnedMeshRenderer> Renderers = new();
        }

        private static readonly int HiddenMaskId = Shader.PropertyToID("_HiddenMask");
        private static readonly int CoverMaskId = Shader.PropertyToID("_CoverMask");
        /// <summary>The slots whose garments lie over a slot's (P4.14): what they cover of the body, this slot's garment is
        /// hidden under (the cloth shader's cover mask): a waistband under a sweater, a boot's shaft under a trouser
        /// leg, a glove's cuff under a sleeve.</summary>
        private static readonly Dictionary<string, string[]> Over = new()
        {
            ["legs"] = new[] { "top", FullSlot, "over" }, ["top"] = new[] { "over", FullSlot },
            ["feet"] = new[] { "legs", FullSlot }, ["hands"] = new[] { "top", "over", FullSlot },
        };
        private readonly Dictionary<string, Texture2D> _covers = new();
        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        private static readonly int DyedId = Shader.PropertyToID("_Dyed");
        private static readonly int InflateId = Shader.PropertyToID("_Inflate");
        private static readonly int GrimeId = Shader.PropertyToID("_Grime");
        private static readonly int WearId = Shader.PropertyToID("_Wear");

        /// <summary>How far a slot's garments stand off the layers under them (m).</summary>
        public static float StandOff(string slot) => slot switch { "over" => 0.012f, "gear" => 0.015f, "feet" => 0.004f, _ => 0f };
        public const int MaskSize = 128;

        private readonly Dictionary<string, Worn> _worn = new();
        private Dictionary<string, Transform> _bones;
        private Texture2D _mask;

        /// <summary>The garments worn, by slot.</summary>
        public IReadOnlyDictionary<string, string> Wearing => _worn.ToDictionary(kv => kv.Key, kv => kv.Value.Garment.Id);
        /// <summary>The worn garments' renderers (every level).</summary>
        public IEnumerable<SkinnedMeshRenderer> GarmentRenderers => _worn.Values.SelectMany(w => w.Renderers);
        /// <summary>The skin mask (1 where a worn garment covers the base vertex).</summary>
        public Texture2D Mask => _mask;

        private void Start()
        {
            if (WearOutfitOnStart && _worn.Count == 0 && Set != null) Wear(Set.Outfit);
        }

        /// <summary>The body's own hair is shaved off (no hair piece worn: the scalp's painted stubble, P5.3i).</summary>
        public bool Shaved { get; private set; }

        /// <summary>Wears these garments (by id) and nothing else (the hair stays: it is not clothing).</summary>
        public void Wear(IEnumerable<string> ids)
        {
            foreach (var slot in _worn.Keys.ToList()) if (slot != HairSlot) Remove(slot);
            foreach (var id in ids) Put(id);
            Changed();
        }

        /// <summary>Puts a garment on, taking off whatever was in its slot. False when the set has no such garment.</summary>
        public bool Equip(string id)
        {
            if (!Put(id)) return false;
            Changed();
            return true;
        }

        /// <summary>Takes off what is worn in a slot.</summary>
        public bool Unequip(string slot)
        {
            if (!Remove(slot)) return false;
            Changed();
            return true;
        }

        public const string HairSlot = "hair";
        public const string FullSlot = "full";

        /// <summary>The hair (P5.3i): null the body's own, "buzz" none (shaved), else a hair piece of the set by id.</summary>
        public void Hair(string id)
        {
            var now = Shaved ? "buzz" : _worn.TryGetValue(HairSlot, out var w) ? w.Garment.Id : null;
            if (now == id) return;
            Shaved = id == "buzz";
            if (id == null || Shaved || !Put(id)) Remove(HairSlot);
            Changed();
        }

        /// <summary>Tints a worn garment (white: its own baked colour).</summary>
        public void Dye(string slot, Color tint)
        {
            if (!_worn.TryGetValue(slot, out var w)) return;
            var block = new MaterialPropertyBlock();
            var dyed = tint != Color.white;   // a dye colours the cloth; white leaves its own baked colour
            foreach (var r in w.Renderers)
            {
                r.GetPropertyBlock(block);
                block.SetColor(BaseColorId, tint);
                block.SetFloat(DyedId, dyed ? 1f : 0f);
                r.SetPropertyBlock(block);
            }
        }

        /// <summary>Dirt (heaviest at the hem) and sun-fading on a worn garment, 0..1 each.</summary>
        public void Weather(string slot, float grime, float wear)
        {
            if (!_worn.TryGetValue(slot, out var w)) return;
            var block = new MaterialPropertyBlock();
            foreach (var r in w.Renderers)
            {
                r.GetPropertyBlock(block);
                block.SetFloat(GrimeId, Mathf.Clamp01(grime));
                block.SetFloat(WearId, Mathf.Clamp01(wear));
                r.SetPropertyBlock(block);
            }
        }

        private bool Put(string id)
        {
            var g = Set != null ? Set.Find(id) : null;
            if (g == null || g.Prefab == null) { Debug.LogWarning($"Wardrobe: no garment {id} in {(Set != null ? Set.Base : "no set")}"); return false; }
            Remove(g.Slot);
            // a garment for the whole body (coveralls, a robe, a suit) is the top and the legs at once
            if (g.Slot == FullSlot) { Remove("top"); Remove("legs"); }
            else if (g.Slot == "top" || g.Slot == "legs") Remove(FullSlot);
            Bones();
            var instance = Instantiate(g.Prefab);
            // the garment model's own levels of detail go now: destroyed at the frame's end (Gone), its LOD group took the
            // renderers back out of the person's group with it, and every level drew at once (P4.15b)
            foreach (var own in instance.GetComponentsInChildren<LODGroup>(true)) DestroyImmediate(own);
            var worn = new Worn { Garment = g };
            foreach (var r in instance.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                // the renderer's place under the model root, then onto this person's skeleton by bone name
                var (pos, rot, scale) = (r.transform.localPosition, r.transform.localRotation, r.transform.localScale);
                r.bones = r.bones.Select(b => b != null && _bones.TryGetValue(b.name, out var t) ? t : null).ToArray();
                if (r.rootBone != null && _bones.TryGetValue(r.rootBone.name, out var root)) r.rootBone = root;
                r.transform.SetParent(transform, false);
                r.transform.localPosition = pos;
                r.transform.localRotation = rot;
                r.transform.localScale = scale;
                r.name = $"{g.Slot}:{r.name}";
                var block = new MaterialPropertyBlock();
                r.GetPropertyBlock(block);
                block.SetFloat(InflateId, StandOff(g.Slot));
                r.SetPropertyBlock(block);
                worn.Renderers.Add(r);
            }
            Gone(instance);
            _worn[g.Slot] = worn;
            return true;
        }

        private bool Remove(string slot)
        {
            if (!_worn.TryGetValue(slot, out var w)) return false;
            foreach (var r in w.Renderers) if (r != null) Gone(r.gameObject);
            _worn.Remove(slot);
            return true;
        }

        private void Bones()
        {
            if (_bones != null) return;
            _bones = new Dictionary<string, Transform>();
            var animator = GetComponent<Animator>();
            // the skeleton is the transforms the body's renderer is bound to, with every parent up to the root
            var body = GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.name.StartsWith("Body_"));
            var bones = body != null ? body.bones : new Transform[0];
            foreach (var b in bones)
                for (var t = b; t != null && t != transform; t = t.parent) _bones.TryAdd(t.name, t);
            if (animator != null && animator.avatarRoot != null) _bones.TryAdd(animator.avatarRoot.name, animator.avatarRoot);
        }

        /// <summary>After any change: the levels of detail, the skin mask, the hair, the face.</summary>
        private void Changed()
        {
            Levels();
            Hide();
            Cover();
            var hatted = _worn.Values.Any(w => w.Garment.HidesHair);
            var ownGone = Shaved || _worn.ContainsKey(HairSlot);
            foreach (var r in GetComponentsInChildren<Renderer>(true))
            {
                if (r.name.StartsWith("Hair_")) r.enabled = !hatted && !ownGone;   // the body's own
                else if (r.name.StartsWith(HairSlot + ":")) r.enabled = !hatted;   // a hair piece
            }
            var sculpt = GetComponent<FaceSculpt>();
            if (sculpt != null) sculpt.Refresh();
            // the torso the arms keep clear of grows by what is worn
            var torso = GetComponent<TorsoProfile>();
            if (torso != null) torso.Wearing(_worn.Values.Select(w => (w.Garment.Rx, w.Garment.Rz)));
        }

        /// <summary>Each worn renderer joins the level its name ends in (_LOD0.._LOD2); the body's own renderers stay.</summary>
        private void Levels()
        {
            var group = GetComponent<LODGroup>();
            if (group == null) return;
            var lods = group.GetLODs();
            var garments = new HashSet<Renderer>(GarmentRenderers);
            for (var l = 0; l < lods.Length; l++)
            {
                var keep = lods[l].renderers.Where(r => r != null && !r.name.Contains(":")).ToList();   // the base's own
                keep.AddRange(garments.Where(r => r.name.EndsWith($"_LOD{l}")));
                lods[l].renderers = keep.ToArray();
            }
            group.SetLODs(lods);
        }

        /// <summary>Writes the mask of base vertices the worn garments cover and gives it to the body's renderers.</summary>
        private void Hide()
        {
            if (_mask == null)
            {
                _mask = new Texture2D(MaskSize, MaskSize, TextureFormat.R8, false, true)
                    { name = "wardrobe mask", filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
            }
            var px = new byte[MaskSize * MaskSize];
            foreach (var w in _worn.Values)
                if (w.Garment.Hides != null)
                    foreach (var i in w.Garment.Hides)
                        if (i >= 0 && i < px.Length) px[i] = 255;
            _mask.SetPixelData(px, 0);
            _mask.Apply(false, false);
            var block = new MaterialPropertyBlock();
            foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                if (!r.name.StartsWith("Body_")) continue;
                r.GetPropertyBlock(block);
                block.SetTexture(HiddenMaskId, _mask);
                r.SetPropertyBlock(block);
            }
        }

        /// <summary>Writes, for each worn garment, the mask of base vertices the garments over it cover (<see cref="Over"/>),
        /// and gives it to the garment's renderers; none over it, the black texture.</summary>
        private void Cover()
        {
            var block = new MaterialPropertyBlock();
            foreach (var kv in _worn)
            {
                Texture2D tex = null;
                if (Over.TryGetValue(kv.Key, out var outer))
                {
                    byte[] px = null;
                    foreach (var o in outer)
                    {
                        if (!_worn.TryGetValue(o, out var ow) || ow.Garment.Hides == null) continue;
                        px ??= new byte[MaskSize * MaskSize];
                        foreach (var i in ow.Garment.Hides) if (i >= 0 && i < px.Length) px[i] = 255;
                    }
                    if (px != null)
                    {
                        if (!_covers.TryGetValue(kv.Key, out tex) || tex == null)
                        {
                            tex = new Texture2D(MaskSize, MaskSize, TextureFormat.R8, false, true)
                                { name = "cover mask " + kv.Key, filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
                            _covers[kv.Key] = tex;
                        }
                        tex.SetPixelData(px, 0);
                        tex.Apply(false, false);
                    }
                }
                foreach (var r in kv.Value.Renderers)
                {
                    r.GetPropertyBlock(block);
                    block.SetTexture(CoverMaskId, tex != null ? tex : Texture2D.blackTexture);
                    r.SetPropertyBlock(block);
                }
            }
        }

        private void OnDestroy()
        {
            if (_mask != null) Gone(_mask);
            foreach (var t in _covers.Values) if (t != null) Gone(t);
        }

        /// <summary>Destroys now in the editor's edit mode (scene builders), at the frame's end in play.</summary>
        private static void Gone(Object o)
        {
            if (Application.isPlaying) Destroy(o); else DestroyImmediate(o);
        }
    }
}
