#if UNITY_EDITOR
using System.Collections.Generic;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>
    /// Our shaders compile (BUILD_PLAN §8: a local named `texture`, a GLSL built-in, broke the skin shader on the GL
    /// targets the editor and CI render with, and every person in the gate rendered without it). Untagged, so CI runs it.
    /// </summary>
    public sealed class ShaderTests
    {
        [Test]
        public void OurShadersCompile()
        {
            var errors = new List<string>();
            foreach (var guid in AssetDatabase.FindAssets("t:Shader", new[] { "Assets/SecondFace" }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var shader = AssetDatabase.LoadAssetAtPath<Shader>(path);
                if (shader == null || !ShaderUtil.ShaderHasError(shader)) continue;
                foreach (var m in ShaderUtil.GetShaderMessages(shader))
                    if (m.severity == UnityEditor.Rendering.ShaderCompilerMessageSeverity.Error)
                        errors.Add($"{path}({m.line}): {m.message} ({m.platform})");
                if (errors.Count == 0) errors.Add($"{path}: has an error");
            }
            Assert.That(errors, Is.Empty, string.Join("\n", errors));
        }
    }
}
#endif
