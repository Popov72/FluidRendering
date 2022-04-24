uniform sampler2D textureSampler;

uniform int maxFilterSize;
uniform vec2 blurDir;
uniform float projectedParticleConstant;
uniform float depthThreshold;

varying vec2 vUV;

void main(void) {
    float depth = texture2D(textureSampler, vUV).x;

    if (depth >= 1e6 || depth <= 0.) {
        glFragColor = vec4(vec3(depth), 1.);
        return;
    }

#ifdef FLUIDRENDERING_USE_DYNAMIC_FILTERSIZE
    int filterSize = min(maxFilterSize, int(ceil(projectedParticleConstant / depth)));
    float sigma = float(filterSize) / 3.0;
#else
    float sigma = float(maxFilterSize) / 3.0;
#endif
    float two_sigma2 = 2.0 * sigma * sigma;

    float sigmaDepth = depthThreshold / 3.0;
    float two_sigmaDepth2 = 2.0 * sigmaDepth * sigmaDepth;

    float sum = 0.;
    float wsum = 0.;

    for (int x = -filterSize; x <= filterSize; ++x) {
        vec2 coords = vec2(x);
        float sampleDepth = texture2D(textureSampler, vUV + coords * blurDir).x;

        float r = dot(coords, coords);
        float w = exp(-r / two_sigma2);

        float rDepth = sampleDepth - depth;
        float wd = exp(-rDepth * rDepth / two_sigmaDepth2);

        sum += sampleDepth * w * wd;
        wsum += w * wd;
    }

    glFragColor = vec4(vec3(sum / wsum), 1.);
}
