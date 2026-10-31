using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Scene;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>
    /// The people of a place drawn apart (#112): no two of a town's named people, and none of its extras, share a real face
    /// their faces were blended from (two who did read as kin), and a look is the same every time it is asked for.
    /// </summary>
    public sealed class CastTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void NoTwoPeopleOfAPlaceShareARealFace()
        {
            foreach (var mapId in new[] { "shale" })
            {
                var map = Registry.Maps[mapId];
                var owner = new Dictionary<int, string>();
                var named = 0;
                foreach (var p in map.Npcs.Where(p => p.Def != null && Registry.Npcs.ContainsKey(p.Def)).Select(p => p.Def).Distinct())
                {
                    var def = Registry.Npcs[p];
                    if (!ReferenceEquals(Registry.Maps.Keys.OrderBy(k => k, System.StringComparer.Ordinal)
                            .Select(k => Registry.Maps[k]).First(m => m.Npcs != null && m.Npcs.Any(x => x.Def == p)), map)) continue;   // placed first elsewhere
                    var look = Cast.LookOf(def, Routine.Male(def.Look));
                    foreach (var f in Cast.FacesOf(look))
                    {
                        Assert.That(owner.ContainsKey(f), Is.False, $"{def.Name} and {(owner.TryGetValue(f, out var o) ? o : "")} share real face {f}");
                        owner[f] = def.Name;
                    }
                    named++;
                }
                Assert.That(named, Is.GreaterThan(5), $"{mapId}'s named people");
                var extras = Extras.Of(map);
                foreach (var x in extras)
                    foreach (var f in Cast.FacesOf(x.Look))
                    {
                        Assert.That(owner.ContainsKey(f), Is.False, $"{x.Def.Name} (extra) and {(owner.TryGetValue(f, out var o) ? o : "")} share real face {f}");
                        owner[f] = x.Def.Name;
                    }
            }
        }

        [Test]
        public void ALookIsTheSameEveryTime()
        {
            var def = Registry.Maps["shale"].Npcs.Select(p => p.Def).Where(d => d != null && Registry.Npcs.ContainsKey(d)).Skip(3).First();
            var a = Cast.LookOf(Registry.Npcs[def], Routine.Male(Registry.Npcs[def].Look));
            var b = Cast.LookOf(Registry.Npcs[def], Routine.Male(Registry.Npcs[def].Look));
            Assert.That(b.FaceSource, Is.EqualTo(a.FaceSource));
            Assert.That(b.Skin, Is.EqualTo(a.Skin));
        }
    }
}
