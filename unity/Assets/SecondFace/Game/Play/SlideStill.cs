using System.Collections;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The still beside a closing page (the content's <c>slide</c> event, Core <see cref="SlideData"/>): the world streamed
    /// in round the map and spot the page names, the camera eased there and held overhead at the game's own pitch (the
    /// rig's range, never eye level), the light at the page's named hour and weather (the sky's hour, not the clock: the
    /// game's time is not moved), and the place's people standing round the still (the people service's focus moved
    /// there). The walkabout is paused meanwhile (its camera and touches handed over, as for the measuring tour) and given
    /// back when the pages close. Still to come with the art: the page's own people posed in their end states and the
    /// player aged by the page's years (today the place's own people stand as the story has left them).
    /// </summary>
    public sealed class SlideStill : MonoBehaviour
    {
        public Walkabout Walkabout;
        /// <summary>The overhead view of a still: the camera's pitch (degrees, within the rig's 35-62) and distance.</summary>
        public float Pitch = 46f, Distance = 15f;
        /// <summary>How long the camera takes to ease from one still to the next (real seconds).</summary>
        public float EaseSeconds = 1.4f;
        /// <summary>A still further than this from the last is cut to, not eased (the world was streamed there meanwhile).</summary>
        public float CutBeyond = 200f;

        /// <summary>A still is being shown (the walkabout paused).</summary>
        public bool On { get; private set; }
        /// <summary>The still shown now (null when none).</summary>
        public SlideData Showing { get; private set; }
        /// <summary>Where the still looks (null until it is framed).</summary>
        public Vector3? Point { get; private set; }

        private int _ticket;
        private bool _hadForce;
        private SecondFace.Core.World.WeatherKind? _forceWas;
        private Vector3 _fromPos, _toPos;
        private Quaternion _fromRot, _toRot;
        private float _t0;
        private bool _framed;
        private Transform _focus, _focusWas;

        /// <summary>Composes the still for a page (again for the same page does nothing).</summary>
        public void Show(SlideData slide)
        {
            var stage = Walkabout != null ? Walkabout.Stage : null;
            if (slide == null || stage == null || stage.Camera == null) return;
            if (On && Showing != null && Showing.Slide == slide.Slide && Showing.Variant == slide.Variant && Showing.Place == slide.Place) return;
            if (!On) Begin();
            Showing = slide;
            var sky = stage.Sky;
            if (sky != null)
            {
                sky.Hour = slide.Hour;
                sky.Force = SkyTurn.WeatherOf(slide.Weather) ?? _forceWas;
                sky.Turn(1.6f);
            }
            StartCoroutine(Frame(slide, ++_ticket));
        }

        /// <summary>The pages closed: the light back to the clock, the camera, the touches and the people back to the walker.</summary>
        public void End()
        {
            if (!On) return;
            On = false;
            _ticket++;
            _framed = false;
            Showing = null;
            Point = null;
            var stage = Walkabout != null ? Walkabout.Stage : null;
            if (stage != null && stage.Sky != null)
            {
                stage.Sky.Hour = null;
                if (_hadForce) stage.Sky.Force = _forceWas;
                stage.Sky.Turn(1f);
            }
            if (Walkabout != null && Walkabout.People != null) Walkabout.People.Focus = _focusWas != null ? _focusWas : Walkabout.Walker != null ? Walkabout.Walker.transform : null;
            if (_focus != null) Destroy(_focus.gameObject);
            _focus = null;
            if (Walkabout != null) Walkabout.Pause(false);
        }

        private void Begin()
        {
            On = true;
            var sky = Walkabout.Stage.Sky;
            _hadForce = sky != null;
            _forceWas = sky != null ? sky.Force : null;
            _focusWas = Walkabout.People != null ? Walkabout.People.Focus : null;
            Walkabout.Pause(true);
        }

        private IEnumerator Frame(SlideData s, int ticket)
        {
            var stage = Walkabout.Stage;
            if (stage.World == null || !stage.World.Ready) yield break;
            var place = Walkabout.PlaceOf(s.Place) ?? Goto.Resolve(s.Place, null, Walkabout.PlaceOf)?.Place;
            if (string.IsNullOrEmpty(place)) { Debug.LogWarning($"SlideStill: no world place holds {s.Place}"); yield break; }
            var centre = stage.World.PlaceCentre(place);
            var set = stage.Streamer != null && stage.Streamer.PlaceSpawner != null ? stage.Streamer.PlaceSpawner.Places : null;
            var built = set != null && set.AddressOf(place) != null;
            yield return stage.WaitAround(centre, built ? place : null, 20f);
            if (ticket != _ticket || !On) yield break;
            var marker = Spot(stage, place, s);
            var at = marker != null ? marker.transform.position : stage.Heart(place, s.Place) ?? centre;
            if (marker == null) at.y = stage.Ground(at, at.y);
            Point = at;
            stage.World.Focus = at;
            // the place's people stand round the still
            if (_focus == null) _focus = new GameObject("still focus").transform;
            _focus.position = at;
            if (Walkabout.People != null) Walkabout.People.Focus = _focus;
            // overhead, as the game is seen: the rig's own turn, its pitch and a close distance
            var cam = stage.Camera.transform;
            var yaw = Walkabout.Rig != null ? Walkabout.Rig.Yaw : 30f;
            var rot = Quaternion.Euler(Mathf.Clamp(Pitch, OrbitRig.MinPitch, OrbitRig.MaxPitch), yaw, 0f);
            _toRot = rot;
            _toPos = at + Vector3.up * 1.2f - rot * Vector3.forward * Distance;
            _fromPos = cam.position;
            _fromRot = cam.rotation;
            if ((_toPos - _fromPos).sqrMagnitude > CutBeyond * CutBeyond) { _fromPos = _toPos; _fromRot = _toRot; }
            _t0 = Time.unscaledTime;
            _framed = true;
        }

        /// <summary>The page's spot on its map in the place (a spot of that map first, else any marker of it by that id).</summary>
        private static PlaceMarker Spot(WorldStage stage, string place, SlideData s)
        {
            var go = stage.Streamer != null && stage.Streamer.PlaceSpawner != null ? stage.Streamer.PlaceSpawner.Instance(place) : null;
            if (go == null || string.IsNullOrEmpty(s.Spot)) return null;
            PlaceMarker any = null;
            foreach (var m in go.GetComponentsInChildren<PlaceMarker>())
            {
                if (m.Id != s.Spot) continue;
                if (m.Map == s.Place && m.Kind == "spot") return m;
                if (m.Map == s.Place || any == null) any = m;
            }
            return any;
        }

        private void LateUpdate()
        {
            // the camera held on the still (the brain is off while the walkabout is paused), eased in from the last
            if (!On || !_framed || Walkabout == null || Walkabout.Stage == null || Walkabout.Stage.Camera == null) return;
            var t = Mathf.Clamp01((Time.unscaledTime - _t0) / Mathf.Max(0.01f, EaseSeconds));
            t = t * t * (3f - 2f * t);
            Walkabout.Stage.Camera.transform.SetPositionAndRotation(Vector3.Lerp(_fromPos, _toPos, t), Quaternion.Slerp(_fromRot, _toRot, t));
        }

        private void OnDestroy() { if (_focus != null) Destroy(_focus.gameObject); }
    }
}
