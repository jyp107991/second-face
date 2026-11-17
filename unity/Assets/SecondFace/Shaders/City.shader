// The megacity's surfaces (Meridian's districts: Core CityKit, built by PlaceBuilder): SecondFace/Weathered's PBR and its
// ninety years of wear (grime from the ground, streaks, patches, sand on what faces up), the colour of each piece from its
// vertices (one material carries every colour of a painted wall: one draw per material per merge cell), and the city's
// light on the "light" material by the vertex's pattern (uv1.x): 0 a neon tube or a lamp, 1 a lightbox's glyphs, 2 a
// screen, 3 a window pane (lit at night by the vertex's alpha), 4 a window grid over a megablock or a tower (bays of
// _GridBay by _GridStorey on the face's metres; uv1.y the pane's share of a bay, the vertex alpha the share lit).
// Light comes up at dusk with the global _SF_Night (SkyController: 0 by day, 1 at night); neon and screens burn by day
// too, dimmer (_EmissionDay). Grime: the vertex alpha scales it on surfaces (0.5 as the material). A recoloured material
// (_Recolour) takes the vertex colour as its colour and the texture (its luminance over _MeanLum) as detail: the library's
// painted concrete is green paint and its concrete a dark brown-grey, and a district's palette must read as itself.
// Interiors (PlaceInteriors): inside the box _SF_CutMin.._SF_CutMax, grown by 1.3 m (CityKit.CutMargin: a balcony, an
// awning, a sign go with their building), everything above _SF_CutHeight is cut away; the inner faces the cut opens are a
// dark cap. Elsewhere back faces are not drawn (a camera inside a megablock sees through it).
// The see-through (PlaceReveal): between the camera (_SF_RevealFrom) and the player (_SF_RevealAt.xyz, their chest),
// within a radius of the line that narrows towards the camera (_SF_RevealAt.w; 0: off), everything above the player's
// waist dissolves in a screen-space dither, so a building or a tower between never hides them. Shadows are cast whole.
Shader "SecondFace/City"
{
    Properties
    {
        _BaseMap ("Albedo", 2D) = "white" {}
        _BumpMap ("Normal", 2D) = "bump" {}
        _MaskMap ("Mask (metallic, occlusion, height, smoothness)", 2D) = "grey" {}
        _Grime ("Grime colour", Color) = (0.24, 0.19, 0.14, 1)
        _GrimeHeight ("Grime height (m)", Float) = 0.9
        _GrimeAmount ("Grime amount", Range(0, 1)) = 0.5
        _Streaks ("Streaks", Range(0, 1)) = 0.35
        _Dust ("Dust colour", Color) = (0.74, 0.68, 0.58, 1)
        _DustAmount ("Dust on top faces", Range(0, 1)) = 0.3
        _Variation ("Patch variation", Range(0, 1)) = 0.3
        _Metal ("Metallic scale", Range(0, 1)) = 1
        _Smooth ("Smoothness scale", Range(0, 2)) = 1
        _Recolour ("Recolour (0: the tint multiplies the texture, 1: the tint is the colour, the texture its detail)", Range(0, 1)) = 0
        _MeanLum ("The texture's mean linear luminance", Float) = 0.2
        _Albedo ("A recoloured tint's albedo", Range(0, 1)) = 0.6
        _Light ("The light material (patterns)", Float) = 0
        _Emission ("Emission (HDR intensity)", Float) = 4
        _EmissionDay ("Emission by day", Range(0, 1)) = 0.35
        _GridBay ("Window grid bay (m)", Float) = 2.4
        _GridStorey ("Window grid storey (m)", Float) = 3.2
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
        TEXTURE2D(_BumpMap);
        TEXTURE2D(_MaskMap);
        float4 _SF_CutMin, _SF_CutMax;
        float _SF_CutHeight;
        float _SF_Night;
        float4 _SF_RevealAt, _SF_RevealFrom;
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _Grime, _Dust;
            float _GrimeHeight;
            half _GrimeAmount, _Streaks, _DustAmount, _Variation;
            half _Metal, _Smooth, _Light, _Emission, _EmissionDay, _Recolour, _MeanLum, _Albedo;
            float _GridBay, _GridStorey;
        CBUFFER_END

        struct Attributes
        {
            float4 positionOS : POSITION;
            float3 normalOS : NORMAL;
            float4 tangentOS : TANGENT;
            float2 uv : TEXCOORD0;
            float2 extra : TEXCOORD1;
            half4 color : COLOR;
            UNITY_VERTEX_INPUT_INSTANCE_ID
        };

        float Hash(float2 p)
        {
            float3 p3 = frac(float3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return frac((p3.x + p3.y) * p3.z);
        }

        float Noise(float2 p)
        {
            float2 i = floor(p), f = frac(p);
            float2 u = f * f * (3.0 - 2.0 * f);
            return lerp(lerp(Hash(i), Hash(i + float2(1, 0)), u.x), lerp(Hash(i + float2(0, 1)), Hash(i + float2(1, 1)), u.x), u.y);
        }

        // the open building's box, grown by the cutaway's reach
        bool InCut(float3 p)
        {
            return _SF_CutMax.w > 0.5 && p.x > _SF_CutMin.x - 1.3 && p.x < _SF_CutMax.x + 1.3 && p.z > _SF_CutMin.z - 1.3 && p.z < _SF_CutMax.z + 1.3;
        }

        void Cutaway(float3 p)
        {
            if (InCut(p) && p.y > _SF_CutHeight && p.y < _SF_CutMax.y + 4.0) clip(-1);
        }

        // the see-through between the camera and the player
        void Reveal(float3 p, float4 positionCS)
        {
            if (_SF_RevealAt.w <= 0.0) return;
            float3 toPlayer = _SF_RevealAt.xyz - _SF_RevealFrom.xyz;
            float span = length(toPlayer);
            if (span < 0.5) return;
            float3 dir = toPlayer / span;
            float3 d = p - _SF_RevealFrom.xyz;
            float along = dot(d, dir);
            if (along <= 0.0 || along > span - 0.6) return;
            if (p.y < _SF_RevealAt.y - 0.5) return;
            float off = length(d - dir * along);
            float radius = _SF_RevealAt.w * lerp(0.45, 1.0, saturate(along / span));
            float fade = 1.0 - smoothstep(radius * 0.65, radius, off);
            float dither = frac(52.9829189 * frac(dot(positionCS.xy, float2(0.06711056, 0.00583715))));
            if (fade > dither) clip(-1);
        }

        // what every pass cuts: the open building, the see-through, back faces outside the cutaway
        void Cut(float3 p, float4 positionCS, bool front)
        {
            Cutaway(p);
            Reveal(p, positionCS);
            if (!front && !InCut(p)) clip(-1);
        }
        ENDHLSL

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            Cull Off

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
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
                float height : TEXCOORD4;   // above the place's ground (object y)
                half fog : TEXCOORD5;
                float2 metres : TEXCOORD6;  // the face's metres (the patterns)
                float2 extra : TEXCOORD7;
                half4 color : COLOR;
            };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionWS = TransformObjectToWorld(v.positionOS.xyz);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                VertexNormalInputs n = GetVertexNormalInputs(v.normalOS, v.tangentOS);
                o.normalWS = n.normalWS;
                o.tangentWS = half4(n.tangentWS, v.tangentOS.w * GetOddNegativeScale());
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                o.metres = v.uv;
                o.extra = v.extra;
                o.color = v.color;
                o.height = v.positionOS.y;
                o.fog = ComputeFogFactor(o.positionCS.z);
                return o;
            }

            half4 Frag(Varyings i, bool front : SV_IsFrontFace) : SV_Target
            {
                Cut(i.positionWS, i.positionCS, front);
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv);
                half3 tint = i.color.rgb;
                // a wall's inside, seen where the cut opens it: a dark cap of the wall's own colour
                if (!front) return half4(MixFog(albedo.rgb * tint * 0.22h, i.fog), 1);
                half4 mask = SAMPLE_TEXTURE2D(_MaskMap, sampler_BaseMap, i.uv);
                half3 nTS = UnpackNormal(SAMPLE_TEXTURE2D(_BumpMap, sampler_BaseMap, i.uv));
                half3 bitangent = cross(i.normalWS, i.tangentWS.xyz) * i.tangentWS.w;
                half3 normalWS = normalize(TransformTangentToWorld(nTS, half3x3(i.tangentWS.xyz, bitangent, i.normalWS)));
                half3 geomN = normalize(i.normalWS);
                float3 p = i.positionWS;
                float along = abs(geomN.x) > abs(geomN.z) ? p.z : p.x;
                half night = (half)saturate(_SF_Night);
                half3 emission = half3(0, 0, 0);
                half metallic = mask.r * _Metal;
                half smoothness = mask.a * _Smooth;
                half grimeScale = i.color.a * 2.0h;

                if (_Light > 0.5)
                {
                    // the city's light: no texture, a dark glossy body, a pattern of light on it
                    float pattern = i.extra.x;
                    float2 m = i.metres;
                    half day = lerp(_EmissionDay, 1.0h, night);
                    albedo.rgb = tint * 0.35h;
                    metallic = 0.1h; smoothness = 0.6h;
                    grimeScale = 0.3h;
                    if (pattern < 0.5)
                    {
                        // a tube, a lamp, a bulb
                        albedo.rgb = tint * 0.6h;
                        emission = tint * _Emission * day;
                    }
                    else if (pattern < 1.5)
                    {
                        // a lightbox: rows of glyphs, a lit border, now and then a flicker
                        float2 cell = floor(m / float2(0.16, 0.22));
                        float2 f = frac(m / float2(0.16, 0.22));
                        half on = (half)(step(0.42, Hash(cell + 17.0)) * step(0.16, f.x) * step(0.2, f.y));
                        half flicker = (half)(Hash(floor(m / 3.0)) < 0.12 ? step(0.25, frac(_Time.y * 0.7 + Hash(floor(m / 3.0) + 3.0))) : 1.0);
                        albedo.rgb = tint * lerp(0.12h, 0.45h, on);
                        emission = tint * _Emission * day * (0.22h + 0.78h * on) * flicker;
                    }
                    else if (pattern < 2.5)
                    {
                        // a screen: blocks of colour that change, scan lines; bright by day too
                        float2 cell = floor(m / 0.32);
                        float t = floor(_Time.y * 0.6 + Hash(floor(m / 2.6)) * 9.0);
                        half v = (half)Hash(cell + t * 13.17);
                        half3 col = lerp(tint, tint.gbr, (half)step(0.72, v));
                        half scan = 0.82h + 0.18h * (half)sin(m.y * 180.0);
                        albedo.rgb = col * 0.2h;
                        smoothness = 0.85h;
                        emission = col * _Emission * lerp(0.6h, 1.0h, night) * (0.3h + 0.7h * v) * scan;
                    }
                    else if (pattern < 3.5)
                    {
                        // a window: dark glass by day, a room's light at night
                        half lit = i.color.a;
                        half curtain = 0.65h + 0.35h * (half)Noise(m * 1.3 + p.y * 0.1);
                        albedo.rgb = half3(0.05h, 0.065h, 0.08h);
                        metallic = 0.15h; smoothness = 0.92h;
                        emission = tint * lit * _Emission * 0.32h * curtain * lerp(0.05h, 1.0h, night);
                    }
                    else
                    {
                        // a window grid: frames tinted and patched cell by cell, panes dark glass, some lit at night
                        float2 bays = m / float2(_GridBay, _GridStorey);
                        float2 cell = floor(bays);
                        float2 f = frac(bays);
                        half share = (half)i.extra.y;
                        half gap = (1.0h - share) * 0.5h;
                        half pane = (half)(step(gap, f.x) * step(f.x, 1.0 - gap) * step(0.3, f.y) * step(f.y, 0.88));
                        half blotch = (half)Noise(cell * 0.37 + 5.0);
                        half3 frame = tint * (0.82h + 0.36h * blotch) * (Hash(cell + 41.0) < 0.06 ? 0.75h : 1.0h);
                        half lit = (half)step(Hash(cell + floor(p.xz / 40.0) * 7.0), i.color.a);
                        half3 room = Hash(cell + 9.0) < 0.6 ? half3(1.0h, 0.8h, 0.55h) : half3(0.75h, 0.86h, 1.0h);
                        albedo.rgb = lerp(frame, half3(0.05h, 0.065h, 0.08h), pane);
                        metallic = 0.1h * pane; smoothness = lerp(0.3h, 0.9h, pane);
                        emission = room * pane * lit * _Emission * 0.3h * lerp(0.03h, 1.0h, night);
                        grimeScale = 0.8h * (1.0h - pane);
                    }
                }
                else
                {
                    // the tint multiplies the texture, or (recoloured: paint, concrete, painted steel) is the colour and the
                    // texture only its detail, its luminance about its mean
                    half lum = dot(albedo.rgb, half3(0.2126h, 0.7152h, 0.0722h));
                    albedo.rgb = lerp(albedo.rgb * tint, tint * _Albedo * min(lum / max(_MeanLum, 0.01h), 3.0h), _Recolour);
                }

                // patches: broad and small, brightness and a little warmth
                half broad = (half)Noise(p.xz / 9.0 + along * 0.02);
                half small = (half)Noise(float2(along, p.y) / 1.7 + p.xz * 0.05);
                half patchy = (broad * 0.65h + small * 0.35h - 0.5h) * _Variation * 2.0h;
                albedo.rgb *= 1.0h + patchy * saturate(grimeScale);
                // grime and damp from the ground, ragged in height; streaks down from the tops
                half rise = (half)(_GrimeHeight * (0.6 + 0.8 * Noise(float2(along * 0.8, 3.1))));
                half grime = saturate(1.0h - (half)i.height / max(rise, 0.05h));
                grime = grime * grime * _GrimeAmount * grimeScale * (1.0h - saturate(geomN.y));
                half streak = (half)Noise(float2(along * 3.3, p.y * 0.12 + Hash(floor(float2(along * 3.3, 7.0))) * 5.0));
                streak = saturate((streak - 0.55h) * 3.0h) * _Streaks * grimeScale * (1.0h - saturate(geomN.y * 2.0h));
                albedo.rgb = lerp(albedo.rgb, albedo.rgb * _Grime.rgb * 2.2h, saturate(grime + streak * 0.6h));
                // dust on what faces up
                half up = saturate((geomN.y - 0.55h) * 3.0h);
                half dust = up * _DustAmount * saturate(grimeScale) * saturate(0.35h + (1.0h - mask.b) * 0.8h + (half)Noise(p.xz / 2.3) * 0.4h - 0.3h);
                albedo.rgb = lerp(albedo.rgb, _Dust.rgb, saturate(dust));

                InputData inputData = (InputData)0;
                inputData.positionWS = p;
                inputData.positionCS = i.positionCS;
                inputData.normalWS = _Light > 0.5 ? geomN : normalWS;
                inputData.viewDirectionWS = GetWorldSpaceNormalizeViewDir(p);
                inputData.shadowCoord = TransformWorldToShadowCoord(p);
                inputData.fogCoord = i.fog;
                inputData.bakedGI = SampleSH(inputData.normalWS);
                inputData.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(i.positionCS);
                inputData.shadowMask = half4(1, 1, 1, 1);

                SurfaceData surface = (SurfaceData)0;
                surface.albedo = albedo.rgb;
                surface.metallic = saturate(metallic * (1.0h - saturate(grime + dust)));
                surface.smoothness = saturate(smoothness * (1.0h - saturate(grime + dust) * 0.7h));
                surface.occlusion = lerp(1.0h, mask.g, _Light > 0.5 ? 0.0h : 0.8h) * (1.0h - grime * 0.25h);
                surface.normalTS = _Light > 0.5 ? half3(0, 0, 1) : nTS;
                surface.emission = emission;
                surface.alpha = 1;

                half4 colour = UniversalFragmentPBR(inputData, surface);
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
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            float3 _LightDirection;
            float3 _LightPosition;

            float4 Vert(Attributes v) : SV_POSITION
            {
                UNITY_SETUP_INSTANCE_ID(v);
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
                return cs;
            }

            half4 Frag() : SV_Target { return 0; }
            ENDHLSL
        }

        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode" = "DepthOnly" }
            ZWrite On
            ColorMask R
            Cull Off

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing

            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionWS = TransformObjectToWorld(v.positionOS.xyz);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                return o;
            }

            half Frag(Varyings i, bool front : SV_IsFrontFace) : SV_Target { Cut(i.positionWS, i.positionCS, front); return i.positionCS.z; }
            ENDHLSL
        }

        Pass
        {
            Name "DepthNormals"
            Tags { "LightMode" = "DepthNormals" }
            ZWrite On
            Cull Off

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile_fragment _ _GBUFFER_NORMALS_OCT

            struct Varyings { float4 positionCS : SV_POSITION; half3 normalWS : TEXCOORD0; float3 positionWS : TEXCOORD1; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionWS = TransformObjectToWorld(v.positionOS.xyz);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                return o;
            }

            half4 Frag(Varyings i, bool front : SV_IsFrontFace) : SV_Target
            {
                Cut(i.positionWS, i.positionCS, front);
                float3 n = normalize(i.normalWS) * (front ? 1 : -1);
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
