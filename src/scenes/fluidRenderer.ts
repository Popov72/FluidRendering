import * as BABYLON from "@babylonjs/core";

import particleDepthVertex from "../assets/particleDepth.vertex.glsl";
import particleDepthFragment from "../assets/particleDepth.fragment.glsl";

import particleThicknessVertex from "../assets/particleThickness.vertex.glsl";
import particleThicknessFragment from "../assets/particleThickness.fragment.glsl";

import bilaterialBlurFragment from "../assets/bilateralBlur.fragment.glsl";
import standardBlurFragment from "../assets/standardBlur.fragment.glsl";

import renderFluidFragment from "../assets/renderFluid.fragment.glsl";

export class FluidRenderer {
    private _scene: BABYLON.Scene;
    private _engine: BABYLON.Engine;
    private _ps: BABYLON.ParticleSystem;
    private _psRender: () => number;
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

    private _rtDiffuse: BABYLON.RenderTargetWrapper;
    private _textureDiffuse: BABYLON.ThinTexture;
    private _rtDiffuseBlur: BABYLON.Nullable<BABYLON.RenderTargetWrapper>;
    private _textureBlurredDiffuse: BABYLON.ThinTexture;
    private _blurDiffusePostProcesses: BABYLON.PostProcess[];

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

        BABYLON.Effect.ShadersStore["renderFluidFragmentShader"] = BABYLON.Effect.ShadersStore["renderFluidFragmentShader"].replace("##CAMERAFAR##", this._scene.activeCamera!.maxZ + ".");

        this._psRender = ps.render.bind(ps);

        ps.render = () => 0;
        ps.blendMode = -1;

        ps.onBeforeDrawParticlesObservable.add(() => {
            this._engine.setAlphaMode(BABYLON.Constants.ALPHA_COMBINE);
        });

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
        this._initializeDiffuseStep();
        this._initializeThicknessStep();
        if (this.enableBlur) {
            const [rtDepthBlur, textureBlurredDepth, blurDepthPostProcesses] = this._initializeBlurStep(this._textureDepth, this._textureTypeFloat, this.blurScale, "Depth");
            this._rtDepthBlur = rtDepthBlur;
            this._textureBlurredDepth = textureBlurredDepth;
            this._blurDepthPostProcesses = blurDepthPostProcesses;

            const [rtDiffuseBlur, textureBlurredDiffuse, blurDiffusePostProcesses] = this._initializeBlurStep(this._textureDiffuse, this._textureTypeHalfFloat, this.blurScale, "Diffuse", true, true);
            this._rtDiffuseBlur = rtDiffuseBlur;
            this._textureBlurredDiffuse = textureBlurredDiffuse;
            this._blurDiffusePostProcesses = blurDiffusePostProcesses;

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
            useShaderStore: false,
            vertexShader: particleDepthVertex,
            fragmentShader: particleDepthFragment.replace("##CAMERAFAR##", this._scene.activeCamera!.maxZ + "."),
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
            vertexShader: particleThicknessVertex,
            fragmentShader: particleThicknessFragment,
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
            if (!this._blurDiffusePostProcesses || this._blurDiffusePostProcesses.length === 0) {
                // case where we disabled blurring the diffuse texture
                effect.setTexture("diffuseSampler", this._textureDiffuse);
            } else {
                effect.setTexture("diffuseSampler", this._textureBlurredDiffuse);
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

        // Render the particles in the diffuse texture
        this._engine.bindFramebuffer(this._rtDiffuse);

        this._engine.clear(this._thicknessClearColor, true, true, false);

        this._psRender();

        this._engine.unBindFramebuffer(this._rtDiffuse);

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

        if (this._blurDiffusePostProcesses && this._blurDiffusePostProcesses.length > 0) {
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

        this._depthEffectWrapper.dispose();
        this._rtDepth.dispose();
        this._rtDepthBlur?.dispose();
        this._rtDepthBlur = null;
        if (this._blurDepthPostProcesses) {
            this._blurDepthPostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurDepthPostProcesses = [];

        this._rtDiffuse.dispose();
        this._rtDiffuseBlur?.dispose();
        this._rtDiffuseBlur = null;
        if (this._blurDiffusePostProcesses) {
            this._blurDiffusePostProcesses.forEach((pp) => pp.dispose());
        }
        this._blurDiffusePostProcesses = [];

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

BABYLON.Effect.ShadersStore["bilateralBlurFragmentShader"] = bilaterialBlurFragment;

BABYLON.Effect.ShadersStore["standardBlurFragmentShader"] = standardBlurFragment;

BABYLON.Effect.ShadersStore["renderFluidFragmentShader"] = renderFluidFragment;
