using SecondFace.Core.State;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The world clock (BUILD_PLAN §6.A.6): game minutes since the start of day 1, advanced by real time while the game
    /// runs (a day in 24 real minutes by default; travel and rest move it in jumps). Nothing in the world waits on it
    /// with a deadline (CLAUDE.md §2): it drives the light, the weather and who is where.
    /// </summary>
    public sealed class TimeService : MonoBehaviour
    {
        /// <summary>Game minutes per real second (1: a day in 24 minutes).</summary>
        public float MinutesPerSecond = 1f;
        public double Minutes = Clock.StartMinutes;
        public bool Paused;
        /// <summary>The save's seed for the weather (the same day in the same save has the same sky).</summary>
        public int Seed;

        public double Hour => Clock.HourOf(Minutes);
        public int Day => Clock.DayOf(Minutes);

        /// <summary>Sets the clock to an hour of the current day (tests, captures, rest until).</summary>
        public void SetHour(double hour) => Minutes = (Day - 1) * 1440.0 + hour * 60.0;

        private void Update()
        {
            if (!Paused) Minutes += Time.deltaTime * MinutesPerSecond;
        }
    }
}
