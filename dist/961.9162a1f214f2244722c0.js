"use strict";(self.webpackChunkbabylonjs_fluid_rendering=self.webpackChunkbabylonjs_fluid_rendering||[]).push([[961,408,499,573],{9408:(e,r,n)=>{n.r(r),n.d(r,{FluidRenderer:()=>s});var t=n(4265),i=n(8573),o=n(154);class s{constructor(e){this._scene=e,this._engine=e.getEngine(),this._onEngineResizeObserver=null,this._renderingObjects=[],s._SceneComponentInitialization(this._scene),this.collectParticleSystems()}getRenderingObjectParticleSystem(e){const r=this._getParticleSystemIndex(e);return-1!==r?this._renderingObjects[r].object:null}addParticleSystem(e){const r=new i.FluidRenderingObjectParticleSystem(this._scene,e),n=new o.FluidRenderingOutput(this._scene);r.generateDiffuseTexture=!0,r._output=n,n.generateDiffuseTexture=!0,this._renderingObjects.push({object:r,output:n}),n.initialize(),this._onEngineResizeObserver=this._engine.onResizeObservable.add((()=>{this._initialize()})),this._sortRenderingObjects()}_sortRenderingObjects(){this._renderingObjects.sort(((e,r)=>e.object.priority<r.object.priority?-1:e.object.priority>r.object.priority?1:0))}collectParticleSystems(){for(let e=0;e<this._scene.particleSystems.length;++e){const r=this._scene.particleSystems[e],n=this._getParticleSystemIndex(r);if(-1===n)r.renderAsFluid&&this.addParticleSystem(r);else if(!r.renderAsFluid){const e=this._renderingObjects[n];e.object.dispose(),e.output.dispose(),this._renderingObjects.splice(n,1)}}}static _IsParticleSystemObject(e){return!!e.particleSystem}_getParticleSystemIndex(e){for(let r=0;r<this._renderingObjects.length;++r){const n=this._renderingObjects[r].object;if(s._IsParticleSystemObject(n)&&n.particleSystem===e)return r}return-1}_initialize(){for(let e=0;e<this._renderingObjects.length;++e)this._renderingObjects[e].output.initialize()}_render(){for(let e=0;e<this._renderingObjects.length;++e){const r=this._renderingObjects[e];r.output.render(r.object)}}dispose(){this._engine.onResizeObservable.remove(this._onEngineResizeObserver),this._onEngineResizeObserver=null;for(let e=0;e<this._renderingObjects.length;++e){const r=this._renderingObjects[e];r.object.dispose(),r.output.dispose()}this._renderingObjects=[]}}s._SceneComponentInitialization=e=>{throw"FluidRendererSceneComponent needs to be imported before as it contains a side-effect required by your code."},t.Effect.ShadersStore.fluidParticleDepthVertexShader="attribute vec3 position;\r\n//attribute vec2 size;\r\nattribute vec2 offset;\r\n\r\nuniform mat4 view;\r\nuniform mat4 projection;\r\n\r\nvarying vec2 uv;\r\nvarying vec3 viewPos;\r\nvarying float sphereRadius;\r\n\r\nvoid main(void) {\r\n    vec2 size = vec2(0.75);\r\n\r\n    vec3 cornerPos;\r\n    cornerPos.xy = vec2(offset.x - 0.5, offset.y - 0.5) * size;\r\n    cornerPos.z = 0.0;\r\n\r\n    viewPos = (view * vec4(position, 1.0)).xyz + cornerPos;\r\n\r\n    gl_Position = projection * vec4(viewPos, 1.0);\r\n\r\n    uv = offset;\r\n    viewPos -= cornerPos;\r\n    sphereRadius = size.x / 2.0;\r\n}\r\n",t.Effect.ShadersStore.fluidParticleDepthFragmentShader="uniform mat4 projection;\r\n\r\nvarying vec2 uv;\r\nvarying vec3 viewPos;\r\nvarying float sphereRadius;\r\n\r\nvoid main(void) {\r\n    vec3 normal;\r\n\r\n    normal.xy = uv * 2.0 - 1.0;\r\n    float r2 = dot(normal.xy, normal.xy);\r\n    if (r2 > 1.0) discard;\r\n    normal.z = -sqrt(1.0 - r2);\r\n\r\n    vec4 realViewPos = vec4(viewPos + normal * sphereRadius, 1.0);\r\n    vec4 clipSpacePos = projection * realViewPos;\r\n\r\n#ifdef USE_LINEARZ\r\n    float depth = clamp(realViewPos.z / ##CAMERAFAR##, 0., 1.);\r\n#else\r\n    float depth = clipSpacePos.z / clipSpacePos.w;\r\n#endif\r\n\r\n    gl_FragDepth = depth;\r\n\r\n    glFragColor = vec4(vec3(depth), 1.);\r\n}\r\n",t.Effect.ShadersStore.fluidParticleThicknessVertexShader="attribute vec3 position;\r\n//attribute vec2 size;\r\nattribute vec2 offset;\r\n\r\nuniform mat4 view;\r\nuniform mat4 projection;\r\n\r\nvarying vec2 uv;\r\n\r\nvoid main(void) {\r\n    vec2 size = vec2(0.75);\r\n\r\n    vec3 cornerPos;\r\n    cornerPos.xy = vec2(offset.x - 0.5, offset.y - 0.5) * size;\r\n    cornerPos.z = 0.0;\r\n\r\n    vec3 viewPos = (view * vec4(position, 1.0)).xyz + cornerPos;\r\n\r\n    gl_Position = projection * vec4(viewPos, 1.0);\r\n\r\n    uv = offset;\r\n}\r\n",t.Effect.ShadersStore.fluidParticleThicknessFragmentShader="uniform float particleAlpha;\r\n\r\nvarying vec2 uv;\r\n\r\nvoid main(void) {\r\n    vec3 normal;\r\n\r\n    normal.xy = uv * 2.0 - 1.0;\r\n    float r2 = dot(normal.xy, normal.xy);\r\n    if (r2 > 1.0) discard;\r\n    normal.z = -sqrt(1.0 - r2);\r\n\r\n    glFragColor = vec4(1., 1., 1., particleAlpha * (1.0 - r2));\r\n}\r\n",t.Effect.ShadersStore.bilateralBlurFragmentShader="uniform sampler2D textureSampler;\r\n\r\nuniform float filterRadius;\r\nuniform vec2 blurDir;\r\nuniform float blurScale;\r\nuniform float blurDepthFalloff;\r\n\r\nvarying vec2 vUV;\r\n\r\nvoid main(void) {\r\n    float depth = texture2D(textureSampler, vUV).x;\r\n    /*if (depth == 0.) {\r\n        glFragColor = vec4(0., 0., 0., 1.);\r\n        return;\r\n    }*/\r\n\r\n    float sum = 0.;\r\n    float wsum = 0.;\r\n\r\n    for (float x = -filterRadius; x <= filterRadius; x += 1.0) {\r\n        float sampl = texture2D(textureSampler, vUV + x * blurDir).x;\r\n        //float fg = sign(sampl);\r\n\r\n        // spatial domain\r\n        float r = x * blurScale;\r\n        float w = exp(-r * r);\r\n\r\n        // range domain\r\n        float r2 = (sampl - depth) * blurDepthFalloff;\r\n        float g = exp(-r2 * r2);\r\n\r\n        sum += sampl * w * g;\r\n        wsum += w * g;\r\n    }\r\n\r\n    if (wsum > 0.0) {\r\n        sum /= wsum;\r\n    }\r\n\r\n    glFragColor = vec4(vec3(sum), 1.);\r\n}\r\n",t.Effect.ShadersStore.standardBlurFragmentShader="uniform sampler2D textureSampler;\r\n\r\nuniform float filterRadius;\r\nuniform vec2 blurDir;\r\nuniform float blurScale;\r\nuniform float blurDepthFalloff;\r\n\r\nvarying vec2 vUV;\r\n\r\nvoid main(void) {\r\n    vec4 sum = vec4(0.);\r\n    float wsum = 0.;\r\n\r\n    for (float x = -filterRadius; x <= filterRadius; x += 1.0) {\r\n        vec4 sampl = texture2D(textureSampler, vUV + x * blurDir);\r\n\r\n        // spatial domain\r\n        float r = x * blurScale;\r\n        float w = exp(-r * r);\r\n\r\n        sum += sampl * w;\r\n        wsum += w;\r\n    }\r\n\r\n    if (wsum > 0.0) {\r\n        sum /= wsum;\r\n    }\r\n\r\n    glFragColor = vec4(sum.rgb, 1.);\r\n}\r\n",t.Effect.ShadersStore.renderFluidFragmentShader="#define PI 3.14159265\r\n#define FOUR_PI 4.0 * PI\r\n#define GAMMA 2.2\r\n#define INV_GAMMA (1.0/GAMMA)\r\n\r\n// Index of refraction for water\r\n#define IOR 1.333\r\n\r\n// Ratios of air and water IOR for refraction\r\n// Air to water\r\n#define ETA 1.0/IOR\r\n// Water to air\r\n#define ETA_REVERSE IOR\r\n\r\nuniform sampler2D depthSampler;\r\nuniform sampler2D diffuseSampler;\r\nuniform sampler2D thicknessSampler;\r\nuniform samplerCube reflectionSampler;\r\n\r\nuniform mat4 projection;\r\nuniform mat4 invProjection;\r\nuniform mat4 invView;\r\nuniform float texelSize;\r\nuniform vec3 dirLight;\r\nuniform vec3 camPos;\r\n\r\nvarying vec2 vUV;\r\n\r\nconst vec3 sunLightColour = vec3(2.0);\r\n\r\nvec3 waterColour = 0.85 * vec3(0.1, 0.75, 0.9);\r\n\r\n// Amount of the background visible through the water\r\nconst float CLARITY = 0.75;\r\n\r\n// Modifiers for light attenuation\r\nconst float DENSITY = 3.5;\r\n\r\nvec3 uvToEye(vec2 texCoord, float depth) {\r\n    vec4 ndc;\r\n    \r\n#ifdef USE_LINEARZ\r\n    depth = depth * ##CAMERAFAR##;\r\n#endif\r\n\r\n    ndc.xy = texCoord * 2.0 - 1.0;\r\n#ifdef USE_LINEARZ\r\n    ndc.z = projection[2].z - projection[2].w / depth;\r\n#elif defined(IS_NDC_HALF_ZRANGE)\r\n    ndc.z = depth;\r\n#else\r\n    ndc.z = depth * 2.0 - 1.0;\r\n#endif\r\n    ndc.w = 1.0;\r\n\r\n    vec4 eyePos = invProjection * ndc;\r\n    eyePos.xyz /= eyePos.w;\r\n\r\n    return eyePos.xyz;\r\n}\r\n\r\nvec3 getEyePos(vec2 texCoord) {\r\n    float depth = texture2D(depthSampler, texCoord).x;\r\n    return uvToEye(texCoord, depth);\r\n}\r\n\r\n// Minimum dot product value\r\nconst float minDot = 1e-3;\r\n\r\n// Clamped dot product\r\nfloat dot_c(vec3 a, vec3 b) {\r\n    return max(dot(a, b), minDot);\r\n}\r\nvec3 gamma(vec3 col) {\r\n    return pow(col, vec3(INV_GAMMA));\r\n}\r\nvec3 inv_gamma(vec3 col) {\r\n    return pow(col, vec3(GAMMA));\r\n}\r\n\r\n// Trowbridge-Reitz\r\nfloat distribution(vec3 n, vec3 h, float roughness){\r\n    float a_2 = roughness*roughness;\r\n    return a_2/(PI*pow(pow(dot_c(n, h),2.0) * (a_2 - 1.0) + 1.0, 2.0));\r\n}\r\n\r\n// GGX and Schlick-Beckmann\r\nfloat geometry(float cosTheta, float k){\r\n    return (cosTheta)/(cosTheta*(1.0-k)+k);\r\n}\r\n\r\nfloat smiths(vec3 n, vec3 viewDir, vec3 lightDir, float roughness){\r\n    float k = pow(roughness + 1.0, 2.0)/8.0; \r\n    return geometry(dot_c(n, lightDir), k) * geometry(dot_c(n, viewDir), k);\r\n}\r\n\r\n// Fresnel-Schlick\r\nvec3 fresnel(float cosTheta, vec3 F0){\r\n    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);\r\n} \r\n\r\n// Specular part of Cook-Torrance BRDF\r\nvec3 BRDF(vec3 p, vec3 n, vec3 viewDir, vec3 lightDir, vec3 F0, float roughness){\r\n    vec3 h = normalize(viewDir + lightDir);\r\n    float cosTheta = dot_c(h, viewDir);\r\n    float D = distribution(n, h, roughness);\r\n    vec3 F = fresnel(cosTheta, F0);\r\n    float G = smiths(n, viewDir, lightDir, roughness);\r\n    \r\n    vec3 specular =  D * F * G / max(0.0001, (4.0 * dot_c(lightDir, n) * dot_c(viewDir, n)));\r\n    \r\n    return specular;\r\n}\r\n\r\nvec3 getSkyColour(vec3 rayDir){\r\n    //return 0.5*(0.5+0.5*rayDir);\r\n    return inv_gamma(textureCube(reflectionSampler, rayDir).rgb);\r\n}\r\n\r\nvec3 getEnvironment(vec3 rayDir, vec3 geoNormalFar, float thickness, vec3 waterColour, out vec3 transmittance){\r\n    vec3 refractedDir = normalize(refract(rayDir, geoNormalFar, ETA_REVERSE));\r\n    vec3 transmitted = getSkyColour(refractedDir);\r\n    \r\n    // View depth\r\n    float d = DENSITY*thickness;\r\n    \r\n    // Beer's law depending on the water colour\r\n    transmittance = exp( -d * (1.0 - waterColour));\r\n    \r\n    vec3 result = transmitted * transmittance;\r\n    return result;\r\n}\r\n\r\nfloat HenyeyGreenstein(float g, float costh){\r\n    return (1.0/(FOUR_PI))  * ((1.0 - g * g) / pow(1.0 + g*g - 2.0*g*costh, 1.5));\r\n}\r\n\r\nvec3 shadingPBR(vec3 cameraPos, vec3 p, vec3 n, vec3 rayDir, float thickness, vec3 diffuseColor){\r\n    vec3 I = vec3(0);\r\n\r\n    vec3 F0 = vec3(0.02);\r\n    float roughness = 0.1;\r\n\r\n    vec3 lightDir = -dirLight;\r\n    I +=  BRDF(p, n, -rayDir, lightDir, F0, roughness) \r\n        * sunLightColour \r\n        * dot_c(n, lightDir);\r\n\r\n    vec3 transmittance;\r\n    \r\n    vec3 result = vec3(0);\r\n    \r\n    result += CLARITY * getEnvironment(refract(rayDir, n, ETA), \r\n                                -n,\r\n                                thickness,\r\n                                diffuseColor,\r\n                                transmittance);\r\n\r\n    float mu = dot(refract(rayDir, n, ETA), lightDir);\r\n    //float phase = mix(HenyeyGreenstein(-0.3, mu), HenyeyGreenstein(0.85, mu), 0.5);\r\n    float phase = HenyeyGreenstein(-0.83, mu);\r\n    \r\n    result += CLARITY * sunLightColour * transmittance * phase;\r\n    \r\n    // Reflection of the environment.\r\n    vec3 reflectedDir = normalize(reflect(rayDir, n));\r\n    vec3 reflectedCol = getSkyColour(reflectedDir);\r\n    \r\n    float cosTheta = dot_c(n, -rayDir);\r\n    vec3 F = fresnel(cosTheta, F0);\r\n    \r\n    result = mix(result, reflectedCol, F);\r\n    \r\n    return result + I;\r\n}\r\n\r\nvec3 ACESFilm(vec3 x){\r\n    float a = 2.51;\r\n    float b = 0.03;\r\n    float c = 2.43;\r\n    float d = 0.59;\r\n    float e = 0.14;\r\n    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);\r\n}\r\n\r\nvoid main(void) {\r\n    vec2 texCoord = vUV;\r\n\r\n    float depth = texture2D(depthSampler, texCoord).x;\r\n\r\n    // calculate eye-space position from depth\r\n    vec3 posEye = uvToEye(texCoord, depth);\r\n\r\n    // calculate differences\r\n    vec3 ddx = getEyePos(texCoord + vec2(texelSize, 0.)) - posEye;\r\n    vec3 ddx2 = posEye - getEyePos(texCoord + vec2(-texelSize, 0.));\r\n    if (abs(ddx.z) > abs(ddx2.z)) {\r\n        ddx = ddx2;\r\n    }\r\n\r\n    vec3 ddy = getEyePos(texCoord + vec2(0., texelSize)) - posEye;\r\n    vec3 ddy2 = posEye - getEyePos(texCoord + vec2(0., -texelSize));\r\n    if (abs(ddy2.z) < abs(ddy.z)) {\r\n        ddy = ddy2;\r\n    }\r\n\r\n    // calculate normal\r\n    vec3 normal = cross(ddy, ddx);\r\n    normal = normalize((invView * vec4(normal, 0.)).xyz);\r\n\r\n    // shading\r\n    float thickness = clamp(texture2D(thicknessSampler, texCoord).x, 0., 1.);\r\n    vec3 posWorld = (invView * vec4(posEye, 1.)).xyz;\r\n    vec3 rayDir = normalize(posWorld - camPos);\r\n\r\n    /*if (depth == 0.) {\r\n        vec3 col = getSkyColour(rayDir);\r\n        glFragColor = vec4(texCoord, 0., 1.);\r\n        return;\r\n    }*/\r\n\r\n    vec3 diffuseColor = texture2D(diffuseSampler, texCoord).rgb;\r\n\r\n    vec3 col = shadingPBR(camPos, posWorld, normal, rayDir, thickness, diffuseColor);\r\n\r\n    //Tonemapping.\r\n    col = ACESFilm(col);\r\n\r\n    //Gamma correction 1.0/2.2 = 0.4545...\r\n    col = pow(col, vec3(0.4545));\r\n\r\n    //Output to screen.\r\n    //glFragColor = vec4(normal*0.5+0.5, 1./*thickness*/);\r\n    glFragColor = vec4(col, thickness);\r\n    \r\n    //glFragColor = vec4(clamp(abs(posEye), 0., 1.), 1.);\r\n    //glFragColor = vec4(depth, 0., 0., 1.);\r\n    //glFragColor = vec4(n * 0.5 + 0.5, 1.);\r\n}\r\n"},4961:(e,r,n)=>{n.r(r),n.d(r,{FluidRendererSceneComponent:()=>s});var t=n(4265),i=n(9408);const o="FluidRenderer";Object.defineProperty(t.Scene.prototype,"fluidRenderer",{get:function(){return this._fluidRenderer},set:function(e){this._fluidRenderer=e},enumerable:!0,configurable:!0}),t.Scene.prototype.enableFluidRenderer=function(){return this._fluidRenderer||(this._fluidRenderer=new i.FluidRenderer(this)),this._fluidRenderer},t.Scene.prototype.disableFluidRenderer=function(){var e;null===(e=this._fluidRenderer)||void 0===e||e.dispose(),this._fluidRenderer=null};class s{constructor(e){this.name=o,this.scene=e}register(){this.scene._afterCameraDrawStage.registerStep(5,this,this._afterCameraDraw)}_afterCameraDraw(e){var r;null===(r=this.scene.fluidRenderer)||void 0===r||r._render()}rebuild(){this.scene._fluidRenderer&&(this.scene.disableFluidRenderer(),this.scene.enableFluidRenderer())}dispose(){this.scene.disableFluidRenderer()}}i.FluidRenderer._SceneComponentInitialization=e=>{let r=e._getComponent(o);r||(r=new s(e),e._addComponent(r))}},7499:(e,r,n)=>{n.r(r),n.d(r,{FluidRenderingObject:()=>t});class t{constructor(e,r,n,t){this.vertexBuffers=r,this.indexBuffer=n,this.useInstancing=t,this.priority=0,this._output=null,this._generateDiffuseTexture=!1,this._scene=e,this._engine=e.getEngine()}get generateDiffuseTexture(){return this._generateDiffuseTexture}set generateDiffuseTexture(e){var r;e!==this._generateDiffuseTexture&&(this._generateDiffuseTexture=e,null===(r=this._output)||void 0===r||r.initialize())}isReady(){return!0}numParticles(){return 0}renderDiffuseTexture(){}dispose(){}}},8573:(e,r,n)=>{n.r(r),n.d(r,{FluidRenderingObjectParticleSystem:()=>o});var t=n(4265),i=n(7499);class o extends i.FluidRenderingObject{constructor(e,r){super(e,r._vertexBuffers,r._indexBuffer,r._useInstancing),this._particleSystem=r,this._renderCallback=r.render.bind(r),this._blendMode=r.blendMode,r.render=()=>0,r.blendMode=-1,this._onBeforeDrawParticleObserver=r.onBeforeDrawParticlesObservable.add((()=>{this._engine.setAlphaMode(t.Constants.ALPHA_COMBINE)}))}get particleSystem(){return this._particleSystem}isReady(){return this._particleSystem.isReady()}numParticles(){return this._particleSystem.getActiveCount()}renderDiffuseTexture(){this._renderCallback()}dispose(){super.dispose(),this._particleSystem.onBeforeDrawParticlesObservable.remove(this._onBeforeDrawParticleObserver),this._onBeforeDrawParticleObserver=null,this._particleSystem.render=this._renderCallback,this._particleSystem.blendMode=this._blendMode}}}}]);
//# sourceMappingURL=961.9162a1f214f2244722c0.js.map