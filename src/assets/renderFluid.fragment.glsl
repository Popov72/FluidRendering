#define GAMMA 2.2
#define INV_GAMMA (1.0/GAMMA)

// Index of refraction for water
#define IOR 1.333

// Ratios of air and water IOR for refraction
// Air to water
#define ETA 1.0/IOR
// Water to air
#define ETA_REVERSE IOR

uniform sampler2D textureSampler;
uniform sampler2D depthSampler;
#ifdef FLUIDRENDERING_DIFFUSETEXTURE
    uniform sampler2D diffuseSampler;
#else
    uniform vec3 diffuseColor;
#endif
uniform sampler2D thicknessSampler;
uniform samplerCube reflectionSampler;
#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)
    uniform sampler2D debugSampler;
#endif

uniform mat4 projection;
uniform mat4 invProjection;
uniform mat4 invView;
uniform float texelSize;
uniform vec3 dirLight;
uniform vec3 camPos;
uniform float cameraFar;
uniform float clarity;
uniform float density;

varying vec2 vUV;

vec3 computeViewPosFromUVDepth(vec2 texCoord, float depth) {
    vec4 ndc;
    
    ndc.xy = texCoord * 2.0 - 1.0;
    ndc.z = projection[2].z + projection[3].z / depth;
    ndc.w = 1.0;

    vec4 eyePos = invProjection * ndc;
    eyePos.xyz /= eyePos.w;

    return eyePos.xyz;
}

vec3 getViewPosFromTexCoord(vec2 texCoord) {
    float depth = texture2D(depthSampler, texCoord).x;
    return computeViewPosFromUVDepth(texCoord, depth);
}

vec3 gamma(vec3 col) {
    return pow(col, vec3(INV_GAMMA));
}
vec3 inv_gamma(vec3 col) {
    return pow(col, vec3(GAMMA));
}

// Fresnel-Schlick
vec3 fresnel(float cosTheta, vec3 F0){
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
} 

vec3 getEnvironment(vec3 rayDir, vec3 n, float thickness, vec3 fluidColour, vec2 texCoord){
    vec3 refractedDir = normalize(refract(rayDir, n, ETA));
    vec3 transmitted = inv_gamma(texture2D(textureSampler, vec2(texCoord + refractedDir.xy * thickness * 0.02)).rgb);
    
    // Beer's law depending on the fluid colour
    vec3 transmittance = exp(-density * thickness * (1.0 - fluidColour));
    
    vec3 refractionColor = transmitted * transmittance;
    return refractionColor;
}

vec3 shading(vec3 p, vec3 n, vec3 rayDir, float thickness, vec3 diffuseColor, vec2 texCoord){
    vec3 F0 = vec3(0.02);

    vec3 result = vec3(0);
    
    result += clarity * getEnvironment(refract(rayDir, n, ETA), 
                                -n,
                                thickness,
                                diffuseColor,
                                texCoord);

    // Reflection of the environment.
    vec3 reflectedDir = normalize(reflect(rayDir, n));
    vec3 reflectedCol = inv_gamma(textureCube(reflectionSampler, reflectedDir).rgb);
    
    float cosTheta = dot(n, -rayDir);
    vec3 F = clamp(fresnel(cosTheta, F0), 0., 1.);
    
    result = mix(result, reflectedCol, F);
    
    return result;
}

vec3 ACESFilm(vec3 x){
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main(void) {
    vec2 texCoord = vUV;

#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)
    vec4 color = texture2D(debugSampler, texCoord);
    glFragColor = vec4(color.rgb / vec3(cameraFar), 1.);
    return;
#endif

    float depth = texture2D(depthSampler, texCoord).x;
    float thickness = texture2D(thicknessSampler, texCoord).x;

    if (depth >= cameraFar || depth <= 0. || thickness == 0.) {
        vec3 backColor = texture2D(textureSampler, texCoord).rgb;
        glFragColor = vec4(backColor, 1.);
        return;
    }

    // calculate view-space position from depth
    vec3 viewPos = computeViewPosFromUVDepth(texCoord, depth);

    // calculate normal
    vec3 ddx = getViewPosFromTexCoord(texCoord + vec2(texelSize, 0.)) - viewPos;
    vec3 ddy = getViewPosFromTexCoord(texCoord + vec2(0., texelSize)) - viewPos;

    vec3 ddx2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(-texelSize, 0.));
    if (abs(ddx.z) > abs(ddx2.z)) {
        ddx = ddx2;
    }

    vec3 ddy2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(0., -texelSize));
    if (abs(ddy.z) > abs(ddy2.z)) {
        ddy = ddy2;
    }

    vec3 normal = cross(ddy, ddx);
#ifndef WEBGPU
    if(isnan(normal.x) || isnan(normal.y) || isnan(normal.z) ||
       isinf(normal.x) || isinf(normal.y) || isinf(normal.z)) {
        normal = vec3(0., 0., -1.);
    }
#endif

    normal = normalize(normal);

#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_SHOWNORMAL)
    glFragColor = vec4(normal * 0.5 + 0.5, 1.0);
    return;
#endif

    // shading
    vec3 rayDir = normalize(viewPos);

#ifdef FLUIDRENDERING_DIFFUSETEXTURE
    vec3 diffuseColor = texture2D(diffuseSampler, texCoord).rgb;
    #ifdef FLUIDRENDERING_DIFFUSETEXTURE_GAMMASPACE
        diffuseColor = pow(diffuseColor, vec3(GAMMA));
    #endif
#endif

    vec3 col = shading(viewPos, normal, rayDir, thickness, diffuseColor, texCoord);

    //Tonemapping.
    col = ACESFilm(col);

    //Gamma correction
    col = pow(col, vec3(INV_GAMMA));

    //Output to screen.
    glFragColor = vec4(col, 1.);
}
