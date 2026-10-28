using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.State;
using SecondFace.Core.Stats;

namespace SecondFace.Core.World
{
    /// <summary>Faction membership (port of world/factions.ts): a door you walked through, as opposed to reputation.</summary>
    public static class Factions
    {
        public static int RankIndex(FactionDef def, string rank) => def.Ranks.FindIndex(r => r.Id == rank);

        /// <summary>Current membership, if it is live.</summary>
        public static Membership Of(GameState g, string faction) => g.World.MembershipOf.TryGetValue(faction, out var m) && m.Status == "member" ? m : null;

        /// <summary>Member at `minRank` or higher (any rank when omitted).</summary>
        public static bool IsMember(GameState g, IReadOnlyDictionary<string, FactionDef> defs, string faction, string minRank = null)
        {
            var m = Of(g, faction);
            if (m == null || !defs.TryGetValue(faction, out var def)) return false;
            if (minRank == null) return true;
            return RankIndex(def, m.Rank) >= RankIndex(def, minRank);
        }

        /// <summary>Join a faction at a rank (default: the first). Conflicting open memberships are expelled unless this is a cover. Returns the expelled ids.</summary>
        public static List<string> Enlist(GameState g, IReadOnlyDictionary<string, FactionDef> defs, string faction, string rank = null, string cover = null)
        {
            if (!defs.TryGetValue(faction, out var def)) throw new ArgumentException($"Unknown faction {faction}");
            rank ??= def.Ranks[0].Id;
            if (RankIndex(def, rank) < 0) throw new ArgumentException($"Faction {faction}: unknown rank {rank}");
            var expelled = new List<string>();
            if (cover == null)
            {
                foreach (var kv in g.World.MembershipOf)
                {
                    var other = kv.Key; var m = kv.Value;
                    if (other == faction || m.Status != "member") continue;
                    defs.TryGetValue(other, out var od);
                    bool clash = (def.Conflicts?.Contains(other) ?? false) || (od?.Conflicts?.Contains(faction) ?? false) || (def.Group != null && od?.Group == def.Group);
                    if (clash) { m.Status = "expelled"; expelled.Add(other); }
                }
            }
            g.World.MembershipOf.TryGetValue(faction, out var old);
            int since = old?.Status == "member" ? old.Since : Clock.DayOf(g.Minutes);
            g.World.MembershipOf[faction] = new Membership { Rank = rank, Since = since, Status = "member", Cover = cover };
            return expelled;
        }

        /// <summary>Move to another rank (up or down).</summary>
        public static void SetRank(GameState g, IReadOnlyDictionary<string, FactionDef> defs, string faction, string rank)
        {
            if (!defs.TryGetValue(faction, out var def) || RankIndex(def, rank) < 0) throw new ArgumentException($"Faction {faction}: unknown rank {rank}");
            var m = Of(g, faction) ?? throw new InvalidOperationException($"Not a member of {faction}");
            m.Rank = rank;
        }

        public static bool Expel(GameState g, string faction, string status = "expelled")
        {
            var m = Of(g, faction);
            if (m == null) return false;
            m.Status = status;
            return true;
        }

        /// <summary>Ranks held: the member's rank and every rank below it, over live, non-cover memberships.</summary>
        private static List<RankDef> HeldRanks(GameState g, IReadOnlyDictionary<string, FactionDef> defs)
        {
            var outList = new List<RankDef>();
            foreach (var kv in g.World.MembershipOf)
            {
                if (!defs.TryGetValue(kv.Key, out var def) || kv.Value.Status != "member" || kv.Value.Cover != null) continue;
                int i = RankIndex(def, kv.Value.Rank);
                if (i >= 0) outList.AddRange(def.Ranks.Take(i + 1));
            }
            return outList;
        }

        public static (List<Modifier> mods, List<string> flags) MembershipPerks(GameState g, IReadOnlyDictionary<string, FactionDef> defs)
        {
            var ranks = HeldRanks(g, defs);
            var mods = ranks.Where(r => r.Mods != null).SelectMany(r => r.Mods).ToList();
            var flags = ranks.Where(r => r.Flags != null).SelectMany(r => r.Flags).Distinct().ToList();
            return (mods, flags);
        }

        /// <summary>Best price multiplier with a faction's merchants (1 when not a member). Covers count: you look like one of them.</summary>
        public static double FactionPriceMul(GameState g, IReadOnlyDictionary<string, FactionDef> defs, string faction)
        {
            var m = Of(g, faction);
            if (m == null || !defs.TryGetValue(faction, out var def)) return 1;
            var held = def.Ranks.Take(RankIndex(def, m.Rank) + 1);
            double best = 1;
            foreach (var r in held) best = Math.Min(best, r.PriceMul ?? 1);
            return best;
        }

        /// <summary>May the player pass this door/district/service id by virtue of any membership (covers count)?</summary>
        public static bool HasAccess(GameState g, IReadOnlyDictionary<string, FactionDef> defs, string accessId)
        {
            foreach (var kv in g.World.MembershipOf)
            {
                if (!defs.TryGetValue(kv.Key, out var def) || kv.Value.Status != "member") continue;
                var held = def.Ranks.Take(RankIndex(def, kv.Value.Rank) + 1);
                if (held.Any(r => r.Access != null && r.Access.Contains(accessId))) return true;
            }
            return false;
        }

        /// <summary>Write membership perks into the sheet so stats/flags see them (call after enlist/setRank/expel).</summary>
        public static void SyncMembership(GameState g, IReadOnlyDictionary<string, FactionDef> defs)
        {
            var (mods, flags) = MembershipPerks(g, defs);
            g.Pc.Sheet.FactionMods = mods;
            g.Pc.Sheet.FactionFlags = flags;
        }
    }
}
