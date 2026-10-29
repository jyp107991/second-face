using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>Who is trading and on what terms: the game (the player's pack and Tolls), the merchant's id, their terms
    /// from the content, their name, the settlement whose standing sets their prices and their face.</summary>
    public sealed class BarterModel
    {
        public GameState Game;
        public string MerchantId;
        public MerchantDef Def;
        public string Name;
        public string Settlement;
        /// <summary>The merchant's portrait (their initial when null).</summary>
        public Texture Face;
        /// <summary>The haggle's dice (the game's own when null).</summary>
        public Rng Rng;
    }

    /// <summary>
    /// Barter (P5.3h, DESIGN §5, DESIGN_UNITY §5.4): their goods on the left page with what each costs, the player's pack on
    /// the right with what each fetches (dimmed where they do not deal in it), and between them the table, with the
    /// merchant's face across it: what is on the table each way, the balance (who pays whom), and the haggle as a check
    /// shown up front (Barter against the DC, what it wins, what a refusal costs, the chance), then haggle, deal, clear and
    /// leave. A tap on a thing puts one more of it on the table; a line's minus takes one off. Prices explain themselves
    /// (the skill, the standing, a member's rate, the merchant's cash). The rules are Core <see cref="Barter"/>.
    /// </summary>
    public sealed class BarterScreen : UIScreen
    {
        private readonly BarterModel _m;
        private readonly Deal _deal = new();
        private readonly List<Button> _theirs = new(), _yours = new();
        private MerchantState _ms;
        private VisualElement _theirGrid, _yourGrid, _lines, _faceBox;
        private Label _theirHead, _yourHead, _note, _balance, _pill, _terms, _message;
        private Button _haggle, _dealButton, _clear;

        public BarterScreen(BarterModel model) { _m = model; }

        public MerchantState State => _ms;
        public Deal Deal => _deal;
        public IReadOnlyList<Button> Theirs => _theirs;
        public IReadOnlyList<Button> Yours => _yours;
        public Label Balance => _balance;
        public Label Pill => _pill;
        public Label Terms => _terms;
        public Label Message => _message;
        public Button HaggleButton => _haggle;
        public Button DealButton => _dealButton;
        public VisualElement Lines => _lines;
        public int Day => Clock.DayOf(_m.Game.Minutes);
        public PriceContext Prices => Barter.Context(_m.Game, _m.Def, _m.Settlement, _ms);
        public DealTotals Totals => Barter.Totals(Mine, _ms, _deal, Prices, Day);
        public HaggleOffer Offer => Barter.Offer((int)Prices.Barter, _m.Def, _ms, Totals.Net, Day);

        private Inventory Mine => _m.Game.Pc.Inventory;

        protected internal override VisualElement Build()
        {
            _ms = Barter.State(_m.Game.Merchants ??= new Dictionary<string, MerchantState>(), _m.MerchantId, _m.Def, Day);
            var root = new VisualElement();
            root.AddToClassList("sf-barter");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);
            var body = new VisualElement();
            body.AddToClassList("sf-barter__body");
            safe.Add(body);

            body.Add(Page(out _theirHead, out _theirGrid, "theirs"));

            // the table, the merchant across it
            var table = new VisualElement { name = "table" };
            table.AddToClassList("sf-barter__table");
            var who = new VisualElement();
            who.AddToClassList("sf-barter__who");
            _faceBox = new VisualElement { name = "face" };
            _faceBox.AddToClassList("sf-barter__face");
            if (_m.Face != null) _faceBox.Add(new Image { image = _m.Face, scaleMode = ScaleMode.ScaleAndCrop, pickingMode = PickingMode.Ignore });
            else
            {
                var initial = new Label(string.IsNullOrEmpty(_m.Name) ? "?" : _m.Name.Substring(0, 1));
                initial.AddToClassList("sf-barter__initial");
                _faceBox.Add(initial);
            }
            who.Add(_faceBox);
            var names = new VisualElement();
            names.AddToClassList("sf-barter__names");
            var name = new Label(_m.Name) { name = "merchant" };
            name.AddToClassList("sf-barter__name");
            names.Add(name);
            _note = new Label { name = "note" };
            _note.AddToClassList("sf-barter__note");
            names.Add(_note);
            who.Add(names);
            table.Add(who);
            var head = new Label();
            head.AddToClassList("sf-barter__label");
            Strings.Bind(head, "barter.table");
            table.Add(head);
            var lines = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            lines.AddToClassList("sf-barter__lines");
            _lines = lines.contentContainer;
            table.Add(lines);
            _balance = new Label { name = "balance" };
            _balance.AddToClassList("sf-barter__balance");
            table.Add(_balance);
            var haggle = new VisualElement();
            haggle.AddToClassList("sf-barter__haggle");
            _pill = new Label { name = "pill" };
            _pill.AddToClassList("sf-barter__pill");
            haggle.Add(_pill);
            _terms = new Label { name = "terms" };
            _terms.AddToClassList("sf-barter__terms");
            haggle.Add(_terms);
            table.Add(haggle);
            var row = new VisualElement();
            row.AddToClassList("sf-barter__buttons");
            _haggle = Button("barter.haggle", () => Haggle(), "sf-button--quiet", "sf-barter__quiet");
            _dealButton = Button("barter.deal", () => Strike(), "sf-barter__deal");
            row.Add(_haggle);
            row.Add(_dealButton);
            table.Add(row);
            var row2 = new VisualElement();
            row2.AddToClassList("sf-barter__buttons");
            _clear = Button("barter.clear", Clear, "sf-button--quiet", "sf-barter__quiet");
            row2.Add(_clear);
            row2.Add(Button("barter.leave", Close, "sf-button--quiet", "sf-barter__quiet"));
            table.Add(row2);
            body.Add(table);

            body.Add(Page(out _yourHead, out _yourGrid, "yours"));

            _message = new Label { name = "message" };
            _message.AddToClassList("sf-barter__message");
            safe.Add(_message);
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

        private static Button Button(string key, Action act, params string[] classes)
        {
            var b = new Button(act) { name = key.Replace("barter.", "b-") };
            b.AddToClassList("sf-button");
            foreach (var c in classes) b.AddToClassList(c);
            Strings.Bind(b, key);
            return b;
        }

        protected internal override void Shown() => Refresh();

        private static int In(List<DealLine> list, int index) { foreach (var l in list) if (l.Index == index) return l.Qty; return 0; }

        private static void Bump(List<DealLine> list, int index, int max, int by)
        {
            var at = list.FindIndex(l => l.Index == index);
            var q = Math.Max(0, Math.Min(max, (at >= 0 ? list[at].Qty : 0) + by));
            if (at >= 0) { if (q == 0) list.RemoveAt(at); else list[at] = new DealLine(index, q); }
            else if (q > 0) list.Add(new DealLine(index, q));
        }

        /// <summary>Puts one more of their thing on the table (an index into their stock).</summary>
        public void Buy(int index, int by = 1)
        {
            if (index < 0 || index >= _ms.Inv.Items.Count) return;
            Bump(_deal.Buy, index, _ms.Inv.Items[index].Qty, by);
            _message.text = "";
            Refresh();
        }

        /// <summary>Puts one more of the player's things on the table (an index into the pack), if they deal in it.</summary>
        public void Sell(int index, int by = 1)
        {
            if (index < 0 || index >= Mine.Items.Count) return;
            if (!Barter.MerchantBuys(_m.Def, Mine.Items[index].Def)) { _message.text = Strings.Get("barter.wont_deal"); return; }
            Bump(_deal.Sell, index, Mine.Items[index].Qty, by);
            _message.text = "";
            Refresh();
        }

        public void Clear()
        {
            _deal.Buy.Clear();
            _deal.Sell.Clear();
            Refresh();
        }

        /// <summary>Haggles over what is on the table (once a day with each merchant).</summary>
        public bool Haggle()
        {
            var offer = Offer;
            if (!offer.Open || (_deal.Buy.Count == 0 && _deal.Sell.Count == 0)) return false;
            var rng = _m.Rng ?? new Rng(_m.Game.RngState);
            var r = Barter.Haggle(_m.Game, _m.Def, _ms, Totals.Net, rng);
            if (_m.Rng == null) _m.Game.RngState = rng.State;
            _message.text = r.Success
                ? Strings.Get("barter.haggled_win", Pct(_ms.Haggle))
                : Strings.Get("barter.haggled_lose", Pct(-_ms.Haggle));
            Refresh();
            return r.Success;
        }

        /// <summary>Closes the deal on the table, if both sides can pay.</summary>
        public bool Strike()
        {
            if (_deal.Buy.Count == 0 && _deal.Sell.Count == 0) return false;
            var t = Totals;
            if (t.Net > 0 && Mine.Tolls < t.Net) { _message.text = Strings.Get("barter.short", t.Net - Mine.Tolls); return false; }
            if (t.Net < 0 && _ms.Cash < -t.Net) { _message.text = Strings.Get("barter.no_cash", _ms.Cash); return false; }
            var r = Barter.Execute(Mine, _ms, _m.Def, _deal, Prices, Day);
            if (!r.Ok) { _message.text = r.Reason; return false; }
            _deal.Buy.Clear();
            _deal.Sell.Clear();
            _message.text = Strings.Get("barter.done");
            Refresh();
            return true;
        }

        private static string Pct(double f) => Mathf.RoundToInt((float)(f * 100)).ToString();

        private void Refresh()
        {
            var c = Prices;
            var day = Day;
            _theirHead.text = Strings.Get("barter.theirs", _ms.Cash);
            _yourHead.text = Strings.Get("barter.yours", Mine.Tolls);
            var why = new List<string> { Strings.Get("barter.skill", (int)c.Barter) };
            if (c.Standing > 0) why.Add(Strings.Get("barter.liked"));
            else if (c.Standing < 0) why.Add(Strings.Get("barter.disliked"));
            if (c.FactionMul < 1) why.Add(Strings.Get("barter.member"));
            if (Math.Abs(c.Haggle) > 1e-6) why.Add(Strings.Get(c.Haggle > 0 ? "barter.today_down" : "barter.today_up", Pct(Math.Abs(c.Haggle))));
            _note.text = string.Join(" · ", why);

            _theirGrid.Clear();
            _theirs.Clear();
            for (var i = 0; i < _ms.Inv.Items.Count; i++)
            {
                var index = i;
                var it = _ms.Inv.Items[i];
                var unit = it.Clone(); unit.Qty = 1;
                var price = Barter.BuyPrice(Inv.ItemValue(unit), c);
                _theirGrid.Add(Item(it, () => Buy(index), "their-" + i, ItemCells.Tolls(price), In(_deal.Buy, i), true, _theirs));
            }
            _yourGrid.Clear();
            _yours.Clear();
            for (var i = 0; i < Mine.Items.Count; i++)
            {
                var index = i;
                var it = Mine.Items[i];
                var unit = it.Clone(); unit.Qty = 1;
                var buys = Barter.MerchantBuys(_m.Def, it.Def);
                var tag = buys ? ItemCells.Tolls(Barter.SellPrice(Inv.ItemValue(unit), c, Barter.Saturation(_ms, it.Def, day))) : Strings.Get("barter.wont");
                _yourGrid.Add(Item(it, () => Sell(index), "your-" + i, tag, In(_deal.Sell, i), buys, _yours));
            }

            _lines.Clear();
            foreach (var l in _deal.Buy) _lines.Add(Line(_ms.Inv.Items[l.Index], l.Qty, true, () => Buy(l.Index, -1)));
            foreach (var l in _deal.Sell) _lines.Add(Line(Mine.Items[l.Index], l.Qty, false, () => Sell(l.Index, -1)));
            var empty = _deal.Buy.Count == 0 && _deal.Sell.Count == 0;
            if (empty)
            {
                var hint = new Label();
                hint.AddToClassList("sf-barter__hint");
                Strings.Bind(hint, "barter.nothing");
                _lines.Add(hint);
            }
            var t = Totals;
            _balance.text = t.Net > 0 ? Strings.Get("barter.you_pay", t.Net) : t.Net < 0 ? Strings.Get("barter.they_pay", -t.Net) : Strings.Get("barter.even");
            _balance.EnableInClassList("sf-barter__balance--short", t.Net > 0 && Mine.Tolls < t.Net || t.Net < 0 && _ms.Cash < -t.Net);

            var o = Offer;
            _pill.text = Strings.Get("barter.check", o.Skill, o.Dc);
            _pill.EnableInClassList("sf-barter__pill--unmet", o.Skill < o.Dc);
            _pill.EnableInClassList("sf-barter__pill--spent", !o.Open);
            _terms.text = !o.Open
                ? Strings.Get("barter.spent")
                : Strings.Get("barter.terms", Pct(o.Win), Pct(o.Lose), o.Chance >= 100 ? Strings.Get("barter.certain") : Strings.Get("barter.chance", Mathf.RoundToInt((float)o.Chance)));
            _haggle.SetEnabled(o.Open && !empty);
            _dealButton.SetEnabled(!empty);
            _clear.SetEnabled(!empty);
        }

        private static VisualElement Item(ItemInst it, Action tap, string name, string tag, int onTable, bool deals, List<Button> into)
        {
            var box = new VisualElement();
            box.AddToClassList("sf-barter__item");
            var cell = ItemCells.Make(it, tap, name);
            cell.EnableInClassList("sf-cell--on", onTable > 0);
            cell.EnableInClassList("sf-cell--dim", !deals);
            if (onTable > 0)
            {
                var n = new Label(onTable.ToString()) { pickingMode = PickingMode.Ignore, name = "on-table" };
                n.AddToClassList("sf-cell__deal");
                cell.Add(n);
            }
            box.Add(cell);
            var price = new Label(tag) { name = "price" };
            price.AddToClassList("sf-barter__price");
            price.EnableInClassList("sf-barter__price--wont", !deals);
            box.Add(price);
            into.Add(cell);
            return box;
        }

        private VisualElement Line(ItemInst it, int qty, bool buying, Action less)
        {
            var d = Items.Def(it.Def);
            var row = new VisualElement();
            row.AddToClassList("sf-barter__line");
            row.EnableInClassList("sf-barter__line--sell", !buying);
            var glyph = new ItemGlyph(ItemArt.KeyOf(d)) { Ink = new Color(0.95f, 0.92f, 0.86f) };
            glyph.AddToClassList("sf-barter__line-glyph");
            row.Add(glyph);
            var text = new Label(qty > 1 ? $"{d.Name} {Strings.Get("pack.qty", qty)}" : d.Name);
            text.AddToClassList("sf-barter__line-text");
            row.Add(text);
            var dir = new Label(buying ? "→" : "←");
            dir.AddToClassList("sf-barter__line-dir");
            row.Add(dir);
            var minus = new Button(less) { text = "−" };
            minus.AddToClassList("sf-button");
            minus.AddToClassList("sf-button--quiet");
            minus.AddToClassList("sf-barter__less");
            row.Add(minus);
            return row;
        }
    }
}
