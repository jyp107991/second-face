using System;
using System.Collections.Generic;

namespace SecondFace.Core.Npc
{
    /// <summary>The sculptor's calibrated sliders on a Rocketbox head (owner, 2026-10-31: each major feature calibrated
    /// on its own, from the library's real faces). Each slider moves one or more measured features by a known number of
    /// millimetres per unit (<see cref="RocketboxSculptData.Effect"/>); each head has, per feature, the room left before
    /// that feature leaves the library's spread for its sex (<see cref="RocketboxSculptData.Room"/>). A slider's limits
    /// are how far it can go alone; <see cref="Clamp"/> holds a whole set of slider values so that the features they share
    /// (the chin's projection by chin-forward and jaw-forward, the nose's width by its width and its nostrils) stay inside
    /// their room together. Values are in units, -1..1 (the low end's shape at -1, the high end's at +1).</summary>
    public static class RocketboxSculpt
    {
        /// <summary>A change smaller than this (mm per unit) does not hold a slider back (measuring noise).</summary>
        public const double Negligible = 0.4;



        public static bool Knows(string head) => head != null && RocketboxSculptData.Room.ContainsKey(head);

        public static bool Calibrated(string slider) => slider != null && RocketboxSculptData.Effect.ContainsKey(slider);

        /// <summary>How far one slider can go on this head with every other slider at zero: (low, high), low in -1..0 and
        /// high in 0..1. A slider that is not calibrated keeps its full unit.</summary>
        public static (float Low, float High) Limits(string head, string slider)
        {
            if (!Knows(head) || !Calibrated(slider)) return (-1f, 1f);
            var (below, above) = RocketboxSculptData.Room[head];
            var (lowEff, highEff) = RocketboxSculptData.Effect[slider];
            return (-(float)Reach(lowEff, below, above), (float)Reach(highEff, below, above));
        }

        /// <summary>The units one end of a slider can travel before any feature it moves leaves its room.</summary>
        private static double Reach(double[] eff, double[] below, double[] above)
        {
            var u = 1.0;
            for (var f = 0; f < eff.Length; f++)
            {
                var mm = eff[f];
                if (Math.Abs(mm) < Negligible) continue;
                var room = mm > 0 ? above[f] : below[f];
                u = Math.Min(u, Math.Clamp(room / mm, 0.0, 1.0));
            }
            return u;
        }

        /// <summary>The feature changes (mm, in <see cref="RocketboxSculptData.Features"/> order) that a set of slider
        /// values makes, summed as each slider's change per unit times its value.</summary>
        public static double[] Change(IReadOnlyDictionary<string, float> values)
        {
            var d = new double[RocketboxSculptData.Features.Length];
            foreach (var kv in values)
            {
                if (!Calibrated(kv.Key) || kv.Value == 0f) continue;
                var (lowEff, highEff) = RocketboxSculptData.Effect[kv.Key];
                var eff = kv.Value < 0 ? lowEff : highEff;
                var u = Math.Abs(kv.Value);
                for (var f = 0; f < d.Length; f++) if (Math.Abs(eff[f]) >= Negligible) d[f] += eff[f] * u;
            }
            return d;
        }

        /// <summary>The values held inside the head's room: each value first inside -1..1 and its own limits, then, for
        /// every feature that the values together push past its room, the sliders pushing it that way scaled back by the
        /// same factor until it fits (a slider that moves several features keeps the smallest factor). Sliders that are
        /// not calibrated pass through, inside -1..1.</summary>
        public static Dictionary<string, float> Clamp(string head, IReadOnlyDictionary<string, float> values)
        {
            var v = new Dictionary<string, float>();
            foreach (var kv in values)
            {
                var x = Math.Clamp(kv.Value, -1f, 1f);
                if (Knows(head) && Calibrated(kv.Key))
                {
                    var (lo, hi) = Limits(head, kv.Key);
                    x = Math.Clamp(x, lo, hi);
                }
                v[kv.Key] = x;
            }
            if (!Knows(head)) return v;
            var (below, above) = RocketboxSculptData.Room[head];
            for (var pass = 0; pass < 32; pass++)
            {
                var scale = new Dictionary<string, double>();
                var over = false;
                for (var f = 0; f < below.Length; f++)
                {
                    double up = 0, down = 0;
                    foreach (var kv in v)
                    {
                        var c = Contribution(kv.Key, kv.Value, f);
                        if (c > 0) up += c; else down += c;
                    }
                    var total = up + down;
                    if (total > above[f] + 1e-6 && up > 0)
                    {
                        over = true;
                        var k = Math.Max(0.0, (above[f] - down) / up);
                        foreach (var kv in v) if (Contribution(kv.Key, kv.Value, f) > 0) Keep(scale, kv.Key, k);
                    }
                    else if (total < below[f] - 1e-6 && down < 0)
                    {
                        over = true;
                        var k = Math.Max(0.0, (below[f] - up) / down);
                        foreach (var kv in v) if (Contribution(kv.Key, kv.Value, f) < 0) Keep(scale, kv.Key, k);
                    }
                }
                if (!over) break;
                foreach (var kv in scale) v[kv.Key] = (float)(v[kv.Key] * kv.Value);
            }
            return v;
        }

        private static double Contribution(string slider, float value, int feature)
        {
            if (value == 0f || !Calibrated(slider)) return 0;
            var (lowEff, highEff) = RocketboxSculptData.Effect[slider];
            var mm = (value < 0 ? lowEff : highEff)[feature];
            return Math.Abs(mm) < Negligible ? 0 : mm * Math.Abs(value);
        }

        private static void Keep(Dictionary<string, double> scale, string slider, double k) =>
            scale[slider] = scale.TryGetValue(slider, out var s) ? Math.Min(s, k) : k;
    }
}
