using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The fight on the HUD (play-ch1 T44; the DOS2/BG3 benchmark on a phone): the turn order along the top (who acts, in
    /// what order, how hurt), a health bar over each fighter's head that follows them on screen, the action points and
    /// the last thing that happened at the bottom left beside the party, and the turn's buttons (end turn, reload, patch
    /// up) in the action cluster's place at the bottom right, drawn as the HUD's own buttons. The walkabout's actions and
    /// the eye give way while a fight is on.
    /// </summary>
    public sealed class CombatHud
    {
        /// <summary>One fighter as the HUD shows them.</summary>
        public sealed class Fighter
        {
            public string Name;
            public bool Hostile, Player, Current, Down;
            public int Hp, MaxHp;
            /// <summary>Where the bar floats (world, over the head).</summary>
            public Vector3 Over;
        }

        public VisualElement Root { get; }
        private readonly VisualElement _order, _bars, _plate, _buttons;
        private readonly Label _ap, _log;
        private readonly List<(VisualElement Bar, VisualElement Fill, Label Name)> _floating = new();

        public CombatHud(UIService ui, Action endTurn, Action reload, Action heal)
        {
            Root = new VisualElement { name = "combat-hud", pickingMode = PickingMode.Ignore };
            Root.AddToClassList("sf-combat");
            Root.AddToClassList(UIService.SafeClass);
            Root.style.position = Position.Absolute; Root.style.left = 0; Root.style.right = 0; Root.style.top = 0; Root.style.bottom = 0;

            _bars = new VisualElement { name = "combat-bars", pickingMode = PickingMode.Ignore };
            _bars.style.position = Position.Absolute; _bars.style.left = 0; _bars.style.right = 0; _bars.style.top = 0; _bars.style.bottom = 0;
            Root.Add(_bars);

            // (the safe padding moves only children in flow: the placed pieces sit in a filler, as the HUD's do; the bars
            // over heads are in the panel's own coordinates and stay outside it)
            var area = new VisualElement { name = "combat-area", pickingMode = PickingMode.Ignore };
            area.style.flexGrow = 1;
            Root.Add(area);

            _order = new VisualElement { name = "combat-order", pickingMode = PickingMode.Ignore };
            _order.AddToClassList("sf-combat__order");
            area.Add(_order);

            _plate = new VisualElement { name = "combat-plate", pickingMode = PickingMode.Ignore };
            _plate.AddToClassList("sf-plate");
            _plate.AddToClassList("sf-combat__plate");
            _ap = new Label { name = "combat-ap", pickingMode = PickingMode.Ignore };
            _ap.AddToClassList("sf-combat__ap");
            _log = new Label { name = "combat-log", pickingMode = PickingMode.Ignore };
            _log.AddToClassList("sf-combat__log");
            _plate.Add(_ap); _plate.Add(_log);
            area.Add(_plate);

            _buttons = new VisualElement { name = "combat-buttons", pickingMode = PickingMode.Ignore };
            _buttons.AddToClassList("sf-hud__actions");
            area.Add(_buttons);
            Button(heal, "heal", "combat.heal");
            Button(reload, "reload", "combat.reload");
            Button(endTurn, "end_turn", "combat.end_turn");

            ui.Hud.Add(Root);
            ui.Pad(Root);
        }

        private void Button(Action clicked, string icon, string key)
        {
            var b = new Button(() => clicked?.Invoke()) { name = "combat-" + icon };
            b.AddToClassList("sf-hud__action");
            b.Add(Icons.Make(icon, 40f));
            var label = new Label { pickingMode = PickingMode.Ignore };
            label.AddToClassList("sf-hud__action-label");
            Strings.Bind(label, key);
            b.Add(label);
            _buttons.Add(b);
        }

        public Button EndTurnButton => _buttons.Q<Button>("combat-end_turn");

        /// <summary>The size of the panel the bars over heads are placed in (panel units).</summary>
        public Vector2 Area => _bars.layout.size;

        /// <summary>The player's action points (null while it is not their turn) and the last line of the fight.</summary>
        public void Status(string ap, string log)
        {
            _ap.text = ap ?? "";
            _ap.style.display = string.IsNullOrEmpty(ap) ? DisplayStyle.None : DisplayStyle.Flex;
            _log.text = log ?? "";
        }

        /// <summary>The buttons answer only on the player's turn.</summary>
        public void Mine(bool mine) => _buttons.SetEnabled(mine);

        /// <summary>The turn order (in order, the one acting marked) and the floating bars, placed by <paramref name="toPanel"/>
        /// (world to the panel's coordinates; null when off screen).</summary>
        public void Show(IReadOnlyList<Fighter> fighters, Func<Vector3, Vector2?> toPanel)
        {
            // the order
            while (_order.childCount < fighters.Count) _order.Add(Chip());
            for (var i = 0; i < _order.childCount; i++)
            {
                var chip = _order[i];
                if (i >= fighters.Count) { chip.style.display = DisplayStyle.None; continue; }
                var f = fighters[i];
                chip.style.display = DisplayStyle.Flex;
                chip.EnableInClassList("sf-combat__chip--current", f.Current);
                chip.EnableInClassList("sf-combat__chip--hostile", f.Hostile);
                chip.EnableInClassList("sf-combat__chip--player", f.Player);
                chip.EnableInClassList("sf-combat__chip--down", f.Down);
                chip.Q<Label>().text = Initials(f.Name);
                Fill(chip.Q<VisualElement>("fill"), f);
            }
            // the bars over their heads
            while (_floating.Count < fighters.Count)
            {
                var bar = new VisualElement { pickingMode = PickingMode.Ignore };
                bar.AddToClassList("sf-combat__float");
                var name = new Label { pickingMode = PickingMode.Ignore };
                name.AddToClassList("sf-combat__float-name");
                var track = new VisualElement { pickingMode = PickingMode.Ignore };
                track.AddToClassList("sf-hud__bar");
                var fill = new VisualElement { pickingMode = PickingMode.Ignore };
                fill.AddToClassList("sf-hud__fill");
                track.Add(fill); bar.Add(name); bar.Add(track);
                _bars.Add(bar);
                _floating.Add((bar, fill, name));
            }
            for (var i = 0; i < _floating.Count; i++)
            {
                var (bar, fill, name) = _floating[i];
                var at = i < fighters.Count && !fighters[i].Down ? toPanel(fighters[i].Over) : null;
                if (at == null) { bar.style.display = DisplayStyle.None; continue; }
                var f = fighters[i];
                bar.style.display = DisplayStyle.Flex;
                bar.style.left = at.Value.x - 60f; bar.style.top = at.Value.y - 34f;
                bar.EnableInClassList("sf-combat__float--hostile", f.Hostile);
                bar.EnableInClassList("sf-combat__float--current", f.Current);
                name.text = f.Player ? "" : f.Name;
                Fill(fill, f);
            }
        }

        private static void Fill(VisualElement fill, Fighter f)
        {
            var h = f.MaxHp > 0 ? Mathf.Clamp01(f.Hp / (float)f.MaxHp) : 0f;
            fill.style.width = Length.Percent(h * 100f);
            fill.EnableInClassList("sf-hud__fill--low", h < 0.5f && h >= 0.25f);
            fill.EnableInClassList("sf-hud__fill--critical", h < 0.25f);
        }

        private static VisualElement Chip()
        {
            var chip = new VisualElement { pickingMode = PickingMode.Ignore };
            chip.AddToClassList("sf-combat__chip");
            var l = new Label { pickingMode = PickingMode.Ignore };
            l.AddToClassList("sf-combat__chip-name");
            chip.Add(l);
            var track = new VisualElement { pickingMode = PickingMode.Ignore };
            track.AddToClassList("sf-hud__bar");
            var fill = new VisualElement { name = "fill", pickingMode = PickingMode.Ignore };
            fill.AddToClassList("sf-hud__fill");
            track.Add(fill);
            chip.Add(track);
            return chip;
        }

        private static string Initials(string name)
        {
            if (string.IsNullOrEmpty(name)) return "?";
            var parts = name.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            return parts.Length >= 2 ? $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[^1][0])}" : name.Substring(0, Math.Min(2, name.Length));
        }

        public void Close() => Root.RemoveFromHierarchy();
    }
}
