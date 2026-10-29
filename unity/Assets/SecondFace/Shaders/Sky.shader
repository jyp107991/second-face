// The world's sky (BUILD_PLAN §6.A.6, §6.J): a procedural skybox driven by SkyController from Core's SkyLook — a
// gradient from the zenith to the horizon and down to the ground, the sun's disc and glow, the moon, stars at night and
// one layer of clouds drifting with the wind. No HDRI, no textures: everything is a few lines of arithmetic a pixel,
// cheap on a phone. Ambient light does not come from here (SkyController sets the trilight ambient from the same look).
Shader "SecondFace/Sky"
{
    Properties
    {
        _Zenith ("Zenith", Color) = (0.2, 0.4, 0.8, 1)
        _Horizon ("Horizon", Color) = (0.7, 0.8, 0.9, 1)
        _Ground ("Ground", Color) = (0.3, 0.27, 0.22, 1)
        _SunGlow ("Sun glow", Color) = (1, 0.9, 0.8, 1)
        _Fog ("Fog (the horizon's haze and everything below it)", Color) = (0.8, 0.8, 0.8, 1)
        _SunDir ("Sun direction (to the sun)", Vector) = (0, 0.5, 0.8, 0)
        _MoonDir ("Moon direction (to the moon)", Vector) = (0, 0.6, -0.8, 0)
        _SunSize ("Sun disc radius (radians)", Float) = 0.012
        _Clouds ("Cloud cover", Range(0, 1)) = 0.2
        _CloudColour ("Cloud colour", Color) = (1, 1, 1, 1)
        _Stars ("Stars", Range(0, 1)) = 0
        _Moon ("Moon", Range(0, 1)) = 0
        _Wind ("Cloud drift (xz, per second)", Vector) = (0.004, 0.0015, 0, 0)
    }
    SubShader
    {
        Tags { "Queue" = "Background" "RenderType" = "Background" "PreviewType" = "Skybox" "RenderPipeline" = "UniversalPipeline" }
        Cull Off ZWrite Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _Zenith, _Horizon, _Ground, _SunGlow, _CloudColour, _Fog;
                float4 _SunDir, _MoonDir, _Wind;
                float _SunSize, _Clouds, _Stars, _Moon;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; UNITY_VERTEX_INPUT_INSTANCE_ID };
            struct Varyings { float4 positionCS : SV_POSITION; float3 dir : TEXCOORD0; UNITY_VERTEX_OUTPUT_STEREO };

            Varyings Vert(Attributes v)
            {
                Varyings o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.dir = v.positionOS.xyz;
                return o;
            }

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

            float Fbm(float2 p)
            {
                float s = 0, a = 0.5;
                for (int k = 0; k < 4; k++) { s += a * Noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
                return s / 0.9375;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                float3 d = normalize(i.dir);
                float y = d.y;

                // the dome: zenith to horizon, then the fog's colour in a haze band at the horizon and below it, so the
                // edge of the streamed ground fades into the sky instead of standing on a dark line
                half up = (half)pow(saturate(y), 0.45);
                half3 col = lerp(_Horizon.rgb, _Zenith.rgb, up);
                col = lerp(col, _Fog.rgb, (half)(exp(-max(y, 0.0) * 14.0) * 0.8));
                col = lerp(col, _Fog.rgb, (half)smoothstep(0.0, -0.05, y));

                // the sun: a glow round it that widens the horizon's warmth towards it, and the disc
                float3 sun = normalize(_SunDir.xyz);
                float cs = dot(d, sun);
                half sunUp = (half)saturate(sun.y * 4.0 + 0.6);
                half glow = (half)(pow(saturate(cs), 6.0) * 0.35 + pow(saturate(cs), 48.0) * 0.6) * sunUp;
                col += _SunGlow.rgb * glow * (1.0h - 0.6h * (half)_Clouds);
                half disc = (half)smoothstep(cos(_SunSize * 1.15), cos(_SunSize), cs) * (half)step(-0.02, y);
                col = lerp(col, _SunGlow.rgb * 6.0h, disc * (1.0h - (half)_Clouds * 0.85h) * sunUp);

                // the night: stars in a fixed field (they drift with nothing; there is no calendar) and the moon
                if (_Stars > 0.001)
                {
                    float2 cell = floor(d.xz / max(0.15, y + 0.15) * 180.0);
                    float h = Hash(cell);
                    half star = (half)(step(0.9965, h) * (0.5 + 0.5 * Hash(cell + 7.3))) * (half)saturate(y * 5.0);
                    col += star * (half)_Stars * 0.9h;
                }
                float3 moon = normalize(_MoonDir.xyz);
                half moonDisc = (half)smoothstep(cos(0.03), cos(0.026), dot(d, moon));
                col = lerp(col, half3(0.85h, 0.88h, 0.95h), moonDisc * (half)_Moon);
                col += half3(0.25h, 0.3h, 0.42h) * (half)(pow(saturate(dot(d, moon)), 64.0) * 0.4 * _Moon);

                // the clouds: one layer on a plane over the world, thinning to the horizon
                if (y > 0.0 && _Clouds > 0.001)
                {
                    float2 uv = d.xz / (y + 0.12) * 0.9 + _Wind.xy * _Time.y;
                    float n = Fbm(uv * 2.2);
                    half c = (half)smoothstep(1.0 - _Clouds, 1.0 - _Clouds + 0.35, n) * (half)smoothstep(0.0, 0.25, y);
                    half lit = (half)(0.75 + 0.25 * saturate(dot(sun, float3(0, 1, 0)) + pow(saturate(cs), 4.0)));
                    col = lerp(col, _CloudColour.rgb * lit, c * 0.92h);
                }
                return half4(col, 1);
            }
            ENDHLSL
        }
    }
    Fallback Off
}
