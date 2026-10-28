using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Inventory
{
    public sealed class ItemInst
    {
        public string Def;
        public int Qty;
        /// <summary>Condition 0..1 for weapons/armour.</summary>
        public double? Cond;
        /// <summary>Rounds currently loaded (weapons with magazines).</summary>
        public int? Loaded;
        /// <summary>Ammo item id currently loaded.</summary>
        public string LoadedAmmo;

        public ItemInst Clone() => new ItemInst { Def = Def, Qty = Qty, Cond = Cond, Loaded = Loaded, LoadedAmmo = LoadedAmmo };
    }

    public sealed class Inventory
    {
        public static readonly string[] EquipSlots = { "primary", "secondary", "body", "head" };

        public List<ItemInst> Items = new();
        public Dictionary<string, ItemInst> Equipped = new();
        /// <summary>Which weapon slot is in hand: primary or secondary.</summary>
        public string Active = "primary";
        public int Tolls;

        public ItemInst EquippedAt(string slot) => Equipped.TryGetValue(slot, out var it) ? it : null;
    }

    public sealed class UseResult { public bool Ok; public string Message; public int Healed; }

    /// <summary>Inventory rules (port of inventory/inventory.ts).</summary>
    public static class Inv
    {
        public static Inventory Empty() => new Inventory();

        public static ItemInst MakeItem(string def, int qty = 1, double? cond = null)
        {
            var d = Items.Def(def);
            var inst = new ItemInst { Def = def, Qty = qty };
            if (d.Weapon != null || d.Armor != null) inst.Cond = cond ?? 1;
            if (d.Weapon?.Magazine != null) { inst.Loaded = 0; inst.LoadedAmmo = null; }
            return inst;
        }

        private static bool SameStack(ItemInst a, ItemInst b) => a.Def == b.Def && Items.IsStackable(Items.Def(a.Def)) && a.Cond == b.Cond;

        public static void AddItem(Inventory inv, ItemInst item)
        {
            if (item.Def == "tolls") { inv.Tolls += item.Qty; return; }
            var existing = inv.Items.Find(i => SameStack(i, item));
            if (existing != null) existing.Qty += item.Qty;
            else inv.Items.Add(item.Clone());
        }

        public static int CountItem(Inventory inv, string def)
        {
            if (def == "tolls") return inv.Tolls;
            int n = 0;
            foreach (var i in inv.Items) if (i.Def == def) n += i.Qty;
            return n;
        }

        /// <summary>Remove qty of an item def (from the last stacks first). Returns how many were removed.</summary>
        public static int RemoveItem(Inventory inv, string def, int qty = 1)
        {
            if (def == "tolls") { int n0 = Math.Min(qty, inv.Tolls); inv.Tolls -= n0; return n0; }
            int left = qty;
            for (int i = inv.Items.Count - 1; i >= 0 && left > 0; i--)
            {
                var it = inv.Items[i];
                if (it.Def != def) continue;
                int n = Math.Min(left, it.Qty);
                it.Qty -= n;
                left -= n;
                if (it.Qty <= 0) inv.Items.RemoveAt(i);
            }
            return qty - left;
        }

        /// <summary>Remove a specific instance (by index) and return it.</summary>
        public static ItemInst TakeAt(Inventory inv, int index, int? qty = null)
        {
            if (index < 0 || index >= inv.Items.Count) return null;
            var it = inv.Items[index];
            int n = Math.Min(qty ?? it.Qty, it.Qty);
            if (n >= it.Qty) { inv.Items.RemoveAt(index); return it; }
            it.Qty -= n;
            var part = it.Clone(); part.Qty = n;
            return part;
        }

        public static double ItemWeight(ItemInst i) => Items.Def(i.Def).Weight * i.Qty;

        public static double TotalWeight(Inventory inv)
        {
            double w = 0;
            foreach (var i in inv.Items) w += ItemWeight(i);
            foreach (var e in inv.Equipped.Values) if (e != null) w += ItemWeight(e);
            return Num.Round(w * 10) / 10;
        }

        public static bool Overloaded(Inventory inv, CharacterSheet s) => TotalWeight(inv) > Sheet.Derived(s).Carry;

        /// <summary>Value of an item instance in Tolls (condition matters).</summary>
        public static int ItemValue(ItemInst i)
        {
            var d = Items.Def(i.Def);
            double condK = i.Cond == null ? 1 : 0.2 + 0.8 * i.Cond.Value;
            return Math.Max(0, Num.RoundInt(d.Value * condK)) * i.Qty;
        }

        public static string[] SlotFor(string def)
        {
            var d = Items.Def(def);
            if (d.Weapon != null) return new[] { "primary", "secondary" };
            if (d.Armor != null) return new[] { d.Armor.Slot };
            return Array.Empty<string>();
        }

        /// <summary>Equip the item at index into a slot (swapping any existing item back into the pack).</summary>
        public static bool Equip(Inventory inv, int index, string slot = null)
        {
            if (index < 0 || index >= inv.Items.Count) return false;
            var it = inv.Items[index];
            var slots = SlotFor(it.Def);
            var target = slot ?? (slots.Length > 0 ? slots[0] : null);
            if (target == null || Array.IndexOf(slots, target) < 0) return false;
            var one = TakeAt(inv, index, 1);
            var prev = inv.EquippedAt(target);
            inv.Equipped[target] = one;
            if (prev != null) AddItem(inv, prev);
            return true;
        }

        public static void Unequip(Inventory inv, string slot)
        {
            var it = inv.EquippedAt(slot);
            if (it == null) return;
            inv.Equipped.Remove(slot);
            AddItem(inv, it);
        }

        public static ItemInst ActiveWeapon(Inventory inv) => inv.EquippedAt(inv.Active);

        /// <summary>Modifiers from worn armour: DT/DR/rad resist scale with condition.</summary>
        public static List<Modifier> GearModifiers(Inventory inv)
        {
            var outList = new List<Modifier>();
            foreach (var slot in new[] { "body", "head" })
            {
                var it = inv.EquippedAt(slot);
                if (it == null) continue;
                var a = Items.Def(it.Def).Armor;
                if (a == null) continue;
                double k = 0.5 + 0.5 * (it.Cond ?? 1);
                outList.Add(new Modifier("derived:dt", Num.Round(a.Dt * k)));
                outList.Add(new Modifier("derived:dr", Num.Round(a.Dr * k)));
                if (a.RadResist != null && a.RadResist != 0) outList.Add(new Modifier("derived:radResist", a.RadResist));
                if (a.Stealth != null && a.Stealth != 0) outList.Add(new Modifier("skill:stealth", -a.Stealth));
                if (a.Mods != null) outList.AddRange(a.Mods);
            }
            return outList;
        }

        /// <summary>Keep the sheet's gear modifiers in sync after any equipment change.</summary>
        public static void SyncGear(CharacterSheet s, Inventory inv) => s.GearMods = GearModifiers(inv);

        /// <summary>Reload a weapon slot from inventory ammo. Returns rounds loaded (0 if none).</summary>
        public static int Reload(Inventory inv, string slot = null, string preferAmmo = null)
        {
            slot ??= inv.Active;
            var w = inv.EquippedAt(slot);
            if (w == null) return 0;
            var wd = Items.Def(w.Def).Weapon;
            if (wd?.Magazine == null || wd.Ammo == null) return 0;
            var candidates = inv.Items.Where(i => Items.Def(i.Def).Ammo?.Type == wd.Ammo).ToList();
            var ammoId = preferAmmo ?? w.LoadedAmmo;
            if (ammoId == null || !candidates.Any(c => c.Def == ammoId)) ammoId = candidates.Count > 0 ? candidates[0].Def : null;
            if (ammoId == null) return 0;
            // Switching ammo type: unload current rounds back to the pack first.
            if (w.LoadedAmmo != null && w.LoadedAmmo != ammoId && (w.Loaded ?? 0) > 0)
            {
                AddItem(inv, new ItemInst { Def = w.LoadedAmmo, Qty = w.Loaded.Value });
                w.Loaded = 0;
            }
            int room = wd.Magazine.Value - (w.Loaded ?? 0);
            if (room <= 0) return 0;
            int n = RemoveItem(inv, ammoId, room);
            w.Loaded = (w.Loaded ?? 0) + n;
            w.LoadedAmmo = ammoId;
            return n;
        }

        /// <summary>Apply a consumable from the pack to a character.</summary>
        public static UseResult UseConsumable(Inventory inv, int index, CharacterSheet s, int now, Func<double> roll = null)
        {
            if (index < 0 || index >= inv.Items.Count) return new UseResult { Ok = false, Message = "Nothing there." };
            var it = inv.Items[index];
            var d = Items.Def(it.Def);
            if (d.Consumable == null) return new UseResult { Ok = false, Message = $"You can't use {d.Name}." };
            roll ??= () => new Random().NextDouble();
            var mods = Sheet.AllMods(s);
            int healed = 0;
            foreach (var e in d.Consumable.Effects)
            {
                switch (e.Kind)
                {
                    case "heal":
                    {
                        int amt = Num.RoundInt(Sheet.ModValue(mods, "heal_items", e.Amount ?? 0));
                        int before = s.Hp;
                        s.Hp = Math.Min(Sheet.Derived(s).MaxHp, s.Hp + amt);
                        healed += s.Hp - before;
                        break;
                    }
                    case "rads": s.Rads = Math.Max(0, s.Rads + (int)(e.Amount ?? 0)); break;
                    case "cureCripple": s.Crippled = new Dictionary<string, bool>(); break;
                    case "effect":
                        s.Effects = s.Effects.Where(x => x.Id != e.Id).ToList();
                        s.Effects.Add(new ActiveEffect { Id = e.Id, Name = e.Name, Mods = e.Mods ?? new List<Modifier>(), Until = now + (e.Minutes ?? 0) });
                        break;
                    case "addiction":
                        if (roll() < (e.Chance ?? 0) && !s.Effects.Any(x => x.Id == e.EffectId))
                            s.Effects.Add(new ActiveEffect { Id = e.EffectId, Name = "Addiction", Mods = new List<Modifier> { new Modifier("attr:reflex", -1), new Modifier("attr:wits", -1) } });
                        break;
                    case "food": case "water": break;
                }
            }
            RemoveItem(inv, it.Def, 1);
            return new UseResult { Ok = true, Message = healed > 0 ? $"{d.Name}: +{healed} HP" : $"Used {d.Name}.", Healed = healed };
        }

        /// <summary>Restore condition (repair kits, Menders).</summary>
        public static void Repair(ItemInst it, double amount) { if (it.Cond != null) it.Cond = Math.Min(1, it.Cond.Value + amount); }

        /// <summary>Wear a weapon/armour piece by a small amount; returns true if it broke this time.</summary>
        public static bool Wear(ItemInst it, double amount = 1)
        {
            var d = Items.Def(it.Def);
            double? dur = d.Weapon?.Durability ?? d.Armor?.Durability;
            if (dur == null || dur == 0 || it.Cond == null) return false;
            double was = it.Cond.Value;
            it.Cond = Math.Max(0, it.Cond.Value - amount / dur.Value);
            return was > 0 && it.Cond == 0;
        }
    }
}
