using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SecondFace.Core.Scene;
using SecondFace.Core.World;
using SecondFace.Game.World;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The megacity kit's builder (Meridian's districts): Core <see cref="CityKit"/> raises the district as pieces; here they
    /// are merged per merge cell (<see cref="CityKit.Cell"/> m square: one renderer a cell, one draw per material it uses)
    /// and per skyline group (the near and the far ring of each sector round the district: their own renderers, casting no
    /// shadow), drawn with SecondFace/City (one material per <see cref="CityKit.Keys"/> key in
    /// Assets/SecondFace/Materials/City: the library's maps, each piece's colour in its vertices, the light patterns in
    /// uv1). Each room keeps its PlaceBuilding (its box reaching over everything on its roof, so the cutaway opens it
    /// whole); the streets are tile-true patches on SecondFace/Road with kerbs; canals and drops cut the ground
    /// (PlaceHole) with a sheet of the world's water; the map's props are the kits' (but its street lights, lightboxes and
    /// boats, which the kit makes), the yards the frontier's scenes by the district's weights; lights and markers as the
    /// frontier's. Pure layout lives in Core; nothing here decides where anything goes.
    /// </summary>
    public static partial class PlaceBuilder
    {
        public const string CityDir = "Assets/SecondFace/Materials/City";
        public const string CityShader = "SecondFace/City";

        /// <summary>A city material's library texture (null: none), its wear (grime, streaks, dust on top) and how metallic
        /// and glossy the library's mask is taken.</summary>
        private static readonly Dictionary<string, (string Tex, float Grime, float Streaks, float Dust, float Metal, float Smooth)> CityLib = new()
        {
            ["concrete"] = ("concrete_wall", 0.55f, 0.4f, 0.3f, 1f, 1f),
            ["painted"] = ("painted", 0.5f, 0.35f, 0.25f, 1f, 1f),
            ["brick"] = ("brick", 0.55f, 0.3f, 0.25f, 1f, 1f),
            ["metal"] = ("steel_painted", 0.35f, 0.5f, 0.3f, 1f, 1f),
            ["tin"] = ("tin", 0.3f, 0.55f, 0.35f, 1f, 1f),
            ["scrap"] = ("scrap", 0.3f, 0.55f, 0.35f, 1f, 1f),
            ["canvas"] = ("canvas", 0.3f, 0.2f, 0.2f, 0f, 0.6f),
            ["planks"] = ("planks", 0.45f, 0.3f, 0.3f, 1f, 1f),
            ["grate"] = ("grate", 0.3f, 0.3f, 0.2f, 1f, 1f),
            ["tiles"] = ("tiles", 0.25f, 0.1f, 0.25f, 1f, 1f),
            ["soil"] = ("grass", 0.1f, 0f, 0f, 0f, 0.5f),
            ["light"] = (null, 0.3f, 0.2f, 0.1f, 0f, 1f),
        };

        /// <summary>The street's surfaces: a map floor → the library key its patch is drawn with (SecondFace/Road).</summary>
        private static readonly Dictionary<string, string> CityGroundKeys = new()
        {
            ["asphalt"] = "asphalt", ["concrete"] = "concrete", ["tile"] = "tiles", ["metal"] = "metal_plate", ["grate"] = "grate",
            ["rubble"] = "rubble", ["dirt"] = "trail", ["wood"] = "wood_floor", ["sand"] = "sand",
        };

        /// <summary>The city's own dressing → baked props (Models/Nature), a variant picked by the seed.</summary>
        private static readonly Dictionary<string, string[]> CityProps = new()
        {
            ["shrub"] = new[] { "shrub_02", "shrub_03", "wild_rooibos_bush" },
            ["bag"] = new[] { "compost_bag_02", "cardboard_box_01" },
        };

        /// <summary>The district in its city: its own footprint, its neighbours' (the skyline is shared out between them),
        /// every place's (the towers keep clear), the roads and rails (likewise).</summary>
        private static CityKit.City City(string id, MapDef map, PlacePlan plan, CityKit.Style style, WorldLayout layout)
        {
            CityKit.Area Area(PlaceInfo p) => new(p.Id, p.Centre[0], p.Centre[1], p.Size[0], p.Size[1]);
            CityKit.Area self = null;
            var city = new List<CityKit.Area>();
            var keepOut = new List<CityKit.Area>();
            var ways = new List<CityKit.Way>();
            if (layout != null && layout.Places.TryGetValue(id, out var me))
            {
                self = Area(me);
                foreach (var p in layout.Places.Values.OrderBy(p => p.Id, StringComparer.Ordinal))
                {
                    if (p.Centre == null || p.Size == null) continue;
                    keepOut.Add(Area(p));
                    if (p.Region == me.Region && p.Map != null && CityKit.StyleFor(p.Map) != null) city.Add(Area(p));
                }
                foreach (var w in layout.Roads.Concat(layout.Rails).Concat(layout.Rivers))
                    for (var k = 0; k + 1 < w.Points.Count; k++)
                        ways.Add(new CityKit.Way(w.Points[k][0], w.Points[k][1], w.Points[k + 1][0], w.Points[k + 1][1], w.Width / 2));
            }
            return CityKit.Build(plan, map, style, (int)(map.Seed ?? 1909), self, city, keepOut, ways);
        }

        /// <summary>The district under <paramref name="parent"/>: buildings (their cutaway boxes), the merged cells and
        /// skyline, the street, the water, props, yards, lights, markers.</summary>
        private static void CityLayer(Transform parent, PlacePlan plan, CityKit.City city, string meshDir, HashSet<string> stored, Dictionary<string, int> unknown)
        {
            // the buildings: a PlaceBuilding per room, its box over all its storeys and its roof's things (a roofless court,
            // the dead mall's, is the open air: no building opens round it; the see-through keeps its walls off the player)
            var buildings = Child(parent, "buildings");
            var roofs = new Dictionary<int, Transform>();
            foreach (var room in plan.Rooms)
            {
                if (city.BlockOf(room.Index)?.Roof == "open") continue;
                var b = Child(buildings, $"building_{room.Index}_{room.Wall}");
                var pb = b.gameObject.AddComponent<PlaceBuilding>();
                pb.Footprint = new Vector4(room.X0, room.Z0, room.X1, room.Z1);
                pb.Floor = FloorTop(room);
                pb.Height = city.OpenHeight(room.Index);
                pb.Roof = Child(b, "roof");
                pb.Fittings = Child(b, "fittings");
                roofs[room.Index] = pb.Roof;
            }

            // the pieces, merged: a cell's in the place, a skyline group's beyond it
            var cells = new Dictionary<int, CityGeo>();
            foreach (var p in city.Pieces)
            {
                if (!cells.TryGetValue(p.Cell, out var geo)) cells[p.Cell] = geo = new CityGeo();
                geo.Add(p);
            }
            var cityRoot = Child(parent, "city");
            var skyline = Child(parent, "skyline");
            foreach (var cell in cells.Keys.OrderBy(k => k))
            {
                var inPlace = cell >= 0;
                var name = inPlace ? $"cell_{cell}" : $"skyline_{-1 - cell}";
                CityRenderer(inPlace ? cityRoot : skyline, name, cells[cell], $"{meshDir}/city_{name}.asset", stored, inPlace);
            }

            // the street: each surface a patch of whole tiles (crisp, as paved ground is), on the road shader
            var ground = Child(parent, "ground");
            foreach (var floor in plan.Ground.Where(g => g != null && g != "water").Distinct().OrderBy(g => g, StringComparer.Ordinal))
            {
                if (!CityGroundKeys.TryGetValue(floor, out var key)) key = "concrete";
                var mesh = TilePatch(plan, city, floor);
                if (mesh == null) continue;
                var mat = Surface(key, floor == "rubble" ? 0.3f : floor == "asphalt" ? 0.15f : 0f);
                if (mat == null) continue;
                var go = Child(ground, $"ground_{floor}").gameObject;
                go.AddComponent<MeshFilter>().sharedMesh = Store($"{meshDir}/ground_{floor}.asset", mesh, stored);
                var mr = go.AddComponent<MeshRenderer>();
                mr.sharedMaterial = mat;
                mr.shadowCastingMode = ShadowCastingMode.Off;
            }

            // water and drops: the ground cut away over them, a sheet of the world's water in the channel
            if (city.Pools.Count > 0)
            {
                var water = Child(parent, "water");
                var waterMat = AssetDatabase.LoadAssetAtPath<Material>($"{TerrainLayerLibrary.Dir}/Water.mat");
                for (var k = 0; k < city.Pools.Count; k++)
                {
                    var pool = city.Pools[k];
                    var hole = Child(water, $"hole_{k}").gameObject.AddComponent<PlaceHole>();
                    hole.Area = new Rect(pool.X0, pool.Z0, pool.X1 - pool.X0, pool.Z1 - pool.Z0);
                    if (waterMat == null) continue;
                    var go = Child(water, $"water_{k}").gameObject;
                    go.AddComponent<MeshFilter>().sharedMesh = Store($"{meshDir}/water_{k}.asset", Sheet(pool), stored);
                    var mr = go.AddComponent<MeshRenderer>();
                    mr.sharedMaterial = waterMat;
                    mr.shadowCastingMode = ShadowCastingMode.Off;
                    go.AddComponent<NavMeshModifier>().ignoreFromBuild = true;   // (a NavMesh from render meshes walks on water)
                }
                if (waterMat == null) Debug.LogWarning("PlaceBuilder: no water material (Second Face/Build terrain layers)");
            }

            // the map's props from the kits, but those the city makes (street lights, lightboxes, boats)
            var props = Child(parent, "props");
            for (var k = 0; k < plan.Items.Count; k++)
            {
                var item = plan.Items[k];
                if (CityKit.Overrides.Contains(item.Kind) || city.Afloat.Contains(k)) continue;
                if (!Props.TryGetValue(item.Kind, out var src)) { unknown[item.Kind] = unknown.TryGetValue(item.Kind, out var c) ? c + 1 : 1; continue; }
                var go = Instance(src.Model, props);
                if (go == null) { unknown[item.Kind] = unknown.TryGetValue(item.Kind, out var c) ? c + 1 : 1; continue; }
                var y = city.ItemY.TryGetValue(k, out var dy) ? dy : item.Room >= 0 ? FloorTop(plan.Rooms[item.Room]) : 0f;
                go.transform.SetLocalPositionAndRotation(new Vector3(item.X, y, item.Z), Quaternion.Euler(0, item.Yaw, 0));
                go.transform.localScale = Vector3.one * src.Scale * item.Scale;
                if (item.Id != null) go.name = item.Id;
            }
            // the city's own baked dressing (roof gardens' plants go with their roof: they hide when it opens)
            var dressing = Child(parent, "dressing");
            var n = 0;
            foreach (var p in city.Props)
            {
                n++;
                if (!CityProps.TryGetValue(p.Kind, out var keys)) continue;
                var path = Baked(keys[n % keys.Length], n);
                if (path == null) continue;
                var go = Instance(path, p.Building >= 0 && roofs.TryGetValue(p.Building, out var roof) ? roof : dressing);
                if (go == null) continue;
                // (a roof's transform is the place's: every holder under the place stands at its origin)
                go.transform.SetLocalPositionAndRotation(new Vector3(p.X, p.Y, p.Z), Quaternion.Euler(0, p.Yaw, 0));
            }
            Scenes(plan, city.Yards, Child(parent, "yards"));

            // lights: realtime points, no shadows (the rest of the city's light is emissive)
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

            var markers = Child(parent, "markers");
            foreach (var m in plan.Markers)
            {
                var go = Child(markers, $"{m.Kind}_{m.Id}").gameObject;
                go.transform.SetLocalPositionAndRotation(new Vector3(m.X, 0, m.Z), Quaternion.Euler(0, m.Yaw, 0));
                var pm = go.AddComponent<PlaceMarker>();
                pm.Kind = m.Kind; pm.Id = m.Id; pm.Ref = m.Ref; pm.Size = new Vector2(m.W, m.D); pm.Map = plan.Id;
            }
            Debug.Log($"PlaceBuilder: {plan.Id}: {cells.Count(c => c.Key >= 0)} cells, {cells.Count(c => c.Key < 0)} skyline groups, {city.Pieces.Count} pieces");
        }

        /// <summary>A surface's patch: its tiles (outside the rooms, not under water; bridges' decks included) as quads at
        /// the street's level, alpha 1 (crisp edges), UVs in metres.</summary>
        private static Mesh TilePatch(PlacePlan plan, CityKit.City city, string floor)
        {
            var v = new List<Vector3>(); var uv = new List<Vector2>(); var tris = new List<int>();
            for (var j = 0; j < plan.Rows; j++)
                for (var i = 0; i < plan.Columns; i++)
                {
                    var k = j * plan.Columns + i;
                    if (plan.Ground[k] != floor || plan.RoomAt[k] >= 0 || city.Wet[k]) continue;
                    var (cx, cz) = plan.Centre(i, j);
                    var i0 = v.Count;
                    foreach (var (dx, dz) in new[] { (-1f, -1f), (-1f, 1f), (1f, 1f), (1f, -1f) })
                    {
                        var p = new Vector3(cx + dx * PlacePlan.Tile / 2, 0.04f, cz + dz * PlacePlan.Tile / 2);
                        v.Add(p); uv.Add(new Vector2(p.x, p.z));
                    }
                    // clockwise seen from above (Unity's front face)
                    tris.Add(i0); tris.Add(i0 + 1); tris.Add(i0 + 2); tris.Add(i0); tris.Add(i0 + 2); tris.Add(i0 + 3);
                }
            if (tris.Count == 0) return null;
            var mesh = new Mesh { name = $"ground_{floor}", indexFormat = v.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16 };
            mesh.SetVertices(v); mesh.SetUVs(0, uv); mesh.SetTriangles(tris, 0);
            mesh.SetColors(Enumerable.Repeat(Color.white, v.Count).ToList());
            mesh.SetNormals(Enumerable.Repeat(Vector3.up, v.Count).ToList());
            mesh.SetTangents(Enumerable.Repeat(new Vector4(1, 0, 0, 1), v.Count).ToList());
            mesh.RecalculateBounds();
            return mesh;
        }

        /// <summary>A pool's sheet of water at its level (SecondFace/Water: uv0.x the depth under it, uv1 the flow).</summary>
        private static Mesh Sheet(CityKit.Pool pool)
        {
            var y = pool.Level;
            var v = new List<Vector3> { new(pool.X0, y, pool.Z0), new(pool.X0, y, pool.Z1), new(pool.X1, y, pool.Z1), new(pool.X1, y, pool.Z0) };
            var depth = pool.Level - pool.Floor;
            var mesh = new Mesh { name = "water" };
            mesh.SetVertices(v);
            mesh.SetUVs(0, Enumerable.Repeat(new Vector2(depth, 0), 4).ToList());
            mesh.SetUVs(1, Enumerable.Repeat(pool.Void ? new Vector2(0.15f, 0.02f) : new Vector2(0.04f, 0.01f), 4).ToList());
            mesh.SetNormals(Enumerable.Repeat(Vector3.up, 4).ToList());
            mesh.SetTriangles(new[] { 0, 1, 2, 0, 2, 3 }, 0);
            mesh.RecalculateBounds();
            return mesh;
        }

        private static void CityRenderer(Transform parent, string name, CityGeo geo, string path, HashSet<string> stored, bool shadows)
        {
            if (geo.Empty) return;
            var mesh = geo.ToMesh(name, out var keys);
            var go = Child(parent, name).gameObject;
            go.AddComponent<MeshFilter>().sharedMesh = Store(path, mesh, stored);
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterials = keys.Select(CityMaterial).ToArray();
            mr.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
        }

        /// <summary>A city material on SecondFace/City: the library's maps and the key's wear; the light material carries
        /// the patterns (no maps). Falls back to the frontier's weathered material when the shader is missing.</summary>
        private static Material CityMaterial(string key)
        {
            var shader = Shader.Find(CityShader);
            CityLib.TryGetValue(key, out var e);
            if (shader == null)
            {
                Debug.LogWarning($"PlaceBuilder: {CityShader} is missing; {key} falls back to the frontier's material");
                return Weathered(e.Tex ?? "painted");
            }
            Directory.CreateDirectory(CityDir);
            var path = $"{CityDir}/{key}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var fresh = m == null;
            if (fresh) m = new Material(shader) { name = key };
            else if (m.shader != shader) m.shader = shader;
            var lib = TextureLibrary.Load();
            if (e.Tex != null && lib.TryGetValue(e.Tex, out var entry))
            {
                m.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(e.Tex, "d")));
                m.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(e.Tex, "n")));
                m.SetTexture("_MaskMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(e.Tex, "mask")));
                m.SetTextureScale("_BaseMap", Vector2.one / Mathf.Max(0.01f, entry.Metres));
            }
            else
            {
                m.SetTexture("_BaseMap", null); m.SetTexture("_BumpMap", null); m.SetTexture("_MaskMap", null);
                m.SetTextureScale("_BaseMap", Vector2.one);
                if (e.Tex != null) Debug.LogWarning($"PlaceBuilder: no library texture {e.Tex} for the city's {key}");
            }
            m.SetFloat("_GrimeAmount", e.Grime); m.SetFloat("_Streaks", e.Streaks); m.SetFloat("_DustAmount", e.Dust);
            m.SetFloat("_Metal", e.Metal); m.SetFloat("_Smooth", e.Smooth);
            m.SetFloat("_Light", key == "light" ? 1f : 0f);
            m.SetFloat("_Emission", 4f); m.SetFloat("_EmissionDay", 0.35f);
            m.SetFloat("_GridBay", CityKit.GridBay); m.SetFloat("_GridStorey", CityKit.Storey);
            m.enableInstancing = true;
            if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
            return m;
        }

        /// <summary>The city's pieces gathered into one mesh, a submesh per material: boxes (no underside unless asked),
        /// single faces, upright prisms with a cap; UVs in metres projected on each face's dominant axis (as the frontier's
        /// Geo: the light material's patterns and the window grid read them), the piece's colour (linear) and its grime or
        /// lit share in the vertex colour, its pattern and number in uv1.</summary>
        private sealed class CityGeo
        {
            private readonly List<Vector3> _v = new(), _n = new();
            private readonly List<Vector2> _uv = new(), _x = new();
            private readonly List<Color> _c = new();
            private readonly Dictionary<string, List<int>> _subs = new();
            public bool Empty => _v.Count == 0;

            private List<int> Sub(string key) => _subs.TryGetValue(key, out var l) ? l : _subs[key] = new List<int>();

            private void Face(Vector3[] corners, Vector3 normal, string key, Color colour, Vector2 extra)
            {
                var tris = Sub(key);
                var i0 = _v.Count;
                var ax = Mathf.Abs(normal.x) >= Mathf.Abs(normal.y) && Mathf.Abs(normal.x) >= Mathf.Abs(normal.z) ? 0 : Mathf.Abs(normal.y) >= Mathf.Abs(normal.z) ? 1 : 2;
                foreach (var p in corners)
                {
                    _v.Add(p); _n.Add(normal); _c.Add(colour); _x.Add(extra);
                    _uv.Add(ax == 0 ? new Vector2(p.z * Mathf.Sign(normal.x), p.y) : ax == 1 ? new Vector2(p.x, p.z) : new Vector2(-p.x * Mathf.Sign(normal.z), p.y));
                }
                // corners go round clockwise seen from outside: Unity's front face
                for (var k = 1; k + 1 < corners.Length; k++) { tris.Add(i0); tris.Add(i0 + k); tris.Add(i0 + k + 1); }
            }

            private static Color Linear(Rgb c, float a)
            {
                var col = new Color(c.R, c.G, c.B, a);
                return QualitySettings.activeColorSpace == ColorSpace.Linear ? new Color(col.linear.r, col.linear.g, col.linear.b, a) : col;
            }

            public void Add(CityKit.Piece p)
            {
                var r = Quaternion.Euler(p.Pitch, p.Yaw, 0);
                var centre = new Vector3(p.X, p.Y, p.Z);
                var h = new Vector3(p.SX / 2, p.SY / 2, p.SZ / 2);
                var colour = Linear(p.Tint, p.A);
                var extra = new Vector2((int)p.Pattern, p.P);
                Vector3 P(float x, float y, float z) => centre + r * new Vector3(x * h.x, y * h.y, z * h.z);
                switch (p.Shape)
                {
                    case CityKit.Shape.Quad:
                        Face(new[] { P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), P(-1, -1, 1) }, r * Vector3.forward, p.Key, colour, extra);
                        return;
                    case CityKit.Shape.Prism:
                    {
                        var n = Mathf.Max(3, p.Sides);
                        Vector3 Ring(int k, float y) { var a = k * Mathf.PI * 2 / n; return P(Mathf.Cos(a), y, Mathf.Sin(a)); }
                        for (var k = 0; k < n; k++)
                        {
                            var mid = (k + 0.5f) * Mathf.PI * 2 / n;
                            var normal = r * new Vector3(Mathf.Cos(mid), 0, Mathf.Sin(mid));
                            Face(new[] { Ring(k, -1), Ring(k, 1), Ring(k + 1, 1), Ring(k + 1, -1) }, normal, p.Key, colour, extra);
                        }
                        var cap = new Vector3[n];
                        for (var k = 0; k < n; k++) cap[k] = Ring(n - 1 - k, 1);
                        Face(cap, r * Vector3.up, p.Key, colour, extra);
                        return;
                    }
                }
                Face(new[] { P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1) }, r * Vector3.right, p.Key, colour, extra);
                Face(new[] { P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), P(-1, -1, -1) }, r * Vector3.left, p.Key, colour, extra);
                if (p.TopKey != null)
                    Face(new[] { P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1) }, r * Vector3.up, p.TopKey, Linear(p.Tint * 0.85f, 0.6f), new Vector2(-1, 0));
                else Face(new[] { P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1) }, r * Vector3.up, p.Key, colour, extra);
                if (p.Bottom) Face(new[] { P(-1, -1, 1), P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1) }, r * Vector3.down, p.Key, colour, extra);
                Face(new[] { P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), P(-1, -1, 1) }, r * Vector3.forward, p.Key, colour, extra);
                Face(new[] { P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), P(1, -1, -1) }, r * Vector3.back, p.Key, colour, extra);
            }

            public Mesh ToMesh(string name, out string[] keys)
            {
                keys = _subs.Keys.OrderBy(k => k, StringComparer.Ordinal).ToArray();
                var mesh = new Mesh { name = name, indexFormat = _v.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16 };
                mesh.SetVertices(_v); mesh.SetNormals(_n); mesh.SetUVs(0, _uv); mesh.SetUVs(1, _x); mesh.SetColors(_c);
                mesh.subMeshCount = keys.Length;
                for (var s = 0; s < keys.Length; s++) mesh.SetTriangles(_subs[keys[s]], s);
                mesh.RecalculateTangents();
                mesh.RecalculateBounds();
                return mesh;
            }
        }
    }
}
