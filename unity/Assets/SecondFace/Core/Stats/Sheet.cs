using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;

namespace SecondFace.Core.Stats
{
    public sealed class ActiveEffect
    {
        public string Id;
        public string Name;
        public List<Modifier> Mods = new();
        /// <summary>Game minute at which it ends; null = until removed.</summary>
        public int? Until;
    }

    /// <summary>A character's sheet (port of CharacterSheet). Attributes and skills are keyed by their string ids.</summary>
    public sealed class CharacterSheet
    {
        public string Name;
        public int Level;
        public int Xp;
        public Dictionary<string, int> BaseAttrs = new();
        /// <summary>Attribute points above base this character may spend at creation: the standard 12, or whatever was rolled.</summary>
        public int? CreationPool;
        /// <summary>Percentage points bought with skill points (not the points themselves).</summary>
        public Dictionary<string, int> SkillBought = new();
        public List<string> Tagged = new();
        public List<string> Traits = new();
        public Dictionary<string, int> Perks = new();
        public int UnspentSkill;
        public int PendingPerks;
        public int Hp;
        public int Rads;
        public Dictionary<string, bool> Crippled = new();
        public List<ActiveEffect> Effects = new();
        /// <summary>Extra modifiers from equipped gear (recomputed by the inventory).</summary>
        public List<Modifier> GearMods;
        /// <summary>Perks from faction ranks.</summary>
        public List<Modifier> FactionMods;
        public List<string> FactionFlags;
        /// <summary>Installed chrome by slot.</summary>
        public Dictionary<string, InstalledChrome> Chrome;
        /// <summary>Current Drift 0..100.</summary>
        public double? Drift;

        public bool IsCrippled(string part) => Crippled.TryGetValue(part, out var v) && v;
        public int PerkRank(string id) => Perks.TryGetValue(id, out var r) ? r : 0;
    }

    public static class BodyParts
    {
        public static readonly string[] All = { "head", "eyes", "torso", "armL", "armR", "legL", "legR", "groin" };
    }

    /// <summary>The character sheet rules (port of stats/sheet.ts).</summary>
    public static class Sheet
    {
        public static CharacterSheet Empty(string name = "Resident")
        {
            // Default spread uses all creation points: 5 in five attributes, 4 in two (3×7 + 12 = 33).
            var s = new CharacterSheet { Name = name, Level = 1, Xp = 0, Hp = 1 };
            foreach (var a in Rules.Attributes) s.BaseAttrs[a] = Rules.AttrBase + 2;
            s.BaseAttrs["presence"] = Rules.AttrBase + 1;
            s.BaseAttrs["fortune"] = Rules.AttrBase + 1;
            foreach (var k in Rules.Skills) s.SkillBought[k] = 0;
            s.Hp = Derived(s).MaxHp;
            return s;
        }

        /// <summary>All modifiers currently affecting the character.</summary>
        public static List<Modifier> AllMods(CharacterSheet s)
        {
            var outList = new List<Modifier>();
            foreach (var t in s.Traits) if (Registry.Traits.TryGetValue(t, out var td) && td.Mods != null) outList.AddRange(td.Mods);
            foreach (var kv in s.Perks)
                if (Registry.Perks.TryGetValue(kv.Key, out var pd) && pd.Mods != null)
                    for (int i = 0; i < kv.Value; i++) outList.AddRange(pd.Mods);
            foreach (var e in s.Effects) outList.AddRange(e.Mods);
            if (s.GearMods != null) outList.AddRange(s.GearMods);
            if (s.Chrome != null) outList.AddRange(Chrome.Mods(s));
            if (s.FactionMods != null) outList.AddRange(s.FactionMods);
            // Crippled limbs
            if (s.IsCrippled("legL") || s.IsCrippled("legR")) outList.Add(new Modifier("derived:ap", -1));
            if (s.IsCrippled("armL") || s.IsCrippled("armR")) { outList.Add(new Modifier("hit_ranged", -15)); outList.Add(new Modifier("hit_melee", -10)); }
            if (s.IsCrippled("eyes")) outList.Add(new Modifier("attr:senses", -3));
            // Radiation sickness tiers
            int radTier = s.Rads >= 800 ? 3 : s.Rads >= 500 ? 2 : s.Rads >= 200 ? 1 : 0;
            if (radTier > 0)
            {
                outList.Add(new Modifier("attr:grit", -radTier));
                outList.Add(new Modifier("attr:reflex", -Math.Max(0, radTier - 1)));
                outList.Add(new Modifier("attr:brawn", -Math.Max(0, radTier - 1)));
            }
            return outList;
        }

        public static double ModValue(List<Modifier> mods, string target, double baseValue)
        {
            double add = 0, mul = 1;
            foreach (var m in mods)
            {
                if (m.Target != target) continue;
                add += m.Add ?? 0;
                mul *= m.Mul ?? 1;
            }
            return (baseValue + add) * mul;
        }

        /// <summary>Sum of additive modifiers for a scalar target with base 0 (e.g. 'hit_ranged').</summary>
        public static double ModSum(CharacterSheet s, string target) => ModValue(AllMods(s), target, 0);

        public static bool HasFlag(CharacterSheet s, string flag)
        {
            foreach (var t in s.Traits) if (Registry.Traits.TryGetValue(t, out var td) && td.Flags != null && td.Flags.Contains(flag)) return true;
            foreach (var p in s.Perks.Keys) if (Registry.Perks.TryGetValue(p, out var pd) && pd.Flags != null && pd.Flags.Contains(flag)) return true;
            if (s.Chrome != null && flag.StartsWith("chrome_") && Chrome.Abilities(s).Contains(flag)) return true;
            if (s.FactionFlags != null && s.FactionFlags.Contains(flag)) return true;
            // Skill masteries (verbs at 50 and 100).
            if (flag.StartsWith("m_"))
            {
                foreach (var k in Rules.Skills)
                {
                    var m = Rules.Masteries[k];
                    if (m[0].Flag == flag) return Skill(s, k) >= 50;
                    if (m[1].Flag == flag) return Skill(s, k) >= 100;
                }
            }
            return false;
        }

        public static int Attr(CharacterSheet s, string a, List<Modifier> mods = null)
        {
            mods ??= AllMods(s);
            return Num.RoundInt(Num.Clamp(ModValue(mods, "attr:" + a, s.BaseAttrs[a]), Rules.AttrMin, Rules.AttrMax + 2));
        }

        public static Dictionary<string, int> Attrs(CharacterSheet s, List<Modifier> mods = null)
        {
            mods ??= AllMods(s);
            var d = new Dictionary<string, int>();
            foreach (var a in Rules.Attributes) d[a] = Attr(s, a, mods);
            return d;
        }

        public static int Skill(CharacterSheet s, string k, List<Modifier> mods = null)
        {
            mods ??= AllMods(s);
            var a = Attrs(s, mods);
            double v = Rules.SkillBase(k, a) + (s.Tagged.Contains(k) ? Rules.TagBonus : 0) + (s.SkillBought.TryGetValue(k, out var b) ? b : 0);
            v = ModValue(mods, "skills:all", v);
            v = ModValue(mods, "skill:" + k, v);
            return Num.RoundInt(Num.Clamp(v, 0, Rules.SkillMax));
        }

        public static Dictionary<string, int> Skills(CharacterSheet s)
        {
            var mods = AllMods(s);
            var d = new Dictionary<string, int>();
            foreach (var k in Rules.Skills) d[k] = Skill(s, k, mods);
            return d;
        }

        public static Derived Derived(CharacterSheet s)
        {
            var mods = AllMods(s);
            var a = Attrs(s, mods);
            var b = new Derived
            {
                MaxHp = 15 + 2 * a["brawn"] + 3 * a["grit"] + (s.Level - 1) * (2 + a["grit"] / 2) + 4 * s.Level * s.PerkRank("lifegiver"),
                Ap = 5 + a["reflex"] / 2,
                Carry = 25 + 15 * a["brawn"],
                Initiative = 2 * a["senses"] + a["reflex"],
                Crit = a["fortune"],
                HealRate = Math.Max(1, a["grit"] / 3),
                Dt = 0,
                Dr = 0,
                RadResist = 2 * a["grit"],
                PoisonResist = 5 * a["grit"],
                SightRange = 2 * a["senses"] + 4,
                Companions = Math.Max(1, Math.Min(3, a["presence"] / 4 + 1)),
                SkillPointsPerLevel = 8 + a["wits"],
            };
            var outD = new Derived();
            foreach (var k in Stats.Derived.Keys) outD.Set(k, Num.RoundInt(ModValue(mods, "derived:" + k, b.Get(k))));
            return outD;
        }

        /// <summary>Remaining creation points given base attributes (base 3 each, plus the pool).</summary>
        public static int CreationPointsLeft(IReadOnlyDictionary<string, int> baseAttrs, int pool = Rules.AttrCreationPoints)
        {
            int spent = 0;
            foreach (var a in Rules.Attributes) spent += baseAttrs[a] - Rules.AttrBase;
            return pool - spent;
        }

        public struct Roll { public Dictionary<string, int> Attrs; public int Pool; }

        /// <summary>Roll a start the old way: each attribute base plus a wide roll (two below to five above).</summary>
        public static Roll RollAttributes(Rng rng)
        {
            var attrs = new Dictionary<string, int>();
            int pool = 0;
            var pick = new[] { 0, 0, 1 };
            foreach (var a in Rules.Attributes)
            {
                int d = rng.Int(-2, 2) + rng.Int(0, 3) + rng.Pick(pick);
                attrs[a] = Num.Clamp(Rules.AttrBase + d, Rules.AttrMin, Rules.AttrCreationMax);
                pool += attrs[a] - Rules.AttrBase;
            }
            return new Roll { Attrs = attrs, Pool = pool };
        }

        public static List<string> ValidateCreation(CharacterSheet s)
        {
            var errs = new List<string>();
            if (string.IsNullOrWhiteSpace(s.Name)) errs.Add("Choose a name.");
            if (CreationPointsLeft(s.BaseAttrs, s.CreationPool ?? Rules.AttrCreationPoints) != 0) errs.Add("Distribute all attribute points.");
            foreach (var a in Rules.Attributes) if (s.BaseAttrs[a] < Rules.AttrMin || s.BaseAttrs[a] > Rules.AttrCreationMax) errs.Add($"Attribute out of range: {a}");
            if (s.Tagged.Count != Rules.TagCount) errs.Add($"Tag exactly {Rules.TagCount} skills.");
            if (s.Traits.Count > 2) errs.Add("At most two traits.");
            return errs;
        }

        /// <summary>Skill points needed to raise a skill by one step, and the step size.</summary>
        public static (int cost, int gain) RaiseCost(CharacterSheet s, string k) => (1, s.Tagged.Contains(k) ? 2 : 1);

        public static bool RaiseSkill(CharacterSheet s, string k)
        {
            if (Skill(s, k) >= Rules.SkillMax) return false;
            var (cost, gain) = RaiseCost(s, k);
            if (s.UnspentSkill < cost) return false;
            s.UnspentSkill -= cost;
            s.SkillBought[k] = (s.SkillBought.TryGetValue(k, out var b) ? b : 0) + gain;
            return true;
        }

        /// <summary>Add XP; returns the levels gained. Grants skill points, HP and perk picks.</summary>
        public static int AddXp(CharacterSheet s, int amount)
        {
            double mult = ModValue(AllMods(s), "xp", 1);
            s.Xp += Num.RoundInt(amount * mult);
            int gained = 0;
            while (s.Level < Rules.LevelCap && s.Xp >= Rules.XpForLevel(s.Level + 1))
            {
                int before = Derived(s).MaxHp;
                s.Level++;
                gained++;
                s.UnspentSkill += Derived(s).SkillPointsPerLevel;
                s.Hp += Derived(s).MaxHp - before;
                if (s.Level % Rules.PerkEvery == 0) s.PendingPerks++;
            }
            return gained;
        }

        public static bool PerkAvailable(CharacterSheet s, string id)
        {
            if (!Registry.Perks.TryGetValue(id, out var p)) return false;
            if (s.PerkRank(id) >= (p.Ranks ?? 1)) return false;
            if (s.Level < p.Req.Level) return false;
            var a = Attrs(s); var k = Skills(s);
            if (p.Req.Attrs != null) foreach (var kv in p.Req.Attrs) if (a[kv.Key] < kv.Value) return false;
            if (p.Req.Skills != null) foreach (var kv in p.Req.Skills) if (k[kv.Key] < kv.Value) return false;
            if (p.Req.NotTraits != null && p.Req.NotTraits.Any(t => s.Traits.Contains(t))) return false;
            return true;
        }

        public static bool TakePerk(CharacterSheet s, string id)
        {
            if (s.PendingPerks <= 0 || !PerkAvailable(s, id)) return false;
            s.Perks[id] = s.PerkRank(id) + 1;
            s.PendingPerks--;
            return true;
        }

        /// <summary>Remove expired temporary effects; returns them.</summary>
        public static List<ActiveEffect> TickEffects(CharacterSheet s, int nowMinutes)
        {
            var expired = s.Effects.Where(e => e.Until != null && e.Until <= nowMinutes).ToList();
            s.Effects = s.Effects.Where(e => !expired.Contains(e)).ToList();
            return expired;
        }
    }
}
