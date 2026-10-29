using System.Collections.Generic;
using System.IO;
using System.Linq;
using SecondFace.Game.UI;
using UnityEditor;
using UnityEditor.Localization;
using UnityEngine;
using UnityEngine.Localization;
using UnityEngine.Localization.Settings;
using UnityEngine.Localization.Tables;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Localization wired (P5.3b, DESIGN_UNITY §6): the project's Localization Settings, the English locale and the UI
    /// string table (preloaded at start), its entries made exactly the lines of <see cref="SourcePath"/> (key, tab,
    /// text). The package adds its Addressables groups itself; they are built with the player like ours. A language is
    /// added later as a locale and a column.
    /// </summary>
    public static class LocalizationBuild
    {
        public const string Dir = "Assets/SecondFace/UI/Localization";
        public const string SettingsPath = Dir + "/Localization Settings.asset";
        public const string SourcePath = "Assets/SecondFace/UI/Strings/ui.tsv";

        [MenuItem("Second Face/Build localization")]
        public static int Build()
        {
            Directory.CreateDirectory(Dir + "/Locales");
            Directory.CreateDirectory(Dir + "/Tables");
            var settings = LocalizationEditorSettings.ActiveLocalizationSettings;
            if (settings == null)
            {
                settings = AssetDatabase.LoadAssetAtPath<LocalizationSettings>(SettingsPath);
                if (settings == null)
                {
                    settings = ScriptableObject.CreateInstance<LocalizationSettings>();
                    AssetDatabase.CreateAsset(settings, SettingsPath);
                }
                LocalizationEditorSettings.ActiveLocalizationSettings = settings;
            }
            var en = LocalizationEditorSettings.GetLocale(new LocaleIdentifier("en"));
            if (en == null)
            {
                en = Locale.CreateLocale(new LocaleIdentifier("en"));
                AssetDatabase.CreateAsset(en, $"{Dir}/Locales/English (en).asset");
                LocalizationEditorSettings.AddLocale(en);
            }
            var collection = LocalizationEditorSettings.GetStringTableCollection(Strings.Table)
                             ?? LocalizationEditorSettings.CreateStringTableCollection(Strings.Table, Dir + "/Tables");
            var table = (collection.GetTable(en.Identifier) ?? collection.AddNewTable(en.Identifier)) as StringTable;
            LocalizationEditorSettings.SetPreloadTableFlag(table, true);

            var rows = Read(SourcePath);
            foreach (var entry in collection.SharedData.Entries.ToList())
                if (!rows.ContainsKey(entry.Key)) collection.RemoveEntry(entry.Key);
            foreach (var kv in rows) table.AddEntry(kv.Key, kv.Value);
            EditorUtility.SetDirty(table);
            EditorUtility.SetDirty(collection.SharedData);
            EditorUtility.SetDirty(collection);
            AssetDatabase.SaveAssets();
            Debug.Log($"LocalizationBuild: {rows.Count} strings in the {Strings.Table} table ({en.Identifier.Code})");
            return rows.Count;
        }

        /// <summary>The source's entries: key, then the English text (lines starting with # and the header skipped).</summary>
        public static Dictionary<string, string> Read(string path)
        {
            var rows = new Dictionary<string, string>();
            foreach (var line in File.ReadAllLines(path))
            {
                if (line.Length == 0 || line.StartsWith("#")) continue;
                var tab = line.IndexOf('\t');
                if (tab <= 0) { Debug.LogWarning($"LocalizationBuild: no tab in '{line}'"); continue; }
                var key = line.Substring(0, tab);
                if (key == "key") continue;
                rows[key] = line.Substring(tab + 1);
            }
            return rows;
        }
    }
}
