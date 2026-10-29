using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.State;
using SecondFace.Core.World;
using SecondFace.Game.UI;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// Things on the ground in the world (P6.1; Core <see cref="Ground"/>): a burlap bundle where each pile lies, settled
    /// on whatever is under it, turned its own way, a tap's take (the walkabout walks over, stoops and opens it on the
    /// loot screen). <see cref="Sync"/> makes the bundles match the game's piles (a pile emptied goes, one dropped
    /// comes). One mesh, made once, for every bundle: a lumpy sack tied at the neck.
    /// </summary>
    public sealed class GroundPiles : MonoBehaviour
    {
        public const float Radius = 0.45f, Height = 0.55f;

        /// <summary>The bundles' cloth (the material library's burlap; a plain lit grey without it).</summary>
        public Material Material;
        /// <summary>A bundle was tapped and a verb chosen (take).</summary>
        public event Action<Interactable, string> Chosen;

        private readonly Dictionary<string, GameObject> _shown = new();
        private static Mesh _mesh;
        private Material _cloth;

        /// <summary>How many bundles lie in the world now.</summary>
        public int Count => _shown.Count;

        /// <summary>The bundle of a pile (null when it is not shown).</summary>
        public GameObject Of(string key) => _shown.TryGetValue(key, out var go) ? go : null;

        /// <summary>Makes the bundles match the game's piles (the empty ones tidied away first).</summary>
        public void Sync(GameState g)
        {
            Ground.Tidy(g);
            var piles = Ground.Piles(g);
            var keys = new HashSet<string>(piles.Select(p => p.Key));
            foreach (var k in _shown.Keys.Where(k => !keys.Contains(k)).ToList())
            {
                if (_shown[k] != null) Destroy(_shown[k]);
                _shown.Remove(k);
            }
            foreach (var p in piles)
                if (!_shown.ContainsKey(p.Key)) _shown[p.Key] = Make(p);
        }

        /// <summary>Takes every bundle away (a game left, another loaded).</summary>
        public void Clear()
        {
            foreach (var go in _shown.Values) if (go != null) Destroy(go);
            _shown.Clear();
        }

        private GameObject Make(Pile p)
        {
            var go = new GameObject("pile_" + p.Key);
            go.transform.SetParent(transform, false);
            var at = new Vector3(p.X, p.Y, p.Z);
            // on whatever is under it (the terrain, a floor), not the trigger of a thing near by
            if (Physics.Raycast(at + Vector3.up * 1.2f, Vector3.down, out var hit, 3f, ~0, QueryTriggerInteraction.Ignore)) at = hit.point;
            var h = Hash(p.Key);
            go.transform.SetPositionAndRotation(at, Quaternion.Euler(0f, h * 360f, 0f));
            go.transform.localScale = Vector3.one * Mathf.Lerp(0.85f, 1.1f, Hash(p.Key + "s"));
            go.AddComponent<MeshFilter>().sharedMesh = Sack();
            var r = go.AddComponent<MeshRenderer>();
            r.sharedMaterial = Cloth();
            var it = Interactable.Add(go, p.Key, Strings.Get("ground.title"), Radius, Height, "take");
            it.Chosen += (thing, verb) => Chosen?.Invoke(thing, verb);
            return go;
        }

        /// <summary>The burlap darkened, oiled and dirty from the road: undyed sacking is the desert's own colour and
        /// would vanish on it.</summary>
        private Material Cloth()
        {
            if (_cloth != null || Material == null) return _cloth != null ? _cloth : Material;
            _cloth = new Material(Material) { name = "ground_sack" };
            foreach (var prop in new[] { "_BaseColor", "_Color" })
                if (_cloth.HasProperty(prop))
                {
                    var c = _cloth.GetColor(prop);
                    _cloth.SetColor(prop, new Color(c.r * 0.52f, c.g * 0.46f, c.b * 0.40f, c.a));
                }
            return _cloth;
        }

        /// <summary>The sack: a sphere squashed onto a flat bottom, bulging unevenly, gathered and tied at the top.</summary>
        public static Mesh Sack()
        {
            if (_mesh != null) return _mesh;
            const int rings = 14, segs = 20;
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            for (var i = 0; i <= rings; i++)
            {
                var v = (float)i / rings;                       // 0 at the bottom, 1 at the neck
                var phi = Mathf.Lerp(-Mathf.PI / 2f, Mathf.PI / 2f, v);
                var ring = Mathf.Cos(phi);
                var y = (Mathf.Sin(phi) + 1f) * 0.5f;
                // the cloth gathers into a neck at the top and sags out at the bottom
                var neck = Mathf.SmoothStep(1f, 0.16f, Mathf.InverseLerp(0.62f, 0.93f, v));
                for (var j = 0; j <= segs; j++)
                {
                    var u = (float)j / segs;
                    var theta = u * Mathf.PI * 2f;
                    var bulge = 1f + 0.10f * Mathf.Sin(theta * 3f + v * 4f) + 0.06f * Mathf.Sin(theta * 5f - v * 7f);
                    var rad = 0.24f * Mathf.Max(ring, v > 0.5f ? 0f : 0.55f) * bulge * neck;
                    if (v > 0.5f) rad = Mathf.Max(rad, 0.035f);
                    var height = Mathf.Lerp(0f, 0.36f, Mathf.Pow(y, 0.9f));
                    if (i == 0) rad = 0f;
                    verts.Add(new Vector3(Mathf.Cos(theta) * rad, height, Mathf.Sin(theta) * rad));
                    uvs.Add(new Vector2(u * 2f, v * 1.5f));
                }
            }
            // the tie above the neck: a short tuft
            var top = verts.Count;
            for (var j = 0; j <= segs; j++)
            {
                var u = (float)j / segs;
                var theta = u * Mathf.PI * 2f;
                verts.Add(new Vector3(Mathf.Cos(theta) * 0.06f, 0.43f + 0.015f * Mathf.Sin(theta * 4f), Mathf.Sin(theta) * 0.06f));
                uvs.Add(new Vector2(u * 2f, 1.6f));
            }
            for (var i = 0; i < rings; i++)
                for (var j = 0; j < segs; j++)
                {
                    var a = i * (segs + 1) + j;
                    var b = a + segs + 1;
                    tris.AddRange(new[] { a, b, a + 1, a + 1, b, b + 1 });
                }
            var cap = verts.Count;
            verts.Add(new Vector3(0f, 0.44f, 0f));
            uvs.Add(new Vector2(0f, 1.7f));
            var last = rings * (segs + 1);
            for (var j = 0; j < segs; j++)
            {
                tris.AddRange(new[] { last + j, top + j, last + j + 1, last + j + 1, top + j, top + j + 1 });
                tris.AddRange(new[] { top + j, cap, top + j + 1 });
            }
            _mesh = new Mesh { name = "ground_sack" };
            _mesh.SetVertices(verts);
            _mesh.SetUVs(0, uvs);
            _mesh.SetTriangles(tris, 0);
            _mesh.RecalculateNormals();
            _mesh.RecalculateTangents();
            _mesh.RecalculateBounds();
            return _mesh;
        }

        private static float Hash(string s)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var c in s) h = (h ^ c) * 16777619u;
                return (h & 0xFFFF) / 65536f;
            }
        }

        private void OnDestroy()
        {
            Clear();
            if (_cloth != null) Destroy(_cloth);
        }
    }
}
