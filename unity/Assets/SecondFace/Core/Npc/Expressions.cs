using System.Collections.Generic;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// Faces a person can make (P5.3l: the photo mode's expressions; later the conversations'), as weights on MakeHuman's
    /// expression units the people are built with (blend shapes <c>expr_&lt;unit&gt;</c>, mh_build). Plain and lived-in:
    /// a held face, a half smile, a grin, a hard look, wary, worn out, a sneer, a squint against the sun.
    /// </summary>
    public static class Expressions
    {
        public const string Prefix = "expr_";

        public static readonly string[] Names = { "still", "half_smile", "grin", "hard", "wary", "worn", "sneer", "squint" };

        private static readonly Dictionary<string, Dictionary<string, float>> Faces = new()
        {
            ["still"] = new(),
            ["half_smile"] = new() { ["mouth-corner-puller"] = 0.45f, ["eye-left-slit"] = 0.12f, ["eye-right-slit"] = 0.12f },
            ["grin"] = new() { ["mouth-corner-puller"] = 0.9f, ["mouth-parling"] = 0.35f, ["eye-left-slit"] = 0.3f, ["eye-right-slit"] = 0.3f },
            ["hard"] = new() { ["eyebrows-left-down"] = 0.7f, ["eyebrows-right-down"] = 0.7f, ["mouth-compression"] = 0.45f, ["eye-left-slit"] = 0.2f, ["eye-right-slit"] = 0.2f },
            ["wary"] = new() { ["eyebrows-left-inner-up"] = 0.45f, ["eyebrows-right-inner-up"] = 0.45f, ["eye-left-opened-up"] = 0.3f, ["eye-right-opened-up"] = 0.3f, ["mouth-compression"] = 0.2f },
            ["worn"] = new() { ["eye-left-closure"] = 0.35f, ["eye-right-closure"] = 0.35f, ["mouth-depression"] = 0.35f, ["eyebrows-left-inner-up"] = 0.2f, ["eyebrows-right-inner-up"] = 0.2f },
            ["sneer"] = new() { ["nose-left-elevation"] = 0.7f, ["mouth-upward-retraction"] = 0.45f, ["eyebrows-left-down"] = 0.4f, ["eye-left-slit"] = 0.25f },
            ["squint"] = new() { ["eye-left-slit"] = 0.65f, ["eye-right-slit"] = 0.65f, ["eyebrows-left-down"] = 0.35f, ["eyebrows-right-down"] = 0.35f, ["nose-left-elevation"] = 0.15f, ["nose-right-elevation"] = 0.15f },
        };

        /// <summary>A face's unit weights (0..1); an unknown name is the still face.</summary>
        public static IReadOnlyDictionary<string, float> Of(string name) => name != null && Faces.TryGetValue(name, out var f) ? f : Faces["still"];

        /// <summary>Every unit any face uses (what a person is reset over).</summary>
        public static IEnumerable<string> Units()
        {
            var seen = new HashSet<string>();
            foreach (var f in Faces.Values) foreach (var u in f.Keys) if (seen.Add(u)) yield return u;
        }
    }
}
