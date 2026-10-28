using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>Letters (port of world/letters.ts): write to someone you have met; a reply comes back days later.</summary>
    public static class Letters
    {
        /// <summary>Letters the player could write right now to people they have met.</summary>
        public static List<LetterDef> Available(GameState g, IReadOnlyDictionary<string, LetterDef> defs)
        {
            var sent = new HashSet<string>(g.World.Letters.Select(l => l.Id));
            return defs.Values.Where(d => g.World.MetPeople.ContainsKey(d.To) && !(d.Once == true && sent.Contains(d.Id)) && Logic.Test(d.If, g)).ToList();
        }

        /// <summary>Send a letter: apply its effects and schedule the reply as a timer.</summary>
        public static SentLetter Send(GameState g, LetterDef def, ILogicHost host = null)
        {
            int day = Clock.DayOf(g.Minutes);
            var letter = new SentLetter { Id = def.Id, To = def.To, Day = day, Arrives = day + def.Days };
            g.World.Letters.Add(letter);
            Logic.Apply(def.Effects, g, host);
            if (def.Reply != null)
            {
                var effects = new JArray { new JObject { ["post"] = new JObject { ["from"] = def.To, ["text"] = def.Reply.Text } } };
                if (def.Reply.Effects != null) foreach (var e in def.Reply.Effects) effects.Add(e.DeepClone());
                var after = new JArray { new JObject { ["after"] = new JObject { ["minutes"] = def.Days * 1440, ["id"] = $"letter_{def.Id}", ["effects"] = effects } } };
                Logic.Apply(after, g, host);
            }
            return letter;
        }

        public static int UnreadPost(GameState g) => g.World.PostBag.Count(p => !p.Read);
    }
}
