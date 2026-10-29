// Road surfaces (BUILD_PLAN §6.A.3, step 17b): the strips Core RoadStrips lays on the ground, lit like the terrain
// (URP PBR, main-light shadows, fog), alpha-blended over it. The strip's vertex alpha fades its edges and the texture's
// height breaks them, so the verge is ragged, not ruled; old asphalt is eaten away in world-noise patches (_Decay) where
// the ground shows through. Vertices are pulled towards the camera along the view ray (no shift on screen) by a few
// centimetres plus 0.4 % of the distance: the terrain's LOD mesh can sit that far above the true ground far off, and the
// strip would sink into it.
Shader "SecondFace/Road"
{
    Properties
    {
        _BaseMap ("Albedo", 2D) = "white" {}
        _BumpMap ("Normal", 2D) = "bump" {}
        _MaskMap ("Mask (metallic, occlusion, height, smoothness)", 2D) = "grey" {}
        _Tile ("Metres per tile", Float) = 4
        _Decay ("Decay (holes in the surface)", Range(0, 1)) = 0
        _Tint ("Tint", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Tags { "Queue" = "Geometry+450" "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Back

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            TEXTURE2D(_BumpMap);
            TEXTURE2D(_MaskMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float _Tile, _Decay;
                half4 _Tint;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float4 tangentOS : TANGENT; float2 uv : TEXCOORD0; half4 color : COLOR; };
            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                half3 normalWS : TEXCOORD2;
                half4 tangentWS : TEXCOORD3;
                half alpha : TEXCOORD4;
                half fog : TEXCOORD5;
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

            Varyings Vert(Attributes v)
            {
                Varyings o;
                float3 ws = TransformObjectToWorld(v.positionOS.xyz);
                float3 toCam = _WorldSpaceCameraPos - ws;
                float dist = length(toCam);
                ws += toCam / max(dist, 1e-3) * (0.04 + 0.004 * dist);
                o.positionWS = ws;
                o.positionCS = TransformWorldToHClip(ws);
                VertexNormalInputs n = GetVertexNormalInputs(v.normalOS, v.tangentOS);
                o.normalWS = n.normalWS;
                o.tangentWS = half4(n.tangentWS, v.tangentOS.w * GetOddNegativeScale());
                o.uv = v.uv / _Tile;
                o.alpha = v.color.a;
                o.fog = ComputeFogFactor(o.positionCS.z);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv) * _Tint;
                half4 mask = SAMPLE_TEXTURE2D(_MaskMap, sampler_BaseMap, i.uv);
                half3 nTS = UnpackNormal(SAMPLE_TEXTURE2D(_BumpMap, sampler_BaseMap, i.uv));

                // the verge: the vertex alpha's ramp, shifted by the texture's height so stones and clods break the line
                half a = saturate((i.alpha - (1.0h - mask.b) * 0.55h) * 2.2h);
                // decay: patches where the surface is gone, ragged at the texture's scale
                if (_Decay > 0.001)
                {
                    half holes = (half)(Noise(i.positionWS.xz / 7.0) * 0.75 + Noise(i.positionWS.xz / 1.7) * 0.25);
                    a *= saturate((holes - _Decay * 0.7h + mask.b * 0.25h - 0.05h) * 6.0h);
                }
                clip(a - 0.01h);

                half3 bitangent = cross(i.normalWS, i.tangentWS.xyz) * i.tangentWS.w;
                half3 normalWS = normalize(TransformTangentToWorld(nTS, half3x3(i.tangentWS.xyz, bitangent, i.normalWS)));

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
                surface.metallic = mask.r;
                surface.smoothness = mask.a;
                surface.occlusion = mask.g;
                surface.normalTS = nTS;
                surface.alpha = a;

                half4 colour = UniversalFragmentPBR(input, surface);
                colour.rgb = MixFog(colour.rgb, i.fog);
                return half4(colour.rgb, a);
            }
            ENDHLSL
        }
    }
    Fallback Off
}
