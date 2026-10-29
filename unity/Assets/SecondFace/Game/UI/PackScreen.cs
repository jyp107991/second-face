using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the pack shows and works on: the game (the player's sheet and inventory) and the body the figure
    /// is drawn from.</summary>
    public sealed class PackModel
    {
        public GameState Game;
        /// <summary>The player's body (a player base prefab); no figure when null.</summary>
        public GameObject Body;
        public RuntimeAnimatorController Idle;
        /// <summary>The cut the clothes are chosen for: m or f.</summary>
        public string Fit = "m";
    }

    /// <summary>
    /// The pack (P5.3h, DESIGN_UNITY §5.4): on the desk, the live figure on the left with the four worn places round it
    /// (head and body on its right, the hand and the sling on its left), and two pages: the items as a grid of drawings
    /// by section (all, weapons, wear, aid, papers, other) with counts and condition lines, and the chosen item's card:
    /// its drawing, name, kind, the words about it, its figures each against what is worn or in hand in its place (better
    /// in sage, worse in rust), and what can be done with it (equip, sling, use; take off, hold for a worn one). What is
    /// carried against what can be carried runs along the foot. Equipping dresses the figure at once (Core
    /// <see cref="Wear"/>, <see cref="Dresser"/>); a turn of the figure is a drag across it.
    /// </summary>
    public sealed class PackScreen : UIScreen
    {
        public static readonly string[] Slots = { "head", "body", "primary", "secondary" };

        private readonly PackModel _m;
        private readonly Dictionary<string, Button> _tabs = new();
        private readonly Dictionary<string, Button> _slots = new();
        private readonly List<Button> _cells = new();
        private VisualElement _grid, _card, _actions, _slotLayer, _meterFill;
        private ScrollView _gridScroll, _cardScroll;
        private Image _figureImage;
        private Label _meter, _tolls, _message;
        private string _wearKey;
        private IVisualElementScheduledItem _breath;
        private float _dragX;
        private bool _dragging;

        public string Filter { get; private set; } = "all";
        /// <summary>The chosen pack item (an index into the inventory's items), or -1.</summary>
        public int Selected { get; private set; } = -1;
        /// <summary>The chosen worn place, or null.</summary>
        public string SelectedSlot { get; private set; }
        public Figure Figure { get; private set; }
        public IReadOnlyList<Button> Cells => _cells;
        public Button Tab(string filter) => _tabs.TryGetValue(filter, out var b) ? b : null;
        public Button Slot(string slot) => _slots.TryGetValue(slot, out var b) ? b : null;
        public VisualElement Card => _card;
        public VisualElement Actions => _actions;
        public Label Meter => _meter;
        public Label Message => _message;
        public Image FigureImage => _figureImage;
        public event Action Changed;

        private Inventory Inventory => _m.Game.Pc.Inventory;
        private CharacterSheet Character => _m.Game.Pc.Sheet;

        public PackScreen(PackModel model) { _m = model; }

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-pack");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);

            var head = new VisualElement();
            head.AddToClassList("sf-pack__head");
            var title = new Label { name = "pack-title" };
            title.AddToClassList("sf-pack__title");
            Strings.Bind(title, "pack.title");
            head.Add(title);
            foreach (var f in Pack.Filters)
            {
                var filter = f;
                var tab = new Button(() => Show(filter)) { name = "tab-" + f };
                tab.AddToClassList("sf-notebook__tab");
                Strings.Bind(tab, "pack.filter." + f);
                head.Add(tab);
                _tabs[f] = tab;
            }
            var spacer = new VisualElement();
            spacer.AddToClassList("sf-grow");
            head.Add(spacer);
            _tolls = new Label { name = "tolls" };
            _tolls.AddToClassList("sf-pack__tolls");
            head.Add(_tolls);
            var close = new Button(Close) { name = "pack-close" };
            close.AddToClassList("sf-button");
            close.AddToClassList("sf-button--quiet");
            close.AddToClassList("sf-pack__close");
            Strings.Bind(close, "pack.close");
            head.Add(close);
            safe.Add(head);

            var body = new VisualElement();
            body.AddToClassList("sf-pack__body");
            safe.Add(body);

            // the figure, with the worn places over it
            var doll = new VisualElement { name = "doll" };
            doll.AddToClassList("sf-pack__doll");
            _figureImage = new Image { name = "figure", scaleMode = ScaleMode.ScaleAndCrop };
            _figureImage.AddToClassList("sf-pack__figure");
            doll.Add(_figureImage);
            _slotLayer = new VisualElement { pickingMode = PickingMode.Ignore };
            _slotLayer.AddToClassList("sf-pack__slots");
            doll.Add(_slotLayer);
            doll.RegisterCallback<PointerDownEvent>(e => { _dragging = true; _dragX = e.position.x; });
            doll.RegisterCallback<PointerMoveEvent>(e =>
            {
                if (!_dragging || Figure == null) return;
                Figure.Yaw += (e.position.x - _dragX) * 0.6f;
                _dragX = e.position.x;
                DrawFigure();
            });
            doll.RegisterCallback<PointerUpEvent>(_ => _dragging = false);
            doll.RegisterCallback<PointerLeaveEvent>(_ => _dragging = false);
            body.Add(doll);

            var pages = new VisualElement();
            pages.AddToClassList("sf-pack__pages");
            _gridScroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
                name = "grid",
            };
            _gridScroll.AddToClassList("sf-pack__grid-scroll");
            _grid = new VisualElement();
            _grid.AddToClassList("sf-pack__grid");
            _gridScroll.Add(_grid);
            pages.Add(_gridScroll);
            var gutter = new VisualElement { pickingMode = PickingMode.Ignore };
            gutter.AddToClassList("sf-notebook__gutter");
            pages.Add(gutter);
            var right = new VisualElement();
            right.AddToClassList("sf-pack__right");
            _cardScroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            _cardScroll.AddToClassList("sf-pack__card-scroll");
            _card = new VisualElement { name = "card" };
            _card.AddToClassList("sf-pack__card");
            _cardScroll.Add(_card);
            right.Add(_cardScroll);
            _actions = new VisualElement { name = "actions" };
            _actions.AddToClassList("sf-pack__actions");
            right.Add(_actions);
            pages.Add(right);
            body.Add(pages);

            var foot = new VisualElement();
            foot.AddToClassList("sf-pack__foot");
            _meter = new Label { name = "meter" };
            _meter.AddToClassList("sf-pack__meter");
            foot.Add(_meter);
            var track = new VisualElement();
            track.AddToClassList("sf-pack__meter-track");
            _meterFill = new VisualElement();
            _meterFill.AddToClassList("sf-pack__meter-fill");
            track.Add(_meterFill);
            foot.Add(track);
            _message = new Label { name = "message" };
            _message.AddToClassList("sf-pack__message");
            foot.Add(_message);
            safe.Add(foot);
            return root;
        }

        protected internal override void Shown()
        {
            if (_m.Body != null)
            {
                Figure = Figure.Create(_m.Body, _m.Idle);
                if (Figure != null)
                {
                    _figureImage.image = Figure.Texture;
                    Dress(true);
                    // the idle's breath: the figure drawn again a few times a second while the pack is open
                    _breath = Root.schedule.Execute(() => { if (!_dragging) DrawFigure(); }).Every(120);
                }
            }
            Show(Filter);
        }

        protected internal override void Hidden()
        {
            _breath?.Pause();
            _breath = null;
            Figure?.Dispose();
            Figure = null;
        }

        /// <summary>Dresses the figure when what is worn changed (or always) and draws it.</summary>
        private void Dress(bool always = false)
        {
            if (Figure == null) return;
            var key = Wear.Key(Inventory, Character);
            if (always || key != _wearKey)
            {
                _wearKey = key;
                Figure.Dress(Wear.Of(Inventory, Character, _m.Fit));
                // drawn again once the garments taken off are gone (they go at the frame's end)
                Root.schedule.Execute(DrawFigure).ExecuteLater(1);
            }
            DrawFigure();
        }

        /// <summary>Draws the figure and has the panel show the new drawing (a panel repaints only what is marked).</summary>
        public void DrawFigure()
        {
            if (Figure == null) return;
            Figure.Draw();
            _figureImage.MarkDirtyRepaint();
        }

        /// <summary>Opens a section of the pack.</summary>
        public void Show(string filter)
        {
            Filter = filter;
            foreach (var kv in _tabs) kv.Value.EnableInClassList("sf-notebook__tab--on", kv.Key == filter);
            Refresh();
        }

        /// <summary>Everything again from the inventory: the worn places, the grid, the card, the load, the Tolls.</summary>
        private void Refresh()
        {
            _slotLayer.Clear();
            _slots.Clear();
            foreach (var s in Slots)
            {
                var slot = s;
                var it = Inventory.EquippedAt(slot);
                var cell = it != null ? ItemCells.Make(it, () => SelectSlot(slot), "slot-" + slot) : ItemCells.Empty(() => SelectSlot(slot), "slot-" + slot);
                cell.AddToClassList("sf-pack__slot");
                cell.AddToClassList("sf-pack__slot--" + slot);
                cell.EnableInClassList("sf-cell--on", SelectedSlot == slot);
                cell.EnableInClassList("sf-pack__slot--active", (slot == "primary" || slot == "secondary") && Inventory.Active == slot && it != null);
                var label = new Label(Strings.Get("pack.slot." + slot)) { pickingMode = PickingMode.Ignore };
                label.AddToClassList("sf-pack__slot-label");
                cell.Add(label);
                _slotLayer.Add(cell);
                _slots[slot] = cell;
            }

            _grid.Clear();
            _cells.Clear();
            var listed = Pack.Listed(Inventory, Filter);
            if (listed.Count == 0)
            {
                var none = new Label();
                none.AddToClassList("sf-notebook__empty");
                Strings.Bind(none, "pack.empty");
                _grid.Add(none);
            }
            foreach (var i in listed)
            {
                var index = i;
                var cell = ItemCells.Make(Inventory.Items[i], () => Select(index), "item-" + i);
                cell.EnableInClassList("sf-cell--on", SelectedSlot == null && Selected == i);
                _grid.Add(cell);
                _cells.Add(cell);
            }
            if (SelectedSlot == null && !listed.Contains(Selected)) Selected = listed.Count > 0 ? listed[0] : -1;
            foreach (var c in _cells) c.EnableInClassList("sf-cell--on", SelectedSlot == null && c.name == "item-" + Selected);
            WriteCard();

            var carried = Inv.TotalWeight(Inventory);
            var carry = Sheet.Derived(Character).Carry;
            _meter.text = Strings.Get("pack.carry", carried.ToString("0.#", System.Globalization.CultureInfo.InvariantCulture), carry);
            _meterFill.style.width = Length.Percent(Mathf.Clamp01((float)(carried / Math.Max(1, carry))) * 100f);
            var over = carried > carry;
            _meterFill.EnableInClassList("sf-pack__meter-fill--over", over);
            _meter.EnableInClassList("sf-pack__meter--over", over);
            _tolls.text = Strings.Get("pack.tolls", Inventory.Tolls);
        }

        /// <summary>Chooses a pack item (an index into the inventory's items).</summary>
        public void Select(int index)
        {
            Selected = index;
            SelectedSlot = null;
            foreach (var c in _cells) c.EnableInClassList("sf-cell--on", c.name == "item-" + index);
            foreach (var kv in _slots) kv.Value.EnableInClassList("sf-cell--on", false);
            WriteCard();
        }

        /// <summary>Chooses a worn place (its piece's card, or an empty one).</summary>
        public void SelectSlot(string slot)
        {
            SelectedSlot = slot;
            foreach (var c in _cells) c.EnableInClassList("sf-cell--on", false);
            foreach (var kv in _slots) kv.Value.EnableInClassList("sf-cell--on", kv.Key == slot);
            WriteCard();
        }

        /// <summary>The chosen item, worn or carried (null when none).</summary>
        public ItemInst Chosen => SelectedSlot != null ? Inventory.EquippedAt(SelectedSlot) : Selected >= 0 && Selected < Inventory.Items.Count ? Inventory.Items[Selected] : null;

        private void WriteCard()
        {
            _card.Clear();
            _actions.Clear();
            var it = Chosen;
            if (it == null)
            {
                var none = new Label();
                none.AddToClassList("sf-notebook__empty");
                Strings.Bind(none, SelectedSlot != null ? "pack.slot.empty" : "pack.empty");
                _card.Add(none);
                return;
            }
            var d = Items.Def(it.Def);
            var top = new VisualElement();
            top.AddToClassList("sf-pack__card-top");
            top.Add(new ItemGlyph(ItemArt.KeyOf(d)) { name = "card-glyph" });
            var names = new VisualElement();
            names.AddToClassList("sf-pack__card-names");
            var name = new Label(d.Name) { name = "card-name" };
            name.AddToClassList("sf-pack__card-name");
            names.Add(name);
            var kind = new List<string> { Strings.Get("cat." + d.Category) };
            if (it.Qty > 1) kind.Add(Strings.Get("pack.qty", it.Qty));
            if (SelectedSlot != null) kind.Add(Strings.Get("pack.worn." + SelectedSlot));
            var sub = new Label(string.Join(" · ", kind));
            sub.AddToClassList("sf-pack__card-sub");
            names.Add(sub);
            top.Add(names);
            _card.Add(top);
            if (!string.IsNullOrEmpty(d.Desc))
            {
                var desc = new Label(d.Desc) { name = "card-desc" };
                desc.AddToClassList("sf-pack__card-desc");
                _card.Add(desc);
            }
            var against = SelectedSlot == null ? Pack.Against(Inventory, it) : null;
            if (against != null)
            {
                var vs = new Label(Strings.Get("pack.against", Items.Def(against.Def).Name)) { name = "against" };
                vs.AddToClassList("sf-pack__against");
                _card.Add(vs);
            }
            var stats = new VisualElement { name = "stats" };
            stats.AddToClassList("sf-pack__stats");
            foreach (var s in Pack.Stats(it, against)) stats.Add(ItemCells.Row(s));
            _card.Add(stats);
            _cardScroll.scrollOffset = Vector2.zero;

            // what can be done with it
            if (SelectedSlot != null)
            {
                var slot = SelectedSlot;
                if ((slot == "primary" || slot == "secondary") && Inventory.Active != slot) Act("pack.hold", () => Hold(slot));
                Act("pack.unequip", () => Unequip(slot), quiet: true);
                return;
            }
            var index = Selected;
            if (d.Weapon != null)
            {
                Act("pack.equip", () => Equip(index, Inventory.Active));
                Act("pack.sling", () => Equip(index, Inventory.Active == "primary" ? "secondary" : "primary"), quiet: true);
            }
            else if (d.Armor != null) Act("pack.equip", () => Equip(index));
            else if (d.Consumable != null) Act("pack.use", () => Use(index));
        }

        private void Act(string key, Action act, bool quiet = false)
        {
            var b = new Button(act) { name = key.Replace("pack.", "act-") };
            b.AddToClassList("sf-button");
            if (quiet) b.AddToClassList("sf-button--quiet");
            b.AddToClassList("sf-pack__act");
            Strings.Bind(b, key);
            _actions.Add(b);
        }

        /// <summary>Equips a pack item in a place (its own when null): the piece there goes back in the pack.</summary>
        public bool Equip(int index, string slot = null)
        {
            if (index < 0 || index >= Inventory.Items.Count) return false;
            var def = Inventory.Items[index].Def;
            if (!Inv.Equip(Inventory, index, slot)) return false;
            Inv.SyncGear(Character, Inventory);
            var at = slot ?? Inv.SlotFor(def).FirstOrDefault();
            Say(Strings.Get("pack.equipped", Items.Def(def).Name));
            AfterChange(at);
            return true;
        }

        /// <summary>Takes off what is worn in a place.</summary>
        public bool Unequip(string slot)
        {
            var it = Inventory.EquippedAt(slot);
            if (it == null) return false;
            Inv.Unequip(Inventory, slot);
            Inv.SyncGear(Character, Inventory);
            Say(Strings.Get("pack.unequipped", Items.Def(it.Def).Name));
            Selected = Inventory.Items.FindIndex(x => x.Def == it.Def);
            SelectedSlot = null;
            AfterChange(null);
            return true;
        }

        /// <summary>Takes the weapon in a place in hand.</summary>
        public void Hold(string slot)
        {
            if (Inventory.EquippedAt(slot) == null) return;
            Inventory.Active = slot;
            AfterChange(slot);
        }

        /// <summary>Uses an aid from the pack on the player.</summary>
        public bool Use(int index)
        {
            if (index < 0 || index >= Inventory.Items.Count) return false;
            var def = Inventory.Items[index].Def;
            var name = Items.Def(def).Name;
            var r = Inv.UseConsumable(Inventory, index, Character, (int)_m.Game.Minutes);
            if (!r.Ok) return false;
            Say(r.Healed > 0 ? Strings.Get("pack.healed", name, r.Healed) : Strings.Get("pack.used", name));
            Selected = Inventory.Items.FindIndex(x => x.Def == def);   // the rest of the stack, if any is left
            AfterChange(null);
            return true;
        }

        private void AfterChange(string slot)
        {
            if (slot != null) { SelectedSlot = slot; Selected = -1; }
            Refresh();
            Dress();
            Changed?.Invoke();
        }

        private void Say(string text) => _message.text = text;
    }
}
