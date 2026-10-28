using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Inventory
{
    public sealed class WeaponBurst { [JsonProperty("rounds")] public int Rounds; [JsonProperty("ap")] public int Ap; }

    public sealed class WeaponDef
    {
        [JsonProperty("skill")] public string Skill;
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("hands")] public int Hands;
        [JsonProperty("dmg")] public int[] Dmg;
        [JsonProperty("dmgType")] public string DmgType;
        /// <summary>AP for a normal attack; aimed shots cost +1.</summary>
        [JsonProperty("ap")] public int Ap;
        [JsonProperty("burst")] public WeaponBurst Burst;
        /// <summary>Effective range in tiles (melee = 1).</summary>
        [JsonProperty("range")] public int Range;
        [JsonProperty("ammo")] public string Ammo;
        [JsonProperty("magazine")] public int? Magazine;
        [JsonProperty("minBrawn")] public int? MinBrawn;
        [JsonProperty("critMult")] public double? CritMult;
        [JsonProperty("noise")] public double? Noise;
        [JsonProperty("area")] public double? Area;
        [JsonProperty("durability")] public double Durability;
        [JsonProperty("consumable")] public bool? Consumable;
    }

    public sealed class AmmoDef
    {
        [JsonProperty("type")] public string Type;
        [JsonProperty("dmgMult")] public double DmgMult;
        [JsonProperty("dtPen")] public double DtPen;
        [JsonProperty("drMod")] public double DrMod;
    }

    public sealed class ArmorDef
    {
        [JsonProperty("slot")] public string Slot;
        [JsonProperty("dt")] public double Dt;
        [JsonProperty("dr")] public double Dr;
        [JsonProperty("radResist")] public double? RadResist;
        /// <summary>Stealth skill penalty.</summary>
        [JsonProperty("stealth")] public double? Stealth;
        [JsonProperty("durability")] public double Durability;
        [JsonProperty("mods")] public List<Modifier> Mods;
    }

    /// <summary>One effect of a consumable: heal, rads, cureCripple, effect, addiction, food, water.</summary>
    public sealed class ConsumableEffect
    {
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("amount")] public double? Amount;
        [JsonProperty("overSec")] public double? OverSec;
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("mods")] public List<Modifier> Mods;
        [JsonProperty("minutes")] public int? Minutes;
        [JsonProperty("chance")] public double? Chance;
        [JsonProperty("effectId")] public string EffectId;
    }

    public sealed class ConsumableDef
    {
        [JsonProperty("effects")] public List<ConsumableEffect> Effects = new();
        [JsonProperty("ap")] public int? Ap;
        [JsonProperty("skill")] public string Skill;
    }

    public sealed class ItemDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("desc")] public string Desc;
        [JsonProperty("category")] public string Category;
        [JsonProperty("weight")] public double Weight;
        /// <summary>Base value in Tolls at full condition.</summary>
        [JsonProperty("value")] public int Value;
        [JsonProperty("stack")] public bool? Stack;
        [JsonProperty("weapon")] public WeaponDef Weapon;
        [JsonProperty("ammo")] public AmmoDef Ammo;
        [JsonProperty("armor")] public ArmorDef Armor;
        [JsonProperty("consumable")] public ConsumableDef Consumable;
        [JsonProperty("cookTo")] public string CookTo;
        [JsonProperty("read")] public string Read;
        [JsonProperty("parts")] public Dictionary<string, int> Parts;
        [JsonProperty("tags")] public List<string> Tags;
        [JsonProperty("icon")] public string Icon;
        /// <summary>What the item puts on the body when worn (read by the people code).</summary>
        [JsonProperty("wear")] public JToken Wear;
        [JsonProperty("held")] public string Held;
        [JsonProperty("chrome")] public string Chrome;
    }

    /// <summary>A merchant: what they buy, their cash, their stock and restock rhythm.</summary>
    public sealed class MerchantDef
    {
        /// <summary>Categories bought, or the string "all".</summary>
        [JsonProperty("buys")] public JToken BuysRaw;
        [JsonProperty("cash")] public int Cash;
        [JsonProperty("restockDays")] public int RestockDays;
        [JsonProperty("stock")] public List<JArray> StockRaw = new();
        [JsonProperty("markup")] public double? Markup;
        [JsonProperty("faction")] public string Faction;

        [JsonIgnore] public bool BuysAll => BuysRaw != null && BuysRaw.Type == JTokenType.String && (string)BuysRaw == "all";
        [JsonIgnore] public List<string> Buys { get { var l = new List<string>(); if (BuysRaw is JArray a) foreach (var t in a) l.Add((string)t); return l; } }
        [JsonIgnore] public IEnumerable<(string item, int n)> Stock { get { foreach (var s in StockRaw) yield return ((string)s[0], (int)s[1]); } }

        public MerchantDef() { }
        public MerchantDef(IEnumerable<string> buys, int cash, int restockDays, params (string item, int n)[] stock)
        {
            BuysRaw = buys == null ? "all" : new JArray(buys); Cash = cash; RestockDays = restockDays;
            foreach (var (item, n) in stock) StockRaw.Add(new JArray(item, n));
        }
    }
}
