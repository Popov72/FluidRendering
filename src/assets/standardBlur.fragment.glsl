uniform sampler2D textureSampler;

uniform float filterRadius;
uniform vec2 blurDir;
uniform float blurScale;
uniform float blurDepthFalloff;

varying vec2 vUV;

void main(void) {
    vec4 sum = vec4(0.);
    float wsum = 0.;

    for (float x = -filterRadius; x <= filterRadius; x += 1.0) {
        vec4 sampl = texture2D(textureSampler, vUV + x * blurDir);

        // spatial domain
        float r = x * blurScale;
        float w = exp(-r * r);

        sum += sampl * w;
        wsum += w;
    }

    if (wsum > 0.0) {
        sum /= wsum;
    }

    glFragColor = vec4(sum.rgb, 1.);
}
