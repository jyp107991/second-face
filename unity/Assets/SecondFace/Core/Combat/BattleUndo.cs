using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.Combat
{
    /// <summary>
    /// A walk that may be taken back (COMBAT.md B8, DESIGN_UNITY §5.2 "undo for a move that has not been seen"): the
    /// fight as it stood before it (<see cref="Battle.Snapshot"/>), and why it can no longer be undone, if it cannot.
    /// </summary>
    public sealed class MoveUndo
    {
        public BattleUnit Unit;
        public BattleSave Before;
        /// <summary>Where the unit stood before the walk.</summary>
        public double X, Z;
        internal uint Rng;
        internal int Log, History, Round;
        internal BattleUnit Current;
        /// <summary>Why it cannot be undone (null: it can): <c>seen</c> (someone of the other side saw the walk),
        /// <c>shot</c> (a held shot answered it), <c>ground</c> (fire, chem, current or water acted on it), <c>dice</c>
        /// (anything rolled), <c>away</c> (it left the fight), <c>turn</c> (the turn has moved on, or the fight).</summary>
        public string Blocked;
        public bool Undoable => Blocked == null;
    }

    public sealed partial class Battle
    {
        /// <summary>The fight as it stands before a walk (call before <see cref="Moved"/>).</summary>
        public MoveUndo BeginMove(BattleUnit u) => new()
        {
            Unit = u, Before = Snapshot(), X = u.PX, Z = u.PZ, Rng = Rng.State, Log = Log.Count, History = History.Count, Round = Round, Current = Current,
        };

        /// <summary>After the walk (<see cref="Moved"/>'s outcome and the path it took): whether it may be undone. Nobody of
        /// the other side who is still in the fight may have seen any point of it (every 0.75 m and its end; hidden
        /// ambushers too: they saw it), no held shot fired, the ground did nothing, no dice were rolled.</summary>
        public MoveUndo EndMove(MoveUndo m, MoveOutcome o, IReadOnlyList<(double X, double Z)> path = null)
        {
            if (m == null) return null;
            if (o != null && o.Reactions.Count > 0) m.Blocked = "shot";
            else if (o != null && o.Entered.Count > 0) m.Blocked = "ground";
            else if (o != null && o.Escaped) m.Blocked = "away";
            else if (Rng.State != m.Rng) m.Blocked = "dice";
            else if (SeenOnTheWay(m.Unit, path ?? new[] { (m.X, m.Z), (m.Unit.PX, m.Unit.PZ) })) m.Blocked = "seen";
            return m;
        }

        /// <summary>Whether anyone of the other side still in the fight sees the unit at any point of a walk.</summary>
        public bool SeenOnTheWay(BattleUnit u, IReadOnlyList<(double X, double Z)> path)
        {
            var foes = Units.Where(o => o.InFight && !o.Surrendered && o.Hostile != u.Hostile).ToList();
            if (foes.Count == 0) return false;
            var seen = false;
            foreach (var f in foes) if (SeesPoint(f, u.PX, u.PZ)) return true;
            SurfaceGrid.ForEachStep(path, 0.75, (x, z, step) =>
            {
                foreach (var f in foes) if (SeesPoint(f, x, z)) { seen = true; return false; }
                return true;
            });
            return seen;
        }

        /// <summary>Whether a walk can still be undone now: it could when made, it is still that unit's turn and nothing
        /// has happened since (no line said, no shot, no roll).</summary>
        public bool CanUndo(MoveUndo m) =>
            m != null && m.Undoable && Active && Current == m.Unit && m.Current == m.Unit && Round == m.Round
            && Rng.State == m.Rng && History.Count == m.History && Units.Select(u => u.C.Id).Distinct().Count() == Units.Count;

        /// <summary>Takes a walk back (B8): the fight as it was before it (AP, places, stances, statuses, held shots), the
        /// lines it added unsaid. False (and nothing changed) when it cannot be (<see cref="CanUndo"/>).</summary>
        public bool Undo(MoveUndo m)
        {
            if (!CanUndo(m)) return false;
            Restore(m.Before, Units.ToList());
            if (Log.Count > m.Log) Log.RemoveRange(m.Log, Log.Count - m.Log);
            m.Blocked = "turn";
            return true;
        }
    }
}
