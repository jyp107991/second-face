using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using SecondFace.Core.Save;
using SecondFace.Core.State;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The game's saves and settings on the device (P5.3j, BUILD_PLAN §6.I): the slots (auto, quick and three by hand) as
    /// JSON files in the app's persistent folder, each with a picture of the scene the size of its card, and the
    /// settings beside them (Core <see cref="Settings"/>), applied wherever <see cref="SettingsChanged"/> is heard.
    /// The device's backend answers at once, so the Core's tasks are waited on where they are called.
    /// </summary>
    public sealed class Session
    {
        public const int ThumbWidth = 512, ThumbHeight = 288;
        public const string Auto = "auto", Quick = "quick";
        /// <summary>The slots saved to by hand.</summary>
        public static readonly string[] Manual = { "slot1", "slot2", "slot3" };

        public ISaveBackend Backend { get; }
        public SaveManager Saves { get; }
        public Settings Settings { get; private set; }
        public event Action<Settings> SettingsChanged;

        public Session(ISaveBackend backend)
        {
            Backend = backend;
            Saves = new SaveManager(backend);
            Settings = Wait(Settings.Load(backend));
        }

        /// <summary>The session on the device: the persistent folder's <c>saves</c>.</summary>
        public static Session OnDevice() => new(new DirectoryBackend(Path.Combine(Application.persistentDataPath, "saves")));

        /// <summary>Changes the settings, keeps them and tells whoever applies them.</summary>
        public void Change(Action<Settings> edit)
        {
            var s = Settings.Clone();
            edit(s);
            Settings = s.Clamped();
            try { Wait(Settings.Store(Backend)); }
            catch (Exception e) { Debug.LogWarning($"Session: the settings were not kept ({e.Message})"); }
            SettingsChanged?.Invoke(Settings);
        }

        /// <summary>The filled slots and what each holds.</summary>
        public Dictionary<string, SaveMeta> List() => Wait(Saves.List());

        /// <summary>The most recent save (null when there is none).</summary>
        public SaveMeta Latest() => Wait(Saves.Latest());

        /// <summary>A slot's save (null when empty or unreadable).</summary>
        public SaveFile Read(string slot)
        {
            try { return Wait(Saves.Read(slot)); }
            catch (Core.Save.InvalidDataException e) { Debug.LogWarning($"Session: {slot} cannot be read ({e.Message})"); return null; }
        }

        public SaveFile Write(string slot, GameState state, SaveMeta meta) => Wait(Saves.Write(slot, meta, state));

        public void Remove(string slot) => Wait(Saves.Remove(slot));

        private static T Wait<T>(Task<T> t) => t.GetAwaiter().GetResult();
        private static void Wait(Task t) => t.GetAwaiter().GetResult();

        /// <summary>The camera's view as a slot's picture: a JPEG, base64 (null without a camera).</summary>
        public static string Thumb(Camera cam)
        {
            if (cam == null) return null;
            var rt = RenderTexture.GetTemporary(ThumbWidth, ThumbHeight, 24, RenderTextureFormat.ARGB32);
            var tex = new Texture2D(ThumbWidth, ThumbHeight, TextureFormat.RGB24, false);
            var active = RenderTexture.active;
            try
            {
                var request = new RenderPipeline.StandardRequest { destination = rt };
                if (RenderPipeline.SupportsRenderRequest(cam, request)) RenderPipeline.SubmitRenderRequest(cam, request);
                else { var was = cam.targetTexture; cam.targetTexture = rt; cam.Render(); cam.targetTexture = was; }
                RenderTexture.active = rt;
                tex.ReadPixels(new Rect(0, 0, ThumbWidth, ThumbHeight), 0, 0);
                tex.Apply(false);
                return Convert.ToBase64String(tex.EncodeToJPG(80));
            }
            finally
            {
                RenderTexture.active = active;
                RenderTexture.ReleaseTemporary(rt);
                UnityEngine.Object.Destroy(tex);
            }
        }

        /// <summary>A slot's picture as a texture (null when it has none or it cannot be read); the caller destroys it.</summary>
        public static Texture2D ThumbTexture(string thumb)
        {
            if (string.IsNullOrEmpty(thumb)) return null;
            try
            {
                var tex = new Texture2D(2, 2, TextureFormat.RGB24, false) { name = "slot picture" };
                if (tex.LoadImage(Convert.FromBase64String(thumb), true)) return tex;
                UnityEngine.Object.Destroy(tex);
            }
            catch (FormatException) { }
            return null;
        }
    }
}
