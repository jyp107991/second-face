using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Scene;

namespace SecondFace.Core.Npc
{
    /// <summary>A body that can stand in for a person: its id, sex, age and trade (the cast, P4.1).</summary>
    public sealed class CastBody
    {
        public string Id;
        public bool Male;
        public double Age;
        public string Role;
    }

    /// <summary>
    /// The people's days in the world (P6.2; port of game.ts updateSchedules): whose routine applies (the placement's
    /// own, else the person's), the entry in force at an hour, whether it keeps them out of sight (away, or asleep at
    /// home), and which of the cast's bodies each person of a place wears (the same sex, the nearest age, each body once
    /// while there are bodies left).
    /// </summary>
    public static class Routine
    {
        public static List<ScheduleEntry> Of(NpcPlacement placement, NpcDef def) =>
            placement?.Schedule != null && placement.Schedule.Count > 0 ? placement.Schedule : def?.Schedule;

        /// <summary>The entry in force at an hour (null: the person stays where they were placed).</summary>
        public static ScheduleEntry Now(NpcPlacement placement, NpcDef def, double hour) => Schedule.At(Of(placement, def), hour % 24);

        /// <summary>Out of sight: away from the place, or asleep (gone in to bed once at home).</summary>
        public static bool Hidden(ScheduleEntry e) => e != null && (e.Activity == "away" || e.Activity == "sleep");

        /// <summary>A person's sex from their look: a beard says a man; else the frame (broad a man, narrow a woman, as the
        /// web game's figures had it).</summary>
        public static bool Male(LookDef look)
        {
            var beard = look?.Over?["facialHair"]?.ToString();
            if (!string.IsNullOrEmpty(beard) && beard != "none") return true;
            return look?.Frame == "broad";
        }

        /// <summary>Gives each person a body: the same sex and the nearest age, each body once while any of that sex are
        /// left (then again, the nearest age). People are taken in the order given; ties by role.</summary>
        public static Dictionary<string, string> Assign(IList<(string Id, bool Male, double Age, string Role)> people, IList<CastBody> bodies)
        {
            var out_ = new Dictionary<string, string>();
            var used = new HashSet<string>();
            foreach (var p in people)
            {
                var same = bodies.Where(b => b.Male == p.Male).ToList();
                if (same.Count == 0) same = bodies.ToList();
                if (same.Count == 0) break;
                var free = same.Where(b => !used.Contains(b.Id)).ToList();
                var pool = free.Count > 0 ? free : same;
                var best = pool.OrderBy(b => Math.Abs(b.Age - p.Age) + (b.Role == p.Role ? -5 : 0)).ThenBy(b => b.Id, StringComparer.Ordinal).First();
                used.Add(best.Id);
                out_[p.Id] = best.Id;
            }
            return out_;
        }
    }
}
