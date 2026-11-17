using System.Collections.Generic;
using SecondFace.Core.Combat;
using UnityEngine;

namespace SecondFace.Game.Fighting
{
    /// <summary>
    /// What the fight's bodies need (COMBAT.md A1–A8), built by the editor (Editor/Build/CombatAnimatorBuild.cs, never by
    /// hand): the controller that carries the combat layers (the people's own locomotion, with "Combat" and "CombatArms"
    /// added from Core <see cref="CombatMotion"/>), the weapons as prefabs with their two lore paints and their grip, muzzle
    /// and tip points (from the staged sidecars, metres in the weapon's frame), and each clip's length and beats (impact,
    /// release, fire, the magazine), as normalized times, from the clips' own sidecars.
    /// </summary>
    public sealed class CombatSet : ScriptableObject
    {
        public int Version;
        public RuntimeAnimatorController Controller;
        public Weapon[] Weapons = new Weapon[0];
        public ClipFacts[] Clips = new ClipFacts[0];

        [System.Serializable]
        public sealed class Weapon
        {
            public string Id;
            public GameObject Prefab;
            /// <summary>The two lore paints' materials, side by side (the prefab carries the first): a second paint swaps each of
            /// the first's for its partner.</summary>
            public Material[] Paint1 = new Material[0], Paint2 = new Material[0];
            public bool HasOff, HasMuzzle;
            public Vector3 GripOff, Muzzle, Tip;
            /// <summary>A long gun's butt (where the stock meets the shoulder), in the weapon's frame (the sidecar's
            /// <c>butt</c>): the low ready holds it in the shoulder's pocket (<see cref="CombatMotion.LongGunReady"/>).</summary>
            public bool HasButt;
            public Vector3 Butt;
            /// <summary>Its length along +Z, m (for the holster's room and a dropped weapon's collider).</summary>
            public float Length;
            /// <summary>How the imported model sits in the weapon's frame (the sidecar's: +Z along the barrel or blade, +Y its top,
            /// origin the main grip): the model's root turned by <see cref="ModelRot"/> (applied over its own imported turn) and
            /// set at <see cref="ModelPos"/>, fitted at the build so that its nulls (grip_main, grip_off, muzzle, tip, butt) lie
            /// where the sidecar's points say. The FBX's single root carries the exporter's axis turn (Blender's -90° about X,
            /// with Unity's own conversion): a model placed by its root alone had its nulls 12.8 cm from the sidecar's on the bat
            /// and lay a quarter turn off the frame the hands hold it by (CombatBuildTests, 2026-11-17).</summary>
            public Quaternion ModelRot = Quaternion.identity;
            public Vector3 ModelPos;
            /// <summary>Set by the build's fit (false: an older set, fitted again when the weapon is first made); whether its points
            /// fixed the turn about its own length too (false: all on one line, a blade's or a bat's).</summary>
            public bool Fitted, FittedFull;
            /// <summary>Every point of the sidecar (<c>points_unity</c>), by its null's name: the fit's evidence.</summary>
            public string[] PointNames = new string[0];
            public Vector3[] PointsAt = new Vector3[0];

            /// <summary>The sidecar's points this weapon has, by the null's name in the model.</summary>
            public IEnumerable<(string Name, Vector3 At)> Points()
            {
                if (PointNames != null && PointsAt != null && PointNames.Length > 0 && PointNames.Length == PointsAt.Length)
                {
                    // (grip_main first: the fit measures along the weapon from it)
                    for (var i = 0; i < PointNames.Length; i++) if (PointNames[i] == "grip_main") yield return (PointNames[i], PointsAt[i]);
                    for (var i = 0; i < PointNames.Length; i++) if (PointNames[i] != "grip_main") yield return (PointNames[i], PointsAt[i]);
                    yield break;
                }
                yield return ("grip_main", Vector3.zero);
                if (HasOff) yield return ("grip_off", GripOff);
                if (HasMuzzle) yield return ("muzzle", Muzzle);
                else if (Tip.sqrMagnitude > 1e-6f) yield return ("tip", Tip);
                if (HasButt) yield return ("butt", Butt);
            }

            /// <summary>Fits <see cref="ModelRot"/> and <see cref="ModelPos"/> from the model's own nulls against the sidecar's
            /// points (the turn from the two most telling directions: along the weapon to its farthest point, and across it to the
            /// point farthest off that line; with every point on one line, as a bat's or a blade's, the least turn that lays the
            /// line along the sidecar's from <paramref name="like"/> (the turn a fully fitted weapon of the same export needed:
            /// the import's twist is the same for all) or from the import's own). Returns the largest distance left between a
            /// null and its point (m; -1: no nulls to fit by).</summary>
            public float Fit(Quaternion? like = null)
            {
                if (Prefab == null) return -1f;
                var root = Prefab.transform;
                var pairs = new List<(Vector3 Model, Vector3 Side)>();
                foreach (var (name, at) in Points())
                {
                    var t = FindChild(root, name);
                    if (t != null) pairs.Add((t.position - root.position, at));
                }
                if (pairs.Count < 2) { ModelRot = Quaternion.identity; ModelPos = Vector3.zero; Fitted = true; return -1f; }
                // along: from the main grip (the first pair) to the farthest point
                var o = pairs[0];
                var far = 1;
                for (var i = 2; i < pairs.Count; i++) if ((pairs[i].Side - o.Side).sqrMagnitude > (pairs[far].Side - o.Side).sqrMagnitude) far = i;
                var aS = (pairs[far].Side - o.Side).normalized; var aM = (pairs[far].Model - o.Model).normalized;
                // across: the point standing farthest off that line
                var best = -1; var bestOff = 0.004f;
                for (var i = 1; i < pairs.Count; i++)
                {
                    var off = Vector3.ProjectOnPlane(pairs[i].Side - o.Side, aS).magnitude;
                    if (off > bestOff) { bestOff = off; best = i; }
                }
                Quaternion q;
                if (best >= 0)
                {
                    var cS = Vector3.ProjectOnPlane(pairs[best].Side - o.Side, aS); var cM = Vector3.ProjectOnPlane(pairs[best].Model - o.Model, aM);
                    q = Quaternion.LookRotation(aS, cS) * Quaternion.Inverse(Quaternion.LookRotation(aM, cM));
                    FittedFull = true;
                }
                else
                {
                    var q0 = like ?? Quaternion.identity;
                    q = Quaternion.FromToRotation(q0 * aM, aS) * q0;
                    FittedFull = false;
                }
                // where: the centroids matched (least squares for the turn found)
                var cs = Vector3.zero; var cm = Vector3.zero;
                foreach (var (m, sd) in pairs) { cs += sd; cm += m; }
                cs /= pairs.Count; cm /= pairs.Count;
                ModelRot = q; ModelPos = cs - q * cm; Fitted = true;
                var worst = 0f;
                foreach (var (m, sd) in pairs) worst = Mathf.Max(worst, (ModelPos + ModelRot * m - sd).magnitude);
                return worst;
            }

            /// <summary>The weapon made in its own frame: a holder whose +Z is the barrel or blade, +Y its top, origin the main
            /// grip (the frame the hands, the holsters and the sidecar's points are in), the model inside it as fitted.</summary>
            public GameObject Spawn(string name = null)
            {
                if (Prefab == null) return null;
                if (!Fitted) Fit();
                var holder = new GameObject(name ?? "held_" + Id);
                var model = Object.Instantiate(Prefab, holder.transform, false);
                model.transform.localPosition = ModelPos;
                model.transform.localRotation = ModelRot * Prefab.transform.localRotation;
                return holder;
            }

            private static Transform FindChild(Transform root, string name)
            {
                foreach (var t in root.GetComponentsInChildren<Transform>(true)) if (t != root && t.name == name) return t;
                return null;
            }
        }

        [System.Serializable]
        public sealed class ClipFacts
        {
            public string Name;
            public float Length;
            public bool Loop;
            /// <summary>Each beat's name, beside <see cref="Times"/> (normalized).</summary>
            public string[] Events = new string[0];
            public float[] Times = new float[0];
        }

        private Dictionary<string, Weapon> _weapons;
        private Dictionary<string, ClipFacts> _clips;

        public Weapon WeaponOf(string id)
        {
            if (id == null) return null;
            if (_weapons == null) { _weapons = new Dictionary<string, Weapon>(); foreach (var w in Weapons) if (w != null && w.Id != null) _weapons[w.Id] = w; }
            return _weapons.TryGetValue(id, out var x) ? x : null;
        }

        public ClipFacts ClipOf(string name)
        {
            if (name == null) return null;
            if (_clips == null) { _clips = new Dictionary<string, ClipFacts>(); foreach (var c in Clips) if (c != null && c.Name != null) _clips[c.Name] = c; }
            return _clips.TryGetValue(name, out var x) ? x : null;
        }

        /// <summary>A state's beat for a body (its clip by sex), as the state's own normalized time (-1: none).</summary>
        public float Beat(string state, bool female, string beat, int index = 0)
        {
            var s = CombatMotion.State(state);
            var c = s != null ? ClipOf(s.ClipFor(female)) : null;
            if (c == null) return -1f;
            var n = 0;
            for (var i = 0; i < c.Events.Length && i < c.Times.Length; i++)
                if (c.Events[i] == beat) { if (n == index) return c.Times[i]; n++; }
            return -1f;
        }

        /// <summary>How many of a beat a state's clip has (a burst's rounds, a combination's blows).</summary>
        public int Beats(string state, bool female, string beat)
        {
            var s = CombatMotion.State(state);
            var c = s != null ? ClipOf(s.ClipFor(female)) : null;
            if (c == null) return 0;
            var n = 0;
            foreach (var e in c.Events) if (e == beat) n++;
            return n;
        }

        /// <summary>A state's length at speed 1 (its clip's), s.</summary>
        public float Length(string state, bool female)
        {
            var s = CombatMotion.State(state);
            var c = s != null ? ClipOf(s.ClipFor(female)) : null;
            return c != null ? c.Length : 1f;
        }
    }
}
