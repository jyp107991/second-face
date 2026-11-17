using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>Who is at the table and on what terms: the game (the player's body, pack and Tolls), the surgeon's id and
    /// definition (their stock, fee and Medicine), their name and face; the world's clock (an operation takes hours: read
    /// before, set after so the sky turns); a line for the HUD.</summary>
    public sealed class SurgeryModel
    {
        public GameState Game;
        public string SurgeonId;
        public NpcDef Def;
        public string Name;
        /// <summary>The surgeon's portrait (their initial when null).</summary>
        public Texture Face;
        /// <summary>The operation's dice (the game's own when null).</summary>
        public Rng Rng;
        public Func<double> Now;
        public Action<double> Then;
        /// <summary>A line for the HUD (what came of an operation).</summary>
        public Action<string> Said;
        /// <summary>When the table is left.</summary>
        public Action Done;
    }

    /// <summary>
    /// The surgeon's table (the content's <c>surgery</c> event; port of ui/surgery.ts, DESIGN_UNITY §5.5): the player's body on
    /// the left page, slot by slot (what is fitted, its make, its condition and upkeep; repair or take out, each at its
    /// fee), and on the right what could go in (the surgeon's own pieces to buy and fit, the boxed pieces the player
    /// carries), each with what it gives, what it needs, the Drift it adds, the hours, the risk for this patient, the
    /// piece's price and the fee; fit rolls the game's dice. Between them the surgeon's face across the table, their
    /// Medicine against the player's Grit, the Drift the body settles to, the Tolls, and what the last operation came to.
    /// The rules are Core <see cref="Surgery"/> and <see cref="Chrome"/>; the hours pass on the world's clock.
    /// </summary>
    public sealed class SurgeryScreen : UIScreen
    {
        private readonly SurgeryModel _m;
        private VisualElement _body, _offers;
        private Label _sheet, _tolls, _note, _offersHead;
        private readonly List<Button> _fit = new();

        public SurgeryScreen(SurgeryModel model) { _m = model; }

        private GameState G => _m.Game;
        /// <summary>What the last thing done came to (tests read it).</summary>
        public string Note => _note?.text;
        /// <summary>The offers as they stand (tests read them).</summary>
        public List<SurgeryOffer> Offers => Surgery.Offers(G, _m.SurgeonId, _m.Def);
        public IReadOnlyList<Button> FitButtons => _fit;
        /// <summary>The last operation's result (null before any).</summary>
        public SurgeryResult Last { get; private set; }

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-surgery");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);
            var row = new VisualElement();
            row.AddToClassList("sf-surgery__body");
            safe.Add(row);

            // the player's body
            var bodyPage = Page("body", out var bodyHead, out _body);
            bodyHead.text = Strings.Get("surgery.body").ToUpperInvariant();
            row.Add(bodyPage);

            // the table, the surgeon across it
            var table = new VisualElement { name = "table" };
            table.AddToClassList("sf-surgery__table");
            var who = new VisualElement();
            who.AddToClassList("sf-barter__who");
            var faceBox = new VisualElement { name = "face" };
            faceBox.AddToClassList("sf-barter__face");
            if (_m.Face != null) faceBox.Add(new Image { image = _m.Face, scaleMode = ScaleMode.ScaleAndCrop, pickingMode = PickingMode.Ignore });
            else
            {
                var initial = new Label(string.IsNullOrEmpty(_m.Name) ? "?" : _m.Name.Substring(0, 1));
                initial.AddToClassList("sf-barter__initial");
                faceBox.Add(initial);
            }
            who.Add(faceBox);
            var names = new VisualElement();
            names.AddToClassList("sf-barter__names");
            var name = new Label(_m.Name) { name = "surgeon" };
            name.AddToClassList("sf-barter__name");
            names.Add(name);
            _sheet = new Label { name = "sheet" };
            _sheet.AddToClassList("sf-barter__note");
            names.Add(_sheet);
            who.Add(names);
            table.Add(who);
            _tolls = new Label { name = "tolls" };
            _tolls.AddToClassList("sf-surgery__tolls");
            table.Add(_tolls);
            _note = new Label { name = "note" };
            _note.AddToClassList("sf-surgery__note");
            table.Add(_note);
            var spacer = new VisualElement();
            spacer.AddToClassList("sf-grow");
            table.Add(spacer);
            var risk = new Label(Strings.Get("surgery.risk_note"));
            risk.AddToClassList("sf-surgery__fine");
            table.Add(risk);
            var done = new Button(Close) { name = "surgery-done", text = Strings.Get("surgery.done") };
            done.AddToClassList("sf-button");
            done.AddToClassList("sf-surgery__act");
            done.AddToClassList("sf-surgery__done");
            table.Add(done);
            row.Add(table);

            // what could go in
            var offerPage = Page("offers", out _offersHead, out _offers);
            offerPage.AddToClassList("sf-surgery__page--offers");
            row.Add(offerPage);
            return root;
        }

        private static VisualElement Page(string name, out Label head, out VisualElement content)
        {
            var page = new VisualElement { name = name };
            page.AddToClassList("sf-surgery__page");
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
            scroll.AddToClassList("sf-surgery__scroll");
            page.Add(scroll);
            content = scroll.contentContainer;
            return page;
        }

        protected internal override void Shown()
        {
            if (_m.Now != null) G.Minutes = _m.Now();
            Refresh();
        }

        protected internal override void Hidden() => _m.Done?.Invoke();

        // ---- what can be done (public: tests do it) ----

        /// <summary>Fits an offer (an index into <see cref="Offers"/>): paid, rolled, the hours passed; what came of it
        /// said on the table and the HUD.</summary>
        public SurgeryResult Fit(int index)
        {
            var offers = Offers;
            if (index < 0 || index >= offers.Count) return null;
            var o = offers[index];
            if (_m.Now != null) G.Minutes = _m.Now();
            var rng = _m.Rng ?? new Rng(G.RngState != 0 ? G.RngState : 1u);
            var roll = rng.Next();
            if (_m.Rng == null) G.RngState = rng.State;
            var oldName = o.Replaces?.Name;
            var r = Surgery.Perform(G, _m.SurgeonId, _m.Def, o, Clock.DayOf(G.Minutes), roll);
            Last = r;
            string note;
            switch (r.Outcome)
            {
                case "cannot_pay": note = Strings.Get("surgery.cannot_pay", o.Total, G.Pc.Inventory.Tolls); break;
                case "rejected":
                    note = Strings.Get("surgery.rejected", _m.Name, Hours(r.Hours), o.Def.Name);
                    _m.Said?.Invoke(Strings.Get("surgery.said_rejected", o.Def.Name));
                    break;
                default:
                    note = Strings.Get(r.Outcome == "clean" ? "surgery.clean" : "surgery.complication", Hours(r.Hours), o.Def.Name);
                    if (r.Boxed != null) note += " " + Strings.Get("surgery.boxed", r.Boxed.Name ?? oldName);
                    _m.Said?.Invoke(Strings.Get(r.Outcome == "clean" ? "surgery.said_clean" : "surgery.said_complication", o.Def.Name));
                    break;
            }
            Pass(r.Hours);
            Show(note);
            return r;
        }

        /// <summary>Sees to a worn piece in a slot (an hour on the table).</summary>
        public TableWork Repair(string slot) => Work(Surgery.Repair(G, _m.Def, slot), "surgery.repaired", "surgery.cannot_repair");

        /// <summary>Takes a piece out of a slot, boxed (two hours on the table).</summary>
        public TableWork Remove(string slot) => Work(Surgery.Remove(G, _m.Def, slot), "surgery.removed", "surgery.cannot_remove");

        private TableWork Work(TableWork w, string done, string shortKey)
        {
            if (_m.Now != null) G.Minutes = _m.Now();
            string note;
            if (w.Ok) { note = Strings.Get(done, w.Def?.Name ?? "", w.Fee); Pass(w.Hours); }
            else if (w.Reason == "cannot_pay") note = Strings.Get(shortKey, w.Fee, G.Pc.Inventory.Tolls);
            else note = Strings.Get("surgery.nothing_there");
            Show(note);
            return w;
        }

        /// <summary>The hours of the work pass on the game and the world's clock.</summary>
        private void Pass(double hours)
        {
            if (hours <= 0) return;
            G.Minutes += hours * 60;
            _m.Then?.Invoke(G.Minutes);
        }

        private void Show(string note)
        {
            _note.text = note ?? "";
            Refresh();
        }

        private static string Hours(double h) => h.ToString("0.#", System.Globalization.CultureInfo.InvariantCulture);

        // ---- the pages ----

        private void Refresh()
        {
            if (Root == null) return;
            var grit = Surgery.Grit(G);
            var drift = Chrome.DriftBaseline(G.Pc.Sheet, grit);
            _sheet.text = Strings.Get("surgery.sheet", Surgery.SurgeonMedicine(_m.Def), grit, drift, Strings.Get("surgery.drift." + Chrome.DriftBand(drift)));
            _tolls.text = Strings.Get("surgery.tolls", G.Pc.Inventory.Tolls);
            _offersHead.text = Strings.Get("surgery.table").ToUpperInvariant();
            BodyPage();
            OfferPage();
        }

        private void BodyPage()
        {
            _body.Clear();
            var day = Clock.DayOf(G.Minutes);
            var fitted = Chrome.Installed(G.Pc.Sheet).ToDictionary(p => p.Slot);
            foreach (var slot in Chrome.Slots)
            {
                var row = new VisualElement { name = "slot-" + slot };
                row.AddToClassList("sf-surgery__slot");
                var text = new VisualElement();
                text.AddToClassList("sf-surgery__slot-text");
                var label = new Label(Strings.Get("surgery.slot." + slot).ToUpperInvariant());
                label.AddToClassList("sf-surgery__slot-name");
                text.Add(label);
                row.Add(text);
                if (!fitted.TryGetValue(slot, out var p))
                {
                    row.AddToClassList("sf-surgery__slot--empty");
                    var none = new Label(Strings.Get("surgery.empty"));
                    none.AddToClassList("sf-surgery__dim");
                    text.Add(none);
                    _body.Add(row);
                    continue;
                }
                var piece = new Label(p.Def.Name);
                piece.AddToClassList("sf-surgery__piece");
                text.Add(piece);
                var cond = Mathf.RoundToInt((float)p.Piece.Condition * 100f);
                var state = Strings.Get("surgery.fitted", Grade(p.Def.Grade), cond);
                if (p.Def.Upkeep != null)
                {
                    var item = ItemName(p.Def.Upkeep.Item);
                    if (p.Piece.UpkeepDue is int due) state += " · " + (due <= day ? Strings.Get("surgery.upkeep_due", item) : Strings.Get("surgery.upkeep_in", item, due - day));
                }
                if (p.Piece.Condition < Chrome.Working) state += " · " + Strings.Get("surgery.not_working");
                var line = new Label(state);
                line.AddToClassList("sf-surgery__dim");
                line.EnableInClassList("sf-surgery__warn", p.Piece.Condition < Chrome.Working);
                text.Add(line);
                var acts = new VisualElement();
                acts.AddToClassList("sf-surgery__acts");
                var s = slot;
                if (p.Piece.Condition < 1)
                    acts.Add(Act("repair-" + slot, Strings.Get("surgery.repair", Surgery.RepairFee(_m.Def, p.Piece.Condition)), () => Repair(s), G.Pc.Inventory.Tolls >= Surgery.RepairFee(_m.Def, p.Piece.Condition)));
                acts.Add(Act("remove-" + slot, Strings.Get("surgery.remove", Surgery.RemoveFee(_m.Def)), () => Remove(s), G.Pc.Inventory.Tolls >= Surgery.RemoveFee(_m.Def)));
                row.Add(acts);
                _body.Add(row);
            }
        }

        private void OfferPage()
        {
            _offers.Clear();
            _fit.Clear();
            var offers = Offers;
            if (offers.Count == 0)
            {
                var none = new Label(Strings.Get("surgery.nothing"));
                none.AddToClassList("sf-surgery__empty");
                _offers.Add(none);
                return;
            }
            for (var i = 0; i < offers.Count; i++)
            {
                var o = offers[i];
                var card = new VisualElement { name = "offer-" + i };
                card.AddToClassList("sf-surgery__offer");
                var text = new VisualElement();
                text.AddToClassList("sf-surgery__offer-text");
                var title = new Label(o.Def.Name);
                title.AddToClassList("sf-surgery__piece");
                text.Add(title);
                var what = $"{Grade(o.Def.Grade)} · {Strings.Get("surgery.slot." + o.Def.Slot)}";
                if (o.Replaces != null) what += " · " + Strings.Get("surgery.replaces", o.Replaces.Name);
                what += " · " + Strings.Get(o.Source == "stock" ? "surgery.theirs" : "surgery.yours");
                var meta = new Label(what);
                meta.AddToClassList("sf-surgery__dim");
                text.Add(meta);
                if (!string.IsNullOrEmpty(o.Def.Desc))
                {
                    var desc = new Label(o.Def.Desc);
                    desc.AddToClassList("sf-surgery__desc");
                    text.Add(desc);
                }
                var gives = string.Join(" · ", Surgery.Gives(o.Def).Select(g => g.Amount == null ? g.What : $"{g.What} {g.Amount}"));
                var needs = o.Def.Upkeep != null ? Strings.Get("surgery.needs", ItemName(o.Def.Upkeep.Item), o.Def.Upkeep.EveryDays) : null;
                var effect = string.Join(" · ", new[] { gives, needs, Strings.Get("surgery.drift_add", Num.RoundInt(o.Def.Drift)) }.Where(x => !string.IsNullOrEmpty(x)));
                var eff = new Label(effect);
                eff.AddToClassList("sf-surgery__gives");
                text.Add(eff);
                var risk = Mathf.RoundToInt((float)o.Risk * 100f);
                var terms = new Label(o.Source == "stock"
                    ? Strings.Get("surgery.terms_piece", Hours(o.Hours), risk, o.Price, o.Fee)
                    : Strings.Get("surgery.terms", Hours(o.Hours), risk, o.Fee));
                terms.AddToClassList("sf-surgery__terms");
                text.Add(terms);
                card.Add(text);
                var side = new VisualElement();
                side.AddToClassList("sf-surgery__offer-side");
                var total = new Label(Strings.Get("surgery.total", o.Total));
                total.AddToClassList("sf-surgery__total");
                total.EnableInClassList("sf-surgery__total--short", G.Pc.Inventory.Tolls < o.Total);
                side.Add(total);
                var index = i;
                var fit = Act("fit-" + i, Strings.Get("surgery.fit"), () => Fit(index), G.Pc.Inventory.Tolls >= o.Total);
                fit.AddToClassList("sf-surgery__fit");
                side.Add(fit);
                _fit.Add(fit);
                card.Add(side);
                _offers.Add(card);
            }
        }

        private static Button Act(string name, string text, Action act, bool enabled)
        {
            var b = new Button(act) { name = name, text = text };
            b.AddToClassList("sf-button");
            b.AddToClassList("sf-surgery__act");
            b.SetEnabled(enabled);
            return b;
        }

        private static string Grade(string grade) => Strings.Get("surgery.grade." + (grade ?? "old"));

        private static string ItemName(string id) => Items.Has(id) ? Items.Def(id).Name : id;
    }
}
