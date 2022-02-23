import * as BABYLON from "@babylonjs/core";
import { FluidRenderingObject } from "./fluidRenderingObject";
import { FluidRenderingRenderTarget } from "./fluidRenderingRenderTarget";

export class FluidRenderingOutput {

    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;

    protected _depthEffectWrapper: BABYLON.EffectWrapper;
    protected _depthRenderTarget: FluidRenderingRenderTarget;

    protected _diffuseRenderTarget: BABYLON.Nullable<FluidRenderingRenderTarget>;

    protected _thicknessEffectWrapper: BABYLON.EffectWrapper;
    protected _thicknessRenderTarget: FluidRenderingRenderTarget;

    protected _renderPostProcess: BABYLON.PostProcess;
    protected _passPostProcess: BABYLON.PostProcess;

    protected _invProjectionMatrix: BABYLON.Matrix;
    protected _invViewMatrix: BABYLON.Matrix;
    protected _dirLight: BABYLON.Vector3;
    protected _depthClearColor: BABYLON.Color4;
    protected _thicknessClearColor: BABYLON.Color4;

    public generateDiffuseTexture: boolean = false;

    public debug = true;

    public enableBlur = true;

    public blurScale = 2;

    public blurKernel = 60;

    public mapSize = 1024;

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
    
        this._invProjectionMatrix = new BABYLON.Matrix();
        this._invViewMatrix = new BABYLON.Matrix();
        this._dirLight = new BABYLON.Vector3(0, 1, 0);
        this._depthClearColor = new BABYLON.Color4(1, 0, 0, 1);
        this._thicknessClearColor = new BABYLON.Color4(0, 0, 0, 1);

        this._depthEffectWrapper = null as any;
        this._depthRenderTarget = null as any;

        this._diffuseRenderTarget = null as any;

        this._thicknessEffectWrapper = null as any;
        this._thicknessRenderTarget = null as any;

        this._renderPostProcess = null as any;
        this._passPostProcess = null as any;
    }

    public initialize(): void {
        this.dispose();

        this._createEffects();

        this._depthRenderTarget = new FluidRenderingRenderTarget("Depth", this._scene, this.mapSize, this.mapSize, this.mapSize,
            BABYLON.Constants.TEXTURETYPE_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            BABYLON.Constants.TEXTURETYPE_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, false);

        this._initializeRenderTarget(this._depthRenderTarget);

        if (this.generateDiffuseTexture) {
            this._diffuseRenderTarget = new FluidRenderingRenderTarget("Diffuse", this._scene, this.mapSize, this.mapSize, this.mapSize,
                BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_RGBA, BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
                BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_RGBA, true);

            this._initializeRenderTarget(this._diffuseRenderTarget);
        }

        this._thicknessRenderTarget = new FluidRenderingRenderTarget("Thickness", this._scene, this._engine.getRenderWidth(), this._engine.getRenderHeight(), this.mapSize,
            BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE, BABYLON.Constants.TEXTUREFORMAT_R, BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
            BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, true);

        this._initializeRenderTarget(this._thicknessRenderTarget);

        this._createLiquidRenderingPostProcess();
    }

    protected _initializeRenderTarget(renderTarget: FluidRenderingRenderTarget): void {
        renderTarget.debug = this.debug;
        renderTarget.enableBlur = this.enableBlur;
        renderTarget.blurScale = this.blurScale;
        renderTarget.blurKernel = this.blurKernel;

        renderTarget.initialize();
    }

    protected _createEffects(): void {
        this._depthEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: true,
            vertexShader: "fluidParticleDepth",
            fragmentShader: "fluidParticleDepth",
            attributeNames: ["position", "size", "offset"],
            uniformNames: ["view", "projection"],
            samplerNames: [],
        });

        this._thicknessEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: true,
            vertexShader: "fluidParticleThickness",
            fragmentShader: "fluidParticleThickness",
            attributeNames: ["position", "size", "offset"],
            uniformNames: ["view", "projection", "particleAlpha"],
            samplerNames: [],
        });
    }

    protected _createLiquidRenderingPostProcess(): void {
        const engine = this._scene.getEngine();
        const targetSize = Math.floor(this.mapSize / this.blurScale);

        this._renderPostProcess = new BABYLON.PostProcess("render", "renderFluid", ["projection", "invProjection", "invView", "texelSize", "dirLight", "camPos"],
            ["depthSampler", "diffuseSampler", "thicknessSampler", "reflectionSampler"], 1, this._scene.activeCamera, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE, engine, false, null, BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
        this._renderPostProcess.alphaMode = BABYLON.Constants.ALPHA_COMBINE;
        this._renderPostProcess.onApplyObservable.add((effect) => {
            this._invProjectionMatrix.copyFrom(this._scene.getProjectionMatrix());
            this._invProjectionMatrix.invert();

            this._invViewMatrix.copyFrom(this._scene.getViewMatrix());
            this._invViewMatrix.invert();

            let texelSize = 1 / targetSize;

            if (!this._depthRenderTarget.enableBlur) {
                effect.setTexture("depthSampler", this._depthRenderTarget.texture);
                texelSize = 1 / this.mapSize;
            } else {
                effect.setTexture("depthSampler", this._depthRenderTarget.textureBlur);
            }
            if (this._diffuseRenderTarget) {
                if (!this._diffuseRenderTarget.enableBlur) {
                    effect.setTexture("diffuseSampler", this._diffuseRenderTarget.texture);
                } else {
                    effect.setTexture("diffuseSampler", this._diffuseRenderTarget.textureBlur);
                }
            }
            if (!this._thicknessRenderTarget.enableBlur) {
                effect.setTexture("thicknessSampler", this._thicknessRenderTarget.texture);
            } else {
                effect.setTexture("thicknessSampler", this._thicknessRenderTarget.textureBlur);
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
            this._renderPostProcess.inputTexture._shareDepth(this._thicknessRenderTarget.renderTarget);
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

        this._dirLight = fluidObject.dirLight ?? this._dirLight;

        const currentRenderTarget = this._engine._currentRenderTarget;

        // Render the particles in the depth texture
        this._engine.bindFramebuffer(this._depthRenderTarget.renderTarget);

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

        this._engine.unBindFramebuffer(this._depthRenderTarget.renderTarget);

        // Render the particles in the diffuse texture
        if (this._diffuseRenderTarget && fluidObject.generateDiffuseTexture) {
            this._engine.bindFramebuffer(this._diffuseRenderTarget.renderTarget);

            this._engine.clear(this._thicknessClearColor, true, true, false);

            fluidObject.renderDiffuseTexture();

            this._engine.unBindFramebuffer(this._diffuseRenderTarget.renderTarget);
        }

        // Render the particles in the thickness texture
        this._engine.bindFramebuffer(this._thicknessRenderTarget.renderTarget);

        this._engine.clear(this._thicknessClearColor, true, false, false);

        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_ADD);
        this._engine.depthCullingState.depthMask = false;

        this._engine.enableEffect(thicknessDrawWrapper);
        this._engine.bindBuffers(fluidObject.vertexBuffers, fluidObject.indexBuffer, thicknessEffect);

        thicknessEffect.setMatrix("view", this._scene.getViewMatrix());
        thicknessEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        thicknessEffect.setFloat("particleAlpha", fluidObject.particleThicknessAlpha);

        if (fluidObject.useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, numParticles);
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, numParticles);
        }

        this._engine.depthCullingState.depthMask = true;
        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_DISABLE);

        this._engine.unBindFramebuffer(this._thicknessRenderTarget.renderTarget);
        this._engine.unbindInstanceAttributes();

        // Render the blur post processes
        this._depthRenderTarget.applyBlurPostProcesses();
        this._diffuseRenderTarget?.applyBlurPostProcesses();
        this._thicknessRenderTarget.applyBlurPostProcesses();

        if (currentRenderTarget) {
            this._engine.bindFramebuffer(currentRenderTarget);
        }
    }

    public dispose(): void {
        this._depthEffectWrapper?.dispose();
        this._depthRenderTarget?.dispose();
        this._depthRenderTarget = null as any;

        this._diffuseRenderTarget?.dispose();
        this._diffuseRenderTarget = null;

        this._thicknessEffectWrapper?.dispose();
        this._thicknessRenderTarget?.dispose();
        this._thicknessRenderTarget = null as any;

        this._renderPostProcess?.dispose();
        this._passPostProcess?.dispose();
    }

}
