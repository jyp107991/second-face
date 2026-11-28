using Unity.Mathematics;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Unity's own vector, quaternion and Mathf arithmetic as the arm clearance uses it, written for Burst (the clearance's step
    /// as one job a person, <see cref="ArmClearance"/>): term for term where Unity's is C# (Vector3's and Quaternion's operators,
    /// Dot, Cross, Angle, ProjectOnPlane, Mathf), Mathf's double-precision calls in double, and Unity's native ones (AngleAxis,
    /// FromToRotation, Slerp, ToAngleAxis, RotateTowards, Inverse) by the same formulas, which round apart from the engine's in the
    /// last bits only. FloatMode.Strict in the job keeps every product and sum as written.
    /// </summary>
    public static class CM
    {
        public const float Deg2Rad = 0.0174532924f, Rad2Deg = 57.29578f, Epsilon = 1.401298E-45f, kEpsilon = 1E-05f, kEpsilonNormalSqrt = 1E-15f;

        // ---- Mathf
        public static float Abs(float f) => math.abs(f);
        public static float Min(float a, float b) => a < b ? a : b;
        public static float Max(float a, float b) => a > b ? a : b;
        public static float Sign(float f) => f >= 0f ? 1f : -1f;
        public static float Clamp(float v, float lo, float hi) { if (v < lo) v = lo; else if (v > hi) v = hi; return v; }
        public static float Clamp01(float v) { if (v < 0f) return 0f; if (v > 1f) return 1f; return v; }
        public static float Lerp(float a, float b, float t) => a + (b - a) * Clamp01(t);
        public static float InverseLerp(float a, float b, float v) => a != b ? Clamp01((v - a) / (b - a)) : 0f;
        public static float SmoothStep(float from, float to, float t) { t = Clamp01(t); t = -2f * t * t * t + 3f * t * t; return to * t + from * (1f - t); }
        public static float MoveTowards(float current, float target, float maxDelta) => Abs(target - current) <= maxDelta ? target : current + Sign(target - current) * maxDelta;
        public static float Sqrt(float f) => (float)math.sqrt((double)f);
        public static float Sin(float f) => (float)math.sin((double)f);
        public static float Cos(float f) => (float)math.cos((double)f);
        public static float Atan2(float y, float x) => (float)math.atan2((double)y, (double)x);
        public static float Asin(float f) => (float)math.asin((double)f);
        public static float Acos(float f) => (float)math.acos((double)f);
        public static float Atan(float f) => (float)math.atan((double)f);
        public static float Exp(float f) => (float)math.exp((double)f);

        // ---- Vector3
        public static float3 V(float x, float y, float z) => new(x, y, z);
        public static float3 Add(float3 a, float3 b) => new(a.x + b.x, a.y + b.y, a.z + b.z);
        public static float3 Sub(float3 a, float3 b) => new(a.x - b.x, a.y - b.y, a.z - b.z);
        public static float3 Neg(float3 a) => new(-a.x, -a.y, -a.z);
        public static float3 Mul(float3 a, float d) => new(a.x * d, a.y * d, a.z * d);
        public static float3 Div(float3 a, float d) => new(a.x / d, a.y / d, a.z / d);
        public static float Dot(float3 a, float3 b) => a.x * b.x + a.y * b.y + a.z * b.z;
        public static float3 Cross(float3 a, float3 b) => new(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
        public static float SqrMag(float3 v) => v.x * v.x + v.y * v.y + v.z * v.z;
        public static float Mag(float3 v) => (float)math.sqrt((double)(v.x * v.x + v.y * v.y + v.z * v.z));
        public static float3 Norm(float3 v) { var m = Mag(v); return m > kEpsilon ? Div(v, m) : float3.zero; }
        public static bool IsZero(float3 v) => SqrMag(Sub(v, float3.zero)) < 9.99999944E-11f;   // (Vector3's ==: the difference's square under 1e-10)
        public static float Angle(float3 from, float3 to)
        {
            var den = (float)math.sqrt((double)(SqrMag(from) * SqrMag(to)));
            if (den < kEpsilonNormalSqrt) return 0f;
            var dot = Clamp(Dot(from, to) / den, -1f, 1f);
            return (float)math.acos((double)dot) * Rad2Deg;
        }
        public static float SignedAngle(float3 from, float3 to, float3 axis)
        {
            var u = Angle(from, to);
            var cx = from.y * to.z - from.z * to.y; var cy = from.z * to.x - from.x * to.z; var cz = from.x * to.y - from.y * to.x;
            return u * Sign(axis.x * cx + axis.y * cy + axis.z * cz);
        }
        public static float3 ProjectOnPlane(float3 v, float3 n)
        {
            var sq = Dot(n, n);
            if (sq < Epsilon) return v;
            var d = Dot(v, n);
            return new float3(v.x - n.x * d / sq, v.y - n.y * d / sq, v.z - n.z * d / sq);
        }
        public static float3 MoveTowardsV(float3 current, float3 target, float maxDelta)
        {
            var tx = target.x - current.x; var ty = target.y - current.y; var tz = target.z - current.z;
            var sq = tx * tx + ty * ty + tz * tz;
            if (sq == 0f || (maxDelta >= 0f && sq <= maxDelta * maxDelta)) return target;
            var dist = (float)math.sqrt((double)sq);
            return new float3(current.x + tx / dist * maxDelta, current.y + ty / dist * maxDelta, current.z + tz / dist * maxDelta);
        }
        private static float ClampedMove(float lhs, float rhs, float clampedDelta)
        {
            var delta = rhs - lhs;
            return delta > 0f ? lhs + math.min(delta, clampedDelta) : lhs - math.min(-delta, clampedDelta);
        }
        /// <summary>Vector3.RotateTowards (the engine's: through an axis-angle matrix).</summary>
        public static float3 RotateTowards(float3 lhs, float3 rhs, float angleMove, float magnitudeMove)
        {
            var lm = math.sqrt(SqrMag(lhs)); var rm = math.sqrt(SqrMag(rhs));
            if (lm > kEpsilon && rm > kEpsilon)
            {
                var ln = lhs / lm; var rn = rhs / rm;
                var dot = Dot(ln, rn);
                if (dot > 1f - kEpsilon) return MoveTowardsV(lhs, rhs, magnitudeMove);
                float3 axis; float ang;
                if (dot < -1f + kEpsilon) { axis = OrthoNormalFast(ln); ang = angleMove; }
                else { ang = math.min(angleMove, math.acos(dot)); axis = math.normalize(Cross(ln, rn)); }
                var r = AxisAngleRotate(axis, ang, ln);
                return r * ClampedMove(lm, rm, magnitudeMove);
            }
            return MoveTowardsV(lhs, rhs, magnitudeMove);
        }
        private static float3 OrthoNormalFast(float3 n)
        {
            const float k1OverSqrt2 = 0.7071067811865475244f;
            if (math.abs(n.z) > k1OverSqrt2)
            {
                var a = n.y * n.y + n.z * n.z; var k = 1f / math.sqrt(a);
                return new float3(0f, -n.z * k, n.y * k);
            }
            else
            {
                var a = n.x * n.x + n.y * n.y; var k = 1f / math.sqrt(a);
                return new float3(-n.y * k, n.x * k, 0f);
            }
        }
        private static float3 AxisAngleRotate(float3 axis, float angle, float3 v)
        {
            var s = math.sin(angle); var c = math.cos(angle);
            float vx = axis.x, vy = axis.y, vz = axis.z;
            var xx = vx * vx; var yy = vy * vy; var zz = vz * vz; var xy = vx * vy; var yz = vy * vz; var zx = vz * vx;
            var xs = vx * s; var ys = vy * s; var zs = vz * s; var oc = 1f - c;
            var m00 = oc * xx + c; var m01 = oc * xy - zs; var m02 = oc * zx + ys;
            var m10 = oc * xy + zs; var m11 = oc * yy + c; var m12 = oc * yz - xs;
            var m20 = oc * zx - ys; var m21 = oc * yz + xs; var m22 = oc * zz + c;
            return new float3(m00 * v.x + m01 * v.y + m02 * v.z, m10 * v.x + m11 * v.y + m12 * v.z, m20 * v.x + m21 * v.y + m22 * v.z);
        }

        // ---- Quaternion (x, y, z, w)
        public static readonly float4 Identity = new(0f, 0f, 0f, 1f);
        public static float4 QMul(float4 l, float4 r) => new(
            l.w * r.x + l.x * r.w + l.y * r.z - l.z * r.y,
            l.w * r.y + l.y * r.w + l.z * r.x - l.x * r.z,
            l.w * r.z + l.z * r.w + l.x * r.y - l.y * r.x,
            l.w * r.w - l.x * r.x - l.y * r.y - l.z * r.z);
        public static float3 Rotate(float4 q, float3 p)
        {
            var num = q.x * 2f; var num2 = q.y * 2f; var num3 = q.z * 2f;
            var num4 = q.x * num; var num5 = q.y * num2; var num6 = q.z * num3;
            var num7 = q.x * num2; var num8 = q.x * num3; var num9 = q.y * num3;
            var num10 = q.w * num; var num11 = q.w * num2; var num12 = q.w * num3;
            return new float3(
                (1f - (num5 + num6)) * p.x + (num7 - num12) * p.y + (num8 + num11) * p.z,
                (num7 + num12) * p.x + (1f - (num4 + num6)) * p.y + (num9 - num10) * p.z,
                (num8 - num11) * p.x + (num9 + num10) * p.y + (1f - (num4 + num5)) * p.z);
        }
        public static float QDot(float4 a, float4 b) => a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
        public static float4 Inverse(float4 q) => new(-q.x, -q.y, -q.z, q.w);
        public static float4 QNormalize(float4 q)
        {
            var mag = (float)math.sqrt((double)QDot(q, q));
            return mag < Epsilon ? Identity : new float4(q.x / mag, q.y / mag, q.z / mag, q.w / mag);
        }
        /// <summary>Quaternion.AngleAxis (degrees; the axis normalised; identity for an axis under 1e-6).</summary>
        public static float4 AngleAxis(float degrees, float3 axis)
        {
            var mag = math.sqrt(SqrMag(axis));
            if (!(mag > 1E-06f)) return Identity;
            var a = axis / mag;
            var half = degrees * Deg2Rad * 0.5f;
            var s = math.sin(half);
            return new float4(a.x * s, a.y * s, a.z * s, math.cos(half));
        }
        /// <summary>Quaternion.FromToRotation (the least rotation; identity for a zero vector).</summary>
        public static float4 FromToRotation(float3 from, float3 to)
        {
            var lm = math.sqrt(SqrMag(from)); var rm = math.sqrt(SqrMag(to));
            if (lm < kEpsilon || rm < kEpsilon) return Identity;
            var f = from / lm; var t = to / rm;
            var e = Dot(f, t);
            if (e > 1f - 1E-06f) return Identity;
            if (e < -1f + 1E-06f)
            {
                // half a turn about any axis square to the vector
                var ax = Cross(new float3(1f, 0f, 0f), f);
                if (SqrMag(ax) < 1E-06f) ax = Cross(new float3(0f, 1f, 0f), f);
                ax = math.normalize(ax);
                return new float4(ax.x, ax.y, ax.z, 0f);
            }
            var c = Cross(f, t);
            var s = math.sqrt((1f + e) * 2f);
            var inv = 1f / s;
            return QNormalize(new float4(c.x * inv, c.y * inv, c.z * inv, s * 0.5f));
        }
        /// <summary>Quaternion.Slerp (t clamped to 0..1; the short way; near-parallel by a normalised lerp).</summary>
        public static float4 Slerp(float4 a, float4 b, float t)
        {
            t = Clamp01(t);
            var dot = QDot(a, b);
            if (dot < 0f) { dot = -dot; b = -b; }
            if (dot < 0.95f)
            {
                var angle = math.acos(dot);
                var sinadiv = 1f / math.sin(angle);
                var sinat = math.sin(angle * t);
                var sinaomt = math.sin(angle * (1f - t));
                return (a * sinaomt + b * sinat) * sinadiv;
            }
            var l = new float4(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, a.w + (b.w - a.w) * t);
            return QNormalize(l);
        }
        /// <summary>Quaternion.ToAngleAxis (degrees; the x axis for no turn).</summary>
        public static void ToAngleAxis(float4 q, out float degrees, out float3 axis)
        {
            q = QNormalize(q);
            var w = Clamp(q.w, -1f, 1f);
            var angle = 2f * math.acos(w);
            if (math.abs(angle) <= 1E-06f) { axis = new float3(1f, 0f, 0f); degrees = angle * Rad2Deg; return; }
            var div = 1f / math.sqrt(1f - w * w);
            axis = new float3(q.x * div, q.y * div, q.z * div);
            degrees = angle * Rad2Deg;
        }
        public static float QAngle(float4 a, float4 b)
        {
            var dot = math.min(math.abs(QDot(a, b)), 1f);
            return dot > 0.999999f ? 0f : (float)math.acos((double)dot) * 2f * Rad2Deg;
        }

        // ---- Matrix4x4 (float4x4, columns c0..c3), as Unity's MultiplyPoint3x4 / MultiplyVector and operator *
        public static float3 Point(in float4x4 m, float3 v) => new(
            m.c0.x * v.x + m.c1.x * v.y + m.c2.x * v.z + m.c3.x,
            m.c0.y * v.x + m.c1.y * v.y + m.c2.y * v.z + m.c3.y,
            m.c0.z * v.x + m.c1.z * v.y + m.c2.z * v.z + m.c3.z);
        public static float3 Vec(in float4x4 m, float3 v) => new(
            m.c0.x * v.x + m.c1.x * v.y + m.c2.x * v.z,
            m.c0.y * v.x + m.c1.y * v.y + m.c2.y * v.z,
            m.c0.z * v.x + m.c1.z * v.y + m.c2.z * v.z);
        private static float4 Col(in float4x4 l, float4 rc) => new(
            l.c0.x * rc.x + l.c1.x * rc.y + l.c2.x * rc.z + l.c3.x * rc.w,
            l.c0.y * rc.x + l.c1.y * rc.y + l.c2.y * rc.z + l.c3.y * rc.w,
            l.c0.z * rc.x + l.c1.z * rc.y + l.c2.z * rc.z + l.c3.z * rc.w,
            l.c0.w * rc.x + l.c1.w * rc.y + l.c2.w * rc.z + l.c3.w * rc.w);
        public static float4x4 MatMul(in float4x4 l, in float4x4 r) => new(Col(l, r.c0), Col(l, r.c1), Col(l, r.c2), Col(l, r.c3));
        /// <summary>Matrix4x4.TRS.</summary>
        public static float4x4 TRS(float3 t, float4 q, float3 s)
        {
            float x = q.x * 2f, y = q.y * 2f, z = q.z * 2f;
            float xx = q.x * x, yy = q.y * y, zz = q.z * z, xy = q.x * y, xz = q.x * z, yz = q.y * z, wx = q.w * x, wy = q.w * y, wz = q.w * z;
            return new float4x4(
                new float4((1f - (yy + zz)) * s.x, (xy + wz) * s.x, (xz - wy) * s.x, 0f),
                new float4((xy - wz) * s.y, (1f - (xx + zz)) * s.y, (yz + wx) * s.y, 0f),
                new float4((xz + wy) * s.z, (yz - wx) * s.z, (1f - (xx + yy)) * s.z, 0f),
                new float4(t.x, t.y, t.z, 1f));
        }
    }
}
