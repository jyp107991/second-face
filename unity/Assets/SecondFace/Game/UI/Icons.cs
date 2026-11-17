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
        public static readonly string[] Names = { "notebook", "map", "pack", "talk", "look", "take", "use", "steal", "give", "attack", "trade", "menu", "open", "camp", "sit", "sneak", "eye", "heal", "reload", "end_turn", "aim_head", "aim_legs", "burst",
            // the fight's (COMBAT.md B4–B10): actions, marks over fighters, statuses
            "overwatch", "cover_fire", "suppress", "throw", "stance", "stand", "crouch", "prone", "swap", "undo", "take_prisoner", "demand", "heal_ally",
            "shield_half", "shield_full", "flanked", "intent", "caught", "surprised", "watching",
            "bleeding", "burning", "blinded", "suppressed", "choking", "shocked", "adrenaline", "stunned", "crippled_arm", "crippled_leg", "crippled_eyes" };

        public static VisualElement Make(string name, float size = 40f)
        {
            var e = new VisualElement { name = "icon-" + name, pickingMode = PickingMode.Ignore };
            e.AddToClassList("sf-icon");
            e.style.width = size;
            e.style.height = size;
            e.userData = name;
            e.generateVisualContent += mgc => Draw(e.userData as string ?? name, mgc.painter2D, e.contentRect, e.resolvedStyle.color);
            return e;
        }

        /// <summary>Draws another icon in an element <see cref="Make"/> made (a reused mark or status slot).</summary>
        public static void Set(VisualElement e, string name)
        {
            if (e == null || e.userData as string == name) return;
            e.userData = name;
            e.name = "icon-" + name;
            e.MarkDirtyRepaint();
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
                case "heal":   // a rolled bandage, its tail loose
                    p.BeginPath();
                    p.Arc(P(0.40f, 0.48f), r.width * 0.22f, 0f, 360f);
                    p.MoveTo(P(0.40f, 0.48f)); p.Arc(P(0.40f, 0.48f), r.width * 0.08f, 0f, 360f);
                    p.MoveTo(P(0.62f, 0.48f)); p.BezierCurveTo(P(0.72f, 0.62f), P(0.80f, 0.70f), P(0.88f, 0.84f));
                    p.MoveTo(P(0.40f, 0.70f)); p.BezierCurveTo(P(0.56f, 0.76f), P(0.72f, 0.82f), P(0.80f, 0.90f));
                    p.Stroke();
                    break;
                case "reload":   // a magazine, an arrow round it
                    p.BeginPath();
                    p.MoveTo(P(0.40f, 0.26f)); p.LineTo(P(0.60f, 0.26f)); p.LineTo(P(0.66f, 0.76f)); p.LineTo(P(0.46f, 0.76f)); p.ClosePath();
                    p.MoveTo(P(0.44f, 0.40f)); p.LineTo(P(0.60f, 0.40f));
                    p.MoveTo(P(0.22f, 0.70f)); p.BezierCurveTo(P(0.10f, 0.40f), P(0.26f, 0.14f), P(0.50f, 0.12f));
                    p.MoveTo(P(0.18f, 0.56f)); p.LineTo(P(0.22f, 0.70f)); p.LineTo(P(0.34f, 0.62f));
                    p.Stroke();
                    break;
                case "end_turn":   // an hourglass
                    p.BeginPath();
                    p.MoveTo(P(0.28f, 0.16f)); p.LineTo(P(0.72f, 0.16f));
                    p.MoveTo(P(0.28f, 0.84f)); p.LineTo(P(0.72f, 0.84f));
                    p.MoveTo(P(0.32f, 0.16f)); p.BezierCurveTo(P(0.32f, 0.40f), P(0.50f, 0.44f), P(0.50f, 0.50f));
                    p.BezierCurveTo(P(0.50f, 0.56f), P(0.32f, 0.60f), P(0.32f, 0.84f));
                    p.MoveTo(P(0.68f, 0.16f)); p.BezierCurveTo(P(0.68f, 0.40f), P(0.50f, 0.44f), P(0.50f, 0.50f));
                    p.BezierCurveTo(P(0.50f, 0.56f), P(0.68f, 0.60f), P(0.68f, 0.84f));
                    p.MoveTo(P(0.40f, 0.78f)); p.LineTo(P(0.60f, 0.78f));   // the sand run through
                    p.Stroke();
                    break;
                case "aim_head":   // a head and shoulders, a ring on the head
                case "aim_legs":   // the same, the ring on the legs
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.24f), r.width * 0.10f, 0f, 360f);
                    p.MoveTo(P(0.34f, 0.44f)); p.LineTo(P(0.66f, 0.44f)); p.LineTo(P(0.62f, 0.66f)); p.LineTo(P(0.38f, 0.66f)); p.ClosePath();
                    p.MoveTo(P(0.42f, 0.66f)); p.LineTo(P(0.40f, 0.92f));
                    p.MoveTo(P(0.58f, 0.66f)); p.LineTo(P(0.60f, 0.92f));
                    p.Stroke();
                    p.BeginPath();
                    var at = name == "aim_head" ? P(0.50f, 0.24f) : P(0.50f, 0.80f);
                    p.Arc(at, r.width * 0.20f, 0f, 360f);
                    p.Stroke();
                    break;
                case "burst":   // three shots in a row
                    p.BeginPath();
                    for (var k = 0; k < 3; k++)
                    {
                        var y = 0.30f + k * 0.20f;
                        p.MoveTo(P(0.18f + k * 0.06f, y)); p.LineTo(P(0.62f + k * 0.06f, y));
                        p.MoveTo(P(0.62f + k * 0.06f, y - 0.05f)); p.LineTo(P(0.74f + k * 0.06f, y)); p.LineTo(P(0.62f + k * 0.06f, y + 0.05f));
                    }
                    p.Stroke();
                    break;
                // ---- the fight's (COMBAT.md B4–B10) ----
                case "overwatch":   // an eye in a sight's ring
                case "watching":
                    p.BeginPath();
                    p.MoveTo(P(0.14f, 0.50f)); p.BezierCurveTo(P(0.32f, 0.26f), P(0.68f, 0.26f), P(0.86f, 0.50f));
                    p.BezierCurveTo(P(0.68f, 0.74f), P(0.32f, 0.74f), P(0.14f, 0.50f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.50f), r.width * 0.10f, 0f, 360f);
                    p.MoveTo(P(0.50f, 0.06f)); p.LineTo(P(0.50f, 0.22f));
                    p.MoveTo(P(0.50f, 0.78f)); p.LineTo(P(0.50f, 0.94f));
                    p.Stroke();
                    break;
                case "cover_fire":   // a shield, an arrow out past it
                    Shield(p, P, false, false);
                    p.BeginPath();
                    p.MoveTo(P(0.56f, 0.50f)); p.LineTo(P(0.94f, 0.50f));
                    p.MoveTo(P(0.82f, 0.38f)); p.LineTo(P(0.94f, 0.50f)); p.LineTo(P(0.82f, 0.62f));
                    p.Stroke();
                    break;
                case "suppress":   // three chevrons bearing down
                case "suppressed":
                    p.BeginPath();
                    for (var k = 0; k < 3; k++) { var y = 0.22f + k * 0.22f; p.MoveTo(P(0.22f, y)); p.LineTo(P(0.50f, y + 0.16f)); p.LineTo(P(0.78f, y)); }
                    p.Stroke();
                    break;
                case "throw":   // an arc through the air to a round can
                    p.BeginPath();
                    p.MoveTo(P(0.14f, 0.84f)); p.BezierCurveTo(P(0.24f, 0.10f), P(0.60f, 0.10f), P(0.72f, 0.60f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.76f, 0.74f), r.width * 0.11f, 0f, 360f);
                    p.MoveTo(P(0.76f, 0.58f)); p.LineTo(P(0.84f, 0.52f));   // the fuse
                    p.Stroke();
                    break;
                case "stance":   // standing, and the same figure lower
                case "stand":
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.16f), r.width * 0.08f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.26f)); p.LineTo(P(0.50f, 0.58f));
                    p.MoveTo(P(0.34f, 0.40f)); p.LineTo(P(0.50f, 0.32f)); p.LineTo(P(0.66f, 0.40f));
                    p.MoveTo(P(0.50f, 0.58f)); p.LineTo(P(0.40f, 0.88f));
                    p.MoveTo(P(0.50f, 0.58f)); p.LineTo(P(0.60f, 0.88f));
                    if (name == "stance") { p.MoveTo(P(0.82f, 0.50f)); p.LineTo(P(0.82f, 0.82f)); p.MoveTo(P(0.74f, 0.74f)); p.LineTo(P(0.82f, 0.84f)); p.LineTo(P(0.90f, 0.74f)); }
                    p.Stroke();
                    break;
                case "prone":   // flat on the ground
                    p.BeginPath();
                    p.Arc(P(0.18f, 0.60f), r.width * 0.08f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    p.MoveTo(P(0.28f, 0.64f)); p.LineTo(P(0.66f, 0.68f)); p.LineTo(P(0.90f, 0.64f));
                    p.MoveTo(P(0.66f, 0.68f)); p.LineTo(P(0.88f, 0.76f));
                    p.MoveTo(P(0.36f, 0.66f)); p.LineTo(P(0.30f, 0.50f));   // an arm propped
                    p.MoveTo(P(0.08f, 0.80f)); p.LineTo(P(0.94f, 0.80f));   // the ground
                    p.Stroke();
                    break;
                case "swap":   // two arrows round each other
                    p.BeginPath();
                    p.MoveTo(P(0.20f, 0.42f)); p.BezierCurveTo(P(0.24f, 0.16f), P(0.70f, 0.12f), P(0.80f, 0.36f));
                    p.MoveTo(P(0.66f, 0.30f)); p.LineTo(P(0.80f, 0.38f)); p.LineTo(P(0.86f, 0.22f));
                    p.MoveTo(P(0.80f, 0.58f)); p.BezierCurveTo(P(0.76f, 0.84f), P(0.30f, 0.88f), P(0.20f, 0.64f));
                    p.MoveTo(P(0.34f, 0.70f)); p.LineTo(P(0.20f, 0.62f)); p.LineTo(P(0.14f, 0.78f));
                    p.Stroke();
                    break;
                case "undo":   // an arrow turning back
                    p.BeginPath();
                    p.MoveTo(P(0.80f, 0.78f)); p.BezierCurveTo(P(0.88f, 0.40f), P(0.62f, 0.22f), P(0.24f, 0.30f));
                    p.MoveTo(P(0.38f, 0.14f)); p.LineTo(P(0.22f, 0.30f)); p.LineTo(P(0.38f, 0.46f));
                    p.Stroke();
                    break;
                case "take_prisoner":   // two cuffs and their link
                    p.BeginPath();
                    p.Arc(P(0.30f, 0.56f), r.width * 0.17f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.70f, 0.56f), r.width * 0.17f, 0f, 360f);
                    p.MoveTo(P(0.44f, 0.46f)); p.LineTo(P(0.56f, 0.46f));
                    p.Stroke();
                    break;
                case "demand":   // a shout: a bubble with a bar and a point
                    p.BeginPath();
                    p.MoveTo(P(0.16f, 0.18f)); p.LineTo(P(0.84f, 0.18f)); p.LineTo(P(0.84f, 0.64f)); p.LineTo(P(0.46f, 0.64f));
                    p.LineTo(P(0.28f, 0.84f)); p.LineTo(P(0.30f, 0.64f)); p.LineTo(P(0.16f, 0.64f)); p.ClosePath();
                    p.MoveTo(P(0.50f, 0.28f)); p.LineTo(P(0.50f, 0.46f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.55f), r.width * 0.025f, 0f, 360f);
                    p.Stroke();
                    break;
                case "heal_ally":
                    Draw("heal", p, r, colour);
                    break;
                case "shield_half":   // a shield filled to its middle
                    Shield(p, P, true, false, colour);
                    break;
                case "shield_full":   // a shield filled
                    Shield(p, P, true, true, colour);
                    break;
                case "flanked":   // a shield split by a crack
                    Shield(p, P, false, false);
                    p.BeginPath();
                    p.MoveTo(P(0.58f, 0.12f)); p.LineTo(P(0.44f, 0.40f)); p.LineTo(P(0.58f, 0.56f)); p.LineTo(P(0.42f, 0.88f));
                    p.Stroke();
                    break;
                case "intent":   // a sight's cross
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.50f), r.width * 0.28f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.08f)); p.LineTo(P(0.50f, 0.34f)); p.MoveTo(P(0.50f, 0.66f)); p.LineTo(P(0.50f, 0.92f));
                    p.MoveTo(P(0.08f, 0.50f)); p.LineTo(P(0.34f, 0.50f)); p.MoveTo(P(0.66f, 0.50f)); p.LineTo(P(0.92f, 0.50f));
                    p.Stroke();
                    break;
                case "caught":   // a warning: a triangle with a point
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.12f)); p.LineTo(P(0.90f, 0.86f)); p.LineTo(P(0.10f, 0.86f)); p.ClosePath();
                    p.MoveTo(P(0.50f, 0.38f)); p.LineTo(P(0.50f, 0.62f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.74f), r.width * 0.025f, 0f, 360f);
                    p.Stroke();
                    break;
                case "surprised":   // a point of alarm
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.14f)); p.LineTo(P(0.50f, 0.66f));
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.82f), r.width * 0.05f, 0f, 360f);
                    p.Stroke();
                    break;
                case "bleeding":   // a drop
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.10f));
                    p.BezierCurveTo(P(0.62f, 0.32f), P(0.80f, 0.50f), P(0.80f, 0.64f));
                    p.BezierCurveTo(P(0.80f, 0.82f), P(0.66f, 0.92f), P(0.50f, 0.92f));
                    p.BezierCurveTo(P(0.34f, 0.92f), P(0.20f, 0.82f), P(0.20f, 0.64f));
                    p.BezierCurveTo(P(0.20f, 0.50f), P(0.38f, 0.32f), P(0.50f, 0.10f));
                    p.ClosePath();
                    p.fillColor = colour;
                    p.Fill();
                    break;
                case "burning":   // a flame
                    p.BeginPath();
                    p.MoveTo(P(0.50f, 0.90f));
                    p.BezierCurveTo(P(0.20f, 0.86f), P(0.22f, 0.56f), P(0.38f, 0.40f));
                    p.BezierCurveTo(P(0.38f, 0.54f), P(0.46f, 0.58f), P(0.50f, 0.58f));
                    p.BezierCurveTo(P(0.44f, 0.38f), P(0.54f, 0.20f), P(0.62f, 0.10f));
                    p.BezierCurveTo(P(0.64f, 0.34f), P(0.82f, 0.48f), P(0.78f, 0.68f));
                    p.BezierCurveTo(P(0.76f, 0.82f), P(0.64f, 0.90f), P(0.50f, 0.90f));
                    p.Stroke();
                    break;
                case "blinded":   // an eye struck through
                case "crippled_eyes":
                    p.BeginPath();
                    p.MoveTo(P(0.10f, 0.50f)); p.BezierCurveTo(P(0.30f, 0.22f), P(0.70f, 0.22f), P(0.90f, 0.50f));
                    p.BezierCurveTo(P(0.70f, 0.78f), P(0.30f, 0.78f), P(0.10f, 0.50f));
                    p.MoveTo(P(0.18f, 0.16f)); p.LineTo(P(0.82f, 0.84f));
                    p.Stroke();
                    break;
                case "choking":   // a cloud
                    p.BeginPath();
                    p.MoveTo(P(0.20f, 0.70f));
                    p.BezierCurveTo(P(0.04f, 0.70f), P(0.08f, 0.44f), P(0.26f, 0.46f));
                    p.BezierCurveTo(P(0.28f, 0.24f), P(0.56f, 0.20f), P(0.62f, 0.38f));
                    p.BezierCurveTo(P(0.80f, 0.30f), P(0.96f, 0.50f), P(0.82f, 0.70f));
                    p.ClosePath();
                    p.Stroke();
                    break;
                case "shocked":   // a bolt
                    p.BeginPath();
                    p.MoveTo(P(0.60f, 0.08f)); p.LineTo(P(0.30f, 0.54f)); p.LineTo(P(0.52f, 0.54f)); p.LineTo(P(0.38f, 0.92f)); p.LineTo(P(0.72f, 0.42f)); p.LineTo(P(0.50f, 0.42f)); p.ClosePath();
                    p.Stroke();
                    break;
                case "adrenaline":   // a pulse
                    p.BeginPath();
                    p.MoveTo(P(0.06f, 0.56f)); p.LineTo(P(0.30f, 0.56f)); p.LineTo(P(0.40f, 0.24f)); p.LineTo(P(0.54f, 0.86f)); p.LineTo(P(0.64f, 0.44f)); p.LineTo(P(0.72f, 0.56f)); p.LineTo(P(0.94f, 0.56f));
                    p.Stroke();
                    break;
                case "stunned":   // stars round the head
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.62f), r.width * 0.16f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    for (var k = 0; k < 3; k++)
                    {
                        var c = P(0.22f + k * 0.28f, 0.22f + (k == 1 ? -0.06f : 0f));
                        var d = r.width * 0.07f;
                        p.MoveTo(c + new Vector2(-d, 0)); p.LineTo(c + new Vector2(d, 0));
                        p.MoveTo(c + new Vector2(0, -d)); p.LineTo(c + new Vector2(0, d));
                    }
                    p.Stroke();
                    break;
                case "crippled_arm":   // a bone, broken
                case "crippled_leg":
                    p.BeginPath();
                    p.Arc(P(0.18f, 0.24f), r.width * 0.07f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    p.Arc(P(0.82f, 0.76f), r.width * 0.07f, 0f, 360f);
                    p.Stroke();
                    p.BeginPath();
                    p.MoveTo(P(0.24f, 0.30f)); p.LineTo(P(0.44f, 0.48f)); p.LineTo(P(0.50f, 0.42f)); p.LineTo(P(0.52f, 0.58f)); p.LineTo(P(0.56f, 0.52f)); p.LineTo(P(0.76f, 0.70f));
                    p.Stroke();
                    break;
                case "crouch":
                    Draw("sneak", p, r, colour);
                    break;
                default:   // a verb with no icon of its own yet
                    p.BeginPath();
                    p.Arc(P(0.50f, 0.50f), r.width * 0.16f, 0f, 360f);
                    p.Stroke();
                    break;
            }
        }

        /// <summary>A shield's outline, and its fill to the middle (half cover) or whole (full cover).</summary>
        private static void Shield(Painter2D p, System.Func<float, float, Vector2> P, bool fill, bool whole, Color colour = default)
        {
            void Outline(float top)
            {
                p.BeginPath();
                p.MoveTo(P(0.18f, top)); p.LineTo(P(0.82f, top)); p.LineTo(P(0.82f, 0.50f));
                p.BezierCurveTo(P(0.80f, 0.74f), P(0.64f, 0.86f), P(0.50f, 0.92f));
                p.BezierCurveTo(P(0.36f, 0.86f), P(0.20f, 0.74f), P(0.18f, 0.50f));
                p.ClosePath();
            }
            Outline(0.14f);
            p.Stroke();
            if (!fill) return;
            Outline(whole ? 0.14f : 0.52f);
            p.fillColor = colour;
            p.Fill();
        }
    }
}
