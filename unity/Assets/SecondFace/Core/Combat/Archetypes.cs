using System;
using System.Collections.Generic;
using SecondFace.Core.Content;

namespace SecondFace.Core.Combat
{
    /// <summary>How an AI fights (COMBAT.md D2): weights the utility AI multiplies its terms by, and the hard traits of a
    /// kind (machines feel no fear, animals use no tools, wardens arrest first).</summary>
    public sealed class AiProfile
    {
        public string Id;
        /// <summary>Weight of the attack it can make against the cover it keeps (above 1 it closes in).</summary>
        public double Aggression = 1;
        /// <summary>Weight of the fire it would take where it stands (cover, exposure).</summary>
        public double Caution = 1;
        /// <summary>Taste for holding a shot ready (overwatch, cover fire).</summary>
        public double Overwatch = 1;
        public double Suppress = 0.6;
        public double Throw = 1;
        /// <summary>Drive to close and strike with a blade or fists.</summary>
        public double Melee = 1;
        /// <summary>Focus fire on the wounded and the exposed.</summary>
        public double Focus = 1;
        /// <summary>Guarding its own leader and wounded (staying by them, patching them up, covering them).</summary>
        public double Protect = 0.5;
        public double Flank = 1;
        /// <summary>Keeping near its own (and not bunching where one blast takes two).</summary>
        public double Cohesion = 0.5;
        /// <summary>Taking the surrendered prisoner.</summary>
        public double Prisoners = 0;
        /// <summary>How long its nerve holds (above 1: breaks later).</summary>
        public double Nerve = 1;
        /// <summary>How hard its leader's fall hits it (the morale loss multiplied).</summary>
        public double LeaderBond = 1;
        /// <summary>The share of its health below which it runs whatever its morale (an animal's instinct; 0: never).</summary>
        public double FleeHp;
        /// <summary>Never flees or surrenders (a machine).</summary>
        public bool NoMorale;
        /// <summary>No cover sought, no tools used (an animal).</summary>
        public bool Instinct;
        /// <summary>Always the best-scored choice (a machine: no noise even on the easiest difficulty).</summary>
        public bool Predictable;
        /// <summary>Demands surrender, never fires on the surrendered, takes prisoners (the Ledger's wardens).</summary>
        public bool ArrestFirst;
        /// <summary>The difficulty's share (set when shaped): decision noise, how much the other side's held shots and areas
        /// are read, coordination, mercy.</summary>
        public double Noise, ReadThreats = 0.7, Mercy;
        public bool Coordinate;

        public AiProfile Clone() => (AiProfile)MemberwiseClone();
    }

    /// <summary>
    /// How hard a fight is (COMBAT.md C10): the hostile side's aim and damage (the settings' numbers) and how its AI plays.
    /// Story: it settles for lesser choices now and then, spreads its fire rather than finishing the fallen, rarely throws,
    /// flanks little and walks into held shots. Normal: plays well, reads overwatch and areas. Hard: focus fire, flanks and
    /// heights sought, throws for two, suppresses so another can flank, shares targets, never walks into a held shot it
    /// can see.
    /// </summary>
    public sealed class CombatDifficulty
    {
        public string Id;
        public int HitMod;
        public double DmgMul = 1;
        public double Noise, Focus = 1, Flank = 1, Throw = 1, ReadThreats = 0.7, Mercy, Caution = 1, Aggression = 1;
        public bool Coordinate;
        /// <summary>Whose coming target the fight shows over them (COMBAT.md B5): <c>all</c> (every enemy, the story's
        /// ease), <c>seen</c> (the enemies the player's side sees, and machines, which are predictable) or <c>machines</c>
        /// (only the predictable ones: the hard game keeps the rest to themselves).</summary>
        public string Intents = "seen";

        public static readonly CombatDifficulty Story = new() { Intents = "all", Id = "story", HitMod = -15, DmgMul = 0.6, Noise = 0.3, Focus = 0.4, Flank = 0.5, Throw = 0.4, ReadThreats = 0.15, Mercy = 0.6, Caution = 0.8, Aggression = 0.9 };
        public static readonly CombatDifficulty Normal = new() { Id = "normal", HitMod = 0, DmgMul = 1, Noise = 0.06, Focus = 1, Flank = 1, Throw = 1, ReadThreats = 0.7 };
        public static readonly CombatDifficulty Hard = new() { Intents = "machines", Id = "hard", HitMod = 8, DmgMul = 1.25, Noise = 0, Focus = 1.5, Flank = 1.4, Throw = 1.3, ReadThreats = 1, Caution = 1.1, Aggression = 1.1, Coordinate = true };

        /// <summary>By the settings' id (story, normal, hard); the numbers are the settings' own
        /// (<see cref="SecondFace.Core.Save.Settings.DifficultyMods"/>).</summary>
        public static CombatDifficulty For(string id)
        {
            var d = id == "story" ? Story : id == "hard" ? Hard : Normal;
            var (hit, dmg) = SecondFace.Core.Save.Settings.DifficultyMods(d.Id);
            var c = (CombatDifficulty)d.MemberwiseClone();
            c.HitMod = hit; c.DmgMul = dmg;
            return c;
        }
    }

    /// <summary>
    /// The AI's archetypes and how the content's people map to them (COMBAT.md D2). By the NPC's role first (raider,
    /// guard), then their faction, then their team; a natural attack and no gear is an animal; a machine's role or team is
    /// a machine; the player's side fights as companions. The table is data (<see cref="ByFaction"/>, <see cref="ByTeam"/>,
    /// <see cref="ByRole"/>) so content can grow without code.
    /// </summary>
    public static class Archetypes
    {
        public const string Raider = "raider", Warden = "warden", Guard = "guard", Machine = "machine", Animal = "animal", Fighter = "fighter", Civilian = "civilian", Companion = "companion";

        public static readonly Dictionary<string, AiProfile> Profiles = new()
        {
            // raiders by nerve: aggressive, flanking, close in, throw fire, break when their leader falls
            [Raider] = new AiProfile { Id = Raider, Aggression = 1.4, Caution = 0.65, Overwatch = 0.3, Suppress = 0.3, Throw = 1.3, Melee = 1.4, Focus = 1.3, Protect = 0.2, Flank = 1.4, Cohesion = 0.3, Nerve = 0.9, LeaderBond = 1.8 },
            // wardens by the book: cover, overwatch, suppression, arrest first
            [Warden] = new AiProfile { Id = Warden, Aggression = 0.75, Caution = 1.5, Overwatch = 1.7, Suppress = 1.6, Throw = 0.8, Melee = 0.6, Focus = 1.0, Protect = 1.2, Flank = 0.9, Cohesion = 1.0, Prisoners = 1.5, Nerve = 1.35, LeaderBond = 0.8, ArrestFirst = true },
            [Guard] = new AiProfile { Id = Guard, Aggression = 0.9, Caution = 1.2, Overwatch = 1.1, Suppress = 0.8, Throw = 0.9, Melee = 0.8, Protect = 1.0, Cohesion = 0.8, Prisoners = 0.5, Nerve = 1.1 },
            // machines by programme: the highest expected damage, relentless, predictable, no fear
            [Machine] = new AiProfile { Id = Machine, Aggression = 1.15, Caution = 0.45, Overwatch = 1.0, Suppress = 1.0, Throw = 0, Melee = 1, Focus = 1.2, Protect = 0, Flank = 0.6, Cohesion = 0, NoMorale = true, Predictable = true },
            // animals by instinct: charge, surround the weak, no cover, no tools, run when hurt
            [Animal] = new AiProfile { Id = Animal, Aggression = 1.6, Caution = 0, Overwatch = 0, Suppress = 0, Throw = 0, Melee = 2, Focus = 1.4, Protect = 0, Flank = 1.5, Cohesion = 0.6, FleeHp = 0.3, Instinct = true },
            [Fighter] = new AiProfile { Id = Fighter },
            [Civilian] = new AiProfile { Id = Civilian, Aggression = 0.55, Caution = 1.6, Overwatch = 0.4, Suppress = 0.2, Throw = 0.5, Melee = 0.7, Focus = 0.8, Nerve = 0.7 },
            [Companion] = new AiProfile { Id = Companion, Caution = 1.2, Overwatch = 1.0, Suppress = 1.0, Protect = 1.3, Cohesion = 0.8, Prisoners = 1.0, Nerve = 1.2 },
        };

        /// <summary>Content factions to archetypes.</summary>
        public static readonly Dictionary<string, string> ByFaction = new()
        {
            ["rust_dogs"] = Raider, ["pale"] = Raider, ["gilt"] = Raider, ["rustmouths"] = Raider, ["the_shift"] = Raider,
            ["wardens"] = Warden,
            ["tollmen"] = Guard, ["shale_militia"] = Guard, ["tenured"] = Guard, ["concern"] = Guard,
            ["wheel"] = Fighter, ["cistern9"] = Civilian, ["choir"] = Civilian, ["menders"] = Civilian, ["saints"] = Civilian, ["knock"] = Fighter,
        };

        /// <summary>Content teams to archetypes (when the faction says nothing).</summary>
        public static readonly Dictionary<string, string> ByTeam = new()
        {
            ["rustdogs"] = Raider, ["dev_raiders"] = Raider, ["tanner"] = Raider, ["grel"] = Raider, ["road"] = Raider,
            ["wardens"] = Warden, ["tollmen"] = Guard, ["tenured"] = Guard, ["pale"] = Raider, ["gilt"] = Raider, ["rustmouths"] = Raider,
            ["machines"] = Machine, ["ledger"] = Machine, ["drones"] = Machine, ["beasts"] = Animal, ["animals"] = Animal, ["wild"] = Animal,
            ["player"] = Companion,
        };

        /// <summary>Content roles to archetypes (they win over the faction for raiders, guards, machines and beasts).</summary>
        public static readonly Dictionary<string, string> ByRole = new()
        {
            ["raider"] = Raider, ["guard"] = Guard, ["machine"] = Machine, ["robot"] = Machine, ["drone"] = Machine, ["turret"] = Machine,
            ["animal"] = Animal, ["beast"] = Animal,
            ["settler"] = Civilian, ["labourer"] = Civilian, ["trader"] = Civilian, ["fisher"] = Civilian, ["medic"] = Civilian, ["pilgrim"] = Civilian,
        };

        /// <summary>The archetype of a content NPC.</summary>
        public static string OfDef(SecondFace.Core.Npc.NpcDef d)
        {
            if (d == null) return Fighter;
            if (d.Role != null && ByRole.TryGetValue(d.Role, out var r) && (r == Raider || r == Guard || r == Machine || r == Animal))
                return r == Guard && d.Faction == "wardens" ? Warden : r;
            if (d.Natural != null && (d.Equip == null || d.Equip.Count == 0)) return Animal;
            if (d.Faction != null && ByFaction.TryGetValue(d.Faction, out var f)) return f;
            if (d.Team != null && ByTeam.TryGetValue(d.Team, out var t)) return t;
            if (d.Role != null && ByRole.TryGetValue(d.Role, out var r2)) return d.Equip != null && d.Equip.Count > 0 && r2 == Civilian ? Fighter : r2;
            return Fighter;
        }

        /// <summary>The archetype a battle unit plays by: its own if set, the player's side as companions, else its
        /// content NPC's (looked up by id), else by its team.</summary>
        public static string Of(BattleUnit u)
        {
            if (u.Archetype != null) return u.Archetype;
            if (u.C.IsPlayer || !u.Hostile) return Companion;
            if (u.C.Id != null && Registry.Npcs != null && Registry.Npcs.TryGetValue(u.C.Id, out var d)) return u.Archetype = OfDef(d);
            if (u.C.Natural != null && (u.C.Inv == null || u.C.Inv.Equipped.Count == 0)) return u.Archetype = Animal;
            return u.Archetype = u.C.Team != null && ByTeam.TryGetValue(u.C.Team, out var t) ? t : Fighter;
        }

        private static readonly Dictionary<(string, string), AiProfile> _shaped = new();

        /// <summary>An archetype's profile shaped by a difficulty (cached).</summary>
        public static AiProfile Profile(string archetype, CombatDifficulty d)
        {
            d ??= CombatDifficulty.Normal;
            var key = (archetype ?? Fighter, d.Id + d.Noise + d.Focus + d.ReadThreats);
            lock (_shaped)
            {
                if (_shaped.TryGetValue(key, out var p)) return p;
                var b = Profiles.TryGetValue(archetype ?? Fighter, out var bp) ? bp : Profiles[Fighter];
                p = b.Clone();
                p.Focus *= d.Focus; p.Flank *= d.Flank; p.Throw *= d.Throw; p.Caution *= d.Caution; p.Aggression *= d.Aggression;
                p.Noise = p.Predictable ? 0 : d.Noise; p.ReadThreats = d.ReadThreats; p.Mercy = d.Mercy; p.Coordinate = d.Coordinate;
                _shaped[key] = p;
                return p;
            }
        }
    }
}
