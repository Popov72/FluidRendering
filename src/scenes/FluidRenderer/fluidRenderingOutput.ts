import * as BABYLON from "@babylonjs/core";
import { FluidRenderingObject } from "./fluidRenderingObject";

export class FluidRenderingOutput {

    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;

    protected _textureTypeFloat: number;
    protected _textureTypeHalfFloat: number;

    protected _depthEffectWrapper: BABYLON.EffectWrapper;
    protected _rtDepth: BABYLON.RenderTargetWrapper;
    protected _textureDepth: BABYLON.ThinTexture;
    protected _rtDepthBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _textureBlurredDepth: BABYLON.ThinTexture;
    protected _blurDepthPostProcesses: BABYLON.PostProcess[];

    protected _rtDiffuse: BABYLON.RenderTargetWrapper;
    protected _textureDiffuse: BABYLON.ThinTexture;
    protected _rtDiffuseBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _textureBlurredDiffuse: BABYLON.ThinTexture;
    protected _blurDiffusePostProcesses: BABYLON.PostProcess[];

    protected _thicknessEffectWrapper: BABYLON.EffectWrapper;
    protected _rtThickness: BABYLON.RenderTargetWrapper;
    protected _textureThickness: BABYLON.ThinTexture;
    protected _rtThicknessBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    protected _textureBlurredThickness: BABYLON.ThinTexture;
    protected _blurThicknessPostProcesses: BABYLON.PostProcess[];

    protected _renderPostProcess: BABYLON.PostProcess;
    protected _passPostProcess: BABYLON.PostProcess;

    protected _invProjectionMatrix: BABYLON.Matrix;
    protected _invViewMatrix: BABYLON.Matrix;
    protected _depthClearColor: BABYLON.Color4;
    protected _thicknessClearColor: BABYLON.Color4;

    public diffuseColor: BABYLON.Color3 = new BABYLON.Color3(1, 1, 1);

    public particleSize: number | BABYLON.VertexBuffer = 0.75;

    public particleThicknessAlpha: number = 0.075;

    public generateDiffuseTexture: boolean = false;

    public dirLight: BABYLON.Vector3 = new BABYLON.Vector3(-2, -1, 1).normalize();

    public debug = true;

    public enableBlur = true;

    public blurScale = 2;

    public blurKernel = 60;

    public onDisposeObservable: BABYLON.Observable<FluidRenderingOutput> = new BABYLON.Observable<FluidRenderingOutput>();

    protected _mapSize = 1024;

    public get mapSize() {
        return this._mapSize;
    }

    public set mapSize(size: number) {
        if (this._mapSize === size) {
            return;
        }

        this._mapSize = size;
    }

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
    
        this._invProjectionMatrix = new BABYLON.Matrix();
        this._invViewMatrix = new BABYLON.Matrix();
        this._depthClearColor = new BABYLON.Color4(1, 0, 0, 1);
        this._thicknessClearColor = new BABYLON.Color4(0, 0, 0, 1);
        this._depthEffectWrapper = null as any;

        this._rtDepth = null as any;
        this._textureDepth = null as any;
        this._rtDepthBlur = null as any;
        this._textureBlurredDepth = null as any;
        this._blurDepthPostProcesses = null as any;

        this._rtDiffuse = null as any;
        this._textureDiffuse = null as any;
        this._rtDiffuseBlur = null as any;
        this._textureBlurredDiffuse = null as any;
        this._blurDiffusePostProcesses = null as any;

        this._thicknessEffectWrapper = null as any;
        this._rtThickness = null as any;
        this._textureThickness = null as any;
        this._rtThicknessBlur = null as any;
        this._textureBlurredThickness = null as any;
        this._blurThicknessPostProcesses = null as any;

        this._renderPostProcess = null as any;
        this._passPostProcess = null as any;

        this._textureTypeFloat = BABYLON.Constants.TEXTURETYPE_FLOAT;
        this._textureTypeHalfFloat = BABYLON.Constants.TEXTURETYPE_HALF_FLOAT;
    }

    public initialize(): void {
        this.dispose();

        this._initializeDepthStep();
        if (this.generateDiffuseTexture) {
            this._initializeDiffuseStep();
        }
        this._initializeThicknessStep();

        if (this.enableBlur) {
            const [rtDepthBlur, textureBlurredDepth, blurDepthPostProcesses] = this._initializeBlurStep(this._textureDepth, this._textureTypeFloat, this.blurScale, "Depth");
            this._rtDepthBlur = rtDepthBlur;
            this._textureBlurredDepth = textureBlurredDepth;
            this._blurDepthPostProcesses = blurDepthPostProcesses;

            if (this.generateDiffuseTexture) {
                const [rtDiffuseBlur, textureBlurredDiffuse, blurDiffusePostProcesses] = this._initializeBlurStep(this._textureDiffuse, this._textureTypeHalfFloat, this.blurScale, "Diffuse", true, true);
                this._rtDiffuseBlur = rtDiffuseBlur;
                this._textureBlurredDiffuse = textureBlurredDiffuse;
                this._blurDiffusePostProcesses = blurDiffusePostProcesses;
            }

            const [rtThicknessBlur, textureBlurredThickness, blurThicknessPostProcesses] = this._initializeBlurStep(this._textureThickness, this._textureTypeHalfFloat, this.blurScale, "Thickness", true);
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
            useShaderStore: true,
            vertexShader: "fluidParticleDepth",
            fragmentShader: "fluidParticleDepth",
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
            useShaderStore: true,
            vertexShader: "fluidParticleThickness",
            fragmentShader: "fluidParticleThickness",
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

    protected _initializeDiffuseStep(): void {
        // Creates the render target wrapper/texture we will generate the depth data into
        this._rtDiffuse = this._engine.createRenderTargetTexture(this._mapSize, {
            generateMipMaps: false,
            type: this._textureTypeHalfFloat,
            format: BABYLON.Constants.TEXTUREFORMAT_RGBA,
            samplingMode: BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
            generateDepthBuffer: true,
            generateStencilBuffer: false,
            samples: 1,
        });

        const renderTexture = this._rtDiffuse.texture!;

        this._textureDiffuse = new BABYLON.ThinTexture(renderTexture);

        renderTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        renderTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        if (this.debug) {
            const texture = new BABYLON.Texture(null, this._scene);
            texture.name = "rttDiffuse";
            texture._texture = renderTexture;
            texture._texture.incrementReferences();
            this.onDisposeObservable.add(() => {
                texture.dispose();
            });
        }
    }

    protected _initializeBlurStep(textureBlurSource: BABYLON.ThinTexture, textureType: number, blurSizeDivisor: number, debugName: string, useStandardBlur = false, useRGBA = false): [BABYLON.RenderTargetWrapper, BABYLON.ThinTexture, BABYLON.PostProcess[]] {
        const engine = this._scene.getEngine();
        const targetSize = Math.floor(this._mapSize / blurSizeDivisor);

        const rtBlur = this._engine.createRenderTargetTexture(targetSize, {
            generateMipMaps: false,
            type: textureType,
            format: useRGBA ? BABYLON.Constants.TEXTUREFORMAT_RGBA : BABYLON.Constants.TEXTUREFORMAT_R,
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

        const kernelBlurXPostprocess = new BABYLON.PostProcess("BilateralBlurX", useStandardBlur ? "standardBlur" : "bilateralBlur", ["filterRadius", "blurScale", "blurDir", "blurDepthFalloff"],
            null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            engine, false, null, textureType, undefined, undefined, undefined, useRGBA ? BABYLON.Constants.TEXTUREFORMAT_RGBA : BABYLON.Constants.TEXTUREFORMAT_R);
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

        const kernelBlurYPostprocess = new BABYLON.PostProcess("BilateralBlurY", useStandardBlur ? "standardBlur" : "bilateralBlur", ["filterRadius", "blurScale", "blurDir", "blurDepthFalloff"],
            null, 1, null, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            engine, false, null, textureType, undefined, undefined, undefined, useRGBA ? BABYLON.Constants.TEXTUREFORMAT_RGBA : BABYLON.Constants.TEXTUREFORMAT_R);
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

        this._renderPostProcess = new BABYLON.PostProcess("render", "renderFluid", ["projection", "invProjection", "invView", "texelSize", "dirLight", "camPos"],
            ["depthSampler", "diffuseSampler", "thicknessSampler", "reflectionSampler"], 1, this._scene.activeCamera, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE, engine, false, null, BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
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
            if (this.generateDiffuseTexture) {
                if (!this._blurDiffusePostProcesses || this._blurDiffusePostProcesses.length === 0) {
                    // case where we disabled blurring the diffuse texture
                    effect.setTexture("diffuseSampler", this._textureDiffuse);
                } else {
                    effect.setTexture("diffuseSampler", this._textureBlurredDiffuse);
                }
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

            effect.setVector3("dirLight", this.dirLight);
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

    public render(fluidObject: FluidRenderingObject): void {
        const depthDrawWrapper = this._depthEffectWrapper._drawWrapper;
        const thicknessDrawWrapper = this._thicknessEffectWrapper._drawWrapper;

        const depthEffect = depthDrawWrapper.effect!;
        const thicknessEffect = thicknessDrawWrapper.effect!;

        if (!depthEffect.isReady() || !thicknessEffect.isReady() || !fluidObject.isReady()) {
            return;
        }

        const currentRenderTarget = this._engine._currentRenderTarget;

        // Render the particles in the depth texture
        this._engine.bindFramebuffer(this._rtDepth);

        this._engine.clear(this._depthClearColor, true, true, false);

        this._engine.enableEffect(depthDrawWrapper);
        this._engine.bindBuffers(fluidObject.vertexBuffers, fluidObject.indexBuffer, depthEffect);

        depthEffect.setMatrix("view", this._scene.getViewMatrix());
        depthEffect.setMatrix("projection", this._scene.getProjectionMatrix());

        const numParticles = fluidObject.numParticles();

        if (fluidObject.useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, numParticles);
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, numParticles);
        }

        this._engine.unBindFramebuffer(this._rtDepth);

        // Render the particles in the diffuse texture
        if (this.generateDiffuseTexture && fluidObject.generateDiffuseTexture) {
            this._engine.bindFramebuffer(this._rtDiffuse);

            this._engine.clear(this._thicknessClearColor, true, true, false);

            fluidObject.renderDiffuseTexture();

            this._engine.unBindFramebuffer(this._rtDiffuse);
        }

        // Render the particles in the thickness texture
        this._engine.bindFramebuffer(this._rtThickness);

        this._engine.clear(this._thicknessClearColor, true, false, false);

        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_ADD);
        this._engine.depthCullingState.depthMask = false;

        this._engine.enableEffect(thicknessDrawWrapper);
        this._engine.bindBuffers(fluidObject.vertexBuffers, fluidObject.indexBuffer, thicknessEffect);

        thicknessEffect.setMatrix("view", this._scene.getViewMatrix());
        thicknessEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        thicknessEffect.setFloat("particleAlpha", this.particleThicknessAlpha);

        if (fluidObject.useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, numParticles);
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, numParticles);
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

        if (this.generateDiffuseTexture && this._blurDiffusePostProcesses && this._blurDiffusePostProcesses.length > 0) {
            this._scene.postProcessManager.directRender(this._blurDiffusePostProcesses, this._rtDiffuseBlur, true);
            this._engine.unBindFramebuffer(this._rtDiffuseBlur!);
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

        this._depthEffectWrapper?.dispose();
        this._rtDepth?.dispose();
        this._rtDepthBlur?.dispose();
        this._rtDepthBlur = null;
        if (this._blurDepthPostProcesses) {
            this._blurDepthPostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurDepthPostProcesses = [];

        this._rtDiffuse?.dispose();
        this._rtDiffuseBlur?.dispose();
        this._rtDiffuseBlur = null;
        if (this._blurDiffusePostProcesses) {
            this._blurDiffusePostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurDiffusePostProcesses = [];

        this._thicknessEffectWrapper?.dispose();
        this._rtThickness?.dispose();
        this._rtThicknessBlur?.dispose();
        this._rtThicknessBlur = null;
        if (this._blurThicknessPostProcesses) {
            this._blurThicknessPostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurThicknessPostProcesses = [];

        this._renderPostProcess?.dispose();
        this._passPostProcess?.dispose();
    }

}