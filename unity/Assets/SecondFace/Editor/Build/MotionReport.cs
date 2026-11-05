using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>The captured clips as imported: each one's length, whether it loops, its root settings (a check that the
    /// sidecar's settings reached the import; docs/PEOPLE_MOTION.md W1: a walk that does not loop freezes after one stride
    /// and is dragged). Written to unity/test-results/motion_report.txt.</summary>
    public static class MotionReport
    {
        [MenuItem("Second Face/Report motion clips")]
        public static void Run()
        {
            var sb = new StringBuilder();
            foreach (var guid in AssetDatabase.FindAssets("t:AnimationClip", new[] { "Assets/SecondFace/Motion" }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                foreach (var clip in AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview")))
                {
                    var s = AnimationUtility.GetAnimationClipSettings(clip);
                    sb.AppendLine($"{Path.GetFileName(path)} {clip.name}: length {clip.length:0.00}s loop {clip.isLooping} loopTime {s.loopTime} loopBlend {s.loopBlend} bakeXZ {s.loopBlendPositionXZ} human {clip.humanMotion}");
                }
            }
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, "motion_report.txt"), sb.ToString());
            Debug.Log("MotionReport:\n" + sb);
        }
    }
}
