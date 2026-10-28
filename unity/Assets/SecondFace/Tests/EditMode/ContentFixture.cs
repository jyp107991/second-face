using System;
using System.IO;
using SecondFace.Core.Content;

namespace SecondFace.Tests
{
    /// <summary>Loads the exported content once for the core tests (from the repository, wherever the tests run from).</summary>
    public static class ContentFixture
    {
        private static ContentDb _db;

        public static string ContentDir()
        {
            var candidates = new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
            foreach (var start in candidates)
            {
                var dir = new DirectoryInfo(start);
                while (dir != null)
                {
                    foreach (var rel in new[] { "unity/Assets/StreamingAssets/content", "Assets/StreamingAssets/content" })
                    {
                        var p = Path.Combine(dir.FullName, rel);
                        if (File.Exists(Path.Combine(p, "maps.json"))) return p;
                    }
                    dir = dir.Parent;
                }
            }
            throw new DirectoryNotFoundException("Exported content not found (run `npm run export`)");
        }

        public static ContentDb Db()
        {
            if (_db != null) return _db;
            var dir = ContentDir();
            var db = new ContentDb();
            foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(dir, name + ".json")));
            Registry.Load(db);
            _db = db;
            return db;
        }
    }
}
