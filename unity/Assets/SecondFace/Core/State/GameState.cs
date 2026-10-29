using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Core.State
{
    public sealed class NpcSave
    {
        public bool? Dead;
        public int? Hp;
        public int? X;
        public int? Y;
        public bool? Hostile;
        public Inventory.Inventory Inventory;
    }

    public sealed class PlayerCharacter
    {
        public CharacterSheet Sheet = Stats.Sheet.Empty();
        /// <summary>The look (data/appearance.ts shape); typed by the people code.</summary>
        public JToken Appearance;
        /// <summary>he, she or they.</summary>
        public string Pronouns = "they";
        public Inventory.Inventory Inventory = new();
    }

    public sealed class PlayerPos { public int X; public int Y; public double Facing; }

    /// <summary>Where the player stands in the open world and how the camera looks at them (P5.3j, BUILD_PLAN §6.I);
    /// null on a new game: they start at the place's spawn.</summary>
    public sealed class WorldSpot
    {
        public float X, Y, Z;
        /// <summary>Which way they face (degrees, clockwise from north).</summary>
        public float Yaw;
        public float CamYaw, CamPitch, CamDistance;
    }

    public sealed class CompanionSave
    {
        public CharacterSheet Sheet;
        public Inventory.Inventory Inv;
        public JToken WaitingAt;
    }

    /// <summary>
    /// Serialisable game state (port of core/state.ts). Everything the save system writes lives here; runtime objects
    /// are rebuilt from it. Flags hold numbers (double), strings or booleans.
    /// </summary>
    public sealed class GameState
    {
        public string LocationId;
        public PlayerPos Player = new();
        /// <summary>The player's place in the open world (the Unity game; the grid fallback keeps <see cref="Player"/>).</summary>
        public WorldSpot Spot;
        public PlayerCharacter Pc = new();
        /// <summary>Persistent per-NPC state keyed by `locationId/npcId`.</summary>
        public Dictionary<string, NpcSave> Npcs = new();
        /// <summary>Opened containers' current contents keyed by `locationId/containerId`.</summary>
        public Dictionary<string, Inventory.Inventory> Containers = new();
        /// <summary>Game clock in minutes since day 1, 00:00.</summary>
        public double Minutes;
        public Dictionary<string, object> Flags = new();
        public WorldState World = new();
        /// <summary>Creation origin preset id (if any); content reacts to it.</summary>
        public string Origin;
        public Dictionary<string, string> Sketches;
        public Dictionary<string, CompanionSave> Companions;
        public Dictionary<string, MerchantState> Merchants;
        public uint RngState;
        public double PlaytimeSec;

        // --- flags --------------------------------------------------------------------------------------------
        public object Flag(string key) => Flags.TryGetValue(key, out var v) ? v : null;
        public bool FlagTruthy(string key) => Truthy(Flag(key));
        public double? FlagNumber(string key) => Flag(key) is double d ? d : null;
        public void SetFlag(string key, object value) => Flags[key] = Normalise(value);

        /// <summary>JavaScript truthiness for a flag value.</summary>
        public static bool Truthy(object v) => v switch { null => false, bool b => b, double d => d != 0 && !double.IsNaN(d), string s => s.Length > 0, _ => true };

        /// <summary>Flag values are kept as double, string or bool (any JSON number becomes a double).</summary>
        public static object Normalise(object v) => v switch
        {
            null => null, bool b => b, string s => s, double d => d, float f => (double)f, int i => (double)i, long l => (double)l,
            JValue jv => Normalise(jv.Value), _ => v,
        };

        /// <summary>Strict equality the way the web game compares flag values (same type and value).</summary>
        public static bool SameValue(object a, object b)
        {
            a = Normalise(a); b = Normalise(b);
            if (a == null || b == null) return a == null && b == null;
            return a.GetType() == b.GetType() && a.Equals(b);
        }
    }

    public static class Clock
    {
        public const int StartMinutes = 8 * 60; // Day 1, 08:00

        public static int DayOf(double minutes) => (int)Math.Floor(minutes / 1440) + 1;
        public static double HourOf(double minutes) => (minutes % 1440) / 60;
        public static string ClockString(double minutes)
        {
            int h = (int)Math.Floor(HourOf(minutes)), m = (int)Math.Floor(minutes % 60);
            return $"Day {DayOf(minutes)}  {h:00}:{m:00}";
        }
    }

    public static class States
    {
        public static GameState NewGame(string locationId, int x, int y, PlayerCharacter pc = null)
        {
            return new GameState
            {
                LocationId = locationId,
                Player = new PlayerPos { X = x, Y = y, Facing = 0 },
                Pc = pc ?? new PlayerCharacter(),
                Minutes = Clock.StartMinutes,
                RngState = new Rng().State,
            };
        }
    }
}
