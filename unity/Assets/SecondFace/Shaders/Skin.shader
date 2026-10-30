// The player's skin (BUILD_PLAN §6.D, P4 step 3; the aged blend P4.9): URP PBR (main light with shadows, additional lights, screen-space
// occlusion, fog) like the people's Lit skin (albedo, smoothness in the albedo's alpha, normal map), plus the wardrobe's
// hiding: each body vertex carries its MakeHuman base index in uv1 as (i % 128, i / 128); _HiddenMask is a 128 x 128 R8
// mask of the base vertices the worn garments cover (written by Game.People.Wardrobe on equip). The vertex reads its texel
// and every pass clips where the interpolated mask passes one half, so skin under clothes neither shows through nor
// writes depth. The look made at creation (P5.3i): _Tone darker or lighter than the bake, _Undertone warmer or rosier,
// _Freckles, and a scar and a tattoo drawn in the head's own frame: _RestMap holds each base vertex's rest position in
// the frame of the web game's skin painter (the eyes at (±0.36, 0.1, 0.88) head radii from its centre, baked by
// WardrobeBuild), so a mark is placed once in 3D and stays on the skin whatever the face and the animation do.
Shader "SecondFace/Skin"
{
    Properties
    {
        _BaseMap ("Albedo (A smoothness)", 2D) = "white" {}
        _BaseColor ("Tint", Color) = (1, 1, 1, 1)
        _BumpMap ("Normal", 2D) = "bump" {}
        _BumpScale ("Normal strength", Float) = 1
        _Smoothness ("Smoothness (times the albedo's alpha)", Range(0, 1)) = 1
        [NoScaleOffset] _HiddenMask ("Hidden base vertices (128 x 128)", 2D) = "black" {}
        [NoScaleOffset] _AgedMap ("Aged albedo (the photograph)", 2D) = "white" {}
        _Aged ("Aged", Range(0, 1)) = 0
        [NoScaleOffset] _RestMap ("Rest positions in the head frame (128 x 128)", 2D) = "black" {}
        _Tone ("Darker (+) or lighter (-)", Range(-1, 1)) = 0
        _Undertone ("Warmer (+) or rosier (-)", Range(-1, 1)) = 0
        _Freckles ("Freckles", Range(0, 1)) = 0
        _Scar ("Scar (-1 none)", Float) = -1
        _Tattoo ("Tattoo (-1 none)", Float) = -1
        _Beard ("Beard (-1 none)", Float) = -1
        _BeardColour ("Beard colour", Color) = (0.12, 0.09, 0.07, 1)
        _BareSkin ("Bare skin (the bake's forehead, set by the build)", Color) = (0.75, 0.6, 0.5, 1)
        _BakeBalance ("The bake's colour balanced to the reference skin, linear (set by the build)", Vector) = (1, 1, 1, 1)
        _ScalpColour ("Shaved scalp's hair colour (A: recolour on)", Color) = (0, 0, 0, 0)
        _Bald ("Pattern balding", Range(0, 1)) = 0
        _Brow0 ("Brow: inner x, outer x, inner height, tail height", Vector) = (0.19, 0.62, 0.25, 0.22)
        _Brow1 ("Brow: peak height, peak along, inner thickness, tail thickness", Vector) = (0.27, 0.45, 0.05, 0.035)
        _BrowColour ("Brow colour (A: density, 0 none)", Color) = (0.1, 0.07, 0.05, 0)
        [NoScaleOffset] _SkinLut ("Pre-integrated scattering (N.L across, curvature up)", 2D) = "white" {}
        _Sss ("Scattering by the lookup (0: the wrap approximation)", Range(0, 1)) = 0
        _CurvatureScale ("Curvature scale", Range(0.5, 8)) = 2
        [NoScaleOffset] _PoreMap ("Pores and surface lines (tangent normals, tiled)", 2D) = "bump" {}
        _PoreTiling ("Pore tiling", Float) = 60
        _PoreScale ("Pore depth", Range(0, 1)) = 0.35
        _SharpLobe ("Share of a second, sharper specular lobe", Range(0, 0.5)) = 0.04
    }
    SubShader
    {
        Tags { "Queue" = "AlphaTest" "RenderType" = "TransparentCutout" "RenderPipeline" = "UniversalPipeline" }

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

        TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
        TEXTURE2D(_BumpMap); SAMPLER(sampler_BumpMap);
        TEXTURE2D(_HiddenMask); SAMPLER(sampler_point_clamp);
        TEXTURE2D(_AgedMap);
        TEXTURE2D(_RestMap);
        TEXTURE2D(_SkinLut); SAMPLER(sampler_SkinLut);
        TEXTURE2D(_PoreMap); SAMPLER(sampler_PoreMap);
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _BaseColor;
            half _BumpScale, _Smoothness, _Aged, _Tone, _Undertone, _Freckles;
            float _Scar, _Tattoo, _Beard;
            half4 _BeardColour;
            half4 _BareSkin, _ScalpColour, _BrowColour, _BakeBalance;
            float4 _Brow0, _Brow1;
            half _Bald;
            half _Sss, _CurvatureScale, _PoreScale, _SharpLobe;
            float _PoreTiling;
        CBUFFER_END

        struct Attributes
        {
            float4 positionOS : POSITION;
            float3 normalOS : NORMAL;
            float4 tangentOS : TANGENT;
            float2 uv : TEXCOORD0;
            float2 baseIndex : TEXCOORD1;
            UNITY_VERTEX_INPUT_INSTANCE_ID
        };

        // 1 where a worn garment covers this base vertex
        half Hidden(float2 baseIndex)
        {
            float2 texel = (floor(baseIndex + 0.5) + 0.5) / 128.0;
            return SAMPLE_TEXTURE2D_LOD(_HiddenMask, sampler_point_clamp, texel, 0).r;
        }

        // --- the look made at creation ------------------------------------------------------------------------
        float Hash3(float3 p) { p = frac(p * 0.3183099 + 0.1); p *= 17.0; return frac(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float Noise3(float3 x)
        {
            float3 i = floor(x), f = frac(x);
            f = f * f * (3.0 - 2.0 * f);
            return lerp(lerp(lerp(Hash3(i), Hash3(i + float3(1, 0, 0)), f.x), lerp(Hash3(i + float3(0, 1, 0)), Hash3(i + float3(1, 1, 0)), f.x), f.y),
                        lerp(lerp(Hash3(i + float3(0, 0, 1)), Hash3(i + float3(1, 0, 1)), f.x), lerp(Hash3(i + float3(0, 1, 1)), Hash3(i + float3(1, 1, 1)), f.x), f.y), f.z);
        }
        // tangent-plane coordinates round a point of the head (a direction from its centre), as the web painter's decal()
        float2 Local(float3 c, float3 p)
        {
            c = normalize(c);
            // only on the mark's own side of the head: projected without a limit, a mark on the neck also printed on the
            // crown behind it (P4.15)
            if (dot(normalize(p), c) < 0.6) return float2(9.0, 9.0);
            float3 tx = normalize(cross(float3(0, 1, 0), c));
            float3 ty = normalize(cross(c, tx));
            float3 d = p - c;
            return float2(dot(d, tx), dot(d, ty));
        }
        float Seg(float2 q, float4 s)
        {
            float2 a = s.xy, v = s.zw - s.xy, w = q - a;
            float t = saturate(dot(w, v) / max(dot(v, v), 1e-6));
            return length(w - v * t);
        }
        // a cut's healed line: a soft-edged stroke, a little ragged
        float Cut(float3 c, float4 s, float w, float3 p)
        {
            float d = Seg(Local(c, p), s) * (0.85 + 0.3 * Noise3(p * 60.0));
            return 1.0 - smoothstep(w * 0.45, w, d);
        }
        float Burn(float3 c, float r, float3 p)
        {
            float d = length(Local(c, p)) / r;
            return (1.0 - smoothstep(0.55, 1.0, d + 0.25 * (Noise3(p * 14.0) - 0.5))) * (0.65 + 0.35 * Noise3(p * 40.0));
        }
        // the scars (Core Looks.Scars, in order)
        float ScarAt(float id, float3 p)
        {
            if (id < 0.5) return Cut(float3(0.36, 0.32, 0.88), float4(-0.04, 0.1, 0.05, -0.08), 0.014, p);        // brow_cut
            if (id < 1.5) return Cut(float3(0.55, -0.2, 0.8), float4(-0.18, 0.1, 0.16, -0.13), 0.013, p);         // cheek_slash
            if (id < 2.5) return Cut(float3(0.07, -0.42, 0.9), float4(0, 0.07, 0.015, -0.08), 0.012, p);          // lip_split
            if (id < 3.5) return Cut(float3(-0.36, 0.1, 0.9), float4(0.02, 0.26, -0.03, -0.26), 0.013, p);        // eye_line
            if (id < 4.5) return Burn(float3(-0.7, -0.35, 0.6), 0.3, p);                                           // burn_jaw
            if (id < 5.5) return Burn(float3(0.7, 0.05, 0.6), 0.26, p);                                            // burn_cheek
            if (id < 6.5) return Cut(float3(-0.1, -0.78, 0.6), float4(-0.05, 0, 0.05, 0.015), 0.012, p);         // chin_nick
            return Cut(float3(0.0, 0.08, 1.0), float4(-0.05, 0.02, 0.04, -0.01), 0.011, p);                      // nose_break
        }
        // the tattoos (Core Looks.Tattoos, in order)
        float TattooAt(float id, float3 p)
        {
            if (id < 0.5)   // nine_neck: a Cistern's number at the side of the neck
            {
                float2 q = Local(float3(0.62, -0.95, 0.25), p);
                float ring = abs(length(q - float2(0, 0.03)) - 0.03) < 0.01 ? 1 : 0;
                float stem = abs(q.x - 0.03) < 0.01 && q.y < 0.03 && q.y > -0.07 ? 1 : 0;
                return max(ring, stem);
            }
            if (id < 1.5)   // tally_cheek: four strokes and the fifth across
            {
                float2 q = Local(float3(0.62, -0.18, 0.75), p);
                float t = 0;
                for (int k = 0; k < 4; k++) t = max(t, abs(q.x - (-0.06 + 0.04 * k)) < 0.008 && abs(q.y) < 0.06 ? 1 : 0);
                t = max(t, Seg(q, float4(-0.08, -0.05, 0.08, 0.05)) < 0.008 ? 1 : 0);
                return t;
            }
            if (id < 2.5)   // tear
            {
                float2 q = Local(float3(0.4, -0.1, 0.9), p);
                return length(float2(q.x, (q.y + 0.015) * 0.7)) < 0.025 + max(0, q.y) * 0.3 && q.y < 0.04 ? 1 : 0;
            }
            if (id < 3.5)   // chin_lines
            {
                float2 q = Local(float3(0, -0.82, 0.55), p);
                return abs(q.y) < 0.14 && (abs(q.x + 0.07) < 0.013 || abs(q.x) < 0.013 || abs(q.x - 0.07) < 0.013) ? 1 : 0;
            }
            if (id < 4.5)   // brow_dots
            {
                float2 q = Local(float3(0.36, 0.45, 0.82), p);
                return length(q - float2(-0.07, 0)) < 0.018 || length(q) < 0.018 || length(q - float2(0.07, 0)) < 0.018 ? 1 : 0;
            }
            if (id < 5.5)   // temple_spiral
            {
                float2 q = Local(float3(0.85, 0.35, 0.4), p);
                float r = length(q);
                return r < 0.16 && abs(sin(r * 55.0 - atan2(q.y, q.x))) > 0.8 ? 1 : 0;
            }
            if (id < 6.5) return p.y < -0.4 && p.y > -0.85 && p.z > 0 && abs(p.x) > 0.45 && sin(p.y * 40.0) > 0.4 ? 1 : 0;   // jaw_stripes
            return p.z > 0.3 && p.y > 0.0 && p.y < 0.2 ? 0.8 : 0;                                                            // eye_band
        }
        // a beard (Core Looks.Beards, in order) as how much of the skin is hair, in the head's frame. The face's landmarks as
        // measured in this frame (Diagnostics.HeadFrame's relief, P4.15b; the first masks took the nose's tip for the
        // mouth and grew a beard over the nose): the eyes at y +0.08, the nose from -0.1 to its tip at -0.40 and its base
        // at -0.51, about 0.2 to each side; the philtrum to -0.6; the lips from -0.61 to -0.73 (the mouth's line at -0.67)
        // and 0.22 to each side; the chin's point near -0.85, the throat below -0.95
        float BeardAt(float id, float3 p)
        {
            if (p.z < -0.05 || p.y > 0.05) return 0;
            float ax = abs(p.x);
            float front = smoothstep(0.75, 0.9, p.z);
            float lips = (1.0 - smoothstep(0.85, 1.15, length(float2(ax / 0.23, (p.y + 0.67) / 0.062)))) * front;
            float nose = (1.0 - smoothstep(0.17, 0.24, ax)) * smoothstep(-0.53, -0.49, p.y) * front;
            // the cheek line: from the mouth's corner up across the cheek to the sideburn in front of the ear, and under
            // the nose for the moustache; a soft edge, never a level line
            float side = lerp(-0.62, -0.02, pow(saturate((ax - 0.24) / 0.58), 1.4));
            float cheekLine = lerp(-0.51, side, smoothstep(0.18, 0.28, ax));
            float cheeks = 1.0 - smoothstep(cheekLine - 0.05, cheekLine + 0.05, p.y);
            float ears = 1.0 - smoothstep(0.72, 0.86, ax - 0.15 * p.z);                 // in front of the ears
            float throat = p.y < -0.95 ? saturate(1.0 - (-0.95 - p.y) * 2.5) : 1.0;
            float bare = (1.0 - lips) * (1.0 - nose);
            float jaw = cheeks * ears * throat * bare;
            float lip = (1.0 - smoothstep(0.24, 0.3, ax)) * (1.0 - smoothstep(-0.515, -0.495, p.y)) * smoothstep(-0.625, -0.6, p.y) * front * bare;   // under the nose, over the lip
            float chin = (1.0 - smoothstep(0.22, 0.3, ax)) * (1.0 - smoothstep(-0.76, -0.72, p.y)) * throat * bare;
            float grain = lerp(Noise3(p * 140.0), 0.5, saturate(length(fwidth(p)) * 140.0 - 0.4));   // its average where finer than a pixel
            if (id < 0.5) return jaw * 0.18 * (0.5 + grain);                       // stubble_light
            if (id < 1.5) return jaw * 0.32 * (0.5 + grain);                       // stubble
            if (id < 2.5) return jaw * 0.48 * (0.5 + grain);                       // stubble_heavy
            if (id < 3.5) return jaw * (0.72 + 0.28 * grain);                      // short_beard
            if (id < 4.5) return saturate(jaw * 1.15 + chin * 0.4) * (0.82 + 0.18 * grain);   // full_beard
            if (id < 5.5) return max(chin, lip) * (0.75 + 0.25 * grain);           // goatee
            return lip * (0.75 + 0.25 * grain);                                    // moustache
        }
        // --- the scalp (P4.15, owner pass 9): the head model of the build's painted stubble (tools/unity/people/hairgen.py
        // hair_weight) in the head frame, seen from a point inside the skull behind the eyes: elevation and azimuth
        // (degrees, 0 straight ahead). The bake's stubble is the base's dark brown: recoloured to the person's hair (grey,
        // fair, red), and pattern balding takes it away in Hamilton-Norwood's order, the temples and the crown first, the
        // horseshoe over the ears and round the back never.
        float Lin(float x, float x0, float x1, float y0, float y1) { return lerp(y0, y1, saturate((x - x0) / (x1 - x0))); }
        // the hairline measured on real grooms (P4.16): hairgen.py HAIRLINE_AZ / HAIRLINE_EL, the same table
        static const float HairAz[14] = { 0, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 150, 180 };
        static const float HairEl[14] = { 26, 26, 22, 14, 3, -6, -16, -6, 1, -17, -44, -48, -44, -49 };
        float Hairline(float az)
        {
            [unroll] for (int k = 1; k < 14; k++)
                if (az < HairAz[k]) return Lin(az, HairAz[k - 1], HairAz[k], HairEl[k - 1], HairEl[k]);
            return HairEl[13];
        }
        float Horseshoe(float az)
        {
            if (az < 60) return -90;
            if (az < 90) return Lin(az, 60, 90, -90, 18);
            if (az < 130) return Lin(az, 90, 130, 18, 26);
            return Lin(az, 130, 180, 26, 30);
        }
        // the scalp's masks: w where the bake painted shaved stubble, stub how much it darkened the skin there (so the stubble
        // can be taken off before the skin's tone and painted back after it in the hair's own colour: a fair skin's tone
        // lifted the stubble to white and a shaved head read as bald), bald how much of it pattern balding has taken
        void ScalpMasks(float3 p, half3 a, out half w, out half stub, out half bald)
        {
            w = 0; stub = 0; bald = 0;
            if (p.y < -0.7 || p.z > 1.0 || (_ScalpColour.a < 0.5h && _Bald < 0.001h)) return;
            float3 d = p - float3(0.0, 0.312, 0.003);
            float r = length(d);
            float e = degrees(atan2(d.y, length(d.xz)));
            float az = abs(degrees(atan2(d.x, d.z)));
            float fw = smoothstep(0.0, 1.0, (e - (Hairline(az) - 2.0)) / 8.0);
            if (az > 55 && az < 125 && e > -35 && e < 25 && r > 1.025) fw = 0;   // the ears stand out of the skull
            w = (half)fw;
            if (w < 0.01h) return;
            stub = saturate(1.0h - dot(a, half3(0.3h, 0.59h, 0.11h)) / max(dot(_BareSkin.rgb, half3(0.3h, 0.59h, 0.11h)), 0.02h));
            stub = max(stub, w * 0.4h);   // where the bake left a gap in the stubble (behind the ears), still stubble
            if (_Bald > 0.001h)
            {
                // when this point goes as _Bald rises: the temples, then the front hairline back and the crown, the top last
                float above = e - Hairline(az);
                float temple = smoothstep(0.0, 1.0, (az - 12.0) / 22.0) * (1.0 - smoothstep(0.0, 1.0, (az - 75.0) / 20.0));
                float front = 0.18 + above / 65.0 - 0.14 * temple;
                float crown = 0.28 + length(float2((180.0 - az) * 0.574, e - 52.0)) / 55.0;
                float k = min(min(front, crown), 0.92);
                // the horseshoe never goes, its upper edge soft (a hard line at the back read as a cap)
                float keep = 1.0 - smoothstep(0.0, 1.0, (e - Horseshoe(az) - 2.0) / 10.0);
                bald = (half)(smoothstep(k - 0.06, k + 0.06, _Bald) * (1.0 - keep));
            }
        }

        // --- the brows (P4.15): drawn, not baked, so they keep their colour over any skin tone (the baked brows went
        // with the tone: fair skins lost them) and take the person's style: a centre line from the inner end up to its
        // peak and down to the tail, thick at the head and tapering, the hairs rising from the inner end and lying
        // outward along the brow
        half BrowAt(float3 p)
        {
            if (_BrowColour.a < 0.01h || p.z < 0.55) return 0;
            float ax = abs(p.x);
            float t = (ax - _Brow0.x) / max(_Brow0.y - _Brow0.x, 1e-3);
            if (t < -0.15 || t > 1.12) return 0;
            float tc = saturate(t);
            float pk = clamp(_Brow1.y, 0.1, 0.9);
            float yc = tc < pk ? lerp(_Brow0.z, _Brow1.x, sin(1.5708 * tc / pk))
                               : lerp(_Brow1.x, _Brow0.w, 1.0 - cos(1.5708 * (tc - pk) / (1.0 - pk)));
            float w = lerp(_Brow1.z, _Brow1.w, tc) * 0.62 * lerp(1.0, 0.4, smoothstep(0.75, 1.05, t));
            float across = abs(p.y - yc) / max(w, 1e-3);
            float body = 1.0 - smoothstep(0.6, 1.0, across);
            float ends = smoothstep(-0.12, 0.06, t) * (1.0 - smoothstep(0.95, 1.1, t));
            float ang = lerp(1.2, 0.2, saturate(t * 2.2));
            float2 dir = float2(cos(ang), sin(ang));
            float2 q = float2(ax, p.y);
            float hairs = smoothstep(0.3, 0.75, Noise3(float3(dot(q, float2(-dir.y, dir.x)) * 260.0, dot(q, dir) * 34.0, 7.0)));
            return (half)saturate(body * ends * (0.4 + 0.6 * hairs) * lerp(0.6, 1.15, _BrowColour.a));
        }

        void Look(inout half3 a, inout half smooth, float3 p)
        {
            // the scalp: the bake's stubble off down to the bare skin (a little darker and duller than the forehead it was
            // sampled from), which takes the skin's tone below with the face; the stubble painted back after the tone
            half sw, sstub, sbald;
            ScalpMasks(p, a, sw, sstub, sbald);
            if (sw > 0.01h)
            {
                half3 bare = lerp(_BareSkin.rgb, dot(_BareSkin.rgb, half3(0.3h, 0.59h, 0.11h)).xxx, 0.15h) * (0.84h + 0.08h * (half)Noise3(p * 60.0));
                a = lerp(a, bare, sw * (_ScalpColour.a > 0.5h ? 1.0h : sbald));
                smooth = lerp(smooth, 0.38h, sw * sbald);   // a bare scalp shines a little, not like polish
            }
            // tone: darker towards a deep brown, lighter as if less sun ever reached it
            // the whole human range over the mid-tone bake (P4.14): to 1, deep dark (the bake's shade at a third, warm
            // and a little bluer in the shadows); to -1, very fair (the bake's shade lifted most of the way to white, a
            // touch pink)
            // P4.15b: each base's bake first brought to the reference skin's colour (the men's bake is a bronzed tan, far
            // more orange than the women's: everyone's tone comes from the people model, not from which bake they wear)
            a *= _BakeBalance.rgb;
            if (_Tone > 0.001h) a *= lerp(half3(1, 1, 1), half3(0.3h, 0.21h, 0.17h), pow(_Tone, 0.85h));
            // the fair end rosy beige, not white: green and blue lifted less than red (P4.15b: the fairest read as plaster)
            else if (_Tone < -0.001h) a = lerp(a, 1.0h - (1.0h - a) * half3(0.45h, 0.62h, 0.72h), -_Tone);
            // undertone: warmer (golden, olive) or rosier
            a *= _Undertone >= 0 ? 1.0h + _Undertone * half3(0.05h, 0.0h, -0.08h) : 1.0h + (-_Undertone) * half3(0.03h, -0.03h, 0.02h);
            // the shaved scalp's stubble in the hair's own colour, as dense as the bake painted it, none where bald
            if (sw > 0.01h && _ScalpColour.a > 0.5h)
                a = lerp(a, _ScalpColour.rgb, saturate(sstub * 1.6h) * sw * (1.0h - sbald) * (half)(0.75 + 0.25 * Noise3(p * 300.0)));
            bool head = dot(p, p) > 0.01 && p.y > -1.3 && length(p) < 1.6;
            if (!head) return;
            // freckles: across the nose and cheeks, thinning out to the temples
            if (_Freckles > 0.001h)
            {
                float face = saturate((p.z - 0.45) * 2.5) * saturate(1.0 - abs(p.y + 0.05) * 2.2);
                float n = Noise3(p * 46.0) * Noise3(p * 23.0 + 3.0);
                half f = (half)(smoothstep(0.42 - 0.2 * _Freckles, 0.5 - 0.2 * _Freckles, n) * face * _Freckles);
                a *= 1.0h - f * half3(0.22h, 0.32h, 0.4h);
            }
            {
                half b = BrowAt(p);
                a = lerp(a, _BrowColour.rgb, b * 0.92h);
                smooth = lerp(smooth, 0.2h, b);
            }
            if (_Scar > -0.5)
            {
                half s = (half)ScarAt(_Scar, p);
                // healed tissue: paler, a little pink, shinier
                a = lerp(a, a * 1.16h + half3(0.07h, 0.02h, 0.03h), s * 0.85h);
                smooth = lerp(smooth, 0.55h, s * 0.6h);
            }
            if (_Beard > -0.5)
            {
                // P4.15: a beard is hairs over skin, never a painted block. Stubble darkens the skin with fine dots of the
                // beard's colour; a grown beard shadows the skin under it and lays strands over it that run down the cheeks
                // and the jaw (streaks long in y), thicker where the beard is dense, the skin showing between them, the
                // edges ragged
                half b = (half)saturate(BeardAt(_Beard, p));
                // denser and thinner in patches, the edge a falloff, never a cut line (P4.15b: a ragged hard edge)
                b *= (half)saturate(0.85 + (Noise3(p * 34.0) - 0.5) * 0.35);
                // the hairs are far finer than a pixel at the game's distances: where they are, their average instead of
                // their aliasing (P4.15b: beards read as sandpaper)
                float px = length(fwidth(p));
                float strands = Noise3(float3(p.x * 230.0, p.y * 38.0, p.z * 230.0)) * 0.7 + Noise3(p * 420.0) * 0.3;
                // (still clumped and streaked down the jaw at a scale the eye can resolve: never a flat tint)
                float clumps = Noise3(float3(p.x * 70.0, p.y * 16.0, p.z * 70.0));
                strands = lerp(strands, 0.3 + 0.4 * clumps, saturate(px * 230.0 - 0.4));
                // salt and pepper (P4.15b): the beard's colour is its pigmented hairs', alpha the share gone white; each
                // hair one or the other, never a blend of the two (a blended grey on brown skin read as blond)
                half3 pigment = _BeardColour.rgb;
                half share = _BeardColour.a;
                const half3 whiteHair = half3(0.6h, 0.6h, 0.58h);
                half3 mean = lerp(pigment, whiteHair, share);
                if (_Beard < 2.5)
                {
                    half fine = (half)saturate(px * 520.0 - 0.4);
                    half dots = (half)lerp(smoothstep(0.55, 0.75, Noise3(p * 520.0)), 0.2 + 0.25 * Noise3(p * 90.0), fine);
                    half white = (half)lerp(step(Noise3(p * 520.0 + 17.0), share), share, fine);
                    // the skin seen through cut hairs takes their colour, a little deeper: a dark shadow on fair skin, next
                    // to nothing on dark skin under dark hair, a grey haze under grey (P4.15b: a grey patch on dark skin)
                    a = lerp(a, lerp(a, mean, 0.5h) * 0.88h, b * 0.7h);
                    a = lerp(a, lerp(pigment, whiteHair, white), b * dots * 0.45h);
                }
                else
                {
                    // strands over most of the skin where the beard is dense, fewer towards its edges; between them deeper
                    // hair, not bare dark skin (P4.15b: a white beard read as zebra stripes)
                    half hair = (half)(smoothstep(0.32, 0.6, strands) * b);
                    half white = (half)lerp(step(Noise3(float3(p.x * 230.0 + 17.0, p.y * 38.0 + 3.0, p.z * 230.0)), share), share, saturate(px * 230.0 - 0.4));
                    a = lerp(a, mean * 0.55h + a * 0.2h, b * 0.75h);
                    a = lerp(a, lerp(pigment, whiteHair, white) * (half)(0.85 + 0.3 * Noise3(p * 90.0)), hair * 0.85h);
                }
                smooth = lerp(smooth, 0.15h, b * (_Beard < 2.5 ? 0.4h : 0.9h));   // stubble barely dulls the skin
            }
            if (_Tattoo > -0.5)
            {
                half t = (half)TattooAt(_Tattoo, p) * (half)(0.8 + 0.2 * Noise3(p * 90.0));
                // old ink: blue-black, faded into the skin
                a = lerp(a, a * half3(0.3h, 0.34h, 0.4h), t * 0.85h);
            }
        }

        // the base vertex's rest position in the head frame
        float3 Rest(float2 baseIndex)
        {
            float2 texel = (floor(baseIndex + 0.5) + 0.5) / 128.0;
            return SAMPLE_TEXTURE2D_LOD(_RestMap, sampler_point_clamp, texel, 0).xyz;
        }
        ENDHLSL

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile_fragment _ _SCREEN_SPACE_OCCLUSION
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                half3 normalWS : TEXCOORD2;
                half4 tangentWS : TEXCOORD3;
                half hidden : TEXCOORD4;
                half fog : TEXCOORD5;
                float3 rest : TEXCOORD6;
            };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                VertexPositionInputs p = GetVertexPositionInputs(v.positionOS.xyz);
                VertexNormalInputs n = GetVertexNormalInputs(v.normalOS, v.tangentOS);
                o.positionCS = p.positionCS;
                o.positionWS = p.positionWS;
                o.normalWS = n.normalWS;
                o.tangentWS = half4(n.tangentWS, v.tangentOS.w * GetOddNegativeScale());
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                o.hidden = Hidden(v.baseIndex);
                o.rest = Rest(v.baseIndex);
                o.fog = ComputeFogFactor(p.positionCS.z);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                clip(0.5h - i.hidden);
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv);
                // the same skin older (FaceSculpt.Aged, the photograph): blended from the aged bake
                if (_Aged > 0.001h) albedo = lerp(albedo, SAMPLE_TEXTURE2D(_AgedMap, sampler_BaseMap, i.uv), _Aged);
                albedo *= _BaseColor;
                half smooth = albedo.a * _Smoothness;
                Look(albedo.rgb, smooth, i.rest);
                half3 normalTS = UnpackNormalScale(SAMPLE_TEXTURE2D(_BumpMap, sampler_BumpMap, i.uv), _BumpScale);
                // pores and the surface's fine lines over the bake (P4.15c), finely tiled; the mips fade them with distance
                // so they break up a close-up's highlights and leave the game camera's skin as it was
                half3 pores = UnpackNormalScale(SAMPLE_TEXTURE2D(_PoreMap, sampler_PoreMap, i.uv * _PoreTiling), _PoreScale);
                normalTS = normalize(half3(normalTS.xy + pores.xy, normalTS.z * pores.z));
                half3 bitangent = i.tangentWS.w * cross(i.normalWS, i.tangentWS.xyz);
                half3 normalWS = NormalizeNormalPerPixel(TransformTangentToWorld(normalTS, half3x3(i.tangentWS.xyz, bitangent, i.normalWS)));

                InputData input = (InputData)0;
                input.positionWS = i.positionWS;
                input.positionCS = i.positionCS;
                input.normalWS = normalWS;
                input.viewDirectionWS = GetWorldSpaceNormalizeViewDir(i.positionWS);
                input.shadowCoord = TransformWorldToShadowCoord(i.positionWS);
                input.fogCoord = i.fog;
                input.bakedGI = SampleSH(normalWS);
                input.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(i.positionCS);
                input.shadowMask = half4(1, 1, 1, 1);

                SurfaceData surface = (SurfaceData)0;
                surface.albedo = albedo.rgb;
                surface.metallic = 0;
                surface.smoothness = smooth;
                surface.occlusion = 1;
                surface.normalTS = normalTS;
                surface.alpha = 1;

                half4 colour = UniversalFragmentPBR(input, surface);
                // skin is not opaque (P4.14 step 6): light wraps past the terminator reddened by the blood under it, and
                // the thin edges of ears, nose and fingers scatter the light behind them
                Light main = GetMainLight(input.shadowCoord);
                half ndl = dot(normalWS, main.direction);
                half3 lit = main.color * main.distanceAttenuation * main.shadowAttenuation;
                if (_Sss > 0.001h)
                {
                    // P4.15c, pre-integrated scattering (Penner and Borshukov 2011; tools/unity/people/skin_lut.py): the
                    // main light's diffuse from a lookup of N.L against the surface's curvature, the curvature from the
                    // screen derivatives of the interpolated normal (1/m; the lookup spans 0..500/m), the normal for it
                    // eased toward the geometric one (light diffuses under the pores and fine lines). It replaces the
                    // Lambert term URP lit the main light with; the shadow's edge reddens the same way.
                    half alpha = 1;
                    BRDFData brdf;
                    InitializeBRDFData(surface.albedo, 0, half3(0, 0, 0), smooth, alpha, brdf);
                    half3 light = main.color * main.distanceAttenuation;
                    float curvature = length(fwidth(i.normalWS)) / max(length(fwidth(i.positionWS)), 1e-5);
                    half v = saturate(curvature * 0.002 * _CurvatureScale);
                    half3 soft = normalize(lerp(normalWS, normalize(i.normalWS), 0.5h));
                    half3 scattered = SAMPLE_TEXTURE2D(_SkinLut, sampler_SkinLut, float2(dot(soft, main.direction) * 0.5 + 0.5, v)).rgb;
                    half s = main.shadowAttenuation;
                    half3 penumbra = pow(max(s, 1e-3h), half3(0.75h, 1.1h, 1.25h));
                    colour.rgb += brdf.diffuse * light * (scattered * penumbra - saturate(ndl) * s) * _Sss;
                    // a second, sharper specular lobe (the oil over the skin's rougher sheen; dual-lobe skin specular)
                    BRDFData sharp = brdf;
                    sharp.perceptualRoughness = brdf.perceptualRoughness * 0.55h;
                    sharp.roughness = max(PerceptualRoughnessToRoughness(sharp.perceptualRoughness), HALF_MIN_SQRT);
                    sharp.roughness2 = max(sharp.roughness * sharp.roughness, HALF_MIN);
                    sharp.normalizationTerm = sharp.roughness * 4.0h + 2.0h;
                    sharp.roughness2MinusOne = sharp.roughness2 - 1.0h;
                    half3 radiance = light * s * saturate(ndl);
                    colour.rgb += brdf.specular * (DirectBRDFSpecular(sharp, normalWS, main.direction, input.viewDirectionWS)
                        - DirectBRDFSpecular(brdf, normalWS, main.direction, input.viewDirectionWS)) * _SharpLobe * radiance;
                }
                else
                {
                    half wrap = saturate((ndl + 0.55h) / 1.55h) - saturate(ndl);
                    colour.rgb += albedo.rgb * half3(1.0h, 0.38h, 0.26h) * wrap * lit * 0.5h;
                }
                half rimv = pow(1.0h - saturate(dot(normalWS, input.viewDirectionWS)), 3.0h);
                colour.rgb += albedo.rgb * half3(1.0h, 0.5h, 0.4h) * rimv * saturate(-ndl + 0.3h) * lit * 0.35h;
                colour.rgb = MixFog(colour.rgb, i.fog);
                return half4(colour.rgb, 1);
            }
            ENDHLSL
        }

        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }
            ZWrite On
            ZTest LEqual
            ColorMask 0

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            float3 _LightDirection;
            float3 _LightPosition;

            struct Varyings { float4 positionCS : SV_POSITION; half hidden : TEXCOORD0; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                float3 ws = TransformObjectToWorld(v.positionOS.xyz);
                float3 n = TransformObjectToWorldNormal(v.normalOS);
                #if defined(_CASTING_PUNCTUAL_LIGHT_SHADOW)
                    float3 l = normalize(_LightPosition - ws);
                #else
                    float3 l = _LightDirection;
                #endif
                float4 cs = TransformWorldToHClip(ApplyShadowBias(ws, n, l));
                #if UNITY_REVERSED_Z
                    cs.z = min(cs.z, UNITY_NEAR_CLIP_VALUE);
                #else
                    cs.z = max(cs.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                o.positionCS = cs;
                o.hidden = Hidden(v.baseIndex);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target { clip(0.5h - i.hidden); return 0; }
            ENDHLSL
        }

        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode" = "DepthOnly" }
            ZWrite On
            ColorMask R

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing

            struct Varyings { float4 positionCS : SV_POSITION; half hidden : TEXCOORD0; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.hidden = Hidden(v.baseIndex);
                return o;
            }

            half Frag(Varyings i) : SV_Target { clip(0.5h - i.hidden); return i.positionCS.z; }
            ENDHLSL
        }

        Pass
        {
            Name "DepthNormals"
            Tags { "LightMode" = "DepthNormals" }
            ZWrite On

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile_fragment _ _GBUFFER_NORMALS_OCT

            struct Varyings { float4 positionCS : SV_POSITION; half3 normalWS : TEXCOORD0; half hidden : TEXCOORD1; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                o.hidden = Hidden(v.baseIndex);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                clip(0.5h - i.hidden);
                float3 n = normalize(i.normalWS);
                #if defined(_GBUFFER_NORMALS_OCT)
                    float2 oct = PackNormalOctQuadEncode(n);
                    return half4(PackFloat2To888(saturate(oct * 0.5 + 0.5)), 0);
                #else
                    return half4(n, 0);
                #endif
            }
            ENDHLSL
        }
    }
    Fallback Off
}
