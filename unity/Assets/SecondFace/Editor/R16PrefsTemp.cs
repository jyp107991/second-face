#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    // TEMP (relaunch 16, never committed): the editor's "Editor Attaching" preference off for one probe run and put back after.
    public static class R16PrefsTemp
    {
        private const string Key = "AllowAttachedDebuggingOfEditor";
        private static string Saved => System.IO.Path.Combine(Application.dataPath, "..", "test-results", "r16_attach_was.txt");
        public static void NoAttach()
        {
            System.IO.File.WriteAllText(Saved, EditorPrefs.HasKey(Key) ? (EditorPrefs.GetBool(Key) ? "1" : "0") : "none");
            EditorPrefs.SetBool(Key, false);
            Debug.Log("R16PrefsTemp: editor attaching off (was " + System.IO.File.ReadAllText(Saved) + ")");
        }
        public static void Restore()
        {
            var was = System.IO.File.Exists(Saved) ? System.IO.File.ReadAllText(Saved).Trim() : "none";
            if (was == "none") EditorPrefs.DeleteKey(Key); else EditorPrefs.SetBool(Key, was == "1");
            Debug.Log("R16PrefsTemp: editor attaching restored (" + was + "), now " + EditorPrefs.GetBool(Key, true));
        }
    }
}
#endif
