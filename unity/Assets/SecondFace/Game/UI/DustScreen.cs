using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>Who is at the Dust table and for what: the game (the player's Tolls, the flags), the opponent's definition,
    /// name and face, the terms (a stake each, or a prize), the host the prize's effects run with, a line for the HUD.</summary>
    public sealed class DustModel
    {
        public GameState Game;
        public NpcDef Npc;
        public string Name;
        /// <summary>The opponent's portrait (their initial when null).</summary>
        public Texture Face;
        public DustTerms Terms;
        public ILogicHost Host;
        /// <summary>The dice (the game's own when null).</summary>
        public Rng Rng;
        /// <summary>How long each of the opponent's throws is held on the table, milliseconds (0: their turn at once).</summary>
        public int StepMs = 650;
        public Action<string> Said;
        /// <summary>The game was decided and paid (the quests look again).</summary>
        public Action Settled;
    }

    /// <summary>
    /// The Dust table (the content's <c>dust</c> event; port of ui/dust.ts, DESIGN §2f): a page at the right with the
    /// world beside it, the opponent's face over it; the two scores against the target, the run on the table and its dice
    /// (a 1 drawn in rust: dusted), roll and bank on the player's turn, the opponent's turn played out throw by throw in
    /// front of them, what happened in the table's words, and, once it is decided, who takes the pot (or the prize) and
    /// leave the table. The rules are Core <see cref="Dust"/> on the game's dice; the stakes went in when the player sat
    /// down (the walkabout), the pot or the prize's effects are paid the moment the game is decided.
    /// </summary>
    public sealed class DustScreen : UIScreen
    {
        private readonly DustModel _m;
        private DustGame _s;
        private Label _terms, _youScore, _themScore, _runHead, _result;
        private VisualElement _youBar, _themBar, _dice, _log, _acts;
        private Button _roll, _bank, _leave;
        private IVisualElementScheduledItem _theirs;
        /// <summary>The dice drawn: the turn's throws, or the throws that ended in a 1 until the next.</summary>
        private readonly List<int> _drawn = new();
        private bool _settled;

        public DustScreen(DustModel model) { _m = model; }

        public override bool Opaque => false;
        public override bool HidesHud => true;

        /// <summary>The game as it stands (tests read it).</summary>
        public DustGame Game => _s;
        public Button RollButton => _roll;
        public Button BankButton => _bank;
        public Button LeaveButton => _leave;
        /// <summary>The opponent is playing their turn out.</summary>
        public bool TheirTurn => _s != null && !_s.Over && _s.Turn == 1;
        /// <summary>The pot or the prize has been paid.</summary>
        public bool Settled => _settled;
        public string Result => _result?.text;

        private GameState G => _m.Game;
        private string You => string.IsNullOrEmpty(G.Pc.Sheet.Name) ? Strings.Get("dust.you") : G.Pc.Sheet.Name;
        private string Them => string.IsNullOrEmpty(_m.Name) ? _m.Npc?.Name ?? "?" : _m.Name;

        protected internal override VisualElement Build()
        {
            _s = Dust.New(You, Them, Dust.NerveFor(_m.Npc?.Courage ?? 50, 50), _m.Terms.Prize != null ? 0 : _m.Terms.Stake);
            var root = new VisualElement();
            root.AddToClassList("sf-dust");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            safe.AddToClassList("sf-dust__safe");
            root.Add(safe);
            var page = new VisualElement { name = "dust-page" };
            page.AddToClassList("sf-dust__page");
            safe.Add(page);

            var head = new VisualElement();
            head.AddToClassList("sf-dust__head");
            var face = new VisualElement { name = "face" };
            face.AddToClassList("sf-dust__face");
            if (_m.Face != null) face.Add(new Image { image = _m.Face, scaleMode = ScaleMode.ScaleAndCrop, pickingMode = PickingMode.Ignore });
            else
            {
                var initial = new Label(Them.Substring(0, 1).ToUpperInvariant());
                initial.AddToClassList("sf-dust__initial");
                face.Add(initial);
            }
            head.Add(face);
            var titles = new VisualElement();
            titles.AddToClassList("sf-grow");
            var title = new Label(Strings.Get("dust.title"));
            title.AddToClassList("sf-dust__title");
            titles.Add(title);
            _terms = new Label { name = "terms" };
            _terms.AddToClassList("sf-dust__terms");
            titles.Add(_terms);
            head.Add(titles);
            page.Add(head);

            var scores = new VisualElement();
            scores.AddToClassList("sf-dust__scores");
            scores.Add(Score(You, out _youScore, out _youBar, "you"));
            scores.Add(Score(Them, out _themScore, out _themBar, "them"));
            page.Add(scores);

            _runHead = new Label { name = "run" };
            _runHead.AddToClassList("sf-dust__run");
            page.Add(_runHead);
            _dice = new VisualElement { name = "dice" };
            _dice.AddToClassList("sf-dust__dice");
            page.Add(_dice);

            _acts = new VisualElement();
            _acts.AddToClassList("sf-dust__acts");
            _roll = Act("dust-roll", Strings.Get("dust.roll"), () => Roll());
            _bank = Act("dust-bank", "", () => Bank());
            _bank.AddToClassList("sf-button--quiet");
            _leave = Act("dust-leave", Strings.Get("dust.leave"), Close);
            _leave.AddToClassList("sf-dust__leave");
            _acts.Add(_roll);
            _acts.Add(_bank);
            _acts.Add(_leave);
            page.Add(_acts);
            _result = new Label { name = "result" };
            _result.AddToClassList("sf-dust__result");
            page.Add(_result);

            var scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            scroll.AddToClassList("sf-dust__scroll");
            _log = scroll.contentContainer;
            page.Add(scroll);
            var rules = new Label(Strings.Get("dust.rules", _s.Target));
            rules.AddToClassList("sf-dust__rules");
            page.Add(rules);
            return root;
        }

        private static VisualElement Score(string who, out Label score, out VisualElement fill, string name)
        {
            var row = new VisualElement { name = "score-" + name };
            row.AddToClassList("sf-dust__score");
            var label = new Label(who);
            label.AddToClassList("sf-dust__who");
            row.Add(label);
            var bar = new VisualElement();
            bar.AddToClassList("sf-dust__bar");
            fill = new VisualElement();
            fill.AddToClassList("sf-dust__fill");
            bar.Add(fill);
            row.Add(bar);
            score = new Label();
            score.AddToClassList("sf-dust__points");
            row.Add(score);
            return row;
        }

        private static Button Act(string name, string text, Action act)
        {
            var b = new Button(act) { name = name, text = text };
            b.AddToClassList("sf-button");
            b.AddToClassList("sf-dust__act");
            return b;
        }

        protected internal override void Shown() => Refresh();

        protected internal override void Hidden()
        {
            _theirs?.Pause();
            // (left before the end: a game not decided pays nothing back; the stakes are in the pot)
        }

        /// <summary>The table is left only once the game is decided.</summary>
        protected internal override bool Back() => _s == null || _s.Over;

        // ---- the play (public: tests do it) ----

        private Rng Dice() => _m.Rng ?? new Rng(G.RngState != 0 ? G.RngState : 1u);
        private void Keep(Rng rng) { if (_m.Rng == null) G.RngState = rng.State; }

        /// <summary>Throws once on the player's turn (0 when it is not theirs).</summary>
        public int Roll()
        {
            if (_s.Over || _s.Turn != 0) return 0;
            var rng = Dice();
            var face = Throw(rng);
            Keep(rng);
            After();
            return face;
        }

        /// <summary>Banks the player's run (false when there is none or it is not their turn).</summary>
        public bool Bank()
        {
            if (_s.Over || _s.Turn != 0 || _s.Run <= 0) return false;
            Dust.Bank(_s);
            _drawn.Clear();
            After();
            return true;
        }

        /// <summary>The opponent's whole turn at once (tests; the table plays it throw by throw).</summary>
        public void PlayTheirTurn()
        {
            _theirs?.Pause();
            var rng = Dice();
            for (var guard = 0; guard < 40 && TheirTurn; guard++) Step(rng);
            Keep(rng);
            After();
        }

        /// <summary>One throw, the dice kept on the table if it was a 1 (the turn's throws are cleared by it).</summary>
        private int Throw(Rng rng)
        {
            var before = _s.Rolls.ToList();
            var face = Dust.Roll(_s, rng);
            _drawn.Clear();
            if (face == 1) { _drawn.AddRange(before); _drawn.Add(1); }
            else _drawn.AddRange(_s.Rolls);
            return face;
        }

        /// <summary>One decision of the opponent's (Core <see cref="Dust.AiStep"/>), the throw kept on the table.</summary>
        private string Step(Rng rng)
        {
            if (!TheirTurn) return "none";
            var before = _s.Rolls.ToList();
            var did = Dust.AiStep(_s, rng);
            _drawn.Clear();
            if (did != "roll") return did;
            // a throw that ended the turn was a 1: the run's throws and the 1 stay drawn
            if (_s.Turn != 1 || _s.Over) { _drawn.AddRange(before); _drawn.Add(1); }
            else _drawn.AddRange(_s.Rolls);
            return did;
        }

        /// <summary>After a move: the game paid if decided, the opponent's turn begun if it is theirs, the table redrawn.</summary>
        private void After()
        {
            if (_s.Over) Settle();
            else if (TheirTurn && _m.StepMs > 0 && Root != null)
            {
                // their throws one at a time, so the table reads
                _theirs?.Pause();
                _theirs = Root.schedule.Execute(TheirStep).StartingIn(_m.StepMs).Every(_m.StepMs);
            }
            else if (TheirTurn) { PlayTheirTurn(); return; }
            Refresh();
        }

        private void TheirStep()
        {
            if (!TheirTurn) { _theirs?.Pause(); return; }
            var rng = Dice();
            Step(rng);
            Keep(rng);
            if (!TheirTurn) _theirs?.Pause();
            if (_s.Over) Settle();
            Refresh();
        }

        /// <summary>The pot to the winner or the prize's effects (Core <see cref="Dust.Settle"/>), once.</summary>
        private void Settle()
        {
            if (_settled || !_s.Over) return;
            _settled = true;
            Dust.Settle(G, _m.Npc, _s, _m.Terms, _m.Host);
            var won = _s.Winner == 0;
            var prize = _m.Terms.Prize;
            var line = prize != null
                ? (won ? Strings.Get("dust.won_prize", prize.Label) : Strings.Get("dust.lost_prize", Them, prize.Label))
                : (won ? Strings.Get("dust.won_tolls", _m.Terms.Stake * 2) : Strings.Get("dust.lost_tolls", Them));
            _result.text = line;
            _m.Said?.Invoke(line);
            _m.Settled?.Invoke();
        }

        // ---- the table ----

        private void Refresh()
        {
            if (Root == null || _s == null) return;
            var prize = _m.Terms.Prize;
            _terms.text = prize != null ? Strings.Get("dust.terms_prize", _s.Target, prize.Label) : Strings.Get("dust.terms", _s.Target, _s.Stake * 2);
            void Points(Label l, VisualElement fill, int score)
            {
                l.text = score.ToString();
                fill.style.width = Length.Percent(Mathf.Clamp01(score / (float)_s.Target) * 100f);
            }
            Points(_youScore, _youBar, _s.Players[0].Score);
            Points(_themScore, _themBar, _s.Players[1].Score);
            _youScore.parent.EnableInClassList("sf-dust__score--turn", !_s.Over && _s.Turn == 0);
            _themScore.parent.EnableInClassList("sf-dust__score--turn", !_s.Over && _s.Turn == 1);
            _runHead.text = _s.Over ? Strings.Get("dust.wins", _s.Players[_s.Winner.Value].Name)
                : _s.Turn == 0 ? Strings.Get("dust.run_yours", _s.Run) : Strings.Get("dust.run_theirs", Them, _s.Run);
            _dice.Clear();
            foreach (var f in _drawn) _dice.Add(Die(f));
            var mine = !_s.Over && _s.Turn == 0;
            _roll.style.display = _s.Over ? DisplayStyle.None : DisplayStyle.Flex;
            _bank.style.display = _s.Over ? DisplayStyle.None : DisplayStyle.Flex;
            _roll.SetEnabled(mine);
            _bank.SetEnabled(mine && _s.Run > 0);
            _bank.text = _s.Run > 0 && mine ? Strings.Get("dust.bank_run", _s.Run) : Strings.Get("dust.bank");
            _leave.style.display = _s.Over ? DisplayStyle.Flex : DisplayStyle.None;
            _result.style.display = _settled ? DisplayStyle.Flex : DisplayStyle.None;
            _log.Clear();
            foreach (var l in _s.Log.Skip(Math.Max(0, _s.Log.Count - 6)))
            {
                var line = new Label(Line(l));
                line.AddToClassList("sf-dust__line");
                _log.Add(line);
            }
        }

        private string Line(DustLine l)
        {
            var who = _s.Players[l.Who].Name;
            switch (l.Kind)
            {
                case "stake": return _m.Terms.Prize != null ? Strings.Get("dust.log.stake_prize", Them, _m.Terms.Prize.Label) : Strings.Get("dust.log.stake", Them, l.Value);
                case "dusted": return Strings.Get("dust.log.dusted", who, l.Value);
                case "bank": return Strings.Get("dust.log.bank", who, l.Value, l.Score);
                case "level": return Strings.Get("dust.log.level", l.Score);
                case "pot": return _m.Terms.Prize != null ? Strings.Get("dust.log.pot_prize", who, _m.Terms.Prize.Label) : Strings.Get("dust.log.pot", who, l.Value);
                default: return l.Kind;
            }
        }

        /// <summary>A die drawn with its pips (a 1 in rust: the run is dusted).</summary>
        private static VisualElement Die(int face)
        {
            var die = new VisualElement { pickingMode = PickingMode.Ignore };
            die.AddToClassList("sf-dust__die");
            die.EnableInClassList("sf-dust__die--dusted", face == 1);
            foreach (var (x, y) in Pips(face))
            {
                var pip = new VisualElement { pickingMode = PickingMode.Ignore };
                pip.AddToClassList("sf-dust__pip");
                pip.style.left = Length.Percent(x);
                pip.style.top = Length.Percent(y);
                die.Add(pip);
            }
            return die;
        }

        private const float A = 26f, B = 50f, C = 74f;

        private static IEnumerable<(float, float)> Pips(int face)
        {
            switch (face)
            {
                case 1: return new[] { (B, B) };
                case 2: return new[] { (A, A), (C, C) };
                case 3: return new[] { (A, A), (B, B), (C, C) };
                case 4: return new[] { (A, A), (C, A), (A, C), (C, C) };
                case 5: return new[] { (A, A), (C, A), (B, B), (A, C), (C, C) };
                default: return new[] { (A, A), (C, A), (A, B), (C, B), (A, C), (C, C) };
            }
        }
    }
}
