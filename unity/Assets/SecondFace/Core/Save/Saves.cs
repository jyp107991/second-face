using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.State;

namespace SecondFace.Core.Save
{
    /// <summary>Key-value storage for saves: the app's persistent folder in the game, memory in tests.</summary>
    public interface ISaveBackend
    {
        Task<string> Get(string key);
        Task Set(string key, string value);
        Task Remove(string key);
        Task<List<string>> Keys();
    }

    public sealed class MemoryBackend : ISaveBackend
    {
        private readonly Dictionary<string, string> _m = new();
        public Task<string> Get(string k) => Task.FromResult(_m.TryGetValue(k, out var v) ? v : null);
        public Task Set(string k, string v) { _m[k] = v; return Task.CompletedTask; }
        public Task Remove(string k) { _m.Remove(k); return Task.CompletedTask; }
        public Task<List<string>> Keys() => Task.FromResult(new List<string>(_m.Keys));
    }

    /// <summary>Files in a directory, one per slot (Application.persistentDataPath in the app).</summary>
    public sealed class DirectoryBackend : ISaveBackend
    {
        private readonly string _dir;
        public DirectoryBackend(string dir) { _dir = dir; System.IO.Directory.CreateDirectory(dir); }
        private string PathOf(string k) => System.IO.Path.Combine(_dir, k + ".json");
        public Task<string> Get(string k) => Task.FromResult(System.IO.File.Exists(PathOf(k)) ? System.IO.File.ReadAllText(PathOf(k)) : null);
        public Task Set(string k, string v)
        {
            // Write beside, then move into place: a crash mid-write never leaves a half save.
            var tmp = PathOf(k) + ".tmp";
            System.IO.File.WriteAllText(tmp, v);
            if (System.IO.File.Exists(PathOf(k))) System.IO.File.Delete(PathOf(k));
            System.IO.File.Move(tmp, PathOf(k));
            return Task.CompletedTask;
        }
        public Task Remove(string k) { if (System.IO.File.Exists(PathOf(k))) System.IO.File.Delete(PathOf(k)); return Task.CompletedTask; }
        public Task<List<string>> Keys()
        {
            var l = new List<string>();
            foreach (var f in System.IO.Directory.GetFiles(_dir, "*.json")) l.Add(System.IO.Path.GetFileNameWithoutExtension(f));
            return Task.FromResult(l);
        }
    }

    public sealed class SaveMeta
    {
        public string Slot;
        /// <summary>Who is playing (the player's name).</summary>
        public string Label;
        /// <summary>A named save's own name, as the content gave it (<see cref="NamedSave"/>); null for the others.</summary>
        public string Title;
        public string LocationId;
        public string LocationName;
        public double Minutes;
        public double PlaytimeSec;
        /// <summary>Unix milliseconds.</summary>
        public long Timestamp;
        /// <summary>Small JPEG of the scene at save time (base64), optional.</summary>
        public string Thumb;
    }

    public sealed class SaveFile
    {
        public int Version;
        public SaveMeta Meta;
        public GameState State;
    }

    /// <summary>
    /// Save format migrations for the Unity port's own line of saves (version 1 = the port's first format). Each entry
    /// upgrades a raw JSON save from version N to N+1. NEVER edit a published migration; add a new one and bump
    /// CurrentVersion. Web-game saves are not imported.
    /// </summary>
    public static class Migrations
    {
        public const int CurrentVersion = 1;

        public static readonly Dictionary<int, Func<JObject, JObject>> Steps = new();

        public static JObject Migrate(JObject raw)
        {
            if (raw["Version"] == null && raw["version"] == null) throw new InvalidDataException("Save has no version");
            int v = (int?)raw["Version"] ?? (int)raw["version"];
            if (v > CurrentVersion) throw new InvalidDataException($"Save is from a newer game version ({v})");
            var s = raw;
            while (v < CurrentVersion)
            {
                if (!Steps.TryGetValue(v, out var step)) throw new InvalidDataException($"No migration from save version {v}");
                s = step(s);
                v = (int)s["Version"];
            }
            return s;
        }
    }

    public sealed class InvalidDataException : Exception { public InvalidDataException(string m) : base(m) { } }

    /// <summary>Save slots on top of a backend; versioning and import/export (port of save/saves.ts).</summary>
    public sealed class SaveManager
    {
        /// <summary>The slots the content may name in its <c>save</c> event (<see cref="NamedSave"/>): kept by the game at
        /// a moment the story chooses, never written by hand, listed first where saves are loaded.</summary>
        public static readonly string[] Named = { "steps" };
        public static readonly string[] Slots = { "auto", "quick", "slot1", "slot2", "slot3", "steps" };

        /// <summary>A slot the content names (its save is made by the story, not by hand).</summary>
        public static bool IsNamed(string slot) => Array.IndexOf(Named, slot) >= 0;

        /// <summary>The order saves are offered to load: the named ones first (the newest first), then the auto slot, the
        /// quick slot and the three by hand; only slots that hold a save.</summary>
        public static List<string> LoadOrder(IReadOnlyDictionary<string, SaveMeta> filled)
        {
            var order = new List<string>();
            if (filled == null) return order;
            var named = new List<SaveMeta>();
            foreach (var slot in Named) if (filled.TryGetValue(slot, out var m) && m != null) named.Add(m);
            named.Sort((a, b) => b.Timestamp.CompareTo(a.Timestamp));
            foreach (var m in named) order.Add(m.Slot);
            foreach (var slot in Slots) if (!IsNamed(slot) && filled.TryGetValue(slot, out var m) && m != null) order.Add(slot);
            return order;
        }
        private readonly ISaveBackend _backend;
        public static readonly JsonSerializerSettings Json = new() { NullValueHandling = NullValueHandling.Ignore, Formatting = Formatting.None };

        public SaveManager(ISaveBackend backend) { _backend = backend; }

        public static string Serialise(SaveFile f) => JsonConvert.SerializeObject(f, Json);

        public async Task<SaveFile> Write(string slot, SaveMeta meta, GameState state)
        {
            meta.Slot = slot;
            meta.Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var file = new SaveFile { Version = Migrations.CurrentVersion, Meta = meta, State = state };
            await _backend.Set(slot, Serialise(file));
            return file;
        }

        public async Task<SaveFile> Read(string slot)
        {
            var raw = await _backend.Get(slot);
            return raw == null ? null : Parse(raw);
        }

        public async Task<Dictionary<string, SaveMeta>> List()
        {
            var outD = new Dictionary<string, SaveMeta>();
            foreach (var slot in Slots)
            {
                try { var f = await Read(slot); if (f != null) outD[slot] = f.Meta; }
                catch { /* corrupt slot: shown as empty */ }
            }
            return outD;
        }

        public Task Remove(string slot) => _backend.Remove(slot);

        public async Task<SaveMeta> Latest()
        {
            SaveMeta best = null;
            foreach (var m in (await List()).Values) if (best == null || m.Timestamp > best.Timestamp) best = m;
            return best;
        }

        /// <summary>Parse + migrate + sanity-check a serialised save. Throws with a readable message on failure.</summary>
        public static SaveFile Parse(string raw)
        {
            JObject obj;
            try { obj = JObject.Parse(raw); } catch { throw new InvalidDataException("Save file is not valid JSON"); }
            var migrated = Migrations.Migrate(obj);
            var f = migrated.ToObject<SaveFile>(JsonSerializer.Create(Json));
            if (f?.State == null || f.State.LocationId == null || f.State.Player == null) throw new InvalidDataException("Save file is missing game state");
            if (f.Meta == null) throw new InvalidDataException("Save file is missing metadata");
            return f;
        }
    }

    /// <summary>
    /// The content's <c>save</c> event (<c>{ event: 'save', data: { slot, label } }</c>): a save the story keeps at a moment
    /// of its choosing, made at once with the game exactly as it stands when the event fires (the effects listed after it
    /// in the same choice are not in it), in a slot of <see cref="SaveManager.Named"/> under the content's own name.
    /// </summary>
    public sealed class NamedSave
    {
        public string Slot;
        public string Label;

        /// <summary>The event's data as a named save (null when it names no slot the game keeps).</summary>
        public static NamedSave From(Newtonsoft.Json.Linq.JToken data)
        {
            var slot = (string)data?["slot"];
            if (string.IsNullOrEmpty(slot) || !SaveManager.IsNamed(slot)) return null;
            var label = (string)data["label"];
            return new NamedSave { Slot = slot, Label = string.IsNullOrWhiteSpace(label) ? slot : label };
        }
    }
}
