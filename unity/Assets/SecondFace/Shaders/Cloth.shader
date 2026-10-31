// The player's garments (P4.10): URP PBR (main light with shadows, additional lights, screen-space occlusion, fog),
// double-sided with an alpha cut like the people's Lit cloth, plus what the wardrobe sets per garment: _Inflate, the
// distance a layer stands off the ones under it along its normals (a coat over a shirt both fitted to the bare body
// let the shirt show through), and the content's look of a worn piece: _Grime, dirt heaviest towards the hem (by the
// garment's own height above the feet), broken up by a little noise, and _Wear, sun-fading (paler, greyer). The
// player's hair and eyes use it too (P5.3i): _Recolour turns the texture to a chosen colour keeping its light and dark
// (the whole of it for hair; with _RecolourIris only the saturated, dark iris, the white of the eye left alone), and
// hair turns the sky's reflection and the specular highlight off (the hair rule: dull, never glossy).
Shader "SecondFace/Cloth"
{
    Properties
    {
        _BaseMap ("Albedo (A cut-out)", 2D) = "white" {}
        _BaseColor ("Tint", Color) = (1, 1, 1, 1)
        _BumpMap ("Normal", 2D) = "bump" {}
        _BumpScale ("Normal strength", Float) = 1
        _Smoothness ("Smoothness", Range(0, 1)) = 0.32
        _Cutoff ("Alpha cut-off", Range(0, 1)) = 0.5
        _Inflate ("Stand-off along the normals (m)", Range(0, 0.03)) = 0
        _Grime ("Grime", Range(0, 1)) = 0
        _Wear ("Sun and wear", Range(0, 1)) = 0
        _Dyed ("Dyed (the tint is a dye: the cloth takes its colour)", Float) = 0
        [NoScaleOffset] _CoverMask ("Covered base vertices (128 x 128, by an outer garment)", 2D) = "black" {}
        _Recolour ("Recolour (a: how much)", Color) = (0, 0, 0, 0)
        _RecolourLum ("The texture's mean luminance", Float) = 0.2
        [Toggle] _RecolourIris ("Only the iris", Float) = 0
        _EyeYears ("The eye's years (the white yellower and duller)", Range(0, 1)) = 0
        _EyeWhite ("The white against the skin, a linear multiplier (Core Looks.EyeWhite)", Vector) = (1, 1, 1, 1)
        [Toggle(_ENVIRONMENTREFLECTIONS_OFF)] _EnvironmentReflectionsOff ("No sky reflection", Float) = 0
        [Toggle(_SPECULARHIGHLIGHTS_OFF)] _SpecularHighlightsOff ("No highlight", Float) = 0
        _HairSheen ("Hair: a soft band of light along the strands (0 none)", Range(0, 1)) = 0
        _Grey ("Hair: the share of strands gone white (salt and pepper)", Range(0, 1)) = 0
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull", Float) = 0
    }
    SubShader
    {
        Tags { "Queue" = "AlphaTest" "RenderType" = "TransparentCutout" "RenderPipeline" = "UniversalPipeline" }
        Cull [_Cull]

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

        TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
        TEXTURE2D(_BumpMap); SAMPLER(sampler_BumpMap);
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _BaseColor;
            half4 _Recolour;
            half _BumpScale, _Smoothness, _Cutoff, _Grime, _Wear, _RecolourLum, _RecolourIris, _Dyed, _HairSheen, _Grey, _EyeYears;
            half4 _EyeWhite;
            float _Inflate;
        CBUFFER_END

        struct Attributes
        {
            // the vertex's nearest MakeHuman base vertex as (i % 128, i / 128) in uv1 (mh_build): an outer garment's
            // cover mask hides this one under it (a waistband under a sweater, a boot's shaft under a trouser leg)
            float2 baseIndex : TEXCOORD1;
            float4 positionOS : POSITION;
            float3 normalOS : NORMAL;
            float4 tangentOS : TANGENT;
            float2 uv : TEXCOORD0;
            UNITY_VERTEX_INPUT_INSTANCE_ID
        };

        // the garment pushed out along its normals by its layer's stand-off
        float3 Inflated(Attributes v) { return v.positionOS.xyz + normalize(v.normalOS) * _Inflate; }

        half Cut(float2 uv) { return SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv).a * _BaseColor.a - _Cutoff; }
        TEXTURE2D(_CoverMask); SAMPLER(sampler_cover_point_clamp);
        // 1 where an outer garment covers this vertex's body vertex (sampled per vertex, so a covered edge fades over
        // half a triangle, as the skin's hidden mask does)
        half Covered(float2 baseIndex) { return SAMPLE_TEXTURE2D_LOD(_CoverMask, sampler_cover_point_clamp, (floor(baseIndex + 0.5) + 0.5) / 128.0, 0).r; }

        // a cheap value noise (for the grime's patches)
        float Hash(float3 p) { p = frac(p * 0.3183099 + 0.1); p *= 17.0; return frac(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float Noise(float3 x)
        {
            float3 i = floor(x), f = frac(x);
            f = f * f * (3.0 - 2.0 * f);
            return lerp(lerp(lerp(Hash(i), Hash(i + float3(1, 0, 0)), f.x), lerp(Hash(i + float3(0, 1, 0)), Hash(i + float3(1, 1, 0)), f.x), f.y),
                        lerp(lerp(Hash(i + float3(0, 0, 1)), Hash(i + float3(1, 0, 1)), f.x), lerp(Hash(i + float3(0, 1, 1)), Hash(i + float3(1, 1, 1)), f.x), f.y), f.z);
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
            #pragma shader_feature_local_fragment _ENVIRONMENTREFLECTIONS_OFF
            #pragma shader_feature_local_fragment _SPECULARHIGHLIGHTS_OFF
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                half3 normalWS : TEXCOORD2;
                half4 tangentWS : TEXCOORD3;
                float3 positionOS : TEXCOORD4;
                half fog : TEXCOORD5;
                half cover : TEXCOORD6;
            };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                float3 pos = Inflated(v);
                VertexPositionInputs p = GetVertexPositionInputs(pos);
                VertexNormalInputs n = GetVertexNormalInputs(v.normalOS, v.tangentOS);
                o.positionCS = p.positionCS;
                o.positionWS = p.positionWS;
                o.normalWS = n.normalWS;
                o.tangentWS = half4(n.tangentWS, v.tangentOS.w * GetOddNegativeScale());
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                o.positionOS = pos;
                o.fog = ComputeFogFactor(p.positionCS.z);
                o.cover = Covered(v.baseIndex);
                return o;
            }

            half4 Frag(Varyings i, FRONT_FACE_TYPE face : FRONT_FACE_SEMANTIC) : SV_Target
            {
                clip(0.5h - i.cover);
                half4 tex = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv);
                half4 albedo = tex * _BaseColor;
                // a dye is a colour, not a tint (P4.14, the owner: too much grey): dyed cloth takes the dye's own colour
                // lit and shaded by the weave (the undyed bake is a khaki near 0.3 in linear light), so an indigo reads
                // indigo and not khaki-blue; the patches of other cloth stay as lighter or darker of the same dye
                if (_Dyed > 0.5h) albedo.rgb = _BaseColor.rgb * saturate(dot(tex.rgb, half3(0.299h, 0.587h, 0.114h)) / 0.3h);
                clip(albedo.a - _Cutoff);
                half smoothness = _Smoothness;
                // a chosen colour with the texture's own light and dark (hair), or for the iris alone (eyes)
                if (_Recolour.a > 0.001h)
                {
                    half lum = dot(albedo.rgb, half3(0.3h, 0.59h, 0.11h));
                    half w = _Recolour.a;
                    if (_RecolourIris > 0.5h)
                    {
                        half mx = max(albedo.r, max(albedo.g, albedo.b)), mn = min(albedo.r, min(albedo.g, albedo.b));
                        half sat = (mx - mn) / max(mx, 0.001h);
                        w *= smoothstep(0.3h, 0.5h, sat) * (1.0h - smoothstep(0.3h, 0.55h, lum));
                    }
                    half3 colour = _Recolour.rgb;
                    // the iris as photographs show it (R4c, gate/contrast.py): about L* 19 in faces whose skin reads 30-45;
                    // ours read 21-26, and on dark skin lighter than the skin. The cornea's shade and the lid over its top
                    // take most of the light a bare iris texture keeps
                    if (_RecolourIris > 0.5h) colour *= 0.6h;
                    half detail = min(lum / max(_RecolourLum, 0.001h), 2.0h);
                    if (_Grey > 0.001h)
                    {
                        // salt and pepper (R5): each strand (a column of the strand atlas, about three texels) pigmented or
                        // white by the share gone white, the strands' own light and dark kept under a dull, yellowed white
                        // that never clips (a white groom recoloured whole read as a flat cap); where a strand is under a
                        // pixel, their mean (per-pixel white hairs sparkle)
                        float sx = i.uv.x * 340.0;
                        half white = step((half)Hash(float3(floor(sx), 7.3, 1.9)), _Grey);
                        // and where a strand's column stretches over a few pixels (the layer's u is a triangle wave round the
                        // flow, and where it folds back a whole 7 mm face spans a few columns: pigmented columns read as dark
                        // slots in grey hair, R5), the mix; each strand only a third of the way from the mix to its own
                        // colour (salt and pepper reads as a grey at a speaking distance; a card is many hairs), and the
                        // locks (other columns) the mix
                        white = lerp(white, _Grey, max((half)saturate(fwidth(sx) * 1.5 - 0.5), (half)saturate((0.35 - fwidth(sx)) * 6.0)));
                        white = lerp(_Grey, white, 0.35h);
                        if (i.uv.x >= 0.25) white = _Grey;
                        colour = lerp(colour, half3(0.46h, 0.44h, 0.4h), white);
                    }
                    // a light hair's strands kept apart: the dark between them deeper the lighter the colour (on fair and grey
                    // hair the bake's contrast alone flattened to a cap; dark hair hides it), and never past white
                    if (_RecolourIris < 0.5h)
                        detail = min(pow(max(detail, 0.05h), 1.0h + 0.4h * saturate(dot(colour, half3(0.3h, 0.59h, 0.11h)) * 2.0h)), 0.95h / max(max(colour.r, colour.g), 0.05h));
                    albedo.rgb = lerp(albedo.rgb, colour * detail, w);
                }
                if (_RecolourIris > 0.5h)
                {
                    // the white of the eye as photographs show it (R4): never paper white, shaded towards where the lids and
                    // lashes meet it (by the distance from the iris on each eyeball of the texture: the irises at (0.705,
                    // 0.703) and (0.289, 0.291), 0.115 across), yellower and duller with the years; the wet highlight stays
                    float d = min(distance(i.uv, float2(0.705, 0.703)), distance(i.uv, float2(0.289, 0.291)));
                    half white = (half)smoothstep(0.1, 0.13, d);
                    half shade = (half)smoothstep(0.12, 0.27, d);
                    // (measured, R4: real eye openings read a third darker than the skin round them, ours as light as it)
                    // (R4c: and as bright against the skin as photographs show it, the conjunctiva's pigment on darker skin)
                    albedo.rgb *= lerp(1.0h, half3(0.72h, 0.66h, 0.62h) * _EyeWhite.rgb * (1.0h - 0.65h * shade) * (1.0h - _EyeYears * half3(0.1h, 0.14h, 0.24h)), white);
                    // the upper lid and its lashes shade the top of the eyeball, iris and white alike (by the eyeball's
                    // normal, which looks up there; faces are upright in the portraits and the game)
                    albedo.rgb *= 1.0h - 0.7h * (half)smoothstep(-0.25, 0.4, normalize(i.normalWS).y);
                    // the iris dull under the cornea (the eyeball carries no cornea shell, so its gloss made the iris a mirror of
                    // the room: brown eyes read silver); the white wet; the highlight stays a small catchlight
                    smoothness = lerp(0.42h, smoothness, white);
                }
                // hair: each strand and each clump of strands a little lighter or darker than the next (a column of the strand
                // atlas, about three texels, and a band of about thirty), so the layer reads as strands and locks, not a
                // smooth shell; where they are under a pixel, their mean (R5)
                half strandFade = 1.0h, clumpFade = 1.0h, strandId = 0.5h, clumpId = 0.5h;
                if (_HairSheen > 0.001h)
                {
                    float sx = i.uv.x * 340.0, cx = i.uv.x * 34.0;
                    strandFade = (half)max(saturate(fwidth(sx) * 1.5 - 0.5), saturate(1.0 - fwidth(sx) * 10.0));
                    clumpFade = (half)max(saturate(fwidth(cx) * 1.5 - 0.5), saturate(1.0 - fwidth(cx) * 100.0));
                    strandId = (half)Hash(float3(floor(sx), 3.1, 8.7));
                    clumpId = (half)Hash(float3(floor(cx), 5.3, 2.9));
                    albedo.rgb *= lerp(0.72h + 0.56h * strandId, 1.0h, strandFade) * lerp(0.82h + 0.36h * clumpId, 1.0h, clumpFade);
                }
                // sun and wear: paler and greyer
                if (_Wear > 0.001h)
                {
                    half grey = dot(albedo.rgb, half3(0.3h, 0.59h, 0.11h));
                    albedo.rgb = lerp(albedo.rgb, lerp(grey.xxx, albedo.rgb, 0.55h) * 1.08h + 0.03h, _Wear);
                }
                // grime: heaviest at the hem and the feet, in patches; dirt also dulls the cloth
                if (_Grime > 0.001h)
                {
                    half hem = pow(saturate(1.15h - (half)i.positionOS.y / 1.1h), 1.5h);
                    half patch = (half)(0.55 + 0.9 * Noise(i.positionOS * 9.0) * Noise(i.positionOS * 2.3 + 7.0));
                    // over the whole piece (it is worn every day), heaviest at the hem; dull, brown, never black
                    half g = saturate(_Grime * (0.55h + 0.65h * hem) * patch);
                    albedo.rgb = lerp(albedo.rgb, albedo.rgb * 0.5h + half3(0.3h, 0.25h, 0.19h) * 0.4h, g);
                    smoothness *= 1.0h - 0.6h * g;
                }
                half3 normalTS = UnpackNormalScale(SAMPLE_TEXTURE2D(_BumpMap, sampler_BumpMap, i.uv), _BumpScale);
                half3 nrm = IS_FRONT_VFACE(face, i.normalWS, -i.normalWS);
                half3 bitangent = i.tangentWS.w * cross(nrm, i.tangentWS.xyz);
                half3 normalWS = NormalizeNormalPerPixel(TransformTangentToWorld(normalTS, half3x3(i.tangentWS.xyz, bitangent, nrm)));

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
                surface.smoothness = smoothness;
                surface.occlusion = 1;
                surface.normalTS = normalTS;
                surface.alpha = 1;

                half4 colour = UniversalFragmentPBR(input, surface);
                // sheen (P4.14 step 6): a weave's nap catches the light at grazing angles, the rougher the more
                Light mainL = GetMainLight(input.shadowCoord);
                half nv = saturate(dot(normalWS, input.viewDirectionWS));
                half sheen = pow(1.0h - nv, 4.0h) * (1.0h - smoothness) * saturate(dot(normalWS, mainL.direction) + 0.4h);
                colour.rgb += (albedo.rgb * 0.5h + 0.5h) * sheen * mainL.color * mainL.shadowAttenuation * 0.3h;
                if (_HairSheen > 0.001h)
                {
                    // hair scatters light into its own shade: under a lock lifted a millimetre off the layer, the shadow map
                    // cut the light to black (R5: dark holes in a grey bun); part of it given back, the lock's shade kept
                    colour.rgb += albedo.rgb * mainL.color * saturate(dot(normalWS, mainL.direction) * 0.5h + 0.5h) * (1.0h - mainL.shadowAttenuation) * 0.45h;
                    // P4.15c, hair: Kajiya-Kay along the strand (the cards run root to tip along v, so the strand is the
                    // bitangent), two bands shifted along the normal, the second tinted by the hair; broad, as on dry,
                    // dusty hair, the shift broken up by each strand and each clump (R5: one smooth band read as a plastic
                    // shell; real hair's highlight is torn along its strands)
                    half3 strand = normalize(bitangent);
                    half3 h = normalize(mainL.direction + input.viewDirectionWS);
                    half jitter = (tex.r - 0.5h) * 0.6h + lerp(strandId - 0.5h, 0.0h, strandFade) * 0.5h + lerp(clumpId - 0.5h, 0.0h, clumpFade) * 0.6h;
                    half3 t1 = normalize(strand + nrm * (0.08h + jitter));
                    half3 t2 = normalize(strand + nrm * (-0.12h + jitter));
                    half th1 = dot(t1, h), th2 = dot(t2, h);
                    half band1 = pow(saturate(sqrt(1.0h - th1 * th1)), 28.0h);
                    half band2 = pow(saturate(sqrt(1.0h - th2 * th2)), 9.0h);
                    half lit = saturate(dot(nrm, mainL.direction) * 0.6h + 0.4h) * mainL.shadowAttenuation;
                    colour.rgb += (band1 * 0.16h * (1.0h - 0.6h * saturate(dot(albedo.rgb, half3(0.3h, 0.59h, 0.11h)) * 2.5h)) + band2 * 0.35h * albedo.rgb) * mainL.color * lit * _HairSheen;
                }
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

            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; half cover : TEXCOORD1; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                float3 ws = TransformObjectToWorld(Inflated(v));
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
                o.cover = Covered(v.baseIndex);
                return o;
            }

            half4 Frag(Varyings i) : SV_Target { clip(min(Cut(i.uv), 0.5h - i.cover)); return 0; }
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

            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; half cover : TEXCOORD1; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionCS = TransformObjectToHClip(Inflated(v));
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                o.cover = Covered(v.baseIndex);
                return o;
            }

            half Frag(Varyings i) : SV_Target { clip(min(Cut(i.uv), 0.5h - i.cover)); return i.positionCS.z; }
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

            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; half3 normalWS : TEXCOORD1; half cover : TEXCOORD2; };

            Varyings Vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                Varyings o;
                o.positionCS = TransformObjectToHClip(Inflated(v));
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                o.cover = Covered(v.baseIndex);
                return o;
            }

            half4 Frag(Varyings i, FRONT_FACE_TYPE face : FRONT_FACE_SEMANTIC) : SV_Target
            {
                clip(min(Cut(i.uv), 0.5h - i.cover));
                float3 n = normalize(IS_FRONT_VFACE(face, i.normalWS, -i.normalWS));
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
