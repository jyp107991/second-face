using System;
using System.Collections.Generic;

namespace SecondFace.Core.Combat
{
    /// <summary>How a fighter holds their body (COMBAT.md C2; DESIGN_UNITY §5.2): standing, crouched (a smaller target,
    /// slower, half cover counts as full), prone (hard to hit from afar, easy prey up close, crawling).</summary>
    public static class Stances
    {
        public const string Stand = "stand", Crouch = "crouch", Prone = "prone";

        /// <summary>The move's AP cost multiplier in a stance (a crouch is a third slower, a crawl half the pace).</summary>
        public static double MoveMul(string stance) => stance == Crouch ? 1.5 : stance == Prone ? 2.0 : 1.0;

        /// <summary>AP to change from one stance to another: the turn's free minor action covers one change, except
        /// getting up from prone (1 AP always, the minor action or not).</summary>
        public static int ChangeAp(string from, string to, bool minorFree) => from == to ? 0 : from == Prone ? 1 : minorFree ? 0 : 1;
    }

    /// <summary>A piece of cover next to a standing point: the direction from the point to it (unit vector on the
    /// ground) and how high it stands (half: waist high, full: over the head).</summary>
    public struct CoverPiece
    {
        public double DX, DZ;
        public string Level;
        public CoverPiece(double dx, double dz, string level) { var l = Math.Sqrt(dx * dx + dz * dz); DX = l > 1e-9 ? dx / l : 0; DZ = l > 1e-9 ? dz / l : 0; Level = level; }
    }

    /// <summary>
    /// What the world can say about its own shape (an extension of <see cref="IBattleField"/>; the Unity side answers from
    /// the NavMesh and raycasts, the synthetic <see cref="GridField"/> from its grid). A field without it still fights:
    /// the battle falls back to <see cref="IBattleField.Cover"/>, flat ground, straight walks and no exits.
    /// </summary>
    public interface IBattleGeometry
    {
        /// <summary>The ground's height at a point (metres).</summary>
        double Height(double x, double z);
        /// <summary>The cover pieces next to a point (within about a metre): their directions and heights. Empty in the
        /// open. The battle decides which apply against an attacker (the cover's arc; <see cref="Tactics.CoverArcCos"/>).</summary>
        IReadOnlyList<CoverPiece> CoverAround(double x, double z);
        /// <summary>The walk from the unit to a point as its corners (the unit's own point first); empty when it cannot
        /// be walked.</summary>
        IReadOnlyList<(double X, double Z)> Path(BattleUnit u, double x, double z);
        /// <summary>Whether an eye standing at (ax, az) sees a body standing at (bx, bz).</summary>
        bool SightBetween(double ax, double az, double bx, double bz);
        /// <summary>The ground's kind at a point for the surfaces (null for plain ground; "scrub", "water", "metal").</summary>
        string GroundAt(double x, double z);
        /// <summary>Where a unit may leave the fight (a door, the map's edge, the road out); empty when nowhere.</summary>
        IReadOnlyList<(double X, double Z)> Exits(BattleUnit u);
    }

    /// <summary>The cover a defender standing somewhere has against an attacker standing somewhere (before stances).</summary>
    public struct CoverState
    {
        /// <summary>none, half or full, against this attacker (a flanked defender has none).</summary>
        public string Level;
        /// <summary>There is cover by the defender but none of it faces this attacker.</summary>
        public bool Flanked;
        /// <summary>The attacker stands at least <see cref="Tactics.HighGround"/> above the defender.</summary>
        public bool HighGround;
        /// <summary>Attacker's ground minus the defender's (metres).</summary>
        public double Height;
        /// <summary>The defender has any cover by them at all.</summary>
        public bool AnyCover;
        public bool Open => Level == "none";
    }

    /// <summary>The geometry rules (COMBAT.md C1): cover arcs, flanking, height.</summary>
    public static class Tactics
    {
        /// <summary>A cover piece protects against attackers within 60° of the direction it lies in.</summary>
        public const double CoverArcCos = 0.5;
        /// <summary>Metres above a target that make high ground (aim bonus; low cover denied).</summary>
        public const double HighGround = 1.5;
        /// <summary>Within this distance cover does not count (point blank, over the wall).</summary>
        public const double PointBlank = 1.6;
        public const int HighGroundAim = 10;
        public const int FlankCrit = 15;
        public const int ReactionPenalty = 15;
        public const int SmokePenalty = 20;
        public const int ObstructedPenalty = 15;

        public static int CoverRank(string level) => level == "full" ? 2 : level == "half" ? 1 : 0;
        public static string Better(string a, string b) => CoverRank(a) >= CoverRank(b) ? a : b;

        /// <summary>The cover the pieces give against an attacker in direction (ax, az) from the defender (not normalised).</summary>
        public static CoverState FromPieces(IReadOnlyList<CoverPiece> pieces, double ax, double az, double height)
        {
            var st = new CoverState { Level = "none", Height = height, HighGround = height >= HighGround };
            var len = Math.Sqrt(ax * ax + az * az);
            if (pieces == null || pieces.Count == 0) return st;
            st.AnyCover = true;
            if (len < PointBlank) return st;
            double dx = ax / len, dz = az / len;
            foreach (var p in pieces)
                if (p.DX * dx + p.DZ * dz >= CoverArcCos) st.Level = Better(st.Level, p.Level);
            st.Flanked = st.Level == "none";
            return st;
        }

        /// <summary>Distance from point p to the segment a-b, and how far along it (0..1) the nearest point lies.</summary>
        public static double SegmentDistance(double ax, double az, double bx, double bz, double px, double pz, out double t)
        {
            double vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
            t = l2 < 1e-12 ? 0 : Math.Max(0, Math.Min(1, ((px - ax) * vx + (pz - az) * vz) / l2));
            double cx = ax + vx * t - px, cz = az + vz * t - pz;
            return Math.Sqrt(cx * cx + cz * cz);
        }

        public static double Dist(double ax, double az, double bx, double bz) => Math.Sqrt((ax - bx) * (ax - bx) + (az - bz) * (az - bz));

        /// <summary>The cosine of the angle between a cone's direction and the direction to a point.</summary>
        public static bool InCone(double ox, double oz, double dirX, double dirZ, double halfAngleDeg, double px, double pz)
        {
            if (halfAngleDeg >= 180) return true;
            double vx = px - ox, vz = pz - oz, l = Math.Sqrt(vx * vx + vz * vz), dl = Math.Sqrt(dirX * dirX + dirZ * dirZ);
            if (l < 1e-6 || dl < 1e-9) return true;
            return (vx * dirX + vz * dirZ) / (l * dl) >= Math.Cos(halfAngleDeg * Math.PI / 180);
        }
    }

    /// <summary>One term of a hit chance, for the UI to list (COMBAT.md B3): a key the strings table names
    /// (<c>combat.reason.&lt;key&gt;</c>), its points and a short note (the cover's level, the range in metres).</summary>
    public sealed class HitReason
    {
        public string Key;
        public int Value;
        public string Note;
        public override string ToString() => $"{Key} {(Value >= 0 ? "+" : "")}{Value}{(Note != null ? " (" + Note + ")" : "")}";
    }

    /// <summary>A hit chance with its reasons (the terms add up to <see cref="Raw"/>; the chance is it clamped 5–95).</summary>
    public sealed class HitBreakdown
    {
        public int Chance;
        public double Raw;
        /// <summary>The cover that counted: none, half or full (after flanking, height and stance).</summary>
        public string Cover = "none";
        public bool Flanked, HighGround, Melee, OutOfReach;
        public int Crit;
        public readonly List<HitReason> Reasons = new();
        public int Of(string key) { var s = 0; foreach (var r in Reasons) if (r.Key == key) s += r.Value; return s; }
        public bool Has(string key) { foreach (var r in Reasons) if (r.Key == key) return true; return false; }
        public override string ToString() => $"{Chance}%: " + string.Join(", ", Reasons);
    }

    /// <summary>What a shot would be (COMBAT.md B3; <see cref="Battle.Preview(BattleUnit, BattleUnit, ShotOptions)"/>):
    /// whether it can be taken and why not, the hit chance with its reasons, the damage range per hit after the
    /// target's armour, the rounds, the critical chance and the AP.</summary>
    public sealed class ShotPreview
    {
        public bool Ok;
        public string Reason;
        public int Chance;
        public int Ap;
        public int DamageMin, DamageMax, CritMax;
        public int Rounds = 1;
        public int Crit;
        public HitBreakdown Hit;
        /// <summary>Someone of the attacker's own side in the line of fire (a miss may strike them).</summary>
        public BattleUnit InTheWay;
        /// <summary>The defender's side has someone ready to answer this attack (cover fire).</summary>
        public List<BattleUnit> Answered = new();
        /// <summary>The chance this attack downs the target (rough: hit × the share of the damage range that kills).</summary>
        public double KillChance;
        public double Expected;
    }

    /// <summary>How a shot is taken (the radial's choice).</summary>
    public sealed class ShotOptions
    {
        /// <summary>A body part (head, eyes, torso, armL, armR, legL, legR, groin) or "weapon"; null for a snap shot.</summary>
        public string Aimed;
        public bool Burst;
        /// <summary>Preview the shot from another standing point (the path preview's end tile).</summary>
        public double? FromX, FromZ;
        public static readonly ShotOptions Snap = new();
    }
}
