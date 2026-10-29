using System.Collections.Generic;
using System.Globalization;
using SecondFace.Core.Inventory;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The items drawn in ink (P5.3h, DESIGN_UNITY §5.4 "a grid of drawn items"): every item has a drawing, picked by
    /// <see cref="KeyOf"/> (a weapon by the shape in the hand, armour by what it puts on the body, ammunition by its kind,
    /// anything else by its content icon, its category as a last resort). A drawing is a few layers in a 100-unit box,
    /// written as SVG path data (M L H V Q C Z, upper case absolute, lower case relative): <c>W</c> a light wash with an
    /// ink line round it, <c>w</c> the wash alone, <c>s</c> an ink line, <c>t</c> a fine line, <c>f</c> solid ink, and
    /// circles <c>o</c> (line), <c>O</c> (wash and line) and <c>d</c> (a dot), each "cx cy r". Drawn with
    /// <see cref="Painter2D"/> at any size; the layers are parsed once.
    /// </summary>
    public static class ItemArt
    {
        public const float Line = 3.2f, Fine = 1.7f;
        public const float WashAlpha = 0.14f;

        private static readonly Dictionary<string, string> Glyphs = new()
        {
            // --- weapons, by the shape in the hand
            ["knife"] = "W M34 62 L80 14 Q88 10 86 20 L42 70 Z; t M40 62 L82 18; W M30 62 L14 80 Q10 86 16 90 Q20 94 26 88 L42 72 Z; t M26 66 L36 76 M22 70 L32 80 M18 75 L28 85",
            ["spike"] = "W M14 70 L76 12 L86 6 L80 16 L20 76 Z; W M26 82 L86 24 L96 18 L90 28 L32 88 Z; o 16 74 5; o 28 86 5; t M30 64 Q40 74 38 80",
            ["pipe"] = "W M14 80 L70 24 L78 32 L22 88 Z; W M64 20 L80 36 L90 26 L74 10 Z; o 18 84 6; t M22 74 L66 30",
            ["machete"] = "W M36 66 L78 20 Q88 12 92 16 Q90 26 80 32 L46 74 Z; t M40 64 L80 22; s M28 58 L48 78; W M38 68 L16 90 Q12 94 9 90 Q6 86 12 82 L32 62 Z; d 22 78 1.8; d 28 72 1.8",
            ["spear"] = "W M6 88 L64 30 L70 36 L12 94 Z; t M16 78 L22 84 M26 68 L32 74 M36 58 L42 64 M46 48 L52 54; W M62 38 L74 18 L94 6 L82 26 L68 44 Z; s M58 32 L72 46 M62 28 L76 42",
            ["knuckles"] = "W M14 52 Q50 64 88 52 L84 72 Q50 82 18 72 Z; o 26 42 9; o 44 38 9; o 62 38 9; o 79 42 9; d 32 66 2.2; d 50 70 2.2; d 68 66 2.2",
            ["sledge"] = "W M12 88 L58 42 L64 48 L18 94 Z; W M50 32 L72 10 L94 32 L72 54 Z; t M56 38 L78 16; t M66 48 L88 26",
            ["bottle"] = "W M36 92 L36 52 Q36 44 42 40 L44 28 L56 28 L58 40 Q64 44 64 52 L64 92 Z; w M36 64 L64 64 L64 92 L36 92 Z; t M36 64 L64 64; s M46 28 Q42 18 48 12 Q52 20 50 26 M52 28 Q58 18 54 10; t M50 10 Q44 2 52 0 Q56 4 54 8",
            ["can"] = "W M28 34 L72 34 L72 84 Q50 92 28 84 Z; s M28 34 Q50 26 72 34 Q50 42 28 34; t M28 50 Q50 58 72 50 M28 68 Q50 76 72 68; s M50 32 Q52 20 60 16 Q68 12 70 4; t M66 2 L74 6 M72 0 L70 8",
            ["zip"] = "W M12 40 L88 40 L88 50 L12 50 Z; W M22 50 L40 50 L36 86 L18 86 Z; s M40 54 Q48 56 46 66; t M43 55 L42 62; t M26 38 L26 52 M30 38 L30 52 M80 38 L80 52",
            ["revolver"] = "W M40 34 L94 34 L94 44 L40 44 Z; W M18 34 Q20 28 28 28 L46 30 L48 54 L22 56 Z; o 34 42 9; t M30 35 L30 49 M38 35 L38 49; s M18 34 L10 26 L16 24 L24 30; W M22 56 L44 54 Q38 74 34 90 L16 90 Q16 74 22 56 Z; s M44 54 Q56 56 52 68 Q46 70 40 64; t M44 56 Q46 62 42 64; s M90 34 L90 30",
            ["pistol"] = "W M14 32 L90 32 L92 34 L92 46 L14 46 Z; t M20 34 L20 44 M24 34 L24 44 M28 34 L28 44; s M40 46 L60 46 L60 52 L40 52; W M18 46 L40 46 L36 88 Q26 90 14 86 Z; s M40 52 Q54 52 52 62 Q46 66 40 60; t M42 52 Q44 58 41 60; s M86 32 L86 28 M18 32 L18 29",
            ["smg"] = "W M22 34 L74 34 L74 50 L22 50 Z; W M74 37 L92 37 L92 47 L74 47 Z; d 80 42 1.6; d 86 42 1.6; W M50 50 L60 50 L58 84 L48 84 Z; W M26 50 L38 50 L34 76 L22 76 Z; s M22 38 L6 40 L6 54 L22 48; s M38 54 Q46 56 44 62",
            ["sawnoff"] = "W M34 34 L94 34 L94 46 L34 46 Z; t M34 40 L94 40; W M24 32 L36 32 L36 50 L24 52 Z; W M24 50 L38 50 Q30 66 22 84 L8 80 Q14 62 24 50 Z; s M36 50 Q42 56 36 60; d 30 42 2",
            ["shotgun"] = "W M34 32 L98 32 L98 38 L34 38 Z; s M50 40 L90 40 M50 44 L90 44; W M56 37 L78 37 L78 49 L56 49 Z; t M60 39 L60 47 M64 39 L64 47 M68 39 L68 47 M72 39 L72 47; W M22 30 L38 30 L38 46 L22 48 Z; W M22 32 L2 40 L2 58 Q12 56 22 48 Z; s M30 48 Q36 54 32 58",
            ["rifle"] = "W M48 38 L98 38 L98 42 L48 42 Z; W M2 46 Q20 40 30 40 L70 42 L70 48 L36 48 Q30 58 20 60 L2 58 Z; s M40 42 L44 50 L42 54; d 42 56 2.6; W M36 29 L62 29 L62 36 L36 36 Z; s M33 27 L36 29 L36 36 L33 38 M65 27 L62 29 L62 36 L65 38; t M42 36 L42 39 M56 36 L56 39; s M36 48 Q42 54 38 58",
            ["carbine"] = "W M24 36 L58 36 L58 50 L24 50 Z; W M58 38 L84 38 L84 48 L58 48 Z; t M64 40 L64 46 M70 40 L70 46 M76 40 L76 46; s M84 43 L98 43 M88 43 L88 34; s M30 36 L32 28 L52 28 L54 36; W M44 50 L54 50 Q56 66 62 78 L52 82 Q46 66 44 50 Z; W M28 50 L38 50 L34 70 L24 70 Z; W M24 38 L4 40 L4 54 L24 50 Z",
            ["arc"] = "W M18 34 L70 34 L70 48 L18 48 Z; t M30 34 L30 48 M36 34 L36 48 M42 34 L42 48 M48 34 L48 48; s M70 36 L76 36 M70 46 L76 46; O 82 41 8; o 82 41 3.5; W M22 48 L40 48 L36 86 L18 84 Z; s M40 56 Q56 62 60 48; t M91 34 L95 29 M92 41 L98 41 M91 48 L95 53",
            // --- armour, by what it puts on the body
            ["coverall"] = "W M36 10 L50 16 L64 10 L80 18 L74 44 L66 40 L68 92 L54 92 L50 60 L46 92 L32 92 L34 40 L26 44 L20 18 Z; t M50 18 L50 60; s M42 12 L50 22 L58 12; t M38 46 L46 46 L46 54 L38 54 Z M34 58 L66 58",
            ["coat"] = "W M32 10 L50 18 L68 10 L84 22 L80 50 L72 46 L76 94 L54 94 L50 28 L46 94 L24 94 L28 46 L20 50 L16 22 Z; s M40 12 L48 32 L50 28 M60 12 L52 32 L50 28; t M30 56 L48 56 M52 56 L70 56; t M28 94 L30 88 M36 94 L37 89 M64 94 L63 89 M70 94 L68 88",
            ["plates"] = "W M24 20 Q50 10 76 20 L78 58 Q50 70 22 58 Z; s M50 14 L50 66; t M24 38 Q50 46 78 38; d 30 26 2; d 70 26 2; d 30 52 2; d 70 52 2; s M30 18 L26 6 M70 18 L74 6; s M22 58 L18 78 M78 58 L82 78",
            ["vest"] = "W M28 16 L42 10 L50 26 L58 10 L72 16 L74 88 L26 88 Z; W M32 52 L46 52 L46 70 L32 70 Z; W M54 52 L68 52 L68 70 L54 70 Z; t M32 57 L46 57 M54 57 L68 57; t M30 24 L42 19 M58 19 L70 24",
            ["hood"] = "W M24 62 Q20 26 50 18 Q80 26 76 62 Q74 84 50 90 Q26 84 24 62 Z; s M26 46 L74 46; O 40 51 8; O 60 51 8; t M30 72 Q50 80 70 72 M34 30 Q50 24 66 30",
            ["hardhat"] = "W M22 62 Q22 22 50 20 Q78 22 78 62 Z; W M10 62 L90 62 Q90 70 82 70 L18 70 Q10 70 10 62 Z; t M50 21 L50 62 M40 23 Q35 40 36 62 M60 23 Q65 40 64 62",
            ["mask"] = "W M28 30 Q50 18 72 30 Q78 56 66 74 Q50 88 34 74 Q22 56 28 30 Z; o 40 44 8; o 60 44 8; W M42 70 L58 70 L60 92 L40 92 Z; t M44 78 L56 78 M44 85 L56 85; s M28 36 L12 30 M72 36 L88 30",
            ["halfmask"] = "W M22 40 Q50 30 78 40 Q76 70 50 80 Q24 70 22 40 Z; t M28 48 Q50 42 72 48 M30 58 Q50 52 70 58; s M22 42 L6 36 M22 50 L6 56 M78 42 L94 36 M78 50 L94 56",
            // --- ammunition
            ["cartridge"] = "W M30 90 L30 44 L48 44 L48 90 Z; W M32 44 Q32 22 39 12 Q46 22 46 44 Z; t M30 84 L48 84; W M54 92 L54 52 L72 52 L72 92 Z; W M56 52 Q56 32 63 22 Q70 32 70 52 Z; t M54 86 L72 86",
            ["shell"] = "W M26 88 L26 28 Q36 22 46 28 L46 88 Z; w M26 72 L46 72 L46 88 L26 88 Z; t M26 72 L46 72 M30 28 L36 34 L42 28; W M54 92 L54 32 Q64 26 74 32 L74 92 Z; w M54 76 L74 76 L74 92 L54 92 Z; t M54 76 L74 76 M58 32 L64 38 L70 32",
            ["cell"] = "W M30 26 L70 26 L70 88 L30 88 Z; s M42 26 L42 16 L58 16 L58 26; f M54 36 L40 58 L50 58 L44 78 L62 52 L52 52 L58 36 Z",
            // --- consumables
            ["bandage"] = "O 44 50 26; o 44 50 10; t M44 30 Q62 32 62 50 Q60 66 44 68; W M66 58 L92 72 L86 86 L60 72 Z; t M80 72 L84 78",
            ["kit"] = "W M14 34 L86 34 L86 84 L14 84 Z; s M38 34 L38 24 L62 24 L62 34; f M46 46 L54 46 L54 54 L62 54 L62 62 L54 62 L54 70 L46 70 L46 62 L38 62 L38 54 L46 54 Z; t M14 44 L86 44",
            ["splint"] = "W M14 84 L62 12 L70 16 L22 88 Z; W M26 90 L74 18 L82 22 L34 94 Z; s M20 68 L46 82 M36 44 L62 58 M50 22 L76 36",
            ["pills"] = "W M28 88 L28 38 Q28 32 34 32 L58 32 Q64 32 64 38 L64 88 Z; W M32 20 L60 20 L60 32 L32 32 Z; t M28 50 L64 50 M28 72 L64 72; O 80 80 7; t M75 80 L85 80; O 82 64 6",
            ["vial"] = "W M40 14 L60 14 L60 20 L58 20 L58 76 Q58 90 50 90 Q42 90 42 76 L42 20 L40 20 Z; w M42 52 L58 52 L58 76 Q58 90 50 90 Q42 90 42 76 Z; t M42 52 Q50 56 58 52; f M43 8 L57 8 L58 14 L42 14 Z; s M58 26 L72 34 L68 44 L58 38",
            ["water"] = "O 50 58 30; t M22 58 Q50 68 78 58; s M44 28 L44 20 L56 20 L56 28; f M42 14 L58 14 L58 20 L42 20 Z; s M22 44 Q10 20 30 8 M78 44 Q90 20 70 8",
            ["drink"] = "W M38 92 L38 46 Q38 38 44 34 L44 16 L56 16 L56 34 Q62 38 62 46 L62 92 Z; W M38 56 L62 56 L62 76 L38 76 Z; t M42 62 L58 62 M42 68 L54 68; f M45 8 L55 8 L56 16 L44 16 Z",
            ["jerky"] = "W M12 66 Q24 40 44 46 Q60 50 76 32 Q90 36 86 52 Q70 66 52 64 Q34 64 22 80 Q10 78 12 66 Z; t M24 62 Q40 54 52 56 M50 52 Q62 50 74 42; W M30 86 Q44 72 62 76 Q76 78 88 66 Q94 74 86 82 Q72 92 56 88 Q42 86 34 94 Z",
            ["cake"] = "W M18 54 Q18 38 50 36 Q82 38 82 54 L82 64 Q82 80 50 80 Q18 80 18 64 Z; s M18 54 Q18 70 50 70 Q82 70 82 54; d 36 48 1.7; d 50 44 1.7; d 62 50 1.7; d 44 56 1.7; d 58 58 1.5",
            ["tin"] = "W M26 30 L74 30 L74 84 Q50 92 26 84 Z; s M26 30 Q50 22 74 30 Q50 38 26 30; t M26 36 Q50 44 74 36 M26 78 Q50 86 74 78; w M26 48 Q50 56 74 48 L74 66 Q50 74 26 66 Z; t M60 54 L64 62",
            // --- tools
            ["picks"] = "O 22 78 10; s M30 70 L76 24 L82 26 L80 18; s M32 74 L84 36 L90 42; s M28 66 L60 22 L66 24",
            ["wrench"] = "W M16 82 L58 40 L66 48 L24 90 Z; W M56 38 Q52 24 64 16 L70 22 L64 30 L72 38 L80 32 L86 38 Q78 50 64 46 Z; o 22 84 3",
            ["docbag"] = "W M14 44 Q14 32 26 32 L74 32 Q86 32 86 44 L86 86 L14 86 Z; s M38 32 Q38 18 50 18 Q62 18 62 32; f M46 30 L54 30 L54 38 L46 38 Z; s M50 52 L50 74 M39 63 L61 63",
            ["lamp"] = "W M30 86 L70 86 L66 78 L34 78 Z; W M36 78 L64 78 L62 40 L38 40 Z; f M50 70 Q42 62 50 50 Q58 62 50 70 Z; t M44 40 L44 78 M56 40 L56 78; W M36 40 L64 40 L58 30 L42 30 Z; s M42 30 Q42 14 50 14 Q58 14 58 30",
            ["wheel"] = "O 50 50 36; o 50 50 24; o 50 50 4; t M50 14 L50 20 M86 50 L80 50 M50 86 L50 80 M14 50 L20 50 M75 25 L71 29 M75 75 L71 71 M25 75 L29 71 M25 25 L29 29; t M50 30 L50 36 M66 40 L62 44",
            // --- salvage
            ["scrap"] = "W M14 60 L30 30 L60 22 L84 36 L76 62 L86 80 L52 84 L28 78 Z; t M30 30 L46 58 L76 62; o 40 40 3; o 62 34 3; o 60 72 3; d 24 64 1.4; d 70 48 1.2",
            ["wiring"] = "o 42 50 20; o 50 53 20; o 58 56 20; s M76 64 Q88 72 90 86 M24 40 Q12 28 14 14; t M90 86 L92 92 M14 14 L12 8",
            ["cloth"] = "W M12 44 L60 32 L88 46 L40 60 Z; W M12 44 L12 58 L40 74 L88 60 L88 46 L40 60 Z; t M88 60 L92 64 M80 63 L82 68 M14 58 L10 62; t M24 48 L56 40",
            ["glass"] = "W M36 92 L36 50 Q36 42 42 38 L44 18 L56 18 L58 38 Q64 42 64 50 L64 92 Z; t M42 50 L42 84; s M42 14 L58 14 L58 18 L42 18 Z",
            ["board"] = "W M12 22 L88 22 L88 80 L12 80 Z; f M24 32 L44 32 L44 46 L24 46 Z; s M56 54 L76 54 L76 70 L56 70 Z; t M44 38 L56 38 L56 54 M24 60 L48 60 L48 72 L88 72 M66 22 L66 44 L80 44; d 18 28 1.6; d 82 28 1.6; d 18 74 1.6; d 82 74 1.6",
            ["fuel"] = "W M22 26 L66 26 L78 38 L78 90 L22 90 Z; s M28 26 L28 14 L52 14 L52 26; W M66 26 L74 14 L82 18 L76 30 Z; t M30 40 L70 80 M70 40 L30 80",
            ["powder"] = "W M26 46 Q20 88 50 90 Q80 88 74 46 Q66 36 50 38 Q34 36 26 46 Z; s M36 38 Q50 30 64 38; t M40 34 L36 24 M60 34 L64 24; d 82 86 1.5; d 88 84 1.2; d 86 90 1.4; d 92 88 1",
            ["casings"] = "W M12 58 L36 46 L44 64 L20 76 Z; W M46 26 L70 20 L74 42 L50 48 Z; W M52 66 L76 60 L82 82 L58 88 Z; t M34 48 L40 60 M64 22 L67 36 M74 62 L78 76",
            // --- papers, keys and the rest
            ["order"] = "W M12 26 L88 26 L88 78 L12 78 Z; s M12 26 L50 56 L88 26; t M12 78 L40 54 M88 78 L60 54; d 50 56 7",
            ["page"] = "W M22 10 L78 10 L78 86 L70 90 L64 86 L56 90 L48 86 L40 90 L32 86 L22 90 Z; t M30 26 L70 26 M30 36 L70 36 M30 46 L66 46 M30 56 L70 56 M30 66 L58 66; t M28 10 L28 86",
            ["book"] = "W M20 16 L74 16 Q80 16 80 22 L80 86 L26 86 Q20 86 20 80 Z; s M28 16 L28 86; t M66 16 L66 86; t M80 24 L84 26 L84 88 L30 90 L26 86",
            ["photo"] = "W M16 22 L84 22 L84 80 L16 80 Z; t M22 28 L78 28 L78 74 L22 74 Z; O 50 44 7; s M38 74 Q38 56 50 54 Q62 56 62 74; s M70 80 L84 66",
            ["map"] = "W M10 24 L36 16 L64 24 L90 16 L90 76 L64 84 L36 76 L10 84 Z; t M36 16 L36 76 M64 24 L64 84; t M18 70 Q30 50 46 56 Q60 62 72 40; s M68 32 L78 42 M78 32 L68 42",
            ["key"] = "o 24 50 13; o 24 50 5; s M37 50 L88 50; s M76 50 L76 62 L82 62 L82 56 L88 56 L88 50; t M44 44 L44 56",
            ["coins"] = "W M22 66 Q22 58 50 58 Q78 58 78 66 L78 74 Q78 82 50 82 Q22 82 22 74 Z; s M22 66 Q22 74 50 74 Q78 74 78 66; W M26 48 Q26 40 54 40 Q82 40 82 48 L82 54 Q82 62 54 62 Q26 62 26 54 Z; s M26 48 Q26 56 54 56 Q82 56 82 48; o 54 48 3",
            ["ring"] = "O 50 56 22; o 50 56 15; s M42 34 L50 28 L58 34; t M33 62 L37 66",
            ["holdfast"] = "W M14 34 L86 34 L86 70 L14 70 Z; O 28 52 7; O 50 52 7; O 72 52 7; t M39 34 L39 70 M61 34 L61 70",
            ["chrome"] = "W M12 42 L88 42 L88 86 L12 86 Z; W M12 42 L22 18 L94 18 L88 42 Z; O 50 64 12; o 50 64 5; s M62 64 Q74 72 80 62",
            ["bundle"] = "W M18 36 L82 36 L82 82 L18 82 Z; s M50 36 L50 82 M18 58 L82 58; s M50 36 Q40 22 46 18 Q52 22 50 36 Q60 22 56 18",
        };

        /// <summary>The drawing for an item.</summary>
        public static string KeyOf(ItemDef d)
        {
            if (d == null) return "bundle";
            if (d.Weapon != null && !string.IsNullOrEmpty(d.Held) && Glyphs.ContainsKey(d.Held)) return d.Held;
            if (d.Armor != null)
            {
                var w = d.Wear;
                if (w?.Mask == true) return "mask";
                if (w?.Gear != null)
                    foreach (var g in w.Gear)
                        switch (g.Kind)
                        {
                            case "headwrap": return "hood";
                            case "hardhat": return "hardhat";
                            case "plates": case "harness": return "plates";
                        }
                if (w?.Garment != null) return "vest";
            }
            if (d.Ammo != null) return d.Ammo.Type == "12ga" ? "shell" : d.Ammo.Type == "cell" ? "cell" : "cartridge";
            if (!string.IsNullOrEmpty(d.Icon))
            {
                if (Glyphs.ContainsKey(d.Icon)) return d.Icon;
                if (d.Icon == "battery") return "cell";
            }
            return d.Category switch
            {
                "weapon" => "pipe", "armor" => "coat", "ammo" => "cartridge", "consumable" => "tin", "tool" => "wrench",
                "junk" => "scrap", "note" => "page", "key" => "key", _ => "bundle",
            };
        }

        public static bool Has(string key) => key != null && Glyphs.ContainsKey(key);
        public static IEnumerable<string> Keys => Glyphs.Keys;

        // --- parsing --------------------------------------------------------------------------------------------

        private enum Op { Move, Line, Quad, Cubic, Close }
        private struct Seg { public Op Op; public Vector2 A, B, C; }
        private sealed class Layer { public char Kind; public List<Seg> Path; public Vector3 Circle; }

        private static readonly Dictionary<string, List<Layer>> Parsed = new();

        private static List<Layer> Layers(string key)
        {
            if (key == null || !Glyphs.TryGetValue(key, out var src)) return null;
            if (Parsed.TryGetValue(key, out var l)) return l;
            l = new List<Layer>();
            foreach (var part in src.Split(';'))
            {
                var p = part.Trim();
                if (p.Length < 2) continue;
                var layer = new Layer { Kind = p[0] };
                var body = p.Substring(1).Trim();
                if (layer.Kind is 'o' or 'O' or 'd')
                {
                    var n = Numbers(body);
                    if (n.Count >= 3) layer.Circle = new Vector3(n[0], n[1], n[2]);
                }
                else layer.Path = Path(body);
                l.Add(layer);
            }
            Parsed[key] = l;
            return l;
        }

        private static List<float> Numbers(string s)
        {
            var l = new List<float>();
            foreach (var t in s.Split(new[] { ' ', ',' }, System.StringSplitOptions.RemoveEmptyEntries))
                if (float.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out var v)) l.Add(v);
            return l;
        }

        /// <summary>SVG path data (M L H V Q C Z, either case) to segments in the 100-unit box.</summary>
        private static List<Seg> Path(string d)
        {
            var segs = new List<Seg>();
            var tokens = new List<string>();
            var cur = new System.Text.StringBuilder();
            void Flush() { if (cur.Length > 0) { tokens.Add(cur.ToString()); cur.Clear(); } }
            foreach (var c in d)
            {
                if (char.IsLetter(c)) { Flush(); tokens.Add(c.ToString()); }
                else if (c == ' ' || c == ',') Flush();
                else if (c == '-' && cur.Length > 0) { Flush(); cur.Append(c); }
                else cur.Append(c);
            }
            Flush();
            var at = Vector2.zero;
            var start = Vector2.zero;
            var cmd = 'M';
            var i = 0;
            float N() => float.Parse(tokens[i++], CultureInfo.InvariantCulture);
            while (i < tokens.Count)
            {
                if (char.IsLetter(tokens[i][0])) cmd = tokens[i++][0];
                var rel = char.IsLower(cmd);
                var o = rel ? at : Vector2.zero;
                switch (char.ToUpperInvariant(cmd))
                {
                    case 'M':
                        at = o + new Vector2(N(), N());
                        start = at;
                        segs.Add(new Seg { Op = Op.Move, A = at });
                        cmd = rel ? 'l' : 'L';   // further pairs are lines
                        break;
                    case 'L': at = o + new Vector2(N(), N()); segs.Add(new Seg { Op = Op.Line, A = at }); break;
                    case 'H': at = new Vector2((rel ? at.x : 0) + N(), at.y); segs.Add(new Seg { Op = Op.Line, A = at }); break;
                    case 'V': at = new Vector2(at.x, (rel ? at.y : 0) + N()); segs.Add(new Seg { Op = Op.Line, A = at }); break;
                    case 'Q':
                    {
                        var c1 = o + new Vector2(N(), N());
                        at = o + new Vector2(N(), N());
                        segs.Add(new Seg { Op = Op.Quad, A = c1, B = at });
                        break;
                    }
                    case 'C':
                    {
                        var c1 = o + new Vector2(N(), N());
                        var c2 = o + new Vector2(N(), N());
                        at = o + new Vector2(N(), N());
                        segs.Add(new Seg { Op = Op.Cubic, A = c1, B = c2, C = at });
                        break;
                    }
                    case 'Z':
                        segs.Add(new Seg { Op = Op.Close });
                        at = start;
                        if (i < tokens.Count && !char.IsLetter(tokens[i][0])) i++;   // stray numbers after Z
                        break;
                    default: i++; break;
                }
            }
            return segs;
        }

        // --- drawing --------------------------------------------------------------------------------------------

        /// <summary>Draws a drawing into a rectangle (square, centred) in an ink colour.</summary>
        public static void Draw(Painter2D p, string key, Rect r, Color ink)
        {
            var layers = Layers(key) ?? Layers("bundle");
            var size = Mathf.Min(r.width, r.height);
            var k = size / 100f;
            var o = new Vector2(r.x + (r.width - size) / 2f, r.y + (r.height - size) / 2f);
            Vector2 P(Vector2 v) => o + v * k;
            var wash = new Color(ink.r, ink.g, ink.b, ink.a * WashAlpha);
            p.lineJoin = LineJoin.Round;
            p.lineCap = LineCap.Round;
            foreach (var l in layers)
            {
                p.BeginPath();
                if (l.Path != null)
                    foreach (var s in l.Path)
                        switch (s.Op)
                        {
                            case Op.Move: p.MoveTo(P(s.A)); break;
                            case Op.Line: p.LineTo(P(s.A)); break;
                            case Op.Quad: p.QuadraticCurveTo(P(s.A), P(s.B)); break;
                            case Op.Cubic: p.BezierCurveTo(P(s.A), P(s.B), P(s.C)); break;
                            case Op.Close: p.ClosePath(); break;
                        }
                else p.Arc(P(new Vector2(l.Circle.x, l.Circle.y)), l.Circle.z * k, Angle.Degrees(0f), Angle.Degrees(360f));
                switch (l.Kind)
                {
                    case 'W': case 'O':
                        p.fillColor = wash; p.Fill();
                        p.strokeColor = ink; p.lineWidth = Line * k; p.Stroke();
                        break;
                    case 'w': p.fillColor = wash; p.Fill(); break;
                    case 's': case 'o': p.strokeColor = ink; p.lineWidth = Line * k; p.Stroke(); break;
                    case 't': p.strokeColor = ink; p.lineWidth = Fine * k; p.Stroke(); break;
                    case 'f': case 'd': p.fillColor = ink; p.Fill(); break;
                }
            }
        }
    }

    /// <summary>An item's drawing as an element (it draws in its content box; it takes no touches).</summary>
    public sealed class ItemGlyph : VisualElement
    {
        private string _key;
        private Color _ink = new(0.141f, 0.125f, 0.106f);

        public ItemGlyph(string key = null)
        {
            _key = key;
            pickingMode = PickingMode.Ignore;
            AddToClassList("sf-glyph");
            generateVisualContent += ctx => ItemArt.Draw(ctx.painter2D, _key, contentRect, _ink);
        }

        public string Key { get => _key; set { if (_key == value) return; _key = value; MarkDirtyRepaint(); } }
        public Color Ink { get => _ink; set { _ink = value; MarkDirtyRepaint(); } }
    }
}
