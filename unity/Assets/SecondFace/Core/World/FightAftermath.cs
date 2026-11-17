using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Npc;
using SecondFace.Core.Scene;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>
    /// What a fight leaves behind in the game's state, as the content reads it afterwards (Game <c>Combat.Finish</c> and
    /// <c>Triggers</c> act on these rules):
    /// <list type="bullet">
    /// <item>the fallen are written dead under their definition and under their placement's own id (the content's
    /// <c>dead</c> condition names a placement, as the web game kept its people by placement: one person standing in two
    /// places of a map under two ids);</item>
    /// <item>a fight the player lost to people whose content has a <c>beaten</c> outcome goes on: those effects apply
    /// (each distinct list once, however many of them carried it) and the player is left hurt, never sent to the title
    /// (<see cref="Beaten"/>);</item>
    /// <item>a map's triggers whose condition the fight's end made true are due at once where the player stands
    /// (<see cref="Due"/>), fired once unless the content says otherwise (the flag <c>trg.&lt;map&gt;.&lt;id&gt;</c>).</item>
    /// </list>
    /// </summary>
    public static class FightAftermath
    {
        /// <summary>A fallen fighter written dead: under their definition, and under their placement's id when it differs.</summary>
        public static void Fell(GameState g, string defId, string placementId = null)
        {
            foreach (var id in new[] { defId, placementId })
            {
                if (string.IsNullOrEmpty(id)) continue;
                if (!g.Npcs.TryGetValue(id, out var save)) g.Npcs[id] = save = new NpcSave();
                save.Dead = true;
            }
        }

        /// <summary>The <c>beaten</c> outcomes of the people who won a fight against the player, each distinct list once, in
        /// the order the victors are given (empty: nobody's content says what follows, and a lost fight ends the game).</summary>
        public static List<JArray> Beaten(IEnumerable<NpcDef> victors)
        {
            var seen = new HashSet<string>();
            var outcomes = new List<JArray>();
            if (victors == null) return outcomes;
            foreach (var d in victors)
            {
                if (d?.Beaten == null || d.Beaten.Count == 0) continue;
                if (seen.Add(d.Beaten.ToString(Formatting.None))) outcomes.Add(d.Beaten);
            }
            return outcomes;
        }

        /// <summary>The player's health after a fight lost forward: a quarter of their most, at least one.</summary>
        public static int HurtHp(int maxHp) => System.Math.Max(1, maxHp / 4);

        /// <summary>The flag that remembers a trigger fired (a save keeps it).</summary>
        public static string FiredFlag(string map, string trigger) => $"trg.{map}.{trigger}";

        /// <summary>A trigger is due now: not yet fired (when it fires once) and its condition holds.</summary>
        public static bool Due(string map, TriggerDef def, GameState g)
        {
            if (def == null) return false;
            if ((def.Once ?? true) && g.Flags.ContainsKey(FiredFlag(map, def.Id))) return false;
            return def.If == null || Logic.Test(def.If, g);
        }

        /// <summary>A map's triggers due now, for those the player stands inside (<paramref name="under"/>; null: all).</summary>
        public static List<TriggerDef> Due(MapDef map, GameState g, System.Func<TriggerDef, bool> under = null)
        {
            var due = new List<TriggerDef>();
            if (map?.Triggers == null) return due;
            foreach (var t in map.Triggers)
                if ((under == null || under(t)) && Due(map.Id, t, g)) due.Add(t);
            return due;
        }

        /// <summary>Marks a trigger fired (when it fires once).</summary>
        public static void Mark(string map, TriggerDef def, GameState g)
        {
            if (def != null && (def.Once ?? true)) g.Flags[FiredFlag(map, def.Id)] = true;
        }
    }
}
