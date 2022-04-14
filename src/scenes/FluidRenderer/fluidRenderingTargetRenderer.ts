import * as BABYLON from "@babylonjs/core";
import { FluidRenderingObject } from "./fluidRenderingObject";
import { FluidRenderingRenderTarget } from "./fluidRenderingRenderTarget";

export enum FluidRenderingDebug {
    DepthTexture,
    DepthBlurredTexture,
    ThicknessTexture,
    ThicknessBlurredTexture,
    DiffuseTexture,
    DiffuseBlurredTexture,
    Normals,
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

    private _diffuseTextureInGammaSpace = true;

    public get diffuseTextureInGammaSpace() {
        return this._diffuseTextureInGammaSpace;
    }

    public set diffuseTextureInGammaSpace(gammeSpace: boolean) {
        if (this._diffuseTextureInGammaSpace === gammeSpace) {
            return;
        }

        this._diffuseTextureInGammaSpace = gammeSpace;
        this._needInitialization = true;
    }

    public fluidColor = new BABYLON.Color3(0.085, 0.6375, 0.765);

    public clarity = 0.8;

    public density = 0.5;

    public refractionStrength = 0.02;

    public dirLight: BABYLON.Vector3 = new BABYLON.Vector3(-2, -1, 1).normalize();

    private _debugFeature: FluidRenderingDebug = FluidRenderingDebug.DepthBlurredTexture;

    public get debugFeature() {
        return this._debugFeature;
    }

    public set debugFeature(feature: FluidRenderingDebug) {
        if (this._debugFeature === feature) {
            return;
        }

        this._needInitialization = this._needInitialization || (feature === FluidRenderingDebug.Normals || this._debugFeature === FluidRenderingDebug.Normals);
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

    private _enableBlur = true;

    public get enableBlur() {
        return this._enableBlur;
    }

    public set enableBlur(enable: boolean) {
        if (this._enableBlur === enable) {
            return;
        }

        this._enableBlur = enable;
        this._needInitialization = true;
    }

    private _blurSizeDivisor = 1;

    public get blurSizeDivisor() {
        return this._blurSizeDivisor;
    }

    public set blurSizeDivisor(scale: number) {
        if (this._blurSizeDivisor === scale) {
            return;
        }

        this._blurSizeDivisor = scale;
        this._needInitialization = true;
    }

    private _blurKernel = 50;

    public get blurKernel() {
        return this._blurKernel;
    }

    public set blurKernel(kernel: number) {
        if (this._blurKernel === kernel) {
            return;
        }

        this._blurKernel = kernel;
        this._setBlurParametersForAllTargets();
    }

    private _blurScale = 0.05;

    public get blurScale() {
        return this._blurScale;
    }

    public set blurScale(scale: number) {
        if (this._blurScale === scale) {
            return;
        }

        this._blurScale = scale;
        this._setBlurParametersForAllTargets();
    }

    private _blurDepthScale = 10;

    public get blurDepthScale() {
        return this._blurDepthScale;
    }

    public set blurDepthScale(scale: number) {
        if (this._blurDepthScale === scale) {
            return;
        }

        this._blurDepthScale = scale;
        this._setBlurParametersForAllTargets();
    }

    private _mapSize = 1024;

    public get mapSize() {
        return this._mapSize;
    }

    public set mapSize(size: number) {
        if (this._mapSize === size) {
            return;
        }

        this._mapSize = size;
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
    public get thicknessRenderTarget() {
        return this._thicknessRenderTarget;
    }

    constructor(scene: BABYLON.Scene, camera?: BABYLON.Camera) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._camera = camera ?? scene.activeCamera;
        this._needInitialization = true;
    
        this._invProjectionMatrix = new BABYLON.Matrix();
        this._depthClearColor = new BABYLON.Color4(1e10, 1e10, 1e10, 1);
        this._thicknessClearColor = new BABYLON.Color4(0, 0, 0, 1);

        this._depthRenderTarget = null;
        this._diffuseRenderTarget = null;
        this._thicknessRenderTarget = null;

        this._renderPostProcess = null;
    }

    public initialize(): void {
        this.dispose();

        this._needInitialization = false;

        this._depthRenderTarget = new FluidRenderingRenderTarget("Depth", this._scene, this._mapSize, this._mapSize, false, this._mapSize,
            BABYLON.Constants.TEXTURETYPE_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            BABYLON.Constants.TEXTURETYPE_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, false);

        this._initializeRenderTarget(this._depthRenderTarget);

        if (this.generateDiffuseTexture) {
            this._diffuseRenderTarget = new FluidRenderingRenderTarget("Diffuse", this._scene, this._mapSize, this._mapSize, this._diffuseTextureInGammaSpace, this._mapSize,
                BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_RGBA, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_RGBA, true);

            this._initializeRenderTarget(this._diffuseRenderTarget);
        }

        this._thicknessRenderTarget = new FluidRenderingRenderTarget("Thickness", this._scene, this._engine.getRenderWidth(), this._engine.getRenderHeight(), false, this._mapSize,
            BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            BABYLON.Constants.TEXTURETYPE_HALF_FLOAT, BABYLON.Constants.TEXTUREFORMAT_R, true);

        this._initializeRenderTarget(this._thicknessRenderTarget);

        this._createLiquidRenderingPostProcess();
    }

    protected _setBlurParametersForAllTargets(): void {
        if (this._depthRenderTarget) {
            this._setBlurParameters(this._depthRenderTarget);
        }
        if (this._diffuseRenderTarget) {
            this._setBlurParameters(this._diffuseRenderTarget);
        }
        if (this._thicknessRenderTarget) {
            this._setBlurParameters(this._thicknessRenderTarget);
        }
    }

    protected _setBlurParameters(renderTarget: FluidRenderingRenderTarget): void {
        renderTarget.blurKernel = this.blurKernel;
        renderTarget.blurScale = this.blurScale;
        renderTarget.blurDepthScale = this.blurDepthScale;
    }

    protected _initializeRenderTarget(renderTarget: FluidRenderingRenderTarget): void {
        renderTarget.enableBlur = this.enableBlur;
        renderTarget.blurSizeDivisor = this.blurSizeDivisor;

        this._setBlurParameters(renderTarget);

        renderTarget.initialize();
    }

    protected _createLiquidRenderingPostProcess(): void {
        const engine = this._scene.getEngine();
        const targetSize = Math.floor(this.mapSize / this.blurSizeDivisor);

        const uniformNames = ["projection", "invProjection", "texelSize", "dirLight", "cameraFar", "clarity", "density", "refractionStrength"];
        const samplerNames = ["depthSampler", "thicknessSampler", "reflectionSampler"];
        const defines = [];

        this.dispose(true);

        if (!this._camera) {
            return;
        }

        if (this._diffuseRenderTarget) {
            samplerNames.push("diffuseSampler");
            defines.push("#define FLUIDRENDERING_DIFFUSETEXTURE");

            if (this._diffuseRenderTarget.texture?.gammaSpace) {
                defines.push("#define FLUIDRENDERING_DIFFUSETEXTURE_GAMMASPACE");
            }
        } else {
            uniformNames.push("diffuseColor");
        }

        if (this._debug) {
            defines.push("#define FLUIDRENDERING_DEBUG");
            if (this._debugFeature !== FluidRenderingDebug.Normals) {
                defines.push("#define FLUIDRENDERING_DEBUG_TEXTURE");
                samplerNames.push("debugSampler");
            } else {
                defines.push("#define FLUIDRENDERING_DEBUG_SHOWNORMAL");
            }
        }

        this._renderPostProcess = new BABYLON.PostProcess("FluidRendering", "renderFluid", uniformNames, samplerNames, 1, null, BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE, engine, false, defines.join("\n"), BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
        this._renderPostProcess.onApplyObservable.add((effect) => {
            this._invProjectionMatrix.copyFrom(this._scene.getProjectionMatrix());
            this._invProjectionMatrix.invert();

            let texelSize = 1 / targetSize;

            if (!this._depthRenderTarget!.enableBlur) {
                effect.setTexture("depthSampler", this._depthRenderTarget!.texture);
                texelSize = 1 / this.mapSize;
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

            effect.setMatrix("invProjection", this._invProjectionMatrix);
            effect.setMatrix("projection", this._scene.getProjectionMatrix());
            effect.setFloat("texelSize", texelSize);
            effect.setTexture("reflectionSampler", this._scene.environmentTexture);
            effect.setFloat("clarity", this.clarity);
            effect.setFloat("density", this.density);
            effect.setFloat("refractionStrength", this.refractionStrength);

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
                    case FluidRenderingDebug.DiffuseBlurredTexture:
                        if (this._diffuseRenderTarget) {
                            texture = this._diffuseRenderTarget.enableBlur ? this._diffuseRenderTarget.textureBlur : this._diffuseRenderTarget.texture;
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
            this._engine.clear(this._thicknessClearColor, true, false, false);
            this._engine.unBindFramebuffer(this._thicknessRenderTarget.renderTarget);
            this._engine.unbindInstanceAttributes();
        }
    }

    public render(fluidObject: FluidRenderingObject): void {
        if (this._needInitialization || !fluidObject.isReady()) {
            return;
        }

        const currentRenderTarget = this._engine._currentRenderTarget;

        // Render the particles in the depth texture
        if (this._depthRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._depthRenderTarget.renderTarget);

            fluidObject.renderDepthTexture();

            this._engine.unBindFramebuffer(this._depthRenderTarget.renderTarget);
        }

        // Render the particles in the diffuse texture
        if (this._diffuseRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._diffuseRenderTarget.renderTarget);

            fluidObject.renderDiffuseTexture();

            this._engine.unBindFramebuffer(this._diffuseRenderTarget.renderTarget);
        }

        // Render the particles in the thickness texture
        if (this._thicknessRenderTarget?.renderTarget) {
            this._engine.bindFramebuffer(this._thicknessRenderTarget.renderTarget);

            fluidObject.renderThicknessTexture();

            this._engine.unBindFramebuffer(this._thicknessRenderTarget.renderTarget);
            this._engine.unbindInstanceAttributes();
        }

        // Render the blur post processes
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
