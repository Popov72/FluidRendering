var textureSampler: texture_2d<f32>;

uniform filterSize: i32;
uniform blurDir: vec2<f32>;

varying vUV: vec2<f32>;

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let dim = textureDimensions(textureSampler);
    let s = textureLoad(textureSampler, vec2<i32>(vUV * vec2<f32>(dim)), 0);
    
    if (s.r == 0.) {
        gl_FragColor = vec4(0., 0., 0., 1.);
        output.color = gl_FragColor;
        return output;
    }

    let sigma = f32(uniforms.filterSize) / 3.0;
    let twoSigma2 = 2.0 * sigma * sigma;

    var sum = vec4(0.);
    var wsum = 0.;

    for (var x = -uniforms.filterSize; x <= uniforms.filterSize; x = x + 1) {
        let coords = vec2(f32(x));
        let sampl = textureLoad(textureSampler, vec2<i32>((vUV + coords * uniforms.blurDir) * vec2<f32>(dim)), 0);

        let w = exp(-coords.x * coords.x / twoSigma2);

        sum += sampl * w;
        wsum += w;
    }

    sum /= wsum;

    gl_FragColor = vec4(sum.rgb, 1.);
}