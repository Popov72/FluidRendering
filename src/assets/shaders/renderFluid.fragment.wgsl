// Index of refraction for water
const IOR = 1.333;

// Ratios of air and water IOR for refraction
// Air to water
const ETA = 0.7501875468867217; // 1.0 / IOR;

// Fresnel at 0°
const F0 = 0.02;

var textureSampler : texture_2d<f32>;
var textureSamplerSampler : sampler;
var depthSampler : texture_2d<f32>;
#ifdef FLUIDRENDERING_DIFFUSETEXTURE
    var diffuseSampler : texture_2d<f32>;
    var diffuseSamplerSampler : sampler;
#else
    uniform diffuseColor : vec3<f32>;
#endif
#ifdef FLUIDRENDERING_FIXED_THICKNESS
    uniform thickness : f32;
    var bgDepthSampler: texture_depth_2d;
    var bgDepthSamplerSampler: sampler;
#else
    uniform minimumThickness : f32;
    var thicknessSampler : texture_2d<f32>;
    var thicknessSamplerSampler : sampler;
#endif
var reflectionSampler : texture_cube<f32>;
var reflectionSamplerSampler : sampler;
#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)
    var debugSampler : texture_2d<f32>;
    var debugSamplerSampler : sampler;
#endif

uniform viewMatrix : mat4x4<f32>;
uniform projectionMatrix : mat4x4<f32>;
uniform invProjectionMatrix : mat4x4<f32>;
uniform texelSize : vec2<f32>;
uniform dirLight : vec3<f32>;
uniform cameraFar : f32;
uniform density : f32;
uniform refractionStrength : f32;
uniform fresnelClamp : f32;
uniform specularPower : f32;

varying vUV : vec2<f32>;

fn computeViewPosFromUVDepth(texCoord : vec2<f32>, depth : f32) -> vec3<f32> {
    let ndc = vec4(texCoord * 2.0 - 1.0, uniforms.projectionMatrix[2].z + uniforms.projectionMatrix[3].z / depth, 1.0);

    var eyePos = uniforms.invProjectionMatrix * ndc;

    return eyePos.xyz / eyePos.w;
}

fn getViewPosFromTexCoord(texCoord : vec2<f32>) -> vec3<f32> {
    let dim = textureDimensions(depthSampler);
    let depth = textureLoad(depthSampler, vec2<i32>(texCoord * vec2<f32>(dim)), 0).x;
    return computeViewPosFromUVDepth(texCoord, depth);
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let texCoord = vUV;

#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)
    #ifdef FLUIDRENDERING_DEBUG_DEPTH
        let dim2 = textureDimensions(debugSampler);
        let color = textureLoad(debugSampler, vec2<i32>(texCoord * vec2<f32>(dim2)), 0);
        gl_FragColor = vec4(color.rgb / 2.0, 1.);
        if (color.r > 0.999 && color.g > 0.999) {
            gl_FragColor = textureSample(textureSampler, textureSamplerSampler, texCoord);
        }
    #else
        let color = textureSample(debugSampler, debugSamplerSampler, texCoord);
        gl_FragColor = vec4(color.rgb, 1.);
        if (color.r < 0.001 && color.g < 0.001 && color.b < 0.001) {
            gl_FragColor = textureSample(textureSampler, textureSamplerSampler, texCoord);
        }
    #endif
    output.color = gl_FragColor;
    return output;
#endif

    let dim = textureDimensions(depthSampler);
    let depthVel = textureLoad(depthSampler, vec2<i32>(texCoord * vec2<f32>(dim)), 0).rg;
    let depth = depthVel.r;
#ifndef FLUIDRENDERING_FIXED_THICKNESS
    let thickness_ = textureSample(thicknessSampler, thicknessSamplerSampler, texCoord).x;
#else
    let bgDepth = textureSample(bgDepthSampler, bgDepthSamplerSampler, texCoord);
    let depthNonLinear = uniforms.projectionMatrix[2].z + uniforms.projectionMatrix[3].z / depth;
    let thickness_ = uniforms.thickness;
#endif
    let thickness = thickness_;

#ifndef FLUIDRENDERING_FIXED_THICKNESS
    if (depth >= uniforms.cameraFar || depth <= 0. || thickness <= uniforms.minimumThickness) {
#else
    if (depth >= uniforms.cameraFar || depth <= 0. || bgDepth <= depthNonLinear) {
#endif
        let backColor = textureSample(textureSampler, textureSamplerSampler, texCoord).rgb;
        gl_FragColor = vec4(backColor, 1.);
        output.color = gl_FragColor;
        return output;
    }

    // calculate view-space position from depth
    let viewPos = computeViewPosFromUVDepth(texCoord, depth);

    // calculate normal
    var ddx = getViewPosFromTexCoord(texCoord + vec2(uniforms.texelSize.x, 0.)) - viewPos;
    var ddy = getViewPosFromTexCoord(texCoord + vec2(0., uniforms.texelSize.y)) - viewPos;

    let ddx2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(-uniforms.texelSize.x, 0.));
    if (abs(ddx.z) > abs(ddx2.z)) {
        ddx = ddx2;
    }

    let ddy2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(0., -uniforms.texelSize.y));
    if (abs(ddy.z) > abs(ddy2.z)) {
        ddy = ddy2;
    }

    let normal = normalize(cross(ddy, ddx));

#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_SHOWNORMAL)
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
    output.color = gl_FragColor;
    return output;
#endif

    // shading
    let rayDir = normalize(viewPos); // direction from camera position to view position

#ifdef FLUIDRENDERING_DIFFUSETEXTURE
    let diffuseColor_ = textureSample(diffuseSampler, diffuseSamplerSampler, texCoord).rgb;
#else
    let diffuseColor_ = uniforms.diffuseColor;
#endif
    let diffuseColor = diffuseColor_;

    let  lightDir = normalize((uniforms.viewMatrix * vec4(-uniforms.dirLight, 0.)).xyz);
    let  H        = normalize(lightDir - rayDir);
    let specular = pow(max(0.0, dot(H, normal)), uniforms.specularPower);

#ifdef FLUIDRENDERING_DEBUG_DIFFUSERENDERING
    let diffuse  = max(0.0, dot(lightDir, normal)) * 1.0;

    gl_FragColor = vec4(vec3(0.1) + vec3(0.42, 0.50, 1.00) * diffuse + vec3(0, 0, 0.2) + specular, 1.);
    output.color = gl_FragColor;
    return output;
#endif

    // Refraction color
    let refractionDir = refract(rayDir, normal, ETA);

    let transmitted = (textureSample(textureSampler, textureSamplerSampler, vec2(texCoord + refractionDir.xy * thickness * uniforms.refractionStrength)).rgb);
    let transmittance = exp(-uniforms.density * thickness * (1.0 - diffuseColor)); // Beer law
   
    let refractionColor = transmitted * transmittance;

    // Reflection of the environment.
    let reflectionDir = reflect(rayDir, normal);
    let reflectionColor = textureSample(reflectionSampler, reflectionSamplerSampler, reflectionDir).rgb;

    // Combine refraction and reflection    
    let fresnel = clamp(F0 + (1.0 - F0) * pow(1.0 - dot(normal, -rayDir), 5.0), 0., uniforms.fresnelClamp);
    
    var finalColor = mix(refractionColor, reflectionColor, fresnel) + specular;

#ifdef FLUIDRENDERING_VELOCITY
    let velocity = depthVel.g;
    finalColor = mix(finalColor, vec3(1.0), smoothstep(0.3, 1.0, velocity / 6.0));
#endif

    gl_FragColor = vec4(finalColor, 1.);
}
