using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.Combat
{
    /// <summary>A unit's place in a fight as saved (its sheet and pack are the game's: saved with the game state).</summary>
    public sealed class BattleUnitSave
    {
        public string Id;
        public bool Hostile, Fled, Surrendered, Leader, Prisoner, Escaped, Fleeing, Hidden, Stunned, MinorUsed;
        public double PX, PZ, Morale, Evasion;
        public int Ap, IdleWatches;
        public string Stance, Archetype, Intent;
        public List<StatusEffect> Statuses = new();
        public List<string> Used = new();
        public WatchSave Watch;
    }

    public sealed class WatchSave
    {
        public string Mode; public double DirX, DirZ, HalfAngle = 180; public int Shots = 1; public string Target; public int Group; public bool Fired;
    }

    public sealed class PropSave { public string Id, Kind; public double X, Z; public int Hp; public bool Destroyed; }

    /// <summary>
    /// A fight as saved (BUILD_PLAN §6.I: "combat encounter if mid-fight"): the order and whose turn, the round, the dice,
    /// every unit's place, stance, statuses and held shot, the ground and the props. Versioned on its own line
    /// (<see cref="CurrentVersion"/>; <see cref="Migrate"/> upgrades older ones step by step, never editing a published
    /// step). The game does not save mid-fight yet (it saves just before one starts); this is the format it will use.
    /// </summary>
    public sealed class BattleSave
    {
        public const int CurrentVersion = 1;
        public int Version = CurrentVersion;
        public int Round, Index, Xp, RoundsWithoutHarm;
        public uint Rng;
        public bool Pit, Active, Harm;
        public string Difficulty, Current, Outcome;
        public List<string> Order = new();
        public List<BattleUnitSave> Units = new();
        public List<SurfaceSave> Surfaces = new();
        public List<PropSave> Props = new();

        /// <summary>Upgrades a saved fight to the current version (none yet: version 1 is the first).</summary>
        public static JObject Migrate(JObject raw)
        {
            var v = (int?)raw["Version"] ?? throw new InvalidDataException("Saved fight has no version");
            if (v > CurrentVersion) throw new InvalidDataException($"Saved fight is from a newer game ({v})");
            while (v < CurrentVersion)
            {
                switch (v)
                {
                    default: throw new InvalidDataException($"No migration from fight version {v}");
                }
            }
            return raw;
        }
    }

    public sealed partial class Battle
    {
        /// <summary>The fight as it stands, to save.</summary>
        public BattleSave Snapshot()
        {
            var s = new BattleSave
            {
                Round = Round, Index = _idx, Xp = XpEarned, RoundsWithoutHarm = RoundsWithoutHarm, Rng = Rng.State, Pit = Pit, Active = Active, Harm = _harm,
                Difficulty = _difficulty?.Id, Current = Current?.C.Id, Outcome = Outcome,
                Order = Order.Select(u => u.C.Id).ToList(), Surfaces = Surfaces.Save(),
                Props = Props.Select(p => new PropSave { Id = p.Id, Kind = p.Kind, X = p.X, Z = p.Z, Hp = p.Hp, Destroyed = p.Destroyed }).ToList(),
            };
            foreach (var u in Units)
                s.Units.Add(new BattleUnitSave
                {
                    Id = u.C.Id, Hostile = u.Hostile, Fled = u.Fled, Surrendered = u.Surrendered, Leader = u.Leader, Prisoner = u.Prisoner, Escaped = u.Escaped,
                    Fleeing = u.Fleeing, Hidden = u.Hidden, Stunned = u.C.Stunned, MinorUsed = u.C.MinorUsed, PX = u.PX, PZ = u.PZ, Morale = u.C.Morale,
                    Evasion = u.C.Evasion, Ap = u.C.Ap, IdleWatches = u.IdleWatches, Stance = u.C.Stance, Archetype = u.Archetype, Intent = u.Intent?.C.Id,
                    Statuses = u.C.Statuses.Select(x => new StatusEffect { Id = x.Id, Turns = x.Turns, Power = x.Power, From = x.From, Fresh = x.Fresh }).ToList(),
                    Used = u.C.Used.OrderBy(x => x, StringComparer.Ordinal).ToList(),
                    Watch = u.Watch == null ? null : new WatchSave { Mode = u.Watch.Mode, DirX = u.Watch.DirX, DirZ = u.Watch.DirZ, HalfAngle = u.Watch.HalfAngle, Shots = u.Watch.Shots, Target = u.Watch.Target?.C.Id, Group = u.Watch.Group, Fired = u.Watch.Fired },
                });
            return s;
        }

        /// <summary>Puts a saved fight back: the units are the game's own (their sheets and packs come from the saved game),
        /// found by id; everything the fight itself held is restored onto them.</summary>
        public void Restore(BattleSave s, IEnumerable<BattleUnit> units)
        {
            if (s == null) throw new ArgumentNullException(nameof(s));
            if (s.Version > BattleSave.CurrentVersion) throw new InvalidDataException($"Saved fight is from a newer game ({s.Version})");
            var byId = units.ToDictionary(u => u.C.Id);
            Units.Clear();
            foreach (var us in s.Units)
            {
                if (!byId.TryGetValue(us.Id, out var u)) throw new InvalidDataException($"Saved fight names {us.Id}, who is not in the game");
                u.Hostile = us.Hostile; u.Fled = us.Fled; u.Surrendered = us.Surrendered; u.Leader = us.Leader; u.Prisoner = us.Prisoner; u.Escaped = us.Escaped;
                u.Fleeing = us.Fleeing; u.Hidden = us.Hidden; u.C.Stunned = us.Stunned; u.C.MinorUsed = us.MinorUsed; u.Place(us.PX, us.PZ);
                u.C.Morale = us.Morale; u.C.Evasion = us.Evasion; u.C.Ap = us.Ap; u.IdleWatches = us.IdleWatches; u.C.Stance = us.Stance ?? Stances.Stand; u.Archetype = us.Archetype;
                u.C.Statuses = us.Statuses?.Select(x => new StatusEffect { Id = x.Id, Turns = x.Turns, Power = x.Power, From = x.From, Fresh = x.Fresh }).ToList() ?? new List<StatusEffect>();
                u.C.Used = new HashSet<string>(us.Used ?? new List<string>());
                Units.Add(u);
            }
            foreach (var us in s.Units)
            {
                var u = byId[us.Id];
                u.Intent = us.Intent != null && byId.TryGetValue(us.Intent, out var it) ? it : null;
                u.Watch = us.Watch == null ? null : new Watch { Mode = us.Watch.Mode, DirX = us.Watch.DirX, DirZ = us.Watch.DirZ, HalfAngle = us.Watch.HalfAngle, Shots = us.Watch.Shots, Target = us.Watch.Target != null && byId.TryGetValue(us.Watch.Target, out var t) ? t : null, Group = us.Watch.Group, Fired = us.Watch.Fired };
            }
            Order = s.Order.Select(id => byId[id]).ToList();
            Round = s.Round; _idx = s.Index; XpEarned = s.Xp; RoundsWithoutHarm = s.RoundsWithoutHarm; Rng.State = s.Rng; Pit = s.Pit; Active = s.Active; Outcome = s.Outcome; _harm = s.Harm;
            if (s.Difficulty != null) Difficulty = CombatDifficulty.For(s.Difficulty);
            Current = s.Current != null && byId.TryGetValue(s.Current, out var cur) ? cur : null;
            if (Current != null) Current.C.InTurn = true;
            Surfaces.Load(s.Surfaces);
            Props.Clear();
            foreach (var p in s.Props) Props.Add(new BattleProp { Id = p.Id, Kind = p.Kind, X = p.X, Z = p.Z, Hp = p.Hp, Destroyed = p.Destroyed });
            _dead.Clear();
            foreach (var u in Units) if (!u.Alive) _dead.Add(u);
            ClearCaches();
        }
    }
}
