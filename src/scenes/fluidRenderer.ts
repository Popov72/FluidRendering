import * as BABYLON from "@babylonjs/core";

export class FluidRenderer {
    private _scene: BABYLON.Scene;
    private _engine: BABYLON.Engine;
    private _ps: BABYLON.ParticleSystem;
    private _dirLight: BABYLON.Vector3;
    private _particleAlpha: number;
    private _vertexBuffers: { [key: string]: BABYLON.VertexBuffer };
    private _indexBuffer: BABYLON.DataBuffer;
    private _useInstancing: boolean;
    private _mapSize: number;
    private _textureTypeFloat: number;
    private _textureTypeHalfFloat: number;

    private _depthEffectWrapper: BABYLON.EffectWrapper;
    private _rtDepth: BABYLON.RenderTargetWrapper;
    private _textureDepth: BABYLON.ThinTexture;
    private _rtDepthBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    private _textureBlurredDepth: BABYLON.ThinTexture;
    private _blurDepthPostProcesses: BABYLON.PostProcess[];

    private _thicknessEffectWrapper: BABYLON.EffectWrapper;
    private _rtThickness: BABYLON.RenderTargetWrapper;
    private _textureThickness: BABYLON.ThinTexture;
    private _rtThicknessBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    private _textureBlurredThickness: BABYLON.ThinTexture;
    private _blurThicknessPostProcesses: BABYLON.PostProcess[];

    private _renderPostProcess: BABYLON.PostProcess;
    private _passPostProcess: BABYLON.PostProcess;

    private _invProjectionMatrix: BABYLON.Matrix;
    private _invViewMatrix: BABYLON.Matrix;
    private _depthClearColor: BABYLON.Color4;
    private _thicknessClearColor: BABYLON.Color4;

    public debug = true;

    public enableBlur = true;

    public blurScale = 2;

    public blurKernel = 60;

    public onDisposeObservable: BABYLON.Observable<FluidRenderer> = new BABYLON.Observable<FluidRenderer>();

    constructor(scene: BABYLON.Scene, ps: BABYLON.ParticleSystem, dirLight: BABYLON.Vector3, particleAlpha: number) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._ps = ps;
        this._dirLight = dirLight;
        this._particleAlpha = particleAlpha;
        this._vertexBuffers = (ps as any)._vertexBuffers;
        this._indexBuffer = (ps as any)._indexBuffer;
        this._useInstancing = (ps as any)._useInstancing;
        this._invProjectionMatrix = new BABYLON.Matrix();
        this._invViewMatrix = new BABYLON.Matrix();
        this._depthClearColor = new BABYLON.Color4(1, 0, 0, 1);
        this._thicknessClearColor = new BABYLON.Color4(0, 0, 0, 1);
        this._mapSize = 1024;
        this._depthEffectWrapper = null as any;
        this._rtDepth = null as any;
        this._textureDepth = null as any;
        this._rtDepthBlur = null as any;
        this._textureBlurredDepth = null as any;
        this._blurDepthPostProcesses = null as any;
        this._thicknessEffectWrapper = null as any;
        this._rtThickness = null as any;
        this._textureThickness = null as any;
        this._rtThicknessBlur = null as any;
        this._textureBlurredThickness = null as any;
        this._blurThicknessPostProcesses = null as any;
        this._renderPostProcess = null as any;
        this._passPostProcess = null as any;

        BABYLON.Effect.ShadersStore["renderLiquidFragmentShader"] = BABYLON.Effect.ShadersStore["renderLiquidFragmentShader"].replace("##CAMERAFAR##", this._scene.activeCamera!.maxZ + ".");

        let time = 0;
        const pos: number[] = [];

        const generateVertices = () => {
            //let numRemove = 0;
            pos.length = 0;
            for (let y = -10; y < 5; ++y) {
                for (let x = -15; x < 15; ++x) {
                    for (let z = -15; z < 15; ++z) {
                        const limit = -x / 3;
                        if (y > limit) continue;
                        pos.push(
                            2.2913386821746826 + x * 0.4,
                            -1.6357861757278442 + y * 0.4 + 0.5 * Math.sin((x+time/10)*3+(z+time/8)*5+time),
                            -0.021622177213430405 - z * 0.4,
                        );
                    }
                }
            }
            //console.log(numRemove);
        };

        /*generateVertices();
        this._vertexBuffers["position"] = new BABYLON.VertexBuffer(this._engine, pos, "position", true, false, undefined, true);*/

        this._textureTypeFloat = BABYLON.Constants.TEXTURETYPE_FLOAT;
        this._textureTypeHalfFloat = BABYLON.Constants.TEXTURETYPE_HALF_FLOAT;

        this._initialize();

        //console.log(this._vertexBuffers["position"].getData(), this._vertexBuffers);

        scene.onAfterDrawPhaseObservable.add(() => {
            this._render();
            /*generateVertices();
            this._vertexBuffers["position"].update(pos);
            time += 0.05;*/

        });

        this._engine.onResizeObservable.add(() => {
            this.dispose();
            this._initialize();
        });
    }

    protected _initialize(): void {
        this._initializeDepthStep();
        this._initializeThicknessStep();
        if (this.enableBlur) {
            const [rtDepthBlur, textureBlurredDepth, blurPostProcesses] = this._initializeBlurStep(this._textureDepth, this._textureTypeFloat, this.blurScale, "Depth");
            this._rtDepthBlur = rtDepthBlur;
            this._textureBlurredDepth = textureBlurredDepth;
            this._blurDepthPostProcesses = blurPostProcesses;

            const [rtThicknessBlur, textureBlurredThickness, blurThicknessPostProcesses] = this._initializeBlurStep(this._textureThickness, this._textureTypeHalfFloat, this.blurScale, "Thickness");
            this._rtThicknessBlur = rtThicknessBlur;
            this._textureBlurredThickness = textureBlurredThickness;
            this._blurThicknessPostProcesses = blurThicknessPostProcesses;
        }
        this._initializeLiquidRenderingStep();
    }

    protected _initializeDepthStep(): void {
        // Creates the effect used to draw the particles in the depth texture
        this._depthEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: false,
            vertexShader: particleDepthVertexShader,
            fragmentShader: particleDepthFragmentShader.replace("##CAMERAFAR##", this._scene.activeCamera!.maxZ + "."),
            attributeNames: ["position", "size", "offset"],
            uniformNames: ["view", "projection"],
            samplerNames: [],
        });

        // Creates the render target wrapper/texture we will generate the depth data into
        this._rtDepth = this._engine.createRenderTargetTexture(this._mapSize, {
            generateMipMaps: false,
            type: this._textureTypeFloat,
            format: BABYLON.Constants.TEXTUREFORMAT_R,
            samplingMode: BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: true,
            generateStencilBuffer: false,
            samples: 1,
        });
        //this._rtDepth.createDepthStencilTexture(0, false, false, 1, BABYLON.Constants.TEXTUREFORMAT_DEPTH32_FLOAT);

        //const renderTexture = this._rtDepth._depthStencilTexture;
        const renderTexture = this._rtDepth.texture!;

        this._textureDepth = new BABYLON.ThinTexture(renderTexture);

        renderTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        renderTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        if (this.debug) {
            const texture = new BABYLON.Texture(null, this._scene);
            texture.name = "rttDepth";
            texture._texture = renderTexture;
            texture._texture.incrementReferences();
            this.onDisposeObservable.add(() => {
                texture.dispose();
            });
        }
    }

    protected _initializeThicknessStep(): void {
        const width = this._engine.getRenderWidth();
        const height = this._engine.getRenderHeight();

        // Creates the effect used to draw the particles in the thickness texture
        this._thicknessEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: false,
            vertexShader: particleThicknessVertexShader,
            fragmentShader: particleThicknessFragmentShader,
            attributeNames: ["position", "size", "offset"],
            uniformNames: ["view", "projection", "particleAlpha"],
            samplerNames: [],
        });

        // Creates the render target wrapper/texture we will generate the thickness data into
        this._rtThickness = this._engine.createRenderTargetTexture({ width, height }, {
            generateMipMaps: false,
            type: BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE,
            format: BABYLON.Constants.TEXTUREFORMAT_R,
            samplingMode: BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
            generateDepthBuffer: true,
            generateStencilBuffer: false,
            samples: 1,
        });
        this._rtThickness.createDepthStencilTexture(0, false, false, 1, BABYLON.Constants.TEXTUREFORMAT_DEPTH32_FLOAT);

        const renderTexture = this._rtThickness.texture!;

        this._textureThickness = new BABYLON.ThinTexture(renderTexture);

        renderTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        renderTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        if (this.debug) {
            const texture = new BABYLON.Texture(null, this._scene);
            texture.name = "rttThickness";
            texture._texture = renderTexture;
            texture._texture.incrementReferences();
            this.onDisposeObservable.add(() => {
                texture.dispose();
            });
        }
    }

    protected _initializeBlurStep(textureBlurSource: BABYLON.ThinTexture, textureType: number, blurSizeDivisor: number, debugName: string): [BABYLON.RenderTargetWrapper, BABYLON.ThinTexture, BABYLON.PostProcess[]] {
        const engine = this._scene.getEngine();
        const targetSize = Math.floor(this._mapSize / blurSizeDivisor);

        const rtBlur = this._engine.createRenderTargetTexture(targetSize, {
            generateMipMaps: false,
            type: textureType,
            format: BABYLON.Constants.TEXTUREFORMAT_R,
            samplingMode: BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            samples: 1,
        });

        let renderTexture = rtBlur.texture!;

        renderTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        renderTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        if (this.debug) {
            const texture = new BABYLON.Texture(null, this._scene);
            texture.name = "rttBlurred" + debugName;
            texture._texture = renderTexture;
            texture._texture.incrementReferences();
            this.onDisposeObservable.add(() => {
                texture.dispose();
            });
        }

        const kernelBlurXPostprocess = new BABYLON.PostProcess("BilateralBlurX", "bilateralBlur", ["filterRadius", "blurScale", "blurDir", "blurDepthFalloff"],
            null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            engine, false, null, textureType, undefined, undefined, undefined, BABYLON.Constants.TEXTUREFORMAT_R);
        kernelBlurXPostprocess.width = targetSize;
        kernelBlurXPostprocess.height = targetSize;
        kernelBlurXPostprocess.externalTextureSamplerBinding = true;
        kernelBlurXPostprocess.onApplyObservable.add((effect) => {
            effect.setTexture("textureSampler", textureBlurSource);
            effect.setFloat("filterRadius", this.blurKernel >> 1);
            effect.setFloat2("blurDir", 1 / this._mapSize, 0);
            effect.setFloat("blurScale", .05);
            effect.setFloat("blurDepthFalloff", .1);
        });

        const kernelBlurYPostprocess = new BABYLON.PostProcess("BilateralBlurY", "bilateralBlur", ["filterRadius", "blurScale", "blurDir", "blurDepthFalloff"],
            null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            engine, false, null, textureType, undefined, undefined, undefined, BABYLON.Constants.TEXTUREFORMAT_R);
        kernelBlurYPostprocess.onApplyObservable.add((effect) => {
            effect.setFloat("filterRadius", this.blurKernel >> 1);
            effect.setFloat2("blurDir", 0, 1 / this._mapSize);
            effect.setFloat("blurScale", .05);
            effect.setFloat("blurDepthFalloff", .1);
        });
        
        kernelBlurXPostprocess.autoClear = false;
        kernelBlurYPostprocess.autoClear = false;

        return [rtBlur, new BABYLON.ThinTexture(renderTexture), [kernelBlurXPostprocess, kernelBlurYPostprocess]];
    }

    protected _initializeLiquidRenderingStep(): void {
        const engine = this._scene.getEngine();
        const targetSize = Math.floor(this._mapSize / this.blurScale);

        this._renderPostProcess = new BABYLON.PostProcess("render", "renderLiquid", ["projection", "invProjection", "invView", "texelSize", "dirLight", "camPos"],
            ["depthSampler", "thicknessSampler", "reflectionSampler"], 1, this._scene.activeCamera, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE, engine, false, null, BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
        this._renderPostProcess.alphaMode = BABYLON.Constants.ALPHA_COMBINE;
        this._renderPostProcess.onApplyObservable.add((effect) => {
            this._invProjectionMatrix.copyFrom(this._scene.getProjectionMatrix());
            this._invProjectionMatrix.invert();

            this._invViewMatrix.copyFrom(this._scene.getViewMatrix());
            this._invViewMatrix.invert();

            let texelSize = 1 / targetSize;

            if (!this._blurDepthPostProcesses || this._blurDepthPostProcesses.length === 0) {
                // case where we disabled blurring the depth texture
                effect.setTexture("depthSampler", this._textureDepth);
                texelSize = 1 / this._mapSize;
            } else {
                effect.setTexture("depthSampler", this._textureBlurredDepth);
            }
            if (!this._blurThicknessPostProcesses || this._blurThicknessPostProcesses.length === 0) {
                // case where we disabled blurring the thickness texture
                effect.setTexture("thicknessSampler", this._textureThickness);
            } else {
                effect.setTexture("thicknessSampler", this._textureBlurredThickness);
            }

            effect.setMatrix("invProjection", this._invProjectionMatrix);
            effect.setMatrix("projection", this._scene.getProjectionMatrix());
            effect.setMatrix("invView", this._invViewMatrix);
            effect.setFloat("texelSize", texelSize);
            effect.setTexture("reflectionSampler", this._scene.environmentTexture);

            effect.setVector3("dirLight", this._dirLight);
            effect.setVector3("camPos", this._scene.activeCamera!.globalPosition);
        });

        this._renderPostProcess.onSizeChangedObservable.add(() => {
            this._renderPostProcess.inputTexture.createDepthStencilTexture(0, false, engine.isStencilEnable, 1);
            this._renderPostProcess.inputTexture._shareDepth(this._rtThickness);
        });

        this._renderPostProcess.onActivateObservable.add((effect) => {
            this._engine.clear(this._scene.clearColor, true, true, true);
        });

        this._passPostProcess = new BABYLON.PassPostProcess("pass", 1, this._scene.activeCamera);
        this._passPostProcess.autoClear = false;
        this._passPostProcess.shareOutputWith(this._renderPostProcess);
    }

    private _render(): void {
        const depthDrawWrapper = this._depthEffectWrapper._drawWrapper;
        const thicknessDrawWrapper = this._thicknessEffectWrapper._drawWrapper;

        const depthEffect = depthDrawWrapper.effect!;
        const thicknessEffect = thicknessDrawWrapper.effect!;

        if (!depthEffect.isReady() || !thicknessEffect.isReady() || !this._ps.isReady()) {
            return;
        }

        const currentRenderTarget = this._engine._currentRenderTarget;

        // Render the particles in the depth texture
        this._engine.bindFramebuffer(this._rtDepth);

        this._engine.clear(this._depthClearColor, true, true, false);

        this._engine.enableEffect(depthDrawWrapper);
        this._engine.bindBuffers(this._vertexBuffers, this._indexBuffer, depthEffect);

        depthEffect.setMatrix("view", this._scene.getViewMatrix());
        depthEffect.setMatrix("projection", this._scene.getProjectionMatrix());

        if (this._useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, this._ps.getActiveCount());
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, this._ps.getActiveCount());
        }

        this._engine.unBindFramebuffer(this._rtDepth);

        // Render the particles in the thickness texture
        this._engine.bindFramebuffer(this._rtThickness);

        this._engine.clear(this._thicknessClearColor, true, false, false);

        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_ADD);
        this._engine.depthCullingState.depthMask = false;

        this._engine.enableEffect(thicknessDrawWrapper);
        this._engine.bindBuffers(this._vertexBuffers, this._indexBuffer, thicknessEffect);

        thicknessEffect.setMatrix("view", this._scene.getViewMatrix());
        thicknessEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        thicknessEffect.setFloat("particleAlpha", this._particleAlpha);

        if (this._useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, this._ps.getActiveCount());
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, this._ps.getActiveCount());
        }

        this._engine.depthCullingState.depthMask = true;
        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_DISABLE);

        this._engine.unBindFramebuffer(this._rtThickness);
        this._engine.unbindInstanceAttributes();

        // Render the blur post processes
        if (this._blurDepthPostProcesses && this._blurDepthPostProcesses.length > 0) {
            this._scene.postProcessManager.directRender(this._blurDepthPostProcesses, this._rtDepthBlur, true);
            this._engine.unBindFramebuffer(this._rtDepthBlur!);
        }

        if (this._blurThicknessPostProcesses && this._blurThicknessPostProcesses.length > 0) {
            this._scene.postProcessManager.directRender(this._blurThicknessPostProcesses, this._rtThicknessBlur, true);
            this._engine.unBindFramebuffer(this._rtThicknessBlur!);
        }

        if (currentRenderTarget) {
            this._engine.bindFramebuffer(currentRenderTarget);
        }
    }

    public dispose(): void {
        if (this.onDisposeObservable.hasObservers()) {
            this.onDisposeObservable.notifyObservers(this);
        }

        this._depthEffectWrapper.dispose();
        this._rtDepth.dispose();
        this._rtDepthBlur?.dispose();
        this._rtDepthBlur = null;
        if (this._blurDepthPostProcesses) {
            this._blurDepthPostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurDepthPostProcesses = [];

        this._thicknessEffectWrapper.dispose();
        this._rtThickness.dispose();
        this._rtThicknessBlur?.dispose();
        this._rtThicknessBlur = null;
        if (this._blurThicknessPostProcesses) {
            this._blurThicknessPostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurThicknessPostProcesses = [];

        this._renderPostProcess.dispose();
        this._passPostProcess.dispose();
    }
}

const particleDepthVertexShader = `
    attribute vec3 position;
    attribute vec2 size;
    attribute vec2 offset;

    uniform mat4 view;
    uniform mat4 projection;

    varying vec2 uv;
    varying vec3 viewPos;
    varying float sphereRadius;

    void main(void) {
        vec3 cornerPos;
        cornerPos.xy = vec2(offset.x - 0.5, offset.y - 0.5) * size;
        cornerPos.z = 0.0;

        viewPos = (view * vec4(position, 1.0)).xyz + cornerPos;

        gl_Position = projection * vec4(viewPos, 1.0);

        uv = offset;
        viewPos -= cornerPos;
        sphereRadius = size.x / 2.0;
    }
`;

const particleDepthFragmentShader = `
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

        float depth = clipSpacePos.z / clipSpacePos.w;
        depth = clamp(realViewPos.z / ##CAMERAFAR##, 0., 1.);

        gl_FragDepth = depth;

        glFragColor = vec4(vec3(depth), 1.);
    }
`;

const particleThicknessVertexShader = `
    attribute vec3 position;
    attribute vec2 size;
    attribute vec2 offset;

    uniform mat4 view;
    uniform mat4 projection;

    varying vec2 uv;

    void main(void) {
        vec3 cornerPos;
        cornerPos.xy = vec2(offset.x - 0.5, offset.y - 0.5) * size;
        cornerPos.z = 0.0;

        vec3 viewPos = (view * vec4(position, 1.0)).xyz + cornerPos;

        gl_Position = projection * vec4(viewPos, 1.0);

        uv = offset;
    }
`;

const particleThicknessFragmentShader = `
    uniform float particleAlpha;

    varying vec2 uv;

    void main(void) {
        vec3 normal;

        normal.xy = uv * 2.0 - 1.0;
        float r2 = dot(normal.xy, normal.xy);
        if (r2 > 1.0) discard;
        normal.z = -sqrt(1.0 - r2);

        glFragColor = vec4(1., 1., 1., particleAlpha * (1.0 - r2));
    }
`;

BABYLON.Effect.ShadersStore["bilateralBlurFragmentShader"] = `
    uniform sampler2D textureSampler;

    uniform float filterRadius;
    uniform vec2 blurDir;
    uniform float blurScale;
    uniform float blurDepthFalloff;

    varying vec2 vUV;

    void main(void) {
        float depth = texture2D(textureSampler, vUV).x;
        /*if (depth == 0.) {
            glFragColor = vec4(0., 0., 0., 1.);
            return;
        }*/

        float sum = 0.;
        float wsum = 0.;

        for (float x = -filterRadius; x <= filterRadius; x += 1.0) {
            float sampl = texture2D(textureSampler, vUV + x * blurDir).x;
            //float fg = sign(sampl);

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
    `;

BABYLON.Effect.ShadersStore["renderLiquidFragmentShader"] = `
    #define PI 3.14159265
    #define FOUR_PI 4.0 * PI
    #define GAMMA 2.2
    #define INV_GAMMA (1.0/GAMMA)

    // Index of refraction for water
    #define IOR 1.333

    // Ratios of air and water IOR for refraction
    // Air to water
    #define ETA 1.0/IOR
    // Water to air
    #define ETA_REVERSE IOR

    uniform sampler2D depthSampler;
    uniform sampler2D thicknessSampler;
    uniform samplerCube reflectionSampler;

    uniform mat4 projection;
    uniform mat4 invProjection;
    uniform mat4 invView;
    uniform float texelSize;
    uniform vec3 dirLight;
    uniform vec3 camPos;

    varying vec2 vUV;

    const vec3 sunLightColour = vec3(2.0);

    vec3 waterColour = 0.85 * vec3(0.1, 0.75, 0.9);

    // Amount of the background visible through the water
    const float CLARITY = 0.75;

    // Modifiers for light attenuation
    const float DENSITY = 3.5;

    vec3 uvToEye(vec2 texCoord, float depth) {
        vec4 ndc;
        
        depth = depth * ##CAMERAFAR##;

        ndc.xy = texCoord * 2.0 - 1.0;
        ndc.z = projection[2].z - projection[2].w/depth;
        //ndc.z = depth * 2.0 - 1.0;
        ndc.w = 1.0;

        vec4 eyePos = invProjection * ndc;
        eyePos.xyz /= eyePos.w;

        return eyePos.xyz;
    }

    vec3 getEyePos(vec2 texCoord) {
        float depth = texture2D(depthSampler, texCoord).x;
        return uvToEye(texCoord, depth);
    }

    // Minimum dot product value
    const float minDot = 1e-3;

    // Clamped dot product
    float dot_c(vec3 a, vec3 b) {
        return max(dot(a, b), minDot);
    }
    vec3 gamma(vec3 col) {
        return pow(col, vec3(INV_GAMMA));
    }
    vec3 inv_gamma(vec3 col) {
        return pow(col, vec3(GAMMA));
    }

    // Trowbridge-Reitz
    float distribution(vec3 n, vec3 h, float roughness){
        float a_2 = roughness*roughness;
        return a_2/(PI*pow(pow(dot_c(n, h),2.0) * (a_2 - 1.0) + 1.0, 2.0));
    }

    // GGX and Schlick-Beckmann
    float geometry(float cosTheta, float k){
        return (cosTheta)/(cosTheta*(1.0-k)+k);
    }

    float smiths(vec3 n, vec3 viewDir, vec3 lightDir, float roughness){
        float k = pow(roughness + 1.0, 2.0)/8.0; 
        return geometry(dot_c(n, lightDir), k) * geometry(dot_c(n, viewDir), k);
    }

    // Fresnel-Schlick
    vec3 fresnel(float cosTheta, vec3 F0){
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    } 

    // Specular part of Cook-Torrance BRDF
    vec3 BRDF(vec3 p, vec3 n, vec3 viewDir, vec3 lightDir, vec3 F0, float roughness){
        vec3 h = normalize(viewDir + lightDir);
        float cosTheta = dot_c(h, viewDir);
        float D = distribution(n, h, roughness);
        vec3 F = fresnel(cosTheta, F0);
        float G = smiths(n, viewDir, lightDir, roughness);
        
        vec3 specular =  D * F * G / max(0.0001, (4.0 * dot_c(lightDir, n) * dot_c(viewDir, n)));
        
        return specular;
    }

    vec3 getSkyColour(vec3 rayDir){
        //return 0.5*(0.5+0.5*rayDir);
        return inv_gamma(textureCube(reflectionSampler, rayDir).rgb);
    }

    vec3 getEnvironment(vec3 rayDir, vec3 geoNormalFar, float thickness, out vec3 transmittance){
        vec3 refractedDir = normalize(refract(rayDir, geoNormalFar, ETA_REVERSE));
        vec3 transmitted = getSkyColour(refractedDir);
        
        // View depth
        float d = DENSITY*thickness;
        
        // Beer's law depending on the water colour
        transmittance = exp( -d * (1.0 - waterColour));
        
        vec3 result = transmitted * transmittance;
        return result;
    }

    float HenyeyGreenstein(float g, float costh){
	    return (1.0/(FOUR_PI))  * ((1.0 - g * g) / pow(1.0 + g*g - 2.0*g*costh, 1.5));
    }

    vec3 shadingPBR(vec3 cameraPos, vec3 p, vec3 n, vec3 rayDir, float thickness){
        vec3 I = vec3(0);

        vec3 F0 = vec3(0.02);
        float roughness = 0.1;

        vec3 lightDir = -dirLight;
        I +=  BRDF(p, n, -rayDir, lightDir, F0, roughness) 
            * sunLightColour 
            * dot_c(n, lightDir);

        vec3 transmittance;
        
        vec3 result = vec3(0);
        
        result += CLARITY * getEnvironment(refract(rayDir, n, ETA), 
                                    -n,
                                    thickness,
                                    transmittance);
    
        float mu = dot(refract(rayDir, n, ETA), lightDir);
        //float phase = mix(HenyeyGreenstein(-0.3, mu), HenyeyGreenstein(0.85, mu), 0.5);
        float phase = HenyeyGreenstein(-0.83, mu);
        
        result += CLARITY * sunLightColour * transmittance * phase;
        
        // Reflection of the environment.
        vec3 reflectedDir = normalize(reflect(rayDir, n));
        vec3 reflectedCol = getSkyColour(reflectedDir);
        
        float cosTheta = dot_c(n, -rayDir);
        vec3 F = fresnel(cosTheta, F0);
        
        result = mix(result, reflectedCol, F);
        
        return result + I;
    }

    vec3 ACESFilm(vec3 x){
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
    }

    void main(void) {
        vec2 texCoord = vUV;

        float depth = texture2D(depthSampler, texCoord).x;

        // calculate eye-space position from depth
        vec3 posEye = uvToEye(texCoord, depth);

        // calculate differences
        vec3 ddx = getEyePos(texCoord + vec2(texelSize, 0.)) - posEye;
        vec3 ddx2 = posEye - getEyePos(texCoord + vec2(-texelSize, 0.));
        if (abs(ddx.z) > abs(ddx2.z)) {
            ddx = ddx2;
        }

        vec3 ddy = getEyePos(texCoord + vec2(0., texelSize)) - posEye;
        vec3 ddy2 = posEye - getEyePos(texCoord + vec2(0., -texelSize));
        if (abs(ddy2.z) < abs(ddy.z)) {
            ddy = ddy2;
        }

        // calculate normal
        vec3 normal = cross(ddy, ddx);
        normal = normalize((invView * vec4(normal, 0.)).xyz);

        // shading
        float thickness = clamp(texture2D(thicknessSampler, texCoord).x, 0., 1.);
        vec3 posWorld = (invView * vec4(posEye, 1.)).xyz;
        vec3 rayDir = normalize(posWorld - camPos);

        /*if (depth == 0.) {
            vec3 col = getSkyColour(rayDir);
            glFragColor = vec4(texCoord, 0., 1.);
            return;
        }*/

        vec3 col = shadingPBR(camPos, posWorld, normal, rayDir, thickness);

        //Tonemapping.
        col = ACESFilm(col);

        //Gamma correction 1.0/2.2 = 0.4545...
        col = pow(col, vec3(0.4545));

        //Output to screen.
        //glFragColor = vec4(normal*0.5+0.5, 1./*thickness*/);
        glFragColor = vec4(col, thickness);
        
        //glFragColor = vec4(clamp(abs(posEye), 0., 1.), 1.);
        //glFragColor = vec4(depth, 0., 0., 1.);
        //glFragColor = vec4(n * 0.5 + 0.5, 1.);
    }
    `;
