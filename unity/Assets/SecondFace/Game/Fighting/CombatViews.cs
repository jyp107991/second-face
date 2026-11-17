using SecondFace.Core.Combat;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using UnityEngine;

namespace SecondFace.Game.Fighting
{
    /// <summary>
    /// The fight's views of its fighters with captured motion and weapons (COMBAT.md A1–A8): installed into
    /// <see cref="Combat.MakeView"/> by <see cref="Bootstrap"/> with the built <see cref="CombatSet"/>. A body with a humanoid
    /// whose controller carries the fight's layers gets an <see cref="AnimatedUnitView"/>; anything else (an animal, a
    /// machine, a body made before the layers were built) keeps the placeholder.
    /// </summary>
    public static class CombatViews
    {
        public static CombatSet Set { get; private set; }

        public static void Install(CombatSet set)
        {
            Set = set;
            Combat.MakeView = set != null ? Make : null;
        }

        /// <summary>A fighter's view (null: the placeholder's).</summary>
        public static IUnitView Make(BattleUnit u, Transform body, Combat fight, CombatFx fx)
        {
            if (Set == null || body == null || fight == null) return null;
            var anim = body.GetComponentInChildren<Animator>();
            if (anim == null || !anim.isHuman || !Fighter.HasLayers(anim)) return null;
            var person = body.GetComponent<Townsperson>();
            var walk = fight.Walkabout;
            var walker = walk != null && walk.Walker != null && walk.Walker.transform == body ? walk.Walker : null;
            var female = Female(anim, person, walker != null ? walk.Game : null, body);
            var f = Fighter.Ensure(anim, Set, female, body, u?.C?.Id);
            if (f == null || !f.Ready) return null;
            return new AnimatedUnitView(u, body, fight, fx, f, walker, person, !fight.UnderPlayer(u));
        }

        private static readonly int SexId = Animator.StringToHash("Sex");

        /// <summary>Whether a body is a woman's (the combat set plays women's takes where it has them): the player's own
        /// look; the locomotion's own sex where people carry it (Pace's "Sex"); a resident's base or Rocketbox person; the
        /// model's own name.</summary>
        public static bool Female(Animator a, Townsperson p, GameState g, Transform body)
        {
            if (g?.Pc != null && p == null) return PlayerBody.Look(g.Pc)?.Body == "f";
            if (a.runtimeAnimatorController != null)
                foreach (var param in a.parameters)
                    if (param.nameHash == SexId && a.GetFloat(SexId) > 0.5f) return true;
            var id = p != null ? p.Body : null;
            if (id == "base_f") return true;
            if (id == "base_m") return false;
            var rb = RbPeople.Of(id) ?? RbPeople.Of(Clean(body != null ? body.name : null)) ?? RbPeople.Of(Clean(a.avatar != null ? a.avatar.name : null));
            if (rb != null) return !rb.Male;
            var n = $"{(a.avatar != null ? a.avatar.name : "")} {a.gameObject.name} {(body != null ? body.name : "")}";
            return n.Contains("Female") || n.Contains("female") || n.Contains("Woman") || n.Contains("_f_") || n.EndsWith("_f");
        }

        private static string Clean(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;
            name = name.Replace("(Clone)", "").Replace("Avatar", "").Trim();
            if (name.StartsWith("gate_")) name = name.Substring(5);
            return name;
        }
    }
}
