using System.Collections.Generic;
using SecondFace.Core.Inventory;

namespace SecondFace.Core.Stats
{
    public struct CheckResult { public bool Success; public int Value; public int Dc; public double Chance; }

    /// <summary>Skill checks (port of stats/checks.ts): tools that boost a skill while carried; world checks with a shrinking chance below the DC.</summary>
    public static class Checks
    {
        /// <summary>Tools that boost a skill while carried: skill → (item, bonus).</summary>
        public static readonly Dictionary<string, (string item, int bonus)> ToolBonus = new()
        {
            ["security"] = ("t_picks", 15),
            ["medicine"] = ("t_docbag", 15),
            ["mechanics"] = ("t_repair", 10),
        };

        public static int EffectiveSkill(CharacterSheet s, Inventory.Inventory inv, string k)
        {
            int v = Sheet.Skill(s, k);
            if (ToolBonus.TryGetValue(k, out var t) && inv != null && Inv.CountItem(inv, t.item) > 0) v += t.bonus;
            return v;
        }

        /// <summary>Meeting the DC always succeeds; falling short leaves a shrinking chance, so near-misses are possible but long shots are not.</summary>
        public static CheckResult SkillCheck(CharacterSheet s, Inventory.Inventory inv, string k, int dc, Rng rng)
        {
            int value = EffectiveSkill(s, inv, k);
            double chance = value >= dc ? 100 : System.Math.Max(0, 35 - (dc - value) * 3);
            return new CheckResult { Success = chance >= 100 || rng.Next() * 100 < chance, Value = value, Dc = dc, Chance = chance };
        }
    }
}
