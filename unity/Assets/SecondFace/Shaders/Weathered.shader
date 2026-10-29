// Weathered surfaces (BUILD_PLAN §6.A.5, step 20): the places' buildings, made in code by PlaceBuilder, drawn with the
// library's PBR maps (albedo, normal, mask: R metallic, G occlusion, B height, A smoothness) and ninety years of use
// added in the shader, at no extra draw: grime and damp rising from the ground (object y, the building stands on y = 0),
// streaks run down from the tops in world noise, the albedo varied in broad and small patches (a long wall is never one
// colour), and wind-blown sand settled on whatever faces up. URP PBR, main light shadows, additional lights, fog.
Shader "SecondFace/Weathered"
{
    Properties
    {
        _BaseMap ("Albedo", 2D) = "white" {}
        _BumpMap ("Normal", 2D) = "bump" {}
        _MaskMap ("Mask (metallic, occlusion, height, smoothness)", 2D) = "grey" {}
        _Grime ("Grime colour", Color) = (0.24, 0.19, 0.14, 1)
        _GrimeHeight ("Grime height (m)", Float) = 0.9
        _GrimeAmount ("Grime amount", Range(0, 1)) = 0.55
        _Streaks ("Streaks", Range(0, 1)) = 0.35
        _Dust ("Dust colour", Color) = (0.78, 0.68, 0.52, 1)
        _DustAmount ("Dust on top faces", Range(0, 1)) = 0.45
        _Variation ("Patch variation", Range(0, 1)) = 0.3
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
        TEXTURE2D(_BumpMap);
        TEXTURE2D(_MaskMap);
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _Grime, _Dust;
            float _GrimeHeight;
            half _GrimeAmount, _Streaks, _DustAmount, _Variation;
        CBUFFER_END

        struct Attributes
        {
            float4 positionOS : POSITION;
            float3 normalOS : NORMAL;
            float4 tangentOS : TANGENT;
            float2 uv : TEXCOORD0;
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
                half4 tangentWS : TEXCOORD3;
                float height : TEXCOORD4;   // above the building's ground (object y)
                half fog : TEXCOORD5;
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
                o.height = v.positionOS.y;
                o.fog = ComputeFogFactor(o.positionCS.z);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv);
                half4 mask = SAMPLE_TEXTURE2D(_MaskMap, sampler_BaseMap, i.uv);
                half3 nTS = UnpackNormal(SAMPLE_TEXTURE2D(_BumpMap, sampler_BaseMap, i.uv));
                half3 bitangent = cross(i.normalWS, i.tangentWS.xyz) * i.tangentWS.w;
                half3 normalWS = normalize(TransformTangentToWorld(nTS, half3x3(i.tangentWS.xyz, bitangent, i.normalWS)));
                half3 geomN = normalize(i.normalWS);
                float3 p = i.positionWS;
                // the wall's run: along x or z, whichever the face does not look along
                float along = abs(geomN.x) > abs(geomN.z) ? p.z : p.x;

                // patches: broad and small, brightness and a little warmth
                half broad = (half)Noise(p.xz / 9.0 + along * 0.02);
                half small = (half)Noise(float2(along, p.y) / 1.7 + p.xz * 0.05);
                half patch = (broad * 0.65h + small * 0.35h - 0.5h) * _Variation * 2.0h;
                albedo.rgb *= 1.0h + patch;
                albedo.rgb = lerp(albedo.rgb, albedo.rgb * half3(1.06h, 1.0h, 0.9h), saturate(broad - 0.4h));

                // grime and damp from the ground, ragged in height
                half rise = (half)(_GrimeHeight * (0.6 + 0.8 * Noise(float2(along * 0.8, 3.1))));
                half grime = saturate(1.0h - (half)i.height / max(rise, 0.05h));
                grime = grime * grime * _GrimeAmount * (1.0h - saturate(geomN.y));
                // streaks: thin vertical runs of dirt, longer where the noise says
                half streak = (half)Noise(float2(along * 3.3, p.y * 0.12 + Hash(floor(float2(along * 3.3, 7.0))) * 5.0));
                streak = saturate((streak - 0.55h) * 3.0h) * _Streaks * (1.0h - saturate(geomN.y * 2.0h));
                albedo.rgb = lerp(albedo.rgb, albedo.rgb * _Grime.rgb * 2.2h, saturate(grime + streak * 0.6h));
                // sand on what faces up, thick in the low spots of the texture
                half up = saturate((geomN.y - 0.55h) * 3.0h);
                half dust = up * _DustAmount * saturate(0.35h + (1.0h - mask.b) * 0.8h + (half)Noise(p.xz / 2.3) * 0.4h - 0.3h);
                albedo.rgb = lerp(albedo.rgb, _Dust.rgb, saturate(dust));

                InputData input = (InputData)0;
                input.positionWS = p;
                input.positionCS = i.positionCS;
                input.normalWS = normalWS;
                input.viewDirectionWS = GetWorldSpaceNormalizeViewDir(p);
                input.shadowCoord = TransformWorldToShadowCoord(p);
                input.fogCoord = i.fog;
                input.bakedGI = SampleSH(normalWS);
                input.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(i.positionCS);
                input.shadowMask = half4(1, 1, 1, 1);

                SurfaceData surface = (SurfaceData)0;
                surface.albedo = albedo.rgb;
                surface.metallic = mask.r * (1.0h - saturate(grime + dust));
                surface.smoothness = mask.a * (1.0h - saturate(grime + dust) * 0.7h);
                surface.occlusion = lerp(1.0h, mask.g, 0.8h) * (1.0h - grime * 0.25h);
                surface.normalTS = nTS;
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

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing

            float4 Vert(Attributes v) : SV_POSITION
            {
                UNITY_SETUP_INSTANCE_ID(v);
                return TransformObjectToHClip(v.positionOS.xyz);
            }

            half Frag(float4 positionCS : SV_POSITION) : SV_Target { return positionCS.z; }
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

            struct Varyings { float4 positionCS : SV_POSITION; half3 normalWS : TEXCOORD0; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
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
