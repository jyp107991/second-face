using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the camp works on (P6.1): the game, where it is made (the place's name, how much game the land has,
    /// where its snares are kept, whether a caravan takes letters from here), the world's clock (it leads while walking:
    /// read before anything passes time, set after so the sky turns), who is in the party to talk to.</summary>
    public sealed class CampModel
    {
        public GameState Game;
        public string Where;
        public double Abundance;
        public string TrapsAt;
        public bool Town;
        public ILogicHost Host;
        public Func<double> Now;
        public Action<double> Then;
        /// <summary>A companion to talk to (the camp closes first).</summary>
        public Action<string> Talk;
        /// <summary>When camp is broken (the walker gets up).</summary>
        public Action Done;
    }

    /// <summary>
    /// The camp (P6.1, DESIGN §2f; port of ui/camp.ts): a page of the notebook on the right while the walker sits at the
    /// fire on the left; the world is stopped while it is open and only what is done here passes time (the sky turns
    /// with it). Rest (an hour, four, a night, until morning: water each time, food for a long sleep, each missing
    /// halves the healing), talk to the party, hunt and snares (by the land's game), cook what is raw, mend a worn thing
    /// with a kit, write a letter (from a town: a caravan takes it). What was done is said under the heading. Break
    /// camp (or the back gesture) closes it.
    /// </summary>
    public sealed class CampScreen : UIScreen
    {
        private readonly CampModel _m;
        private VisualElement _body;
        private Label _line, _health, _said;
        private float _timeScale = 1f;
        private bool _writing;

        public CampScreen(CampModel model) { _m = model; }

        public override bool Opaque => false;
        public override bool HidesHud => true;

        /// <summary>What the last thing done came to (tests read it).</summary>
        public string Said => _said?.text;
        private GameState G => _m.Game;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-camp");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            safe.AddToClassList("sf-camp__safe");
            root.Add(safe);
            var page = new VisualElement { name = "camp-page" };
            page.AddToClassList("sf-camp__page");
            safe.Add(page);

            var title = new Label(Strings.Get("camp.title"));
            title.AddToClassList("sf-camp__title");
            page.Add(title);
            _line = new Label { name = "camp-line" };
            _line.AddToClassList("sf-camp__line");
            page.Add(_line);
            _health = new Label { name = "camp-health" };
            _health.AddToClassList("sf-camp__health");
            page.Add(_health);
            _said = new Label { name = "camp-said" };
            _said.AddToClassList("sf-camp__said");
            _said.style.display = DisplayStyle.None;
            page.Add(_said);

            var scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            scroll.AddToClassList("sf-camp__scroll");
            page.Add(scroll);
            _body = scroll.contentContainer;

            var foot = new VisualElement();
            foot.AddToClassList("sf-camp__foot");
            page.Add(foot);
            var leave = new Button(Close) { name = "camp-break", text = Strings.Get("camp.break") };
            leave.AddToClassList("sf-button");
            foot.Add(leave);
            return root;
        }

        protected internal override void Shown()
        {
            _timeScale = Time.timeScale > 0f ? Time.timeScale : 1f;
            Time.timeScale = 0f;
            if (_m.Now != null) G.Minutes = _m.Now();
            Refresh();
        }

        protected internal override void Hidden()
        {
            Time.timeScale = _timeScale;
            _m.Done?.Invoke();
        }

        protected internal override bool Back()
        {
            if (!_writing) return true;
            _writing = false;
            Refresh();
            return false;
        }

        // ---- what can be done (public: tests do it) ----

        /// <summary>Rests a number of hours.</summary>
        public void Rest(int hours) => Do(() =>
        {
            var r = Camp.Rest(G, hours);
            var s = r.Healed > 0 ? Strings.Get("camp.rested_healed", hours, r.Healed) : Strings.Get("camp.rested", hours);
            if (!r.Water) s += " " + Strings.Get("camp.no_water");
            if (hours >= 6 && !r.Food) s += " " + Strings.Get("camp.no_food");
            return s;
        });

        public void Cook() => Do(() => Camp.Cook(G) > 0 ? Strings.Get("camp.cooked") : null);

        public void Mend(string slot) => Do(() =>
        {
            if (!Camp.Mend(G, slot)) return null;
            var it = G.Pc.Inventory.EquippedAt(slot);
            return Strings.Get("camp.mended", Name(it.Def), Mathf.RoundToInt((float)(it.Cond ?? 1) * 100f));
        });

        public void Hunt() => Do(() =>
        {
            var rng = new Rng(G.RngState != 0 ? G.RngState : 1u);
            var r = Camp.Hunt(G, _m.Abundance, rng);
            G.RngState = rng.State;
            return r.Text;
        });

        public void SetTraps() => Do(() => Camp.SetTraps(G, _m.TrapsAt) ? Strings.Get("camp.traps_laid") : null);

        public void CheckTraps() => Do(() =>
        {
            var line = Camp.Traps(G, _m.TrapsAt);
            if (line == null) return null;
            var n = Camp.CheckTraps(G, _m.TrapsAt, _m.Abundance);
            if (n == 1) return Strings.Get("camp.traps_one");
            if (n > 1) return Strings.Get("camp.traps_caught", n);
            return Strings.Get((G.Minutes - line.SetAt) / 60 < 8 ? "camp.traps_soon" : "camp.traps_empty");
        });

        /// <summary>Sends a letter (from a town).</summary>
        public void Write(string letter) => Do(() =>
        {
            if (!_m.Town || !Registry.Letters.TryGetValue(letter, out var def)) return null;
            Letters.Send(G, def, _m.Host);
            _writing = false;
            return Strings.Get("camp.sent", PersonName(def.To));
        });

        /// <summary>Runs something that may pass time on the game (read from the world's clock first) and hands the time
        /// back to the clock; says what came of it.</summary>
        private void Do(Func<string> act)
        {
            if (_m.Now != null) G.Minutes = _m.Now();
            var said = act();
            _m.Then?.Invoke(G.Minutes);
            if (!string.IsNullOrEmpty(said))
            {
                _said.text = said;
                _said.style.display = DisplayStyle.Flex;
            }
            Refresh();
        }

        // ---- the page ----

        private void Refresh()
        {
            if (Root == null) return;
            var d = Sheet.Derived(G.Pc.Sheet);
            var minutes = G.Minutes;
            _line.text = Strings.Get("camp.where", _m.Where, Clock.DayOf(minutes), $"{(int)(minutes % 1440 / 60):00}:{(int)(minutes % 60):00}");
            var (water, food) = Camp.Supplies(G);
            _health.text = Strings.Get("camp.health", G.Pc.Sheet.Hp, d.MaxHp, water, food);
            _body.Clear();
            if (_writing) WriteView();
            else Sections();
        }

        private void Sections()
        {
            Heading("camp.rest");
            var rest = Row();
            rest.Add(Act("rest-1", Strings.Get("camp.rest_1"), () => Rest(1)));
            rest.Add(Act("rest-4", Strings.Get("camp.rest_4"), () => Rest(4)));
            rest.Add(Act("rest-8", Strings.Get("camp.rest_8"), () => Rest(8)));
            var (until, morning) = Camp.UntilNext(G.Minutes);
            rest.Add(Act("rest-until", Strings.Get(morning ? "camp.rest_morning" : "camp.rest_evening", until), () => Rest(until)));
            Hint("camp.rest_hint");

            Heading("camp.talk");
            var party = G.World.Party.Where(id => Registry.Npcs.TryGetValue(id, out var n) && !string.IsNullOrEmpty(n.Dialogue)).ToList();
            if (party.Count == 0 || _m.Talk == null) Hint("camp.alone");
            else
            {
                var talk = Row();
                foreach (var id in party)
                {
                    var who = id;
                    talk.Add(Act("talk-" + id, PersonName(id), () => { Close(); _m.Talk(who); }));
                }
            }

            Heading("camp.hunt");
            if (_m.Abundance > 0)
            {
                var hunt = Row();
                hunt.Add(Act("hunt", Strings.Get("camp.hunt_go"), Hunt));
                var line = Camp.Traps(G, _m.TrapsAt);
                var parts = Camp.CanSetTraps(G);
                if (line != null) hunt.Add(Act("traps-check", Strings.Get("camp.traps_check"), CheckTraps));
                else if (parts) hunt.Add(Act("traps-set", Strings.Get("camp.traps_set"), SetTraps));
                var hint = Strings.Get(_m.Abundance >= 0.5 ? "camp.hunt_rich" : "camp.hunt_thin");
                if (line != null) hint += " " + Strings.Get("camp.traps_out");
                else if (!parts) hint += " " + Strings.Get("camp.traps_need");
                HintText(hint);
            }
            else Hint("camp.hunt_none");

            Heading("camp.cook");
            var raw = G.Pc.Inventory.Items.Where(i => Items.Has(i.Def) && !string.IsNullOrEmpty(Items.Def(i.Def).CookTo)).ToList();
            if (raw.Count == 0) Hint("camp.cook_none");
            else
            {
                var what = string.Join(", ", raw.Select(i => i.Qty > 1 ? $"{Name(i.Def)} ×{i.Qty}" : Name(i.Def)));
                Row().Add(Act("cook", Strings.Get("camp.cook_go", what), Cook));
            }

            Heading("camp.mend");
            var kits = Camp.RepairKits(G);
            var worn = Inventory.EquipSlots.Where(s => G.Pc.Inventory.EquippedAt(s) is { Cond: < 1 }).ToList();
            if (worn.Count > 0 && kits > 0)
            {
                var mend = Row();
                foreach (var slot in worn)
                {
                    var s = slot;
                    var it = G.Pc.Inventory.EquippedAt(s);
                    mend.Add(Act("mend-" + s, Strings.Get("camp.mend_item", Name(it.Def), Mathf.RoundToInt((float)it.Cond.Value * 100f)), () => Mend(s)));
                }
                Hint(kits == 1 ? "camp.kit_one" : "camp.kits", kits);
            }
            else Hint(kits > 0 ? "camp.mend_none" : "camp.no_kit");

            Heading("camp.write");
            if (!_m.Town) Hint("camp.write_town");
            else if (Letters.Available(G, Registry.Letters).Count == 0) Hint("camp.write_none");
            else Row().Add(Act("write", Strings.Get("camp.write_go"), () => { _writing = true; Refresh(); }));
        }

        private void WriteView()
        {
            Heading("camp.write_to");
            foreach (var l in Letters.Available(G, Registry.Letters))
            {
                var id = l.Id;
                var b = new Button(() => Write(id)) { name = "letter-" + l.Id };
                b.AddToClassList("sf-camp__letter");
                var to = new Label($"{PersonName(l.To)} · {l.Topic}");
                to.AddToClassList("sf-camp__letter-to");
                b.Add(to);
                var text = l.Text ?? "";
                var gist = new Label(text.Length > 120 ? text.Substring(0, 120).TrimEnd() + "…" : text);
                gist.AddToClassList("sf-camp__letter-gist");
                b.Add(gist);
                _body.Add(b);
            }
            Row().Add(Act("write-back", Strings.Get("camp.back"), () => { _writing = false; Refresh(); }, quiet: true));
        }

        private void Heading(string key)
        {
            var l = new Label(Strings.Get(key).ToUpperInvariant());
            l.AddToClassList("sf-camp__heading");
            _body.Add(l);
        }

        private VisualElement Row()
        {
            var r = new VisualElement();
            r.AddToClassList("sf-camp__row");
            _body.Add(r);
            return r;
        }

        private static Button Act(string name, string text, Action act, bool quiet = false)
        {
            var b = new Button(act) { name = name, text = text };
            b.AddToClassList("sf-button");
            b.AddToClassList("sf-camp__act");
            if (quiet) b.AddToClassList("sf-button--quiet");
            return b;
        }

        private void Hint(string key, params object[] args) => HintText(Strings.Get(key, args));

        private void HintText(string text)
        {
            var l = new Label(text);
            l.AddToClassList("sf-camp__hint");
            _body.Add(l);
        }

        private static string Name(string item) => Items.Has(item) ? Items.Def(item).Name : item;

        private static string PersonName(string id) => Registry.Npcs.TryGetValue(id, out var n) && !string.IsNullOrEmpty(n.Name) ? n.Name : id;
    }
}
