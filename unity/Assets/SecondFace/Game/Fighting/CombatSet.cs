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
            /// <summary>Its length along +Z, m (for the holster's room and a dropped weapon's collider).</summary>
            public float Length;
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
