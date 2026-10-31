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
        public float Min => Paired ? -Sculpt.Reach(Id) : 0f;
        public float Max => Sculpt.Reach(Id);
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

        public static readonly string[] Groups = { "head", "brows", "eyes", "nose", "cheeks", "mouth", "chin", "ears", "neck" };

        public static readonly SculptSlider[] Sliders =
        {
            new("head-scale-horiz", "head", "head width", "decr", "incr"),
            new("head-cranium", "head", "skull width", "decr", "incr"),
            new("head-scale-depth", "head", "head length", "decr", "incr"),
            new("head-back-scale-depth", "head", "back of the head", "decr", "incr"),
            new("head-scale-vert", "head", "head height", "decr", "incr"),
            new("head-fat", "head", "head fullness", "decr", "incr"),
            new("head-age", "head", "head age", "decr", "incr"),
            new("forehead-scale-vert", "head", "forehead height", "decr", "incr"),
            new("head-oval", "head", "oval", null, "head-oval"),
            new("head-round", "head", "round", null, "head-round"),
            new("head-square", "head", "square", null, "head-square"),
            new("head-rectangular", "head", "long", null, "head-rectangular"),
            new("head-triangular", "head", "triangular", null, "head-triangular"),
            new("head-diamond", "head", "diamond", null, "head-diamond"),
            new("head-invertedtriangular", "head", "heart", null, "head-invertedtriangular"),
            new("forehead-trans", "head", "forehead slope", "backward", "forward"),
            new("forehead-temple", "head", "temples", "decr", "incr"),
            new("eyebrows-trans", "brows", "brow height", "down", "up"),
            new("eyebrows-angle", "brows", "brow angle", "down", "up"),
            new("brow-ridge", "brows", "brow ridge", "backward", "forward"),
            new("eye-scale", "eyes", "eye size", "decr", "incr"),
            new("eye-trans", "eyes", "eye spacing", "in", "out"),
            new("eye-epicanthus", "eyes", "eyelid fold", "in", "out"),
            new("eye-bag", "eyes", "eye bags", "decr", "incr"),
            new("eye-height2", "eyes", "eye opening", "decr", "incr"),
            new("eye-corner1", "eyes", "eye tilt", "down", "up"),
            new("eye-eyefold", "eyes", "lid crease", "down", "up"),
            new("nose-scale-horiz", "nose", "nose width", "decr", "incr"),
            new("nose-scale-vert", "nose", "nose length", "decr", "incr"),
            new("nose-hump", "nose", "bridge hump", "decr", "incr"),
            new("nose-nostrils-width", "nose", "nostrils", "decr", "incr"),
            new("nose-point-width", "nose", "nose tip", "decr", "incr"),
            new("nose-volume", "nose", "nose size", "decr", "incr"),
            new("nose-flaring", "nose", "nostril flare", "decr", "incr"),
            new("nose-scale-depth", "nose", "projection", "decr", "incr"),
            new("nose-width1", "nose", "bridge width", "decr", "incr"),
            new("nose-point", "nose", "tip lift", "down", "up"),
            new("nose-curve", "nose", "profile", "concave", "convex"),
            new("cheek-bones", "cheeks", "cheekbones", "decr", "incr"),
            new("cheek-volume", "cheeks", "cheek fullness", "decr", "incr"),
            new("cheek-inner", "cheeks", "midface", "decr", "incr"),
            new("cheek-trans", "cheeks", "cheekbone height", "down", "up"),
            new("mouth-scale-horiz", "mouth", "mouth width", "decr", "incr"),
            new("mouth-upperlip-volume", "mouth", "upper lip", "decr", "incr"),
            new("mouth-lowerlip-volume", "mouth", "lower lip", "decr", "incr"),
            new("mouth-angles", "mouth", "mouth corners", "down", "up"),
            new("mouth-trans", "mouth", "mouth forward", "backward", "forward"),
            new("mouth-lowerlip-height", "mouth", "lower lip height", "decr", "incr"),
            new("mouth-cupidsbow", "mouth", "cupid's bow", "decr", "incr"),
            new("mouth-laugh-lines", "mouth", "smile lines", "in", "out"),
            new("chin-prominent", "chin", "chin forward", "decr", "incr"),
            new("chin-width", "chin", "chin width", "decr", "incr"),
            new("chin-height", "chin", "chin height", "decr", "incr"),
            new("chin-bones", "chin", "jaw", "decr", "incr"),
            new("chin-cleft", "chin", "chin cleft", "decr", "incr"),
            new("chin-prognathism", "chin", "jaw forward", "decr", "incr"),
            new("ear-scale", "ears", "ear size", "decr", "incr"),
            new("ear-flap", "ears", "ears out", "decr", "incr"),
            new("neck-scale-horiz", "neck", "neck width", "decr", "incr"),
            new("neck-double", "neck", "under the chin", "decr", "incr"),
            new("neck-scale-vert", "neck", "neck length", "decr", "incr"),
            new("neck-scale-depth", "neck", "neck depth", "decr", "incr"),
        };

        /// <summary>The body's sliders (P5.3i, P4.13): the weight and muscle macros a step either way over the whole body;
        /// a woman's bust and its firmness (the macros, to either end); the measures (seat, hips, waist, shoulders, chest,
        /// belly, arm and thigh girth, the stomach's tone, the taper, the pectorals, the legs' length; a woman's breasts set high
        /// or low, wide or close, pointed or round, fuller above or below), a step either way; age to 70, each ancestry in full and a child's
        /// body (single shapes, 0..1; the child's is the population's, not the sculptor's: <see cref="Bodies.Child"/>). Every garment and hair is refitted to them by the build (mh_build, the names must match); the
        /// male base has no bust shapes (a missing shape is skipped).</summary>
        public static readonly SculptSlider[] Body =
        {
            new("body-weight", "body", "build", "decr", "incr"),
            new("body-muscle", "body", "muscle", "decr", "incr"),
            new("body-bust", "body", "bust", "decr", "incr"),
            new("body-firm", "body", "firmness", "decr", "incr"),
            new("body-seat", "body", "seat", "decr", "incr"),
            new("body-hips", "body", "hips", "decr", "incr"),
            new("body-waist", "body", "waist", "decr", "incr"),
            new("body-shoulders", "body", "shoulders", "decr", "incr"),
            new("body-chest", "body", "chest", "decr", "incr"),
            new("body-belly", "body", "belly", "decr", "incr"),
            new("body-arms", "body", "arms", "decr", "incr"),
            new("body-thighs", "body", "thighs", "decr", "incr"),
            new("body-tone", "body", "tone", "decr", "incr"),
            new("body-vshape", "body", "taper", "decr", "incr"),
            new("body-pecs", "body", "pectorals", "decr", "incr"),
            new("body-legs", "body", "legs", "decr", "incr"),
            new("body-lift", "body", "set", "decr", "incr"),
            new("body-spacing", "body", "spacing", "decr", "incr"),
            new("body-point", "body", "point", "decr", "incr"),
            new("body-fullness", "body", "fullness", "decr", "incr"),
            new("body-age", "body", "years", null, "body-age-incr"),
            new("body-faceage", "body", "face's years", null, "face-years"),
            new("body-african", "body", "african", null, "body-african"),
            new("body-asian", "body", "asian", null, "body-asian"),
            new("body-caucasian", "body", "caucasian", null, "body-caucasian"),
            new("body-child", "body", "child", null, "body-child"),
        };

        /// <summary>The body sliders only a woman's base carries.</summary>
        public static bool WomanOnly(string id) => id == "body-bust" || id == "body-firm" || id == "body-lift" || id == "body-spacing" || id == "body-point" || id == "body-fullness";

        /// <summary>The face's sliders and the body's.</summary>
        public static IEnumerable<SculptSlider> All { get { foreach (var s in Sliders) yield return s; foreach (var s in Body) yield return s; } }

        private static readonly Dictionary<string, SculptSlider> ById = new();
        static Sculpt() { foreach (var s in All) ById[s.Id] = s; }

        public static SculptSlider Slider(string id) => ById.TryGetValue(id, out var s) ? s : null;

        /// <summary>Every blend shape the sculptor drives (both of each pair, the single shapes and <see cref="Aged"/>).</summary>
        public static IEnumerable<string> Shapes()
        {
            foreach (var s in All)
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
        /// <summary>The shapes real faces carry past MakeHuman's own end (R3: fitted to FairFace, a third of real faces wanted a
        /// thinner lower lip than the base's thinnest, a quarter of women smaller and less open eyes, a sixth a wider mouth):
        /// blend shapes are linear, so these reach a share further (a weight past 100).</summary>
        public static readonly Dictionary<string, float> Extended = new()
        {
            ["mouth-scale-horiz"] = 1.6f, ["mouth-lowerlip-height"] = 1.6f, ["eye-scale"] = 1.6f, ["eye-height2"] = 1.6f,
            // the brows' height and, on men, the chin's and the nose's length (R3: a fifth of real women's and an eighth of
            // real men's faces fitted with the brows at an end, a tenth of men's with the chin or the nose at one)
            ["eyebrows-trans"] = 1.6f, ["chin-height"] = 1.4f, ["nose-scale-vert"] = 1.4f,
        };

        /// <summary>How far a slider reaches either way (1, or further for <see cref="Extended"/>).</summary>
        public static float Reach(string id) => Extended.TryGetValue(id, out var r) ? r : 1f;

        public static List<(string Shape, float Weight)> Weights(IReadOnlyDictionary<string, float> values, float aged = 0f)
        {
            var l = new List<(string, float)>((Sliders.Length + Body.Length) * 2 + 1);
            foreach (var s in All)
            {
                var v = values != null && values.TryGetValue(s.Id, out var x) ? Math.Clamp(x, s.Min, s.Max) : 0f;
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
        /// The face's sliders that mark a sex (the owner, 2026-10-29: dimorphism as pronounced as in life; the jaw, brow,
        /// chin and neck of a woman are never a man's): each the range a woman's draw keeps to and the range a man's does.
        /// Unlisted sliders run the whole range for both.
        /// </summary>
        private static readonly Dictionary<string, ((float Lo, float Hi) F, (float Lo, float Hi) M)> BySex = new()
        {
            ["chin-bones"] = ((-1f, 0.15f), (-0.25f, 1f)),          // the jaw: narrow and soft on a woman, square on a man
            ["chin-width"] = ((-1f, 0.2f), (-0.3f, 1f)),
            ["chin-prominent"] = ((-0.8f, 0.35f), (-0.3f, 1f)),
            ["chin-height"] = ((-0.8f, 0.4f), (-0.4f, 0.9f)),
            ["neck-scale-horiz"] = ((-1f, 0.1f), (-0.3f, 1f)),
            ["head-scale-horiz"] = ((-0.9f, 0.45f), (-0.4f, 0.9f)),
            ["head-fat"] = ((-0.8f, 0.5f), (-0.6f, 0.8f)),
            ["eyebrows-trans"] = ((-0.2f, 1f), (-1f, 0.3f)),         // brows higher and finer on a woman, low and heavy on a man
            ["eyebrows-angle"] = ((-0.4f, 0.8f), (-0.8f, 0.5f)),
            ["nose-volume"] = ((-1f, 0.3f), (-0.5f, 1f)),
            ["nose-scale-horiz"] = ((-1f, 0.6f), (-0.5f, 1f)),       // room for a broad nose on a woman of the ancestries that have one
            ["nose-hump"] = ((-0.9f, 0.4f), (-0.5f, 1f)),
            ["cheek-bones"] = ((-0.3f, 1f), (-0.8f, 0.6f)),
            ["cheek-volume"] = ((-0.3f, 0.9f), (-0.9f, 0.5f)),
            ["mouth-upperlip-volume"] = ((-0.3f, 1f), (-1f, 0.75f)),  // a man's lips thinner than a woman's of his people, not thin
            ["mouth-lowerlip-volume"] = ((-0.3f, 1f), (-1f, 0.75f)),
            ["eye-scale"] = ((-0.3f, 1f), (-1f, 0.5f)),
            ["forehead-scale-vert"] = ((-0.6f, 0.8f), (-0.8f, 0.6f)),
            ["brow-ridge"] = ((-1f, 0.15f), (-0.3f, 1f)),            // no brow ridge on a woman
            ["chin-prognathism"] = ((-1f, 0.35f), (-0.5f, 1f)),
            ["neck-double"] = ((-0.5f, 0.6f), (-0.5f, 0.8f)),
        };

        /// <summary>The range a sex's faces keep to on a slider (the whole range when it marks no sex).</summary>
        public static (float Lo, float Hi) Range(string id, bool male)
        {
            // the real faces' range where they set the slider (R3), else the sex's rule
            if (RealFaces.Range(id, male) is { } real) return real;
            if (BySex.TryGetValue(id, out var r)) return male ? r.M : r.F;
            var s = Slider(id);
            return (s != null ? s.Min : -1f, s != null ? s.Max : 1f);
        }

        /// <summary>How far a sex's faces take the head's single shapes: a square, long or wide-jawed (triangular) head
        /// barely on a woman; a round one or a heart only softly on a man.</summary>
        public static float HeadCap(string id, bool? male) => male is bool m && RealFaces.Range(id, m) is { } real ? real.Hi : male switch
        {
            false => id == "head-square" || id == "head-rectangular" ? 0.3f : id == "head-triangular" ? 0.25f : 0.85f,
            true => id == "head-round" || id == "head-oval" || id == "head-invertedtriangular" ? 0.55f : 0.85f,
            _ => 0.85f,
        };
    }
}
