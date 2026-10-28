namespace SecondFace.Core
{
    /// <summary>Number helpers that behave like the JavaScript engine's (so ported rules give the same results).</summary>
    public static class Num
    {
        /// <summary>JavaScript Math.round: halves round toward +∞ (C#'s default rounds halves to even).</summary>
        public static double Round(double x) => System.Math.Floor(x + 0.5);
        public static int RoundInt(double x) => (int)System.Math.Floor(x + 0.5);
        public static double Clamp(double v, double lo, double hi) => v < lo ? lo : v > hi ? hi : v;
        public static int Clamp(int v, int lo, int hi) => v < lo ? lo : v > hi ? hi : v;
    }
}
