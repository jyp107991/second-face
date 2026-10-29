using System;
using System.Collections.Generic;
using SecondFace.Core.Content;
using SecondFace.Core.Quest;
using SecondFace.Core.State;
using SecondFace.Core.World;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The field notebook (P5.3f, DESIGN_UNITY §6: a field notebook, not a wrist computer): a book open on its two
    /// pages, the sections as tabs along the top (quests, leads, people, letters, decisions), the entries listed on the
    /// left page (open ones first, finished ones dimmed after; the tracked quest marked) and the chosen one written out on
    /// the right: its objectives ticked or open, its journal newest first. A quest can be tracked from here (the HUD shows
    /// its next objective). The pages come from Core <see cref="Notebook"/>; the words from the UI table.
    /// </summary>
    public sealed class NotebookScreen : UIScreen
    {
        private readonly GameState _g;
        private readonly IReadOnlyDictionary<string, QuestDef> _quests;
        private readonly IReadOnlyDictionary<string, LeadDef> _leads;
        private readonly IReadOnlyDictionary<string, ConclusionDef> _conclusions;
        private readonly IReadOnlyDictionary<string, LetterDef> _letters;
        private readonly Dictionary<string, Button> _tabs = new();
        private ScrollView _list, _detail;
        private List<NoteEntry> _entries = new();

        public string Section { get; private set; } = "quests";
        public string Selected { get; private set; }
        public IReadOnlyList<NoteEntry> Entries => _entries;
        public ScrollView List => _list;
        public ScrollView Detail => _detail;
        public Button Tab(string section) => _tabs.TryGetValue(section, out var b) ? b : null;
        /// <summary>The track button on a quest's page (null elsewhere).</summary>
        public Button TrackButton { get; private set; }

        public NotebookScreen(GameState g, IReadOnlyDictionary<string, QuestDef> quests, IReadOnlyDictionary<string, LeadDef> leads = null,
            IReadOnlyDictionary<string, ConclusionDef> conclusions = null, IReadOnlyDictionary<string, LetterDef> letters = null)
        {
            _g = g;
            _quests = quests;
            _leads = leads;
            _conclusions = conclusions;
            _letters = letters;
        }

        /// <summary>Opens at a section and an entry (call before opening).</summary>
        public NotebookScreen At(string section, string entry = null)
        {
            Section = section;
            Selected = entry;
            return this;
        }

        /// <summary>The notebook over a game state with the content's definitions.</summary>
        public static NotebookScreen FromContent(GameState g) => new(g, Registry.Quests, Registry.Leads, Registry.Conclusions, Registry.Letters);

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-notebook");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);

            var head = new VisualElement();
            head.AddToClassList("sf-notebook__head");
            foreach (var section in Notebook.Sections)
            {
                var s = section;
                var tab = new Button(() => Show(s)) { name = "tab-" + s };
                tab.AddToClassList("sf-notebook__tab");
                Strings.Bind(tab, "notebook." + s);
                head.Add(tab);
                _tabs[s] = tab;
            }
            var spacer = new VisualElement();
            spacer.AddToClassList("sf-grow");
            head.Add(spacer);
            var close = new Button(Close) { name = "notebook-close" };
            close.AddToClassList("sf-button");
            close.AddToClassList("sf-button--quiet");
            Strings.Bind(close, "notebook.close");
            head.Add(close);
            safe.Add(head);

            var pages = new VisualElement();
            pages.AddToClassList("sf-notebook__pages");
            _list = Scroll("sf-notebook__list");
            _detail = Scroll("sf-notebook__detail");
            pages.Add(_list);
            var gutter = new VisualElement { pickingMode = PickingMode.Ignore };
            gutter.AddToClassList("sf-notebook__gutter");
            pages.Add(gutter);
            pages.Add(_detail);
            safe.Add(pages);
            return root;
        }

        private static ScrollView Scroll(string cls)
        {
            var s = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            s.AddToClassList(cls);
            return s;
        }

        protected internal override void Shown() => Show(Section, Selected);

        /// <summary>Opens a section, at an entry if given (else its first).</summary>
        public void Show(string section, string entry = null)
        {
            Section = section;
            foreach (var kv in _tabs) kv.Value.EnableInClassList("sf-notebook__tab--on", kv.Key == section);
            _entries = section switch
            {
                "quests" => Notebook.Quests(_g, _quests),
                "leads" => Notebook.Leads(_g, _leads, _conclusions),
                "people" => Notebook.People(_g),
                "letters" => Notebook.Letters(_g, _letters),
                "decisions" => Notebook.Decisions(_g),
                _ => new List<NoteEntry>(),
            };
            _list.Clear();
            if (_entries.Count == 0)
            {
                var none = new Label();
                none.AddToClassList("sf-notebook__empty");
                Strings.Bind(none, "notebook.empty");
                _list.Add(none);
            }
            foreach (var e in _entries)
            {
                var entryId = e.Id;
                var row = new Button(() => Select(entryId)) { name = "entry-" + e.Id };
                row.AddToClassList("sf-notebook__row");
                row.EnableInClassList("sf-notebook__row--closed", e.Closed);
                var title = new Label(e.Title) { pickingMode = PickingMode.Ignore };
                title.AddToClassList("sf-notebook__row-title");
                row.Add(title);
                var sub = Sub(e);
                if (!string.IsNullOrEmpty(sub))
                {
                    var l = new Label(sub) { pickingMode = PickingMode.Ignore };
                    l.AddToClassList("sf-notebook__row-sub");
                    row.Add(l);
                }
                _list.Add(row);
            }
            Select(entry != null && _entries.Exists(x => x.Id == entry) ? entry : _entries.Count > 0 ? _entries[0].Id : null);
        }

        /// <summary>The line under an entry's title: tracked, its status, where and when.</summary>
        private static string Sub(NoteEntry e)
        {
            var parts = new List<string>();
            if (e.Pinned) parts.Add(Strings.Get("notebook.tracked"));
            if (!string.IsNullOrEmpty(e.Status)) parts.Add(Strings.Get("notebook." + e.Status));
            if (!string.IsNullOrEmpty(e.Where)) parts.Add(e.Where);
            if (e.Day > 0) parts.Add(Strings.Get("notebook.day", e.Day));
            return string.Join(" · ", parts);
        }

        /// <summary>Tracks a quest (the HUD shows its next objective), or stops tracking with null; what the track button does.</summary>
        public void Track(string questId)
        {
            Notebook.Pin(_g, questId);
            Show("quests", questId ?? Selected);
        }

        /// <summary>Writes an entry out on the right page.</summary>
        public void Select(string id)
        {
            Selected = id;
            foreach (var row in _list.Query<Button>(className: "sf-notebook__row").ToList())
                row.EnableInClassList("sf-notebook__row--on", row.name == "entry-" + id);
            _detail.Clear();
            TrackButton = null;
            var e = _entries.Find(x => x.Id == id);
            if (e == null) return;
            var title = new Label(e.Title);
            title.AddToClassList("sf-notebook__title");
            _detail.Add(title);
            var sub = Sub(e);
            if (!string.IsNullOrEmpty(sub))
            {
                var l = new Label(sub);
                l.AddToClassList("sf-notebook__sub");
                _detail.Add(l);
            }
            if (Section == "quests" && !e.Closed)
            {
                TrackButton = new Button(() => Track(e.Pinned ? null : e.Id)) { name = "track" };
                TrackButton.AddToClassList("sf-button");
                if (e.Pinned) TrackButton.AddToClassList("sf-button--quiet");
                Strings.Bind(TrackButton, e.Pinned ? "notebook.untrack" : "notebook.track");
                TrackButton.AddToClassList("sf-notebook__track");
                _detail.Add(TrackButton);
            }
            foreach (var item in e.Items)
            {
                var row = new VisualElement();
                row.AddToClassList("sf-notebook__item");
                row.EnableInClassList("sf-notebook__item--done", item.Done);
                var box = new Label(item.Done ? "●" : "○");
                box.AddToClassList("sf-notebook__box");
                row.Add(box);
                var text = new Label(item.Optional ? $"{item.Text} ({Strings.Get("notebook.optional")})" : item.Text);
                text.AddToClassList("sf-notebook__item-text");
                row.Add(text);
                _detail.Add(row);
            }
            foreach (var p in e.Body)
            {
                var para = new Label(p);
                para.AddToClassList("sf-notebook__para");
                _detail.Add(para);
            }
            _detail.scrollOffset = UnityEngine.Vector2.zero;
        }
    }
}
