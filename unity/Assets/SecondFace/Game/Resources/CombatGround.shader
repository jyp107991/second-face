// The fight's marks on the ground (COMBAT.md B1, B2, B4, B5; Game/Play/CombatOverlay.cs): the reachable bands, the walk's
// path, a throw's footprint, held shots' cones, the pad's cursor. Unlit, alpha-blended, vertex colour (the soft edges are
// in the vertices' alpha), with fog. Vertices are pulled towards the camera along the view ray by a few centimetres plus
// 0.4 % of the distance (as the roads are): drawn just over the ground they lie on, never sunk in its LOD mesh, never
// shifted on screen. In a Resources folder so the player build carries it (Shader.Find).
Shader "SecondFace/Combat Ground"
{
    Properties { }
    SubShader
    {
        Tags { "Queue" = "Transparent-20" "RenderType" = "Transparent" "IgnoreProjector" = "True" "RenderPipeline" = "UniversalPipeline" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        ZTest LEqual
        Cull Off

        Pass
        {
            Name "Unlit"
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes { float4 positionOS : POSITION; half4 color : COLOR; };
            struct Varyings { float4 positionCS : SV_POSITION; half4 color : COLOR; half fog : TEXCOORD0; };

            Varyings Vert(Attributes v)
            {
                Varyings o;
                float3 ws = TransformObjectToWorld(v.positionOS.xyz);
                float3 toCam = _WorldSpaceCameraPos - ws;
                float d = length(toCam);
                ws += toCam / max(d, 1e-3) * (0.04 + 0.004 * d);
                o.positionCS = TransformWorldToHClip(ws);
                o.color = v.color;
                o.fog = ComputeFogFactor(o.positionCS.z);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target
            {
                half4 c = i.color;
                c.rgb = MixFog(c.rgb, i.fog);
                return c;
            }
            ENDHLSL
        }
    }
    Fallback Off
}
