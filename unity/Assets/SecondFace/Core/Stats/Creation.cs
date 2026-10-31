using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.State;

namespace SecondFace.Core.Stats
{
    /// <summary>One of the content's origins: a ready-made Cistern resident (their attributes, tagged skills, traits, and
    /// a face and frame to start from).</summary>
    public sealed class OriginInfo
    {
        public string Id, Name, Blurb, Frame;
        public Dictionary<string, int> Attrs = new();
        public List<string> Tagged = new(), Traits = new();
        public int AppearanceSeed;

        public static OriginInfo From(OriginDef d)
        {
            var o = new OriginInfo { Id = d.Id, Name = d.Name, Blurb = d.Desc };
            var r = d.Rest ?? new Dictionary<string, JToken>();
            if (r.TryGetValue("blurb", out var b)) o.Blurb = (string)b;
            if (r.TryGetValue("frame", out var f)) o.Frame = (string)f;
            if (r.TryGetValue("appearanceSeed", out var s)) o.AppearanceSeed = (int)s;
            if (r.TryGetValue("attrs", out var a) && a is JObject ao) foreach (var p in ao.Properties()) o.Attrs[p.Name] = (int)p.Value;
            if (r.TryGetValue("tagged", out var t) && t is JArray ta) o.Tagged.AddRange(ta.Select(x => (string)x));
            if (r.TryGetValue("traits", out var tr) && tr is JArray tra) o.Traits.AddRange(tra.Select(x => (string)x));
            return o;
        }
    }

    /// <summary>
    /// Character creation (P5.3i, DESIGN §4): start from one of the content's origins or make someone from scratch; the
    /// attributes either the standard spread (12 points above base) or rolled the old way (BG2-style: roll as often as
    /// you like, keep the roll you like best, recall it, then move points between attributes within the roll's pool);
    /// three tagged skills, up to two traits, a name, pronouns and the look (<see cref="PlayerLook"/>). <see cref="Missing"/>
    /// names what is still to choose; <see cref="Finish"/> makes the player.
    /// </summary>
    public sealed class Creation
    {
        public const int MaxTraits = 2;

        public string Origin { get; private set; }
        public CharacterSheet Sheet = Stats.Sheet.Empty("");
        public PlayerLook Look = new();
        /// <summary>he, she or they.</summary>
        public string Pronouns = "they";
        /// <summary>The roll the player kept, if any.</summary>
        public Stats.Sheet.Roll? Kept { get; private set; }

        public bool Rolled => Sheet.CreationPool != null;
        /// <summary>Points above base this start may spend (12 standard, or the roll's).</summary>
        public int Pool => Sheet.CreationPool ?? Rules.AttrCreationPoints;
        public int PointsLeft => Stats.Sheet.CreationPointsLeft(Sheet.BaseAttrs, Pool);

        public static List<OriginInfo> Origins() => Registry.Origins.Values.Select(OriginInfo.From).ToList();

        /// <summary>A new creation, starting from the first origin.</summary>
        public static Creation Start()
        {
            var c = new Creation();
            var first = Origins().FirstOrDefault();
            if (first != null) c.Choose(first.Id);
            return c;
        }

        /// <summary>Starts from an origin: its attributes, tags and traits; with <paramref name="newLook"/> its face and frame too.</summary>
        public void Choose(string originId, bool newLook = true)
        {
            var o = Origins().FirstOrDefault(x => x.Id == originId);
            if (o == null) return;
            Origin = o.Id;
            foreach (var a in Rules.Attributes) Sheet.BaseAttrs[a] = o.Attrs.TryGetValue(a, out var v) ? v : Rules.AttrBase + 2;
            Sheet.CreationPool = null;
            Sheet.Tagged = o.Tagged.Where(k => Array.IndexOf(Rules.Skills, k) >= 0).Take(Rules.TagCount).ToList();
            Sheet.Traits = o.Traits.Where(Registry.Traits.ContainsKey).Take(MaxTraits).ToList();
            if (newLook)
            {
                Look.Build = o.Frame == "broad" ? 0.4f : o.Frame == "narrow" ? -0.35f : 0f;
                Look.Muscle = o.Frame == "broad" ? 0.3f : 0f;
                var rng = new Rng(unchecked((uint)(o.AppearanceSeed * 2654435761L + 1)));
                Heritage(Bodies.Cluster(rng), rng);   // each origin someone of their own people, to change after
            }
        }

        /// <summary>The structure of the last face drawn (another face prefers another).</summary>
        public string FaceType { get; private set; }

        /// <summary>
        /// The player's people (owner, pass 9: faces from archetypes, the colouring as found among a people): the body's
        /// ancestry, a skin, hair and eyes as they come among them, and a face drawn from their archetypes for the body's
        /// sex, build and muscle. Every choice stays the player's to change after.
        /// </summary>
        public void Heritage(string cluster, Rng rng)
        {
            var mix = Bodies.Ancestry(cluster);
            if (mix == null) return;
            Look.Heritage = cluster;
            Look.Shape["body-african"] = (float)mix.Value.Af;
            Look.Shape["body-asian"] = (float)mix.Value.As;
            Look.Shape["body-caucasian"] = (float)mix.Value.Ca;
            Look.Skin = (float)Math.Clamp(Bodies.Tone(cluster) + Bodies.Normal(rng) * 0.1 + 0.1, -1, 1);   // a little sun: the work is outdoors
            Look.Undertone = (float)Math.Clamp(Bodies.Undertone(cluster) + Bodies.Normal(rng) * 0.2, -1, 1);
            Look.Freckles = Look.Skin < -0.3 && rng.Chance(0.3) ? (float)rng.Range(0.1, 0.5) : 0f;
            Look.HairColour = Looks.HairColours[Bodies.HairShade(rng, cluster)];
            Look.Eyes = rng.Chance(Bodies.LightEyes(cluster)) ? rng.Pick(new[] { "hazel", "green", "grey_green", "blue_grey", "blue", "grey" })
                : Bodies.DarkEyes(rng.Next(), SkinColour.Lightness(Look.Skin));
            NewFace(rng, null);
        }

        /// <summary>Another face of the same people, sex and build (another structure where they have more than one), far
        /// enough from the last to read as someone else.</summary>
        public void NewFace(Rng rng, IReadOnlyDictionary<string, float> previous)
        {
            var who = new Faces.Who
            {
                Male = Look.Body == "m", Age = 24, Cluster = Look.Heritage ?? "mediterranean", Build = Look.Build, Muscle = Look.Muscle,
                Hardness = 0.3,
            };
            var f = previous == null ? Faces.Draw(rng, who) : Faces.Redraw(rng, who, previous, FaceType);
            Look.Face = f.Values;
            FaceType = f.Type;
        }

        /// <summary>Makes someone from scratch (the attributes, tags and traits stay as they are, to change).</summary>
        public void Custom() => Origin = null;

        /// <summary>Rolls the attributes: each its base and a wide roll; the pool is whatever they add up to.</summary>
        public void Roll(Rng rng)
        {
            var r = Stats.Sheet.RollAttributes(rng);
            foreach (var a in Rules.Attributes) Sheet.BaseAttrs[a] = r.Attrs[a];
            Sheet.CreationPool = r.Pool;
        }

        /// <summary>Keeps the attributes as they stand (and their pool), to recall after more rolls.</summary>
        public void Keep() => Kept = new Stats.Sheet.Roll { Attrs = new Dictionary<string, int>(Sheet.BaseAttrs), Pool = Pool };

        public bool Recall()
        {
            if (Kept == null) return false;
            foreach (var a in Rules.Attributes) Sheet.BaseAttrs[a] = Kept.Value.Attrs[a];
            Sheet.CreationPool = Kept.Value.Pool;
            return true;
        }

        /// <summary>Back to the standard start: the origin's spread (or the even one), 12 points.</summary>
        public void Standard()
        {
            var o = Origin != null ? Origins().FirstOrDefault(x => x.Id == Origin) : null;
            var even = Stats.Sheet.Empty("");
            foreach (var a in Rules.Attributes) Sheet.BaseAttrs[a] = o != null && o.Attrs.TryGetValue(a, out var v) ? v : even.BaseAttrs[a];
            Sheet.CreationPool = null;
        }

        /// <summary>One point more in an attribute, from the pool (up to the creation maximum).</summary>
        public bool Raise(string attr)
        {
            if (PointsLeft <= 0 || Sheet.BaseAttrs[attr] >= Rules.AttrCreationMax) return false;
            Sheet.BaseAttrs[attr]++;
            Origin = null;
            return true;
        }

        /// <summary>One point less, back to the pool (down to the minimum).</summary>
        public bool Lower(string attr)
        {
            if (Sheet.BaseAttrs[attr] <= Rules.AttrMin) return false;
            Sheet.BaseAttrs[attr]--;
            Origin = null;
            return true;
        }

        /// <summary>Tags a skill or untags it (exactly three are tagged in the end).</summary>
        public bool Tag(string skill)
        {
            if (Sheet.Tagged.Remove(skill)) { Origin = null; return true; }
            if (Sheet.Tagged.Count >= Rules.TagCount || Array.IndexOf(Rules.Skills, skill) < 0) return false;
            Sheet.Tagged.Add(skill);
            Origin = null;
            return true;
        }

        /// <summary>Takes a trait or gives it back (at most <see cref="MaxTraits"/>).</summary>
        public bool Trait(string id)
        {
            if (Sheet.Traits.Remove(id)) { Origin = null; return true; }
            if (Sheet.Traits.Count >= MaxTraits || !Registry.Traits.ContainsKey(id)) return false;
            Sheet.Traits.Add(id);
            Origin = null;
            return true;
        }

        /// <summary>What is still to choose, as keys: name, points, tags.</summary>
        public List<string> Missing()
        {
            var l = new List<string>();
            if (string.IsNullOrWhiteSpace(Sheet.Name)) l.Add("name");
            if (PointsLeft != 0) l.Add("points");
            if (Sheet.Tagged.Count != Rules.TagCount) l.Add("tags");
            return l;
        }

        public bool Ready => Missing().Count == 0 && Stats.Sheet.ValidateCreation(Sheet).Count == 0;

        /// <summary>The player as made (null while something is missing): the sheet at full health, the look, the pronouns.</summary>
        public PlayerCharacter Finish()
        {
            if (!Ready) return null;
            var s = Sheet;
            s.Name = s.Name.Trim();
            s.Hp = Stats.Sheet.Derived(s).MaxHp;
            return new PlayerCharacter { Sheet = s, Appearance = Look.ToJson(), Pronouns = Pronouns };
        }
    }
}
