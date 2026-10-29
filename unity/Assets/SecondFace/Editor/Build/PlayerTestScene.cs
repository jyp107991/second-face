using System.Collections.Generic;
using System.IO;
using SecondFace.Core;
using SecondFace.Core.Npc;
using SecondFace.Game.People;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>P4 step 2: the player's two bases (People/Player, built by mh_build.py from briefs/player.json) four times
    /// each: as built, two rerolled faces and the same face aged, each with a <see cref="FaceSculpt"/>; one row per base
    /// for the captures (ScreenshotTests: `people_sculpt_<base>_<face>`).</summary>
    public static class PlayerTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Player.unity";
        public const string Dir = "Assets/SecondFace/People/Player";
        public static readonly string[] Bases = { "player_f", "player_m" };
        public const float Spacing = 0.8f, RowGap = 10f;

        [MenuItem("Second Face/Build player test scene")]
        public static void Build()
        {
            if (!File.Exists($"{Dir}/{Bases[0]}.fbx")) { Debug.LogWarning("PlayerTestScene: no player bases (BRIEF=briefs/player.json mh_build.py)"); return; }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.7f; sun.color = new Color(1f, 0.95f, 0.88f); sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(30f, 160f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.62f, 0.7f, 0.9f); RenderSettings.ambientEquatorColor = new Color(0.6f, 0.56f, 0.5f); RenderSettings.ambientGroundColor = new Color(0.28f, 0.24f, 0.2f);
            var fill = new GameObject("Fill").AddComponent<Light>();
            fill.type = LightType.Directional; fill.intensity = 0.5f; fill.color = new Color(0.8f, 0.86f, 1f); fill.shadows = LightShadows.None;
            fill.transform.rotation = Quaternion.Euler(15f, -35f, 0f);
            var locomotion = LocomotionBuild.Build();
            var root = new GameObject("Players").transform;
            for (var b = 0; b < Bases.Length; b++)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"{Dir}/{Bases[b]}.fbx");
                if (prefab == null) continue;
                // the faces: as built, two rerolls (each far from the last), and the built face aged
                var rng = new Rng(7u + (uint)b);
                var a = Sculpt.Reroll(rng);
                var faces = new (string name, Dictionary<string, float> face, float aged)[]
                {
                    ("built", null, 0f), ("reroll_a", a, 0f), ("reroll_b", Sculpt.Reroll(rng, a), 0f), ("aged", null, 1f),
                };
                for (var i = 0; i < faces.Length; i++)
                {
                    var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                    PeopleMaterials.Bind(go, Dir);
                    go.name = $"{Bases[b]}_{faces[i].name}";
                    go.transform.SetParent(root);
                    go.transform.position = new Vector3(b * RowGap + (i - (faces.Length - 1) / 2f) * Spacing, 0, 0);
                    go.transform.rotation = Quaternion.Euler(0, 180f, 0);
                    var sculpt = go.AddComponent<FaceSculpt>();
                    sculpt.Aged = faces[i].aged;
                    sculpt.Set(faces[i].face);
                    var anim = go.GetComponent<Animator>();
                    if (anim != null)
                    {
                        anim.runtimeAnimatorController = locomotion;
                        anim.applyRootMotion = false;
                        anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    }
                }
            }
            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 22f; cam.nearClipPlane = 0.05f; cam.farClipPlane = 100f;
            cam.backgroundColor = new Color(0.32f, 0.33f, 0.35f); cam.clearFlags = CameraClearFlags.SolidColor;
            cam.transform.position = new Vector3(0, 1.52f, -2.6f);
            cam.transform.rotation = Quaternion.Euler(1f, 0, 0);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log("PlayerTestScene: built");
        }
    }
}
