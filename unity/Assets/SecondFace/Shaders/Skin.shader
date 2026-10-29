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
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _BaseColor;
            half _BumpScale, _Smoothness, _Aged, _Tone, _Undertone, _Freckles;
            float _Scar, _Tattoo;
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
        void Look(inout half3 a, inout half smooth, float3 p)
        {
            // tone: darker towards a deep brown, lighter as if less sun ever reached it
            if (_Tone > 0.001h) a *= lerp(half3(1, 1, 1), half3(0.5h, 0.38h, 0.3h), _Tone);
            else if (_Tone < -0.001h) a = lerp(a, 1.0h - (1.0h - a) * half3(0.62h, 0.7h, 0.74h), -_Tone * 0.8h);
            // undertone: warmer (golden, olive) or rosier
            a *= _Undertone >= 0 ? 1.0h + _Undertone * half3(0.05h, 0.0h, -0.08h) : 1.0h + (-_Undertone) * half3(0.03h, -0.03h, 0.02h);
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
            if (_Scar > -0.5)
            {
                half s = (half)ScarAt(_Scar, p);
                // healed tissue: paler, a little pink, shinier
                a = lerp(a, a * 1.16h + half3(0.07h, 0.02h, 0.03h), s * 0.85h);
                smooth = lerp(smooth, 0.55h, s * 0.6h);
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
