using System;
using System.Collections.Generic;
using SecondFace.Core.Save;
using SecondFace.Game.Play;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the saves screen works on (P5.3j): the session's slots, and whether it saves or loads.</summary>
    public sealed class SavesModel
    {
        public Session Session;
        /// <summary>Saving (the quick slot and the three by hand) instead of loading (every slot with a save).</summary>
        public bool Saving;
        /// <summary>Saves the game now to a slot (returns what it holds, null when nothing could be saved).</summary>
        public Func<string, SaveMeta> Save;
        /// <summary>Loads a slot (the screens close as the game begins again).</summary>
        public Action<string> Load;
    }

    /// <summary>
    /// The saves (P5.3j, BUILD_PLAN §6.I): one page on the desk, a card per slot with its picture of the scene, the
    /// person, the place and the day, the time played and when it was saved. Saving takes the quick slot or one of the
    /// three by hand (an empty one at once, a used one after asking); loading lists every slot with a save, the
    /// autosave first.
    /// </summary>
    public sealed class SavesScreen : UIScreen
    {
        private readonly SavesModel _m;
        private VisualElement _grid;
        private readonly List<Texture2D> _pictures = new();

        public SavesScreen(SavesModel model) { _m = model; }

        /// <summary>The cards by slot (tests press them).</summary>
        public Dictionary<string, Button> Cards { get; } = new();

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-creation");
            root.AddToClassList("sf-menu");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);
            var body = new VisualElement();
            body.AddToClassList("sf-menu__body");
            safe.Add(body);
            var paper = new VisualElement();
            paper.AddToClassList("sf-creation__paper");
            body.Add(paper);
            paper.Add(SettingsScreen.Head(Strings.Get(_m.Saving ? "saves.save_title" : "saves.load_title"), Close));
            var scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
            };
            scroll.AddToClassList("sf-creation__scroll");
            paper.Add(scroll);
            _grid = new VisualElement();
            _grid.AddToClassList("sf-saves__grid");
            scroll.Add(_grid);
            Fill();
            return root;
        }

        private void Fill()
        {
            Forget();
            _grid.Clear();
            Cards.Clear();
            var filled = _m.Session != null ? _m.Session.List() : new Dictionary<string, SaveMeta>();
            var slots = _m.Saving ? new List<string> { Session.Quick } : new List<string> { Session.Auto, Session.Quick };
            slots.AddRange(Session.Manual);
            var shown = 0;
            foreach (var slot in slots)
            {
                filled.TryGetValue(slot, out var meta);
                if (!_m.Saving && meta == null) continue;
                _grid.Add(Card(slot, meta));
                shown++;
            }
            if (shown == 0)
            {
                var none = new Label(Strings.Get("saves.none"));
                none.AddToClassList("sf-creation__note");
                _grid.Add(none);
            }
        }

        private Button Card(string slot, SaveMeta meta)
        {
            var card = new Button(() => Chosen(slot, meta)) { name = "slot-" + slot };
            card.AddToClassList("sf-saves__card");
            card.EnableInClassList("sf-saves__card--empty", meta == null);
            var picture = new Image { pickingMode = PickingMode.Ignore, scaleMode = ScaleMode.ScaleAndCrop };
            picture.AddToClassList("sf-saves__picture");
            var tex = meta != null ? Session.ThumbTexture(meta.Thumb) : null;
            if (tex != null) { picture.image = tex; _pictures.Add(tex); }
            card.Add(picture);
            var words = new VisualElement { pickingMode = PickingMode.Ignore };
            words.AddToClassList("sf-saves__words");
            card.Add(words);
            Text(words, "sf-saves__slot", SlotName(slot).ToUpperInvariant());
            if (meta == null) Text(words, "sf-saves__empty", Strings.Get("saves.empty"));
            else
            {
                Text(words, "sf-saves__who", TitleScreen.Describe(meta));
                Text(words, "sf-saves__when", Strings.Get("saves.played", Played(meta.PlaytimeSec)) + " · " +
                    DateTimeOffset.FromUnixTimeMilliseconds(meta.Timestamp).ToLocalTime().ToString("d MMM yyyy, HH:mm"));
            }
            Cards[slot] = card;
            return card;
        }

        private static void Text(VisualElement into, string cls, string text)
        {
            var l = new Label(text) { pickingMode = PickingMode.Ignore };
            l.AddToClassList(cls);
            into.Add(l);
        }

        public static string SlotName(string slot) => slot switch
        {
            Session.Auto => Strings.Get("saves.auto"),
            Session.Quick => Strings.Get("saves.quick"),
            _ => Strings.Get("saves.slot", Array.IndexOf(Session.Manual, slot) + 1),
        };

        /// <summary>Time played, in hours and minutes.</summary>
        public static string Played(double seconds)
        {
            var m = (int)(seconds / 60);
            return m >= 60 ? Strings.Get("saves.hours", m / 60, m % 60) : Strings.Get("saves.minutes", m);
        }

        private void Chosen(string slot, SaveMeta meta)
        {
            if (!_m.Saving)
            {
                if (meta != null) _m.Load?.Invoke(slot);
                return;
            }
            if (meta == null) { SaveTo(slot); return; }
            UI.Open(new ConfirmScreen(Strings.Get("saves.overwrite", SlotName(slot)), Strings.Get("saves.overwrite_yes"), Strings.Get("saves.overwrite_no"), () => SaveTo(slot)));
        }

        /// <summary>Saves to a slot and shows it saved.</summary>
        public void SaveTo(string slot)
        {
            if (_m.Save?.Invoke(slot) == null) return;
            Fill();
        }

        private void Forget()
        {
            foreach (var t in _pictures) if (t != null) UnityEngine.Object.Destroy(t);
            _pictures.Clear();
        }

        protected internal override void Hidden() => Forget();
    }
}
