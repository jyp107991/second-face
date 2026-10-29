using System;
using System.Collections.Generic;

namespace SecondFace.Core.Npc
{
    /// <summary>One slider of the face sculptor: a pair of blend shapes (<c>&lt;Id&gt;-&lt;Low&gt;</c> below zero,
    /// <c>&lt;Id&gt;-&lt;High&gt;</c> above), or a single shape (no <see cref="Low"/>) weighted 0..1.</summary>
    public sealed class SculptSlider
    {
        public readonly string Id, Group, Label, Low, High;
        public SculptSlider(string id, string group, string label, string low, string high)
        {
            Id = id; Group = group; Label = label; Low = low; High = high;
        }
        public bool Paired => Low != null;
        public float Min => Paired ? -1f : 0f;
    }

    /// <summary>
    /// The face sculptor (BUILD_PLAN §6.B.5): the player's body carries the face shapes of tools/unity/people/mh_build.py
    /// (FACE_SHAPES; the names must match), and every proxy on the head (hair, brows, lashes, eyes, hats) carries the same
    /// shapes refitted, so the face changes as one. A slider at v drives one shape of its pair at |v|; the head shapes are
    /// single (0..1); <see cref="Aged"/> is the same face older, for the photograph. Values are kept by slider id.
    /// </summary>
    public static class Sculpt
    {
        public const string Aged = "aged";
        /// <summary>The smallest change between two rerolls, in slider units over the whole face (UPGRADE: rerolls with
        /// real variance).</summary>
        public const float RerollDistance = 1.6f;

        public static readonly string[] Groups = { "head", "brows", "eyes", "nose", "cheeks", "mouth", "chin", "ears", "neck" };

        public static readonly SculptSlider[] Sliders =
        {
            new("head-scale-horiz", "head", "head width", "decr", "incr"),
            new("head-fat", "head", "head fullness", "decr", "incr"),
            new("head-age", "head", "head age", "decr", "incr"),
            new("forehead-scale-vert", "head", "forehead height", "decr", "incr"),
            new("head-oval", "head", "oval", null, "head-oval"),
            new("head-round", "head", "round", null, "head-round"),
            new("head-square", "head", "square", null, "head-square"),
            new("head-rectangular", "head", "long", null, "head-rectangular"),
            new("head-triangular", "head", "triangular", null, "head-triangular"),
            new("head-diamond", "head", "diamond", null, "head-diamond"),
            new("eyebrows-trans", "brows", "brow height", "down", "up"),
            new("eyebrows-angle", "brows", "brow angle", "down", "up"),
            new("eye-scale", "eyes", "eye size", "decr", "incr"),
            new("eye-trans", "eyes", "eye spacing", "in", "out"),
            new("eye-epicanthus", "eyes", "eyelid fold", "in", "out"),
            new("eye-bag", "eyes", "eye bags", "decr", "incr"),
            new("nose-scale-horiz", "nose", "nose width", "decr", "incr"),
            new("nose-scale-vert", "nose", "nose length", "decr", "incr"),
            new("nose-hump", "nose", "bridge hump", "decr", "incr"),
            new("nose-nostrils-width", "nose", "nostrils", "decr", "incr"),
            new("nose-point-width", "nose", "nose tip", "decr", "incr"),
            new("nose-volume", "nose", "nose size", "decr", "incr"),
            new("cheek-bones", "cheeks", "cheekbones", "decr", "incr"),
            new("cheek-volume", "cheeks", "cheek fullness", "decr", "incr"),
            new("mouth-scale-horiz", "mouth", "mouth width", "decr", "incr"),
            new("mouth-upperlip-volume", "mouth", "upper lip", "decr", "incr"),
            new("mouth-lowerlip-volume", "mouth", "lower lip", "decr", "incr"),
            new("mouth-angles", "mouth", "mouth corners", "down", "up"),
            new("chin-prominent", "chin", "chin forward", "decr", "incr"),
            new("chin-width", "chin", "chin width", "decr", "incr"),
            new("chin-height", "chin", "chin height", "decr", "incr"),
            new("chin-bones", "chin", "jaw", "decr", "incr"),
            new("chin-cleft", "chin", "chin cleft", "decr", "incr"),
            new("ear-scale", "ears", "ear size", "decr", "incr"),
            new("neck-scale-horiz", "neck", "neck width", "decr", "incr"),
        };

        private static readonly Dictionary<string, SculptSlider> ById = new();
        static Sculpt() { foreach (var s in Sliders) ById[s.Id] = s; }

        public static SculptSlider Slider(string id) => ById.TryGetValue(id, out var s) ? s : null;

        /// <summary>Every blend shape the sculptor drives (both of each pair, the single shapes and <see cref="Aged"/>).</summary>
        public static IEnumerable<string> Shapes()
        {
            foreach (var s in Sliders)
            {
                if (s.Paired) { yield return s.Id + "-" + s.Low; yield return s.Id + "-" + s.High; }
                else yield return s.High;
            }
            yield return Aged;
        }

        /// <summary>
        /// The blend-shape weights (0..100, Unity's scale) for slider values: every shape the sculptor drives is listed,
        /// at zero when its slider is elsewhere, so applying the list over an earlier face leaves nothing behind. Values
        /// out of range are clamped; ids that are not sliders (and not <see cref="Aged"/>) are ignored.
        /// </summary>
        public static List<(string Shape, float Weight)> Weights(IReadOnlyDictionary<string, float> values, float aged = 0f)
        {
            var l = new List<(string, float)>(Sliders.Length * 2 + 1);
            foreach (var s in Sliders)
            {
                var v = values != null && values.TryGetValue(s.Id, out var x) ? Math.Clamp(x, s.Min, 1f) : 0f;
                if (s.Paired)
                {
                    l.Add((s.Id + "-" + s.Low, v < 0 ? -v * 100f : 0f));
                    l.Add((s.Id + "-" + s.High, v > 0 ? v * 100f : 0f));
                }
                else l.Add((s.High, v * 100f));
            }
            l.Add((Aged, Math.Clamp(aged, 0f, 1f) * 100f));
            return l;
        }

        /// <summary>How far apart two faces are: the length of the difference of their slider values.</summary>
        public static float Distance(IReadOnlyDictionary<string, float> a, IReadOnlyDictionary<string, float> b)
        {
            double sum = 0;
            foreach (var s in Sliders)
            {
                var x = a != null && a.TryGetValue(s.Id, out var va) ? va : 0f;
                var y = b != null && b.TryGetValue(s.Id, out var vb) ? vb : 0f;
                sum += (x - y) * (x - y);
            }
            return (float)Math.Sqrt(sum);
        }

        /// <summary>
        /// A random face: one head shape, then six to ten features pushed hard one way or the other and the rest left
        /// near the middle, so a face has a character instead of an average of small changes. Drawn again (up to 20
        /// times) until it lies at least <see cref="RerollDistance"/> from <paramref name="previous"/>.
        /// </summary>
        public static Dictionary<string, float> Reroll(Rng rng, IReadOnlyDictionary<string, float> previous = null)
        {
            Dictionary<string, float> face = null;
            for (var attempt = 0; attempt < 20; attempt++)
            {
                face = new Dictionary<string, float>();
                var heads = Array.FindAll(Sliders, s => !s.Paired);
                face[rng.Pick(heads).Id] = (float)rng.Range(0.35, 0.85);
                var paired = Array.FindAll(Sliders, s => s.Paired);
                for (var i = paired.Length - 1; i > 0; i--) { var j = rng.Int(0, i); (paired[i], paired[j]) = (paired[j], paired[i]); }
                var strong = rng.Int(6, 10);
                for (var i = 0; i < paired.Length; i++)
                {
                    var mag = i < strong ? rng.Range(0.45, 1.0) : rng.Range(0.0, 0.2);
                    face[paired[i].Id] = (float)(rng.Chance(0.5) ? mag : -mag);
                }
                if (previous == null || Distance(face, previous) >= RerollDistance) break;
            }
            return face;
        }
    }
}
