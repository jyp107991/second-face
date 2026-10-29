using System;
using System.Collections.Generic;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// A person or thing the player can act on (BUILD_PLAN §6.F.2, P5.3c): a tap on it opens the radial of its
    /// <see cref="Verbs"/> instead of walking there. It is found by a ray through a trigger collider of its own
    /// (<see cref="Under"/>; a solid collider nearer the camera hides it), so it neither blocks walking nor touches
    /// physics. The content fills the verbs (P6.1: talk, look, take, use, steal, give, attack); a choice is
    /// <see cref="Chosen"/>.
    /// </summary>
    public sealed class Interactable : MonoBehaviour
    {
        public string Id;
        /// <summary>The name shown at the radial's centre.</summary>
        public string Title;
        public List<string> Verbs = new();
        /// <summary>Verbs shown but not open now (stealing in plain sight).</summary>
        public List<string> Closed = new();
        public event Action<Interactable, string> Chosen;

        public void Choose(string verb)
        {
            if (Verbs.Contains(verb) && !Closed.Contains(verb)) Chosen?.Invoke(this, verb);
        }

        /// <summary>Makes a person or thing interactable: a trigger capsule round it (radius, height, from its feet).</summary>
        public static Interactable Add(GameObject go, string id, string title, float radius, float height, params string[] verbs)
        {
            // not ??: in the editor a missing component reads as a fake null object
            var it = go.GetComponent<Interactable>();
            if (it == null) it = go.AddComponent<Interactable>();
            it.Id = id;
            it.Title = title;
            it.Verbs = new List<string>(verbs);
            var c = go.AddComponent<CapsuleCollider>();
            c.isTrigger = true;
            c.radius = radius;
            c.height = height;
            c.center = new Vector3(0, height * 0.5f, 0);
            return it;
        }

        private static readonly RaycastHit[] Hits = new RaycastHit[16];

        /// <summary>The interactable under a screen point, if one is the first thing the ray meets (pixels, origin
        /// bottom-left).</summary>
        public static Interactable Under(Camera cam, Vector2 screen, float range = 300f)
        {
            if (cam == null) return null;
            var ray = cam.ScreenPointToRay(new Vector3(screen.x, screen.y, 0));
            var n = Physics.RaycastNonAlloc(ray, Hits, range, ~0, QueryTriggerInteraction.Collide);
            Array.Sort(Hits, 0, n, Nearer);
            for (var i = 0; i < n; i++)
            {
                var it = Hits[i].collider.GetComponentInParent<Interactable>();
                if (it != null && it.isActiveAndEnabled) return it;
                if (!Hits[i].collider.isTrigger) return null;   // something solid stands in front
            }
            return null;
        }

        private static readonly Comparison<RaycastHit> NearerComparison = (a, b) => a.distance.CompareTo(b.distance);
        private static readonly IComparer<RaycastHit> Nearer = Comparer<RaycastHit>.Create(NearerComparison);
    }
}
