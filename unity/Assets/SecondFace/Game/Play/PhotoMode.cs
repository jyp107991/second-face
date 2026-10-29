using System;
using System.IO;
using SecondFace.Game.People;
using SecondFace.Game.World;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// Photo mode (P5.3l, DESIGN_UNITY §2 "pause, free camera within limits, time of day, expression, frame, save to the
    /// gallery"; the story is about a photograph): the world stops (time scale 0; the clock held), the camera is free
    /// within wider limits round the walker (pitch 5–85°, 1.2–30 m, 12 m of pan, a lens of 15–60°, looking at the body or
    /// the face), the hour can be set for the light, the walker can make a face (Core <c>Expressions</c>), and a frame
    /// crops the picture (the screen's, a wide 2.39:1, a portrait 4:5, a square). <see cref="Take"/> renders the game
    /// camera (no interface) at 2560 px across, crops it and keeps it as a JPEG in the app's <c>Photos</c> folder (and in
    /// the phone's gallery on Android). <see cref="End"/> puts everything back: the hour, the face, the camera, time.
    /// </summary>
    public sealed class PhotoMode : MonoBehaviour
    {
        public const int Width = 2560;
        public static readonly string[] Frames = { "screen", "wide", "portrait", "square" };
        public const float LensMin = 15f, LensMax = 60f, BodyHeight = 1.3f, FaceHeight = 1.62f;

        public Walkabout Walkabout;
        public PadInput Pad;
        public bool Active { get; private set; }
        public string Face { get; private set; } = "still";
        public string Frame { get; private set; } = "screen";
        public float Hour { get; private set; }
        public float Lens { get; private set; } = 28f;
        /// <summary>Looking at the face (a portrait) rather than the body.</summary>
        public bool OnFace { get; private set; }
        /// <summary>Where the last picture went (null before one is taken or when it failed).</summary>
        public string Last { get; private set; }

        private float _timeScale = 1f;
        private double _minutes;
        private bool _clockPaused, _brainIgnored;
        private float _fov, _height;

        private OrbitRig Rig => Walkabout != null ? Walkabout.Rig : null;
        private TimeService Clock => Walkabout != null && Walkabout.Stage != null ? Walkabout.Stage.Clock : null;

        /// <summary>Stops the world and frees the camera (false when there is no walker to photograph).</summary>
        public bool Begin()
        {
            if (Active || Walkabout == null || Walkabout.Walker == null || Rig == null) return false;
            Active = true;
            _timeScale = Time.timeScale > 0f ? Time.timeScale : 1f;
            Time.timeScale = 0f;
            Walkabout.Walker.Steer(Vector3.zero, 0f);
            var clock = Clock;
            if (clock != null) { _minutes = clock.Minutes; _clockPaused = clock.Paused; clock.Paused = true; Hour = (float)clock.Hour; }
            var brain = Walkabout.Stage.Camera != null ? Walkabout.Stage.Camera.GetComponent<CinemachineBrain>() : null;
            if (brain != null) { _brainIgnored = brain.IgnoreTimeScale; brain.IgnoreTimeScale = true; }
            _fov = Rig.FieldOfView;
            _height = Rig.TargetHeight;
            Lens = _fov;
            Rig.Limit(5f, 85f, 1.2f, 30f, 12f);
            if (Walkabout.Input != null) Walkabout.Input.CameraOnly = true;
            if (Pad != null) Pad.CameraOnly = true;
            return true;
        }

        public void SetHour(float hour)
        {
            Hour = Mathf.Repeat(hour, 24f);
            Clock?.SetHour(Hour);
            Relight();
        }

        /// <summary>The sky and the sun for the hour now (the sky refreshes on game time, which is stopped here).</summary>
        private void Relight()
        {
            var sky = Walkabout != null && Walkabout.Stage != null ? Walkabout.Stage.Sky : null;
            if (sky != null) sky.Apply();
        }

        public void SetFace(string face)
        {
            Face = face;
            if (Walkabout != null && Walkabout.Walker != null) FaceExpression.Set(Walkabout.Walker.gameObject, face);
        }

        public void SetLens(float fov)
        {
            Lens = Mathf.Clamp(fov, LensMin, LensMax);
            if (Rig != null) Rig.FieldOfView = Lens;
        }

        /// <summary>Looks at the face (the eyes, from the walker's head bone; a set height for a body without one) or the
        /// body (the chest).</summary>
        public void LookAtFace(bool face)
        {
            OnFace = face;
            if (Rig == null) return;
            var height = face ? FaceHeight : BodyHeight;
            var walker = Walkabout != null ? Walkabout.Walker : null;
            var anim = walker != null ? walker.GetComponentInChildren<Animator>() : null;
            var head = face && anim != null && anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Head) : null;
            if (head != null) height = head.position.y - walker.transform.position.y + 0.08f;   // the head bone sits under the eyes
            Rig.TargetHeight = height;
        }

        public void SetFrame(string frame) => Frame = Array.IndexOf(Frames, frame) >= 0 ? frame : "screen";

        /// <summary>The picture's shape (width over height) for a frame, the screen's for "screen".</summary>
        public static float Aspect(string frame, float screen) => frame switch
        {
            "wide" => 2.39f, "portrait" => 0.8f, "square" => 1f, _ => screen,
        };

        /// <summary>Takes the picture: the game camera at <see cref="Width"/> across, cropped to the frame, kept as a JPEG.
        /// Returns its path (null when it could not be made).</summary>
        public string Take()
        {
            var cam = Walkabout != null && Walkabout.Stage != null ? Walkabout.Stage.Camera : null;
            if (cam == null) return null;
            var screenAspect = cam.pixelHeight > 0 ? (float)cam.pixelWidth / cam.pixelHeight : 16f / 9f;
            var w = Width;
            var h = Mathf.RoundToInt(w / screenAspect);
            var aspect = Aspect(Frame, screenAspect);
            int cw = w, ch = h;
            if (aspect > screenAspect) ch = Mathf.RoundToInt(w / aspect); else cw = Mathf.RoundToInt(h * aspect);
            var rt = RenderTexture.GetTemporary(w, h, 24, RenderTextureFormat.ARGB32);
            rt.antiAliasing = 1;
            var tex = new Texture2D(cw, ch, TextureFormat.RGB24, false);
            var active = RenderTexture.active;
            try
            {
                var request = new RenderPipeline.StandardRequest { destination = rt };
                if (RenderPipeline.SupportsRenderRequest(cam, request)) RenderPipeline.SubmitRenderRequest(cam, request);
                else { var was = cam.targetTexture; cam.targetTexture = rt; cam.Render(); cam.targetTexture = was; }
                RenderTexture.active = rt;
                tex.ReadPixels(new Rect((w - cw) / 2, (h - ch) / 2, cw, ch), 0, 0);
                tex.Apply(false);
                var dir = Folder;
                Directory.CreateDirectory(dir);
                var path = Path.Combine(dir, $"second_face_{DateTime.Now:yyyyMMdd_HHmmss_fff}.jpg");
                File.WriteAllBytes(path, tex.EncodeToJPG(95));
                Gallery(path);
                Last = path;
                return path;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"PhotoMode: the picture was not kept ({e.Message})");
                return null;
            }
            finally
            {
                RenderTexture.active = active;
                RenderTexture.ReleaseTemporary(rt);
                Destroy(tex);
            }
        }

        /// <summary>Where the pictures are kept.</summary>
        public static string Folder => Path.Combine(Application.persistentDataPath, "Photos");

        /// <summary>Hands a picture to the phone's gallery (Android's media store); elsewhere it stays in <see cref="Folder"/>.</summary>
        private static void Gallery(string path)
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                using var activity = player.GetStatic<AndroidJavaObject>("currentActivity");
                using var resolver = activity.Call<AndroidJavaObject>("getContentResolver");
                using var media = new AndroidJavaClass("android.provider.MediaStore$Images$Media");
                media.CallStatic<string>("insertImage", resolver, path, Path.GetFileNameWithoutExtension(path), "The Second Face");
            }
            catch (Exception e) { Debug.LogWarning($"PhotoMode: not in the gallery ({e.Message}); kept in {Folder}"); }
#endif
        }

        /// <summary>Back to the game: the hour, the face, the camera's limits, lens and look, the touches and time.</summary>
        public void End()
        {
            if (!Active) return;
            Active = false;
            var clock = Clock;
            if (clock != null) { clock.Minutes = _minutes; clock.Paused = _clockPaused; Relight(); }
            if (Walkabout != null && Walkabout.Walker != null) FaceExpression.Set(Walkabout.Walker.gameObject, "still");
            var rig = Rig;
            if (rig != null)
            {
                rig.Unlimit();
                rig.FieldOfView = _fov;
                rig.TargetHeight = _height;
            }
            var brain = Walkabout != null && Walkabout.Stage != null && Walkabout.Stage.Camera != null ? Walkabout.Stage.Camera.GetComponent<CinemachineBrain>() : null;
            if (brain != null) brain.IgnoreTimeScale = _brainIgnored;
            if (Walkabout != null && Walkabout.Input != null) Walkabout.Input.CameraOnly = false;
            if (Pad != null) Pad.CameraOnly = false;
            Time.timeScale = _timeScale;
        }

        private void OnDestroy() => End();
    }
}
