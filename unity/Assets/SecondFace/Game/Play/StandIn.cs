using SecondFace.Core.World;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>The dressing's stand-ins, one kind each (Core <see cref="Dressing.Kinds"/>): plain shapes in the colours of
    /// what they stand for, no colliders, until their art is made.</summary>
    public sealed class StandIn : MonoBehaviour
    {
        public string Kind;
        private Light _light;
        private float _seed;

        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        private static readonly int ColorId = Shader.PropertyToID("_Color");

        /// <summary>A stand-in of a kind (the <paramref name="index"/>-th of its row: small differences between them);
        /// null for a kind it does not know.</summary>
        public static GameObject Make(string kind, int index)
        {
            var root = new GameObject("stand-in " + kind);
            var s = root.AddComponent<StandIn>();
            s.Kind = kind;
            s._seed = index * 1.37f;
            var jitter = Mathf.Sin(index * 12.9898f) * 0.5f + 0.5f;   // 0..1, the same for the same index
            switch (kind)
            {
                case "wagon":
                    Part(root, PrimitiveType.Cube, new Vector3(0f, 1.0f, 0f), new Vector3(2.0f, 0.5f, 4.0f), new Color(0.42f, 0.30f, 0.20f));
                    Part(root, PrimitiveType.Cube, new Vector3(0f, 1.45f, 0f), new Vector3(2.0f, 0.4f, 4.0f), new Color(0.36f, 0.26f, 0.18f), hollow: true);
                    foreach (var (x, z) in new[] { (-1.05f, 1.3f), (1.05f, 1.3f), (-1.05f, -1.3f), (1.05f, -1.3f) })
                        Part(root, PrimitiveType.Cylinder, new Vector3(x, 0.55f, z), new Vector3(1.1f, 0.08f, 1.1f), new Color(0.22f, 0.18f, 0.14f), Quaternion.Euler(0f, 0f, 90f));
                    Part(root, PrimitiveType.Cube, new Vector3(0f, 0.8f, 2.9f), new Vector3(0.12f, 0.12f, 1.8f), new Color(0.40f, 0.30f, 0.20f));
                    break;
                case "crate":
                    var h = 0.6f + 0.25f * jitter;
                    Part(root, PrimitiveType.Cube, new Vector3(0f, h * 0.5f, 0f), new Vector3(0.9f, h, 0.9f), Color.Lerp(new Color(0.62f, 0.50f, 0.34f), new Color(0.50f, 0.42f, 0.30f), jitter));
                    break;
                case "chalk":
                    Part(root, PrimitiveType.Cube, new Vector3(0f, 1.3f + 0.15f * jitter, 0f), new Vector3(0.3f, 0.2f, 0.01f), new Color(0.92f, 0.92f, 0.88f));
                    break;
                case "lamp":
                    Part(root, PrimitiveType.Cylinder, new Vector3(0f, 0.12f, 0f), new Vector3(0.18f, 0.12f, 0.18f), new Color(0.45f, 0.36f, 0.22f));
                    Part(root, PrimitiveType.Sphere, new Vector3(0f, 0.32f, 0f), new Vector3(0.14f, 0.18f, 0.14f), new Color(1f, 0.86f, 0.55f));
                    s._light = Glow(root, new Vector3(0f, 0.4f, 0f), new Color(1f, 0.74f, 0.42f), 3.5f, 1.2f);
                    break;
                case "register":
                    Part(root, PrimitiveType.Cube, new Vector3(0f, 1.05f, 0f), new Vector3(0.55f, 0.14f, 0.4f), new Color(0.28f, 0.16f, 0.10f));
                    Part(root, PrimitiveType.Cube, new Vector3(0f, 1.05f, 0.005f), new Vector3(0.52f, 0.11f, 0.39f), new Color(0.86f, 0.82f, 0.70f));
                    break;
                case "fire_glow":
                    s._light = Glow(root, new Vector3(0f, 14f, 0f), new Color(1f, 0.48f, 0.18f), 45f, 6f);
                    break;
                default:
                    Destroy(root);
                    return null;
            }
            return root;
        }

        private void Update()
        {
            // a flame's light breathes (the lamps a little, the fires on the skyline more)
            if (_light == null) return;
            var k = Kind == "fire_glow" ? 0.35f : 0.12f;
            var n = Mathf.PerlinNoise(_seed, Time.time * (Kind == "fire_glow" ? 0.9f : 2.3f));
            _light.intensity = (Kind == "fire_glow" ? 6f : 1.2f) * (1f - k + 2f * k * n);
        }

        private static GameObject Part(GameObject root, PrimitiveType shape, Vector3 at, Vector3 size, Color colour, Quaternion? turn = null, bool hollow = false)
        {
            var go = GameObject.CreatePrimitive(shape);
            go.name = shape.ToString().ToLowerInvariant();
            var c = go.GetComponent<Collider>();
            if (c != null) Destroy(c);
            go.transform.SetParent(root.transform, false);
            go.transform.localPosition = at;
            go.transform.localRotation = turn ?? Quaternion.identity;
            go.transform.localScale = hollow ? new Vector3(size.x, size.y * 0.25f, size.z) : size;
            var r = go.GetComponent<Renderer>();
            if (r != null)
            {
                var block = new MaterialPropertyBlock();
                block.SetColor(BaseColorId, colour);
                block.SetColor(ColorId, colour);
                r.SetPropertyBlock(block);
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            }
            return go;
        }

        private static Light Glow(GameObject root, Vector3 at, Color colour, float range, float intensity)
        {
            var go = new GameObject("glow");
            go.transform.SetParent(root.transform, false);
            go.transform.localPosition = at;
            var l = go.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = colour;
            l.range = range;
            l.intensity = intensity;
            l.shadows = LightShadows.None;
            return l;
        }
    }
}
