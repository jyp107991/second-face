using System;
using System.Collections.Generic;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Combat
{
    /// <summary>A status on a fighter for a number of their turns (COMBAT.md C6).</summary>
    public sealed class StatusEffect
    {
        public string Id;
        /// <summary>Turns left: counted down at the end of each of the bearer's turns (1 = through their next turn).</summary>
        public int Turns;
        /// <summary>Strength where it varies (bleeding per turn, the AP a suppression takes, the adrenaline AP).</summary>
        public int Power;
        /// <summary>Who put it there (the kill, and its XP, go to them).</summary>
        public string From;
        /// <summary>Put on during the bearer's own turn: that turn's end does not count it down.</summary>
        public bool Fresh;
    }

    /// <summary>
    /// Statuses in a fight (COMBAT.md C6): bleeding (a blade's deep cut: health each turn until bound), burning (fire:
    /// health each turn, put out by water or by dropping prone), blinded (a flash: aim ruined, overwatch lost), suppressed
    /// (pinned by fire: AP and aim lost, moving draws the suppressor's shot), choking (a chem cloud: health and AP), shocked
    /// (current through water: health, maybe the turn), adrenaline (being hit: AP next turn). Stunned is the combatant's
    /// own flag (a lost turn); crippled limbs live on the sheet (they outlast the fight); prone is a stance.
    /// </summary>
    public static class Status
    {
        public const string Bleeding = "bleeding", Burning = "burning", Blinded = "blinded", Suppressed = "suppressed",
            Choking = "choking", Shocked = "shocked", Adrenaline = "adrenaline";

        /// <summary>Every status the UI may show (the combatant's statuses, then the derived ones: stunned, prone,
        /// crippled limbs).</summary>
        public static readonly string[] All = { Bleeding, Burning, Blinded, Suppressed, Choking, Shocked, Adrenaline, "stunned", "prone", "crouch", "crippled_arm", "crippled_leg", "crippled_eyes" };

        public static StatusEffect Get(Combatant c, string id)
        {
            if (c?.Statuses == null) return null;
            foreach (var s in c.Statuses) if (s.Id == id) return s;
            return null;
        }

        public static bool Has(Combatant c, string id) => Get(c, id) != null;

        /// <summary>Adds a status, or refreshes it (the longer duration and the stronger power win).</summary>
        public static StatusEffect Add(Combatant c, string id, int turns, int power = 0, string from = null)
        {
            var s = Get(c, id);
            if (s == null) { s = new StatusEffect { Id = id, Turns = turns, Power = power, From = from, Fresh = c.InTurn }; c.Statuses.Add(s); return s; }
            if (turns > s.Turns && c.InTurn) s.Fresh = true;
            s.Turns = Math.Max(s.Turns, turns);
            s.Power = Math.Max(s.Power, power);
            if (from != null) s.From = from;
            return s;
        }

        public static bool Remove(Combatant c, string id) => c.Statuses.RemoveAll(s => s.Id == id) > 0;

        /// <summary>The AP a fighter starts the turn with less (positive) or more (negative) from their statuses.</summary>
        public static int ApChange(Combatant c)
        {
            var d = 0;
            foreach (var s in c.Statuses)
            {
                if (s.Id == Suppressed) d += Math.Max(1, s.Power);
                else if (s.Id == Choking) d += 1;
                else if (s.Id == Adrenaline) d -= Math.Min(2, Math.Max(1, s.Power));
            }
            return d;
        }

        /// <summary>The aim the attacker loses to their own statuses (ranged and melee).</summary>
        public static int AimPenalty(Combatant c, bool melee)
        {
            var p = 0;
            if (Has(c, Blinded)) p += melee ? 20 : 40;
            if (Has(c, Suppressed)) p += 15;
            if (Has(c, Choking)) p += 5;
            return p;
        }

        /// <summary>What hurts at the start of a fighter's turn: bleeding, burning, choking, shock (armour and resistances
        /// as they apply). Returns the damage done and the lines for the log; the turn is lost to a shock's stun.</summary>
        public static (int Damage, string From, List<string> Lines) TurnStart(Rng rng, Combatant c)
        {
            var lines = new List<string>();
            var total = 0; string from = null;
            if (c.Statuses.Count == 0) return (0, null, lines);
            var d = Sheet.Derived(c.Sheet);
            foreach (var s in c.Statuses.ToArray())
            {
                var dmg = 0;
                switch (s.Id)
                {
                    case Bleeding: dmg = Math.Max(1, s.Power); lines.Add($"{c.Name} bleeds ({dmg})."); break;
                    case Burning: dmg = Math.Max(1, rng.Int(3, 6) - d.Dt / 2); lines.Add($"{c.Name} burns ({dmg})."); break;
                    case Choking: dmg = Math.Max(1, Num.RoundInt(rng.Int(3, 5) * (1 - Math.Min(80, d.PoisonResist) / 100.0))); lines.Add($"{c.Name} chokes ({dmg})."); break;
                    case Shocked: dmg = Math.Max(1, rng.Int(4, 8)); lines.Add($"{c.Name} is shocked ({dmg})."); break;
                }
                if (dmg <= 0) continue;
                total += dmg;
                from ??= s.From;
            }
            if (total > 0) c.Sheet.Hp = Math.Max(0, c.Sheet.Hp - total);
            return (total, from, lines);
        }

        /// <summary>The end of the bearer's turn: every status counts down; the spent ones go.</summary>
        public static void TurnEnd(Combatant c)
        {
            foreach (var s in c.Statuses) { if (s.Fresh) s.Fresh = false; else s.Turns--; }
            c.Statuses.RemoveAll(s => s.Turns <= 0);
        }

        /// <summary>A heal stops the bleeding; water and a roll on the ground put out the flames.</summary>
        public static void Bound(Combatant c) => Remove(c, Bleeding);
        public static void Doused(Combatant c) => Remove(c, Burning);

        /// <summary>Everything the fighter carries for the UI's status icons (with the turns left; 0 for the lasting ones).</summary>
        public static List<(string Id, int Turns)> View(Combatant c)
        {
            var v = new List<(string, int)>();
            foreach (var s in c.Statuses) v.Add((s.Id, s.Turns));
            if (c.Stunned) v.Add(("stunned", 1));
            if (c.Stance == Stances.Prone) v.Add(("prone", 0));
            else if (c.Stance == Stances.Crouch) v.Add(("crouch", 0));
            var sh = c.Sheet;
            if (sh != null)
            {
                if (sh.IsCrippled("armL") || sh.IsCrippled("armR")) v.Add(("crippled_arm", 0));
                if (sh.IsCrippled("legL") || sh.IsCrippled("legR")) v.Add(("crippled_leg", 0));
                if (sh.IsCrippled("eyes")) v.Add(("crippled_eyes", 0));
            }
            return v;
        }
    }
}
