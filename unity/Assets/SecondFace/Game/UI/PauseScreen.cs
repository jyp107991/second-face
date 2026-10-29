using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the pause offers (P5.3j) and the line it heads with (who, where, which day).</summary>
    public sealed class PauseModel
    {
        public string Line;
        public Action Save, Load, Settings, Photo, Quit;
    }

    /// <summary>
    /// The pause (P5.3j): the world stops behind a scrim (time stands still while it is open, and under the save, load and
    /// settings screens opened from it) and a column of choices: back to the game, save, load, settings, back to the
    /// title (the game is saved to the auto slot first). The HUD's menu button and the back gesture on the open world
    /// open it; photo mode is opened from it too.
    /// </summary>
    public sealed class PauseScreen : UIScreen
    {
        private readonly PauseModel _m;
        private float _timeScale = 1f;

        public PauseScreen(PauseModel model) { _m = model; }

        public override bool Opaque => false;
        public override bool HidesHud => true;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-pause");
            root.AddToClassList(UIService.SafeClass);
            var column = new VisualElement();
            column.AddToClassList("sf-pause__column");
            root.Add(column);
            var head = new Label(Strings.Get("pause.title")) { pickingMode = PickingMode.Ignore };
            head.AddToClassList("sf-pause__title");
            column.Add(head);
            if (!string.IsNullOrEmpty(_m.Line))
            {
                var line = new Label(_m.Line) { pickingMode = PickingMode.Ignore };
                line.AddToClassList("sf-pause__line");
                column.Add(line);
            }
            Choice(column, "pause-resume", "pause.resume", Close);
            Choice(column, "pause-save", "pause.save", () => _m.Save?.Invoke()).SetEnabled(_m.Save != null);
            Choice(column, "pause-load", "pause.load", () => _m.Load?.Invoke()).SetEnabled(_m.Load != null);
            Choice(column, "pause-photo", "pause.photo", () => _m.Photo?.Invoke()).SetEnabled(_m.Photo != null);
            Choice(column, "pause-settings", "pause.settings", () => _m.Settings?.Invoke());
            Choice(column, "pause-quit", "pause.quit", () => _m.Quit?.Invoke());
            // a tap on the scrim beside the column goes back to the game
            root.RegisterCallback<ClickEvent>(e => { if (e.target == root) Close(); });
            return root;
        }

        private static Button Choice(VisualElement into, string name, string key, Action act)
        {
            var b = new Button(act) { name = name, text = Strings.Get(key) };
            b.AddToClassList("sf-pause__choice");
            into.Add(b);
            return b;
        }

        protected internal override void Shown()
        {
            _timeScale = Time.timeScale > 0f ? Time.timeScale : 1f;
            Time.timeScale = 0f;
        }

        protected internal override void Hidden() => Time.timeScale = _timeScale;
    }

    /// <summary>A question that must be answered (P5.3j): a line, a yes and a no; the back gesture is the no.</summary>
    public sealed class ConfirmScreen : UIScreen
    {
        private readonly string _question, _yes, _no;
        private readonly Action _then;

        public ConfirmScreen(string question, string yes, string no, Action then) { _question = question; _yes = yes; _no = no; _then = then; }

        public override UILayer Layer => UILayer.Modal;
        public override bool Opaque => false;
        public override bool HidesHud => true;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-modal");
            var card = new VisualElement();
            card.AddToClassList("sf-card");
            root.Add(card);
            var q = new Label(_question);
            q.AddToClassList("sf-book");
            card.Add(q);
            var row = new VisualElement();
            row.AddToClassList("sf-confirm__row");
            card.Add(row);
            var no = new Button(Close) { name = "confirm-no", text = _no };
            no.AddToClassList("sf-button");
            no.AddToClassList("sf-button--quiet");
            row.Add(no);
            var yes = new Button(() => { Close(); _then?.Invoke(); }) { name = "confirm-yes", text = _yes };
            yes.AddToClassList("sf-button");
            yes.AddToClassList("sf-confirm__yes");
            row.Add(yes);
            return root;
        }
    }
}
