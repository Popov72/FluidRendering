uniform mat4 projection;

varying vec2 uv;
varying vec3 viewPos;
varying float sphereRadius;

void main(void) {
    vec3 normal;

    normal.xy = uv * 2.0 - 1.0;
    float r2 = dot(normal.xy, normal.xy);
    if (r2 > 1.0) discard;
    normal.z = -sqrt(1.0 - r2);

    vec4 realViewPos = vec4(viewPos + normal * sphereRadius, 1.0);
    vec4 clipSpacePos = projection * realViewPos;

#ifdef WEBGPU
    gl_FragDepth = clipSpacePos.z / clipSpacePos.w;
#else
    gl_FragDepth = (clipSpacePos.z / clipSpacePos.w) * 0.5 + 0.5;
#endif

    glFragColor = vec4(vec3(realViewPos.z), 1.);
}
