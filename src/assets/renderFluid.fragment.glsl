#define PI 3.14159265
#define FOUR_PI 4.0 * PI
#define GAMMA 2.2
#define INV_GAMMA (1.0/GAMMA)

// Index of refraction for water
#define IOR 1.333

// Ratios of air and water IOR for refraction
// Air to water
#define ETA 1.0/IOR
// Water to air
#define ETA_REVERSE IOR

uniform sampler2D depthSampler;
uniform sampler2D diffuseSampler;
uniform sampler2D thicknessSampler;
uniform samplerCube reflectionSampler;

uniform mat4 projection;
uniform mat4 invProjection;
uniform mat4 invView;
uniform float texelSize;
uniform vec3 dirLight;
uniform vec3 camPos;

varying vec2 vUV;

const vec3 sunLightColour = vec3(2.0);

vec3 waterColour = 0.85 * vec3(0.1, 0.75, 0.9);

// Amount of the background visible through the water
const float CLARITY = 0.75;

// Modifiers for light attenuation
const float DENSITY = 3.5;

vec3 uvToEye(vec2 texCoord, float depth) {
    vec4 ndc;
    
    depth = depth * ##CAMERAFAR##;

    ndc.xy = texCoord * 2.0 - 1.0;
    ndc.z = projection[2].z - projection[2].w/depth;
    //ndc.z = depth * 2.0 - 1.0;
    ndc.w = 1.0;

    vec4 eyePos = invProjection * ndc;
    eyePos.xyz /= eyePos.w;

    return eyePos.xyz;
}

vec3 getEyePos(vec2 texCoord) {
    float depth = texture2D(depthSampler, texCoord).x;
    return uvToEye(texCoord, depth);
}

// Minimum dot product value
const float minDot = 1e-3;

// Clamped dot product
float dot_c(vec3 a, vec3 b) {
    return max(dot(a, b), minDot);
}
vec3 gamma(vec3 col) {
    return pow(col, vec3(INV_GAMMA));
}
vec3 inv_gamma(vec3 col) {
    return pow(col, vec3(GAMMA));
}

// Trowbridge-Reitz
float distribution(vec3 n, vec3 h, float roughness){
    float a_2 = roughness*roughness;
    return a_2/(PI*pow(pow(dot_c(n, h),2.0) * (a_2 - 1.0) + 1.0, 2.0));
}

// GGX and Schlick-Beckmann
float geometry(float cosTheta, float k){
    return (cosTheta)/(cosTheta*(1.0-k)+k);
}

float smiths(vec3 n, vec3 viewDir, vec3 lightDir, float roughness){
    float k = pow(roughness + 1.0, 2.0)/8.0; 
    return geometry(dot_c(n, lightDir), k) * geometry(dot_c(n, viewDir), k);
}

// Fresnel-Schlick
vec3 fresnel(float cosTheta, vec3 F0){
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
} 

// Specular part of Cook-Torrance BRDF
vec3 BRDF(vec3 p, vec3 n, vec3 viewDir, vec3 lightDir, vec3 F0, float roughness){
    vec3 h = normalize(viewDir + lightDir);
    float cosTheta = dot_c(h, viewDir);
    float D = distribution(n, h, roughness);
    vec3 F = fresnel(cosTheta, F0);
    float G = smiths(n, viewDir, lightDir, roughness);
    
    vec3 specular =  D * F * G / max(0.0001, (4.0 * dot_c(lightDir, n) * dot_c(viewDir, n)));
    
    return specular;
}

vec3 getSkyColour(vec3 rayDir){
    //return 0.5*(0.5+0.5*rayDir);
    return inv_gamma(textureCube(reflectionSampler, rayDir).rgb);
}

vec3 getEnvironment(vec3 rayDir, vec3 geoNormalFar, float thickness, out vec3 transmittance){
    vec3 refractedDir = normalize(refract(rayDir, geoNormalFar, ETA_REVERSE));
    vec3 transmitted = getSkyColour(refractedDir);
    
    // View depth
    float d = DENSITY*thickness;
    
    // Beer's law depending on the water colour
    transmittance = exp( -d * (1.0 - waterColour));
    
    vec3 result = transmitted * transmittance;
    return result;
}

float HenyeyGreenstein(float g, float costh){
    return (1.0/(FOUR_PI))  * ((1.0 - g * g) / pow(1.0 + g*g - 2.0*g*costh, 1.5));
}

vec3 shadingPBR(vec3 cameraPos, vec3 p, vec3 n, vec3 rayDir, float thickness, vec3 diffuseColor){
    vec3 I = vec3(0);

    vec3 F0 = vec3(0.02);
    float roughness = 0.1;

    vec3 lightDir = -dirLight;
    I +=  BRDF(p, n, -rayDir, lightDir, F0, roughness) 
        * sunLightColour 
        * dot_c(n, lightDir);

    vec3 transmittance;
    
    vec3 result = vec3(0);
    
    result += CLARITY * getEnvironment(refract(rayDir, n, ETA), 
                                -n,
                                thickness,
                                transmittance) * diffuseColor;

    float mu = dot(refract(rayDir, n, ETA), lightDir);
    //float phase = mix(HenyeyGreenstein(-0.3, mu), HenyeyGreenstein(0.85, mu), 0.5);
    float phase = HenyeyGreenstein(-0.83, mu);
    
    result += CLARITY * sunLightColour * transmittance * phase;
    
    // Reflection of the environment.
    vec3 reflectedDir = normalize(reflect(rayDir, n));
    vec3 reflectedCol = getSkyColour(reflectedDir);
    
    float cosTheta = dot_c(n, -rayDir);
    vec3 F = fresnel(cosTheta, F0);
    
    result = mix(result, reflectedCol, F);
    
    return result + I;
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

    float depth = texture2D(depthSampler, texCoord).x;

    // calculate eye-space position from depth
    vec3 posEye = uvToEye(texCoord, depth);

    // calculate differences
    vec3 ddx = getEyePos(texCoord + vec2(texelSize, 0.)) - posEye;
    vec3 ddx2 = posEye - getEyePos(texCoord + vec2(-texelSize, 0.));
    if (abs(ddx.z) > abs(ddx2.z)) {
        ddx = ddx2;
    }

    vec3 ddy = getEyePos(texCoord + vec2(0., texelSize)) - posEye;
    vec3 ddy2 = posEye - getEyePos(texCoord + vec2(0., -texelSize));
    if (abs(ddy2.z) < abs(ddy.z)) {
        ddy = ddy2;
    }

    // calculate normal
    vec3 normal = cross(ddy, ddx);
    normal = normalize((invView * vec4(normal, 0.)).xyz);

    // shading
    float thickness = clamp(texture2D(thicknessSampler, texCoord).x, 0., 1.);
    vec3 posWorld = (invView * vec4(posEye, 1.)).xyz;
    vec3 rayDir = normalize(posWorld - camPos);

    /*if (depth == 0.) {
        vec3 col = getSkyColour(rayDir);
        glFragColor = vec4(texCoord, 0., 1.);
        return;
    }*/

    vec3 diffuseColor = texture2D(diffuseSampler, texCoord).rgb;

    vec3 col = shadingPBR(camPos, posWorld, normal, rayDir, thickness, diffuseColor);

    //Tonemapping.
    col = ACESFilm(col);

    //Gamma correction 1.0/2.2 = 0.4545...
    col = pow(col, vec3(0.4545));

    //Output to screen.
    //glFragColor = vec4(normal*0.5+0.5, 1./*thickness*/);
    glFragColor = vec4(col, thickness);
    
    //glFragColor = vec4(clamp(abs(posEye), 0., 1.), 1.);
    //glFragColor = vec4(depth, 0., 0., 1.);
    //glFragColor = vec4(n * 0.5 + 0.5, 1.);
}
