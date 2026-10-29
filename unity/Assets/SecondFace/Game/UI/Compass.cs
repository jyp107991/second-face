using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The HUD's compass (P5.3b): a strip of what lies ahead of the camera, <see cref="Span"/> degrees wide, with the
    /// cardinal letters, ticks every 15°, a notch at the centre and the tracked objective's pin (held at the edge, as an
    /// arrow, when it is behind). The camera turns freely in this game, so the compass is how north is kept.
    /// </summary>
    public sealed class Compass : VisualElement
    {
        public const float Span = 180f;
        private static readonly string[] Keys = { "compass.n", "compass.e", "compass.s", "compass.w" };
        private static readonly Color Tick = new(0.95f, 0.92f, 0.86f, 0.6f), Notch = new(0.77f, 0.54f, 0.17f), PinColour = new(0.86f, 0.42f, 0.27f);
        private readonly Label[] _letters = new Label[4];
        private float _heading;
        private float? _pin;

        public Compass()
        {
            name = "compass";
            pickingMode = PickingMode.Ignore;
            AddToClassList("sf-compass");
            for (var i = 0; i < 4; i++)
            {
                var l = new Label { pickingMode = PickingMode.Ignore };
                Strings.Bind(l, Keys[i]);
                l.AddToClassList("sf-compass__letter");
                Add(l);
                _letters[i] = l;
            }
            generateVisualContent += Draw;
            RegisterCallback<GeometryChangedEvent>(_ => Place());
        }

        /// <summary>Where the camera looks, degrees clockwise from north.</summary>
        public float Heading
        {
            get => _heading;
            set
            {
                if (Mathf.Abs(Mathf.DeltaAngle(value, _heading)) < 0.05f) return;
                _heading = value;
                Place();
                MarkDirtyRepaint();
            }
        }

        /// <summary>The objective's bearing (null: no pin).</summary>
        public float? Pin
        {
            get => _pin;
            set { _pin = value; MarkDirtyRepaint(); }
        }

        /// <summary>The x of a bearing on the strip (the centre is the heading).</summary>
        public float X(float bearing) => contentRect.width * 0.5f + Mathf.DeltaAngle(_heading, bearing) / Span * contentRect.width;

        /// <summary>Whether a letter shows (its bearing is on the strip).</summary>
        public bool Shows(int cardinal) => _letters[cardinal].resolvedStyle.visibility == Visibility.Visible;

        private void Place()
        {
            for (var i = 0; i < 4; i++)
            {
                var on = Mathf.Abs(Mathf.DeltaAngle(_heading, i * 90f)) < Span * 0.5f - 8f;
                _letters[i].style.visibility = on ? Visibility.Visible : Visibility.Hidden;
                _letters[i].style.translate = new Translate(X(i * 90f), 0);
            }
        }

        private void Draw(MeshGenerationContext mgc)
        {
            var r = contentRect;
            if (r.width <= 0) return;
            var p = mgc.painter2D;
            p.lineWidth = 2f;
            p.strokeColor = Tick;
            p.lineCap = LineCap.Round;
            p.BeginPath();
            for (var b = 0; b < 360; b += 15)
            {
                if (b % 90 == 0) continue;   // the letters stand there
                var d = Mathf.DeltaAngle(_heading, b);
                if (Mathf.Abs(d) > Span * 0.5f - 2f) continue;
                var x = X(b);
                var h = b % 45 == 0 ? 12f : 7f;
                p.MoveTo(new Vector2(x, r.height - 6f - h));
                p.LineTo(new Vector2(x, r.height - 6f));
            }
            p.Stroke();
            var c = r.width * 0.5f;
            p.fillColor = Notch;
            p.BeginPath();
            p.MoveTo(new Vector2(c - 7f, 0)); p.LineTo(new Vector2(c + 7f, 0)); p.LineTo(new Vector2(c, 8f));
            p.ClosePath();
            p.Fill();
            if (_pin is not { } pin) return;
            var dp = Mathf.DeltaAngle(_heading, pin);
            p.fillColor = PinColour;
            p.BeginPath();
            var y = r.height - 10f;
            if (Mathf.Abs(dp) <= Span * 0.5f - 6f)
            {
                var x = X(pin);   // a diamond on the strip
                p.MoveTo(new Vector2(x, y - 9f)); p.LineTo(new Vector2(x + 7f, y)); p.LineTo(new Vector2(x, y + 7f)); p.LineTo(new Vector2(x - 7f, y));
            }
            else
            {
                var x = dp > 0 ? r.width - 6f : 6f;   // behind: an arrow at the edge it is nearer
                var s = dp > 0 ? -1f : 1f;
                p.MoveTo(new Vector2(x, y)); p.LineTo(new Vector2(x + s * 12f, y - 8f)); p.LineTo(new Vector2(x + s * 12f, y + 8f));
            }
            p.ClosePath();
            p.Fill();
        }
    }
}
