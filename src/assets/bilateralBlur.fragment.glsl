uniform sampler2D textureSampler;

uniform float filterRadius;
uniform vec2 blurDir;
uniform float blurScale;
uniform float blurDepthFalloff;

varying vec2 vUV;

void main(void) {
    float depth = texture2D(textureSampler, vUV).x;

    if (depth == 1.) {
        glFragColor = vec4(vec3(depth), 0.);
        return;
    }

    float sum = 0.;
    float wsum = 0.;

    for (float x = -filterRadius; x <= filterRadius; x += 1.0) {
        float sampl = texture2D(textureSampler, vUV + x * blurDir).x;

        // spatial domain
        float r = x * blurScale;
        float w = exp(-r * r);

        // range domain
        float r2 = (sampl - depth) * blurDepthFalloff;
        float g = exp(-r2 * r2);

        sum += sampl * w * g;
        wsum += w * g;
    }

    if (wsum > 0.0) {
        sum /= wsum;
    }

    glFragColor = vec4(vec3(sum), 1.);
}
