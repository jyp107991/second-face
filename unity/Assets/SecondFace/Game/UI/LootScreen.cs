using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.World;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the loot screen moves between (P6.1): a container's contents and the player's pack.</summary>
    public sealed class LootModel
    {
        public string Name;
        public Inventory Container;
        public PlayerCharacter Pc;
        /// <summary>When it closes (the ground's piles tidy up).</summary>
        public Action Done;
        /// <summary>Whose it is (their name; null when it is nobody's or the player's): what is taken from it is stolen (P6.3).</summary>
        public string Owner;
        /// <summary>Who is watching as it is opened (their names; null when nobody).</summary>
        public string Seen;
        /// <summary>It closed with something taken from someone else's: the worth of what was taken, in Tolls.</summary>
        public Action<int> Stolen;
    }

    /// <summary>
    /// A container opened (P6.1, BG3's take all): its things on the left page, the pack on the right, both as the pack's
    /// drawn cells; a tap moves a whole stack across (to put something back, tap it in the pack), take all empties it
    /// (the Tolls too); what is carried and how much can be are under the pack. The contents stay in the game
    /// (<see cref="GameState.Containers"/>), so what is left is there next time.
    /// </summary>
    public sealed class LootScreen : UIScreen
    {
        private readonly LootModel _m;
        private VisualElement _theirGrid, _yourGrid;
        private Label _theirHead, _yourHead, _weight;
        /// <summary>The worth of what has been taken from it while open (put back, it counts less).</summary>
        public int Taken { get; private set; }

        public LootScreen(LootModel model) { _m = model; }

        /// <summary>The cells (tests press them): the container's, then the pack's.</summary>
        public List<Button> Theirs { get; } = new();
        public List<Button> Yours { get; } = new();

        private Inventory Pack => _m.Pc.Inventory;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-barter");
            root.AddToClassList("sf-loot");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);
            var body = new VisualElement();
            body.AddToClassList("sf-barter__body");
            safe.Add(body);
            body.Add(Page(out _theirHead, out _theirGrid, "theirs"));

            var middle = new VisualElement { name = "middle" };
            middle.AddToClassList("sf-loot__middle");
            var title = new Label(_m.Name) { name = "container" };
            title.AddToClassList("sf-loot__title");
            middle.Add(title);
            if (_m.Owner != null)
            {
                // someone else's: said so, and who is looking
                var whose = new Label(Strings.Get("loot.whose", _m.Owner)) { name = "whose" };
                whose.AddToClassList("sf-loot__whose");
                middle.Add(whose);
                var seen = new Label(_m.Seen != null ? Strings.Get("loot.seen", _m.Seen) : Strings.Get("loot.unseen")) { name = "seen" };
                seen.AddToClassList("sf-loot__seen");
                seen.EnableInClassList("sf-loot__seen--watched", _m.Seen != null);
                middle.Add(seen);
            }
            var all = new Button(TakeAll) { name = "take-all", text = Strings.Get(_m.Owner != null ? "loot.steal_all" : "loot.take_all") };
            all.AddToClassList("sf-button");
            all.AddToClassList("sf-loot__all");
            middle.Add(all);
            var done = new Button(Close) { name = "done", text = Strings.Get("loot.done") };
            done.AddToClassList("sf-button");
            done.AddToClassList("sf-button--quiet");
            middle.Add(done);
            _weight = new Label { name = "weight" };
            _weight.AddToClassList("sf-loot__weight");
            middle.Add(_weight);
            body.Add(middle);

            body.Add(Page(out _yourHead, out _yourGrid, "yours"));
            return root;
        }

        private static VisualElement Page(out Label head, out VisualElement grid, string name)
        {
            var page = new VisualElement { name = name };
            page.AddToClassList("sf-barter__page");
            head = new Label();
            head.AddToClassList("sf-barter__label");
            head.AddToClassList("sf-barter__label--page");
            page.Add(head);
            var scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            scroll.AddToClassList("sf-barter__scroll");
            grid = new VisualElement();
            grid.AddToClassList("sf-barter__grid");
            scroll.Add(grid);
            page.Add(scroll);
            return page;
        }

        protected internal override void Shown() => Refresh();

        protected internal override void Hidden()
        {
            if (_m.Owner != null && Taken > 0) _m.Stolen?.Invoke(Taken);
            Taken = 0;
            _m.Done?.Invoke();
        }

        /// <summary>Takes a stack from the container.</summary>
        public void Take(int index)
        {
            var worth = index >= 0 && index < _m.Container.Items.Count ? Inv.ItemValue(_m.Container.Items[index]) : 0;
            if (Containers.Move(_m.Container, index, Pack)) { Taken += worth; Refresh(); }
        }

        /// <summary>Puts a stack from the pack into the container (what is worn stays worn: only carried things show).</summary>
        public void Put(int index)
        {
            var worth = index >= 0 && index < Pack.Items.Count ? Inv.ItemValue(Pack.Items[index]) : 0;
            if (Containers.Move(Pack, index, _m.Container)) { Taken = System.Math.Max(0, Taken - worth); Refresh(); }
        }

        public void TakeAll()
        {
            var worth = _m.Container.Items.Sum(Inv.ItemValue) + _m.Container.Tolls;
            Containers.MoveAll(_m.Container, Pack);
            Taken += worth;
            Refresh();
        }

        private void Refresh()
        {
            _theirHead.text = _m.Container.Tolls > 0 ? $"{_m.Name} · {ItemCells.Tolls(_m.Container.Tolls)}" : _m.Name;
            _yourHead.text = Strings.Get("loot.yours", ItemCells.Tolls(Pack.Tolls));
            Fill(_theirGrid, Theirs, _m.Container, Take, "their-", Strings.Get("loot.empty"));
            Fill(_yourGrid, Yours, Pack, Put, "your-", null);
            var w = Inv.TotalWeight(Pack);
            var carry = Core.Stats.Sheet.Derived(_m.Pc.Sheet).Carry;
            _weight.text = Strings.Get("loot.weight", w.ToString("0.#"), carry);
            _weight.EnableInClassList("sf-loot__weight--over", w > carry);
            Root.Q<Button>("take-all").SetEnabled(_m.Container.Items.Count > 0 || _m.Container.Tolls > 0);
        }

        private static void Fill(VisualElement grid, List<Button> cells, Inventory inv, Action<int> tap, string prefix, string empty)
        {
            grid.Clear();
            cells.Clear();
            for (var i = 0; i < inv.Items.Count; i++)
            {
                var index = i;
                var cell = ItemCells.Make(inv.Items[i], () => tap(index), prefix + i);
                cells.Add(cell);
                grid.Add(cell);
            }
            if (inv.Items.Count == 0 && empty != null)
            {
                var l = new Label(empty);
                l.AddToClassList("sf-loot__empty");
                grid.Add(l);
            }
        }
    }
}
