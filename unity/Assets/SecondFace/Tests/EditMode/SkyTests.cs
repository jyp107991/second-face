using System;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>The day and the weather as numbers (BUILD_PLAN §6.A.6): the sun's path, a look that changes smoothly
    /// minute by minute, a night that stays readable, weather fixed by region and day, in spells, by climate.</summary>
    public class SkyTests
    {
        [Test]
        public void TheSunRisesAboutHalfPastFiveIsHighAtNoonInTheSouthAndSetsAboutHalfPastSix()
        {
            double Cross(double from, double to)
            {
                for (var h = from; h < to; h += 1 / 60.0)
                    if (Math.Sign(Sky.Sun(h).elevation) != Math.Sign(Sky.Sun(h + 1 / 60.0).elevation)) return h;
                return double.NaN;
            }
            var rise = Cross(3, 9); var set = Cross(15, 21);
            TestContext.WriteLine($"sunrise {rise:0.00} h, sunset {set:0.00} h, noon {Sky.Sun(12).elevation:0.0}° at {Sky.Sun(12).azimuth:0}°");
            Assert.That(rise, Is.InRange(5.0, 6.0));
            Assert.That(set, Is.InRange(18.0, 19.0));
            Assert.That(Sky.Sun(12).elevation, Is.EqualTo(90 - Sky.Latitude + Sky.Declination).Within(0.1));
            Assert.That(Sky.Sun(12).azimuth, Is.EqualTo(180).Within(1), "noon sun in the south");
            Assert.That(Sky.Sun(9).azimuth, Is.LessThan(180), "morning sun in the east");
            Assert.That(Sky.Sun(15).azimuth, Is.GreaterThan(180), "afternoon sun in the west");
            Assert.That(Sky.Sun(0).elevation, Is.LessThan(-20));
        }

        [Test]
        public void TheLookChangesSmoothlyMinuteByMinute()
        {
            foreach (var w in Weather.Kinds)
            {
                var prev = Sky.At(0, w);
                for (var m = 1; m <= 24 * 60; m++)
                {
                    var l = Sky.At(m / 60.0, w);
                    foreach (var (a, b, what) in new[] { (prev.Zenith, l.Zenith, "zenith"), (prev.Horizon, l.Horizon, "horizon"), (prev.AmbientSky, l.AmbientSky, "ambient"), (prev.Fog, l.Fog, "fog"), (prev.LightColour * prev.LightIntensity * 0.5f, l.LightColour * l.LightIntensity * 0.5f, "light") })
                        // dawn and dusk move fastest: 0.04 a game minute is 0.004 an update at the default clock
                        Assert.That(a.MaxDiff(b), Is.LessThan(0.04f), $"{w} {what} jumps at {m / 60.0:0.00} h");
                    Assert.That(Math.Abs(l.LightIntensity - prev.LightIntensity), Is.LessThan(0.05f), $"{w} intensity jumps at {m / 60.0:0.00} h");
                    // the light may turn (sun to moon) only while it is nearly off
                    var turn = l.LightX * prev.LightX + l.LightY * prev.LightY + l.LightZ * prev.LightZ;
                    if (turn < 0.999f) Assert.That(Math.Min(l.LightIntensity, prev.LightIntensity), Is.LessThan(0.15f), $"{w} light turns while bright at {m / 60.0:0.00} h");
                    prev = l;
                }
            }
        }

        [Test]
        public void TheNightIsBlueAndReadableTheDayIsLitAndAStormIsDarkerAndCloser()
        {
            var night = Sky.At(0, WeatherKind.Clear);
            var day = Sky.At(13, WeatherKind.Clear);
            var storm = Sky.At(13, WeatherKind.Storm);
            TestContext.WriteLine($"night ambient {night.AmbientSky} light {night.LightIntensity:0.00}; day ambient {day.AmbientSky} light {day.LightIntensity:0.00}; storm fog {storm.FogDensity:0.0000}");
            Assert.That(night.AmbientSky.Luma, Is.GreaterThan(0.03f), "the night is not black");
            Assert.That(night.AmbientSky.B, Is.GreaterThan(night.AmbientSky.R), "the night is blue");
            Assert.That(night.LightIntensity, Is.GreaterThan(0.2f), "the moon lights the ground");
            Assert.That(night.Stars, Is.GreaterThan(0.75f), "stars on a clear night");
            Assert.That(day.LightIntensity, Is.GreaterThan(2f));
            Assert.That(day.Stars, Is.EqualTo(0f));
            Assert.That(storm.LightIntensity, Is.LessThan(day.LightIntensity * 0.5f));
            Assert.That(storm.FogDensity, Is.GreaterThan(day.FogDensity * 5));
            Assert.That(Sky.At(13, WeatherKind.Rain).Rain, Is.EqualTo(1f));
            Assert.That(Sky.At(13, WeatherKind.Dust).Dust, Is.GreaterThan(1f));
        }

        [Test]
        public void WeatherIsFixedByRegionAndDayRunsInSpellsAndFollowsTheClimate()
        {
            Assert.That(Weather.For("sallow", 12, 3), Is.EqualTo(Weather.For("sallow", 12, 3)));
            var days = Enumerable.Range(1, 3000).Select(d => Weather.For("sallow", d)).ToList();
            var clear = days.Count(w => w == WeatherKind.Clear) / (double)days.Count;
            var same = Enumerable.Range(0, days.Count - 1).Count(i => days[i] == days[i + 1]) / (double)(days.Count - 1);
            TestContext.WriteLine($"sallow: clear {clear:0.00}, the next day the same {same:0.00}");
            Assert.That(clear, Is.InRange(0.42, 0.68), "most days in the Sallow are clear");
            Assert.That(same, Is.GreaterThan(0.5), "weather runs in spells");
            Assert.That(days, Has.None.EqualTo(WeatherKind.Snow), "no snow in the Sallow");
            Assert.That(Enumerable.Range(1, 3000).Select(d => Weather.For("teeth", d)), Has.Some.EqualTo(WeatherKind.Snow), "snow in the Teeth");
            Assert.That(Enumerable.Range(1, 3000).Select(d => Weather.For("northern_wet", d)).Count(w => w == WeatherKind.Rain), Is.GreaterThan(400), "the Wet is wet");
        }

        [Test]
        public void TwoLooksBlendHalfway()
        {
            var a = Sky.At(13, WeatherKind.Clear); var b = Sky.At(13, WeatherKind.Rain);
            var m = SkyLook.Lerp(a, b, 0.5f);
            Assert.That(m.FogDensity, Is.EqualTo((a.FogDensity + b.FogDensity) / 2).Within(1e-6f));
            Assert.That(m.Rain, Is.EqualTo(0.5f).Within(1e-6f));
            Assert.That(m.LightX * m.LightX + m.LightY * m.LightY + m.LightZ * m.LightZ, Is.EqualTo(1f).Within(1e-4f));
        }
    }
}
