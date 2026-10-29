using SecondFace.Core.Npc;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// The live figure (P5.3h, DESIGN_UNITY §5.4 "the live figure as the paper doll"): a copy of the player's body standing
    /// idle in the <see cref="Studio"/>, far under the world, dressed from what is worn (<see cref="Dresser"/>) and drawn
    /// full length under the studio's light into a texture the pack shows, on a dark backdrop with a soft shadow at the
    /// feet. It is drawn when asked (on opening, after a change of clothes, while it is turned, and now and then for the
    /// idle's breath); nothing of it is drawn by the game camera.
    /// </summary>
    public sealed class Figure
    {
        /// <summary>Where the studio stands: far below the world, out of every camera's way.</summary>
        public static readonly Vector3 Spot = new(0f, -3000f, 0f);
        public const float Fov = 24f, Distance = 5.4f;
        public static readonly Color Backdrop = new(0.235f, 0.205f, 0.176f, 1f);

        public GameObject Body { get; private set; }
        public Wardrobe Wardrobe { get; private set; }
        public RenderTexture Texture { get; private set; }
        /// <summary>How far the figure is turned from facing the camera (degrees; a three-quarter view to start).</summary>
        public float Yaw = -22f;
        /// <summary>Framed on the face (the sculptor) instead of full length.</summary>
        public bool Close;
        /// <summary>The body's height against its base (the creation's height slider: 0.94..1.06).</summary>
        public float Scale = 1f;
        public int Draws { get; private set; }
        public FaceSculpt Face => Body != null ? Body.GetComponentInChildren<FaceSculpt>() : null;

        private GameObject _shadow;
        private Animator _anim;
        private Renderer _eyes;

        /// <summary>The figure of a body (a player base prefab), idling on a locomotion controller, drawn at a size.</summary>
        public static Figure Create(GameObject prefab, RuntimeAnimatorController idle, int width = 576, int height = 864)
        {
            if (prefab == null) return null;
            var f = new Figure();
            f.Body = Object.Instantiate(prefab, Spot, Quaternion.identity);
            f.Body.name = "figure_" + prefab.name;
            f.Wardrobe = f.Body.GetComponentInChildren<Wardrobe>();
            var anim = f._anim = f.Body.GetComponentInChildren<Animator>();
            if (anim != null)
            {
                if (idle != null) anim.runtimeAnimatorController = idle;
                anim.applyRootMotion = false;
                anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;   // no camera but the studio's ever sees it
                anim.Update(0f);
            }
            var lod = f.Body.GetComponentInChildren<LODGroup>();
            if (lod != null) lod.ForceLOD(0);
            f._shadow = Shadow();
            f._shadow.transform.position = Spot + Vector3.up * 0.01f;
            f.Texture = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32) { name = "figure", antiAliasing = 4 };
            f.Texture.Create();
            f.Layer();
            return f;
        }

        /// <summary>Dresses the figure for an outfit (the garments' renderers join the studio's layer).</summary>
        public void Dress(Outfit o)
        {
            if (Wardrobe == null) return;
            Dresser.Dress(Wardrobe, o);
            Layer();
        }

        private void Layer()
        {
            if (Body == null) return;
            foreach (var r in Body.GetComponentsInChildren<Renderer>(true)) r.gameObject.layer = Studio.Layer;
            if (_shadow != null) _shadow.layer = Studio.Layer;
        }

        /// <summary>Draws the figure as it stands now, turned by <see cref="Yaw"/>.</summary>
        public void Draw()
        {
            if (Body == null || Texture == null) return;
            Body.transform.SetPositionAndRotation(Spot, Quaternion.Euler(0f, 180f + Yaw, 0f));
            Body.transform.localScale = Vector3.one * Scale;
            var cam = Studio.Camera;
            cam.backgroundColor = Backdrop;
            var head = _anim != null && _anim.isHuman ? _anim.GetBoneTransform(HumanBodyBones.Head) : null;
            if (Close && head != null)
            {
                // aimed between the eyes and the mouth from about 9° above (the captured idle carries the chin a little
                // high; a camera at eye level looked up the nose)
                if (_eyes == null)
                    foreach (var r in Body.GetComponentsInChildren<Renderer>()) if (r.name.StartsWith("Eyes_")) { _eyes = r; break; }
                var eye = _eyes != null ? _eyes.bounds.center : head.position + Vector3.up * 0.09f;
                var at = new Vector3(head.position.x, eye.y - 0.045f, head.position.z);
                var from = at + new Vector3(0f, 0.17f, -1.08f);
                cam.fieldOfView = 19f;
                cam.transform.SetPositionAndRotation(from, Quaternion.LookRotation(at - from));
            }
            else
            {
                cam.fieldOfView = Fov;
                cam.transform.SetPositionAndRotation(Spot + new Vector3(0f, 1.02f * Scale, -Distance * Scale), Quaternion.Euler(1.2f, 0f, 0f));
            }
            Studio.Light(Vector3.back);
            Studio.Render(Texture);
            Draws++;
        }

        public void Dispose()
        {
            if (Body != null) Object.Destroy(Body);
            if (_shadow != null) Object.Destroy(_shadow);
            if (Texture != null) { Texture.Release(); Object.Destroy(Texture); }
            Body = null; _shadow = null; Texture = null;
        }

        private static Sprite _blob;

        /// <summary>A soft dark disc on the floor under the feet (the studio's lights cast no shadows).</summary>
        private static GameObject Shadow()
        {
            if (_blob == null)
            {
                const int n = 64;
                var tex = new Texture2D(n, n, TextureFormat.RGBA32, false) { name = "figure shadow", wrapMode = TextureWrapMode.Clamp };
                var px = new Color32[n * n];
                for (var y = 0; y < n; y++)
                for (var x = 0; x < n; x++)
                {
                    var d = new Vector2(x + 0.5f - n / 2f, y + 0.5f - n / 2f).magnitude / (n / 2f);
                    var a = Mathf.Clamp01(1f - d);
                    px[y * n + x] = new Color32(0, 0, 0, (byte)(a * a * 150));
                }
                tex.SetPixels32(px);
                tex.Apply(false, true);
                _blob = Sprite.Create(tex, new Rect(0, 0, n, n), new Vector2(0.5f, 0.5f), n);
            }
            var go = new GameObject("figure shadow");
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = _blob;
            go.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            go.transform.localScale = new Vector3(1.1f, 0.7f, 1f);
            return go;
        }
    }
}
