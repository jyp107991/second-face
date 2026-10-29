using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The card over the app while it starts (P5 step 3; the title screen proper is P5 step 10): the name in the book
    /// face, what is loading under it, and a line of detail (what loaded, the screen and the device). It lets the world
    /// show through as it comes in and takes no touches.
    /// </summary>
    public sealed class TitleCard : UIScreen
    {
        private Label _status, _detail;
        private string _statusText = "", _detailText = "";

        public override bool Opaque => false;
        public override bool PassesTouches => true;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement { pickingMode = PickingMode.Ignore };
            root.AddToClassList("sf-title-card");
            var safe = new VisualElement { pickingMode = PickingMode.Ignore };
            safe.AddToClassList(UIService.SafeClass);
            safe.AddToClassList("sf-title-card__body");
            root.Add(safe);
            var name = new Label { pickingMode = PickingMode.Ignore };
            Strings.Bind(name, "title.name");
            name.AddToClassList("sf-title-card__name");
            _status = new Label(_statusText) { pickingMode = PickingMode.Ignore };
            _status.AddToClassList("sf-title-card__status");
            _detail = new Label(_detailText) { pickingMode = PickingMode.Ignore };
            _detail.AddToClassList("sf-title-card__detail");
            safe.Add(name);
            safe.Add(_status);
            safe.Add(_detail);
            return root;
        }

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

        protected internal override bool Back() => false;
    }
}
