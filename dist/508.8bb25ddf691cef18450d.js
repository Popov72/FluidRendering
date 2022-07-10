"use strict";(self.webpackChunkbabylonjs_fluid_rendering=self.webpackChunkbabylonjs_fluid_rendering||[]).push([[508,499,573,984,247],{5508:(e,r,t)=>{t.r(r),t.d(r,{FluidRenderer:()=>l});var n=t(6291),i=t(8573),s=t(7419),o=t(5984),a=t(247);Object.defineProperty(n.ParticleSystem.prototype,"renderAsFluid",{get:function(){return this._renderAsFluid},set:function(e){var r,t;this._renderAsFluid=e,null===(t=null===(r=this._scene)||void 0===r?void 0:r.fluidRenderer)||void 0===t||t.collectParticleSystems()},enumerable:!0,configurable:!0});class l{constructor(e){this._scene=e,this._engine=e.getEngine(),this._onEngineResizeObserver=null,this._renderObjects=[],this._targetRenderers=[],this._cameras=new Map,l._SceneComponentInitialization(this._scene),this._onEngineResizeObserver=this._engine.onResizeObservable.add((()=>{this._initialize()})),this.collectParticleSystems()}get renderObjects(){return this._renderObjects}get targetRenderers(){return this._targetRenderers}recreate(){this._sortRenderingObjects(),this._initialize()}getRenderObjectFromParticleSystem(e){const r=this._getParticleSystemIndex(e);return-1!==r?this._renderObjects[r]:null}getRenderObjectFromVertexBuffer(e){const r=this._getVertexBufferIndex(e);return-1!==r?this._renderObjects[r]:null}addParticleSystem(e,r,t,n){const o=new i.FluidRenderingObjectParticleSystem(this._scene,e);o.onParticleSizeChanged.add(this._setParticleSizeForRenderTargets.bind(this)),t||(t=new s.FluidRenderingTargetRenderer(this._scene,n),this._targetRenderers.push(t)),t.onUseVelocityChanged.hasObservers()||t.onUseVelocityChanged.add(this._setUseVelocityForRenderObject.bind(this)),void 0!==r&&(t.generateDiffuseTexture=r);const a={object:o,targetRenderer:t};return this._renderObjects.push(a),this._sortRenderingObjects(),this._setParticleSizeForRenderTargets(),a}addVertexBuffer(e,r,t,n,i){const a=new o.FluidRenderingObjectVertexBuffer(this._scene,e,r);a.onParticleSizeChanged.add(this._setParticleSizeForRenderTargets.bind(this)),n||(n=new s.FluidRenderingTargetRenderer(this._scene,i),this._targetRenderers.push(n)),n.onUseVelocityChanged.hasObservers()||n.onUseVelocityChanged.add(this._setUseVelocityForRenderObject.bind(this)),void 0!==t&&(n.generateDiffuseTexture=t);const l={object:a,targetRenderer:n};return this._renderObjects.push(l),this._sortRenderingObjects(),this._setParticleSizeForRenderTargets(),l}removeRenderObject(e,r=!0){const t=this._renderObjects.indexOf(e);return-1!==t&&(e.object.dispose(),this._renderObjects.splice(t,1),r&&this._removeUnusedTargetRenderers()?this._initialize():this._setParticleSizeForRenderTargets(),!0)}_sortRenderingObjects(){this._renderObjects.sort(((e,r)=>e.object.priority<r.object.priority?-1:e.object.priority>r.object.priority?1:0))}collectParticleSystems(){for(let e=0;e<this._scene.particleSystems.length;++e){const r=this._scene.particleSystems[e],t=this._getParticleSystemIndex(r);-1===t?r.renderAsFluid&&"ParticleSystem"===r.getClassName()&&this.addParticleSystem(r,!0):r.renderAsFluid||(this._renderObjects[t].object.dispose(),this._renderObjects.splice(t,1))}this._removeUnusedTargetRenderers(),this._initialize()}_removeUnusedTargetRenderers(){const e={};for(let r=0;r<this._renderObjects.length;++r){const t=this._renderObjects[r].targetRenderer;e[this._targetRenderers.indexOf(t)]=!0}let r=!1;const t=[];for(let n=0;n<this._targetRenderers.length;++n)e[n]?t.push(this._targetRenderers[n]):(this._targetRenderers[n].dispose(),r=!0);return r&&(this._targetRenderers.length=0,this._targetRenderers.push(...t)),r}static _IsParticleSystemObject(e){return!!e.particleSystem}static _IsVertexBufferObject(e){return"FluidRenderingObjectVertexBuffer"===e.getClassName()}_getParticleSystemIndex(e){for(let r=0;r<this._renderObjects.length;++r){const t=this._renderObjects[r].object;if(l._IsParticleSystemObject(t)&&t.particleSystem===e)return r}return-1}_getVertexBufferIndex(e){for(let r=0;r<this._renderObjects.length;++r){const t=this._renderObjects[r].object;if(l._IsVertexBufferObject(t)&&t.vertexBuffers[n.VertexBuffer.PositionKind]===e)return r}return-1}_initialize(){for(let e=0;e<this._targetRenderers.length;++e)this._targetRenderers[e].dispose();const e=new Map;for(let r=0;r<this._targetRenderers.length;++r){const t=this._targetRenderers[r];if(t.initialize(),t.camera&&t.renderPostProcess){let n=e.get(t.camera);n||(n=[[],{}],e.set(t.camera,n)),n[0].push(t),t.camera.attachPostProcess(t.renderPostProcess,r)}}for(const[r,t]of e){const e=r._getFirstPostProcess();if(!e)continue;const[n,i]=t;e.onSizeChangedObservable.add((()=>{var r;e.inputTexture.depthStencilTexture||e.inputTexture.createDepthStencilTexture(0,!0,this._engine.isStencilEnable,n[0].samples);for(const e of n){const t=null===(r=e.thicknessRenderTarget)||void 0===r?void 0:r.renderTarget,n=null==t?void 0:t.texture;if(t&&n){const e=n.width+"_"+n.height;let r=i[e];r||(r=i[e]=new a.CopyDepthTexture(this._engine,n.width,n.height)),r.depthRTWrapper._shareDepth(t)}}}))}for(const[r,t]of this._cameras){const n=t[1],i=e.get(r);if(i)for(const e in n)i[1][e]||n[e].dispose();else for(const e in n)n[e].dispose()}this._cameras.clear(),this._cameras=e,this._setParticleSizeForRenderTargets()}_setParticleSizeForRenderTargets(){const e=new Map;for(let r=0;r<this._renderObjects.length;++r){const t=this._renderObjects[r];let n=e.get(t.targetRenderer);void 0===n&&(n=0),e.set(t.targetRenderer,Math.max(n,t.object.particleSize))}for(const[r,t]of e)r.depthRenderTarget&&(r.depthRenderTarget.particleSize=t)}_setUseVelocityForRenderObject(){for(let e=0;e<this._renderObjects.length;++e){const r=this._renderObjects[e];r.object.useVelocity=r.targetRenderer.useVelocity}}_prepareRendering(){let e=!1;for(let r=0;r<this._targetRenderers.length;++r)e=e||this._targetRenderers[r].needInitialization;e&&this._initialize()}_render(e){var r;for(let r=0;r<this._targetRenderers.length;++r)e&&this._targetRenderers[r].camera!==e||this._targetRenderers[r].clearTargets();for(const[t,n]of this._cameras){if(e&&t!==e)continue;const i=t._getFirstPostProcess();if(!i)continue;const s=null===(r=i.inputTexture)||void 0===r?void 0:r.depthStencilTexture;if(s){const[e,r]=n;for(const r of e)r._bgDepthTexture=s;for(const e in r)r[e].copy(s)}}for(let r=0;r<this._renderObjects.length;++r){const t=this._renderObjects[r];e&&t.targetRenderer.camera!==e||t.targetRenderer.render(t.object)}}dispose(){this._engine.onResizeObservable.remove(this._onEngineResizeObserver),this._onEngineResizeObserver=null;for(let e=0;e<this._renderObjects.length;++e)this._renderObjects[e].object.dispose();for(let e=0;e<this._targetRenderers.length;++e)this._targetRenderers[e].dispose();for(const e of this._cameras){const r=e[1][1];for(const e in r)r[e].dispose()}this._renderObjects=[],this._targetRenderers=[],this._cameras.clear()}}l._SceneComponentInitialization=()=>{throw"FluidRendererSceneComponent needs to be imported before as it contains a side-effect required by your code."},n.ShaderStore.ShadersStore.fluidParticleDepthVertexShader="attribute vec3 position;\r\nattribute vec2 offset;\r\n\r\nuniform mat4 view;\r\nuniform mat4 projection;\r\nuniform vec2 size;\r\n\r\nvarying vec2 uv;\r\nvarying vec3 viewPos;\r\nvarying float sphereRadius;\r\n\r\n#ifdef FLUIDRENDERING_VELOCITY\r\n    attribute vec3 velocity;\r\n    varying float velocityNorm;\r\n#endif\r\n\r\nvoid main(void) {\r\n    vec3 cornerPos;\r\n    cornerPos.xy = vec2(offset.x - 0.5, offset.y - 0.5) * size;\r\n    cornerPos.z = 0.0;\r\n\r\n    viewPos = (view * vec4(position, 1.0)).xyz;\r\n\r\n    gl_Position = projection * vec4(viewPos + cornerPos, 1.0);\r\n\r\n    uv = offset;\r\n    sphereRadius = size.x / 2.0;\r\n#ifdef FLUIDRENDERING_VELOCITY\r\n    velocityNorm = length(velocity);\r\n#endif\r\n}\r\n",n.ShaderStore.ShadersStore.fluidParticleDepthFragmentShader="uniform mat4 projection;\r\n\r\nvarying vec2 uv;\r\nvarying vec3 viewPos;\r\nvarying float sphereRadius;\r\n\r\n#ifdef FLUIDRENDERING_VELOCITY\r\n    varying float velocityNorm;\r\n#endif\r\n\r\nvoid main(void) {\r\n    vec3 normal;\r\n\r\n    normal.xy = uv * 2.0 - 1.0;\r\n    float r2 = dot(normal.xy, normal.xy);\r\n    if (r2 > 1.0) discard;\r\n    normal.z = -sqrt(1.0 - r2);\r\n\r\n    vec4 realViewPos = vec4(viewPos + normal * sphereRadius, 1.0);\r\n    vec4 clipSpacePos = projection * realViewPos;\r\n\r\n#ifdef WEBGPU\r\n    gl_FragDepth = clipSpacePos.z / clipSpacePos.w;\r\n#else\r\n    gl_FragDepth = (clipSpacePos.z / clipSpacePos.w) * 0.5 + 0.5;\r\n#endif\r\n\r\n#ifdef FLUIDRENDERING_VELOCITY\r\n    glFragColor = vec4(realViewPos.z, velocityNorm, 0., 1.);\r\n#else\r\n    glFragColor = vec4(realViewPos.z, 0., 0., 1.);\r\n#endif\r\n}\r\n",n.ShaderStore.ShadersStore.fluidParticleThicknessVertexShader="attribute vec3 position;\r\nattribute vec2 offset;\r\n\r\nuniform mat4 view;\r\nuniform mat4 projection;\r\nuniform vec2 size;\r\n\r\nvarying vec2 uv;\r\n\r\nvoid main(void) {\r\n    vec3 cornerPos;\r\n    cornerPos.xy = vec2(offset.x - 0.5, offset.y - 0.5) * size;\r\n    cornerPos.z = 0.0;\r\n\r\n    vec3 viewPos = (view * vec4(position, 1.0)).xyz + cornerPos;\r\n\r\n    gl_Position = projection * vec4(viewPos, 1.0);\r\n\r\n    uv = offset;\r\n}\r\n",n.ShaderStore.ShadersStore.fluidParticleThicknessFragmentShader="uniform float particleAlpha;\r\n\r\nvarying vec2 uv;\r\n\r\nvoid main(void) {\r\n    vec3 normal;\r\n\r\n    normal.xy = uv * 2.0 - 1.0;\r\n    float r2 = dot(normal.xy, normal.xy);\r\n    if (r2 > 1.0) discard;\r\n    float thickness = sqrt(1.0 - r2);\r\n\r\n    glFragColor = vec4(vec3(particleAlpha * thickness), 1.0);\r\n}\r\n",n.ShaderStore.ShadersStore.fluidParticleDiffuseVertexShader="attribute vec3 position;\r\nattribute vec2 offset;\r\nattribute vec4 color;\r\n\r\nuniform mat4 view;\r\nuniform mat4 projection;\r\nuniform vec2 size;\r\n\r\nvarying vec2 uv;\r\nvarying vec3 diffuseColor;\r\n\r\nvoid main(void) {\r\n    vec3 cornerPos;\r\n    cornerPos.xy = vec2(offset.x - 0.5, offset.y - 0.5) * size;\r\n    cornerPos.z = 0.0;\r\n\r\n    vec3 viewPos = (view * vec4(position, 1.0)).xyz + cornerPos;\r\n\r\n    gl_Position = projection * vec4(viewPos, 1.0);\r\n\r\n    uv = offset;\r\n    diffuseColor = color.rgb;\r\n}\r\n",n.ShaderStore.ShadersStore.fluidParticleDiffuseFragmentShader="uniform float particleAlpha;\r\n\r\nvarying vec2 uv;\r\nvarying vec3 diffuseColor;\r\n\r\nvoid main(void) {\r\n    vec3 normal;\r\n\r\n    normal.xy = uv * 2.0 - 1.0;\r\n    float r2 = dot(normal.xy, normal.xy);\r\n    if (r2 > 1.0) discard;\r\n\r\n    glFragColor = vec4(diffuseColor, 1.0);\r\n}\r\n",n.ShaderStore.ShadersStore.bilateralBlurFragmentShader="uniform sampler2D textureSampler;\r\n\r\nuniform int maxFilterSize;\r\nuniform vec2 blurDir;\r\nuniform float projectedParticleConstant;\r\nuniform float depthThreshold;\r\n\r\nvarying vec2 vUV;\r\n\r\nvoid main(void) {\r\n    float depth = texture2D(textureSampler, vUV).x;\r\n\r\n    if (depth >= 1e6 || depth <= 0.) {\r\n        glFragColor = vec4(vec3(depth), 1.);\r\n        return;\r\n    }\r\n\r\n    int filterSize = min(maxFilterSize, int(ceil(projectedParticleConstant / depth)));\r\n    float sigma = float(filterSize) / 3.0;\r\n    float two_sigma2 = 2.0 * sigma * sigma;\r\n\r\n    float sigmaDepth = depthThreshold / 3.0;\r\n    float two_sigmaDepth2 = 2.0 * sigmaDepth * sigmaDepth;\r\n\r\n    float sum = 0.;\r\n    float wsum = 0.;\r\n    float sumVel = 0.;\r\n\r\n    for (int x = -filterSize; x <= filterSize; ++x) {\r\n        vec2 coords = vec2(x);\r\n        vec2 sampleDepthVel = texture2D(textureSampler, vUV + coords * blurDir).rg;\r\n\r\n        float r = dot(coords, coords);\r\n        float w = exp(-r / two_sigma2);\r\n\r\n        float rDepth = sampleDepthVel.r - depth;\r\n        float wd = exp(-rDepth * rDepth / two_sigmaDepth2);\r\n\r\n        sum += sampleDepthVel.r * w * wd;\r\n        sumVel += sampleDepthVel.g * w * wd;\r\n        wsum += w * wd;\r\n    }\r\n\r\n    glFragColor = vec4(sum / wsum, sumVel / wsum, 0., 1.);\r\n}\r\n",n.ShaderStore.ShadersStore.standardBlurFragmentShader="uniform sampler2D textureSampler;\r\n\r\nuniform int filterSize;\r\nuniform vec2 blurDir;\r\n\r\nvarying vec2 vUV;\r\n\r\nvoid main(void) {\r\n    vec4 s = texture2D(textureSampler, vUV);\r\n    if (s.r == 0.) {\r\n        glFragColor = vec4(0., 0., 0., 1.);\r\n        return;\r\n    }\r\n\r\n    float sigma = float(filterSize) / 3.0;\r\n    float twoSigma2 = 2.0 * sigma * sigma;\r\n\r\n    vec4 sum = vec4(0.);\r\n    float wsum = 0.;\r\n\r\n    for (int x = -filterSize; x <= filterSize; ++x) {\r\n        vec2 coords = vec2(x);\r\n        vec4 sampl = texture2D(textureSampler, vUV + coords * blurDir);\r\n\r\n        float w = exp(-coords.x * coords.x / twoSigma2);\r\n\r\n        sum += sampl * w;\r\n        wsum += w;\r\n    }\r\n\r\n    sum /= wsum;\r\n\r\n    glFragColor = vec4(sum.rgb, 1.);\r\n}\r\n",n.ShaderStore.ShadersStore.renderFluidFragmentShader="// Index of refraction for water\r\n#define IOR 1.333\r\n\r\n// Ratios of air and water IOR for refraction\r\n// Air to water\r\n#define ETA 1.0/IOR\r\n\r\n// Fresnel at 0°\r\n#define F0 0.02\r\n\r\nuniform sampler2D textureSampler;\r\nuniform sampler2D depthSampler;\r\n#ifdef FLUIDRENDERING_DIFFUSETEXTURE\r\n    uniform sampler2D diffuseSampler;\r\n#else\r\n    uniform vec3 diffuseColor;\r\n#endif\r\n#ifdef FLUIDRENDERING_FIXED_THICKNESS\r\n    uniform float thickness;\r\n    uniform sampler2D bgDepthSampler;\r\n#else\r\n    uniform float minimumThickness;\r\n    uniform sampler2D thicknessSampler;\r\n#endif\r\nuniform samplerCube reflectionSampler;\r\n#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)\r\n    uniform sampler2D debugSampler;\r\n#endif\r\n\r\nuniform mat4 viewMatrix;\r\nuniform mat4 projectionMatrix;\r\nuniform mat4 invProjectionMatrix;\r\nuniform vec2 texelSize;\r\nuniform vec3 dirLight;\r\nuniform float cameraFar;\r\nuniform float density;\r\nuniform float refractionStrength;\r\nuniform float fresnelClamp;\r\nuniform float specularPower;\r\n\r\nvarying vec2 vUV;\r\n\r\nvec3 computeViewPosFromUVDepth(vec2 texCoord, float depth) {\r\n    vec4 ndc;\r\n    \r\n    ndc.xy = texCoord * 2.0 - 1.0;\r\n    ndc.z = projectionMatrix[2].z + projectionMatrix[3].z / depth;\r\n    ndc.w = 1.0;\r\n\r\n    vec4 eyePos = invProjectionMatrix * ndc;\r\n    eyePos.xyz /= eyePos.w;\r\n\r\n    return eyePos.xyz;\r\n}\r\n\r\nvec3 getViewPosFromTexCoord(vec2 texCoord) {\r\n    float depth = texture2D(depthSampler, texCoord).x;\r\n    return computeViewPosFromUVDepth(texCoord, depth);\r\n}\r\n\r\nvoid main(void) {\r\n    vec2 texCoord = vUV;\r\n\r\n#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)\r\n    vec4 color = texture2D(debugSampler, texCoord);\r\n    #ifdef FLUIDRENDERING_DEBUG_DEPTH\r\n        glFragColor = vec4(color.rgb / vec3(2.0), 1.);\r\n        if (color.r > 0.999 && color.g > 0.999) {\r\n            glFragColor = texture2D(textureSampler, texCoord);\r\n        }\r\n    #else\r\n        glFragColor = vec4(color.rgb, 1.);\r\n        if (color.r < 0.001 && color.g < 0.001 && color.b < 0.001) {\r\n            glFragColor = texture2D(textureSampler, texCoord);\r\n        }\r\n    #endif\r\n    return;\r\n#endif\r\n\r\n    vec2 depthVel = texture2D(depthSampler, texCoord).rg;\r\n    float depth = depthVel.r;\r\n#ifndef FLUIDRENDERING_FIXED_THICKNESS\r\n    float thickness = texture2D(thicknessSampler, texCoord).x;\r\n#else\r\n    float bgDepth = texture2D(bgDepthSampler, texCoord).x;\r\n    float depthNonLinear = projectionMatrix[2].z + projectionMatrix[3].z / depth;\r\n    depthNonLinear = depthNonLinear * 0.5 + 0.5;\r\n#endif\r\n\r\n#ifndef FLUIDRENDERING_FIXED_THICKNESS\r\n    if (depth >= cameraFar || depth <= 0. || thickness <= minimumThickness) {\r\n#else\r\n    if (depth >= cameraFar || depth <= 0. || bgDepth <= depthNonLinear) {\r\n#endif\r\n        vec3 backColor = texture2D(textureSampler, texCoord).rgb;\r\n        glFragColor = vec4(backColor, 1.);\r\n        return;\r\n    }\r\n\r\n    // calculate view-space position from depth\r\n    vec3 viewPos = computeViewPosFromUVDepth(texCoord, depth);\r\n\r\n    // calculate normal\r\n    vec3 ddx = getViewPosFromTexCoord(texCoord + vec2(texelSize.x, 0.)) - viewPos;\r\n    vec3 ddy = getViewPosFromTexCoord(texCoord + vec2(0., texelSize.y)) - viewPos;\r\n\r\n    vec3 ddx2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(-texelSize.x, 0.));\r\n    if (abs(ddx.z) > abs(ddx2.z)) {\r\n        ddx = ddx2;\r\n    }\r\n\r\n    vec3 ddy2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(0., -texelSize.y));\r\n    if (abs(ddy.z) > abs(ddy2.z)) {\r\n        ddy = ddy2;\r\n    }\r\n\r\n    vec3 normal = normalize(cross(ddy, ddx));\r\n    if(isnan(normal.x) || isnan(normal.y) || isnan(normal.z) ||\r\n    isinf(normal.x) || isinf(normal.y) || isinf(normal.z)) {\r\n        normal = vec3(0., 0., -1.);\r\n    }\r\n\r\n#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_SHOWNORMAL)\r\n    glFragColor = vec4(normal * 0.5 + 0.5, 1.0);\r\n    return;\r\n#endif\r\n\r\n    // shading\r\n    vec3 rayDir = normalize(viewPos); // direction from camera position to view position\r\n\r\n#ifdef FLUIDRENDERING_DIFFUSETEXTURE\r\n    vec3 diffuseColor = texture2D(diffuseSampler, texCoord).rgb;\r\n#endif\r\n\r\n    vec3  lightDir = normalize(vec3(viewMatrix * vec4(-dirLight, 0.)));\r\n    vec3  H        = normalize(lightDir - rayDir);\r\n    float specular = pow(max(0.0, dot(H, normal)), specularPower);\r\n\r\n#ifdef FLUIDRENDERING_DEBUG_DIFFUSERENDERING\r\n    float diffuse  = max(0.0, dot(lightDir, normal)) * 1.0;\r\n\r\n    glFragColor = vec4(vec3(0.1) /*ambient*/ + vec3(0.42, 0.50, 1.00) * diffuse + vec3(0, 0, 0.2) + specular, 1.);\r\n    return;\r\n#endif\r\n\r\n    // Refraction color\r\n    vec3 refractionDir = refract(rayDir, normal, ETA);\r\n\r\n    vec3 transmitted = (texture2D(textureSampler, vec2(texCoord + refractionDir.xy * thickness * refractionStrength)).rgb);\r\n    vec3 transmittance = exp(-density * thickness * (1.0 - diffuseColor)); // Beer law\r\n   \r\n    vec3 refractionColor = transmitted * transmittance;\r\n\r\n    // Reflection of the environment.\r\n    vec3 reflectionDir = reflect(rayDir, normal);\r\n    vec3 reflectionColor = (textureCube(reflectionSampler, reflectionDir).rgb);\r\n\r\n    // Combine refraction and reflection    \r\n    float fresnel = clamp(F0 + (1.0 - F0) * pow(1.0 - dot(normal, -rayDir), 5.0), 0., fresnelClamp);\r\n    \r\n    vec3 finalColor = mix(refractionColor, reflectionColor, fresnel) + specular;\r\n\r\n#ifdef FLUIDRENDERING_VELOCITY\r\n    float velocity = depthVel.g;\r\n    finalColor = mix(finalColor, vec3(1.0), smoothstep(0.3, 1.0, velocity / 6.0));\r\n#endif\r\n\r\n    glFragColor = vec4(finalColor, 1.);\r\n}\r\n",n.ShaderStore.ShadersStoreWGSL.renderFluidFragmentShader="// Index of refraction for water\r\nlet IOR = 1.333;\r\n\r\n// Ratios of air and water IOR for refraction\r\n// Air to water\r\nlet ETA = 0.7501875468867217; // 1.0 / IOR;\r\n\r\n// Fresnel at 0°\r\nlet F0 = 0.02;\r\n\r\nvar textureSampler : texture_2d<f32>;\r\nvar textureSamplerSampler : sampler;\r\nvar depthSampler : texture_2d<f32>;\r\n#ifdef FLUIDRENDERING_DIFFUSETEXTURE\r\n    var diffuseSampler : texture_2d<f32>;\r\n    var diffuseSamplerSampler : sampler;\r\n#else\r\n    uniform diffuseColor : vec3<f32>;\r\n#endif\r\n#ifdef FLUIDRENDERING_FIXED_THICKNESS\r\n    uniform thickness : f32;\r\n    var bgDepthSampler: texture_depth_2d;\r\n    var bgDepthSamplerSampler: sampler;\r\n#else\r\n    uniform minimumThickness : f32;\r\n    var thicknessSampler : texture_2d<f32>;\r\n    var thicknessSamplerSampler : sampler;\r\n#endif\r\nvar reflectionSampler : texture_cube<f32>;\r\nvar reflectionSamplerSampler : sampler;\r\n#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)\r\n    var debugSampler : texture_2d<f32>;\r\n    var debugSamplerSampler : sampler;\r\n#endif\r\n\r\nuniform viewMatrix : mat4x4<f32>;\r\nuniform projectionMatrix : mat4x4<f32>;\r\nuniform invProjectionMatrix : mat4x4<f32>;\r\nuniform texelSize : vec2<f32>;\r\nuniform dirLight : vec3<f32>;\r\nuniform cameraFar : f32;\r\nuniform density : f32;\r\nuniform refractionStrength : f32;\r\nuniform fresnelClamp : f32;\r\nuniform specularPower : f32;\r\n\r\nvarying vUV : vec2<f32>;\r\n\r\nfn computeViewPosFromUVDepth(texCoord : vec2<f32>, depth : f32) -> vec3<f32> {\r\n    let ndc = vec4(texCoord * 2.0 - 1.0, uniforms.projectionMatrix[2].z + uniforms.projectionMatrix[3].z / depth, 1.0);\r\n\r\n    var eyePos = uniforms.invProjectionMatrix * ndc;\r\n\r\n    return eyePos.xyz / eyePos.w;\r\n}\r\n\r\nfn getViewPosFromTexCoord(texCoord : vec2<f32>) -> vec3<f32> {\r\n    let dim = textureDimensions(depthSampler);\r\n    let depth = textureLoad(depthSampler, vec2<i32>(texCoord * vec2<f32>(dim)), 0).x;\r\n    return computeViewPosFromUVDepth(texCoord, depth);\r\n}\r\n\r\n@stage(fragment)\r\nfn main(input: FragmentInputs) -> FragmentOutputs {\r\n    let texCoord = vUV;\r\n\r\n#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_TEXTURE)\r\n    #ifdef FLUIDRENDERING_DEBUG_DEPTH\r\n        let dim2 = textureDimensions(debugSampler);\r\n        let color = textureLoad(debugSampler, vec2<i32>(texCoord * vec2<f32>(dim2)), 0);\r\n        gl_FragColor = vec4(color.rgb / 2.0, 1.);\r\n        if (color.r > 0.999 && color.g > 0.999) {\r\n            gl_FragColor = textureSample(textureSampler, textureSamplerSampler, texCoord);\r\n        }\r\n    #else\r\n        let color = textureSample(debugSampler, debugSamplerSampler, texCoord);\r\n        gl_FragColor = vec4(color.rgb, 1.);\r\n        if (color.r < 0.001 && color.g < 0.001 && color.b < 0.001) {\r\n            gl_FragColor = textureSample(textureSampler, textureSamplerSampler, texCoord);\r\n        }\r\n    #endif\r\n    output.color = gl_FragColor;\r\n    return output;\r\n#endif\r\n\r\n    let dim = textureDimensions(depthSampler);\r\n    let depthVel = textureLoad(depthSampler, vec2<i32>(texCoord * vec2<f32>(dim)), 0).rg;\r\n    let depth = depthVel.r;\r\n#ifndef FLUIDRENDERING_FIXED_THICKNESS\r\n    let thickness_ = textureSample(thicknessSampler, thicknessSamplerSampler, texCoord).x;\r\n#else\r\n    let bgDepth = textureSample(bgDepthSampler, bgDepthSamplerSampler, texCoord);\r\n    let depthNonLinear = uniforms.projectionMatrix[2].z + uniforms.projectionMatrix[3].z / depth;\r\n    let thickness_ = uniforms.thickness;\r\n#endif\r\n    let thickness = thickness_;\r\n\r\n#ifndef FLUIDRENDERING_FIXED_THICKNESS\r\n    if (depth >= uniforms.cameraFar || depth <= 0. || thickness <= uniforms.minimumThickness) {\r\n#else\r\n    if (depth >= uniforms.cameraFar || depth <= 0. || bgDepth <= depthNonLinear) {\r\n#endif\r\n        let backColor = textureSample(textureSampler, textureSamplerSampler, texCoord).rgb;\r\n        gl_FragColor = vec4(backColor, 1.);\r\n        output.color = gl_FragColor;\r\n        return output;\r\n    }\r\n\r\n    // calculate view-space position from depth\r\n    let viewPos = computeViewPosFromUVDepth(texCoord, depth);\r\n\r\n    // calculate normal\r\n    var ddx = getViewPosFromTexCoord(texCoord + vec2(uniforms.texelSize.x, 0.)) - viewPos;\r\n    var ddy = getViewPosFromTexCoord(texCoord + vec2(0., uniforms.texelSize.y)) - viewPos;\r\n\r\n    let ddx2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(-uniforms.texelSize.x, 0.));\r\n    if (abs(ddx.z) > abs(ddx2.z)) {\r\n        ddx = ddx2;\r\n    }\r\n\r\n    let ddy2 = viewPos - getViewPosFromTexCoord(texCoord + vec2(0., -uniforms.texelSize.y));\r\n    if (abs(ddy.z) > abs(ddy2.z)) {\r\n        ddy = ddy2;\r\n    }\r\n\r\n    let normal = normalize(cross(ddy, ddx));\r\n\r\n#if defined(FLUIDRENDERING_DEBUG) && defined(FLUIDRENDERING_DEBUG_SHOWNORMAL)\r\n    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);\r\n    output.color = gl_FragColor;\r\n    return output;\r\n#endif\r\n\r\n    // shading\r\n    let rayDir = normalize(viewPos); // direction from camera position to view position\r\n\r\n#ifdef FLUIDRENDERING_DIFFUSETEXTURE\r\n    let diffuseColor_ = textureSample(diffuseSampler, diffuseSamplerSampler, texCoord).rgb;\r\n#else\r\n    let diffuseColor_ = uniforms.diffuseColor;\r\n#endif\r\n    let diffuseColor = diffuseColor_;\r\n\r\n    let  lightDir = normalize((uniforms.viewMatrix * vec4(-uniforms.dirLight, 0.)).xyz);\r\n    let  H        = normalize(lightDir - rayDir);\r\n    let specular = pow(max(0.0, dot(H, normal)), uniforms.specularPower);\r\n\r\n#ifdef FLUIDRENDERING_DEBUG_DIFFUSERENDERING\r\n    let diffuse  = max(0.0, dot(lightDir, normal)) * 1.0;\r\n\r\n    gl_FragColor = vec4(vec3(0.1) + vec3(0.42, 0.50, 1.00) * diffuse + vec3(0, 0, 0.2) + specular, 1.);\r\n    output.color = gl_FragColor;\r\n    return output;\r\n#endif\r\n\r\n    // Refraction color\r\n    let refractionDir = refract(rayDir, normal, ETA);\r\n\r\n    let transmitted = (textureSample(textureSampler, textureSamplerSampler, vec2(texCoord + refractionDir.xy * thickness * uniforms.refractionStrength)).rgb);\r\n    let transmittance = exp(-uniforms.density * thickness * (1.0 - diffuseColor)); // Beer law\r\n   \r\n    let refractionColor = transmitted * transmittance;\r\n\r\n    // Reflection of the environment.\r\n    let reflectionDir = reflect(rayDir, normal);\r\n    let reflectionColor = textureSample(reflectionSampler, reflectionSamplerSampler, reflectionDir).rgb;\r\n\r\n    // Combine refraction and reflection    \r\n    let fresnel = clamp(F0 + (1.0 - F0) * pow(1.0 - dot(normal, -rayDir), 5.0), 0., uniforms.fresnelClamp);\r\n    \r\n    var finalColor = mix(refractionColor, reflectionColor, fresnel) + specular;\r\n\r\n#ifdef FLUIDRENDERING_VELOCITY\r\n    let velocity = depthVel.g;\r\n    finalColor = mix(finalColor, vec3(1.0), smoothstep(0.3, 1.0, velocity / 6.0));\r\n#endif\r\n\r\n    gl_FragColor = vec4(finalColor, 1.);\r\n}\r\n",n.ShaderStore.ShadersStore.passDepthVertexShader="attribute vec2 position;\r\n\r\nvarying vec2 vUV;\r\n\r\nconst vec2 madd = vec2(0.5, 0.5);\r\n\r\nvoid main(void) {\r\n\tvUV = position * madd + madd;\r\n\tgl_Position = vec4(position, 0.0, 1.0);\r\n}\r\n",n.ShaderStore.ShadersStore.passDepthFragmentShader="uniform sampler2D textureDepth;\r\n\r\nvarying vec2 vUV;\r\n\r\nvoid main(void) \r\n{\r\n\tgl_FragDepth = texture2D(textureDepth, vUV).x;\r\n}\r\n",n.ShaderStore.ShadersStoreWGSL.passDepthVertexShader="attribute position: vec2<f32>;\r\n\r\nvarying vUV: vec2<f32>;\r\n\r\nlet madd = vec2(0.5, 0.5);\r\n\r\n@stage(vertex)\r\nfn main(input : VertexInputs) -> FragmentInputs\r\n{\r\n\tvUV = position * madd + madd;\r\n\tgl_Position = vec4(position, 0.0, 1.0);\r\n}\r\n",n.ShaderStore.ShadersStoreWGSL.passDepthFragmentShader="var textureDepth: texture_depth_2d;\r\nvar textureDepthSampler: sampler;\r\n\r\nvarying vUV: vec2<f32>;\r\n\r\n@stage(fragment)\r\nfn main(input: FragmentInputs) -> FragmentOutputs\r\n{\r\n\tgl_FragDepth = textureSample(textureDepth, textureDepthSampler, vUV);\r\n}\r\n",n.ShaderStore.ShadersStoreWGSL.postprocessVertexShader="// Attributes\r\nattribute position : vec2<f32>;\r\n\r\nuniform scale : vec2<f32>;\r\n// Output\r\nvarying vUV : vec2<f32>;\r\n\r\nlet madd = vec2(0.5, 0.5);\r\n\r\n#define CUSTOM_VERTEX_DEFINITIONS\r\n\r\n@stage(vertex)\r\nfn main(input : VertexInputs) -> FragmentInputs\r\n{\r\n#define CUSTOM_VERTEX_MAIN_BEGIN\r\n\r\n\tvUV = (position * madd + madd) * uniforms.scale;\r\n\tgl_Position = vec4(position, 0.0, 1.0);\r\n\r\n#define CUSTOM_VERTEX_MAIN_END\r\n}\r\n"},7499:(e,r,t)=>{t.r(r),t.d(r,{FluidRenderingObject:()=>i});var n=t(6291);class i{constructor(e,r,t){this.vertexBuffers=r,this.indexBuffer=t,this.priority=0,this._particleSize=.1,this.onParticleSizeChanged=new n.Observable,this.particleThicknessAlpha=.05,this._useVelocity=!1,this._scene=e,this._engine=e.getEngine(),this._effectsAreDirty=!0,this._depthEffectWrapper=null,this._thicknessEffectWrapper=null}get particleSize(){return this._particleSize}set particleSize(e){e!==this._particleSize&&(this._particleSize=e,this.onParticleSizeChanged.notifyObservers(this))}get useInstancing(){return!this.indexBuffer}get useVelocity(){return this._useVelocity}set useVelocity(e){this._useVelocity!==e&&this._hasVelocity()&&(this._useVelocity=e,this._effectsAreDirty=!0)}_hasVelocity(){return!!this.vertexBuffers.velocity}getClassName(){return"FluidRenderingObject"}_createEffects(){const e=["view","projection","particleRadius","size"],r=["position","offset"],t=[];this._effectsAreDirty=!1,this.useVelocity&&(r.push("velocity"),t.push("#define FLUIDRENDERING_VELOCITY")),this._depthEffectWrapper=new n.EffectWrapper({engine:this._engine,useShaderStore:!0,vertexShader:"fluidParticleDepth",fragmentShader:"fluidParticleDepth",attributeNames:r,uniformNames:e,samplerNames:[],defines:t}),e.push("particleAlpha"),this._thicknessEffectWrapper=new n.EffectWrapper({engine:this._engine,useShaderStore:!0,vertexShader:"fluidParticleThickness",fragmentShader:"fluidParticleThickness",attributeNames:["position","offset"],uniformNames:e,samplerNames:[]})}isReady(){if(this._effectsAreDirty&&this._createEffects(),!this._depthEffectWrapper||!this._thicknessEffectWrapper)return!1;const e=this._depthEffectWrapper._drawWrapper.effect,r=this._thicknessEffectWrapper._drawWrapper.effect;return e.isReady()&&r.isReady()}numParticles(){return 0}renderDepthTexture(){const e=this.numParticles();if(!this._depthEffectWrapper||0===e)return;const r=this._depthEffectWrapper._drawWrapper,t=r.effect;this._engine.enableEffect(r),this._engine.bindBuffers(this.vertexBuffers,this.indexBuffer,t),t.setMatrix("view",this._scene.getViewMatrix()),t.setMatrix("projection",this._scene.getProjectionMatrix()),t.setFloat2("size",this._particleSize,this._particleSize),t.setFloat("particleRadius",this._particleSize/2),this.useInstancing?this._engine.drawArraysType(n.Constants.MATERIAL_TriangleStripDrawMode,0,4,e):this._engine.drawElementsType(n.Constants.MATERIAL_TriangleFillMode,0,e)}renderThicknessTexture(){const e=this.numParticles();if(!this._thicknessEffectWrapper||0===e)return;const r=this._thicknessEffectWrapper._drawWrapper,t=r.effect;this._engine.setAlphaMode(n.Constants.ALPHA_ONEONE),this._engine.setDepthWrite(!1),this._engine.enableEffect(r),this._engine.bindBuffers(this.vertexBuffers,this.indexBuffer,t),t.setMatrix("view",this._scene.getViewMatrix()),t.setMatrix("projection",this._scene.getProjectionMatrix()),t.setFloat("particleAlpha",this.particleThicknessAlpha),t.setFloat2("size",this._particleSize,this._particleSize),this.useInstancing?this._engine.drawArraysType(n.Constants.MATERIAL_TriangleStripDrawMode,0,4,e):this._engine.drawElementsType(n.Constants.MATERIAL_TriangleFillMode,0,e),this._engine.setDepthWrite(!0),this._engine.setAlphaMode(n.Constants.ALPHA_DISABLE)}renderDiffuseTexture(){}dispose(){var e,r;null===(e=this._depthEffectWrapper)||void 0===e||e.dispose(),null===(r=this._thicknessEffectWrapper)||void 0===r||r.dispose()}}},8573:(e,r,t)=>{t.r(r),t.d(r,{FluidRenderingObjectParticleSystem:()=>s});var n=t(6291),i=t(7499);class s extends i.FluidRenderingObject{constructor(e,r){super(e,r.vertexBuffers,r.indexBuffer),this._useTrueRenderingForDiffuseTexture=!0,this._particleSystem=r,this._renderCallback=r.render.bind(r),this._blendMode=r.blendMode,this._onBeforeDrawParticleObserver=null,r.render=()=>0,this.particleSize=(r.minSize+r.maxSize)/2,this.useTrueRenderingForDiffuseTexture=!1}get particleSystem(){return this._particleSystem}getClassName(){return"FluidRenderingObjectParticleSystem"}get useTrueRenderingForDiffuseTexture(){return this._useTrueRenderingForDiffuseTexture}set useTrueRenderingForDiffuseTexture(e){this._useTrueRenderingForDiffuseTexture!==e&&(this._useTrueRenderingForDiffuseTexture=e,e?(this._particleSystem.blendMode=this._blendMode,this._particleSystem.onBeforeDrawParticlesObservable.remove(this._onBeforeDrawParticleObserver),this._onBeforeDrawParticleObserver=null):(this._particleSystem.blendMode=-1,this._onBeforeDrawParticleObserver=this._particleSystem.onBeforeDrawParticlesObservable.add((()=>{this._engine.setAlphaMode(n.Constants.ALPHA_COMBINE)}))))}isReady(){return super.isReady()&&this._particleSystem.isReady()}numParticles(){return this._particleSystem.getActiveCount()}renderDiffuseTexture(){this._renderCallback()}dispose(){super.dispose(),this._particleSystem.onBeforeDrawParticlesObservable.remove(this._onBeforeDrawParticleObserver),this._onBeforeDrawParticleObserver=null,this._particleSystem.render=this._renderCallback,this._particleSystem.blendMode=this._blendMode}}},5984:(e,r,t)=>{t.r(r),t.d(r,{FluidRenderingObjectVertexBuffer:()=>s});var n=t(6291),i=t(7499);class s extends i.FluidRenderingObject{constructor(e,r,t){super(e,r,null),this._numParticles=t,this._disposeVBOffset=!1,this._diffuseEffectWrapper=null,r.offset||(r.offset=new n.VertexBuffer(this._engine,[0,0,1,0,0,1,1,1],"offset",!1,!1,2),this._disposeVBOffset=!0)}getClassName(){return"FluidRenderingObjectVertexBuffer"}_createEffects(){super._createEffects(),this._diffuseEffectWrapper=new n.EffectWrapper({engine:this._engine,useShaderStore:!0,vertexShader:"fluidParticleDiffuse",fragmentShader:"fluidParticleDiffuse",attributeNames:["position","offset","color"],uniformNames:["view","projection","size"],samplerNames:[]})}isReady(){var e,r;return super.isReady()&&null!==(r=null===(e=this._diffuseEffectWrapper)||void 0===e?void 0:e.effect.isReady())&&void 0!==r&&r}numParticles(){return this._numParticles}setNumParticles(e){this._numParticles=e}renderDiffuseTexture(){const e=this.numParticles();if(!this._diffuseEffectWrapper||0===e)return;const r=this._diffuseEffectWrapper._drawWrapper,t=r.effect;this._engine.enableEffect(r),this._engine.bindBuffers(this.vertexBuffers,this.indexBuffer,t),t.setMatrix("view",this._scene.getViewMatrix()),t.setMatrix("projection",this._scene.getProjectionMatrix()),null!==this._particleSize&&t.setFloat2("size",this._particleSize,this._particleSize),this.useInstancing?this._engine.drawArraysType(n.Constants.MATERIAL_TriangleStripDrawMode,0,4,e):this._engine.drawElementsType(n.Constants.MATERIAL_TriangleFillMode,0,e)}dispose(){var e;super.dispose(),null===(e=this._diffuseEffectWrapper)||void 0===e||e.dispose(),this._disposeVBOffset&&this.vertexBuffers.offset.dispose()}}},247:(e,r,t)=>{t.r(r),t.d(r,{CopyDepthTexture:()=>i});var n=t(6291);class i{constructor(e,r,t){this._vertexBuffers={},this._engine=e,this._width=r,this._height=t,this._depthRTWrapper=this._engine.createRenderTargetTexture({width:r,height:t},{generateMipMaps:!1,type:n.Constants.TEXTURETYPE_UNSIGNED_BYTE,format:n.Constants.TEXTUREFORMAT_R,samplingMode:n.Constants.TEXTURE_NEAREST_SAMPLINGMODE,generateDepthBuffer:!0,generateStencilBuffer:!1,samples:1,noColorTarget:!0}),this._depthRTWrapper.createDepthStencilTexture(0,!1,!1,1),this._copyEffectWrapper=new n.EffectWrapper({engine:this._engine,useShaderStore:!0,vertexShader:"passDepth",fragmentShader:"passDepth",attributeNames:["position"],uniformNames:[],samplerNames:["textureDepth"],shaderLanguage:e.isWebGPU?n.ShaderLanguage.WGSL:n.ShaderLanguage.GLSL});const i=[];i.push(1,1),i.push(-1,1),i.push(-1,-1),i.push(1,-1),this._vertexBuffers[n.VertexBuffer.PositionKind]=new n.VertexBuffer(this._engine,i,n.VertexBuffer.PositionKind,!1,!1,2);const s=[];s.push(0),s.push(1),s.push(2),s.push(0),s.push(2),s.push(3),this._indexBuffer=this._engine.createIndexBuffer(s)}get depthRTWrapper(){return this._depthRTWrapper}copy(e){const r=this._copyEffectWrapper.effect;if(!r.isReady())return!1;this._engine.bindFramebuffer(this._depthRTWrapper),this._engine.enableEffect(this._copyEffectWrapper._drawWrapper);const t=this._engine.getDepthFunction();return this._engine.setState(!1),this._engine.setDepthBuffer(!0),this._engine.setDepthWrite(!0),this._engine.setDepthFunction(n.Constants.ALWAYS),this._engine.setColorWrite(!1),this._engine.bindBuffers(this._vertexBuffers,this._indexBuffer,r),r._bindTexture("textureDepth",e),this._engine.drawElementsType(n.Constants.MATERIAL_TriangleFillMode,0,6),this._engine.setDepthFunction(t),this._engine.setColorWrite(!0),this._engine.unBindFramebuffer(this._depthRTWrapper),!0}dispose(){var e;this._depthRTWrapper.dispose(),null===(e=this._vertexBuffers[n.VertexBuffer.PositionKind])||void 0===e||e.dispose(),this._vertexBuffers={},this._indexBuffer&&(this._engine._releaseBuffer(this._indexBuffer),this._indexBuffer=null)}}}}]);
//# sourceMappingURL=508.8bb25ddf691cef18450d.js.map