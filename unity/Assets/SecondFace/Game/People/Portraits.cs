using System.Collections.Generic;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Portraits rendered in the engine (BUILD_PLAN P4 step 6): a person's head drawn into a square texture under a fixed
    /// studio light (a warm key from the front left, a cool fill, a rim from behind, a neutral ambient, no fog), whatever
    /// the hour or the weather where they stand, and kept: asked again for the same person and the same key (an outfit
    /// state, "aged" for the photograph), the texture comes back at once. The person is drawn where they are, alone (their
    /// renderers on <see cref="Layer"/> for the one render, at their nearest level of detail); the world's lights,
    /// ambient and fog are set aside for that render and put back. The UI shows the texture: no wait.
    /// </summary>
    public static class Portraits
    {
        /// <summary>The layer a person is drawn on for their portrait (the <see cref="Studio"/>'s).</summary>
        public const int Layer = Studio.Layer;
        public const int Size = 256;

        private static readonly Dictionary<(int, string), RenderTexture> Cache = new();

        /// <summary>The cached portraits (tests read it).</summary>
        public static int Count => Cache.Count;

        /// <summary>The person's portrait for a key (an outfit state; "aged" draws the aged face), made once.</summary>
        public static RenderTexture Of(GameObject person, string key = "", int size = Size)
        {
            if (person == null) return null;
            var id = (person.GetInstanceID(), key ?? "");
            if (Cache.TryGetValue(id, out var rt) && rt != null && rt.IsCreated()) return rt;
            rt = new RenderTexture(size, size, 24, RenderTextureFormat.ARGB32) { name = $"portrait {person.name} {key}" };
            rt.Create();
            Render(person, rt, key == "aged");
            Cache[id] = rt;
            return rt;
        }

        /// <summary>Drops a person's portraits (their outfit or face changed).</summary>
        public static void Forget(GameObject person)
        {
            if (person == null) return;
            var gone = new List<(int, string)>();
            foreach (var k in Cache.Keys) if (k.Item1 == person.GetInstanceID()) gone.Add(k);
            foreach (var k in gone) { Cache[k].Release(); Object.Destroy(Cache[k]); Cache.Remove(k); }
        }

        private static Mesh _baked;

        /// <summary>The top of the skull as the body is drawn now (its skinned mesh baked; the highest point within 25 cm of
        /// the head's line, so a raised hand or a hat's brim does not count), world height; null with no skinned body.</summary>
        private static float? TopOfHead(GameObject person, Vector3 near)
        {
            SkinnedMeshRenderer body = null;
            foreach (var r in person.GetComponentsInChildren<SkinnedMeshRenderer>())
            {
                if (r.sharedMesh == null || !r.enabled || r.name.IndexOf("hair", System.StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (body == null || r.sharedMesh.vertexCount > body.sharedMesh.vertexCount) body = r;
            }
            if (body == null) return null;
            _baked ??= new Mesh { name = "portrait bake" };
            body.BakeMesh(_baked, true);
            var m = Matrix4x4.TRS(body.transform.position, body.transform.rotation, Vector3.one);   // (baked with its scale, in its place and turn)
            var verts = _baked.vertices;
            float? top = null;
            var line = new Vector2(near.x, near.z);
            foreach (var v in verts)
            {
                var w = m.MultiplyPoint3x4(v);
                if ((new Vector2(w.x, w.z) - line).sqrMagnitude > 0.25f * 0.25f) continue;
                if (top == null || w.y > top.Value) top = w.y;
            }
            return top;
        }

        private static void Render(GameObject person, RenderTexture rt, bool aged)
        {
            var camera = Studio.Camera;
            var animator = person.GetComponentInChildren<Animator>();
            // the pose as the game shows it (a townsperson's animator is culled off camera: its bones may never have run)
            if (animator != null && animator.isActiveAndEnabled && animator.runtimeAnimatorController != null)
            {
                var mode = animator.cullingMode;
                animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                animator.Update(0f);
                animator.cullingMode = mode;
            }
            var head = animator != null && animator.isHuman ? animator.GetBoneTransform(HumanBodyBones.Head) : null;
            var root = person.transform;
            var at = head != null ? head.position + Vector3.up * 0.05f : root.position + Vector3.up * 1.6f;
            // checked against the body as drawn (play-ch1 T41: a townsperson's portrait showed her jacket): the face sits about
            // 13 cm under the top of the skull; a head bone that disagrees by more than 8 cm gives way to the drawn body
            var top = TopOfHead(person, head != null ? head.position : root.position + Vector3.up * 1.6f);
            if (top != null && Mathf.Abs(at.y - (top.Value - 0.13f)) > 0.08f)
            {
                Debug.Log($"Portraits: {person.name}: the head bone at {at.y - root.position.y:0.00} m, the drawn face at {top.Value - 0.13f - root.position.y:0.00} m: framed on the drawn face");
                at.y = top.Value - 0.13f;
            }
            // which way the face looks: from the head to the eyes (a person not yet animated stands in the model's own pose,
            // which faces away from the Humanoid forward the animation turns them to)
            var forward = Vector3.ProjectOnPlane(root.forward, Vector3.up).normalized;
            Renderer eyes = null;
            foreach (var r in person.GetComponentsInChildren<Renderer>()) if (r.name.StartsWith("Eyes_")) { eyes = r; break; }
            if (eyes != null && head != null)
            {
                var look = Vector3.ProjectOnPlane(eyes.bounds.center - head.position, Vector3.up);
                if (look.magnitude > 0.02f) forward = look.normalized;
            }
            if (forward.sqrMagnitude < 0.5f) forward = Vector3.forward;
            var right = Vector3.Cross(Vector3.up, forward);
            // three-quarter view from the front left, a little above the eyes
            camera.transform.position = at + forward * 0.95f + right * -0.28f + Vector3.up * 0.04f;
            camera.transform.LookAt(at);
            camera.fieldOfView = 20f;
            camera.backgroundColor = new Color(0.36f, 0.33f, 0.29f, 1f);   // the notebook's dark paper
            Studio.Light(forward);

            // the person alone, near, aged if asked
            var renderers = person.GetComponentsInChildren<Renderer>();
            var layers = new int[renderers.Length];
            for (var i = 0; i < renderers.Length; i++) { layers[i] = renderers[i].gameObject.layer; renderers[i].gameObject.layer = Layer; }
            var lod = person.GetComponentInChildren<LODGroup>();
            lod?.ForceLOD(0);
            var sculpt = person.GetComponentInChildren<FaceSculpt>();
            var age = sculpt != null ? sculpt.Aged : 0f;
            if (sculpt != null && aged) { sculpt.Aged = 1f; sculpt.Apply(); }

            try { Studio.Render(rt); }
            finally
            {
                if (sculpt != null && aged) { sculpt.Aged = age; sculpt.Apply(); }
                lod?.ForceLOD(-1);
                for (var i = 0; i < renderers.Length; i++) if (renderers[i] != null) renderers[i].gameObject.layer = layers[i];
            }
        }
    }
}
