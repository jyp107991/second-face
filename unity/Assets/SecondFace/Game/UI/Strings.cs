using System;
using UnityEngine;
using UnityEngine.Localization;
using UnityEngine.Localization.Settings;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The interface's words (P5.3b, DESIGN_UNITY §6: localization from day one, English ships): the UI string table of
    /// Unity Localization, written from UI/Strings/ui.tsv by Second Face/Build localization. Take a string by key with
    /// <see cref="Get"/> (formatted with String.Format when given arguments) or bind an element's text to it with
    /// <see cref="Bind"/> (it follows the language). Every key used in code must be in the table (EditMode
    /// <c>UiStringsTests</c>). Content text (dialogue, quests, items) is content, not here.
    /// </summary>
    public static class Strings
    {
        public const string Table = "UI";

        /// <summary>Whether the localization settings are there (the build wires them; a bare test may not).</summary>
        public static bool Available => LocalizationSettings.HasSettings;

        /// <summary>The string for a key in the current language (the key itself when there is no table).</summary>
        public static string Get(string key, params object[] args)
        {
            if (!Available) return key;
            try
            {
                var s = LocalizationSettings.StringDatabase.GetLocalizedString(Table, key, args.Length > 0 ? args : null);
                return string.IsNullOrEmpty(s) ? key : s;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"Strings: {key}: {e.Message}");
                return key;
            }
        }

        /// <summary>Binds a text element's text to a key: it is set when the table is loaded and again on a change of
        /// language.</summary>
        public static void Bind(TextElement element, string key)
        {
            if (!Available) { element.text = key; return; }
            element.SetBinding("text", new LocalizedString(Table, key));
        }
    }
}
