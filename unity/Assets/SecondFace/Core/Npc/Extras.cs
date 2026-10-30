using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Scene;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// The background people of a place (P4.13 step 5; port of npc/extras.ts, the owner's note: everywhere alive with
    /// people of every function): a map says how many of what trade work, sit, lean, talk or wander where and when
    /// (<see cref="ExtrasDef"/>), and they are made from the map's seed, the same people every time. Each is a person of
    /// their own (<see cref="Bodies"/>: sex, body, face, a first name from their ancestry), dressed for their trade
    /// (the outfit rules), with a routine: at their spot through their hours (a spot's name says what is done there:
    /// <c>*_work</c>, <c>*_sit</c>, <c>*_lean</c>, <c>*_pair_a/b</c> two talking), or wandering about a tile of their
    /// area; away outside their hours. They talk the trade's small talk (<c>d_x_&lt;role&gt;</c>) and bark; they are
    /// not in the notebook.
    /// </summary>
    public static class Extras
    {
        public sealed class Extra
        {
            public NpcDef Def;
            public NpcPlacement Placement;
            public bool Male;
            public PlayerLook Look;
            /// <summary>Where they keep: a spot of the map, else a tile of its area.</summary>
            public string Spot;
            public Tile At;
        }

        public static readonly string[] DefaultRoles = { "settler", "settler", "labourer", "trader" };

        /// <summary>The share of men in a trade, out here (the rest women).</summary>
        public static double MaleShare(string role) => role switch
        {
            "raider" => 0.75, "guard" => 0.7, "labourer" => 0.65, "nomad" => 0.55, "fisher" => 0.6,
            "medic" => 0.4, "pilgrim" => 0.45, "street" => 0.5, "gilded" => 0.5, _ => 0.5,
        };

        private static readonly Dictionary<string, (string[] M, string[] F)> Names = new()
        {
            ["west_african"] = (new[] { "Kofi", "Sekou", "Abel", "Tunde", "Ezra", "Femi", "Jonah", "Obi" }, new[] { "Ama", "Nia", "Efua", "Adaeze", "Sade", "Mabel", "Tiwa", "Ruth" }),
            ["east_african"] = (new[] { "Dawit", "Tesfa", "Abram", "Yonas", "Kal", "Samuel", "Biruk", "Eli" }, new[] { "Hana", "Sena", "Marta", "Liya", "Rahel", "Tigist", "Adina", "Selam" }),
            ["north_european"] = (new[] { "Lars", "Tom", "Piet", "Arne", "Jory", "Bram", "Cal", "Wil" }, new[] { "Greta", "Ida", "Ann", "Lotte", "Maren", "Edda", "Jen", "Sig" }),
            ["mediterranean"] = (new[] { "Luca", "Dario", "Tomas", "Elio", "Nico", "Sal", "Marco", "Rafe" }, new[] { "Lena", "Rosa", "Mira", "Ines", "Carla", "Bea", "Noor", "Pia" }),
            ["south_asian"] = (new[] { "Arjun", "Ravi", "Dev", "Kiran", "Sam", "Vik", "Anil", "Raj" }, new[] { "Priya", "Asha", "Meera", "Nila", "Tara", "Riya", "Suni", "Veda" }),
            ["east_asian"] = (new[] { "Jin", "Hiro", "Wen", "Taeo", "Kenji", "Min", "Bo", "Ren" }, new[] { "Mei", "Yuki", "Hana", "Lin", "Sora", "Ji", "Aya", "Rin" }),
            ["southeast_asian"] = (new[] { "Bayu", "Arif", "Tono", "Kai", "Dion", "Nam", "Rizal", "Teo" }, new[] { "Sari", "Dewi", "Mai", "Lia", "Ana", "Nita", "Thuy", "Kim" }),
            ["indigenous_american"] = (new[] { "Tahoma", "Niko", "Ahanu", "Cal", "Mato", "Eli", "Ren", "Sol" }, new[] { "Ayla", "Nita", "Kaya", "Wren", "Tala", "Mina", "Sora", "Ona" }),
            ["latin_american"] = (new[] { "Mateo", "Luis", "Javi", "Tomas", "Rafa", "Nico", "Emilio", "Cruz" }, new[] { "Lucia", "Ana", "Sol", "Marisol", "Paz", "Ines", "Vera", "Rocio" }),
        };

        private static readonly Dictionary<string, string[]> RoleBarks = new()
        {
            ["settler"] = new[] { "Mind yourself.", "Dust's up again.", "Water's dear this month.", "You're not from here." },
            ["labourer"] = new[] { "Back's gone. Don't get old.", "Two more loads and I'm done.", "Mind the rope." },
            ["trader"] = new[] { "Looking or buying?", "Prices are posted. Don't ask twice.", "Guild scrip's good here. Mostly." },
            ["drifter"] = new[] { "Don't.", "Spare a water?", "I was somewhere once." },
            ["pilgrim"] = new[] { "The sky is open.", "Bless you, friend.", "We bury under the sky." },
            ["raider"] = new[] { "What are you looking at.", "Keep walking.", "Kessler counts us." },
            ["guard"] = new[] { "Move along.", "Nothing to see.", "Papers, if you're asked." },
            ["nomad"] = new[] { "Horses first.", "The Wheel turns.", "Trade or go." },
            ["street"] = new[] { "Got a light?", "Not here. Not tonight.", "Everyone's got a price." },
            ["medic"] = new[] { "Wash it. Then come back.", "Don't pick at it." },
        };

        /// <summary>Every extra a map asks for.</summary>
        public static List<Extra> Of(MapDef map)
        {
            var l = new List<Extra>();
            if (map?.Extras == null) return l;
            for (var i = 0; i < map.Extras.Count; i++) l.AddRange(Make(map, i, map.Extras[i]));
            return l;
        }

        /// <summary>The extras of one of a map's definitions (ids <c>x_&lt;map&gt;_&lt;index&gt;_&lt;k&gt;</c>).</summary>
        public static List<Extra> Make(MapDef map, int index, ExtrasDef def)
        {
            var mapSeed = map.Seed.HasValue ? (uint)(long)map.Seed.Value : Bodies.Seed(map.Id);
            var rng = new Rng(unchecked(mapSeed * 7919u + (uint)index * 104729u));
            var community = Bodies.Community(mapSeed);   // the place's own mix of people
            var roles = def.Roles != null && def.Roles.Count > 0 ? def.Roles : DefaultRoles.ToList();
            var spots = def.Spots ?? new List<string>();
            var out_ = new List<Extra>();
            for (var k = 0; k < def.Count; k++)
            {
                var id = $"x_{map.Id}_{index}_{k}";
                var seed = 50000 + (int)((mapSeed * 131L + index * 977L + k * 7L) % 40000);
                var role = rng.Pick(roles);
                var age = def.Ages != null && def.Ages.Count >= 2 ? Math.Round(rng.Range(def.Ages[0], def.Ages[1])) : Math.Round(17 + 50 * rng.Next() * rng.Next() + 10 * rng.Next());
                var male = rng.Chance(MaleShare(role));
                var look = Bodies.For(id, male, age, role, community: community);
                var pool = Names[Pool(look, rng)];
                var name = rng.Pick(male ? pool.M : pool.F);
                // a spot each while they last, then about the area; a definition with neither keeps them at the map's middle
                string spot = null;
                Tile at = null;
                if (spots.Count > 0 && (def.Area == null || k < spots.Count)) spot = spots[k % spots.Count];
                else if (def.Area != null) at = new Tile(def.Area.X + rng.Int(0, Math.Max(0, def.Area.W - 1)), def.Area.Y + rng.Int(0, Math.Max(0, def.Area.H - 1)));
                var activity = spot != null ? SpotActivity(spot) : "patrol";
                var schedule = new List<ScheduleEntry>();
                if (def.Hours != null)
                {
                    schedule.Add(new ScheduleEntry { From = def.Hours.From, To = def.Hours.To, Spot = spot, At = at, Activity = activity });
                    schedule.Add(new ScheduleEntry { From = def.Hours.To, To = def.Hours.From, Activity = "away" });
                }
                else schedule.Add(new ScheduleEntry { From = 0, To = 24, Spot = spot, At = at, Activity = activity });
                var talk = def.Talk ?? $"d_x_{role}";
                if (Registry.Dialogues.Count > 0 && !Registry.Dialogues.ContainsKey(talk)) talk = "d_x_settler";
                var npc = new NpcDef
                {
                    Id = id, Name = name, Look = new LookDef { Seed = seed, Frame = male ? "broad" : "narrow", Age = age }, Role = role, Level = 1,
                    Team = def.Team ?? "neutral", Faction = def.Faction, HostileIf = def.HostileIf, Courage = 25, Minor = true, Dialogue = talk,
                    Barks = def.Barks ?? (RoleBarks.TryGetValue(role, out var b) ? b.ToList() : RoleBarks["settler"].ToList()),
                };
                out_.Add(new Extra
                {
                    Def = npc, Male = male, Look = look, Spot = spot, At = at,
                    Placement = new NpcPlacement { Id = id, Def = id, X = at?.X ?? 0, Y = at?.Y ?? 0, Schedule = schedule },
                });
            }
            return out_;
        }

        /// <summary>What a spot's name says a body does there, as a routine's activity.</summary>
        public static string SpotActivity(string spot)
        {
            if (string.IsNullOrEmpty(spot)) return "idle";
            if (spot.EndsWith("_work")) return "work";
            if (spot.EndsWith("_pair_a") || spot.EndsWith("_pair_b")) return "trade";   // two talking: the talking gestures
            return "idle";   // sitting, leaning, standing
        }

        /// <summary>A first-name pool for a body's ancestry (the mix of <see cref="Bodies"/>).</summary>
        private static string Pool(PlayerLook look, Rng rng)
        {
            double Get(string k) => look.Shape.TryGetValue(k, out var v) ? v : 0;
            double af = Get("body-african"), @as = Get("body-asian"), ca = Get("body-caucasian");
            if (af >= 0.55) return rng.Chance(0.6) ? "west_african" : "east_african";
            if (@as >= 0.55) return rng.Chance(0.5) ? "east_asian" : "southeast_asian";
            if (ca >= 0.6) return rng.Chance(0.5) ? "north_european" : "mediterranean";
            if (@as >= 0.25 && ca >= 0.35 && af < 0.25) return rng.Chance(0.5) ? "south_asian" : "indigenous_american";
            return "latin_american";
        }
    }
}
