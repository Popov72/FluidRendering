attribute position: vec2<f32>;

varying vUV: vec2<f32>;

const madd = vec2(0.5, 0.5);

@vertex
fn main(input : VertexInputs) -> FragmentInputs
{
	vUV = position * madd + madd;
	gl_Position = vec4(position, 0.0, 1.0);
}
