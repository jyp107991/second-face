// Foliage cards (BUILD_PLAN §6.A, step 19c): the bushes and grass tufts the terrain draws as instanced details, and any
// card plant after them. URP PBR (main light with shadows, additional lights, fog), cut out, both faces. The mesh's
// normals are the plant's volume (bent out from its centre), not the cards', so a dome of cards shades as one mound.
// Vertex colour: r ambient occlusion (dark at the heart and the base), g how far the wind moves the vertex. Each
// instance is tinted between _TintA and _TintB by a hash of its position (a field of copies reads as many plants), a
// little light comes through the leaves against the sun, and the plants dissolve out between _FadeStart and _FadeEnd
// (the terrain stops drawing details at its detail distance; without the fade they pop).
Shader "SecondFace/Foliage"
{
    Properties
    {
        _BaseMap ("Card (RGBA)", 2D) = "white" {}
        _Cutoff ("Alpha cut-off", Range(0, 1)) = 0.5
        _TintA ("Tint A", Color) = (1, 1, 1, 1)
        _TintB ("Tint B", Color) = (1, 1, 1, 1)
        _Occlusion ("Occlusion strength", Range(0, 1)) = 0.8
        _Smoothness ("Smoothness", Range(0, 1)) = 0.12
        _Translucency ("Light through the leaves", Range(0, 2)) = 0.5
        _Wind ("Wind sway (m)", Float) = 0.03
        _FadeStart ("Fade start (m)", Float) = 60
        _FadeEnd ("Fade end (m)", Float) = 75
    }
    SubShader
    {
        Tags { "Queue" = "AlphaTest" "RenderType" = "TransparentCutout" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }
        Cull Off

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

        TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _TintA, _TintB;
            half _Cutoff, _Occlusion, _Smoothness, _Translucency;
            float _Wind, _FadeStart, _FadeEnd;
        CBUFFER_END

        struct Attributes
        {
            float4 positionOS : POSITION;
            float3 normalOS : NORMAL;
            float2 uv : TEXCOORD0;
            half4 color : COLOR;
            UNITY_VERTEX_INPUT_INSTANCE_ID
        };

        float Hash31(float3 p)
        {
            p = frac(p * 0.1031);
            p += dot(p, p.zyx + 31.32);
            return frac((p.x + p.y) * p.z);
        }

        float3 InstanceOrigin() { return float3(UNITY_MATRIX_M._m03, UNITY_MATRIX_M._m13, UNITY_MATRIX_M._m23); }

        // the vertex in world space, moved by the wind: a slow sway and a faster flutter, phased by the plant's position
        float3 WindWorld(float3 positionOS, half weight)
        {
            float3 ws = TransformObjectToWorld(positionOS);
            float3 o = InstanceOrigin();
            float phase = Hash31(floor(o * 4.0)) * 6.2832;
            float t = _Time.y;
            float sway = sin(t * 1.3 + phase + o.x * 0.05) * 0.7 + sin(t * 3.7 + phase * 1.7 + ws.z * 0.9) * 0.3;
            ws.xz += float2(0.8, 0.6) * sway * _Wind * weight;
            return ws;
        }

        // the dissolve near the detail distance: a screen-space dither against how far the plant is into the fade band
        void FadeClip(float3 positionWS, float4 positionCS)
        {
            float d = distance(positionWS, _WorldSpaceCameraPos);
            float f = saturate((d - _FadeStart) / max(_FadeEnd - _FadeStart, 1e-3));
            float2 p = floor(positionCS.xy);
            float dither = frac(52.9829189 * frac(dot(p, float2(0.06711056, 0.00583715))));
            clip(dither - f);
        }
        ENDHLSL

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

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
                half4 tint : TEXCOORD3;     // rgb the instance's tint × occlusion, a unused
                half fog : TEXCOORD4;
            };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                float3 ws = WindWorld(v.positionOS.xyz, v.color.g);
                o.positionWS = ws;
                o.positionCS = TransformWorldToHClip(ws);
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                half h = (half)Hash31(InstanceOrigin() * 1.37);
                half ao = lerp(1.0h, v.color.r, _Occlusion);
                o.tint = half4(lerp(_TintA.rgb, _TintB.rgb, h) * ao, 1);
                o.fog = ComputeFogFactor(o.positionCS.z);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                half4 card = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv);
                clip(card.a - _Cutoff);
                FadeClip(i.positionWS, i.positionCS);
                half3 normalWS = normalize(i.normalWS);

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
                surface.albedo = card.rgb * i.tint.rgb;
                surface.metallic = 0;
                surface.smoothness = _Smoothness;
                surface.occlusion = 1;
                surface.normalTS = half3(0, 0, 1);
                surface.alpha = 1;

                half4 colour = UniversalFragmentPBR(input, surface);
                // light through the leaves: the sun behind the plant, seen through it
                Light sun = GetMainLight(input.shadowCoord);
                half back = pow(saturate(dot(input.viewDirectionWS, -sun.direction)), 3.0h);
                colour.rgb += surface.albedo * sun.color * sun.shadowAttenuation * back * _Translucency;
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

            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                float3 ws = WindWorld(v.positionOS.xyz, v.color.g);
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
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                clip(SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv).a - _Cutoff);
                return 0;
            }
            ENDHLSL
        }

        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode" = "DepthOnly" }
            ZWrite On
            ColorMask R

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing

            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; float3 positionWS : TEXCOORD1; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionWS = WindWorld(v.positionOS.xyz, v.color.g);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                return o;
            }

            half Frag(Varyings i) : SV_Target
            {
                clip(SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv).a - _Cutoff);
                FadeClip(i.positionWS, i.positionCS);
                return i.positionCS.z;
            }
            ENDHLSL
        }

        Pass
        {
            Name "DepthNormals"
            Tags { "LightMode" = "DepthNormals" }
            ZWrite On

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #pragma multi_compile_fragment _ _GBUFFER_NORMALS_OCT

            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; float3 positionWS : TEXCOORD1; half3 normalWS : TEXCOORD2; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionWS = WindWorld(v.positionOS.xyz, v.color.g);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                clip(SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv).a - _Cutoff);
                FadeClip(i.positionWS, i.positionCS);
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
