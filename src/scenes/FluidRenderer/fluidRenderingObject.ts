import * as BABYLON from "@babylonjs/core";

export abstract class FluidRenderingObject {

    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;
    protected _effectsAreDirty: boolean;
    protected _depthEffectWrapper: BABYLON.Nullable<BABYLON.EffectWrapper>;
    protected _thicknessEffectWrapper: BABYLON.Nullable<BABYLON.EffectWrapper>;

    public priority = 0;

    protected _particleSize: BABYLON.Nullable<number> = null;

    public get particleSize() {
        return this._particleSize;
    }

    public set particleSize(size: BABYLON.Nullable<number>) {
        if (size === this._particleSize) {
            return;
        }

        this._effectsAreDirty = this._effectsAreDirty || (size === null && this._particleSize !== null || size !== null && this._particleSize === null);

        this._particleSize = size;
    }

    public particleThicknessAlpha = 0.05;

    public get useInstancing() {
        return !this.indexBuffer;
    }

    protected _useLinearZ = false;

    public get useLinearZ() {
        return this._useLinearZ;
    }

    public set useLinearZ(useLinearZ: boolean) {
        if (this._useLinearZ === useLinearZ) {
            return;
        }

        this._useLinearZ = useLinearZ;
        this._effectsAreDirty = true;
    }

    public getClassName(): string {
        return "FluidRenderingObject";
    }

    constructor(scene: BABYLON.Scene, public readonly vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, public readonly indexBuffer: BABYLON.Nullable<BABYLON.DataBuffer>) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._effectsAreDirty = true;
        this._depthEffectWrapper = null;
        this._thicknessEffectWrapper = null;
    }

    protected _createEffects(): void {
        const uniformNames = ["view", "projection"];
        const attributeNames = ["position", "offset"];
        const defines = [];

        this._effectsAreDirty = false;

        if (this._particleSize === null) {
            attributeNames.push("size");
            defines.push("#define FLUIDRENDERING_PARTICLESIZE_FROM_ATTRIBUTE");
        } else {
            uniformNames.push("size");
        }

        if (this._useLinearZ) {
            defines.push("#define FLUIDRENDERING_USE_LINEARZ");
            uniformNames.push("cameraFar");
        }

        this._depthEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: true,
            vertexShader: "fluidParticleDepth",
            fragmentShader: "fluidParticleDepth",
            attributeNames,
            uniformNames,
            samplerNames: [],
            defines,
        });

        uniformNames.push("particleAlpha");

        this._thicknessEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: true,
            vertexShader: "fluidParticleThickness",
            fragmentShader: "fluidParticleThickness",
            attributeNames,
            uniformNames,
            samplerNames: [],
            defines,
        });
    }

    public isReady(): boolean {
        if (this._effectsAreDirty) {
            this._createEffects();
        }

        if (!this._depthEffectWrapper || !this._thicknessEffectWrapper) {
            return false;
        }

        const depthEffect = this._depthEffectWrapper._drawWrapper.effect!;
        const thicknessEffect = this._thicknessEffectWrapper._drawWrapper.effect!;

        return depthEffect.isReady() && thicknessEffect.isReady();
    }

    public numParticles(): number {
        return 0;
    }

    public renderDepthTexture(): void {
        if (!this._depthEffectWrapper) {
            return;
        }

        const depthDrawWrapper = this._depthEffectWrapper._drawWrapper;
        const depthEffect = depthDrawWrapper.effect!;

        this._engine.enableEffect(depthDrawWrapper);
        this._engine.bindBuffers(this.vertexBuffers, this.indexBuffer, depthEffect);

        depthEffect.setMatrix("view", this._scene.getViewMatrix());
        depthEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        if (this._particleSize !== null) {
            depthEffect.setFloat2("size", this._particleSize, this._particleSize);
        }
        if (this._useLinearZ) {
            depthEffect.setFloat("cameraFar", this._scene.activeCamera?.maxZ ?? 10000);
        }

        const numParticles = this.numParticles();

        if (this.useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, numParticles);
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, numParticles);
        }
    }

    public renderThicknessTexture(): void {
        if (!this._thicknessEffectWrapper) {
            return;
        }

        const thicknessDrawWrapper = this._thicknessEffectWrapper._drawWrapper;
        const thicknessEffect = thicknessDrawWrapper.effect!;

        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_ADD);
        this._engine.depthCullingState.depthMask = false;

        this._engine.enableEffect(thicknessDrawWrapper);
        this._engine.bindBuffers(this.vertexBuffers, this.indexBuffer, thicknessEffect);

        thicknessEffect.setMatrix("view", this._scene.getViewMatrix());
        thicknessEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        thicknessEffect.setFloat("particleAlpha", this.particleThicknessAlpha);
        if (this._particleSize !== null) {
            thicknessEffect.setFloat2("size", this._particleSize, this._particleSize);
        }

        const numParticles = this.numParticles();

        if (this.useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, numParticles);
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, numParticles);
        }

        this._engine.depthCullingState.depthMask = true;
        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_DISABLE);
    }

    public renderDiffuseTexture(): void {
        // do nothing by default
    }

    public dispose(): void {
        this._depthEffectWrapper?.dispose();
        this._thicknessEffectWrapper?.dispose();
    }
}
