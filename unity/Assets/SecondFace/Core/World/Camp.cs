using System;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.Stats;

namespace SecondFace.Core.World
{
    /// <summary>A rest taken: how long, how much health came back, whether there was water and food.</summary>
    public sealed class Rested { public int Hours; public int Healed; public bool Water; public bool Food; }

    /// <summary>
    /// Camp (P6.1, DESIGN §2f; port of ui/camp.ts): rest (time passes and heals; a drink each time and, for six hours or
    /// more, a meal, each missing halving the healing; the party heals too), cook what is raw (half an hour), mend a worn
    /// thing with a repair kit (an hour, +35 % condition), hunt (three hours, by Survival, the land's abundance and the
    /// hour) and set or check snares (a wire and a scrap; they take days, and nothing about them runs out).
    /// </summary>
    public static class Camp
    {
        /// <summary>The props a camp can be made at (a place's markers of kind "fire").</summary>
        public static readonly string[] Fires = { "campfire", "fire_barrel" };

        public static bool IsFire(string kind) => Array.IndexOf(Fires, kind) >= 0;

        /// <summary>How much game the open land has, by its biome (0..1). A place's map says its own (<c>hunting</c>);
        /// out on the land the wet north and the shore are rich, the scrub and the hills fair, the ash and the glass thin,
        /// the megacity's ground bare.</summary>
        public static double WildGame(string biome) => biome switch
        {
            "northern_wet" => 0.6,
            "drowned_shore" => 0.45,
            "sallow" => 0.4,
            "teeth" => 0.35,
            "rail_corridor" => 0.3,
            "ashlands" => 0.15,
            "glass_flats" => 0.1,
            "meridian" => 0.05,
            _ => 0.3,
        };

        /// <summary>Where snares out on the open land are kept: the 200 m square they were set in, so they are found
        /// again where they were left (a place's are kept under its map).</summary>
        public static string WildSpot(float x, float z) => $"wild_{(int)Math.Floor(x / 200f)}_{(int)Math.Floor(z / 200f)}";

        /// <summary>Everyone whole again (a mender's work, a bed of one's own: the content's <c>heal</c> event): full
        /// health and no crippled limbs, the player and the party.</summary>
        public static void HealAll(GameState g)
        {
            void Whole(CharacterSheet s)
            {
                if (s == null) return;
                s.Hp = Sheet.Derived(s).MaxHp;
                s.Crippled.Clear();
            }
            Whole(g.Pc.Sheet);
            foreach (var id in g.World.Party)
                if (g.Companions != null && g.Companions.TryGetValue(id, out var c)) Whole(c.Sheet);
        }

        /// <summary>Water carried (clean or not) and things to eat, for the camp's line.</summary>
        public static (int Water, int Food) Supplies(GameState g)
        {
            var inv = g.Pc.Inventory;
            var food = inv.Items.Where(i => Items.Has(i.Def) && Items.Def(i.Def).Consumable?.Effects.Any(e => e.Kind == "food") == true).Sum(i => i.Qty);
            return (Inv.CountItem(inv, "c_water") + Inv.CountItem(inv, "c_dirtywater"), food);
        }

        /// <summary>Hours of rest until six in the morning.</summary>
        public static int UntilMorning(double minutes)
        {
            var until = 24 - (minutes / 60 % 24) + 6;
            var h = Num.RoundInt(until % 24);
            return h == 0 ? 24 : h;
        }

        /// <summary>The long rest the hour suggests: by day (six to six) until the evening (seven), at night until the
        /// morning (six); its hours and which it is.</summary>
        public static (int Hours, bool Morning) UntilNext(double minutes)
        {
            var hour = minutes / 60 % 24;
            if (hour >= 6 && hour < 18) return (Math.Max(1, Num.RoundInt(19 - hour)), false);
            return (UntilMorning(minutes), true);
        }

        public static Rested Rest(GameState g, int hours)
        {
            var pc = g.Pc;
            var d = Sheet.Derived(pc.Sheet);
            var water = Inv.RemoveItem(pc.Inventory, "c_water", 1) > 0 || Inv.RemoveItem(pc.Inventory, "c_dirtywater", 1) > 0;
            var food = hours < 6;
            if (hours >= 6)
            {
                var at = pc.Inventory.Items.FindIndex(i => Items.Has(i.Def) && Items.Def(i.Def).Consumable?.Effects.Any(e => e.Kind == "food") == true);
                if (at >= 0) { Inv.TakeAt(pc.Inventory, at, 1); food = true; }
            }
            var k = (water ? 1 : 0.5) * (food ? 1 : 0.5);
            var heal = Num.RoundInt(d.HealRate * hours * k);
            pc.Sheet.Hp = Math.Min(d.MaxHp, pc.Sheet.Hp + heal);
            foreach (var id in g.World.Party)
            {
                if (g.Companions == null || !g.Companions.TryGetValue(id, out var c) || c.Sheet == null) continue;
                var cd = Sheet.Derived(c.Sheet);
                c.Sheet.Hp = Math.Min(cd.MaxHp, c.Sheet.Hp + Num.RoundInt(cd.HealRate * hours * k));
            }
            g.Minutes += hours * 60;
            return new Rested { Hours = hours, Healed = heal, Water = water, Food = food };
        }

        /// <summary>Whether anything carried can be cooked.</summary>
        public static bool CanCook(GameState g) => g.Pc.Inventory.Items.Any(i => Items.Has(i.Def) && !string.IsNullOrEmpty(Items.Def(i.Def).CookTo));

        /// <summary>Cooks everything raw (half an hour); returns how many stacks.</summary>
        public static int Cook(GameState g)
        {
            var inv = g.Pc.Inventory;
            var raw = inv.Items.Where(i => Items.Has(i.Def) && !string.IsNullOrEmpty(Items.Def(i.Def).CookTo)).ToList();
            foreach (var it in raw)
            {
                var to = Items.Def(it.Def).CookTo;
                var n = it.Qty;
                Inv.RemoveItem(inv, it.Def, n);
                if (Items.Has(to)) Inv.AddItem(inv, Inv.MakeItem(to, n));
            }
            if (raw.Count > 0) g.Minutes += 30;
            return raw.Count;
        }

        public static int RepairKits(GameState g) => Inv.CountItem(g.Pc.Inventory, "t_repair");

        /// <summary>Mends a worn thing in a slot with a repair kit (an hour); false without a kit or a worn thing.</summary>
        public static bool Mend(GameState g, string slot)
        {
            var it = g.Pc.Inventory.EquippedAt(slot);
            if (it?.Cond == null || it.Cond >= 1 || Inv.RemoveItem(g.Pc.Inventory, "t_repair", 1) == 0) return false;
            Inv.Repair(it, 0.35);
            g.Minutes += 60;
            return true;
        }

        /// <summary>Three hours' hunting where the land has this much game.</summary>
        public static HuntOutcome Hunt(GameState g, double abundance, Rng rng)
        {
            var r = Hunting.Hunt(g.Pc.Sheet, abundance, rng, g.Minutes / 60 % 24);
            g.Minutes += r.Hours * 60;
            if (r.Meat > 0 && Items.Has("c_meat")) Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("c_meat", r.Meat));
            if (r.Hides > 0 && Items.Has("j_hide")) Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("j_hide", r.Hides));
            return r;
        }

        /// <summary>The snares out where a map is (null when none).</summary>
        public static TrapLine Traps(GameState g, string mapId) =>
            g.World.Traps is JObject o && o[mapId] is JObject t ? t.ToObject<TrapLine>() : null;

        public static bool CanSetTraps(GameState g) => Inv.CountItem(g.Pc.Inventory, "j_wiring") >= 1 && Inv.CountItem(g.Pc.Inventory, "j_scrap") >= 1;

        /// <summary>Two snares on the runs (a wire and a scrap, forty minutes).</summary>
        public static bool SetTraps(GameState g, string mapId)
        {
            if (!CanSetTraps(g) || Traps(g, mapId) != null) return false;
            Inv.RemoveItem(g.Pc.Inventory, "j_wiring", 1);
            Inv.RemoveItem(g.Pc.Inventory, "j_scrap", 1);
            var o = g.World.Traps as JObject ?? new JObject();
            o[mapId] = JObject.FromObject(new TrapLine { MapId = mapId, SetAt = g.Minutes, Count = 2 });
            g.World.Traps = o;
            g.Minutes += 40;
            return true;
        }

        /// <summary>Takes the snares up with what they caught (-1 when there were none out).</summary>
        public static int CheckTraps(GameState g, string mapId, double abundance)
        {
            var line = Traps(g, mapId);
            if (line == null) return -1;
            var n = Hunting.TrapYield(line, g.Minutes, abundance, g.Pc.Sheet);
            ((JObject)g.World.Traps).Remove(mapId);
            if (n > 0 && Items.Has("c_meat")) Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("c_meat", n));
            return n;
        }
    }
}
