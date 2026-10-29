using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Scene;
using SecondFace.Core.World;
using SecondFace.Game.World;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.AddressableAssets.Settings.GroupSchemas;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Places as prefabs (BUILD_PLAN §6.A.5, step 20): each built place's map read by Core <see cref="PlacePlan"/> and made
    /// into Assets/SecondFace/Prefabs/places/&lt;id&gt;.prefab, Addressable at places/&lt;id&gt; in places-&lt;region&gt;, listed
    /// in World/PlaceSet.asset. Buildings are made in code from the plan, merged per building into a shell (walls,
    /// floor) and a roof (a child of its own, so an interior can open by hiding it): walls with their doorways and
    /// windows cut, trims by material (adobe parapets, lintels and vigas; brick and concrete copings and sills; timber
    /// corner posts and frames; scrap walls of mismatched sheets), flat roofs inside the parapet, patchwork tin gables
    /// and lean-tos with overhangs. Fences come from the frontier kit, a cell's bars are made; doors, shutters and
    /// every prop are kit prefabs (nested); the ground's streets and rubble are road-shader patches with ragged edges;
    /// lights and markers come from the map. Meshes are stored one asset each under Prefabs/places/&lt;id&gt;/ (rebuilt in
    /// place: the same map gives the same files).
    /// </summary>
    public static class PlaceBuilder
    {
        public const string Dir = "Assets/SecondFace/Prefabs/places";
        public const string SetPath = "Assets/SecondFace/World/PlaceSet.asset";
        /// <summary>The places built so far; the rest stand as bare pads until their kits are made.</summary>
        public static readonly string[] Ids = { "shale", "cistern9" };

        /// <summary>A place's interior map under the ground (step 21b), reached from its surface map's main exit to it.</summary>
        private static readonly Dictionary<string, string> Below = new() { ["cistern9"] = "cistern9" };

        private const string Frontier = "Assets/SecondFace/Kits/Frontier/", Furnish = "Assets/SecondFace/Kits/Furnish/", Shelter = "Assets/SecondFace/Kits/Shelter/";

        /// <summary>A map's prop kind → (model, scale). Kinds not listed are logged and skipped.</summary>
        private static readonly Dictionary<string, (string Model, float Scale)> Props = new()
        {
            ["counter"] = (Furnish + "counter.fbx", 1f), ["table"] = (Furnish + "table.fbx", 1f), ["chair"] = (Furnish + "chair.fbx", 1f),
            ["bed"] = (Furnish + "bed.fbx", 1f), ["cot"] = (Furnish + "cot.fbx", 1f), ["shelf"] = (Furnish + "shelf.fbx", 1f),
            ["stove"] = (Furnish + "stove.fbx", 1f), ["machine"] = (Furnish + "machine.fbx", 1f), ["sandbags"] = (Furnish + "sandbags.fbx", 1f),
            ["fire_barrel"] = (Furnish + "fire_barrel.fbx", 1f), ["pump"] = (Furnish + "hand_pump.fbx", 1f), ["tent"] = (Furnish + "tent.fbx", 1f),
            ["planter"] = (Furnish + "planter.fbx", 1f), ["debris"] = (Furnish + "debris.fbx", 1f), ["tire_pile"] = (Furnish + "tire_pile.fbx", 1f),
            ["car_wreck"] = (Furnish + "car_wreck.fbx", 1f), ["campfire"] = (Furnish + "campfire.fbx", 1f), ["wagon"] = (Furnish + "wagon.fbx", 1f),
            ["blanket"] = (Furnish + "blanket.fbx", 1f), ["vault_door"] = (Furnish + "vault_door.fbx", 1f),
            ["barrel"] = (Frontier + "barrel_rust.fbx", 1f), ["barrel_rust"] = (Frontier + "barrel_rust.fbx", 1f), ["crate"] = (Frontier + "crate_stack.fbx", 1f),
            ["lamp_post"] = (Frontier + "lamp_post.fbx", 1f), ["sign"] = (Frontier + "sign_post.fbx", 1f), ["tank"] = (Frontier + "water_tank.fbx", 1f),
            ["windpump"] = (Frontier + "windpump.fbx", 1f), ["fence_post"] = (Frontier + "fence_post.fbx", 1f),
            ["locker"] = (Shelter + "locker.fbx", 1f), ["terminal"] = (Shelter + "terminal.fbx", 1f), ["pipe_h"] = (Shelter + "pipe_straight.fbx", 1f),
            ["dead_tree"] = (ModelLibrary.Dir + "/dead_tree_trunk.fbx", 1f), ["rock"] = (ModelLibrary.Dir + "/boulder_01.fbx", 1f),
            ["rock_small"] = (ModelLibrary.Dir + "/namaqualand_rocks_01_v1.fbx", 1f), ["cactus"] = (ModelLibrary.Dir + "/quiver_tree_02.fbx", 0.6f),
        };

        /// <summary>Wall thickness by material, metres.</summary>
        private static float Thickness(string kind) => kind switch
        {
            "adobe" => 0.45f, "brick" => 0.3f, "concrete" => 0.3f, "wood" => 0.18f, "rock" => 0.8f, _ => 0.1f,
        };

        /// <summary>A wall's library material.</summary>
        private static string WallMaterial(string kind) => kind switch
        {
            "adobe" => "adobe", "brick" => "brick", "concrete" => "concrete_wall", "wood" => "planks", "rock" => "rock", "metal" => "steel_painted", _ => "scrap",
        };

        private static string FloorMaterial(string floor) => floor switch
        {
            "wood" => "wood_floor", "concrete" => "concrete", "metal" => "metal_plate", "tile" => "tiles", "grate" => "grate", _ => "scrub_soil",
        };

        [MenuItem("Second Face/Build places")]
        public static PlaceSet Build()
        {
            var mapsPath = "Assets/StreamingAssets/content/maps.json";
            if (!File.Exists(mapsPath)) { Debug.LogWarning("PlaceBuilder: no content export (npm run export)"); return null; }
            var maps = JObject.Parse(File.ReadAllText(mapsPath));
            var layout = WorldLayout.Read(File.ReadAllText("Assets/StreamingAssets/world/places.json"), File.ReadAllText("Assets/StreamingAssets/world/roads.json"));
            var settings = AddressableAssetSettingsDefaultObject.GetSettings(true);
            var entries = new List<PlaceSet.Entry>();
            foreach (var id in Ids)
            {
                if (!layout.Places.TryGetValue(id, out var info) || info.Map == null || maps[info.Map] == null) { Debug.LogWarning($"PlaceBuilder: {id} has no map"); continue; }
                var belowId = Below.TryGetValue(id, out var bm) ? bm : null;
                var prefab = Make(id, maps[info.Map].ToObject<MapDef>(), belowId != null ? maps[belowId]?.ToObject<MapDef>() : null);
                var group = Group(settings, $"places-{info.Region}");
                var entry = settings.CreateOrMoveEntry(AssetDatabase.AssetPathToGUID(AssetDatabase.GetAssetPath(prefab)), group, false, false);
                entry.address = $"places/{id}";
                EditorUtility.SetDirty(group);
                entries.Add(new PlaceSet.Entry { Id = id, Address = entry.address });
            }
            var set = AssetDatabase.LoadAssetAtPath<PlaceSet>(SetPath);
            var fresh = set == null;
            if (fresh) set = ScriptableObject.CreateInstance<PlaceSet>();
            set.Entries = entries.ToArray();
            Directory.CreateDirectory(Path.GetDirectoryName(SetPath));
            if (fresh) AssetDatabase.CreateAsset(set, SetPath); else EditorUtility.SetDirty(set);
            AssetDatabase.SaveAssets();
            return set;
        }

        private static AddressableAssetGroup Group(AddressableAssetSettings settings, string name)
        {
            var group = settings.FindGroup(name) ?? settings.CreateGroup(name, false, false, false, null, typeof(BundledAssetGroupSchema), typeof(ContentUpdateGroupSchema));
            var bundled = group.GetSchema<BundledAssetGroupSchema>();
            bundled.BundleMode = BundledAssetGroupSchema.BundlePackingMode.PackSeparately;
            bundled.Compression = BundledAssetGroupSchema.BundleCompressionMode.LZ4;
            bundled.BuildPath.SetVariableByName(settings, AddressableAssetSettings.kLocalBuildPath);
            bundled.LoadPath.SetVariableByName(settings, AddressableAssetSettings.kLocalLoadPath);
            return group;
        }

        // --- the prefab ------------------------------------------------------------------------------------------------

        /// <summary>A place under the ground beside its surface map (a shelter under its mouth): the surface map's main
        /// exit to the interior map (the widest) is carved through to the surface map's south edge, a ramp tunnel runs on
        /// down <see cref="Below"/>'s depth to the interior's main exit back, and the interior is built there.</summary>
        private const float BelowDepth = 10f, TunnelLength = 24f;

        private static ExitDef MainExit(MapDef map, string to) =>
            (map.Exits ?? new List<ExitDef>()).Where(e => e.To?.Location == to).OrderByDescending(e => (e.W ?? 1) * (e.H ?? 1)).FirstOrDefault();

        private static GameObject Make(string id, MapDef surfaceMap, MapDef belowMap)
        {
            var meshDir = $"{Dir}/{id}";
            Directory.CreateDirectory(meshDir);
            var stored = new HashSet<string>();
            var unknown = new Dictionary<string, int>();
            var root = new GameObject(id);
            var rng = new Hasher(Stable(id));
            ExitDef up = null, down = null;
            if (belowMap != null)
            {
                down = MainExit(surfaceMap, belowMap.Id);
                up = MainExit(belowMap, surfaceMap.Id);
                if (down == null || up == null) { Debug.LogWarning($"PlaceBuilder: {id}: no exits between {surfaceMap.Id} and {belowMap.Id}"); belowMap = null; }
                else
                {
                    // the passage from the surface door to the map's south edge, cut through whatever stands there
                    var rows = surfaceMap.Layout.ToList();
                    var floorChar = surfaceMap.Legend.First(kv => kv.Value.Wall == null && kv.Value.Floor == "concrete").Key[0];
                    for (var j = down.Y + (down.H ?? 1); j < rows.Count; j++)
                    {
                        var row = rows[j].ToCharArray();
                        for (var i = down.X; i < down.X + (down.W ?? 1) && i < row.Length; i++) row[i] = floorChar;
                        rows[j] = new string(row);
                    }
                    surfaceMap.Layout = rows;
                }
            }
            var plan = PlacePlan.Build(surfaceMap);
            var navMin = new Vector3(-plan.Width / 2 - 12f, -6f, -plan.Depth / 2 - 12f);
            var navMax = new Vector3(plan.Width / 2 + 12f, 34f, plan.Depth / 2 + 12f);
            Layer(root.transform, plan, meshDir, "", stored, unknown, rng, false);
            var summary = $"{plan.Rooms.Count} buildings, {plan.Walls.Count} walls ({plan.Walls.Sum(w => w.Openings.Count)} openings), {plan.Fences.Count} fences, {plan.Items.Count} props, {plan.Lamps.Count} lights";
            if (belowMap != null)
            {
                var below = PlacePlan.Build(belowMap);
                // the surface door's middle and the south edge, the interior door's middle and its north edge
                var (doorX, _) = plan.Centre(down.X + ((down.W ?? 1) - 1) / 2.0, down.Y);
                var zEdge = -plan.Depth / 2;
                var (innerX, innerZ) = below.Centre(up.X + ((up.W ?? 1) - 1) / 2.0, 0);
                var innerEdge = innerZ + PlacePlan.Tile / 2;
                var zEnd = zEdge - TunnelLength;
                var offset = new Vector3(doorX - innerX, -BelowDepth, zEnd - innerEdge);
                var holder = Child(root.transform, "below");
                holder.localPosition = offset;
                Layer(holder, below, meshDir, "below_", stored, unknown, rng.For(7000), true);
                var tunnelWidth = (down.W ?? 1) * PlacePlan.Tile - 0.6f;
                Tunnel(root.transform, new Vector3(doorX, 0, zEdge), zEnd, -BelowDepth + 0.15f, tunnelWidth, meshDir, stored);
                navMin = Vector3.Min(navMin, offset + new Vector3(-below.Width / 2 - 4f, -2f, -below.Depth / 2 - 4f));
                navMax = Vector3.Max(navMax, offset + new Vector3(below.Width / 2 + 4f, 6f, below.Depth / 2 + 4f));
                summary += $"; below: {below.Rooms.Count} rooms, {below.Walls.Count} walls, {below.Items.Count} props, {below.Lamps.Count} lights, {BelowDepth} m down a {TunnelLength} m tunnel";
            }
            // the place opens the building the player walks into; its NavMesh is built where it is put
            root.AddComponent<PlaceInteriors>();
            var nav = root.AddComponent<PlaceNav>();
            nav.Centre = (navMin + navMax) / 2; nav.Size = navMax - navMin;

            // meshes of an earlier build that this one no longer makes
            foreach (var old in Directory.GetFiles(meshDir, "*.asset").Select(p => p.Replace('\\', '/')).Where(p => !stored.Contains(p)))
                AssetDatabase.DeleteAsset(old);
            var path = $"{Dir}/{id}.prefab";
            var prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            UnityEngine.Object.DestroyImmediate(root);
            Debug.Log($"PlaceBuilder: {id}: {summary}" + (unknown.Count > 0 ? $"; no model for {string.Join(", ", unknown.Select(kv => $"{kv.Key} ×{kv.Value}"))}" : ""));
            return prefab;
        }

        /// <summary>One map's layer of a place under <paramref name="parent"/> (positions local to it): buildings (shell and
        /// roof per room), fittings, fences, ground, props, dressing, lights, markers. Under the ground
        /// (<paramref name="below"/>) its rooms open together as one building (the shelter is seen whole), its border walls
        /// have no windows, and nothing is dressed.</summary>
        private static void Layer(Transform parent, PlacePlan plan, string meshDir, string prefix, HashSet<string> stored, Dictionary<string, int> unknown, Hasher rng, bool below)
        {
            var buildings = Child(parent, "buildings");
            // one shell and one roof per room; walls that close no room in "walls"
            var shells = plan.Rooms.Select(_ => new Geo()).ToArray();
            var roofs = plan.Rooms.Select(_ => new Geo()).ToArray();
            var loose = new Geo();
            var fittings = new List<(string Model, Vector3 At, Quaternion Rot, int Room, float Open)>();
            var roofThings = new List<(string Model, Vector3 At, Quaternion Rot, int Room, float Open)>();
            for (var w = 0; w < plan.Walls.Count; w++)
            {
                var wall = plan.Walls[w];
                if (below) wall.Openings.RemoveAll(o => o.Kind == PlacePlan.OpeningKind.Window);
                var geo = wall.Room >= 0 ? shells[wall.Room] : loose;
                var room = wall.Room >= 0 ? plan.Rooms[wall.Room] : null;
                Wall(geo, wall, room, rng.For(w), fittings);
            }
            foreach (var room in plan.Rooms)
            {
                Floor(shells[room.Index], room);
                Roof(roofs[room.Index], room, plan, rng.For(1000 + room.Index), below ? null : roofThings);
            }
            // solid masses: rock as a heap of boulders, a thick wall as one block with a coping
            var rocks = new List<PlacePlan.Mass>();
            foreach (var mass in plan.Masses)
            {
                if (mass.Kind == "rock") { rocks.Add(mass); continue; }
                var size = new Vector3(mass.X1 - mass.X0, mass.Height, mass.Z1 - mass.Z0);
                var centre = new Vector3((mass.X0 + mass.X1) / 2, mass.Height / 2, (mass.Z0 + mass.Z1) / 2);
                loose.Box(centre, size, WallMaterial(mass.Kind));
                loose.Box(centre + Vector3.up * (mass.Height / 2 + 0.04f), size + new Vector3(0.06f, -mass.Height + 0.08f, 0.06f), "concrete");
            }
            // under the ground every tile stands on something: a slab under the whole map (rooms' floors lie on it)
            if (below) loose.Box(new Vector3(0, -0.05f, 0), new Vector3(plan.Width, 0.1f, plan.Depth), "concrete");
            var built = new PlaceBuilding[plan.Rooms.Count];
            PlaceBuilding whole = null;
            if (below)
            {
                // the shelter opens whole: one building over all its rooms, its ceilings and fittings gathered
                whole = parent.gameObject.AddComponent<PlaceBuilding>();
                whole.Footprint = new Vector4(-plan.Width / 2, -plan.Depth / 2, plan.Width / 2, plan.Depth / 2);
                whole.Floor = 0.15f;
                whole.Height = plan.Rooms.Count > 0 ? plan.Rooms.Max(r => r.Height) + 0.5f : PlacePlan.Storey;
                whole.Roof = Child(parent, "ceilings");
                whole.Fittings = Child(parent, "fittings_inside");
                whole.Underground = true;
            }
            for (var r = 0; r < plan.Rooms.Count; r++)
            {
                var room = plan.Rooms[r];
                var b = Child(buildings, $"building_{r}_{room.Wall}");
                Renderer(b, "shell", shells[r], $"{meshDir}/{prefix}building_{r}_shell.asset", stored, true);
                Renderer(whole != null ? whole.Roof : b, whole != null ? $"ceiling_{r}" : "roof", roofs[r], $"{meshDir}/{prefix}building_{r}_roof.asset", stored, true);
                if (whole != null) { built[r] = whole; continue; }
                var pb = b.gameObject.AddComponent<PlaceBuilding>();
                pb.Footprint = new Vector4(room.X0, room.Z0, room.X1, room.Z1);
                pb.Floor = FloorTop(room);
                pb.Height = room.Height + (room.Roof == "tin" ? 3f : 0.5f);
                pb.Roof = b.Find("roof") ?? Child(b, "roof");
                pb.Fittings = Child(b, "fittings");
                built[r] = pb;
            }
            if (!loose.Empty) Renderer(Child(parent, "walls"), "walls", loose, $"{meshDir}/{prefix}walls.asset", stored, true);

            // doors and shutters with their building, roof clutter on its roof (they hide when it opens), the rest loose
            var fitted = Child(parent, "fittings");
            foreach (var f in fittings.Select(x => (x, false)).Concat(roofThings.Select(x => (x, true))))
            {
                var (fit, onRoof) = f;
                var into = fit.Room < 0 ? fitted : onRoof ? built[fit.Room].Roof : built[fit.Room].Fittings;
                ApplyFitting(fit, into);
            }

            // fences: the frontier kit's wire fence every 2 m, posts at gates; inside a room, a cell's bars
            var fences = Child(parent, "fences");
            var bars = new Geo();
            foreach (var fence in plan.Fences)
            {
                if (fence.Room >= 0) { Bars(bars, fence, plan.Rooms[fence.Room]); continue; }
                Fence(fence, fences);
            }
            if (!bars.Empty) Renderer(fences, "bars", bars, $"{meshDir}/{prefix}bars.asset", stored, true);

            // the ground outside: streets of beaten earth, rubble, broken concrete
            var ground = Child(parent, "ground");
            foreach (var (surface, material) in new[] { ("dirt", "trail"), ("rubble", "rubble"), ("concrete", "concrete") })
            {
                var mesh = Ground(plan, surface, rng);
                if (mesh == null) continue;
                var mat = Surface(material, surface == "concrete" ? 0.5f : 0f);
                if (mat == null) continue;
                var go = Child(ground, $"ground_{surface}").gameObject;
                go.AddComponent<MeshFilter>().sharedMesh = Store($"{meshDir}/{prefix}ground_{surface}.asset", mesh, stored);
                var mr = go.AddComponent<MeshRenderer>();
                mr.sharedMaterial = mat;
                mr.shadowCastingMode = ShadowCastingMode.Off;
            }

            // props
            var props = Child(parent, "props");
            foreach (var item in plan.Items)
            {
                if (!Props.TryGetValue(item.Kind, out var src)) { unknown[item.Kind] = unknown.TryGetValue(item.Kind, out var c) ? c + 1 : 1; continue; }
                var go = Instance(src.Model, props);
                if (go == null) { unknown[item.Kind] = unknown.TryGetValue(item.Kind, out var c) ? c + 1 : 1; continue; }
                var y = item.Room >= 0 ? FloorTop(plan.Rooms[item.Room]) : 0f;
                go.transform.SetLocalPositionAndRotation(new Vector3(item.X, y, item.Z), Quaternion.Euler(0, item.Yaw, 0));
                go.transform.localScale = Vector3.one * src.Scale * item.Scale;
                if (item.Id != null) go.name = item.Id;
            }

            // what people leave against their walls, awnings over street doors, the saloon's porch
            if (!below) Dress(plan, Child(parent, "dressing"), rng.For(5000));
            if (rocks.Count > 0) Rocks(rocks, Child(parent, "rock"), rng.For(6000));

            // lights: realtime points, no shadows (BUILD_PLAN §6.A.6: ≤ 4 visible, the rest emissive)
            var lights = Child(parent, "lights");
            foreach (var l in plan.Lamps)
            {
                var go = Child(lights, "light").gameObject;
                go.transform.localPosition = new Vector3(l.X, l.Height + (l.Room >= 0 ? FloorTop(plan.Rooms[l.Room]) : 0f), l.Z);
                var light = go.AddComponent<Light>();
                light.type = LightType.Point;
                light.color = new Color(((l.Color >> 16) & 255) / 255f, ((l.Color >> 8) & 255) / 255f, (l.Color & 255) / 255f);
                light.intensity = l.Intensity;
                light.range = l.Range;
                light.shadows = LightShadows.None;
                light.lightmapBakeType = LightmapBakeType.Realtime;
            }

            // markers
            var markers = Child(parent, "markers");
            foreach (var m in plan.Markers)
            {
                var go = Child(markers, $"{m.Kind}_{m.Id}").gameObject;
                go.transform.SetLocalPositionAndRotation(new Vector3(m.X, 0, m.Z), Quaternion.Euler(0, m.Yaw, 0));
                var pm = go.AddComponent<PlaceMarker>();
                pm.Kind = m.Kind; pm.Id = m.Id; pm.Ref = m.Ref; pm.Size = new Vector2(m.W, m.D); pm.Map = plan.Id;
            }
        }

        /// <summary>The ramp tunnel from a surface door at <paramref name="from"/> (its floor level, on the surface map's
        /// edge) down to <paramref name="zEnd"/> at <paramref name="floorEnd"/>: a sloped concrete floor, walls and a ceiling,
        /// a portal frame where it leaves the surface. It opens like a building (its ceiling hides) and counts as under
        /// the ground.</summary>
        private static void Tunnel(Transform root, Vector3 from, float zEnd, float floorEnd, float width, string meshDir, HashSet<string> stored)
        {
            var go = Child(root, "tunnel");
            var shell = new Geo(); var ceiling = new Geo();
            var length = from.z - zEnd;
            var drop = from.y - floorEnd;
            var slope = Mathf.Sqrt(length * length + drop * drop);
            var tilt = Quaternion.AngleAxis(-Mathf.Atan2(drop, length) * Mathf.Rad2Deg, Vector3.right);   // the −z end down
            var mid = new Vector3(from.x, (from.y + floorEnd) / 2, (from.z + zEnd) / 2);
            const float wallT = 0.3f, height = 3.2f;
            shell.Box(mid + Vector3.down * 0.15f, new Vector3(width + 2 * wallT, 0.3f, slope + 0.6f), "concrete", tilt);
            foreach (var side in new[] { -1f, 1f })
                shell.Box(mid + new Vector3(side * (width / 2 + wallT / 2), height / 2, 0), new Vector3(wallT, height + 0.3f, slope + 0.6f), "concrete_wall", tilt);
            ceiling.Box(mid + Vector3.up * (height + 0.15f), new Vector3(width + 2 * wallT, 0.3f, slope + 0.6f), "concrete", tilt);
            // a landing at the foot, into the doorway
            shell.Box(new Vector3(from.x, floorEnd - 0.15f, zEnd - 1.0f), new Vector3(width + 2 * wallT, 0.3f, 2.4f), "concrete");
            // the portal where the tunnel leaves the surface: a frame proud of the ground
            shell.Box(from + new Vector3(0, height + 0.35f, -0.3f), new Vector3(width + 1.4f, 0.7f, 0.6f), "concrete_wall");
            foreach (var side in new[] { -1f, 1f })
                shell.Box(from + new Vector3(side * (width / 2 + 0.45f), (height + 0.7f) / 2, -0.3f), new Vector3(0.9f, height + 0.7f, 0.6f), "concrete_wall");
            Renderer(go, "shell", shell, $"{meshDir}/tunnel_shell.asset", stored, true);
            Renderer(go, "roof", ceiling, $"{meshDir}/tunnel_roof.asset", stored, true);
            var pb = go.gameObject.AddComponent<PlaceBuilding>();
            pb.Footprint = new Vector4(from.x - width / 2 - wallT, zEnd, from.x + width / 2 + wallT, from.z);
            pb.Floor = floorEnd;
            pb.Height = from.y + height;
            pb.Roof = go.Find("roof");
            pb.Fittings = Child(go, "fittings");
            pb.Underground = true;
            // the ground is cut away over the tunnel while its roof is still above it (the first third or so)
            var open = Mathf.Min(length, (height + 0.5f) / Mathf.Max(0.01f, drop / length));
            go.gameObject.AddComponent<PlaceHole>().Area = new Rect(from.x - width / 2 - wallT, from.z - open, width + 2 * wallT, open);
        }

        /// <summary>A kit fitting under its parent: a door ajar turns about its hinge (its left edge); doors stay out of
        /// the NavMesh (the doorway is walkable).</summary>
        private static void ApplyFitting((string Model, Vector3 At, Quaternion Rot, int Room, float Open) f, Transform parent)
        {
            var go = Instance(f.Model, parent);
            if (go == null) return;
            if (f.Open != 0)
            {
                var hinge = new GameObject("door").transform;
                hinge.SetParent(parent, false);
                hinge.SetLocalPositionAndRotation(f.At + f.Rot * new Vector3(-0.475f, 0, 0), f.Rot * Quaternion.Euler(0, -f.Open, 0));   // swung in
                go.transform.SetParent(hinge, false);
                go.transform.localPosition = new Vector3(0.475f, 0, 0);
                go.transform.localRotation = Quaternion.identity;
            }
            else go.transform.SetLocalPositionAndRotation(f.At, f.Rot);
            if (f.Model.EndsWith("plank_door.fbx")) go.AddComponent<NavMeshModifier>().ignoreFromBuild = true;
        }

        /// <summary>The top of a room's floor, metres: a slab a step up from the street, boards on joists higher (level
        /// with a porch). Props inside stand on it; doors and windows are cut from it.</summary>
        private static float FloorTop(PlacePlan.Room room) => room == null ? 0f : room.Floor == "wood" ? 0.3f : 0.15f;

        // --- walls -----------------------------------------------------------------------------------------------------

        private static void Wall(Geo geo, PlacePlan.Wall w, PlacePlan.Room room, Hasher rng, List<(string, Vector3, Quaternion, int, float)> fittings)
        {
            var a = new Vector3(w.Ax, 0, w.Az);
            var dir = new Vector3(w.Bx - w.Ax, 0, w.Bz - w.Az);
            var len = dir.magnitude;
            dir = len > 1e-4f ? dir / len : Vector3.right;
            var outN = w.Exterior ? new Vector3(w.OutX, 0, w.OutZ) : Vector3.Cross(Vector3.up, dir);
            var t = Thickness(w.Kind);
            var h = w.Height;
            var mat = WallMaterial(w.Kind);
            // a piece of the wall from s0 to s1 along it, y0 to y1 up, its thickness centred on the line (offset out by off)
            void Solid(float s0, float s1, float y0, float y1, string m, float thick, float off = 0)
            {
                if (s1 - s0 < 0.01f || y1 - y0 < 0.01f) return;
                var c = a + dir * ((s0 + s1) / 2) + Vector3.up * ((y0 + y1) / 2) + outN * off;
                geo.Box(c, Size(dir, s1 - s0, y1 - y0, thick), m);
            }
            var scrap = w.Kind == "scrap" || w.Kind == "metal";
            var rock = w.Kind == "rock";
            void Body(float s0, float s1, float y0, float y1)
            {
                if (rock)
                {
                    // rock is a mass, not a wall: a tile thick, ragged on top and in plan, open to the sky over a gap
                    if (y0 > 0.01f) return;
                    for (var s = s0; s < s1 - 0.01f; s += 1f)
                    {
                        var e = Mathf.Min(s1, s + 1f);
                        var top = y1 + rng.Range((int)(s * 10) + 61, -0.9f, 1.1f);
                        Solid(s, e, 0, top, "rock", PlacePlan.Tile + rng.Range((int)(s * 10) + 63, -0.3f, 0.5f), rng.Range((int)(s * 10) + 65, -0.25f, 0.25f));
                    }
                    return;
                }
                if (!scrap) { Solid(s0, s1, y0, y1, mat, t); return; }
                // mismatched sheets a metre wide: scrap, tin and rust, standing a little in and out, ragged on top
                var sheets = new[] { "scrap", "tin", "rust", w.Kind == "metal" ? "steel_painted" : "scrap" };
                for (var s = s0; s < s1 - 0.01f; s += 1f)
                {
                    var e = Mathf.Min(s1, s + 1f);
                    var k = rng.Int((int)(s * 10) + 7, sheets.Length);
                    var top = y1 >= h - 0.01f ? y1 + rng.Range((int)(s * 10) + 3, -0.18f, 0.08f) : y1;
                    Solid(s, e, y0, top, sheets[k], 0.05f, rng.Range((int)(s * 10) + 5, -0.03f, 0.03f));
                }
            }
            // openings are cut from the room's floor, not the street: a door is 2.1 m clear above the boards it opens onto
            var lift = FloorTop(room);
            var openings = w.Openings.OrderBy(o => o.At).Select(o => new PlacePlan.Opening
            {
                Kind = o.Kind, At = o.At, Width = o.Width,
                Sill = o.Sill + lift, Top = o.Kind == PlacePlan.OpeningKind.Gate ? o.Top : o.Top + lift,
            }).ToList();
            var cur = -t / 2;
            foreach (var o in openings)
            {
                float l = o.At - o.Width / 2, r = o.At + o.Width / 2;
                Body(cur, l, 0, h);
                Body(l, r, o.Top, h);
                if (o.Kind == PlacePlan.OpeningKind.Window) Body(l, r, 0, o.Sill);
                cur = r;
            }
            Body(cur, len + t / 2, 0, h);
            if (scrap)
            {
                // the timber frame behind the sheets
                for (var s = 0f; s <= len + 0.01f; s += 2f) Solid(s - 0.05f, s + 0.05f, 0, h, "planks", 0.1f, -0.08f);
                Solid(-t / 2, len + t / 2, h - 0.12f, h - 0.02f, "planks", 0.1f, -0.08f);
            }

            // trims, outside only
            var exterior = w.Exterior;
            switch (w.Kind)
            {
                case "adobe":
                    Solid(-t / 2 - 0.03f, len + t / 2 + 0.03f, h, h + 0.1f, "adobe", t + 0.06f);
                    Solid(-t / 2 - 0.04f, len + t / 2 + 0.04f, 0, 0.35f, "adobe", t + 0.08f);   // the base, thickened
                    foreach (var o in openings)
                    {
                        Solid(o.At - o.Width / 2 - 0.25f, o.At + o.Width / 2 + 0.25f, o.Top, o.Top + 0.16f, "planks", t + 0.1f);
                        if (o.Kind == PlacePlan.OpeningKind.Window) Solid(o.At - o.Width / 2 - 0.1f, o.At + o.Width / 2 + 0.1f, o.Sill - 0.06f, o.Sill, "planks", t + 0.12f);
                    }
                    // canales: timber spouts through the parapet that drain the flat roof
                    if (exterior && room != null && !LongWall(w, room) && len > 4f)
                        foreach (var s in new[] { len * 0.3f, len * 0.7f })
                            if (rng.Range((int)(s * 10) + 41, 0f, 1f) < 0.7f) Solid(s - 0.1f, s + 0.1f, h - 0.4f, h - 0.26f, "planks", 0.7f, t / 2 + 0.3f);
                    // vigas through the long walls, under the roof
                    if (exterior && room != null && LongWall(w, room))
                        for (var s = 0.6f; s < len - 0.4f; s += 0.9f)
                            if (!openings.Any(o => Mathf.Abs(o.At - s) < o.Width / 2 + 0.1f && o.Top > h - 0.8f))
                                Solid(s - 0.08f, s + 0.08f, h - 0.62f, h - 0.46f, "planks", 0.5f, t / 2 + 0.2f);
                    break;
                case "brick":
                case "concrete":
                    Solid(-t / 2 - 0.03f, len + t / 2 + 0.03f, h, h + 0.08f, "concrete", t + 0.06f);
                    foreach (var o in openings)
                    {
                        Solid(o.At - o.Width / 2 - 0.15f, o.At + o.Width / 2 + 0.15f, o.Top, o.Top + 0.12f, "concrete", t + 0.04f);
                        if (o.Kind == PlacePlan.OpeningKind.Window) Solid(o.At - o.Width / 2 - 0.08f, o.At + o.Width / 2 + 0.08f, o.Sill - 0.05f, o.Sill, "concrete", t + 0.1f);
                    }
                    break;
                case "wood":
                    foreach (var s in new[] { 0f, len }) Solid(s - 0.12f, s + 0.12f, 0, h + 0.08f, "planks", t + 0.08f);
                    Solid(-t / 2, len + t / 2, 0, 0.22f, "planks", t + 0.06f);
                    foreach (var o in openings.Where(o => o.Kind != PlacePlan.OpeningKind.Gate))
                    {
                        Solid(o.At - o.Width / 2 - 0.08f, o.At - o.Width / 2, o.Kind == PlacePlan.OpeningKind.Window ? o.Sill : 0, o.Top, "wood_floor", t + 0.06f);
                        Solid(o.At + o.Width / 2, o.At + o.Width / 2 + 0.08f, o.Kind == PlacePlan.OpeningKind.Window ? o.Sill : 0, o.Top, "wood_floor", t + 0.06f);
                        Solid(o.At - o.Width / 2 - 0.08f, o.At + o.Width / 2 + 0.08f, o.Top, o.Top + 0.1f, "wood_floor", t + 0.06f);
                    }
                    break;
            }

            // doors (kit planks, some ajar) and shutters beside windows
            foreach (var o in openings)
            {
                var at = a + dir * o.At;
                var face = Quaternion.LookRotation(-outN, Vector3.up);   // the kit's front (−z) to the outside
                if (o.Kind == PlacePlan.OpeningKind.Door && !scrap)
                {
                    var open = rng.Range((int)(o.At * 10) + 11, 0f, 1f) < 0.45f ? rng.Range((int)(o.At * 10) + 13, 35f, 75f) : 0f;
                    fittings.Add((Frontier + "plank_door.fbx", at + outN * (t / 2 - 0.06f) + Vector3.up * lift, face, w.Room, open));
                }
                if (o.Kind == PlacePlan.OpeningKind.Window && exterior && (w.Kind == "adobe" || w.Kind == "wood") && rng.Range((int)(o.At * 10) + 17, 0f, 1f) < 0.6f)
                    foreach (var side in new[] { -1f, 1f })
                        fittings.Add((Frontier + "shutter.fbx", at + dir * side * (o.Width / 2 + 0.32f) + outN * (t / 2 + 0.03f) + Vector3.up * o.Sill, face, w.Room, 0f));
            }
        }

        /// <summary>Boulder scans for rock: rock on a map is a cliff or an outcrop, not a wall; each mass is filled with
        /// boulders 2.4 m apart (jittered), turned and tilted at random, scaled to fill their cell and reach the mass's
        /// height, sunk a little into the ground.</summary>
        private static readonly string[] Boulders = { "boulder_01", "rock_09", "coast_land_rocks_02", "namaqualand_boulder_03", "boulder_01" };

        private static void Rocks(List<PlacePlan.Mass> masses, Transform parent, Hasher rng)
        {
            var sizes = new Dictionary<string, Vector3>();
            Vector3 SizeOf(string stem)
            {
                if (sizes.TryGetValue(stem, out var v)) return v;
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(ContentPrefabs.PathFor($"{ModelLibrary.Dir}/{stem}.fbx")) ?? ContentPrefabs.Bound($"{ModelLibrary.Dir}/{stem}.fbx");
                var mf = prefab != null ? prefab.GetComponentInChildren<MeshFilter>() : null;
                v = mf != null && mf.sharedMesh != null ? Vector3.Scale(mf.sharedMesh.bounds.size, mf.transform.lossyScale) : Vector3.one;
                return sizes[stem] = v;
            }
            var n = 0;
            foreach (var m in masses)
                for (var x = m.X0 + 1.2f; x < m.X1; x += 2.4f)
                    for (var z = m.Z0 + 1.2f; z < m.Z1; z += 2.4f)
                    {
                        n++;
                        var stem = Boulders[rng.Int(n * 7 + 1, Boulders.Length)];
                        var size = SizeOf(stem);
                        var foot = Mathf.Max(0.3f, Mathf.Max(size.x, size.z));
                        var scale = rng.Range(n * 7 + 2, 2.6f, 3.6f) / foot;
                        // tall enough to make the mass's height, never a pillar
                        scale = Mathf.Max(scale, Mathf.Min(m.Height * rng.Range(n * 7 + 3, 0.8f, 1.2f) / Mathf.Max(0.3f, size.y), scale * 1.8f));
                        var go = Instance($"{ModelLibrary.Dir}/{stem}.fbx", parent);
                        if (go == null) continue;
                        var at = new Vector3(x + rng.Range(n * 7 + 4, -0.6f, 0.6f), -0.3f, z + rng.Range(n * 7 + 5, -0.6f, 0.6f));
                        go.transform.SetLocalPositionAndRotation(at, Quaternion.Euler(rng.Range(n * 7 + 6, -8f, 8f), rng.Range(n * 7 + 7, 0f, 360f), rng.Range(n * 7 + 8, -8f, 8f)));
                        go.transform.localScale = Vector3.one * scale;
                    }
        }

        /// <summary>
        /// Dressing (what the map does not place but a lived-in town has): along each building's outer walls, every 1.6 m
        /// or so a chance of a barrel, crates, a planter, scrap or tyres against the wall, a chair by a door; an awning over
        /// a door that opens onto a street; the timber hall's street front a porch. Kept clear of doorways, of the map's
        /// own props and of its markers (where people stand and walk).
        /// </summary>
        private static void Dress(PlacePlan plan, Transform parent, Hasher rng)
        {
            var taken = plan.Items.Select(i => new Vector2(i.X, i.Z)).Concat(plan.Markers.Where(m => m.W == 0).Select(m => new Vector2(m.X, m.Z))).ToList();
            bool Clear(Vector2 p, float r) => taken.All(q => (q - p).sqrMagnitude > r * r);
            string GroundAt(float x, float z)
            {
                int i = Mathf.FloorToInt((x + plan.Width / 2) / PlacePlan.Tile), j = Mathf.FloorToInt((plan.Depth / 2 - z) / PlacePlan.Tile);
                return i < 0 || j < 0 || i >= plan.Columns || j >= plan.Rows ? null : plan.Ground[j * plan.Columns + i];
            }
            void Put(string model, Vector3 at, float yaw)
            {
                var go = Instance(model, parent);
                if (go == null) return;
                go.transform.SetLocalPositionAndRotation(at, Quaternion.Euler(0, yaw, 0));
                taken.Add(new Vector2(at.x, at.z));
            }
            for (var wi = 0; wi < plan.Walls.Count; wi++)
            {
                var w = plan.Walls[wi];
                if (!w.Exterior || w.Room < 0) continue;
                var a = new Vector3(w.Ax, 0, w.Az);
                var dir = new Vector3(w.Bx - w.Ax, 0, w.Bz - w.Az);
                var len = dir.magnitude;
                if (len < 1f) continue;
                dir /= len;
                var outN = new Vector3(w.OutX, 0, w.OutZ);
                var t = Thickness(w.Kind);
                var face = Quaternion.LookRotation(-outN, Vector3.up).eulerAngles.y;
                var r = rng.For(wi);
                // awnings and porches over doors that open onto a street
                var porched = false;
                foreach (var o in w.Openings.Where(o => o.Kind == PlacePlan.OpeningKind.Door))
                {
                    var door = a + dir * o.At;
                    var street = GroundAt(door.x + outN.x * 3f, door.z + outN.z * 3f);
                    if (street != "dirt") continue;
                    if (w.Kind == "wood")
                    {
                        // the hall's front: a boardwalk porch along the whole wall
                        for (var s = 2f; s <= len - 2f + 0.01f; s += 4f) Put(Frontier + "porch.fbx", a + dir * s + outN * (t / 2), face);
                        porched = true;
                        break;
                    }
                    if (r.Range((int)(o.At * 10) + 1, 0f, 1f) < 0.6f && (w.Kind == "adobe" || w.Kind == "brick" || w.Kind == "scrap"))
                        Put(Frontier + "awning.fbx", door + outN * (t / 2), face);
                }
                if (porched) continue;
                // clutter against the wall
                var models = w.Kind == "scrap" || w.Kind == "metal"
                    ? new[] { "barrel_rust", "crate_stack", "tire_pile", "debris", "barrel_rust" }
                    : new[] { "barrel_rust", "crate_stack", "planter", "barrel_rust", "debris", "crate_stack" };
                for (var s = 0.9f; s <= len - 0.9f; s += 1.6f)
                {
                    if (w.Openings.Any(o => o.Kind != PlacePlan.OpeningKind.Window && Mathf.Abs(o.At - s) < o.Width / 2 + 1.0f)) continue;
                    if (r.Range((int)(s * 10) + 21, 0f, 1f) > 0.28f) continue;
                    var m = models[r.Int((int)(s * 10) + 23, models.Length)];
                    var path = m == "tire_pile" || m == "debris" || m == "planter" ? Furnish + m + ".fbx" : Frontier + m + ".fbx";
                    var off = t / 2 + (m == "crate_stack" ? 0.55f : m == "debris" ? 0.9f : 0.42f) + r.Range((int)(s * 10) + 25, 0f, 0.15f);
                    var at = a + dir * (s + r.Range((int)(s * 10) + 27, -0.3f, 0.3f)) + outN * off;
                    if (!Clear(new Vector2(at.x, at.z), 1.1f)) continue;
                    var ground = GroundAt(at.x, at.z);
                    if (ground == null) continue;
                    Put(path, at, face + r.Range((int)(s * 10) + 29, -40f, 40f));
                }
                // a chair by a door
                foreach (var o in w.Openings.Where(o => o.Kind == PlacePlan.OpeningKind.Door))
                {
                    if (r.Range((int)(o.At * 10) + 31, 0f, 1f) > 0.35f) continue;
                    var side = r.Range((int)(o.At * 10) + 33, 0f, 1f) < 0.5f ? -1f : 1f;
                    var at = a + dir * (o.At + side * 1.2f) + outN * (t / 2 + 0.45f);
                    if (o.At + side * 1.2f < 0.6f || o.At + side * 1.2f > len - 0.6f || !Clear(new Vector2(at.x, at.z), 0.9f)) continue;
                    Put(Furnish + "chair.fbx", at, face + r.Range((int)(o.At * 10) + 35, -25f, 25f));
                }
            }
        }

        /// <summary>A wall along the room's longer side (vigas poke out of these).</summary>
        private static bool LongWall(PlacePlan.Wall w, PlacePlan.Room room)
        {
            var alongX = Mathf.Abs(w.Bx - w.Ax) > Mathf.Abs(w.Bz - w.Az);
            return alongX == room.Width >= room.Depth;
        }

        /// <summary>A box's size in world axes for a piece lying along <paramref name="dir"/> (x or z).</summary>
        private static Vector3 Size(Vector3 dir, float along, float up, float across) =>
            Mathf.Abs(dir.x) > 0.5f ? new Vector3(along, up, across) : new Vector3(across, up, along);

        private static void Floor(Geo geo, PlacePlan.Room room)
        {
            var top = FloorTop(room);
            geo.Box(new Vector3((room.X0 + room.X1) / 2, (top - 0.1f) / 2, (room.Z0 + room.Z1) / 2),
                new Vector3(room.Width, top + 0.1f, room.Depth), FloorMaterial(room.Floor));
        }

        // --- roofs -----------------------------------------------------------------------------------------------------

        private static void Roof(Geo geo, PlacePlan.Room room, PlacePlan plan, Hasher rng, List<(string, Vector3, Quaternion, int, float)> fittings)
        {
            var t = Thickness(room.Wall);
            float x0 = room.X0, x1 = room.X1, z0 = room.Z0, z1 = room.Z1, h = room.Height;
            var cx = (x0 + x1) / 2; var cz = (z0 + z1) / 2;
            if (room.Roof == "none") return;
            if (room.Roof == "flat")
            {
                // inside the parapet: a slab, its top 0.35 m under the wall's, laid as patched panels (mud and repairs on
                // adobe; concrete, painted slabs and tin patches elsewhere) so a roof does not read as one flat sheet
                var top = h - 0.35f;
                float ix0 = x0 + t * 0.45f, ix1 = x1 - t * 0.45f, iz0 = z0 + t * 0.45f, iz1 = z1 - t * 0.45f;
                var patches = room.Wall == "adobe" ? new[] { "adobe", "adobe", "adobe", "scrub_soil", "adobe", "tin" } : new[] { "concrete", "concrete", "painted", "concrete", "tin", "concrete_wall" };
                int nx = Mathf.Max(1, Mathf.RoundToInt((ix1 - ix0) / 3.2f)), nz = Mathf.Max(1, Mathf.RoundToInt((iz1 - iz0) / 3.2f));
                for (var a = 0; a < nx; a++)
                    for (var b = 0; b < nz; b++)
                    {
                        float px0 = Mathf.Lerp(ix0, ix1, (float)a / nx), px1 = Mathf.Lerp(ix0, ix1, (float)(a + 1) / nx);
                        float pz0 = Mathf.Lerp(iz0, iz1, (float)b / nz), pz1 = Mathf.Lerp(iz0, iz1, (float)(b + 1) / nz);
                        var k = rng.Int(100 + a * 17 + b, patches.Length);
                        var lift = rng.Range(200 + a * 17 + b, 0f, 0.025f);
                        geo.Box(new Vector3((px0 + px1) / 2, top - 0.08f + lift, (pz0 + pz1) / 2), new Vector3(px1 - px0, 0.16f, pz1 - pz0), patches[k]);
                    }
                // what is kept on a flat roof: barrels, crates, a tank on a big roof, a generator, scrap
                var area = room.Width * room.Depth;
                var things = Mathf.Clamp(Mathf.RoundToInt(area / 35f), 1, 6);
                var kinds = new[] { "barrel_rust.fbx", "crate_stack.fbx", "barrel_rust.fbx" };
                for (var n = 0; n < things; n++)
                {
                    if (rng.Range(300 + n, 0f, 1f) < 0.25f) continue;
                    var model = Frontier + kinds[rng.Int(310 + n, kinds.Length)];
                    if (n == 0 && area > 150f) model = Frontier + "water_tank.fbx";
                    else if (n == 1 && area > 150f) model = Furnish + "machine.fbx";
                    else if (n == 2 && room.Wall != "adobe") model = Furnish + "debris.fbx";
                    var px = Mathf.Lerp(ix0 + 1.2f, ix1 - 1.2f, rng.Range(320 + n, 0f, 1f));
                    var pz = Mathf.Lerp(iz0 + 1.2f, iz1 - 1.2f, rng.Range(330 + n, 0f, 1f));
                    fittings?.Add((model, new Vector3(px, top, pz), Quaternion.Euler(0, Mathf.Round(rng.Range(340 + n, 0f, 4f)) * 90f + rng.Range(350 + n, -12f, 12f), 0), room.Index, 0f));
                }
                return;
            }
            // tin: a gable over timber, a lean-to over scrap; patchwork sheets with an overhang
            const float over = 0.45f;
            var alongX = room.Width >= room.Depth;
            var span = alongX ? room.Depth : room.Width;          // across the ridge
            var length = (alongX ? room.Width : room.Depth) + 2 * over;
            var sheets = new[] { "tin", "tin", "tin", "rust", "scrap", "tin" };
            Vector3 Along(float s) => alongX ? new Vector3(cx + s, 0, cz) : new Vector3(cx, 0, cz + s);
            Vector3 Across(float s) => alongX ? new Vector3(0, 0, s) : new Vector3(s, 0, 0);
            var axis = alongX ? Vector3.right : Vector3.forward;
            if (room.Wall == "wood")
            {
                const float pitch = 18f;
                var rise = (span / 2) * Mathf.Tan(pitch * Mathf.Deg2Rad);
                var slope = (span / 2 + over) / Mathf.Cos(pitch * Mathf.Deg2Rad);
                foreach (var side in new[] { -1f, 1f })
                {
                    // each slope from the ridge down past the wall: its middle half-way, tilted by the pitch
                    var mid = Across(side * (span / 2 + over) / 2) + Vector3.up * (h + rise - (span / 2 + over) / 2 * Mathf.Tan(pitch * Mathf.Deg2Rad));
                    var tilt = Quaternion.AngleAxis(side * pitch * (alongX ? 1 : -1), axis);
                    for (var s = -length / 2; s < length / 2 - 0.01f;)
                    {
                        var w = Mathf.Min(rng.Range((int)((s + 50) * 13) + (side > 0 ? 5 : 0), 0.7f, 1.3f), length / 2 - s);
                        var k = rng.Int((int)((s + 50) * 10) + (side > 0 ? 1 : 0), sheets.Length);
                        var sag = rng.Range((int)((s + 50) * 11) + (side > 0 ? 3 : 0), -0.15f, 0.05f);   // a sheet slipped down the slope
                        var slip = Across(side * sag) + Vector3.up * (-sag * Mathf.Tan(pitch * Mathf.Deg2Rad) + rng.Range((int)(s * 7) + 9, 0f, 0.02f));
                        geo.Box(Along(s + w / 2) + mid + slip, alongX ? new Vector3(w, 0.03f, slope) : new Vector3(slope, 0.03f, w), sheets[k], tilt);
                        s += w;
                    }
                }
                // the ridge cap and the gable ends (boards)
                geo.Box(Along(0) + Vector3.up * (h + rise + 0.02f), alongX ? new Vector3(length, 0.06f, 0.3f) : new Vector3(0.3f, 0.06f, length), "rust");
                foreach (var end in new[] { -1f, 1f })
                {
                    var e = Along(end * ((alongX ? room.Width : room.Depth) / 2));
                    geo.Gable(e, Across(span / 2), h, rise, "planks");
                }
                return;
            }
            {
                // lean-to: high over one long wall, falling to the other
                const float pitch = 9f;
                var rise = span * Mathf.Tan(pitch * Mathf.Deg2Rad);
                var slope = (span + 2 * over) / Mathf.Cos(pitch * Mathf.Deg2Rad);
                var tilt = Quaternion.AngleAxis(pitch * (alongX ? 1 : -1), axis);
                var mid = Vector3.up * (h + rise / 2 + 0.05f);
                for (var s = -length / 2; s < length / 2 - 0.01f;)
                {
                    var w = Mathf.Min(rng.Range((int)((s + 50) * 13) + 7, 0.7f, 1.3f), length / 2 - s);
                    var k = rng.Int((int)((s + 50) * 10) + 3, sheets.Length);
                    geo.Box(Along(s + w / 2) + mid + Vector3.up * rng.Range((int)(s * 7) + 9, 0f, 0.02f), alongX ? new Vector3(w, 0.03f, slope) : new Vector3(slope, 0.03f, w), sheets[k], tilt);
                    s += w;
                }
                // the gaps under the high side, closed with sheet
                foreach (var end in new[] { -1f, 1f })
                {
                    var e = Along(end * ((alongX ? room.Width : room.Depth) / 2));
                    geo.Wedge(e, Across(span / 2), h, rise, "scrap");
                }
            }
        }

        // --- fences ----------------------------------------------------------------------------------------------------

        private static void Fence(PlacePlan.Fence f, Transform parent)
        {
            var a = new Vector3(f.Ax, 0, f.Az);
            var dir = new Vector3(f.Bx - f.Ax, 0, f.Bz - f.Az);
            var len = dir.magnitude;
            if (len < 0.01f) { var post = Instance(Frontier + "fence_post.fbx", parent); if (post != null) post.transform.localPosition = a; return; }
            dir /= len;
            var rot = Quaternion.LookRotation(Vector3.Cross(dir, Vector3.up), Vector3.up);
            for (var s = 1f; s < len; s += 2f)
            {
                if (f.Gates.Any(g => Mathf.Abs(g.At - s) < g.Width / 2)) continue;
                var go = Instance(Frontier + "fence_wire.fbx", parent);
                if (go != null) go.transform.SetLocalPositionAndRotation(a + dir * s, rot);
            }
            foreach (var g in f.Gates)
                foreach (var side in new[] { -1f, 1f })
                {
                    var go = Instance(Frontier + "fence_post.fbx", parent);
                    if (go != null) go.transform.SetLocalPositionAndRotation(a + dir * (g.At + side * g.Width / 2), rot);
                }
        }

        /// <summary>A cell's bars: rust rods 12 cm apart from the floor to under the roof, three rails; open at its gate
        /// (the fence's ends run into the walls they meet: PlacePlan).</summary>
        private static void Bars(Geo geo, PlacePlan.Fence f, PlacePlan.Room room)
        {
            var a = new Vector3(f.Ax, 0, f.Az);
            var dir = new Vector3(f.Bx - f.Ax, 0, f.Bz - f.Az);
            var len = dir.magnitude;
            dir = len > 1e-4f ? dir / len : Vector3.right;
            var top = room.Height - 0.4f;
            var floor = FloorTop(room);
            for (var s = 0.06f; s <= len - 0.06f + 0.001f; s += 0.12f)
            {
                if (f.Gates.Any(g => Mathf.Abs(g.At - s) < 0.5f)) continue;
                geo.Box(a + dir * s + Vector3.up * (floor + top) / 2, new Vector3(0.025f, top - floor, 0.025f), "rust");
            }
            foreach (var y in new[] { floor + 0.1f, top - 0.05f, 1.2f })
                geo.Box(a + dir * (len / 2) + Vector3.up * y, Size(dir, len, 0.05f, 0.04f), "rust");
        }

        // --- ground ----------------------------------------------------------------------------------------------------

        /// <summary>A surface's patch over the place: a 1 m grid whose vertex alpha is the share of the surface's tiles
        /// round the vertex, broken by noise (ragged edges); only the cells it reaches. Null when the map has none.</summary>
        private static Mesh Ground(PlacePlan plan, string surface, Hasher rng)
        {
            int cols = plan.Columns, rows = plan.Rows;
            if (!plan.Ground.Any(g => g == surface)) return null;
            float W = plan.Width, D = plan.Depth;
            int nx = Mathf.RoundToInt(W) + 1, nz = Mathf.RoundToInt(D) + 1;
            float Mask(float x, float z)
            {
                // tiles round (x, z), weighted by distance (a 3 m blur)
                float sum = 0, wsum = 0;
                for (var dz = -2; dz <= 2; dz++)
                    for (var dx = -2; dx <= 2; dx++)
                    {
                        float px = x + dx * 0.75f, pz = z + dz * 0.75f;
                        int i = Mathf.FloorToInt((px + W / 2) / PlacePlan.Tile), j = Mathf.FloorToInt((D / 2 - pz) / PlacePlan.Tile);
                        var w = 1f / (1 + dx * dx + dz * dz);
                        wsum += w;
                        if (i >= 0 && j >= 0 && i < cols && j < rows && plan.Ground[j * cols + i] == surface) sum += w;
                    }
                return sum / wsum;
            }
            var alpha = new float[nx * nz];
            for (var j = 0; j < nz; j++)
                for (var i = 0; i < nx; i++)
                {
                    float x = i - W / 2, z = j - D / 2;
                    var n = rng.Noise(x / 3.5f, z / 3.5f) * 0.35f + rng.Noise(x / 1.1f, z / 1.1f) * 0.15f - 0.25f;
                    alpha[j * nx + i] = Mathf.SmoothStep(0, 1, Mathf.Clamp01((Mask(x, z) + n - 0.25f) / 0.45f));
                }
            var v = new List<Vector3>(); var uv = new List<Vector2>(); var col = new List<Color>(); var tris = new List<int>();
            var index = new Dictionary<int, int>();
            int V(int i, int j)
            {
                var k = j * nx + i;
                if (index.TryGetValue(k, out var at)) return at;
                at = v.Count; index[k] = at;
                float x = i - W / 2, z = j - D / 2;
                v.Add(new Vector3(x, 0.04f, z)); uv.Add(new Vector2(x, z)); col.Add(new Color(1, 1, 1, alpha[k]));
                return at;
            }
            for (var j = 0; j + 1 < nz; j++)
                for (var i = 0; i + 1 < nx; i++)
                {
                    if (alpha[j * nx + i] + alpha[j * nx + i + 1] + alpha[(j + 1) * nx + i] + alpha[(j + 1) * nx + i + 1] < 0.01f) continue;
                    int a = V(i, j), b = V(i + 1, j), c = V(i, j + 1), d = V(i + 1, j + 1);
                    // clockwise seen from above (Unity's front face)
                    tris.Add(a); tris.Add(c); tris.Add(b); tris.Add(b); tris.Add(c); tris.Add(d);
                }
            if (tris.Count == 0) return null;
            var mesh = new Mesh { name = $"ground_{surface}", indexFormat = v.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16 };
            mesh.SetVertices(v); mesh.SetUVs(0, uv); mesh.SetColors(col); mesh.SetTriangles(tris, 0);
            mesh.SetNormals(Enumerable.Repeat(Vector3.up, v.Count).ToList());
            mesh.SetTangents(Enumerable.Repeat(new Vector4(1, 0, 0, 1), v.Count).ToList());
            mesh.RecalculateBounds();
            return mesh;
        }

        /// <summary>A ground surface's material on SecondFace/Road (the road strips' shader: ragged by the texture's
        /// height at the vertex alpha's edge), from the library key; the trail's is the roads'.</summary>
        private static Material Surface(string key, float decay)
        {
            var road = Shader.Find(TerrainLayerLibrary.RoadShaderName);
            var lib = TextureLibrary.Load();
            if (road == null || !lib.TryGetValue(key, out var e)) { Debug.LogWarning($"PlaceBuilder: no ground surface {key}"); return null; }
            var path = $"{TerrainLayerLibrary.Dir}/Road_{key}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m == null) { m = new Material(road) { name = $"Road_{key}" }; AssetDatabase.CreateAsset(m, path); }
            if (m.shader != road) m.shader = road;
            m.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "d")));
            m.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "n")));
            m.SetTexture("_MaskMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "mask")));
            m.SetFloat("_Tile", e.Metres);
            m.SetFloat("_Decay", decay);
            EditorUtility.SetDirty(m);
            return m;
        }

        // --- helpers ---------------------------------------------------------------------------------------------------

        private static Transform Child(Transform parent, string name)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            return t;
        }

        private static GameObject Instance(string model, Transform parent)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(ContentPrefabs.PathFor(model)) ?? ContentPrefabs.Bound(model);
            if (prefab == null) return null;
            var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab, parent);
            return go;
        }

        private static void Renderer(Transform parent, string name, Geo geo, string path, HashSet<string> stored, bool shadows)
        {
            if (geo.Empty) return;
            var mesh = geo.ToMesh(name, out var keys);
            var go = Child(parent, name).gameObject;
            go.AddComponent<MeshFilter>().sharedMesh = Store(path, mesh, stored);
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterials = keys.Select(Weathered).ToArray();
            mr.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
        }

        public const string WeatheredDir = "Assets/SecondFace/Materials/Weathered";

        /// <summary>A library surface on SecondFace/Weathered (grime from the ground, streaks, patches, sand on top faces),
        /// for the buildings PlaceBuilder makes; the library's own URP Lit material when the shader or the key is missing.</summary>
        private static Material Weathered(string key)
        {
            var lib = TextureLibrary.Load();
            var shader = Shader.Find("SecondFace/Weathered");
            if (shader == null || !lib.TryGetValue(key, out var e)) return MaterialLibrary.Get(key);
            Directory.CreateDirectory(WeatheredDir);
            var path = $"{WeatheredDir}/{key}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var fresh = m == null;
            if (fresh) m = new Material(shader) { name = key };
            else if (m.shader != shader) m.shader = shader;
            m.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "d")));
            m.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "n")));
            m.SetTexture("_MaskMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "mask")));
            m.SetTextureScale("_BaseMap", Vector2.one / Mathf.Max(0.01f, e.Metres));
            // sheet metal streaks and gathers sand; earth and brick take the damp; floors only the dust
            var (grime, streaks, dust) = key switch
            {
                "tin" or "rust" or "scrap" or "steel_painted" => (0.3f, 0.55f, 0.5f),
                "adobe" or "brick" or "concrete_wall" or "concrete" or "painted" => (0.6f, 0.4f, 0.45f),
                "planks" => (0.5f, 0.3f, 0.4f),
                _ => (0.2f, 0.1f, 0.3f),
            };
            m.SetFloat("_GrimeAmount", grime); m.SetFloat("_Streaks", streaks); m.SetFloat("_DustAmount", dust);
            m.enableInstancing = true;
            if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
            return m;
        }

        private static Mesh Store(string path, Mesh mesh, HashSet<string> stored)
        {
            stored.Add(path);
            mesh.name = Path.GetFileNameWithoutExtension(path);
            var existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (existing == null) { AssetDatabase.CreateAsset(mesh, path); return mesh; }
            EditorUtility.CopySerialized(mesh, existing); UnityEngine.Object.DestroyImmediate(mesh); EditorUtility.SetDirty(existing);
            return existing;
        }

        /// <summary>FNV-1a of a string (string.GetHashCode may differ between runs).</summary>
        private static int Stable(string s)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var ch in s) { h ^= ch; h *= 16777619u; }
                return (int)(h & 0x7fffffff);
            }
        }

        /// <summary>A deterministic hash of the place's seed and a salt (the same map builds the same place).</summary>
        private readonly struct Hasher
        {
            private readonly int _seed;
            public Hasher(int seed) { _seed = seed; }
            public Hasher For(int salt) => new(_seed * 31 + salt * 7919);
            public float Range(int salt, float lo, float hi) => lo + (hi - lo) * Unit(salt);
            public int Int(int salt, int n) => Mathf.Min(n - 1, (int)(Unit(salt) * n));
            private float Unit(int salt)
            {
                unchecked
                {
                    var h = (uint)_seed * 374761393u + (uint)salt * 668265263u;
                    h = (h ^ (h >> 13)) * 1274126177u; h ^= h >> 16;
                    return (h & 0xffffff) / 16777216f;
                }
            }
            /// <summary>Value noise, 0..1.</summary>
            public float Noise(float x, float z)
            {
                int ix = Mathf.FloorToInt(x), iz = Mathf.FloorToInt(z);
                float fx = x - ix, fz = z - iz;
                fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
                var self = this;
                float H(int a, int b) => self.Unit(a * 73856093 ^ b * 19349663);
                return Mathf.Lerp(Mathf.Lerp(H(ix, iz), H(ix + 1, iz), fx), Mathf.Lerp(H(ix, iz + 1), H(ix + 1, iz + 1), fx), fz);
            }
        }

        /// <summary>Geometry gathered per library material: boxes, gables and wedges with UVs in metres projected on the
        /// face's dominant axis (the library tiles textures per metre), into one mesh with a submesh per material.</summary>
        private sealed class Geo
        {
            private readonly List<Vector3> _v = new(), _n = new();
            private readonly List<Vector2> _uv = new();
            private readonly Dictionary<string, List<int>> _subs = new();
            public bool Empty => _v.Count == 0;

            private List<int> Sub(string key) => _subs.TryGetValue(key, out var l) ? l : _subs[key] = new List<int>();

            private void Face(Vector3[] corners, Vector3 normal, string key)
            {
                var tris = Sub(key);
                var i0 = _v.Count;
                var ax = Mathf.Abs(normal.x) >= Mathf.Abs(normal.y) && Mathf.Abs(normal.x) >= Mathf.Abs(normal.z) ? 0 : Mathf.Abs(normal.y) >= Mathf.Abs(normal.z) ? 1 : 2;
                foreach (var p in corners)
                {
                    _v.Add(p); _n.Add(normal);
                    _uv.Add(ax == 0 ? new Vector2(p.z * Mathf.Sign(normal.x), p.y) : ax == 1 ? new Vector2(p.x, p.z) : new Vector2(-p.x * Mathf.Sign(normal.z), p.y));
                }
                // corners go round clockwise seen from outside: Unity's front face
                for (var k = 1; k + 1 < corners.Length; k++) { tris.Add(i0); tris.Add(i0 + k); tris.Add(i0 + k + 1); }
            }

            public void Box(Vector3 centre, Vector3 size, string key, Quaternion? rotation = null)
            {
                var r = rotation ?? Quaternion.identity;
                var h = size / 2;
                Vector3 P(float x, float y, float z) => centre + r * new Vector3(x * h.x, y * h.y, z * h.z);
                Face(new[] { P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1) }, r * Vector3.right, key);
                Face(new[] { P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), P(-1, -1, -1) }, r * Vector3.left, key);
                Face(new[] { P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1) }, r * Vector3.up, key);
                Face(new[] { P(-1, -1, 1), P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1) }, r * Vector3.down, key);
                Face(new[] { P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), P(-1, -1, 1) }, r * Vector3.forward, key);
                Face(new[] { P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), P(1, -1, -1) }, r * Vector3.back, key);
            }

            /// <summary>A gable end: a triangle of boards from the wall top (at <paramref name="at"/> ± <paramref name="half"/>)
            /// up to the ridge (one face: SecondFace/Weathered draws both).</summary>
            public void Gable(Vector3 at, Vector3 half, float wallTop, float rise, string key)
            {
                var a = at - half + Vector3.up * wallTop; var b = at + half + Vector3.up * wallTop; var c = at + Vector3.up * (wallTop + rise);
                Face(new[] { a, b, c }, Vector3.Cross(b - a, c - a).normalized, key);
            }

            /// <summary>A lean-to's side: the wedge between the wall top and the sloping roof (high on the −<paramref name="half"/>
            /// side; one face: SecondFace/Weathered draws both).</summary>
            public void Wedge(Vector3 at, Vector3 half, float wallTop, float rise, string key)
            {
                var a = at - half + Vector3.up * wallTop; var b = at + half + Vector3.up * wallTop; var c = at - half + Vector3.up * (wallTop + rise);
                Face(new[] { a, b, c }, Vector3.Cross(b - a, c - a).normalized, key);
            }

            public Mesh ToMesh(string name, out string[] keys)
            {
                keys = _subs.Keys.OrderBy(k => k, StringComparer.Ordinal).ToArray();
                var mesh = new Mesh { name = name, indexFormat = _v.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16 };
                mesh.SetVertices(_v); mesh.SetNormals(_n); mesh.SetUVs(0, _uv);
                mesh.subMeshCount = keys.Length;
                for (var s = 0; s < keys.Length; s++) mesh.SetTriangles(_subs[keys[s]], s);
                mesh.RecalculateTangents();
                mesh.RecalculateBounds();
                return mesh;
            }
        }
    }
}
