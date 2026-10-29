using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>
    /// The interface's words (P5.3b): every key the game's code asks the UI table for (Strings.Get / Strings.Bind with a
    /// literal key) is a line of UI/Strings/ui.tsv, and the source has no duplicate keys or empty texts.
    /// </summary>
    public class UiStringsTests
    {
        private static string Root => Path.Combine(Application.dataPath, "SecondFace");

        private static Dictionary<string, string> Source(out List<string> duplicates)
        {
            var rows = new Dictionary<string, string>();
            duplicates = new List<string>();
            foreach (var line in File.ReadAllLines(Path.Combine(Root, "UI/Strings/ui.tsv")))
            {
                if (line.Length == 0 || line.StartsWith("#")) continue;
                var tab = line.IndexOf('\t');
                Assert.That(tab, Is.GreaterThan(0), $"no tab in '{line}'");
                var key = line.Substring(0, tab);
                if (key == "key") continue;
                if (rows.ContainsKey(key)) duplicates.Add(key);
                rows[key] = line.Substring(tab + 1);
            }
            return rows;
        }

        [Test]
        public void EveryKeyUsedIsInTheTable()
        {
            var rows = Source(out var duplicates);
            Assert.That(duplicates, Is.Empty, "duplicate keys");
            Assert.That(rows.Where(kv => string.IsNullOrWhiteSpace(kv.Value)).Select(kv => kv.Key), Is.Empty, "empty texts");
            var used = new Regex(@"Strings\.(?:Get|Bind)\((?:[^""()]*,\s*)?""([a-z0-9_.]+)""");
            var keysField = new Regex(@"""((?:compass|hud|title|common)\.[a-z0-9_]+)""");
            var missing = new List<string>();
            var found = 0;
            foreach (var file in Directory.GetFiles(Path.Combine(Root, "Game"), "*.cs", SearchOption.AllDirectories))
            {
                var text = File.ReadAllText(file);
                foreach (Match m in used.Matches(text).Cast<Match>().Concat(keysField.Matches(text).Cast<Match>()))
                {
                    found++;
                    var key = m.Groups[1].Value;
                    if (!rows.ContainsKey(key)) missing.Add($"{Path.GetFileName(file)}: {key}");
                }
            }
            Assert.That(found, Is.GreaterThan(5), "the scan found the keys in use");
            Assert.That(missing, Is.Empty, "keys used in code but not in UI/Strings/ui.tsv");
        }
    }
}
