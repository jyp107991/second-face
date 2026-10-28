using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Inventory;

namespace SecondFace.Core.Npc
{
    /// <summary>A catalogued clothing piece on a body: which asset, and how it is dyed, tinted and worn.</summary>
    public sealed class GarmentLook
    {
        [JsonProperty("name")] public string Name;
        /// <summary>Multiplies the texture colour.</summary>
        [JsonProperty("tint")] public int? Tint;
        /// <summary>Re-dye: the fabric keeps its weave/shading but takes this colour.</summary>
        [JsonProperty("dye")] public int? Dye;
        /// <summary>0..1 dirt, heaviest towards the hem and feet.</summary>
        [JsonProperty("grime")] public double? Grime;
        /// <summary>0..1 sun-fading and wear.</summary>
        [JsonProperty("wear")] public double? Wear;
    }

    /// <summary>A procedural piece (poncho, wraps, goggles, plates, visible chrome…).</summary>
    public sealed class GearLook
    {
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("color")] public int? Color;
        [JsonProperty("grime")] public double? Grime;
        [JsonProperty("wear")] public double? Wear;
        /// <summary>Chrome: the lit accent colour and the make (plating finish differs by grade).</summary>
        [JsonProperty("accent")] public int? Accent;
        [JsonProperty("grade")] public string Grade;
    }

    /// <summary>What a figure wears: catalogued layers, procedural gear, and how dirty and worn it all is.</summary>
    public sealed class Outfit
    {
        [JsonProperty("suit")] public string Suit;
        [JsonProperty("suitTint")] public int? SuitTint;
        [JsonProperty("shoes")] public string Shoes;
        [JsonProperty("shoeTint")] public int? ShoeTint;
        /// <summary>Gas mask over the face.</summary>
        [JsonProperty("mask")] public bool? Mask;
        [JsonProperty("layers")] public List<GarmentLook> Layers;
        [JsonProperty("gear")] public List<GearLook> Gear;
        /// <summary>The weapon shape in the right hand (set at runtime from the inventory).</summary>
        [JsonProperty("held")] public string Held;
        [JsonProperty("grime")] public double? Grime;
        [JsonProperty("wear")] public double? Wear;
    }

    /// <summary>A clothing piece in the catalogue: its body slot, cut, style tags, dyeability and effect on hair.</summary>
    public sealed class GarmentDef
    {
        /// <summary>full, top, over, legs, feet, head, eyes, face, hands, gear.</summary>
        [JsonProperty("slot")] public string Slot;
        /// <summary>Cut: m, f or u (either).</summary>
        [JsonProperty("fit")] public string Fit;
        [JsonProperty("tags")] public List<string> Tags = new();
        /// <summary>Plain enough fabric to be re-dyed to a palette colour (otherwise only tinted/faded).</summary>
        [JsonProperty("dye")] public bool? Dye;
        /// <summary>Head pieces: "hide" removes hair entirely (helmets, hoods), "crop" keeps only the painted hairline.</summary>
        [JsonProperty("hair")] public string Hair;
        /// <summary>A full piece that leaves the legs to separate trousers (tunics, long jackets).</summary>
        [JsonProperty("legsFree")] public bool? LegsFree;
    }

    /// <summary>How people in a role dress: style weights, optional pieces, palette, dye, grime and wear, body and hair.</summary>
    public sealed class RoleDef
    {
        [JsonProperty("styles")] public Dictionary<string, double> Styles = new();
        /// <summary>Chance of a one-piece outfit instead of top + legs.</summary>
        [JsonProperty("full")] public double Full;
        [JsonProperty("chance")] public Dictionary<string, double> Chance = new();
        [JsonProperty("palette")] public List<int> Palette = new();
        /// <summary>Chance each dyeable piece is re-dyed from the palette.</summary>
        [JsonProperty("dye")] public double Dye;
        [JsonProperty("grime")] public List<double> Grime;
        [JsonProperty("wear")] public List<double> Wear;
        [JsonProperty("life")] public string Life;
        /// <summary>Chance of dyed hair.</summary>
        [JsonProperty("hairDye")] public double? HairDye;
        /// <summary>Which hairstyles fit the role's world.</summary>
        [JsonProperty("hair")] public string Hair;
        /// <summary>Procedural gear and the chance of each piece: pairs of [kind, chance].</summary>
        [JsonProperty("gear")] public List<JArray> GearRaw;

        [JsonIgnore] public IEnumerable<(string kind, double chance)> Gear { get { if (GearRaw == null) yield break; foreach (var g in GearRaw) yield return ((string)g[0], (double)g[1]); } }
    }

    public sealed class FactionMarker { [JsonProperty("gear")] public string Gear; [JsonProperty("color")] public int Color; [JsonProperty("chance")] public double? Chance; }

    /// <summary>How a faction's people look: colours, a marker piece, and extra style weight.</summary>
    public sealed class FactionLook
    {
        [JsonProperty("palette")] public List<int> Palette;
        [JsonProperty("marker")] public FactionMarker Marker;
        [JsonProperty("styles")] public Dictionary<string, double> Styles;
        [JsonProperty("grime")] public List<double> Grime;
    }

    /// <summary>Appearance: a generator seed plus explicit overrides.</summary>
    public sealed class LookDef
    {
        [JsonProperty("seed")] public int Seed;
        /// <summary>broad or narrow.</summary>
        [JsonProperty("frame")] public string Frame;
        [JsonProperty("age")] public double? Age;
        [JsonProperty("ancestry")] public string Ancestry;
        /// <summary>Explicit appearance overrides (hair, facial hair, scars, weathering, skin…), applied by the figure builder.</summary>
        [JsonProperty("over")] public JObject Over;
    }

    /// <summary>A surgeon's table: the pieces they have to sell and fit (each once per game), and the fee their work costs.</summary>
    public sealed class SurgeonDef
    {
        [JsonProperty("stock")] public List<string> Stock = new();
        /// <summary>Base fee for an operation in Tolls (plus the piece's difficulty). Default 40.</summary>
        [JsonProperty("fee")] public double? Fee;
    }

    /// <summary>NPC definition (content): the physical and combat core, plus dialogue, trade, routine and faction.</summary>
    public sealed class NpcDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("look")] public LookDef Look;
        /// <summary>Who they are, for generated clothing, build and grime. Default settler.</summary>
        [JsonProperty("role")] public string Role;
        /// <summary>Explicit outfit; generated from the role when absent.</summary>
        [JsonProperty("outfit")] public Outfit Outfit;
        [JsonProperty("level")] public int Level;
        [JsonProperty("attrs")] public Dictionary<string, int> Attrs;
        /// <summary>Percentage points added on top of attribute-derived skill bases.</summary>
        [JsonProperty("skills")] public Dictionary<string, int> Skills;
        [JsonProperty("tagged")] public List<string> Tagged;
        [JsonProperty("traits")] public List<string> Traits;
        [JsonProperty("perks")] public Dictionary<string, int> Perks;
        /// <summary>Pairs of [item id, count].</summary>
        [JsonProperty("inventory")] public List<JArray> InventoryRaw;
        /// <summary>Item ids to equip (weapon → primary, then secondary; armour to its slot).</summary>
        [JsonProperty("equip")] public List<string> Equip;
        [JsonProperty("tolls")] public int? Tolls;
        /// <summary>Combat side. Same team = allies. "player" is the player's side.</summary>
        [JsonProperty("team")] public string Team;
        [JsonProperty("hostile")] public bool? Hostile;
        /// <summary>Hostile while this holds (a camp that turns on you once a flag is set).</summary>
        [JsonProperty("hostileIf")] public JObject HostileIf;
        /// <summary>Fights on your side in encounters on their map while this holds (a town's militia on the day).</summary>
        [JsonProperty("ally")] public JObject Ally;
        /// <summary>0..100.</summary>
        [JsonProperty("courage")] public int? Courage;
        /// <summary>Creature attack when unarmed.</summary>
        [JsonProperty("natural")] public WeaponDef Natural;
        /// <summary>Leader of their team (morale hit when they fall).</summary>
        [JsonProperty("leader")] public bool? Leader;
        /// <summary>Dialogue tree id (talk on tap when not hostile).</summary>
        [JsonProperty("dialogue")] public string Dialogue;
        /// <summary>Faction id for reputation effects.</summary>
        [JsonProperty("faction")] public string Faction;
        [JsonProperty("merchant")] public MerchantDef Merchant;
        [JsonProperty("surgeon")] public SurgeonDef Surgeon;
        /// <summary>Daily routine (spots on the map they are placed on).</summary>
        [JsonProperty("schedule")] public List<ScheduleEntry> Schedule;
        /// <summary>Background person: not noted in the notebook, no sketch, generated rather than written.</summary>
        [JsonProperty("minor")] public bool? Minor;
        /// <summary>Lines muttered when the player is near.</summary>
        [JsonProperty("barks")] public List<string> Barks;
        /// <summary>Settlement whose standing sets their prices (defaults to the map's settlement).</summary>
        [JsonProperty("settlement")] public string Settlement;

        [JsonIgnore] public IEnumerable<(string id, int n)> InventoryItems { get { if (InventoryRaw == null) yield break; foreach (var e in InventoryRaw) yield return ((string)e[0], (int)e[1]); } }
    }
}
