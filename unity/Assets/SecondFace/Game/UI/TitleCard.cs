using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The card over the app while it starts (P5 step 3; the title screen proper is P5 step 10): the name in the book
    /// face, what is loading under it, and a line of detail (what loaded, the screen and the device). It lets the world
    /// show through as it comes in and takes no touches. The same card carries the story's title cards
    /// (<see cref="Chapter"/>, the content's <c>title</c> event: a chapter begins, an act ends): the first line of the
    /// text small and spaced over the rest in the book face, fading in and out over the world.
    /// </summary>
    public sealed class TitleCard : UIScreen
    {
        /// <summary>How long a story card takes to fade in or out, seconds.</summary>
        public const float FadeSeconds = 0.8f;

        private Label _status, _detail, _name;
        private string _statusText = "", _detailText = "";
        /// <summary>A story card's text (null for the start card).</summary>
        private readonly string _chapter;

        public TitleCard() { }
        private TitleCard(string chapter) { _chapter = chapter ?? ""; }

        /// <summary>A story card: "CHAPTER ONE\nTHE KNOCK" shows "CHAPTER ONE" small over "THE KNOCK" (one line shows
        /// large alone).</summary>
        public static TitleCard Chapter(string text) => new(text);

        public override bool Opaque => false;
        public override bool PassesTouches => true;

        /// <summary>The story card's text (null for the start card; tests read it).</summary>
        public string Text => _chapter;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement { pickingMode = PickingMode.Ignore };
            root.AddToClassList("sf-title-card");
            var safe = new VisualElement { pickingMode = PickingMode.Ignore };
            safe.AddToClassList(UIService.SafeClass);
            safe.AddToClassList("sf-title-card__body");
            root.Add(safe);
            _name = new Label { pickingMode = PickingMode.Ignore };
            _name.AddToClassList("sf-title-card__name");
            _status = new Label(_statusText) { pickingMode = PickingMode.Ignore };
            _status.AddToClassList("sf-title-card__status");
            _detail = new Label(_detailText) { pickingMode = PickingMode.Ignore };
            _detail.AddToClassList("sf-title-card__detail");
            if (_chapter != null)
            {
                root.AddToClassList("sf-title-card--chapter");
                var lines = _chapter.Replace("\r", "").Split('\n');
                var over = lines.Length > 1 ? lines[0].Trim() : "";
                var main = lines.Length > 1 ? string.Join("\n", lines, 1, lines.Length - 1).Trim() : _chapter.Trim();
                _status.text = over;
                _status.AddToClassList("sf-title-card__over");
                _status.style.display = over.Length > 0 ? DisplayStyle.Flex : DisplayStyle.None;
                _name.text = main;
                safe.Add(_status);
                safe.Add(_name);
                return root;
            }
            Strings.Bind(_name, "title.name");
            safe.Add(_name);
            safe.Add(_status);
            safe.Add(_detail);
            return root;
        }

        protected internal override void Shown()
        {
            // a story card fades in (its transition runs from the hidden state once it is in the panel)
            if (_chapter != null) Root.schedule.Execute(() => Root.AddToClassList("sf-title-card--shown")).ExecuteLater(20);
        }

        /// <summary>A story card fades out (it is closed after <see cref="FadeSeconds"/>).</summary>
        public void FadeOut() => Root?.RemoveFromClassList("sf-title-card--shown");

        /// <summary>What is happening (a line) and the detail under it.</summary>
        public void Set(string status, string detail = null)
        {
            _statusText = status ?? "";
            if (detail != null) _detailText = detail;
            if (_status != null) _status.text = _statusText;
            if (_detail != null) _detail.text = _detailText;
        }

        /// <summary>The line shown (tests read it).</summary>
        public string Status => _statusText;

        /// <summary>The start card stays; a story card goes at the back gesture.</summary>
        protected internal override bool Back() => _chapter != null;
    }
}
