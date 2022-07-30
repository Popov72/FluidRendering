var textureDepth: texture_depth_2d;
var textureDepthSampler: sampler;

varying vUV: vec2<f32>;

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs
{
	gl_FragDepth = textureSample(textureDepth, textureDepthSampler, vUV);
}
