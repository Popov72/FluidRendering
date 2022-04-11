uniform mat4 projection;
#ifdef FLUIDRENDERING_USE_LINEARZ
    uniform float cameraFar;
#endif

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

    float glFragDepth = clipSpacePos.z / clipSpacePos.w;

#if !defined(IS_NDC_HALF_ZRANGE)
    glFragDepth = glFragDepth * 0.5 + 0.5;
#endif

#ifdef FLUIDRENDERING_USE_LINEARZ
    float depth = clamp(realViewPos.z / cameraFar, 0., 1.);
#else
    float depth = glFragDepth;
#endif

    gl_FragDepth = glFragDepth;

    glFragColor = vec4(vec3(depth), 1.);
}
