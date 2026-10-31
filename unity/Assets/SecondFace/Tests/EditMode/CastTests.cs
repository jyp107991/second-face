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
    /// their faces were blended from (two who did read as kin), in every place, a person placed in two of them included; and a
    /// look is the same every time it is asked for.
    /// </summary>
    public sealed class CastTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void NoTwoPeopleOfAPlaceShareARealFace()
        {
            var towns = 0;
            foreach (var mapId in Registry.Maps.Keys.OrderBy(k => k, System.StringComparer.Ordinal))
            {
                var map = Registry.Maps[mapId];
                if (map.Npcs == null) continue;
                var owner = new Dictionary<int, string>();
                var named = 0;
                foreach (var p in map.Npcs.Where(p => p.Def != null && Registry.Npcs.ContainsKey(p.Def)).Select(p => p.Def).Distinct())
                {
                    var def = Registry.Npcs[p];
                    foreach (var f in Cast.FacesOf(Cast.LookOf(def, Routine.Male(def.Look))))
                    {
                        Assert.That(owner.ContainsKey(f), Is.False, $"{mapId}: {def.Name} and {(owner.TryGetValue(f, out var o) ? o : "")} share real face {f}");
                        owner[f] = def.Name;
                    }
                    named++;
                }
                foreach (var x in Extras.Of(map))
                    foreach (var f in Cast.FacesOf(x.Look))
                    {
                        Assert.That(owner.ContainsKey(f), Is.False, $"{mapId}: {x.Def.Name} (extra) and {(owner.TryGetValue(f, out var o) ? o : "")} share real face {f}");
                        owner[f] = x.Def.Name;
                    }
                if (named > 5) towns++;
            }
            Assert.That(towns, Is.GreaterThan(1), "places with more than five named people");
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
