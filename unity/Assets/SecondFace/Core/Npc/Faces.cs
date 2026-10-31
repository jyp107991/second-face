using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// Faces made from archetypes (owner, 2026-10-30, pass 9: "defined archetypes with coherent and realistic bundles of
    /// features that go together probabilistically"; not a reroll of independent sliders). A face is the sum of
    /// <list type="number">
    /// <item>its ancestry's features (<see cref="Ancestries"/>: nose breadth, flare, bridge and projection, lip fullness and
    /// projection, lids, brow ridge, cheekbones, as facial anthropometry measures them across populations; Farkas et al.
    /// 2005), blended for a person of two ancestries;</item>
    /// <item>their sex (<see cref="Woman"/>, <see cref="Man"/>): jaw, chin, brow ridge, brows, nose, lips, eyes, neck, a
    /// little more marked on the striking;</item>
    /// <item>a face structure (<see cref="Types"/>: oval, long, broad, heart, angular) at the shares found in their
    /// ancestry and sex;</item>
    /// <item>three latent traits shared by features that go together in life: robustness (jaw, chin, brow ridge, nose and
    /// neck together, higher with a man's muscle), width (head, cheekbones, jaw, nose) and fullness (the body's weight in
    /// the cheeks and under the chin; a lean, hungry body's hollow cheeks and temples; a muscled man is never gaunt);</item>
    /// <item>the years as the face shows them (the lids, bags, the nose's tip, thinner lips, lines from nose to mouth,
    /// the cheeks lower), aged sooner by a hard life (<see cref="Who.Hardness"/>);</item>
    /// <item>a person's own small difference (a tight spread, tighter on the striking: an average face is a handsome one).</item>
    /// </list>
    /// Values are the sculptor's (<see cref="Sculpt"/>), clamped to the sex's ranges. Everyone is seeded, so the same
    /// person has the same face every time.
    /// </summary>
    public static class Faces
    {
        public static readonly string[] Types = { "oval", "long", "broad", "heart", "angular" };

        /// <summary>The smallest change between a face and the next drawn for the same person (the creation's "another face").</summary>
        public const float RedrawDistance = 1.0f;

        /// <summary>The share of a real face's own difference from its people that its features take (overhaul O2: the real
        /// variety within a people kept, the photograph's pose, smile and our renders' biases mostly not).</summary>
        public const double RealShare = 0.4;

        /// <summary>Who the face belongs to.</summary>
        public sealed class Who
        {
            public bool Male;
            public double Age = 25;
            /// <summary>An ancestry cluster of <see cref="Bodies.Clusters"/>.</summary>
            public string Cluster = "mediterranean";
            /// <summary>A second ancestry (a parent from elsewhere), or null; <see cref="Share"/> of it (0..0.5).</summary>
            public string Second;
            public double Share;
            /// <summary>The body's weight as a slider (-1 lean .. 1 heavy; <see cref="PlayerLook.Build"/>).</summary>
            public double Build;
            /// <summary>The body's muscle as a slider (-1 .. 1; <see cref="PlayerLook.Muscle"/>).</summary>
            public double Muscle;
            /// <summary>How hard the life has been on the face (sun, wind, want, labour): -0.3 sheltered and well fed .. 1.</summary>
            public double Hardness;
            /// <summary>The real faces others of the same place were drawn from, left out of this one's (<see cref="Cast"/>).</summary>
            public ICollection<int> Avoid;
            /// <summary>0..1, how striking (the skew the owner asks for: towards the attractive); NaN draws it.</summary>
            public double Attractive = double.NaN;
        }

        /// <summary>A drawn face: the sculptor's values, its structure and what it was made from.</summary>
        public sealed class Face
        {
            public Dictionary<string, float> Values;
            public string Type;
            public string Cluster;
            public double Attractive;
            /// <summary>The real faces it was drawn from (<see cref="RealFaces.Source"/>), or null.</summary>
            public string Source;
            public string Archetype => $"{Cluster}/{Type}";
        }

        // ---------------------------------------------------------------------------------------------------------
        // The ancestries' features, on top of MakeHuman's own ancestry macros (the bodies' body-african/-asian/
        // -caucasian shapes), which carry the same directions too weakly (measured: tools/unity/people/face_probe.py).
        // Sources: Farkas et al. 2005 (nasal width, mouth width, lip heights, intercanthal width across 25 groups);
        // Porter & Olson 2001 (African American faces); Le et al. 2002 (Asian canthal and lid anatomy). Positive is the
        // slider's high end (incr, up, out, forward, convex).
        // ---------------------------------------------------------------------------------------------------------
        private static Dictionary<string, float> D(params (string Id, float V)[] kv) => kv.ToDictionary(x => x.Id, x => x.V);

        public static readonly Dictionary<string, Dictionary<string, float>> Ancestries = new()
        {
            // narrow, high-bridged, projecting noses; thin lips set back; deep-set eyes under a brow ridge; a defined chin
            ["north_european"] = D(("nose-scale-depth", 0.35f), ("nose-width1", -0.2f), ("nose-scale-horiz", -0.3f), ("nose-flaring", -0.3f),
                ("nose-nostrils-width", -0.2f), ("nose-scale-vert", 0.12f), ("mouth-upperlip-volume", -0.3f), ("mouth-lowerlip-volume", -0.15f),
                ("mouth-trans", -0.25f), ("mouth-scale-horiz", -0.1f), ("mouth-lowerlip-height", -0.1f), ("brow-ridge", 0.25f), ("eye-eyefold", 0.15f),
                ("eye-epicanthus", -0.1f), ("cheek-inner", -0.1f), ("chin-prominent", 0.15f)),
            // high bridges, often a hump or a convex line, longer noses; fuller lips than the north; heavy dark brows set low
            ["mediterranean"] = D(("nose-scale-depth", 0.3f), ("nose-hump", 0.3f), ("nose-curve", 0.25f), ("nose-scale-vert", 0.2f), ("nose-volume", 0.1f),
                ("nose-scale-horiz", -0.11f), ("mouth-upperlip-volume", -0.01f), ("mouth-lowerlip-volume", 0.04f), ("brow-ridge", 0.2f),
                ("eyebrows-trans", 0.23f), ("eye-scale", -0.03f), ("eye-eyefold", 0.05f), ("chin-prominent", 0.1f), ("eye-height2", -0.2f), ("nose-nostrils-width", -0.2f), ("nose-flaring", -0.13f), ("mouth-scale-horiz", -0.16f), ("eye-trans", 0.05f), ("mouth-cupidsbow", -0.09f), ("mouth-lowerlip-height", -0.1f)),
            // broad noses with flared nostrils, a low bridge and little projection; full, everted lips carried forward; wide-set
            // eyes; a rounded forehead; little brow ridge
            ["west_african"] = D(("nose-scale-horiz", -0.01f), ("nose-flaring", -0.12f), ("nose-nostrils-width", -0.5f), ("nose-scale-depth", -0.4f),
                ("nose-width1", 0.25f), ("nose-curve", -0.35f), ("nose-hump", -0.3f), ("nose-scale-vert", -0.25f), ("nose-point-width", 0.3f),
                ("nose-point", 0.15f), ("mouth-upperlip-volume", -0.04f), ("mouth-lowerlip-volume", -0.05f), ("mouth-lowerlip-height", -0.3f),
                ("mouth-trans", 0.45f), ("mouth-scale-horiz", -0.22f), ("mouth-cupidsbow", -0.27f), ("brow-ridge", -0.1f), ("eye-trans", 0.3f),
                ("eye-scale", -0.1f), ("eye-height2", -0.17f), ("forehead-trans", 0.15f), ("cheek-bones", 0.1f), ("chin-prominent", -0.1f),
                ("chin-prognathism", 0.15f), ("eyebrows-trans", 0.83f)),
            // long, narrow faces; noses narrower than the west's with more bridge; full lips; large eyes; high cheekbones
            ["east_african"] = D(("nose-scale-horiz", 0.2f), ("nose-flaring", 0.2f), ("nose-scale-depth", -0.05f), ("nose-scale-vert", 0.1f),
                ("nose-curve", -0.1f), ("mouth-upperlip-volume", 0.35f), ("mouth-lowerlip-volume", 0.35f), ("mouth-lowerlip-height", 0.25f),
                ("mouth-trans", 0.25f), ("eye-scale", 0.2f), ("eye-height2", 0.15f), ("cheek-bones", 0.25f), ("cheek-volume", -0.15f),
                ("cheek-trans", 0.15f), ("forehead-scale-vert", 0.2f), ("chin-height", 0.1f), ("head-scale-horiz", -0.2f), ("neck-scale-horiz", -0.1f)),
            // a low, broad nasal root and little projection; the epicanthic fold, a low or absent lid crease, a narrower
            // opening tilted up at the outer corner; wide cheekbones; a flat brow
            ["east_asian"] = D(("nose-scale-depth", -0.55f), ("nose-width1", 0.35f), ("nose-hump", -0.35f), ("nose-curve", -0.25f), ("nose-scale-horiz", 0.05f),
                ("nose-flaring", 0.1f), ("nose-scale-vert", -0.1f), ("nose-point", 0.1f), ("eye-epicanthus", 0.54f), ("eye-eyefold", -0.45f),
                ("eye-height2", -0.84f), ("eye-corner1", 0.3f), ("eye-scale", 0.39f), ("brow-ridge", -0.4f), ("eyebrows-trans", 1.42f),
                ("cheek-bones", 0.3f), ("head-scale-horiz", 0.2f), ("forehead-trans", -0.1f), ("mouth-upperlip-volume", 0.24f), ("mouth-trans", 0.1f),
                ("mouth-scale-horiz", -0.19f), ("chin-prominent", -0.15f), ("chin-width", -0.05f), ("nose-nostrils-width", -0.49f), ("eye-trans", 0.08f), ("mouth-lowerlip-volume", 0.03f), ("mouth-lowerlip-height", -0.44f)),
            // the low bridge with a broader, flared nose; fuller lips carried forward; less of the fold; rounder faces
            ["southeast_asian"] = D(("nose-scale-depth", -0.45f), ("nose-width1", 0.3f), ("nose-scale-horiz", 0.18f), ("nose-flaring", 0.16f),
                ("nose-nostrils-width", -0.19f), ("nose-curve", -0.2f), ("nose-hump", -0.3f), ("nose-scale-vert", -0.15f), ("eye-epicanthus", 0.16f),
                ("eye-eyefold", -0.2f), ("eye-corner1", 0.15f), ("eye-scale", 0.51f), ("mouth-upperlip-volume", 0.17f), ("mouth-lowerlip-volume", 0.19f),
                ("mouth-trans", 0.3f), ("mouth-lowerlip-height", -0.24f), ("brow-ridge", -0.3f), ("cheek-bones", 0.2f), ("head-scale-horiz", 0.1f),
                ("forehead-trans", 0.1f), ("chin-prominent", -0.1f), ("eye-height2", -0.32f), ("eyebrows-trans", 1.05f), ("mouth-scale-horiz", -0.13f), ("eye-trans", 0.26f), ("mouth-cupidsbow", -0.09f)),
            // large eyes with a clear crease; a nose with some length and bridge; full lips; dense brows
            ["south_asian"] = D(("nose-scale-depth", 0.15f), ("nose-scale-vert", 0.15f), ("nose-curve", 0.1f), ("nose-hump", 0.1f), ("nose-scale-horiz", 0.0f),
                ("nose-flaring", 0.0f), ("nose-point", -0.05f), ("nose-point-width", 0.1f), ("eye-scale", 0.35f), ("eye-height2", -0.1f),
                ("eye-eyefold", 0.1f), ("eyebrows-trans", 0.27f), ("mouth-upperlip-volume", 0.25f), ("mouth-lowerlip-volume", 0.27f),
                ("mouth-lowerlip-height", -0.02f), ("mouth-trans", 0.1f), ("cheek-volume", 0.05f), ("chin-prominent", -0.05f), ("nose-nostrils-width", -0.22f), ("mouth-scale-horiz", -0.07f), ("eye-trans", 0.2f)),
            // between the Iberian and the indigenous: broad cheekbones, a medium nose, fuller lips
            ["latin_american"] = D(("nose-scale-depth", 0.05f), ("nose-scale-horiz", -0.03f), ("nose-flaring", -0.1f), ("nose-width1", 0.05f), ("nose-hump", 0.05f),
                ("mouth-upperlip-volume", -0.01f), ("mouth-lowerlip-volume", 0.06f), ("mouth-trans", 0.1f), ("cheek-bones", 0.2f), ("head-scale-horiz", 0.1f),
                ("eye-epicanthus", -0.01f), ("eye-eyefold", -0.05f), ("eye-scale", 0.15f), ("eye-height2", -0.22f), ("eyebrows-trans", 0.62f), ("nose-nostrils-width", -0.33f), ("mouth-scale-horiz", -0.24f), ("eye-trans", 0.05f), ("mouth-cupidsbow", -0.11f), ("mouth-lowerlip-height", -0.17f)),
            // broad, prominent cheekbones on a wide face; a high-rooted, often convex nose; a lower lid crease and some of the
            // fold; a broad jaw
            ["indigenous_american"] = D(("cheek-bones", 0.5f), ("cheek-trans", 0.2f), ("head-scale-horiz", 0.3f), ("chin-width", 0.2f), ("chin-bones", 0.1f),
                ("nose-scale-depth", 0.15f), ("nose-curve", 0.25f), ("nose-hump", 0.2f), ("nose-width1", 0.15f), ("nose-scale-horiz", -0.03f),
                ("nose-scale-vert", 0.1f), ("eye-epicanthus", 0.19f), ("eye-eyefold", -0.3f), ("eye-height2", -0.37f), ("eye-corner1", 0.1f),
                ("mouth-upperlip-volume", -0.11f), ("mouth-lowerlip-volume", -0.04f), ("mouth-scale-horiz", -0.14f), ("forehead-trans", -0.1f), ("eye-scale", 0.15f), ("eyebrows-trans", 0.62f), ("nose-nostrils-width", -0.33f), ("nose-flaring", -0.2f), ("eye-trans", 0.05f), ("mouth-cupidsbow", -0.11f), ("mouth-lowerlip-height", -0.17f)),
        };

        /// <summary>The bases' own distance from real people, taken out of every face (overhaul O3, measured on the bases against
        /// ANSUR II and FairFace's faces at rest, two sources that agree): the eyes 3 to 4 mm too close together (the pupils'
        /// distance 0.7 to 1.9 sd short in 3D, the inner corners' 1 sd in the photographs), the skull 1.5 to 3 sd too narrow
        /// over a face of the right width, the women's neck 3 sd too thin, and the woman's face short for its width against
        /// the man's (in 3D the face's height 1.25 sd short where a man's is 0.4 long; in the photographs men's faces 0.16 sd
        /// longer for their width, the bases' 0.85), the whole face and not the chin (lengthened at the chin, the lower face
        /// grew longer than men's, the reverse of real faces): the head drawn out, the vault kept; and the woman's jaw narrow
        /// for her cheeks against the man's (the photographs: 0.41 sd narrower, ours 0.93). The natural ranges
        /// (Sculpt.Natural) and the solver's (Proportions.Range) are round these.</summary>
        public static readonly Dictionary<string, float> WomanBase = D(("eye-trans", 0.3f), ("head-cranium", 0.6f), ("neck-scale-horiz", 0.4f), ("neck-scale-depth", 0.4f),
            ("head-scale-vert", 0.2f), ("forehead-scale-vert", -0.25f), ("head-triangular", 0.15f));
        public static readonly Dictionary<string, float> ManBase = D(("eye-trans", 0.3f), ("head-cranium", 0.6f));

        /// <summary>What a people's women differ in from its men beyond the sexes' common difference (FairFace's faces at rest:
        /// east and south-east Asian women's eyes 0.8 and 0.7 sd wider set than north European women's, the men's 0.4 and 0.5,
        /// the women's noses narrower for it; with one archetype for both sexes the women's spacing came out as the men's,
        /// overhaul O2).</summary>
        public static readonly Dictionary<string, Dictionary<string, float>> WomenOf = new()
        {
            ["east_asian"] = D(("eye-trans", 0.25f)),
            ["southeast_asian"] = D(("eye-trans", 0.2f)),
        };

        /// <summary>A slider's correction on a sex's base (<see cref="WomanBase"/>, <see cref="ManBase"/>), 0 where none.</summary>
        public static float BaseOffset(string id, bool male) => (male ? ManBase : WomanBase).TryGetValue(id, out var v) ? v : 0f;

        /// <summary>A woman's face against the base's: a finer jaw and chin, no brow ridge, higher and more arched brows, larger
        /// and more open eyes, a smaller nose with the tip a little up, fuller lips with a defined bow, fuller and higher
        /// cheeks (her neck's slenderness is the base's own: O3). Her nose as long for her face as a man's (FairFace: a woman's
        /// nose 0.25 sd longer for her face than a man's, her lower face shorter; with a woman's nose shortened by hand, ours
        /// were the reverse, O2).</summary>
        public static readonly Dictionary<string, float> Woman = D(("chin-bones", -0.15f), ("chin-width", -0.15f), ("chin-prominent", -0.1f),
            ("chin-height", -0.15f), ("chin-prognathism", -0.1f), ("brow-ridge", -0.35f), ("eyebrows-trans", 0.35f), ("eyebrows-angle", 0.2f),
            ("eye-scale", -0.21f), ("eye-height2", -0.01f), ("nose-volume", -0.3f), ("nose-scale-horiz", 0.14f),
            ("nose-hump", -0.2f), ("nose-point", 0.1f), ("nose-flaring", -0.22f), ("mouth-upperlip-volume", -0.2f), ("mouth-lowerlip-volume", -0.08f),
            ("mouth-cupidsbow", -0.1f), ("cheek-volume", 0.15f), ("cheek-bones", 0.15f), ("cheek-trans", 0.1f),
            ("head-scale-horiz", -0.1f), ("nose-nostrils-width", 0.2f), ("mouth-scale-horiz", 0.14f), ("eye-trans", 0.08f), ("eye-epicanthus", 0.05f), ("mouth-lowerlip-height", -0.12f));

        /// <summary>A man's: the jaw and chin broad and forward, the lower face longer, a brow ridge with the brows low and
        /// straight on it, a larger nose, thinner lips, leaner cheeks, a thick neck.</summary>
        public static readonly Dictionary<string, float> Man = D(("chin-bones", 0.35f), ("chin-width", 0.3f), ("chin-prominent", 0.2f),
            ("chin-height", 0.15f), ("brow-ridge", 0.35f), ("eyebrows-trans", -0.3f), ("eyebrows-angle", -0.15f), ("eye-scale", 0.23f),
            ("nose-volume", 0.2f), ("nose-scale-horiz", -0.07f), ("mouth-upperlip-volume", 0.0f),
            ("mouth-lowerlip-volume", 0.09f), ("cheek-volume", -0.15f), ("neck-scale-horiz", 0.3f), ("head-scale-horiz", 0.05f), ("eye-height2", 0.15f), ("nose-nostrils-width", -0.15f), ("nose-flaring", 0.12f), ("mouth-scale-horiz", -0.14f));

        /// <summary>A face structure's features (the head's single shapes and what goes with them), by sex: a man's broad face
        /// is square, a woman's round; a woman's long face is an oval drawn out, never a man's rectangle.</summary>
        public static Dictionary<string, float> Structure(string type, bool male) => type switch
        {
            "long" => male
                ? D(("head-rectangular", 0.5f), ("head-scale-horiz", -0.25f), ("forehead-scale-vert", 0.15f), ("chin-height", 0.2f), ("nose-scale-vert", 0.15f), ("cheek-volume", -0.1f))
                : D(("head-oval", 0.35f), ("head-rectangular", 0.2f), ("head-scale-horiz", -0.25f), ("forehead-scale-vert", 0.15f), ("chin-height", 0.1f), ("nose-scale-vert", 0.1f), ("cheek-volume", -0.05f)),
            "broad" => male
                ? D(("head-square", 0.5f), ("head-scale-horiz", 0.3f), ("cheek-bones", 0.15f), ("chin-width", 0.2f), ("nose-scale-horiz", 0.1f), ("chin-height", -0.1f), ("neck-scale-horiz", 0.1f))
                : D(("head-round", 0.45f), ("head-scale-horiz", 0.25f), ("cheek-bones", 0.1f), ("cheek-volume", 0.15f), ("nose-scale-horiz", 0.05f), ("chin-height", -0.1f)),
            "heart" => male
                ? D(("head-invertedtriangular", 0.35f), ("forehead-scale-vert", 0.1f), ("cheek-bones", 0.15f), ("chin-width", -0.15f))
                : D(("head-invertedtriangular", 0.5f), ("forehead-scale-vert", 0.1f), ("cheek-bones", 0.2f), ("chin-width", -0.2f), ("chin-height", -0.05f)),
            "angular" => male
                ? D(("head-diamond", 0.45f), ("cheek-bones", 0.35f), ("cheek-volume", -0.2f), ("chin-prominent", 0.15f), ("chin-bones", 0.1f), ("forehead-temple", -0.1f))
                : D(("head-diamond", 0.4f), ("cheek-bones", 0.35f), ("cheek-volume", -0.1f), ("cheek-trans", 0.15f), ("chin-prominent", 0.05f)),
            _ => male   // oval: the balanced face
                ? D(("head-oval", 0.5f))
                : D(("head-oval", 0.55f), ("cheek-bones", 0.05f)),
        };

        /// <summary>The structures' shares by ancestry (oval, long, broad, heart, angular).</summary>
        private static readonly Dictionary<string, double[]> TypeShares = new()
        {
            ["north_european"] = new[] { 0.3, 0.3, 0.15, 0.1, 0.15 },
            ["mediterranean"] = new[] { 0.35, 0.2, 0.15, 0.15, 0.15 },
            ["west_african"] = new[] { 0.3, 0.15, 0.3, 0.1, 0.15 },
            ["east_african"] = new[] { 0.25, 0.4, 0.05, 0.1, 0.2 },
            ["east_asian"] = new[] { 0.3, 0.15, 0.35, 0.1, 0.1 },
            ["southeast_asian"] = new[] { 0.3, 0.1, 0.35, 0.15, 0.1 },
            ["south_asian"] = new[] { 0.4, 0.2, 0.15, 0.15, 0.1 },
            ["latin_american"] = new[] { 0.35, 0.15, 0.25, 0.1, 0.15 },
            ["indigenous_american"] = new[] { 0.2, 0.15, 0.35, 0.05, 0.25 },
        };

        /// <summary>The structures' shares for a sex: the heart-shaped face mostly a woman's, the broad and angular more a man's.</summary>
        private static readonly double[] WomanTypes = { 1.0, 0.9, 0.8, 1.2, 0.8 };
        private static readonly double[] ManTypes = { 1.0, 1.0, 1.1, 0.4, 1.1 };

        public static Dictionary<string, float> Of(string cluster) =>
            cluster != null && Ancestries.TryGetValue(cluster, out var d) ? d : Ancestries["mediterranean"];

        /// <summary>The structures' shares for a person (their ancestries blended, their sex).</summary>
        public static double[] Shares(Who who)
        {
            var a = TypeShares.TryGetValue(who.Cluster ?? "", out var x) ? x : TypeShares["mediterranean"];
            var b = who.Second != null && TypeShares.TryGetValue(who.Second, out var y) ? y : a;
            var t = who.Second != null ? Math.Clamp(who.Share, 0, 1) : 0;
            var sex = who.Male ? ManTypes : WomanTypes;
            var w = new double[Types.Length];
            for (var i = 0; i < w.Length; i++) w[i] = (a[i] * (1 - t) + b[i] * t) * sex[i];
            var sum = w.Sum();
            return w.Select(v => v / sum).ToArray();
        }

        /// <summary>A face for someone (see the class).</summary>
        public static Face Draw(Rng rng, Who who, string type = null)
        {
            var v = new Dictionary<string, double>();
            void Add(IReadOnlyDictionary<string, float> d, double k)
            {
                foreach (var kv in d) v[kv.Key] = Get(kv.Key) + kv.Value * k;
            }
            double Get(string id) => v.TryGetValue(id, out var x) ? x : 0;
            void Put(string id, double dv) => v[id] = Get(id) + dv;

            var att = double.IsNaN(who.Attractive) ? Math.Clamp(0.62 + Bodies.Normal(rng) * 0.2, 0, 1) : Math.Clamp(who.Attractive, 0, 1);
            var shares = Shares(who);
            var picked = type != null && Array.IndexOf(Types, type) >= 0 ? type : Types[Pick(rng, shares)];

            // ancestry, blended for two
            var t = who.Second != null ? Math.Clamp(who.Share, 0, 1) : 0;
            Add(Of(who.Cluster), 1 - t);
            if (t > 0) Add(Of(who.Second), t);
            // sex, a little more marked on the striking
            Add(who.Male ? Man : Woman, 0.85 + 0.3 * att);
            // the bases' own distance from real people, taken out
            Add(who.Male ? ManBase : WomanBase, 1);
            // and what a people's women differ in from its men beyond the sexes' common difference
            if (!who.Male)
            {
                if (WomenOf.TryGetValue(who.Cluster ?? "", out var wa)) Add(wa, 1 - t);
                if (t > 0 && WomenOf.TryGetValue(who.Second ?? "", out var wb)) Add(wb, t);
            }
            // the structure
            Add(Structure(picked, who.Male), 1);

            // robustness: jaw, chin, brow ridge, nose and neck go together (and with a man's muscle)
            var robust = Bodies.Normal(rng) + (who.Male ? 0.2 + Math.Max(0, who.Muscle) * 0.9 : -0.1 + Math.Max(0, who.Muscle) * 0.3);
            var rk = who.Male ? 1.0 : 0.6;
            Put("chin-bones", 0.2 * robust * rk); Put("chin-width", 0.12 * robust * rk); Put("chin-prominent", 0.1 * robust * rk);
            Put("brow-ridge", 0.18 * robust * rk); Put("nose-volume", 0.1 * robust * rk); Put("neck-scale-horiz", 0.12 * robust * rk);
            // width: the head, cheekbones, jaw and nose together
            var wide = Bodies.Normal(rng);
            Put("head-scale-horiz", 0.15 * wide); Put("cheek-bones", 0.1 * wide); Put("chin-width", 0.08 * wide);
            Put("nose-scale-horiz", 0.06 * wide); Put("eye-trans", 0.06 * wide);
            // fullness: the body's weight in the face; a lean, hungry body's hollows; a muscled man is never gaunt
            var full = Math.Clamp(who.Build * 0.8 + Bodies.Normal(rng) * 0.12, -1, 1.2);
            if (who.Male && who.Muscle > 0) full = Math.Max(full, -1 + who.Muscle * 1.8);   // the more muscle, the less gaunt he can be
            Build(Put, who, full);

            // the years as the face shows them, sooner on a hard life; the young softer
            var apparent = Apparent(who.Age, who.Hardness);
            var old = Math.Clamp((apparent - 25) / 45, 0, 1);
            var young = Math.Clamp((22 - who.Age) / 8, 0, 1);
            Years(Put, old, young, full);

            // what the striking share: for a woman large eyes, full lips, high cheekbones, a fine nose; for a man a strong jaw
            // and cheekbones (the skew the owner asks for, never past the sex's own range)
            var lift = att - 0.5;
            if (who.Male) { Put("chin-bones", 0.15 * lift); Put("cheek-bones", 0.15 * lift); Put("brow-ridge", 0.06 * lift); }
            else { Put("eye-scale", 0.15 * lift); Put("mouth-upperlip-volume", 0.12 * lift); Put("mouth-lowerlip-volume", 0.12 * lift); Put("cheek-bones", 0.15 * lift); Put("nose-volume", -0.12 * lift); }

            // their own small difference, tighter on the striking
            var sigma = 0.16 * (1.25 - 0.5 * att);
            foreach (var s in Sculpt.Sliders)
            {
                if (!s.Paired) continue;
                // (the eyes' spacing as widely as real people's: at 1, an east Asian woman's pupils' distance spread half a real
                // group's, ANSUR II's 2.9 mm, O3)
                var k = s.Id switch { "head-scale-horiz" => 0.6, "eyebrows-angle" => 0.8, "mouth-angles" => 0.6, "ear-flap" => 1.3, "chin-cleft" => 1.2, "ear-scale" => 1.1, "eye-trans" => 1.8, _ => 1.0 };
                Put(s.Id, Bodies.Normal(rng) * sigma * k);
            }

            // R3 (owner, pass 10: no imaginary faces): an adult's own difference from their people taken from real faces of
            // their people, sex and years (RealFaces), a share of it on the archetype's face above (overhaul O2)
            string source = null;
            if (who.Age >= 18)
            {
                // (the body's fullness in sds of real faces': the build, and a muscled man's mass)
                // (the striking nearer their people's middle and the plain further from it: an average face is an attractive
                // one, Langlois and Roggman 1990; the scale's mean over the drawn attractiveness is one, so the people's spread
                // is kept on the whole)
                var spread = 1.31 - 0.5 * att;
                var real = RealFaces.Pick(rng, who.Male, who.Cluster, who.Age, 1.5 * full + (who.Male ? 0.6 * Math.Max(0, who.Muscle) : 0), spread, who.Avoid);
                if (real != null)
                {
                    // blended with the real spread kept (RealFaces.Blend), scaled from the pool's middle as above
                    var middle = RealFaces.Mean(RealFaces.Pool(who.Male, who.Cluster, who.Age)).V;
                    var blend = RealFaces.Values(real, middle, spread);
                    for (var k = 0; k < FacesData.Sliders.Length; k++)
                    {
                        var id = FacesData.Sliders[k];
                        if (Array.IndexOf(FacesData.Set, id) < 0) continue;
                        // the face stays the archetype's, with a share of the real face's own difference from its people
                        // (overhaul O2: taken whole, as fitted to a photograph's landmarks, the features carried the
                        // photograph's pose, smile and our renders' biases into eleven sliders a face, the outline widened
                        // and rounded it, and the faces read as non-human)
                        v[id] = Get(id) + RealShare * (blend[k] - middle[k]);
                    }
                    source = RealFaces.Source(real, spread);
                }
            }

            // clamped to the sex's ranges and, for the striking, short of the extremes
            var limit = 1.0 - 0.2 * att;
            var values = new Dictionary<string, float>();
            foreach (var s in Sculpt.Sliders)
            {
                var x = Get(s.Id);
                if (s.Paired)
                {
                    var (lo, hi) = Sculpt.Range(s.Id, who.Male);
                    x = Math.Clamp(x, Math.Max(lo, -limit * Sculpt.Reach(s.Id)), Math.Min(hi, limit * Sculpt.Reach(s.Id)));
                    // and inside the range it stays natural in (O1), round the base as corrected (O3)
                    var (nlo, nhi) = Sculpt.Natural(s.Id);
                    var off = BaseOffset(s.Id, who.Male);
                    x = Math.Clamp(x, nlo + off, nhi + off);
                }
                else x = Math.Clamp(x, 0, Math.Min(Sculpt.HeadShapeCap, Sculpt.HeadCap(s.Id, who.Male)));
                values[s.Id] = (float)Math.Round(x, 3);
            }
            return new Face { Values = values, Type = picked, Cluster = who.Cluster, Attractive = att, Source = source };
        }

        /// <summary>The body's weight and muscle in the face: fullness or a lean, hungry body's hollows; a muscled man's neck
        /// and jaw, never gaunt.</summary>
        private static void Build(Action<string, double> Put, Who who, double full)
        {
            Put("head-fat", 0.45 * full); Put("cheek-volume", 0.35 * full); Put("chin-width", 0.06 * full);
            Put("neck-double", Math.Max(0, full - 0.3) * 0.7);
            if (full < 0)
            {
                Put("cheek-volume", 0.35 * full); Put("forehead-temple", 0.45 * full); Put("cheek-inner", 0.25 * full); Put("eye-bag", -0.15 * full);
            }
            else Put("cheek-bones", -0.12 * full);   // a full face hides its cheekbones
            if (who.Male && who.Muscle > 0)
            {
                // a muscled man's face: the neck and the jaw's muscle, and cheeks that are never hollow
                Put("neck-scale-horiz", 0.3 * who.Muscle); Put("chin-width", 0.12 * who.Muscle); Put("cheek-volume", 0.25 * who.Muscle);
                Put("forehead-temple", 0.15 * who.Muscle);
            }
        }

        /// <summary>The years as the face shows them (<paramref name="old"/> 0 at 25 .. 1 at 70 apparent; <paramref name="young"/>
        /// under 22), less on a full face's cheeks.</summary>
        private static void Years(Action<string, double> Put, double old, double young, double full)
        {
            Put("eye-bag", 0.6 * old); Put("nose-point", -0.5 * old); Put("nose-scale-vert", 0.2 * old);
            Put("mouth-upperlip-volume", -0.4 * old); Put("mouth-lowerlip-volume", -0.35 * old); Put("mouth-laugh-lines", 0.7 * old);
            Put("eye-height2", -0.3 * old); Put("cheek-trans", -0.35 * old); Put("neck-double", 0.25 * old);
            Put("ear-scale", 0.25 * old); Put("head-age", 0.6 * old - 0.4 * young); Put("forehead-temple", -0.25 * old);
            Put("mouth-angles", -0.25 * old); Put("eye-eyefold", -0.25 * old);
            Put("cheek-volume", -0.25 * old * (full > 0.3 ? 0.3 : 1) + 0.2 * young); Put("eye-scale", 0.15 * young - 0.15 * old);
        }

        /// <summary>Another face for the same person (the creation's "another face"): another structure when their ancestry
        /// has more than one, at least <see cref="RedrawDistance"/> from the last.</summary>
        public static Face Redraw(Rng rng, Who who, IReadOnlyDictionary<string, float> previous, string previousType = null)
        {
            Face f = null;
            for (var attempt = 0; attempt < 24; attempt++)
            {
                f = Draw(rng, who);
                if (previousType != null && f.Type == previousType && attempt < 12) continue;
                if (previous == null || Sculpt.Distance(f.Values, previous) >= RedrawDistance) break;
            }
            return f;
        }

        /// <summary>The age a face shows: the years, plus a share of the grown years for a hard life (sun, wind, want and
        /// labour; up to a decade by fifty), less for the sheltered.</summary>
        public static double Apparent(double age, double hardness) => age + Math.Max(0, age - 18) * 0.3 * Math.Clamp(hardness, -0.3, 1);

        private static int Pick(Rng rng, double[] shares)
        {
            var x = rng.Next();
            for (var i = 0; i < shares.Length; i++) { x -= shares[i]; if (x <= 0) return i; }
            return shares.Length - 1;
        }
    }
}
