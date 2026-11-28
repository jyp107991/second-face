using System.Collections.Generic;
using System.Linq;
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
            /// <summary>Each foot's planted spans by the clip's own record of its actor's contacts (the sidecar's
            /// plant_record.stances), as pairs of normalized times [start, end, start, end ...]; empty: no record.</summary>
            public float[] DownL = new float[0], DownR = new float[0];
            /// <summary>The clip's turn back onto its actor's pose, one per body skeleton (<see cref="ClipTurn"/>); empty for a
            /// clip the fight's whole-body layer never plays.</summary>
            public ClipTurn[] Turns = new ClipTurn[0];
        }

        /// <summary>
        /// What Unity's humanoid retarget leaves between a fight clip's actor and a body's skeleton (docs/COMBAT_ROOT_CAUSE.md 19,
        /// docs/MOTION_ROOT_CAUSE.md §16), put back. Unity places the pelvis from the clip's body orientation, which it reads from
        /// the joints' positions, and on the Rocketbox bodies (3ds Max Biped) the clavicles hang from the neck and the thighs from
        /// the spine: the same human pose (the same muscles and body rotation, read back) stands the whole skeleton turned 2-19°
        /// from the actor's; and on the actors converted from CMU's skeleton (a hip joint bone between the pelvis and each thigh)
        /// the thighs stand rolled 2-27° more, growing with the hip's bend (the planted feet 7-11 cm apart in height where the
        /// actor's are level). Baked in the editor from the clip on its own actor and on the skeleton (CombatAnimatorBuild.Turns,
        /// nothing set by hand); at each key (a normalized time of the clip), in the body's root frame: the turn of the hips from
        /// the skeleton's pose onto the actor's (each from its own muscle-zero pose); then each thigh's turn that lays the thigh
        /// along the actor's and the knee-to-toes line in the actor's leg plane; the shift along the ground that puts the middle of
        /// the hip joints where the actor's are (scaled by the two human scales; m at the body's scale 1; the height is left to
        /// the fight's feet). Fighter applies it before any other system reads the pose (<see cref="ClipTurnFirst"/>).
        /// </summary>
        [System.Serializable]
        public sealed class ClipTurn
        {
            /// <summary>The body skeleton it is for (<see cref="SkeletonKey"/>).</summary>
            public string Skeleton;
            /// <summary>The keys, <see cref="Stride"/> floats each (time; hips, left thigh, right thigh as x, y, z, w; the shift's
            /// x and z), as little-endian floats in base 64 (a compact asset).</summary>
            public string Data = "";
            public int Keys;
            public const int Stride = 15;

            [System.NonSerialized] private float[] _f;

            public float[] Floats()
            {
                if (_f != null) return _f;
                if (string.IsNullOrEmpty(Data)) return _f = new float[0];
                var bytes = System.Convert.FromBase64String(Data);
                var f = new float[bytes.Length / 4];
                System.Buffer.BlockCopy(bytes, 0, f, 0, f.Length * 4);
                return _f = f;
            }

            public static string Pack(float[] f)
            {
                var bytes = new byte[f.Length * 4];
                System.Buffer.BlockCopy(f, 0, bytes, 0, bytes.Length);
                return System.Convert.ToBase64String(bytes);
            }

            private static Quaternion Q(float[] f, int at) => new(f[at], f[at + 1], f[at + 2], f[at + 3]);

            /// <summary>The turns and shift at a normalized time (between the keys, eased linearly; the ends held).</summary>
            public void At(float t, out Quaternion hips, out Quaternion thighL, out Quaternion thighR, out Vector3 shift)
            {
                var f = Floats();
                var n = f.Length / Stride;
                hips = thighL = thighR = Quaternion.identity; shift = Vector3.zero;
                if (n == 0) return;
                int lo, hi; float k;
                if (n == 1 || t <= f[0]) { lo = hi = 0; k = 0f; }
                else if (t >= f[(n - 1) * Stride]) { lo = hi = n - 1; k = 0f; }
                else
                {
                    lo = 0; hi = n - 1;
                    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (f[m * Stride] <= t) lo = m; else hi = m; }
                    k = (t - f[lo * Stride]) / Mathf.Max(1e-6f, f[hi * Stride] - f[lo * Stride]);
                }
                int a = lo * Stride, b = hi * Stride;
                hips = Quaternion.Slerp(Q(f, a + 1), Q(f, b + 1), k);
                thighL = Quaternion.Slerp(Q(f, a + 5), Q(f, b + 5), k);
                thighR = Quaternion.Slerp(Q(f, a + 9), Q(f, b + 9), k);
                shift = new Vector3(Mathf.Lerp(f[a + 13], f[b + 13], k), 0f, Mathf.Lerp(f[a + 14], f[b + 14], k));
            }
        }

        /// <summary>The inputs the turns were baked from (CombatAnimatorBuild.TurnStamp: the bake's version, every baked clip's
        /// import hash, every skeleton's key): a test fails when a clip or a skeleton changed and the set was not baked again.</summary>
        public string TurnStamp = "";

        private static readonly Dictionary<Avatar, string> Keys = new();

        /// <summary>A body skeleton's identity (16 hex digits): the bones the human pose drives (every human bone and every
        /// bone between it and the model's root), each with its avatar T-pose's local position (0.1 mm) and rotation (1e-4) and
        /// the bone it hangs from, and the human bones' mapping; the model's own root and its mesh nodes (named per person) left
        /// out. People who share it are retargeted alike.</summary>
        public static string SkeletonKey(Animator a)
        {
            if (a == null || a.avatar == null || !a.avatar.isHuman) return null;
            if (Keys.TryGetValue(a.avatar, out var key)) return key;
            var d = a.avatar.humanDescription;
            var bones = new HashSet<string>();
            var parents = new SortedDictionary<string, string>(System.StringComparer.Ordinal);
            for (var b = HumanBodyBones.Hips; b < HumanBodyBones.LastBone; b++)
                for (var t = a.GetBoneTransform(b); t != null && t != a.transform; t = t.parent)
                    if (bones.Add(t.name)) parents[t.name] = t.parent == null || t.parent == a.transform ? "<root>" : t.parent.name;
            if (bones.Count == 0) return null;
            var sb = new System.Text.StringBuilder();
            long R(float v, float q) => (long)System.Math.Round(v / q);
            foreach (var b in d.skeleton.Where(b => bones.Contains(b.name)).OrderBy(b => b.name, System.StringComparer.Ordinal))
                sb.Append(b.name).Append('<').Append(parents[b.name]).Append('|')
                  .Append(R(b.position.x, 1e-4f)).Append(',').Append(R(b.position.y, 1e-4f)).Append(',').Append(R(b.position.z, 1e-4f)).Append('|')
                  .Append(R(b.rotation.x, 1e-4f)).Append(',').Append(R(b.rotation.y, 1e-4f)).Append(',').Append(R(b.rotation.z, 1e-4f)).Append(',').Append(R(b.rotation.w, 1e-4f)).Append(';');
            foreach (var h in d.human.OrderBy(h => h.humanName, System.StringComparer.Ordinal)) sb.Append(h.humanName).Append('=').Append(h.boneName).Append(';');
            ulong hsh = 14695981039346656037UL;
            foreach (var c in sb.ToString()) { hsh ^= c; hsh *= 1099511628211UL; }
            key = hsh.ToString("x16", System.Globalization.CultureInfo.InvariantCulture);
            Keys[a.avatar] = key;
            return key;
        }

        /// <summary>A clip's turns for a skeleton at a normalized time; false (identity) when none was baked.</summary>
        public bool TurnOf(string clip, string skeleton, float t, out Quaternion hips, out Quaternion thighL, out Quaternion thighR, out Vector3 shift)
        {
            hips = thighL = thighR = Quaternion.identity; shift = Vector3.zero;
            var c = ClipOf(clip);
            if (c?.Turns == null || skeleton == null) return false;
            foreach (var tu in c.Turns)
                if (tu != null && tu.Skeleton == skeleton) { tu.At(t, out hips, out thighL, out thighR, out shift); return true; }
            return false;
        }

        private Dictionary<string, Weapon> _weapons;
        private Dictionary<string, ClipFacts> _clips;

        public Weapon WeaponOf(string id)
        {
            if (id == null) return null;
            if (_weapons == null) { _weapons = new Dictionary<string, Weapon>(); foreach (var w in Weapons) if (w != null && w.Id != null) _weapons[w.Id] = w; }
            return _weapons.TryGetValue(id, out var x) ? x : null;
        }

        /// <summary>The base layer's sits' turns back onto their actors (one per seated state: <see cref="ClipFacts.Name"/> the
        /// state's name, <see cref="ClipFacts.Turns"/> per body skeleton), baked as the fight's whole-body clips' are
        /// (CombatAnimatorBuild.Seats; applied by SecondFace.Game.People.SeatTurn).</summary>
        public ClipFacts[] Seats = new ClipFacts[0];
        /// <summary>What the seats' turns were baked from (CombatAnimatorBuild.SeatStamp: the bake's version, each sit's clip
        /// file and import settings, every skeleton's key).</summary>
        public string SeatStamp = "";
        private Dictionary<int, ClipFacts> _seats;

        /// <summary>A seated state's turns for a skeleton at a normalized time (by the state's short name hash); false
        /// (identity) when none was baked.</summary>
        public bool SeatTurnOf(int state, string skeleton, float t, out Quaternion hips, out Quaternion thighL, out Quaternion thighR, out Vector3 shift)
        {
            hips = thighL = thighR = Quaternion.identity; shift = Vector3.zero;
            if (skeleton == null || Seats == null) return false;
            if (_seats == null) { _seats = new Dictionary<int, ClipFacts>(); foreach (var c in Seats) if (c != null && c.Name != null) _seats[Animator.StringToHash(c.Name)] = c; }
            if (!_seats.TryGetValue(state, out var f) || f.Turns == null) return false;
            foreach (var tu in f.Turns)
                if (tu != null && tu.Skeleton == skeleton) { tu.At(t, out hips, out thighL, out thighR, out shift); return true; }
            return false;
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
