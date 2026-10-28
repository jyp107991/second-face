using System;
using System.Collections.Generic;
using SecondFace.Core.Content;

namespace SecondFace.Core.Stats
{
    public sealed class InstalledChrome
    {
        public string Id;
        /// <summary>1 = perfect; below Working it stops working; degrades when upkeep is missed.</summary>
        public double Condition;
        public int InstalledDay;
        /// <summary>Day the next upkeep is due.</summary>
        public int? UpkeepDue;
    }

    public struct InstalledPiece { public string Slot; public InstalledChrome Piece; public ChromeDef Def; }

    /// <summary>Chrome rules (port of stats/chrome.ts): installed pieces, Drift, surgery and upkeep.</summary>
    public static class Chrome
    {
        public static readonly string[] Slots = { "eyes", "neural", "armL", "armR", "legs", "spine", "skin", "organs" };
        /// <summary>Condition below which a piece stops working (abilities and mods off).</summary>
        public const double Working = 0.4;

        public static ChromeDef Def(string id) => Registry.Chrome.TryGetValue(id, out var d) ? d : null;

        /// <summary>Installed pieces with their definitions, in slot order.</summary>
        public static List<InstalledPiece> Installed(CharacterSheet s)
        {
            var outList = new List<InstalledPiece>();
            if (s.Chrome == null) return outList;
            foreach (var slot in Slots)
            {
                if (!s.Chrome.TryGetValue(slot, out var piece) || piece == null) continue;
                var def = Def(piece.Id);
                if (def != null) outList.Add(new InstalledPiece { Slot = slot, Piece = piece, Def = def });
            }
            return outList;
        }

        /// <summary>Modifiers of working chrome.</summary>
        public static IEnumerable<Modifier> Mods(CharacterSheet s)
        {
            foreach (var c in Installed(s))
            {
                if (c.Piece.Condition < Working || c.Def.Mods == null) continue;
                foreach (var m in c.Def.Mods) yield return m;
            }
        }

        public static IEnumerable<string> Abilities(CharacterSheet s)
        {
            foreach (var c in Installed(s))
            {
                if (c.Piece.Condition < Working || c.Def.Abilities == null) continue;
                foreach (var a in c.Def.Abilities) yield return a;
            }
        }

        private static double GradeDrift(string grade) => grade == "old" ? 1.15 : grade == "dark" ? 1.25 : 0.8;

        /// <summary>The Drift a body settles towards with its chrome, eased by Grit (each point above 5 takes 4% off).</summary>
        public static int DriftBaseline(CharacterSheet s, int grit)
        {
            double load = 0;
            foreach (var c in Installed(s)) load += c.Def.Drift * GradeDrift(c.Def.Grade);
            return (int)Num.Clamp(Num.Round(load * (1 - 0.04 * (grit - 5))), 0, 100);
        }

        /// <summary>steady &lt;25 · cool 25–49 · cold 50–74 · drifting 75+.</summary>
        public static string DriftBand(double drift) => drift >= 75 ? "drifting" : drift >= 50 ? "cold" : drift >= 25 ? "cool" : "steady";

        /// <summary>One day passes: Drift moves a third of the way to the baseline, less `calm`.</summary>
        public static double SettleDrift(CharacterSheet s, int grit, double calm = 0)
        {
            double b = DriftBaseline(s, grit);
            double cur = s.Drift ?? 0;
            double next = cur + (b - cur) / 3 - calm;
            s.Drift = Num.Clamp(Num.Round(next * 10) / 10, 0, 100);
            return s.Drift.Value;
        }

        /// <summary>Chance per tense moment of a Drift episode.</summary>
        public static double EpisodeChance(double drift) => drift < 75 ? 0 : Math.Min(0.5, 0.05 + (drift - 75) * 0.018);

        /// <summary>Risk of the operation: base 5%, +1% per point of Medicine short of the difficulty, old chrome +8%, Grit above 5 −1.5% a point; 3–65%.</summary>
        public static double SurgeryRisk(ChromeDef def, int surgeonMedicine, int patientGrit)
        {
            double r = 0.05 + Math.Max(0, def.Surgery.Difficulty - surgeonMedicine) / 100.0 + (def.Grade == "old" ? 0.08 : 0) - (patientGrit - 5) * 0.015;
            return Num.Clamp(r, 0.03, 0.65);
        }

        /// <summary>Install a piece (replacing the slot's). `roll` 0..1: under half the risk it is rejected; under the risk, a complication.</summary>
        public static string Install(CharacterSheet s, string id, int day, int surgeonMedicine, int patientGrit, double roll)
        {
            var def = Def(id) ?? throw new ArgumentException($"Unknown chrome {id}");
            var risk = SurgeryRisk(def, surgeonMedicine, patientGrit);
            if (roll < risk / 2) return "rejected";
            var outcome = roll < risk ? "complication" : "clean";
            s.Chrome ??= new Dictionary<string, InstalledChrome>();
            s.Chrome[def.Slot] = new InstalledChrome { Id = id, Condition = outcome == "clean" ? 1 : 0.6, InstalledDay = day, UpkeepDue = def.Upkeep != null ? day + def.Upkeep.EveryDays : null };
            return outcome;
        }

        public static InstalledChrome Remove(CharacterSheet s, string slot)
        {
            if (s.Chrome == null || !s.Chrome.TryGetValue(slot, out var p)) return null;
            s.Chrome.Remove(slot);
            return p;
        }

        /// <summary>Daily upkeep: a due piece consumes its item or loses 0.1 condition. Returns the slots that went without.</summary>
        public static List<string> TickUpkeep(CharacterSheet s, int day, Func<string, bool> consume)
        {
            var missed = new List<string>();
            foreach (var c in Installed(s))
            {
                if (c.Def.Upkeep == null || c.Piece.UpkeepDue == null || day < c.Piece.UpkeepDue) continue;
                if (consume(c.Def.Upkeep.Item)) c.Piece.UpkeepDue = day + c.Def.Upkeep.EveryDays;
                else { c.Piece.Condition = Math.Max(0, Num.Round((c.Piece.Condition - 0.1) * 100) / 100); missed.Add(c.Slot); }
            }
            return missed;
        }

        public static void Repair(CharacterSheet s, string slot, double amount)
        {
            if (s.Chrome != null && s.Chrome.TryGetValue(slot, out var p) && p != null) p.Condition = Math.Min(1, p.Condition + amount);
        }

        /// <summary>Visible chrome, working or not (how people read you).</summary>
        public static List<ChromeDef> Visible(CharacterSheet s)
        {
            var outList = new List<ChromeDef>();
            foreach (var c in Installed(s)) if (c.Def.Visible) outList.Add(c.Def);
            return outList;
        }
    }
}
