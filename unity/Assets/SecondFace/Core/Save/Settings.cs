using System;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.Save
{
    /// <summary>
    /// The player's settings (P5.3j, DESIGN_UNITY §5.8; port of ui/settings.ts): how big the words are and how hard they
    /// stand out, how the camera turns under a finger, how hard the fights are (enemy aim and damage only: scarcity and
    /// checks are never touched), how fast they play, whether heard lines can be skipped, the one-time tips and autosaves
    /// (the quality tiers come with Adaptive Performance, P6.7). Kept beside the saves (<see cref="Load"/>, <see cref="Store"/>); anything unreadable or out of
    /// range reads as the default.
    /// </summary>
    public sealed class Settings
    {
        public const string Key = "settings";

        /// <summary>The text sizes offered (a scale on every font size of the theme).</summary>
        public static readonly float[] TextScales = { 0.9f, 1f, 1.15f, 1.3f };
        public static readonly string[] Difficulties = { "story", "normal", "hard" };
        public static readonly float[] CombatSpeeds = { 1f, 1.5f, 2f };

        [JsonProperty("textScale")] public float TextScale = 1f;
        [JsonProperty("highContrast")] public bool HighContrast;
        /// <summary>How far the camera turns for a finger's drag (0.5..2).</summary>
        [JsonProperty("turnSpeed")] public float TurnSpeed = 1f;
        /// <summary>The camera turns the other way under the finger.</summary>
        [JsonProperty("invertTurn")] public bool InvertTurn;
        [JsonProperty("difficulty")] public string Difficulty = "normal";
        [JsonProperty("combatSpeed")] public float CombatSpeed = 1f;
        /// <summary>Offer a skip through conversation lines already heard.</summary>
        [JsonProperty("skipSeen")] public bool SkipSeen = true;
        [JsonProperty("tips")] public bool Tips = true;
        /// <summary>Save to the auto slot on beginning, on entering a place and when the app goes to the background.</summary>
        [JsonProperty("autosave")] public bool Autosave = true;

        /// <summary>Enemy hit and damage modifiers by difficulty.</summary>
        public static (int HitMod, double DmgMul) DifficultyMods(string d) =>
            d == "story" ? (-15, 0.6) : d == "hard" ? (8, 1.25) : (0, 1.0);

        public (int HitMod, double DmgMul) Mods => DifficultyMods(Difficulty);

        /// <summary>Every value in its range (a value from a newer or a broken file falls back to its default).</summary>
        public Settings Clamped()
        {
            var d = new Settings();
            var s = Clone();
            s.TextScale = Nearest(TextScales, s.TextScale, d.TextScale);
            s.TurnSpeed = float.IsNaN(s.TurnSpeed) ? d.TurnSpeed : Math.Clamp(s.TurnSpeed, 0.5f, 2f);
            s.CombatSpeed = Nearest(CombatSpeeds, s.CombatSpeed, d.CombatSpeed);
            if (Array.IndexOf(Difficulties, s.Difficulty) < 0) s.Difficulty = d.Difficulty;
            return s;
        }

        private static float Nearest(float[] options, float v, float fallback)
        {
            if (float.IsNaN(v) || float.IsInfinity(v)) return fallback;
            var best = options[0];
            foreach (var o in options) if (Math.Abs(o - v) < Math.Abs(best - v)) best = o;
            return best;
        }

        public string ToJson() => JsonConvert.SerializeObject(this, Formatting.None);

        public static Settings Parse(string json)
        {
            if (string.IsNullOrEmpty(json)) return new Settings();
            try
            {
                var o = JObject.Parse(json);
                return (o.ToObject<Settings>() ?? new Settings()).Clamped();
            }
            catch (Exception e) when (e is JsonException || e is ArgumentException || e is FormatException || e is InvalidCastException)
            {
                return new Settings();
            }
        }

        public Settings Clone() => (JObject.FromObject(this).ToObject<Settings>() ?? new Settings());

        /// <summary>The settings kept in a backend (defaults when none are kept or they cannot be read).</summary>
        public static async Task<Settings> Load(ISaveBackend backend)
        {
            try { return Parse(await backend.Get(Key)); }
            catch (Exception) { return new Settings(); }
        }

        public Task Store(ISaveBackend backend) => backend.Set(Key, Clamped().ToJson());
    }
}
