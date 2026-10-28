using System;
using System.Collections.Generic;
using SecondFace.Core.Content;

namespace SecondFace.Core.Inventory
{
    /// <summary>The item catalogue (port of inventory/items.ts).</summary>
    public static class Items
    {
        public static bool IsStackable(ItemDef d) => d.Stack ?? (d.Category == "ammo" || d.Category == "consumable" || d.Category == "junk");

        public static ItemDef Def(string id) => Registry.Items.TryGetValue(id, out var d) ? d : throw new ArgumentException($"Unknown item {id}");

        public static bool Has(string id) => Registry.Items.ContainsKey(id);

        public static IReadOnlyDictionary<string, ItemDef> All => Registry.Items;
    }
}
