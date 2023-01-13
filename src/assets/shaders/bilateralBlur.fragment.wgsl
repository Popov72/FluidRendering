var textureSampler: texture_2d<f32>;

uniform maxFilterSize: i32;
uniform blurDir: vec2<f32>;
uniform projectedParticleConstant: f32;
uniform depthThreshold: f32;

varying vUV: vec2<f32>;

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs
{
    let dim = textureDimensions(textureSampler);
    let depth = textureLoad(textureSampler, vec2<i32>(vUV * vec2<f32>(dim)), 0).x;

    if (depth >= 1e6 || depth <= 0.) {
        gl_FragColor = vec4(vec3(depth), 1.);
        output.color = gl_FragColor;
        return output;
    }

    let filterSize = min(uniforms.maxFilterSize, i32(ceil(uniforms.projectedParticleConstant / depth)));
    let sigma = f32(filterSize) / 3.0;
    let two_sigma2 = 2.0 * sigma * sigma;

    let sigmaDepth = uniforms.depthThreshold / 3.0;
    let two_sigmaDepth2 = 2.0 * sigmaDepth * sigmaDepth;

    var sum = 0.;
    var wsum = 0.;
    var sumVel = 0.;

    for (var x = -filterSize; x <= filterSize; x = x + 1) {
        let coords = vec2(f32(x));
        let sampleDepthVel = textureLoad(textureSampler, vec2<i32>((vUV + coords * uniforms.blurDir) * vec2<f32>(dim)), 0).rg;

        let r = dot(coords, coords);
        let w = exp(-r / two_sigma2);

        let rDepth = sampleDepthVel.r - depth;
        let wd = exp(-rDepth * rDepth / two_sigmaDepth2);

        sum += sampleDepthVel.r * w * wd;
        sumVel += sampleDepthVel.g * w * wd;
        wsum += w * wd;
    }

    gl_FragColor = vec4(sum / wsum, sumVel / wsum, 0., 1.);
}