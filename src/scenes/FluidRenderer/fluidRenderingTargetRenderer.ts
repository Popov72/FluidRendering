import * as BABYLON from "@babylonjs/core";

import { FluidRenderingObject } from "./fluidRenderingObject";
import { FluidRenderingRenderTarget } from "./fluidRenderingRenderTarget";

export enum FluidRenderingDebug {
    DepthTexture,
    DepthBlurredTexture,
    ThicknessTexture,
    ThicknessBlurredTexture,
    DiffuseTexture,
    Normals,
    DiffuseRendering,
}

export class FluidRenderingTargetRenderer {

    protected _scene: BABYLON.Scene;
    protected _camera: BABYLON.Nullable<BABYLON.Camera>;
    protected _engine: BABYLON.Engine;

    protected _depthRenderTarget: BABYLON.Nullable<FluidRenderingRenderTarget>;
    protected _diffuseRenderTarget: BABYLON.Nullable<FluidRenderingRenderTarget>;
    protected _thicknessRenderTarget: BABYLON.Nullable<FluidRenderingRenderTarget>;

    protected _renderPostProcess: BABYLON.Nullable<BABYLON.PostProcess>;

    protected _invProjectionMatrix: BABYLON.Matrix;
    protected _depthClearColor: BABYLON.Color4;
    protected _thicknessClearColor: BABYLON.Color4;

    protected _needInitialization: boolean;

    public get needInitialization() {
        return this._needInitialization;
    }

    private _generateDiffuseTexture = false;

    public get generateDiffuseTexture() {
        return this._generateDiffuseTexture;
    }

    public set generateDiffuseTexture(generate: boolean) {
        if (this._generateDiffuseTexture === generate) {
            return;
        }

        this._generateDiffuseTexture = generate;
        this._needInitialization = true;
    }

    public fluidColor = new BABYLON.Color3(0.085, 0.6375, 0.765);

    public density = 2;

    public refractionStrength = 0.1;

    public fresnelClamp = 1.0;

    public specularPower = 250;

    public dirLight: BABYLON.Vector3 = new BABYLON.Vector3(-2, -1, 1).normalize();

    private _debugFeature: FluidRenderingDebug = FluidRenderingDebug.DepthBlurredTexture;

    public get debugFeature() {
        return this._debugFeature;
    }

    public set debugFeature(feature: FluidRenderingDebug) {
        if (this._debugFeature === feature) {
            return;
        }

        this._needInitialization = true;
        this._debugFeature = feature;
    }

    private _debug = false;

    public get debug() {
        return this._debug;
    }

    public set debug(debug: boolean) {
        if (this._debug === debug) {
            return;
        }

        this._debug = debug;
        this._needInitialization = true;
    }

    private _enableBlurDepth = true;

    public get enableBlurDepth() {
        return this._enableBlurDepth;
    }

    public set enableBlurDepth(enable: boolean) {
        if (this._enableBlurDepth === enable) {
            return;
        }

        this._enableBlurDepth = enable;
        this._needInitialization = true;
    }

    private _blurDepthSizeDivisor = 1;

    public get blurDepthSizeDivisor() {
        return this._blurDepthSizeDivisor;
    }

    public set blurDepthSizeDivisor(scale: number) {
        if (this._blurDepthSizeDivisor === scale) {
            return;
        }

        this._blurDepthSizeDivisor = scale;
        this._needInitialization = true;
    }

    private _blurDepthFilterSize = 7;

    public get blurDepthFilterSize() {
        return this._blurDepthFilterSize;
    }

    public set blurDepthFilterSize(filterSize: number) {
        if (this._blurDepthFilterSize === filterSize) {
            return;
        }

        this._blurDepthFilterSize = filterSize;
        this._setBlurParameters();
    }

    private _blurDepthNumIterations = 3;

    public get blurDepthNumIterations() {
        return this._blurDepthNumIterations;
    }

    public set blurDepthNumIterations(numIterations: number) {
        if (this._blurDepthNumIterations === numIterations) {
            return;
        }

        this._blurDepthNumIterations = numIterations;
        this._setBlurParameters();
    }

    private _blurDepthMaxFilterSize = 100;

    public get blurDepthMaxFilterSize() {
        return this._blurDepthMaxFilterSize;
    }

    public set blurDepthMaxFilterSize(maxFilterSize: number) {
        if (this._blurDepthMaxFilterSize === maxFilterSize) {
            return;
        }

        this._blurDepthMaxFilterSize = maxFilterSize;
        this._setBlurParameters();
    }

    private _blurDepthDepthScale = 10;

    public get blurDepthDepthScale() {
        return this._blurDepthDepthScale;
    }

    public set blurDepthDepthScale(scale: number) {
        if (this._blurDepthDepthScale === scale) {
            return;
        }

        this._blurDepthDepthScale = scale;
        this._setBlurParameters();
    }

    private _enableBlurThickness = true;

    public get enableBlurThickness() {
        return this._enableBlurThickness;
    }

    public set enableBlurThickness(enable: boolean) {
        if (this._enableBlurThickness === enable) {
            return;
        }

        this._enableBlurThickness = enable;
        this._needInitialization = true;
    }

    private _blurThicknessSizeDivisor = 1;

    public get blurThicknessSizeDivisor() {
        return this._blurThicknessSizeDivisor;
    }

    public set blurThicknessSizeDivisor(scale: number) {
        if (this._blurThicknessSizeDivisor === scale) {
            return;
        }

        this._blurThicknessSizeDivisor = scale;
        this._needInitialization = true;
    }

    private _blurThicknessFilterSize = 5;

    public get blurThicknessFilterSize() {
        return this._blurThicknessFilterSize;
    }

    public set blurThicknessFilterSize(filterSize: number) {
        if (this._blurThicknessFilterSize === filterSize) {
            return;
        }

        this._blurThicknessFilterSize = filterSize;
        this._setBlurParameters();
    }

    private _blurThicknessNumIterations = 1;

    public get blurThicknessNumIterations() {
        return this._blurThicknessNumIterations;
    }

    public set blurThicknessNumIterations(numIterations: number) {
        if (this._blurThicknessNumIterations === numIterations) {
            return;
        }

        this._blurThicknessNumIterations = numIterations;
        this._setBlurParameters();
    }

    public onUseVelocityChanged = new BABYLON.Observable<FluidRenderingTargetRenderer>();

    private _useVelocity = false;

    public get useVelocity() {
        return this._useVelocity;
    }

    public set useVelocity(use: boolean) {
        if (this._useVelocity === use) {
            return;
        }

        this._useVelocity = use;
        this._needInitialization = true;
        this.onUseVelocityChanged.notifyObservers(this);
    }

    private _depthMapSize: BABYLON.Nullable<number> = null;

    public get depthMapSize() {
        return this._depthMapSize;
    }

    public set depthMapSize(size: BABYLON.Nullable<number>) {
        if (this._depthMapSize === size) {
            return;
        }

        this._depthMapSize = size;
        this._needInitialization = true;
    }

    private _thicknessMapSize: BABYLON.Nullable<number> = null;

    public get thicknessMapSize() {
        return this._thicknessMapSize;
    }

    public set thicknessMapSize(size: BABYLON.Nullable<number>) {
        if (this._thicknessMapSize === size) {
            return;
        }

        this._thicknessMapSize = size;
        this._needInitialization = true;
    }

    private _diffuseMapSize: BABYLON.Nullable<number> = null;

    public get diffuseMapSize() {
        return this._diffuseMapSize;
    }

    public set diffuseMapSize(size: BABYLON.Nullable<number>) {
        if (this._diffuseMapSize === size) {
            return;
        }

        this._diffuseMapSize = size;
        this._needInitialization = true;
    }

    // Note: changing this value does not work because depth/stencil textures can't be created with MSAA yet (see https://github.com/BabylonJS/Babylon.js/issues/12444)
    private _samples = 1;

    public get samples() {
        return this._samples;
    }

    public set samples(samples: number) {
        if (this._samples === samples) {
            return;
        }

        this._samples = samples;
        this._needInitialization = true;
    }

    public get camera() {
        return this._camera;
    }

    /** @hidden */
    public get renderPostProcess() {
        return this._renderPostProcess;
    }

    /** @hidden */
    public get depthRenderTarget() {
        return this._depthRenderTarget;
    }

    /** @hidden */
    public get thicknessRenderTarget() {
        return this._thicknessRenderTarget;
    }

    /** @hidden */
    public get diffuseRenderTarget() {
        return this._diffuseRenderTarget;
    }

    constructor(scene: BABYLON.Scene, camera?: BABYLON.Camera) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._camera = camera ?? scene.activeCamera;
        this._needInitialization = true;
    
        this._invProjectionMatrix = new BABYLON.Matrix();
        this._depthClearColor = new BABYLON.Color4(1e6, 1e6, 1e6, 1);
        this._thicknessClearColor = new BABYLON.Color4(0, 0, 0, 1);

        this._depthRenderTarget = null;
        this._diffuseRenderTarget = null;
        this._thicknessRenderTarget = null;

        this._renderPostProcess = null;
    }

    public initialize(): void {
        this.dispose();

        this._needInitialization = false;

        const depthWidth = this._depthMapSize ?? this._engine.getRenderWidth();
        const depthHeight = this._depthMapSize !== null ? Math.round(this._depthMapSize * this._engine.getRenderHeight() / this._engine.getRenderWidth()) : this._engine.getRenderHeight();
        
        this._depthRenderTarget = new FluidRenderingRenderTarget("Depth", this._scene, depthWidth, depthHeight, depthWidth, depthHeight,
            BABYLON.Constants.TEXTURETYPE_FLOAT, BABYLON.Constants.TEXTUREFORMAT_RG,
            BABYLON.Constants.TEXTURETYPE_FLOAT, BABYLON.Constants.TEXTUREFORMAT_RG, false, this._camera, true, this._samples);

        this._initializeRenderTarget(this._depthRenderTarget);

        if (this.generateDiffuseTexture) {
            const diffuseWidth = this._diffuseMapSize ?? this._engine.getRenderWidth();
            const diffuseHeight = this._diffuseMapSize !== null ? Math.round(this._diffuseMapSize * this._engine.getRenderHeight() / this._engine.getRenderWidth()) : this._engine.getRenderHeight();

            this._diffuseRenderTarget = new FluidRenderingRenderTarget("Diffuse", this._scene, diffuseWidth, diffuseHeight, 0, 0,
                BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE, BABYLON.Constants.TEXTUREFORMAT_RGBA,
                BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE, BABYLON.Constants.TEXTUREFORMAT_RGBA, true, this._camera, true, this._samples);

            this._initializeRenderTarget(this._diffuseRenderTarget);
        }

        const thicknessWidth = this._thicknessMapSize ?? this._engine.getRenderWidth();
        const thicknessHeight = this._thicknessMapSize !== null ? Math.round(this._thicknessMapSize * this._engine.getRenderHeight() / this._engine.getRenderWidth()) : this._engine.getRenderHeight();

        this._thicknessRenderTarget = new FluidRenderingRenderTarget("Thickness", this._scene, thicknessWidth, thicknessHeight, thicknessWidth, thicknessHeight,
            BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R,
            BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, true, this._camera, false, this._samples);

        this._initializeRenderTarget(this._thicknessRenderTarget);

        this._createLiquidRenderingPostProcess();
    }

    protected _setBlurParameters(renderTarget: BABYLON.Nullable<FluidRenderingRenderTarget> = null): void {
        if (renderTarget === null || renderTarget === this._depthRenderTarget) {
            this._setBlurDepthParameters();
        }
        if (renderTarget === null || renderTarget === this._thicknessRenderTarget) {
            this._setBlurThicknessParameters();
        }
    }

    protected _setBlurDepthParameters(): void {
        if (!this._depthRenderTarget) {
            return;
        }
        this._depthRenderTarget.blurFilterSize = this.blurDepthFilterSize;
        this._depthRenderTarget.blurMaxFilterSize = this.blurDepthMaxFilterSize;
        this._depthRenderTarget.blurNumIterations = this.blurDepthNumIterations;
        this._depthRenderTarget.blurDepthScale = this.blurDepthDepthScale;
    }

    protected _setBlurThicknessParameters(): void {
        if (!this._thicknessRenderTarget) {
            return;
        }
        this._thicknessRenderTarget.blurFilterSize = this.blurThicknessFilterSize;
        this._thicknessRenderTarget.blurNumIterations = this.blurThicknessNumIterations;
    }

    protected _initializeRenderTarget(renderTarget: FluidRenderingRenderTarget): void {
        if (renderTarget !== this._diffuseRenderTarget) {
            renderTarget.enableBlur = renderTarget === this._depthRenderTarget ? this.enableBlurDepth : this.enableBlurThickness;
            renderTarget.blurSizeDivisor = renderTarget === this._depthRenderTarget ? this.blurDepthSizeDivisor : this.blurThicknessSizeDivisor;
        }

        this._setBlurParameters(renderTarget);

        renderTarget.initialize();
    }

    protected _createLiquidRenderingPostProcess(): void {
        const engine = this._scene.getEngine();

        const uniformNames = ["viewMatrix", "projectionMatrix", "invProjectionMatrix", "texelSize", "dirLight", "cameraFar", "density", "refractionStrength", "fresnelClamp", "specularPower"];
        const samplerNames = ["depthSampler", "thicknessSampler", "reflectionSampler"];
        const defines = [];

        this.dispose(true);

        if (!this._camera) {
            return;
        }

        const texture = this._depthRenderTarget!.enableBlur ? this._depthRenderTarget!.textureBlur! : this._depthRenderTarget!.texture!;
        const texelSize = new BABYLON.Vector2(1 / texture.getSize().width, 1 / texture.getSize().height);

        if (this._diffuseRenderTarget) {
            samplerNames.push("diffuseSampler");
            defines.push("#define FLUIDRENDERING_DIFFUSETEXTURE");
        } else {
            uniformNames.push("diffuseColor");
        }

        if (this._useVelocity) {
            samplerNames.push("velocitySampler");
            defines.push("#define FLUIDRENDERING_VELOCITY");
        }

        if (this._debug) {
            defines.push("#define FLUIDRENDERING_DEBUG");
            if (this._debugFeature === FluidRenderingDebug.Normals) {
                defines.push("#define FLUIDRENDERING_DEBUG_SHOWNORMAL");
            } else if (this._debugFeature === FluidRenderingDebug.DiffuseRendering) {
                defines.push("#define FLUIDRENDERING_DEBUG_DIFFUSERENDERING");
            } else {
                defines.push("#define FLUIDRENDERING_DEBUG_TEXTURE");
                samplerNames.push("debugSampler");
                if (this._debugFeature === FluidRenderingDebug.DepthTexture || this._debugFeature === FluidRenderingDebug.DepthBlurredTexture) {
                    defines.push("#define FLUIDRENDERING_DEBUG_DEPTH");
                }
            }
        }

        this._renderPostProcess = new BABYLON.PostProcess("FluidRendering", "renderFluid", uniformNames, samplerNames, 1, null, BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE, engine, false, defines.join("\n"), BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
        this._renderPostProcess.samples = this._samples;
        this._renderPostProcess.onApplyObservable.add((effect) => {
            this._invProjectionMatrix.copyFrom(this._scene.getProjectionMatrix());
            this._invProjectionMatrix.invert();

            if (!this._depthRenderTarget!.enableBlur) {
                effect.setTexture("depthSampler", this._depthRenderTarget!.texture);
            } else {
                effect.setTexture("depthSampler", this._depthRenderTarget!.textureBlur);
            }
            if (this._diffuseRenderTarget) {
                if (!this._diffuseRenderTarget.enableBlur) {
                    effect.setTexture("diffuseSampler", this._diffuseRenderTarget.texture);
                } else {
                    effect.setTexture("diffuseSampler", this._diffuseRenderTarget.textureBlur);
                }
            } else {
                effect.setColor3("diffuseColor", this.fluidColor);
            }
            if (!this._thicknessRenderTarget!.enableBlur) {
                effect.setTexture("thicknessSampler", this._thicknessRenderTarget!.texture);
            } else {
                effect.setTexture("thicknessSampler", this._thicknessRenderTarget!.textureBlur);
            }

            effect.setTexture("reflectionSampler", this._scene.environmentTexture);

            effect.setMatrix("viewMatrix", this._scene.getViewMatrix());
            effect.setMatrix("invProjectionMatrix", this._invProjectionMatrix);
            effect.setMatrix("projectionMatrix", this._scene.getProjectionMatrix());
            effect.setVector2("texelSize", texelSize);
            effect.setFloat("density", this.density);
            effect.setFloat("refractionStrength", this.refractionStrength);
            effect.setFloat("fresnelClamp", this.fresnelClamp);
            effect.setFloat("specularPower", this.specularPower);

            effect.setVector3("dirLight", this.dirLight);

            effect.setFloat("cameraFar", this._camera!.maxZ);

            if (this._debug) {
                let texture: BABYLON.Nullable<BABYLON.ThinTexture> = null;
                switch (this._debugFeature) {
                    case FluidRenderingDebug.DepthTexture:
                        texture = this._depthRenderTarget!.texture;
                        break;
                    case FluidRenderingDebug.DepthBlurredTexture:
                        texture = this._depthRenderTarget!.enableBlur ? this._depthRenderTarget!.textureBlur : this._depthRenderTarget!.texture;
                        break;
                    case FluidRenderingDebug.ThicknessTexture:
                        texture = this._thicknessRenderTarget!.texture;
                        break;
                    case FluidRenderingDebug.ThicknessBlurredTexture:
                        texture = this._thicknessRenderTarget!.enableBlur ? this._thicknessRenderTarget!.textureBlur : this._thicknessRenderTarget!.texture;
                        break;
                    case FluidRenderingDebug.DiffuseTexture:
                        if (this._diffuseRenderTarget) {
                            texture = this._diffuseRenderTarget.texture;
                        }
                        break;
                }
                if (this._debugFeature !== FluidRenderingDebug.Normals) {
                    effect.setTexture("debugSampler", texture);
                }
            }
        });
    }

    public clearTargets(): void {
        if (this._depthRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._depthRenderTarget.renderTarget);
            this._engine.clear(this._depthClearColor, true, true, false);
            this._engine.unBindFramebuffer(this._depthRenderTarget.renderTarget);
        }

        if (this._diffuseRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._diffuseRenderTarget.renderTarget);
            this._engine.clear(this._thicknessClearColor, true, true, false);
            this._engine.unBindFramebuffer(this._diffuseRenderTarget.renderTarget);
        }

        if (this._thicknessRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._thicknessRenderTarget.renderTarget);
            // we don't clear the depth buffer because it is the depth buffer that is coming from the scene and that we reuse in the thickness rendering pass
            this._engine.clear(this._thicknessClearColor, true, false, false);
            this._engine.unBindFramebuffer(this._thicknessRenderTarget.renderTarget);
        }
    }

    public render(fluidObject: FluidRenderingObject): void {
        if (this._needInitialization || !fluidObject.isReady()) {
            return;
        }

        const currentRenderTarget = this._engine._currentRenderTarget;

        this._engine.setState(false, undefined, undefined, undefined, true);
        this._engine.setDepthBuffer(true);
        this._engine.setDepthWrite(true);
        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_DISABLE);

        // Render the particles in the depth texture
        if (this._depthRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._depthRenderTarget.renderTarget);

            fluidObject.renderDepthTexture();

            this._engine.unbindInstanceAttributes();
            this._engine.unBindFramebuffer(this._depthRenderTarget.renderTarget);
        }

        // Render the particles in the diffuse texture
        if (this._diffuseRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._diffuseRenderTarget.renderTarget);

            fluidObject.renderDiffuseTexture();

            this._engine.unbindInstanceAttributes();
            this._engine.unBindFramebuffer(this._diffuseRenderTarget.renderTarget);
        }

        // Render the particles in the thickness texture
        if (this._thicknessRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._thicknessRenderTarget.renderTarget);

            fluidObject.renderThicknessTexture();

            this._engine.unbindInstanceAttributes();
            this._engine.unBindFramebuffer(this._thicknessRenderTarget.renderTarget);
        }

        // Run the blur post processes
        this._depthRenderTarget?.applyBlurPostProcesses();
        this._diffuseRenderTarget?.applyBlurPostProcesses();
        this._thicknessRenderTarget?.applyBlurPostProcesses();

        if (currentRenderTarget) {
            this._engine.bindFramebuffer(currentRenderTarget);
        }
    }

    public dispose(onlyPostProcesses = false): void {
        if (!onlyPostProcesses) {
            this._depthRenderTarget?.dispose();
            this._depthRenderTarget = null;

            this._diffuseRenderTarget?.dispose();
            this._diffuseRenderTarget = null;

            this._thicknessRenderTarget?.dispose();
            this._thicknessRenderTarget = null;
        }

        if (this._renderPostProcess && this._camera) {
            this._camera.detachPostProcess(this._renderPostProcess);
        }
        this._renderPostProcess?.dispose();
        this._renderPostProcess = null;

        this._needInitialization = false;
    }

}
