// Open water (BUILD_PLAN §6.J, step 22): the flat sheet Core WorldWater lays on the sea and the rivers. No depth or
// opaque texture (a phone's tile renderer pays for both): the sheet's vertices carry the depth of water under them, and
// the colour, the clarity and the shore's foam follow it. Two ripple layers from one tileable normal map; the first
// drifts with the flow (down a river, a slow drift at sea) in two phases that cross-fade, so it never stretches. The sky
// is reflected through the environment probe the sky controller refreshes, the sun as a glint, both by Fresnel.
// Premultiplied alpha: what lies under the water shows through by its clarity, the reflection is added over it.
Shader "SecondFace/Water"
{
    Properties
    {
        _NormalMap ("Ripples (tileable normal)", 2D) = "bump" {}
        _ShallowColor ("Shallow", Color) = (0.32, 0.36, 0.28, 1)
        _DeepColor ("Deep", Color) = (0.07, 0.12, 0.12, 1)
        _DeepAt ("Deep at (m)", Float) = 4
        _Clarity ("Murk (per metre of water)", Float) = 0.9
        _RippleA ("Ripple A (metres per tile)", Float) = 7
        _RippleB ("Ripple B (metres per tile)", Float) = 19
        _Strength ("Ripple strength", Range(0, 2)) = 0.7
        _Smoothness ("Smoothness", Range(0, 1)) = 0.92
        _FoamColor ("Foam", Color) = (0.74, 0.73, 0.68, 1)
        _FoamDepth ("Foam depth (m)", Float) = 0.22
        _Edge ("Shore fade (m)", Float) = 0.12
    }
    SubShader
    {
        Tags { "Queue" = "Transparent-50" "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            Blend One OneMinusSrcAlpha
            ZWrite Off
            Cull Off

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_NormalMap); SAMPLER(sampler_NormalMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _NormalMap_ST;
                half4 _ShallowColor, _DeepColor, _FoamColor;
                float _DeepAt, _Clarity, _RippleA, _RippleB, _Strength, _Smoothness, _FoamDepth, _Edge;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; float2 uv0 : TEXCOORD0; float2 uv1 : TEXCOORD1; };
            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float depth : TEXCOORD1;
                float2 flow : TEXCOORD2;
                half fog : TEXCOORD3;
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
                o.positionWS = ws;
                o.positionCS = TransformWorldToHClip(ws);
                o.depth = v.uv0.x;
                o.flow = v.uv1;
                o.fog = ComputeFogFactor(o.positionCS.z);
                return o;
            }

            half3 Ripple(float2 uv) { return UnpackNormal(SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, uv)); }

            half4 Frag(Varyings i) : SV_Target
            {
                float depth = i.depth;
                float2 xz = i.positionWS.xz;
                float t = _Time.y;

                // ripples: layer A drifts with the flow in two phases half a cycle apart, cross-faded so neither
                // stretches; layer B crosses it slowly
                const float cycle = 2.5;
                float p0 = frac(t / cycle), p1 = frac(t / cycle + 0.5);
                float w0 = 1.0 - abs(1.0 - 2.0 * p0);
                float2 drift0 = i.flow * (p0 * cycle), drift1 = i.flow * (p1 * cycle);
                half3 a0 = Ripple((xz - drift0) / _RippleA), a1 = Ripple((xz - drift1) / _RippleA + 0.37);
                half3 a = normalize(a0 * w0 + a1 * (1.0 - w0));
                half3 b = Ripple(float2(xz.y, -xz.x) / _RippleB + t * float2(0.011, 0.006));
                half3 nTS = normalize(half3(a.xy + b.xy, a.z * b.z));
                // shallows are calmer; far off the ripples fade to the mean (no shimmering moiré)
                float dist = distance(_WorldSpaceCameraPos, i.positionWS);
                half strength = _Strength * saturate(depth / 0.8 + 0.25) * saturate(1.4 - dist / 450.0);
                half3 n = normalize(half3(nTS.x * strength, 1.0, nTS.y * strength));

                half3 V = GetWorldSpaceNormalizeViewDir(i.positionWS);
                float4 shadowCoord = TransformWorldToShadowCoord(i.positionWS);
                Light sun = GetMainLight(shadowCoord);
                half shadow = sun.shadowAttenuation;
                half NdotV = saturate(dot(n, V));

                // the body: murk by the path through the water (deeper and more slant reads thicker)
                half path = max(depth, 0.0) / max(V.y, 0.3);
                half murk = 1.0 - exp(-path * _Clarity);
                half3 bodyColour = lerp(_ShallowColor.rgb, _DeepColor.rgb, saturate(depth / _DeepAt));
                half3 ambient = SampleSH(half3(0, 1, 0));
                half3 body = bodyColour * (ambient + sun.color * (saturate(dot(half3(0, 1, 0), sun.direction)) * (0.35 + 0.65 * shadow)) * 0.6);

                // the sky by Fresnel (Schlick, water's F0 0.02), the sun as a glint
                half fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
                half3 R = reflect(-V, n);
                half perceptual = 1.0 - _Smoothness;
                half3 sky = GlossyEnvironmentReflection(R, i.positionWS, perceptual, 1.0h, GetNormalizedScreenSpaceUV(i.positionCS));
                half3 H = normalize(sun.direction + V);
                half glint = pow(saturate(dot(n, H)), 380.0) * 6.0 * shadow;
                half3 spec = sun.color * glint;

                // foam: a thin broken lace where the sea runs up the shore, moving a little; a river's edge barely has any
                half foamBand = saturate(1.0 - depth / _FoamDepth) * step(0.0, depth);
                half foamNoise = Noise(xz * 0.9 + t * float2(0.15, 0.1)) * 0.6 + Noise(xz * 2.7 - t * 0.2) * 0.4;
                half river = saturate(length(i.flow) * 2.0 - 0.3);
                half foam = saturate((foamBand * 1.15 - (1.0 - foamNoise)) * 2.0) * lerp(0.7, 0.3, river);

                half cover = saturate(murk * (1.0 - fresnel) + fresnel);
                half3 colour = body * murk * (1.0 - fresnel) + sky * fresnel + spec;
                half3 foamLit = _FoamColor.rgb * (ambient + sun.color * (0.35 + 0.65 * shadow) * 0.7);
                colour = lerp(colour, foamLit, foam);
                cover = lerp(cover, 1.0, foam);
                // the shoreline: the sheet fades out where it runs under the bank
                half edge = saturate(depth / _Edge);
                colour *= edge; cover *= edge;
                colour = MixFogColor(colour, unity_FogColor.rgb * cover, i.fog);
                return half4(colour, cover);
            }
            ENDHLSL
        }
    }
    Fallback Off
}
