using System;
using System.Collections.Generic;
using SecondFace.Core.Combat;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The fight on the HUD (play-ch1 T44; COMBAT.md B2–B11; the BG3 / XCOM 2 benchmark on a phone, touch first): the turn
    /// order along the top as portraits (who acts, in what order, how hurt, what is on them, where the round turns; a tap
    /// on one looks at them); over each fighter's head their health, the cover they have against the one acting (a half or
    /// full shield, or flanked), an eye when they would see the point being previewed, a held shot's eye, the AI's coming
    /// target where the difficulty shows it, a warning when a throw would catch them; numbers that float up from a hit
    /// (miss, graze, damage, crit, statuses, a breaking nerve, a surrender); the shot card with every reason behind the
    /// odds, the damage, the crit and the kill; a card at the end of a previewed walk or throw with its cost, cover, the
    /// shots it draws and whom it flanks, and shields where the cover stands at its end; the action points as pips with
    /// the preview's cost lit; the turn's actions in two rows in the action cluster's place (stance, throw, switch, patch
    /// up; undo, reload, hold, end turn), each 100 units square; a banner for a turn's start; the end of the fight in words.
    /// Everything placed on screen is placed each frame from the camera's own view (<see cref="Frame"/>), reusing its
    /// elements (no allocation per frame once grown).
    /// </summary>
    public sealed class CombatHud
    {
        /// <summary>One fighter as the HUD shows them (filled by the fight when anything changes; placed every frame).</summary>
        public sealed class Fighter
        {
            public string Name, Initials;
            public bool Hostile, Player, Current, Down, Controlled, NextRound;
            public int Hp, MaxHp;
            /// <summary>Where the bar floats (world, over the head).</summary>
            public Vector3 Over;
            public Texture Portrait;
            /// <summary>The cover they have against the one acting (none, half, full; null: no mark), and flanked by them.</summary>
            public string Cover;
            public bool Flanked;
            /// <summary>Would see the point being previewed; holds a shot; caught in a throw's footprint (one of ours).</summary>
            public bool Sees, Watching, Caught;
            /// <summary>Whom they mean to go for (the shown intent), or null.</summary>
            public string Intent;
            public readonly List<(string Id, int Turns)> Statuses = new();
        }

        public const int MaxStatusIcons = 4, MaxPips = 16, MaxShields = 8, MaxCardLines = 10;
        public const float FloatSeconds = 1.3f, FloatRise = 46f;

        public VisualElement Root { get; }
        private readonly VisualElement _order, _bars, _plate, _buttons, _pips, _card, _cardLines, _point, _banner, _summary;
        private readonly Label _ap, _log, _cardTitle, _cardChance, _cardCost, _cardDamage, _cardCrit, _cardKill, _cardCover, _cardWhy, _pointHead, _pointBody, _bannerText, _summaryTitle, _summaryBody;
        private readonly List<Chip> _chips = new();
        private readonly List<Bar> _floating = new();
        private readonly List<FloatNum> _nums = new();
        private readonly List<VisualElement> _shields = new();
        private readonly List<(Vector3 At, string Level)> _shieldAt = new();
        private readonly List<(VisualElement Row, Label Label, Label Note, Label Value)> _lines = new();
        private readonly Dictionary<string, Button> _actions = new();
        private readonly Dictionary<string, Label> _notes = new();
        private Vector3? _pointAt;
        /// <summary>The floating origin's rebase (§19.1): the point's and the shields' anchors move with the world.</summary>
        public void Shift(Vector3 d)
        {
            if (_pointAt is { } p) _pointAt = p + d;
            for (var i = 0; i < _shieldAt.Count; i++) _shieldAt[i] = (_shieldAt[i].At + d, _shieldAt[i].Level);
        }
        private float _bannerUntil;

        /// <summary>A cluster button pressed (its id: stance, throw, swap, heal, undo, reload, overwatch, end_turn).</summary>
        public event Action<string> Pressed;
        /// <summary>A portrait in the turn order tapped (its place in the order).</summary>
        public event Action<int> PortraitTapped;

        private sealed class Chip { public VisualElement Root, Face, Fill; public Label Initials; public Texture Shown; public bool Set; public readonly List<VisualElement> Status = new(); }
        private static readonly string[] FloatKinds = { "miss", "graze", "hit", "crit", "heal", "down", "status", "break", "yield", "surprised" };
        private sealed class Bar { public VisualElement Root, Fill, Cover, Flank, Eye, Watch, Caught, Intent; public Label Name, IntentName; }
        private sealed class FloatNum { public Label Label; public Vector3 At; public float Born; public bool Live; public int Stack; }

        public static readonly string[] ActionIds = { "stance", "throw", "swap", "heal", "undo", "reload", "overwatch", "end_turn" };

        public CombatHud(UIService ui)
        {
            Root = new VisualElement { name = "combat-hud", pickingMode = PickingMode.Ignore };
            Root.AddToClassList("sf-combat");
            Root.AddToClassList(UIService.SafeClass);
            Root.style.position = Position.Absolute; Root.style.left = 0; Root.style.right = 0; Root.style.top = 0; Root.style.bottom = 0;

            _bars = new VisualElement { name = "combat-bars", pickingMode = PickingMode.Ignore };
            _bars.style.position = Position.Absolute; _bars.style.left = 0; _bars.style.right = 0; _bars.style.top = 0; _bars.style.bottom = 0;
            Root.Add(_bars);

            // (the safe padding moves only children in flow: the placed pieces sit in a filler, as the HUD's do; what is
            // placed over the world is in the panel's own coordinates and stays outside it)
            var area = new VisualElement { name = "combat-area", pickingMode = PickingMode.Ignore };
            area.style.flexGrow = 1;
            Root.Add(area);

            _order = new VisualElement { name = "combat-order", pickingMode = PickingMode.Ignore };
            _order.AddToClassList("sf-combat__order");
            area.Add(_order);

            // the point card (a walk's or a throw's), placed over the world
            _point = Plate("combat-point", "sf-combat__point", _bars);
            _pointHead = Text(_point, "sf-combat__point-head");
            _pointBody = Text(_point, "sf-combat__point-body");
            _point.style.display = DisplayStyle.None;

            // the shot card (B3)
            _card = Plate("combat-card", "sf-combat__card", area);
            _cardTitle = Text(_card, "sf-combat__card-title");
            var head = Row(_card, "sf-combat__card-head");
            _cardChance = Text(head, "sf-combat__card-chance");
            _cardCost = Text(head, "sf-combat__card-cost");
            var facts = Row(_card, "sf-combat__card-facts");
            _cardDamage = Text(facts, "sf-combat__card-fact");
            _cardCrit = Text(facts, "sf-combat__card-fact");
            _cardKill = Text(facts, "sf-combat__card-fact");
            _cardCover = Text(facts, "sf-combat__card-fact");
            _cardLines = new VisualElement { name = "combat-card-reasons", pickingMode = PickingMode.Ignore };
            _cardLines.AddToClassList("sf-combat__card-reasons");
            _card.Add(_cardLines);
            _cardWhy = Text(_card, "sf-combat__card-why");
            _card.style.display = DisplayStyle.None;

            // the plate: AP pips, the AP and the fight's last lines
            _plate = Plate("combat-plate", "sf-combat__plate", area);
            _pips = new VisualElement { name = "combat-pips", pickingMode = PickingMode.Ignore };
            _pips.AddToClassList("sf-combat__pips");
            _plate.Add(_pips);
            for (var i = 0; i < MaxPips; i++)
            {
                var pip = new VisualElement { pickingMode = PickingMode.Ignore };
                pip.AddToClassList("sf-combat__pip");
                _pips.Add(pip);
            }
            _ap = Text(_plate, "sf-combat__ap"); _ap.name = "combat-ap";
            _log = Text(_plate, "sf-combat__log"); _log.name = "combat-log";

            // the turn's actions: two rows of four (B10: 100 units each, thumb's reach)
            _buttons = new VisualElement { name = "combat-buttons", pickingMode = PickingMode.Ignore };
            _buttons.AddToClassList("sf-combat__actions");
            area.Add(_buttons);
            var top = Row(_buttons, "sf-combat__action-row");
            var bottom = Row(_buttons, "sf-combat__action-row");
            for (var i = 0; i < ActionIds.Length; i++) Button(i < 4 ? top : bottom, ActionIds[i]);

            _banner = Plate("combat-banner", "sf-combat__banner", area);
            _bannerText = Text(_banner, "sf-combat__banner-text");
            _banner.style.display = DisplayStyle.None;

            _summary = Plate("combat-summary", "sf-combat__summary", area);
            _summaryTitle = Text(_summary, "sf-combat__summary-title");
            _summaryBody = Text(_summary, "sf-combat__summary-body");
            _summary.style.display = DisplayStyle.None;

            for (var i = 0; i < MaxShields; i++)
            {
                var s = Icons.Make("shield_half", 34f);
                s.AddToClassList("sf-combat__shield");
                s.style.position = Position.Absolute;
                s.style.display = DisplayStyle.None;
                _bars.Add(s);
                _shields.Add(s);
            }

            ui.Hud.Add(Root);
            ui.Pad(Root);
        }

        private static VisualElement Plate(string name, string cls, VisualElement parent)
        {
            var p = new VisualElement { name = name, pickingMode = PickingMode.Ignore };
            p.AddToClassList("sf-plate");
            p.AddToClassList(cls);
            parent.Add(p);
            return p;
        }

        private static VisualElement Row(VisualElement parent, string cls)
        {
            var r = new VisualElement { pickingMode = PickingMode.Ignore };
            r.AddToClassList(cls);
            parent.Add(r);
            return r;
        }

        private static Label Text(VisualElement parent, string cls)
        {
            var l = new Label { pickingMode = PickingMode.Ignore };
            l.AddToClassList(cls);
            parent.Add(l);
            return l;
        }

        private void Button(VisualElement row, string id)
        {
            var b = new Button(() => Pressed?.Invoke(id)) { name = "combat-" + id };
            b.AddToClassList("sf-hud__action");
            b.AddToClassList("sf-combat__action");
            b.Add(Icons.Make(id, 38f));
            var label = new Label { pickingMode = PickingMode.Ignore };
            label.AddToClassList("sf-hud__action-label");
            Strings.Bind(label, "combat." + id);
            b.Add(label);
            var note = new Label { name = "note-" + id, pickingMode = PickingMode.Ignore };
            note.AddToClassList("sf-combat__action-note");
            b.Add(note);
            row.Add(b);
            _actions[id] = b;
            _notes[id] = note;
        }

        public Button EndTurnButton => _actions["end_turn"];
        public Button ActionButton(string id) => _actions.TryGetValue(id, out var b) ? b : null;

        /// <summary>The size of the panel the marks over the world are placed in (panel units).</summary>
        public Vector2 Area => _bars.layout.size;

        // ---- the plate -------------------------------------------------------------------------------------------------

        /// <summary>The acting fighter's action points (null while it is not one of the player's) and the fight's last lines.</summary>
        public void Status(string ap, string log)
        {
            _ap.text = ap ?? "";
            _ap.style.display = string.IsNullOrEmpty(ap) ? DisplayStyle.None : DisplayStyle.Flex;
            _log.text = log ?? "";
        }

        /// <summary>The AP as pips: <paramref name="ap"/> of <paramref name="max"/> lit, the last <paramref name="spend"/> of
        /// them marked as what the preview would spend (more than there are: all marked short).</summary>
        public void Pips(int ap, int max, int spend)
        {
            max = Mathf.Clamp(max, 0, MaxPips);
            _pips.style.display = max > 0 ? DisplayStyle.Flex : DisplayStyle.None;
            for (var i = 0; i < MaxPips; i++)
            {
                var pip = _pips[i];
                pip.style.display = i < max ? DisplayStyle.Flex : DisplayStyle.None;
                var lit = i < ap;
                pip.EnableInClassList("sf-combat__pip--on", lit);
                pip.EnableInClassList("sf-combat__pip--spend", lit && spend > 0 && i >= ap - Mathf.Min(spend, ap));
                pip.EnableInClassList("sf-combat__pip--short", spend > ap && i < max && !lit && i < spend);
            }
        }

        /// <summary>Spent pips this frame (tests read it).</summary>
        public int PipsSpent { get { var n = 0; for (var i = 0; i < MaxPips; i++) if (_pips[i].ClassListContains("sf-combat__pip--spend")) n++; return n; } }

        // ---- the actions ------------------------------------------------------------------------------------------------

        /// <summary>The buttons answer only on the player's side's turn (and with nothing playing).</summary>
        public void Mine(bool mine) => _buttons.SetEnabled(mine);

        /// <summary>Each action open or not, with its note (cost, why not).</summary>
        public void Actions(IReadOnlyList<CombatAction> actions)
        {
            foreach (var a in actions)
            {
                if (!_actions.TryGetValue(a.Id, out var b)) continue;
                b.SetEnabled(a.Open);
                _notes[a.Id].text = a.Note ?? "";
                _notes[a.Id].style.display = string.IsNullOrEmpty(a.Note) ? DisplayStyle.None : DisplayStyle.Flex;
            }
        }

        /// <summary>End turn asks to be pressed again (AP are left): lit, and the plate says why.</summary>
        public void ArmEndTurn(bool armed) => _actions["end_turn"].EnableInClassList("sf-combat__action--armed", armed);
        public bool EndTurnArmed => _actions["end_turn"].ClassListContains("sf-combat__action--armed");
        /// <summary>A mode is on (a throw being aimed): its button lit.</summary>
        public void Lit(string id, bool on) { if (_actions.TryGetValue(id, out var b)) b.EnableInClassList("sf-hud__action--on", on); }

        // ---- the shot card (B3) ----------------------------------------------------------------------------------------

        public bool CardShown => _card.style.display == DisplayStyle.Flex;
        /// <summary>The reasons the card lists now (tests read them).</summary>
        public int CardReasons { get; private set; }
        public string CardChance => _cardChance.text;

        public void ShowCard(string title, ShotCard c)
        {
            _card.style.display = DisplayStyle.Flex;
            _cardTitle.text = title ?? "";
            _cardChance.text = c.Headline;
            _cardCost.text = c.Cost;
            _cardDamage.text = c.Damage;
            _cardCrit.text = c.CritLine;
            _cardKill.text = c.KillLine;
            _cardCover.text = c.CoverLine;
            _card.EnableInClassList("sf-combat__card--blocked", !c.Ok);
            var n = Mathf.Min(MaxCardLines, c.Lines.Count + c.Warnings.Count);
            while (_lines.Count < n)
            {
                var row = new VisualElement { pickingMode = PickingMode.Ignore };
                row.AddToClassList("sf-combat__reason");
                var label = Text(row, "sf-combat__reason-label");
                var note = Text(row, "sf-combat__reason-note");
                var value = Text(row, "sf-combat__reason-value");
                _cardLines.Add(row);
                _lines.Add((row, label, note, value));
            }
            for (var i = 0; i < _lines.Count; i++)
            {
                var (row, label, note, value) = _lines[i];
                if (i >= n) { row.style.display = DisplayStyle.None; continue; }
                row.style.display = DisplayStyle.Flex;
                if (i < c.Lines.Count)
                {
                    var l = c.Lines[i];
                    label.text = l.Label; note.text = l.Note ?? ""; value.text = l.Value ?? "";
                    row.EnableInClassList("sf-combat__reason--minus", !l.Info && l.Points < 0 && l.Key != "skill");
                    row.EnableInClassList("sf-combat__reason--plus", !l.Info && l.Points > 0 && l.Key != "skill");
                    row.EnableInClassList("sf-combat__reason--warn", false);
                }
                else
                {
                    label.text = c.Warnings[i - c.Lines.Count]; note.text = ""; value.text = "";
                    row.EnableInClassList("sf-combat__reason--minus", false);
                    row.EnableInClassList("sf-combat__reason--plus", false);
                    row.EnableInClassList("sf-combat__reason--warn", true);
                }
            }
            CardReasons = c.Lines.Count;
            _cardWhy.text = c.Why ?? "";
            _cardWhy.style.display = string.IsNullOrEmpty(c.Why) ? DisplayStyle.None : DisplayStyle.Flex;
        }

        public void HideCard() { _card.style.display = DisplayStyle.None; CardReasons = 0; }

        // ---- the point card (B2, B5) and the shields at the point (B4) --------------------------------------------------

        public bool PointShown => _point.style.display == DisplayStyle.Flex;
        public string PointHeadline => _pointHead.text;
        public int ShieldsShown { get; private set; }

        /// <summary>A card over a point on the ground (a previewed walk's end, a throw's landing): its headline and lines.</summary>
        public void ShowPoint(Vector3 at, string headline, IReadOnlyList<string> lines, bool ok)
        {
            _pointAt = at;
            _point.style.display = DisplayStyle.Flex;
            _point.EnableInClassList("sf-combat__point--blocked", !ok);
            _pointHead.text = headline ?? "";
            _pointBody.text = lines != null && lines.Count > 0 ? string.Join("\n", lines) : "";
            _pointBody.style.display = lines != null && lines.Count > 0 ? DisplayStyle.Flex : DisplayStyle.None;
        }

        public void HidePoint() { _pointAt = null; _point.style.display = DisplayStyle.None; Shields(null); }

        /// <summary>The cover pieces at the previewed point, each a shield where it stands (world points; null: none).</summary>
        public void Shields(IReadOnlyList<(Vector3 At, string Level)> pieces)
        {
            _shieldAt.Clear();
            if (pieces != null) for (var i = 0; i < pieces.Count && i < MaxShields; i++) _shieldAt.Add(pieces[i]);
            for (var i = 0; i < MaxShields; i++)
            {
                if (i < _shieldAt.Count) Icons.Set(_shields[i], _shieldAt[i].Level == "full" ? "shield_full" : "shield_half");
                _shields[i].EnableInClassList("sf-combat__shield--full", i < _shieldAt.Count && _shieldAt[i].Level == "full");
            }
            ShieldsShown = _shieldAt.Count;
        }

        // ---- floating numbers (B7) ---------------------------------------------------------------------------------------

        public int FloatsLive { get { var n = 0; foreach (var f in _nums) if (f.Live) n++; return n; } }
        /// <summary>Every float shown since the fight began (tests read it).</summary>
        public int FloatsShown { get; private set; }
        public string LastFloat { get; private set; }

        /// <summary>A number or word floats up from over a fighter's head (kind: miss, graze, hit, crit, heal, down, status,
        /// break, yield, surprised), a little above any still rising there.</summary>
        public void Float(Vector3 over, string text, string kind)
        {
            FloatNum f = null;
            foreach (var x in _nums) if (!x.Live) { f = x; break; }
            if (f == null)
            {
                f = new FloatNum { Label = new Label { pickingMode = PickingMode.Ignore } };
                f.Label.AddToClassList("sf-combat__num");
                _bars.Add(f.Label);
                _nums.Add(f);
            }
            var stack = 0;
            foreach (var x in _nums) if (x.Live && (x.At - over).sqrMagnitude < 0.25f && Time.unscaledTime - x.Born < FloatSeconds * 0.7f) stack++;
            f.Live = true; f.At = over; f.Born = Time.unscaledTime; f.Stack = stack;
            f.Label.text = text;
            foreach (var k in FloatKinds) f.Label.EnableInClassList("sf-combat__num--" + k, k == kind);
            f.Label.style.display = DisplayStyle.Flex;
            FloatsShown++;
            LastFloat = text;
        }

        // ---- the banner and the end ------------------------------------------------------------------------------------

        public string BannerText => _banner.style.display == DisplayStyle.Flex ? _bannerText.text : null;

        public void Banner(string text, float seconds = 1.6f)
        {
            _bannerText.text = text ?? "";
            _banner.style.display = DisplayStyle.Flex;
            _bannerUntil = Time.unscaledTime + seconds;
        }

        public bool SummaryShown => _summary.style.display == DisplayStyle.Flex;
        public string SummaryTitle => _summaryTitle.text;

        public void Summary(string title, IReadOnlyList<string> lines)
        {
            _summaryTitle.text = title ?? "";
            _summaryBody.text = lines != null ? string.Join("\n", lines) : "";
            _summary.style.display = DisplayStyle.Flex;
        }

        public void HideSummary() => _summary.style.display = DisplayStyle.None;

        // ---- every frame ------------------------------------------------------------------------------------------------

        /// <summary>The turn order (in order, the one acting first, the next round after its divider) and everything placed
        /// over the world, by <paramref name="toPanel"/> (world to the panel's coordinates; null when off screen).</summary>
        public void Frame(IReadOnlyList<Fighter> fighters, int count, Func<Vector3, Vector2?> toPanel)
        {
            // the order
            while (_chips.Count < count) _chips.Add(NewChip(_chips.Count));
            for (var i = 0; i < _chips.Count; i++)
            {
                var chip = _chips[i];
                if (i >= count) { chip.Root.style.display = DisplayStyle.None; continue; }
                var f = fighters[i];
                chip.Root.style.display = DisplayStyle.Flex;
                chip.Root.EnableInClassList("sf-combat__chip--current", f.Current);
                chip.Root.EnableInClassList("sf-combat__chip--hostile", f.Hostile);
                chip.Root.EnableInClassList("sf-combat__chip--player", f.Player || f.Controlled);
                chip.Root.EnableInClassList("sf-combat__chip--down", f.Down);
                chip.Root.EnableInClassList("sf-combat__chip--next-round", f.NextRound);
                chip.Initials.text = f.Initials ?? "";
                SetFace(chip, f.Portrait);
                Fill(chip.Fill, f);
                for (var s = 0; s < MaxStatusIcons; s++)
                {
                    var icon = chip.Status[s];
                    if (s < f.Statuses.Count) { Icons.Set(icon, f.Statuses[s].Id); icon.style.display = DisplayStyle.Flex; }
                    else icon.style.display = DisplayStyle.None;
                }
            }
            // the bars and marks over their heads
            while (_floating.Count < count) _floating.Add(NewBar());
            for (var i = 0; i < _floating.Count; i++)
            {
                var b = _floating[i];
                var at = i < count && !fighters[i].Down ? toPanel(fighters[i].Over) : null;
                if (at == null) { b.Root.style.display = DisplayStyle.None; continue; }
                var f = fighters[i];
                b.Root.style.display = DisplayStyle.Flex;
                b.Root.style.left = at.Value.x - 70f; b.Root.style.top = at.Value.y - 52f;
                b.Root.EnableInClassList("sf-combat__float--hostile", f.Hostile);
                b.Root.EnableInClassList("sf-combat__float--current", f.Current);
                b.Name.text = f.Player ? "" : f.Name;
                Fill(b.Fill, f);
                var shield = f.Cover == "half" || f.Cover == "full";
                b.Cover.style.display = shield && !f.Flanked ? DisplayStyle.Flex : DisplayStyle.None;
                if (shield) Icons.Set(b.Cover, f.Cover == "full" ? "shield_full" : "shield_half");
                b.Flank.style.display = f.Flanked ? DisplayStyle.Flex : DisplayStyle.None;
                b.Eye.style.display = f.Sees ? DisplayStyle.Flex : DisplayStyle.None;
                b.Watch.style.display = f.Watching ? DisplayStyle.Flex : DisplayStyle.None;
                b.Caught.style.display = f.Caught ? DisplayStyle.Flex : DisplayStyle.None;
                b.Intent.style.display = f.Intent != null ? DisplayStyle.Flex : DisplayStyle.None;
                b.IntentName.text = f.Intent ?? "";
            }
            // the shields at the point
            for (var i = 0; i < MaxShields; i++)
            {
                var at = i < _shieldAt.Count ? toPanel(_shieldAt[i].At) : null;
                var s = _shields[i];
                if (at == null) { s.style.display = DisplayStyle.None; continue; }
                s.style.display = DisplayStyle.Flex;
                s.style.left = at.Value.x - 17f; s.style.top = at.Value.y - 17f;
            }
            // the point's card
            if (_pointAt is { } pa)
            {
                var at = toPanel(pa + Vector3.up * 0.6f);
                if (at == null) _point.style.visibility = Visibility.Hidden;
                else
                {
                    _point.style.visibility = Visibility.Visible;
                    var size = Area;
                    var w = _point.resolvedStyle.width; var h = _point.resolvedStyle.height;
                    if (float.IsNaN(w)) w = 260f; if (float.IsNaN(h)) h = 80f;
                    _point.style.left = Mathf.Clamp(at.Value.x + 28f, 8f, Mathf.Max(8f, size.x - w - 8f));
                    _point.style.top = Mathf.Clamp(at.Value.y - h - 12f, 8f, Mathf.Max(8f, size.y - h - 8f));
                }
            }
            // what floats up
            var now = Time.unscaledTime;
            foreach (var n in _nums)
            {
                if (!n.Live) continue;
                var age = now - n.Born;
                var at = age < FloatSeconds ? toPanel(n.At) : null;
                if (at == null) { n.Live = age < FloatSeconds; if (!n.Live) n.Label.style.display = DisplayStyle.None; else n.Label.style.visibility = Visibility.Hidden; continue; }
                n.Label.style.visibility = Visibility.Visible;
                var t = age / FloatSeconds;
                n.Label.style.left = at.Value.x - 60f;
                n.Label.style.top = at.Value.y - 76f - n.Stack * 26f - FloatRise * (1f - (1f - t) * (1f - t));
                n.Label.style.opacity = t < 0.65f ? 1f : Mathf.Clamp01((1f - t) / 0.35f);
            }
            // the banner
            if (_banner.style.display == DisplayStyle.Flex && now > _bannerUntil) _banner.style.display = DisplayStyle.None;
        }

        private Chip NewChip(int index)
        {
            var c = new Chip { Root = new VisualElement { name = "combat-chip-" + index } };
            c.Root.AddToClassList("sf-combat__chip");
            c.Root.AddManipulator(new Clickable(() => PortraitTapped?.Invoke(index)));
            c.Face = new VisualElement { pickingMode = PickingMode.Ignore };
            c.Face.AddToClassList("sf-combat__face");
            c.Initials = Text(c.Face, "sf-combat__chip-name");
            c.Root.Add(c.Face);
            var track = new VisualElement { pickingMode = PickingMode.Ignore };
            track.AddToClassList("sf-hud__bar");
            c.Fill = new VisualElement { pickingMode = PickingMode.Ignore };
            c.Fill.AddToClassList("sf-hud__fill");
            track.Add(c.Fill);
            c.Root.Add(track);
            var row = new VisualElement { pickingMode = PickingMode.Ignore };
            row.AddToClassList("sf-combat__statuses");
            for (var s = 0; s < MaxStatusIcons; s++)
            {
                var icon = Icons.Make("bleeding", 16f);
                icon.AddToClassList("sf-combat__status");
                icon.style.display = DisplayStyle.None;
                row.Add(icon);
                c.Status.Add(icon);
            }
            c.Root.Add(row);
            _order.Add(c.Root);
            return c;
        }

        private Bar NewBar()
        {
            var b = new Bar { Root = new VisualElement { pickingMode = PickingMode.Ignore } };
            b.Root.AddToClassList("sf-combat__float");
            var marks = new VisualElement { pickingMode = PickingMode.Ignore };
            marks.AddToClassList("sf-combat__marks");
            VisualElement Mark(string icon, string cls)
            {
                var m = Icons.Make(icon, 22f);
                m.AddToClassList("sf-combat__mark");
                m.AddToClassList(cls);
                m.style.display = DisplayStyle.None;
                marks.Add(m);
                return m;
            }
            b.Cover = Mark("shield_half", "sf-combat__mark--cover");
            b.Flank = Mark("flanked", "sf-combat__mark--flank");
            b.Eye = Mark("eye", "sf-combat__mark--eye");
            b.Watch = Mark("watching", "sf-combat__mark--watch");
            b.Caught = Mark("caught", "sf-combat__mark--caught");
            b.Intent = Mark("intent", "sf-combat__mark--intent");
            b.IntentName = Text(marks, "sf-combat__intent");
            b.Root.Add(marks);
            b.Name = Text(b.Root, "sf-combat__float-name");
            var track = new VisualElement { pickingMode = PickingMode.Ignore };
            track.AddToClassList("sf-hud__bar");
            b.Fill = new VisualElement { pickingMode = PickingMode.Ignore };
            b.Fill.AddToClassList("sf-hud__fill");
            track.Add(b.Fill);
            b.Root.Add(track);
            _bars.Add(b.Root);
            return b;
        }

        /// <summary>The marks over fighters' heads now (tests read them): shields, flanks, eyes, held shots, intents, warnings.</summary>
        public (int Cover, int Flanked, int Eyes, int Watching, int Intents, int Caught) Marks()
        {
            int c = 0, f = 0, e = 0, w = 0, i = 0, k = 0;
            foreach (var b in _floating)
            {
                if (b.Root.style.display == DisplayStyle.None) continue;
                if (b.Cover.style.display == DisplayStyle.Flex) c++;
                if (b.Flank.style.display == DisplayStyle.Flex) f++;
                if (b.Eye.style.display == DisplayStyle.Flex) e++;
                if (b.Watch.style.display == DisplayStyle.Flex) w++;
                if (b.Intent.style.display == DisplayStyle.Flex) i++;
                if (b.Caught.style.display == DisplayStyle.Flex) k++;
            }
            return (c, f, e, w, i, k);
        }

        /// <summary>Portraits shown in the order now (tests read it).</summary>
        public int Portraits { get { var n = 0; foreach (var c in _chips) if (c.Root.style.display == DisplayStyle.Flex && c.Initials.style.display == DisplayStyle.None) n++; return n; } }
        public int OrderShown { get { var n = 0; foreach (var c in _chips) if (c.Root.style.display == DisplayStyle.Flex) n++; return n; } }

        private static void SetFace(Chip c, Texture portrait)
        {
            if (c.Set && c.Shown == portrait) return;
            c.Set = true;
            c.Shown = portrait;
            c.Initials.style.display = portrait != null ? DisplayStyle.None : DisplayStyle.Flex;
            c.Face.style.backgroundImage = portrait switch
            {
                RenderTexture rt => new StyleBackground(Background.FromRenderTexture(rt)),
                Texture2D t => new StyleBackground(t),
                _ => new StyleBackground(StyleKeyword.None),
            };
        }

        private static void Fill(VisualElement fill, Fighter f)
        {
            var h = f.MaxHp > 0 ? Mathf.Clamp01(f.Hp / (float)f.MaxHp) : 0f;
            fill.style.width = Length.Percent(h * 100f);
            fill.EnableInClassList("sf-hud__fill--low", h < 0.5f && h >= 0.25f);
            fill.EnableInClassList("sf-hud__fill--critical", h < 0.25f);
        }

        /// <summary>A name's initials for a portrait still being drawn.</summary>
        public static string InitialsOf(string name)
        {
            if (string.IsNullOrEmpty(name)) return "?";
            var parts = name.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            return parts.Length >= 2 ? $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[^1][0])}" : name.Substring(0, Math.Min(2, name.Length));
        }

        public void Close() => Root.RemoveFromHierarchy();
    }
}
