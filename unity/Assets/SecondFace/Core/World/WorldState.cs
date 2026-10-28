using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.World
{
    public sealed class Memory
    {
        public string Tag;
        /// <summary>-100..100: how they feel about it.</summary>
        public double Valence;
        /// <summary>0..100: how vivid.</summary>
        public double Strength;
        public int Day;
        /// <summary>witnessed, told or rumour.</summary>
        public string Source;
    }

    public sealed class QuestState
    {
        public string Stage;
        /// <summary>active, done or failed.</summary>
        public string Status;
        public double StartedAt;
        public List<string> Log = new();
        public List<string> Done = new();
    }

    public sealed class Timer { public string Id; public double At; public JArray Effects; }
    public sealed class Decision { public string Id; public string Text; public double Minutes; }
    public sealed class Relation { public double Trust; public double Affection; }
    public sealed class Reputation { public double Respect; public double Fear; }
    public sealed class Met { public string Name; public int Day; public string Where; }
    public sealed class Membership { public string Rank; public int Since; public string Status; public string Cover; }
    public sealed class SentLetter { public string Id; public string To; public int Day; public int Arrives; }
    public sealed class Post { public string From; public string Text; public int Day; public bool Read; }
    public sealed class LogLine { public string Who; public string Text; public double Minutes; }

    public sealed class HeardAt { public int Day; public double Distortion; }

    public sealed class NewsItem
    {
        public string Id;
        public string Tag;
        public string Text;
        /// <summary>player or masked.</summary>
        public string About;
        public double Valence;
        public double Size;
        public string Origin;
        public int Day;
        /// <summary>Settlement → day heard and how distorted the telling is (0 = accurate).</summary>
        public Dictionary<string, HeardAt> Heard = new();
    }

    /// <summary>Quests, memories, relationships, reputation, knowledge, decisions, timers, news (port of WorldState).</summary>
    public sealed class WorldState
    {
        public int? BodyDay;
        public Dictionary<string, QuestState> Quests = new();
        public Dictionary<string, List<Memory>> Memories = new();
        public Dictionary<string, Relation> Relations = new();
        public Dictionary<string, double> Approval = new();
        public List<string> Party = new();
        public Dictionary<string, Reputation> ReputationOf = new();
        public HashSet<string> Knowledge = new();
        public Dictionary<string, double> Seen = new();
        public List<Decision> Decisions = new();
        public List<Timer> Timers = new();
        public List<NewsItem> News = new();
        public HashSet<string> Leads = new();
        public HashSet<string> Conclusions = new();
        /// <summary>Scheduled world events that have resolved: happened or prevented.</summary>
        public Dictionary<string, string> Events = new();
        public bool Masked;
        public Dictionary<string, Met> MetPeople = new();
        public List<string> KnownLocations = new();
        public string At;
        public HashSet<string> RoadSeen = new();
        public JToken Trip;
        public JToken Traps;
        public Dictionary<string, Membership> MembershipOf = new();
        public List<SentLetter> Letters = new();
        public List<Post> PostBag = new();
        public List<LogLine> Log = new();
        public string Pinned;
        public Dictionary<string, double> Visited = new();

        public Relation RelationWith(string npc)
        {
            if (!Relations.TryGetValue(npc, out var r)) Relations[npc] = r = new Relation();
            return r;
        }

        public Reputation Rep(string faction)
        {
            if (!ReputationOf.TryGetValue(faction, out var r)) ReputationOf[faction] = r = new Reputation();
            return r;
        }

        public static double Clamp100(double v, double lo = -100) => Math.Max(lo, Math.Min(100, v));
    }
}
