using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The interface's icons, drawn as vector lines in the element's text colour (crisp at any scale, no textures): a
    /// pencil sketch in keeping with the notebook. <see cref="Make"/> gives an element that draws one.
    /// </summary>
    public static class Icons
    {
        public static readonly string[] Names = { "notebook", "map", "pack", "talk", "look", "take", "use", "steal", "give", "attack", "trade", "menu", "open", "camp", "sit", "sneak", "eye" };

        public static VisualElement Make(string name, float size = 40f)
        {
            var e = new VisualElement { name = "icon-" + name, pickingMode = PickingMode.Ignore };
            e.AddToClassList("sf-icon");
            e.style.width = size;
            e.style.height = size;
            e.generateVisualContent += mgc => Draw(name, mgc.painter2D, e.contentRect, e.resolvedStyle.color);
            return e;
        }

        public static void Draw(string name, Painter2D p, Rect r, Color colour)
        {
            if (r.width <= 0 || r.height <= 0) return;
            p.strokeColor = colour;
            p.lineWidth = Mathf.Max(2f, r.width * 0.07f);
            p.lineJoin = LineJoin.Round;
            p.lineCap = LineCap.Round;
            Vector2 P(float x, float y) => new(r.x + x * r.width, r.y + y * r.height);
            switch (name)
            {
                case "open":   // a crate with its lid lifted
                    p.BeginPath();
                    p.MoveTo(P(0.16f, 0.46f)); p.LineTo(P(0.84f, 0.46f)); p.LineTo(P(0.84f, 0.86f)); p.LineTo(P(0.16f, 0.86f));
                    p.ClosePath();
                    p.MoveTo(P(0.16f, 0.66f)); p.LineTo(P(0.84f, 0.66f));   // a board across
                    p.MoveTo(P(0.16f, 0.46f)); p.LineTo(P(0.30f, 0.16f)); p.LineTo(P(0.92f, 0.28f)); p.LineTo(P(0.84f, 0.46f));   // the lid
                    p.Stroke();
                    break;
                case "sit":   // a chair seen from the side
                    p.BeginPath();
                    p.MoveTo(P(0.30f, 0.14f)); p.LineTo(P(0.34f, 0.56f)); p.LineTo(P(0.74f, 0.56f));   // the back, the seat
                    p.MoveTo(P(0.34f, 0.56f)); p.LineTo(P(0.32f, 0.88f));                              // the back legs
                    p.MoveTo(P(0.72f, 0.56f)); p.LineTo(P(0.74f, 0.88f));                              // the front legs
                    p.MoveTo(P(0.33f, 0.74f)); p.LineTo(P(0.73f, 0.74f));                              // a rung
                    p.Stroke();
                    break;
                case "sneak":   // someone crouched low, stepping forward
                    p.BeginPath();
                    p.Arc(P(0.62f, 0.22f), r.width * 0.09f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    p.MoveTo(P(0.56f, 0.32f)); p.LineTo(P(0.38f, 0.52f));                              // the back, bent
                    p.MoveTo(P(0.50f, 0.40f)); p.LineTo(P(0.66f, 0.50f)); p.LineTo(P(0.74f, 0.44f));   // an arm forward
                    p.MoveTo(P(0.38f, 0.52f)); p.LineTo(P(0.60f, 0.66f)); p.LineTo(P(0.58f, 0.86f));   // the front leg, knee bent
                    p.MoveTo(P(0.38f, 0.52f)); p.LineTo(P(0.24f, 0.70f)); p.LineTo(P(0.14f, 0.84f));   // the back leg, trailing
                    p.Stroke();
                    break;
                case "eye":   // an eye, its pupil
                    p.BeginPath();
                    p.MoveTo(P(0.08f, 0.50f));
                    p.BezierCurveTo(P(0.30f, 0.20f), P(0.70f, 0.20f), P(0.92f, 0.50f));
                    p.BezierCurveTo(P(0.70f, 0.80f), P(0.30f, 0.80f), P(0.08f, 0.50f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.50f), r.width * 0.12f, 0f, 360f);
                    p.Stroke();
                    break;
                case "camp":   // a flame over two crossed sticks
                    p.BeginPath();
                    p.MoveTo(P(0.18f, 0.88f)); p.LineTo(P(0.82f, 0.70f));
                    p.MoveTo(P(0.18f, 0.70f)); p.LineTo(P(0.82f, 0.88f));
                    p.Stroke();
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.70f));
                    p.BezierCurveTo(P(0.26f, 0.66f), P(0.30f, 0.44f), P(0.42f, 0.32f));
                    p.BezierCurveTo(P(0.42f, 0.42f), P(0.48f, 0.46f), P(0.52f, 0.46f));
                    p.BezierCurveTo(P(0.48f, 0.30f), P(0.56f, 0.18f), P(0.62f, 0.12f));
                    p.BezierCurveTo(P(0.64f, 0.30f), P(0.76f, 0.40f), P(0.72f, 0.56f));
                    p.BezierCurveTo(P(0.70f, 0.66f), P(0.60f, 0.70f), P(0.50f, 0.70f));
                    p.Stroke();
                    break;
                case "menu":   // three strokes, a little uneven, as if ruled by hand
                    p.BeginPath();
                    p.MoveTo(P(0.22f, 0.28f)); p.LineTo(P(0.78f, 0.27f));
                    p.MoveTo(P(0.22f, 0.50f)); p.LineTo(P(0.78f, 0.50f));
                    p.MoveTo(P(0.22f, 0.72f)); p.LineTo(P(0.78f, 0.73f));
                    p.Stroke();
                    break;
                case "notebook":
                    p.BeginPath();
                    p.MoveTo(P(0.24f, 0.12f)); p.LineTo(P(0.80f, 0.12f)); p.LineTo(P(0.80f, 0.88f)); p.LineTo(P(0.24f, 0.88f));
                    p.ClosePath();
                    p.MoveTo(P(0.36f, 0.12f)); p.LineTo(P(0.36f, 0.88f));   // the spine
                    for (var i = 0; i < 3; i++) { var y = 0.36f + i * 0.14f; p.MoveTo(P(0.47f, y)); p.LineTo(P(0.70f, y)); }
                    p.Stroke();
                    break;
                case "map":
                    p.BeginPath();
                    p.MoveTo(P(0.12f, 0.24f)); p.LineTo(P(0.38f, 0.14f)); p.LineTo(P(0.62f, 0.24f)); p.LineTo(P(0.88f, 0.14f));
                    p.LineTo(P(0.88f, 0.76f)); p.LineTo(P(0.62f, 0.86f)); p.LineTo(P(0.38f, 0.76f)); p.LineTo(P(0.12f, 0.86f));
                    p.ClosePath();
                    p.MoveTo(P(0.38f, 0.14f)); p.LineTo(P(0.38f, 0.76f));   // the folds
                    p.MoveTo(P(0.62f, 0.24f)); p.LineTo(P(0.62f, 0.86f));
                    p.Stroke();
                    break;
                case "pack":
                    p.BeginPath();
                    p.MoveTo(P(0.36f, 0.36f)); p.BezierCurveTo(P(0.36f, 0.10f), P(0.64f, 0.10f), P(0.64f, 0.36f));   // the handle
                    p.MoveTo(P(0.26f, 0.36f)); p.LineTo(P(0.74f, 0.36f)); p.LineTo(P(0.80f, 0.86f)); p.LineTo(P(0.20f, 0.86f));
                    p.ClosePath();
                    p.MoveTo(P(0.24f, 0.54f)); p.LineTo(P(0.76f, 0.54f));   // the flap
                    p.MoveTo(P(0.46f, 0.54f)); p.LineTo(P(0.46f, 0.64f)); p.LineTo(P(0.54f, 0.64f)); p.LineTo(P(0.54f, 0.54f));   // the buckle
                    p.Stroke();
                    break;
                case "talk":   // a speech bubble with its tail
                    p.BeginPath();
                    p.MoveTo(P(0.18f, 0.20f)); p.LineTo(P(0.82f, 0.20f)); p.LineTo(P(0.82f, 0.64f)); p.LineTo(P(0.46f, 0.64f));
                    p.LineTo(P(0.28f, 0.82f)); p.LineTo(P(0.30f, 0.64f)); p.LineTo(P(0.18f, 0.64f));
                    p.ClosePath();
                    p.Stroke();
                    break;
                case "look":   // an eye
                    p.BeginPath();
                    p.MoveTo(P(0.10f, 0.50f)); p.BezierCurveTo(P(0.30f, 0.20f), P(0.70f, 0.20f), P(0.90f, 0.50f));
                    p.BezierCurveTo(P(0.70f, 0.80f), P(0.30f, 0.80f), P(0.10f, 0.50f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.50f), r.width * 0.12f, 0f, 360f);
                    p.Stroke();
                    break;
                case "take":   // an arrow down into an open box
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.12f)); p.LineTo(P(0.50f, 0.56f));
                    p.MoveTo(P(0.34f, 0.42f)); p.LineTo(P(0.50f, 0.58f)); p.LineTo(P(0.66f, 0.42f));
                    p.MoveTo(P(0.18f, 0.52f)); p.LineTo(P(0.18f, 0.86f)); p.LineTo(P(0.82f, 0.86f)); p.LineTo(P(0.82f, 0.52f));
                    p.Stroke();
                    break;
                case "give":   // an arrow up out of an open box
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.62f)); p.LineTo(P(0.50f, 0.14f));
                    p.MoveTo(P(0.34f, 0.30f)); p.LineTo(P(0.50f, 0.14f)); p.LineTo(P(0.66f, 0.30f));
                    p.MoveTo(P(0.18f, 0.52f)); p.LineTo(P(0.18f, 0.86f)); p.LineTo(P(0.82f, 0.86f)); p.LineTo(P(0.82f, 0.52f));
                    p.Stroke();
                    break;
                case "use":   // a lever in its slot
                    p.BeginPath();
                    p.MoveTo(P(0.20f, 0.80f)); p.LineTo(P(0.80f, 0.80f));
                    p.MoveTo(P(0.50f, 0.80f)); p.LineTo(P(0.68f, 0.30f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.70f, 0.24f), r.width * 0.09f, 0f, 360f);
                    p.Stroke();
                    break;
                case "steal":   // a purse with a cut
                    p.BeginPath();
                    p.MoveTo(P(0.38f, 0.30f)); p.LineTo(P(0.62f, 0.30f));
                    p.MoveTo(P(0.38f, 0.30f)); p.BezierCurveTo(P(0.10f, 0.50f), P(0.14f, 0.86f), P(0.50f, 0.86f));
                    p.BezierCurveTo(P(0.86f, 0.86f), P(0.90f, 0.50f), P(0.62f, 0.30f));
                    p.MoveTo(P(0.40f, 0.18f)); p.LineTo(P(0.50f, 0.30f)); p.LineTo(P(0.60f, 0.18f));   // the tie
                    p.MoveTo(P(0.30f, 0.70f)); p.LineTo(P(0.70f, 0.50f));   // the cut
                    p.Stroke();
                    break;
                case "attack":   // a blade
                    p.BeginPath();
                    p.MoveTo(P(0.24f, 0.76f)); p.LineTo(P(0.82f, 0.18f));
                    p.MoveTo(P(0.22f, 0.56f)); p.LineTo(P(0.44f, 0.78f));   // the guard
                    p.MoveTo(P(0.24f, 0.76f)); p.LineTo(P(0.14f, 0.86f));   // the grip
                    p.Stroke();
                    break;
                case "trade":   // an arrow each way
                    p.BeginPath();
                    p.MoveTo(P(0.18f, 0.36f)); p.LineTo(P(0.80f, 0.36f));
                    p.MoveTo(P(0.66f, 0.22f)); p.LineTo(P(0.80f, 0.36f)); p.LineTo(P(0.66f, 0.50f));
                    p.MoveTo(P(0.82f, 0.64f)); p.LineTo(P(0.20f, 0.64f));
                    p.MoveTo(P(0.34f, 0.50f)); p.LineTo(P(0.20f, 0.64f)); p.LineTo(P(0.34f, 0.78f));
                    p.Stroke();
                    break;
                default:   // a verb with no icon of its own yet
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.50f), r.width * 0.16f, 0f, 360f);
                    p.Stroke();
                    break;
            }
        }
    }
}
