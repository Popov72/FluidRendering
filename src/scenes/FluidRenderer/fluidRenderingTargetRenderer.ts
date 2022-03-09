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

    private static _Id = 1;

    protected _scene: BABYLON.Scene;
    protected _camera: BABYLON.Nullable<BABYLON.Camera>;
    protected _engine: BABYLON.Engine;
    protected _id: number = FluidRenderingTargetRenderer._Id++;

    protected _depthRenderTarget: BABYLON.Nullable<FluidRenderingRenderTarget>;
    protected _diffuseRenderTarget: BABYLON.Nullable<FluidRenderingRenderTarget>;
    protected _thicknessRenderTarget: BABYLON.Nullable<FluidRenderingRenderTarget>;

    protected _renderPostProcess: BABYLON.Nullable<BABYLON.PostProcess>;
    protected _passPostProcess: BABYLON.Nullable<BABYLON.PostProcess>;

    protected _invProjectionMatrix: BABYLON.Matrix;
    protected _invViewMatrix: BABYLON.Matrix;
    protected _depthClearColor: BABYLON.Color4;
    protected _thicknessClearColor: BABYLON.Color4;

    protected _needInitialization: boolean;

    public get needInitialization() {
        return this._needInitialization;
    }

    private _generateDiffuseTexture: boolean = false;

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

    private _diffuseTextureInGammaSpace: boolean = true;

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

    private _checkMaxLengthThreshold = true;

    public get checkMaxLengthThreshold() {
        return this._checkMaxLengthThreshold;
    }

    public set checkMaxLengthThreshold(useThreshold: boolean) {
        if (this._checkMaxLengthThreshold === useThreshold) {
            return;
        }

        this._needInitialization = this._needInitialization || (useThreshold && !this._checkMaxLengthThreshold || !useThreshold && this._checkMaxLengthThreshold);
        this._checkMaxLengthThreshold = useThreshold;
    }

    private _maxLengthThreshold = 0.7;

    public get maxLengthThreshold() {
        return this._maxLengthThreshold;
    }

    public set maxLengthThreshold(threshold: number) {
        if (this._maxLengthThreshold === threshold) {
            return;
        }

        this._maxLengthThreshold = threshold;
    }

    private _useMinZDiff = true;

    public get useMinZDiff() {
        return this._useMinZDiff;
    }

    public set useMinZDiff(useMinZDiff: boolean) {
        if (this._useMinZDiff === useMinZDiff) {
            return;
        }

        this._needInitialization = this._needInitialization || (useMinZDiff && !this._useMinZDiff || !useMinZDiff && this._useMinZDiff);
        this._useMinZDiff = useMinZDiff;
    }

    private _checkNonBlurredDepth = false;

    public get checkNonBlurredDepth() {
        return this._checkNonBlurredDepth;
    }

    public set checkNonBlurredDepth(check: boolean) {
        if (this._checkNonBlurredDepth === check) {
            return;
        }

        this._needInitialization = this._needInitialization || (check && !this._checkNonBlurredDepth || !check && this._checkNonBlurredDepth);
        this._checkNonBlurredDepth = check;
    }

    private _showTexturesInInspector = true;

    public get showTexturesInInspector() {
        return this._showTexturesInInspector;
    }

    public set showTexturesInInspector(showInInspector: boolean) {
        if (this._showTexturesInInspector === showInInspector) {
            return;
        }

        this._showTexturesInInspector = showInInspector;
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

    private _blurKernel = 60;

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

    private _blurDepthScale = 0.1;

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

    private _positionOrder: number = 0;

    public get positionOrder() {
        return this._positionOrder;
    }

    public set positionOrder(order: number) {
        if (this._positionOrder === order) {
            return;
        }

        this._positionOrder = order;
        this._needInitialization = true;
    }

    private _needPostProcessChaining: boolean = false;

    public get needPostProcessChaining() {
        return this._needPostProcessChaining;
    }

    public set needPostProcessChaining(needChaining: boolean) {
        if (this._needPostProcessChaining === needChaining) {
            return;
        }

        this._needPostProcessChaining = needChaining;
        this._needInitialization = true;
    }

    private _useLinearZ = false;

    public get useLinearZ() {
        return this._useLinearZ;
    }

    public set useLinearZ(useLinearZ: boolean) {
        if (this._useLinearZ === useLinearZ) {
            return;
        }

        this._useLinearZ = useLinearZ;
        this._needInitialization = true;
    }

    constructor(scene: BABYLON.Scene, camera?: BABYLON.Camera) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._camera = camera ?? scene.activeCamera;
        this._needInitialization = true;
    
        this._invProjectionMatrix = new BABYLON.Matrix();
        this._invViewMatrix = new BABYLON.Matrix();
        this._depthClearColor = new BABYLON.Color4(1, 1, 1, 1);
        this._thicknessClearColor = new BABYLON.Color4(0, 0, 0, 1);

        this._depthRenderTarget = null;
        this._diffuseRenderTarget = null;
        this._thicknessRenderTarget = null;

        this._renderPostProcess = null;
        this._passPostProcess = null;
    }

    public initialize(): void {
        this.dispose();

        this._needInitialization = false;

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
        renderTarget.showTexturesInInspector = this.showTexturesInInspector;
        renderTarget.enableBlur = this.enableBlur;
        renderTarget.blurSizeDivisor = this.blurSizeDivisor;

        this._setBlurParameters(renderTarget);

        renderTarget.initialize();
    }

    protected _createLiquidRenderingPostProcess(): void {
        const engine = this._scene.getEngine();
        const targetSize = Math.floor(this.mapSize / this.blurSizeDivisor);

        const uniformNames = ["projection", "invProjection", "invView", "texelSize", "dirLight", "camPos"];
        const samplerNames = ["nonBlurredDepthSampler", "depthSampler", "thicknessSampler", "reflectionSampler"];
        const defines = [];

        this.dispose(true);

        if (!this._camera) {
            return;
        }

        if (this._generateDiffuseTexture) {
            samplerNames.push("diffuseSampler");
            defines.push("#define FLUIDRENDERING_DIFFUSETEXTURE");

            if (this._diffuseTextureInGammaSpace) {
                defines.push("#define FLUIDRENDERING_DIFFUSETEXTURE_GAMMASPACE");
            }
        } else {
            uniformNames.push("diffuseColor");
        }

        if (this._useMinZDiff) {
            defines.push("#define FLUIDRENDERING_USE_MINZ_DIFF");
        }

        if (this._checkMaxLengthThreshold) {
            defines.push("#define FLUIDRENDERING_CHECK_MAXLENGTH");
            uniformNames.push("maxLengthThreshold");
        }

        if (this._checkNonBlurredDepth) {
            defines.push("#define FLUIDRENDERING_CHECK_NONBLURREDDEPTH");
            samplerNames.push("nonBlurredDepthSampler");
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

        if (this._useLinearZ) {
            defines.push("#define FLUIDRENDERING_USE_LINEARZ");
            uniformNames.push("cameraFar");
        }

        this._renderPostProcess = new BABYLON.PostProcess("FluidRendering", "renderFluid", uniformNames, samplerNames, 1, null, BABYLON.Constants.TEXTURE_BILINEAR_SAMPLINGMODE, engine, false, defines.join("\n"), BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
        this._camera.attachPostProcess(this._renderPostProcess, this._positionOrder);
        this._renderPostProcess.alphaMode = BABYLON.Constants.ALPHA_COMBINE;
        this._renderPostProcess.externalTextureSamplerBinding = true;
        this._renderPostProcess.onApplyObservable.add((effect) => {
            this._invProjectionMatrix.copyFrom(this._scene.getProjectionMatrix());
            this._invProjectionMatrix.invert();

            this._invViewMatrix.copyFrom(this._scene.getViewMatrix());
            this._invViewMatrix.invert();

            let texelSize = 1 / targetSize;

            if (this._checkNonBlurredDepth) {
                effect.setTexture("nonBlurredDepthSampler", this._depthRenderTarget!.texture);
            }

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
            effect.setMatrix("invView", this._invViewMatrix);
            effect.setFloat("texelSize", texelSize);
            effect.setTexture("reflectionSampler", this._scene.environmentTexture);

            effect.setVector3("dirLight", this.dirLight);
            effect.setVector3("camPos", this._camera!.globalPosition);

            if (this._checkMaxLengthThreshold) {
                effect.setFloat("maxLengthThreshold", this._maxLengthThreshold);
            }

            if (this._useLinearZ) {
                effect.setFloat("cameraFar", this._camera!.maxZ);
            }

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
                } else {
                    effect.setFloat("maxLengthThreshold", this._maxLengthThreshold);
                }
            }
        });

        if (this._positionOrder === 0) {
            this._renderPostProcess.onSizeChangedObservable.add(() => {
                if (!this._renderPostProcess!.inputTexture.depthStencilTexture) {
                    this._renderPostProcess!.inputTexture.createDepthStencilTexture(0, true, engine.isStencilEnable, 1);
                }
                if (this._thicknessRenderTarget?.renderTarget) {
                    this._renderPostProcess!.inputTexture._shareDepth(this._thicknessRenderTarget.renderTarget);
                }
            });

            this._renderPostProcess.onActivateObservable.add((effect) => {
                this._engine.clear(this._scene.clearColor, true, true, true);
            });
        } else {
            const firstPP = this._camera._getFirstPostProcess()!;
            firstPP.onSizeChangedObservable.add(() => {
                if (this._thicknessRenderTarget?.renderTarget) {
                    firstPP.inputTexture._shareDepth(this._thicknessRenderTarget.renderTarget);
                }
            });

            this._renderPostProcess.shareOutputWith(firstPP);
        }

        if (this.needPostProcessChaining) {
            const firstPP = this._camera._getFirstPostProcess()!;
            let nextPostProcess = this._findNextPostProcess(this._positionOrder);
            if (!nextPostProcess) {
                this._passPostProcess = nextPostProcess = new BABYLON.PassPostProcess("fluidRenderingPass", 1, null, undefined, engine);
                this._camera.attachPostProcess(this._passPostProcess, this._positionOrder + 1);
            }
            nextPostProcess.autoClear = false;
            nextPostProcess.shareOutputWith(firstPP);
        }
    }

    private _findNextPostProcess(index: number): BABYLON.Nullable<BABYLON.PostProcess>  {
        const postProcesses = this._camera?._postProcesses;
        if (!postProcesses) {
            return null;
        }
        for (let i = index + 1; i < postProcesses.length; ++i) {
            if (postProcesses[i]) {
                return postProcesses[i];
            }
        }
        return null;
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

        fluidObject.useLinearZ = this._useLinearZ;

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

        if (this.needPostProcessChaining) {
            let nextPostProcess = this._findNextPostProcess(this._positionOrder);
            if (nextPostProcess && nextPostProcess !== this._passPostProcess) {
                nextPostProcess.useOwnOutput();
            }
        }

        if (this._renderPostProcess && this._camera) {
            this._camera.detachPostProcess(this._renderPostProcess);
        }
        this._renderPostProcess?.dispose();
        this._renderPostProcess = null;

        if (this._passPostProcess && this._camera) {
            this._camera.detachPostProcess(this._passPostProcess);
        }
        this._passPostProcess?.dispose();
        this._passPostProcess = null;

        this._needInitialization = false;
    }

}
