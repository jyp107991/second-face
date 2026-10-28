using System;
using System.Collections.Generic;

namespace SecondFace.Core.Stats
{
    /// <summary>The rules' constants and tables (port of stats/rules.ts). Attributes and skills are string ids.</summary>
    public static class Rules
    {
        public static readonly string[] Attributes = { "brawn", "senses", "grit", "presence", "wits", "reflex", "fortune" };

        public sealed class AttributeInfo { public string Name; public string Short; public string Desc; }
        public static readonly Dictionary<string, AttributeInfo> AttributeInfos = new()
        {
            ["brawn"] = new AttributeInfo { Name = "Brawn", Short = "BRN", Desc = "Raw strength. Carry weight, melee damage, heavy weapons, a little health." },
            ["senses"] = new AttributeInfo { Name = "Senses", Short = "SNS", Desc = "Sight, hearing, instinct. Weapon range, spotting traps and hidden things, noticing what others miss." },
            ["grit"] = new AttributeInfo { Name = "Grit", Short = "GRT", Desc = "Toughness and stamina. Health, healing, resistance to radiation and poison, long marches." },
            ["presence"] = new AttributeInfo { Name = "Presence", Short = "PRS", Desc = "Force of personality. How people react to you, prices, followers." },
            ["wits"] = new AttributeInfo { Name = "Wits", Short = "WIT", Desc = "Intelligence and memory. Skill points, science and medicine, seeing through lies." },
            ["reflex"] = new AttributeInfo { Name = "Reflex", Short = "RFX", Desc = "Speed and coordination. Action points, initiative, firearms, stealth." },
            ["fortune"] = new AttributeInfo { Name = "Fortune", Short = "FRT", Desc = "The world bending your way. Critical hits, odd encounters, finds, gambling." },
        };

        public const int AttrMin = 1;
        public const int AttrMax = 10;
        /// <summary>Highest an attribute can be bought to at creation.</summary>
        public const int AttrCreationMax = 8;
        public const int AttrBase = 3;
        public const int AttrCreationPoints = 12;

        public static readonly string[] Skills =
        {
            "firearms", "arc", "melee", "explosives",
            "medicine", "mechanics", "science", "security", "stealth",
            "speech", "barter", "survival",
        };

        public sealed class SkillInfo { public string Name; public string Group; public string Desc; }
        public static readonly Dictionary<string, SkillInfo> SkillInfos = new()
        {
            ["firearms"] = new SkillInfo { Name = "Firearms", Group = "combat", Desc = "Pistols, rifles, shotguns, machine guns (heavy guns need Brawn)." },
            ["arc"] = new SkillInfo { Name = "Arc Weapons", Group = "combat", Desc = "Pre-Burn energy weapons." },
            ["melee"] = new SkillInfo { Name = "Melee", Group = "combat", Desc = "Blades, clubs, spears, fists and grapples." },
            ["explosives"] = new SkillInfo { Name = "Explosives", Group = "combat", Desc = "Grenades, thrown weapons, mines, launchers; disarming bombs." },
            ["medicine"] = new SkillInfo { Name = "Medicine", Group = "active", Desc = "Healing, surgery, chems, diagnosing the sick." },
            ["mechanics"] = new SkillInfo { Name = "Mechanics", Group = "active", Desc = "Repair, crafting, ammunition, machines and vehicles." },
            ["science"] = new SkillInfo { Name = "Science", Group = "active", Desc = "Terminals, electronics, chemistry, old-world records." },
            ["security"] = new SkillInfo { Name = "Security", Group = "active", Desc = "Locks, safes, alarms and traps." },
            ["stealth"] = new SkillInfo { Name = "Stealth", Group = "active", Desc = "Sneaking, picking pockets, planting items." },
            ["speech"] = new SkillInfo { Name = "Speech", Group = "social", Desc = "Persuade, deceive, intimidate, calm." },
            ["barter"] = new SkillInfo { Name = "Barter", Group = "social", Desc = "Prices, appraisal, deals and contracts." },
            ["survival"] = new SkillInfo { Name = "Survival", Group = "social", Desc = "Travel, tracking, food, camps, animals, reading the land." },
        };

        /// <summary>A skill's base from the attributes (the formulas of SKILL_INFO[k].base).</summary>
        public static int SkillBase(string skill, IReadOnlyDictionary<string, int> a)
        {
            switch (skill)
            {
                case "firearms": return 2 + 3 * a["reflex"] + a["senses"];
                case "arc": return 2 * a["reflex"] + 2 * a["wits"];
                case "melee": return 10 + 2 * a["brawn"] + 2 * a["reflex"];
                case "explosives": return 2 * a["reflex"] + a["wits"] + a["senses"];
                case "medicine": return 2 * (a["wits"] + a["senses"]);
                case "mechanics": return 3 * a["wits"] + a["reflex"];
                case "science": return 4 * a["wits"];
                case "security": return 2 * (a["reflex"] + a["senses"]);
                case "stealth": return 5 + 3 * a["reflex"];
                case "speech": return 4 * a["presence"] + a["wits"];
                case "barter": return 3 * a["presence"] + a["wits"];
                case "survival": return 2 * (a["grit"] + a["senses"]);
                default: throw new ArgumentException($"Unknown skill {skill}");
            }
        }

        public const int SkillMax = 100;
        public const int TagCount = 3;
        public const int TagBonus = 15;

        public static readonly Dictionary<string, int> CheckTiers = new() { ["novice"] = 25, ["adept"] = 50, ["expert"] = 75, ["master"] = 100 };

        public sealed class Mastery { public string Name; public string Desc; public string Flag; }
        /// <summary>Per skill: the verbs unlocked at 50 and at 100.</summary>
        public static readonly Dictionary<string, Mastery[]> Masteries = new()
        {
            ["firearms"] = new[] { new Mastery { Name = "Steady Hands", Desc = "Aimed shots cost no extra AP with pistols and rifles.", Flag = "m_firearms_aim" }, new Mastery { Name = "Dead Eye", Desc = "Once per fight, a shot that cannot miss.", Flag = "m_firearms_deadeye" } },
            ["arc"] = new[] { new Mastery { Name = "Overcharge", Desc = "Overcharge a cell for double damage at the risk of burning out the weapon.", Flag = "m_arc_overcharge" }, new Mastery { Name = "Arc Chain", Desc = "Arc hits leap to a second target in reach.", Flag = "m_arc_chain" } },
            ["melee"] = new[] { new Mastery { Name = "Disarm", Desc = "Strike an enemy's weapon from their hands.", Flag = "m_melee_disarm" }, new Mastery { Name = "Riposte", Desc = "Missed melee attacks against you can be answered for free.", Flag = "m_melee_riposte" } },
            ["explosives"] = new[] { new Mastery { Name = "Sapper", Desc = "Disarm mines and keep them; craft simple charges.", Flag = "m_expl_sapper" }, new Mastery { Name = "Shaped Charge", Desc = "Breach walls and doors marked as weak.", Flag = "m_expl_breach" } },
            ["medicine"] = new[] { new Mastery { Name = "Triage", Desc = "Stabilise downed allies and treat crippled limbs in the field.", Flag = "m_med_triage" }, new Mastery { Name = "Surgeon", Desc = "Operate: remove implants, save the dying, perform procedures others cannot.", Flag = "m_med_surgeon" } },
            ["mechanics"] = new[] { new Mastery { Name = "Jury-Rig", Desc = "Repair gear with parts from unrelated items.", Flag = "m_mech_jury" }, new Mastery { Name = "Machinist", Desc = "Build turrets and modify weapons with unique mods.", Flag = "m_mech_machinist" } },
            ["science"] = new[] { new Mastery { Name = "Backchannel", Desc = "Read terminal logs others cannot; turn hostile machines off.", Flag = "m_sci_backchannel" }, new Mastery { Name = "Override", Desc = "Take control of robots and automated defences.", Flag = "m_sci_override" } },
            ["security"] = new[] { new Mastery { Name = "Salvager", Desc = "Disarmed traps yield parts.", Flag = "m_sec_salvage" }, new Mastery { Name = "Trapsmith", Desc = "Re-arm traps against your enemies.", Flag = "m_sec_rearm" } },
            ["stealth"] = new[] { new Mastery { Name = "Plant", Desc = "Plant items in pockets (evidence, explosives, keys).", Flag = "m_stealth_plant" }, new Mastery { Name = "Vanish", Desc = "Break line of sight in combat to slip back into hiding.", Flag = "m_stealth_vanish" } },
            ["speech"] = new[] { new Mastery { Name = "Read the Room", Desc = "See how each person present will react before you speak.", Flag = "m_speech_read" }, new Mastery { Name = "Last Word", Desc = "End most fights before they start, if you are heard.", Flag = "m_speech_lastword" } },
            ["barter"] = new[] { new Mastery { Name = "Appraiser", Desc = "See true value and origin of items; spot fakes.", Flag = "m_barter_appraise" }, new Mastery { Name = "Contracts", Desc = "Strike standing deals: supply runs, shares, debts that pay.", Flag = "m_barter_contracts" } },
            ["survival"] = new[] { new Mastery { Name = "Tracker", Desc = "Follow tracks on maps and the world map; foresee ambushes.", Flag = "m_surv_tracker" }, new Mastery { Name = "Wasteborn", Desc = "Live off the land: no food or water costs when travelling.", Flag = "m_surv_wasteborn" } },
        };

        /// <summary>Total XP needed to be level n.</summary>
        public static int XpForLevel(int n) => 750 * n * (n - 1) / 2;

        public const int LevelCap = 30;
        public const int PerkEvery = 2;
    }

    /// <summary>Derived statistics of a character (port of Derived).</summary>
    public sealed class Derived
    {
        public static readonly string[] Keys = { "maxHp", "ap", "carry", "initiative", "crit", "healRate", "dt", "dr", "radResist", "poisonResist", "sightRange", "companions", "skillPointsPerLevel" };

        public int MaxHp, Ap, Carry, Initiative, Crit, HealRate, Dt, Dr, RadResist, PoisonResist, SightRange, Companions, SkillPointsPerLevel;

        public int Get(string key)
        {
            switch (key)
            {
                case "maxHp": return MaxHp; case "ap": return Ap; case "carry": return Carry; case "initiative": return Initiative; case "crit": return Crit;
                case "healRate": return HealRate; case "dt": return Dt; case "dr": return Dr; case "radResist": return RadResist; case "poisonResist": return PoisonResist;
                case "sightRange": return SightRange; case "companions": return Companions; case "skillPointsPerLevel": return SkillPointsPerLevel;
                default: throw new ArgumentException(key);
            }
        }

        public void Set(string key, int v)
        {
            switch (key)
            {
                case "maxHp": MaxHp = v; break; case "ap": Ap = v; break; case "carry": Carry = v; break; case "initiative": Initiative = v; break; case "crit": Crit = v; break;
                case "healRate": HealRate = v; break; case "dt": Dt = v; break; case "dr": Dr = v; break; case "radResist": RadResist = v; break; case "poisonResist": PoisonResist = v; break;
                case "sightRange": SightRange = v; break; case "companions": Companions = v; break; case "skillPointsPerLevel": SkillPointsPerLevel = v; break;
                default: throw new ArgumentException(key);
            }
        }
    }
}
