using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Combat
{
    /// <summary>Anything that fights. Player, companions and NPCs all share the character sheet model.</summary>
    public sealed class Combatant
    {
        public string Id;
        public string Name;
        public string Team;
        public CharacterSheet Sheet;
        public Inventory.Inventory Inv;
        public int X;
        public int Y;
        public int Ap;
        /// <summary>0..100. Breaks below ~20 (flee), surrenders below ~10 if able.</summary>
        public double Morale;
        /// <summary>Evasion bonus from AP left unspent last turn.</summary>
        public double Evasion;
        /// <summary>Loses the next turn (groin/head criticals).</summary>
        public bool Stunned;
        /// <summary>Natural attack when unarmed (creatures).</summary>
        public WeaponDef Natural;
        public bool IsPlayer;
        /// <summary>Personality courage 0..100 (NPCs).</summary>
        public double? Courage;
    }

    public sealed class CombatContext
    {
        public bool Indoor;
        public bool Night;
        /// <summary>0 (lit) .. 1 (pitch dark) at the target's tile.</summary>
        public double Darkness;
    }

    public sealed class AttackOpts
    {
        /// <summary>A body part (torso, head, eyes, armL, armR, legL, legR, groin) or "weapon"; null for a snap shot.</summary>
        public string Aimed;
        /// <summary>Flat hit-chance change (difficulty).</summary>
        public double HitMod;
        /// <summary>Damage multiplier (difficulty).</summary>
        public double DmgMul = 1;
        public bool Burst;
        /// <summary>none, half or full.</summary>
        public string Cover = "none";
        public CombatContext Ctx;
    }

    public sealed class HitResult
    {
        public bool Hit;
        public bool Crit;
        public int Damage;
        public string Part;
        public string Crippled;
        public bool Killed;
        public bool Stunned;
        public bool BypassedArmour;
    }

    public sealed class AttackResult
    {
        public List<HitResult> Hits = new();
        public int Damage;
        public bool Killed;
        public bool Jammed;
        /// <summary>Critical failure for the attacker: drop, hurt_self or jam.</summary>
        public string Fumble;
        public bool WeaponBroke;
        public int RoundsFired;
        public List<string> Messages = new();
    }

    public struct Permission { public bool Ok; public string Reason; }

    /// <summary>Combat rules (port of combat/rules.ts): AP, hit chance, resolution, turn order, morale.</summary>
    public static class CombatRules
    {
        public static readonly WeaponDef Fist = new() { Skill = "melee", Kind = "unarmed", Hands = 1, Dmg = new[] { 1, 4 }, DmgType = "blunt", Ap = 3, Range = 1, Durability = 0 };

        public static readonly Dictionary<string, int> AimPenalty = new() { ["torso"] = 0, ["head"] = 40, ["eyes"] = 60, ["armL"] = 30, ["armR"] = 30, ["legL"] = 20, ["legR"] = 20, ["groin"] = 30 };
        public static readonly Dictionary<string, int> AimCrit = new() { ["torso"] = 0, ["head"] = 15, ["eyes"] = 30, ["armL"] = 5, ["armR"] = 5, ["legL"] = 5, ["legR"] = 5, ["groin"] = 15 };
        public const int AimWeaponPenalty = 50;

        public static (WeaponDef def, ItemInst item) WeaponOf(Combatant c)
        {
            var it = Inv.ActiveWeapon(c.Inv);
            if (it != null)
            {
                var w = Items.Def(it.Def).Weapon;
                if (w != null) return (w, it);
            }
            return (c.Natural ?? Fist, null);
        }

        public static bool IsMelee(WeaponDef w) => w.Kind == "melee" || w.Kind == "unarmed";

        public static int Chebyshev(int ax, int ay, int bx, int by) => Math.Max(Math.Abs(ax - bx), Math.Abs(ay - by));

        public static int MaxAp(Combatant c)
        {
            var d = Sheet.Derived(c.Sheet);
            int ap = d.Ap;
            if (Sheet.HasFlag(c.Sheet, "last_stand") && c.Sheet.Hp < d.MaxHp * 0.25) ap += 2;
            return Math.Max(1, ap);
        }

        public static int AttackAp(Combatant c, bool aimed = false, bool burst = false)
        {
            var w = WeaponOf(c).def;
            int ap = burst && w.Burst != null ? w.Burst.Ap : w.Ap;
            if (aimed) ap += 1;
            if (w.Kind == "pistol" && Sheet.HasFlag(c.Sheet, "gunslinger")) ap -= 1;
            return Math.Max(1, ap);
        }

        public static int ReloadAp(Combatant c) => Sheet.HasFlag(c.Sheet, "quick_draw") ? 1 : 2;
        public static int SwapAp(Combatant c) => Sheet.HasFlag(c.Sheet, "quick_draw") ? 0 : 1;
        public static int ItemAp(ItemInst it) => Items.Def(it.Def).Consumable?.Ap ?? 2;

        /// <summary>Whether the weapon can fire now (ammo loaded, not broken).</summary>
        public static Permission CanAttack(Combatant c, bool burst = false)
        {
            var (def, item) = WeaponOf(c);
            if (item != null && item.Cond != null && item.Cond <= 0) return new Permission { Ok = false, Reason = "Weapon is broken" };
            if (def.Magazine != null && (item?.Loaded ?? 0) < 1) return new Permission { Ok = false, Reason = burst ? "Out of ammo" : "Out of ammo — reload" };
            if (def.MinBrawn != null && Sheet.Attr(c.Sheet, "brawn") < def.MinBrawn - 2) return new Permission { Ok = false, Reason = "Too heavy to use" };
            return new Permission { Ok = true };
        }

        public static int HitChance(Combatant att, Combatant def, AttackOpts opts = null)
        {
            opts ??= new AttackOpts();
            var w = WeaponOf(att).def;
            var s = att.Sheet;
            int dist = Chebyshev(att.X, att.Y, def.X, def.Y);
            bool melee = IsMelee(w);
            if (melee && dist > w.Range) return 0;
            double chance = Sheet.Skill(s, w.Skill);
            if (melee) chance += Sheet.ModSum(s, "hit_melee");
            else
            {
                chance += Sheet.ModSum(s, "hit_ranged");
                int sight = Sheet.Derived(s).SightRange;
                chance -= Math.Max(0, dist - sight) * 4;
                chance -= Math.Max(0, dist - w.Range) * 8;
                var cov = opts.Cover ?? "none";
                chance -= cov == "full" ? 40 : cov == "half" ? 20 : 0;
                if (w.Kind == "shotgun" && dist <= 3) chance += 10;
            }
            chance -= Sheet.Attr(def.Sheet, "reflex") + def.Evasion;
            if (w.MinBrawn != null) chance -= Math.Max(0, w.MinBrawn.Value - Sheet.Attr(s, "brawn")) * 15;
            if (opts.Aimed == "weapon") chance -= AimWeaponPenalty;
            else if (opts.Aimed != null) chance -= AimPenalty[opts.Aimed];
            if (opts.Burst) chance -= 10;
            var ctx = opts.Ctx;
            if (ctx != null && ctx.Darkness > 0)
            {
                double pen = 25 * ctx.Darkness - Sheet.Attr(s, "senses");
                if (Inv.CountItem(att.Inv, "t_lamp") > 0) pen *= 0.5;
                chance -= Math.Max(0, pen);
            }
            if (Sheet.HasFlag(s, "one_hand")) chance += w.Hands == 1 ? 15 : -40;
            if (Sheet.HasFlag(s, "hesitant") && def.Morale < 20) chance -= 10;
            if (ctx != null && Sheet.HasFlag(s, "cistern_pale")) chance += ctx.Indoor ? 10 : !ctx.Night ? -5 : 0;
            if (Sheet.HasFlag(s, "last_stand") && s.Hp < Sheet.Derived(s).MaxHp * 0.25) chance += 10;
            if (s.IsCrippled("eyes")) chance -= 15;
            chance += opts.HitMod;
            return Num.RoundInt(Math.Max(5, Math.Min(95, chance)));
        }

        public static int CritChance(Combatant att, AttackOpts opts = null)
        {
            opts ??= new AttackOpts();
            int c = Sheet.Derived(att.Sheet).Crit;
            if (opts.Aimed != null && opts.Aimed != "weapon")
            {
                c += AimCrit[opts.Aimed];
                if (Sheet.HasFlag(att.Sheet, "aimed_crit")) c += 5 * Math.Max(1, att.Sheet.PerkRank("sniper_eye"));
            }
            return Math.Max(0, Math.Min(90, c));
        }

        private static readonly string[] RandomParts = { "torso", "torso", "torso", "torso", "armL", "armR", "legL", "legR", "head" };

        /// <summary>Resolve an attack and apply damage/effects to the defender's sheet. Mutates both combatants.</summary>
        public static AttackResult ResolveAttack(Rng rng, Combatant att, Combatant def, AttackOpts opts = null)
        {
            opts ??= new AttackOpts();
            var (w, item) = WeaponOf(att);
            var res = new AttackResult();
            bool burst = opts.Burst && w.Burst != null;
            int rounds = burst ? w.Burst.Rounds : 1;
            if (w.Magazine != null && item != null) rounds = Math.Min(rounds, item.Loaded ?? 0);
            if (rounds <= 0) { res.Messages.Add("Click. Empty."); return res; }

            if (item != null && item.Cond != null && item.Cond < 0.3 && rng.Chance((0.3 - item.Cond.Value) * 0.5))
            {
                res.Jammed = true;
                res.Messages.Add($"{att.Name}'s weapon jams.");
                return res;
            }

            int chance = HitChance(att, def, opts);
            int crit = CritChance(att, opts);
            for (int r = 0; r < rounds && def.Sheet.Hp > 0; r++)
            {
                double roll = rng.Next() * 100;
                if (roll >= chance)
                {
                    res.Hits.Add(new HitResult { Hit = false, Part = "torso" });
                    if (r == 0 && !burst && roll >= 100 - Math.Max(1, 6 - Sheet.Attr(att.Sheet, "fortune") / 2.0))
                        res.Fumble = IsMelee(w) ? (rng.Chance(0.5) ? "drop" : "hurt_self") : rng.Chance(0.6) ? "jam" : "drop";
                    continue;
                }
                bool isCrit = roll < chance * (crit / 100.0);
                string part = opts.Aimed != null && opts.Aimed != "weapon" ? opts.Aimed : rng.Pick(RandomParts);
                var h = ApplyHit(rng, att, def, w, item, part, isCrit, opts.Aimed == "weapon", opts.DmgMul);
                res.Hits.Add(h);
                res.Damage += h.Damage;
                if (h.Killed) res.Killed = true;
            }
            res.RoundsFired = rounds;
            if (w.Magazine != null && item != null) item.Loaded = Math.Max(0, (item.Loaded ?? 0) - rounds);
            if (w.Consumable == true && item != null)
            {
                item.Qty -= 1;
                if (item.Qty <= 0) att.Inv.Equipped.Remove(att.Inv.Active);
            }
            if (item != null && w.Durability > 1 && Inv.Wear(item, rounds))
            {
                res.WeaponBroke = true;
                res.Messages.Add($"{att.Name}'s {Items.Def(item.Def).Name} breaks.");
            }
            if (res.Fumble == "hurt_self")
            {
                int d = rng.Int(1, 4);
                att.Sheet.Hp = Math.Max(1, att.Sheet.Hp - d);
                res.Messages.Add($"{att.Name} fumbles and is hurt ({d}).");
            }
            else if (res.Fumble == "drop") res.Messages.Add($"{att.Name} fumbles the weapon.");
            else if (res.Fumble == "jam") { res.Jammed = true; res.Messages.Add($"{att.Name}'s weapon jams."); }

            int hitsN = res.Hits.Count(x => x.Hit);
            if (hitsN == 0) res.Messages.Add($"{att.Name} misses {def.Name}.");
            else res.Messages.Add($"{att.Name} hits {def.Name}{(hitsN > 1 ? $" {hitsN} times" : "")} for {res.Damage}{(res.Hits.Any(x => x.Crit) ? " (critical!)" : "")}.");
            if (res.Killed) res.Messages.Add($"{def.Name} is killed.");
            return res;
        }

        private static HitResult ApplyHit(Rng rng, Combatant att, Combatant def, WeaponDef w, ItemInst item, string part, bool isCrit, bool atWeapon, double dmgMul)
        {
            var aSheet = att.Sheet; var ds = def.Sheet;
            var mods = Sheet.AllMods(aSheet);
            double dmg = rng.Int(w.Dmg[0], w.Dmg[1]);
            var ammo = item?.LoadedAmmo != null ? Items.Def(item.LoadedAmmo).Ammo : null;
            if (IsMelee(w))
            {
                dmg += Math.Max(0, Sheet.Attr(aSheet, "brawn") - 5);
                dmg = Sheet.ModValue(mods, "dmg_melee", dmg);
            }
            else
            {
                dmg = Sheet.ModValue(mods, "dmg_ranged", dmg);
                if (ammo != null) dmg *= ammo.DmgMult;
            }
            dmg *= dmgMul;
            var dd = Sheet.Derived(ds);
            double dt = Math.Max(0, dd.Dt - (ammo?.DtPen ?? 0));
            double dr = Math.Max(0, Math.Min(90, dd.Dr + (ammo?.DrMod ?? 0)));
            if (Sheet.HasFlag(ds, "cover_dt")) dt += 3;
            bool bypassed = false, stunned = false;
            string crippled = null;
            if (isCrit)
            {
                dmg *= (w.CritMult ?? 1.5) * Sheet.ModValue(mods, "crit_dmg", 1);
                switch (part)
                {
                    case "torso": if (rng.Chance(0.5)) { dt = 0; dr = Math.Floor(dr / 2); bypassed = true; } break;
                    case "head": if (rng.Chance(0.5)) stunned = true; break;
                    case "groin": stunned = true; break;
                    case "eyes": crippled = "eyes"; break;
                    default: crippled = part; break;
                }
            }
            int final = Math.Max(0, Num.RoundInt((dmg - dt) * (1 - dr / 100)));
            if (isCrit) final = Math.Max(1, final);
            if (crippled == null && part != "torso" && part != "head" && part != "groin")
            {
                double thresh = dd.MaxHp * (IsMelee(w) && Sheet.HasFlag(aSheet, "easy_cripple_melee") ? 0.12 : 0.25);
                if (final >= thresh) crippled = part;
            }
            if (atWeapon)
            {
                var target = Inv.ActiveWeapon(def.Inv);
                if (target != null && Sheet.HasFlag(aSheet, "jam_shot")) Inv.Wear(target, final * 4);
                final = Num.RoundInt(final * 0.3);
            }
            ds.Hp -= final;
            if (crippled != null) ds.Crippled[crippled] = true;
            if (stunned) def.Stunned = true;
            bool killed = ds.Hp <= 0;
            if (killed) ds.Hp = 0;
            return new HitResult { Hit = true, Crit = isCrit, Damage = final, Part = part, Crippled = crippled, Killed = killed, Stunned = stunned, BypassedArmour = bypassed };
        }

        public static List<Combatant> TurnOrder(Rng rng, IEnumerable<Combatant> cs)
        {
            return cs.Select(c => (c, k: Sheet.Derived(c.Sheet).Initiative + rng.Next() * 3 + (c.IsPlayer ? 0.5 : 0)))
                .OrderByDescending(x => x.k).Select(x => x.c).ToList();
        }

        /// <summary>ally_down, leader_down, hurt, badly_hurt, scored_kill, enemy_fled, outnumbered.</summary>
        public static void MoraleEvent(Combatant c, string e, bool attackerTerrifying = false)
        {
            double brave = (c.Courage ?? 50) / 100;
            double d = e switch { "ally_down" => -20, "leader_down" => -35, "hurt" => -8, "badly_hurt" => -20, "scored_kill" => 10, "enemy_fled" => 8, "outnumbered" => -10, _ => 0 };
            if (d < 0) d *= 1.4 - brave * 0.8;
            if (d < 0 && attackerTerrifying) d *= 1.5;
            c.Morale = Math.Max(0, Math.Min(100, c.Morale + d));
        }

        public static int InitialMorale(double courage = 50) => Num.RoundInt(40 + courage * 0.5);

        public const int XpPerKillBase = 10;
        /// <summary>Kill XP is deliberately small: scaled by victim level.</summary>
        public static int KillXp(Combatant victim) => XpPerKillBase * Math.Max(1, victim.Sheet.Level);
    }
}
