import * as BABYLON from "@babylonjs/core";

export abstract class FluidRenderingObject {

    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;
    protected _effectsAreDirty: boolean;
    protected _depthEffectWrapper: BABYLON.Nullable<BABYLON.EffectWrapper>;
    protected _thicknessEffectWrapper: BABYLON.Nullable<BABYLON.EffectWrapper>;

    public priority = 0;

    protected _particleSize = 0.1;

    public onParticleSizeChanged = new BABYLON.Observable<FluidRenderingObject>();

    public get particleSize() {
        return this._particleSize;
    }

    public set particleSize(size: number) {
        if (size === this._particleSize) {
            return;
        }

        this._particleSize = size;
        this.onParticleSizeChanged.notifyObservers(this);
    }

    public particleThicknessAlpha = 0.05;

    public get useInstancing() {
        return !this.indexBuffer;
    }

    private _useVelocity = false;

    public get useVelocity() {
        return this._useVelocity;
    }

    public set useVelocity(use: boolean) {
        if (this._useVelocity === use || !this._hasVelocity()) {
            return;
        }

        this._useVelocity = use;
        this._effectsAreDirty = true;
    }

    private _hasVelocity() {
        return !!this.vertexBuffers.velocity;
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
        const uniformNames = ["view", "projection", "particleRadius", "size"];
        const attributeNames = ["position", "offset"];
        const defines: string[] = [];

        this._effectsAreDirty = false;

        if (this.useVelocity) {
            attributeNames.push("velocity");
            defines.push("#define FLUIDRENDERING_VELOCITY");
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
            attributeNames: ["position", "offset"],
            uniformNames,
            samplerNames: [],
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
        const numParticles = this.numParticles();

        if (!this._depthEffectWrapper || numParticles === 0) {
            return;
        }

        const depthDrawWrapper = this._depthEffectWrapper._drawWrapper;
        const depthEffect = depthDrawWrapper.effect!;

        this._engine.enableEffect(depthDrawWrapper);
        this._engine.bindBuffers(this.vertexBuffers, this.indexBuffer, depthEffect);

        depthEffect.setMatrix("view", this._scene.getViewMatrix());
        depthEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        depthEffect.setFloat2("size", this._particleSize, this._particleSize);
        depthEffect.setFloat("particleRadius", this._particleSize / 2);

        if (this.useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, numParticles);
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, numParticles);
        }
    }

    public renderThicknessTexture(): void {
        const numParticles = this.numParticles();

        if (!this._thicknessEffectWrapper || numParticles === 0) {
            return;
        }

        const thicknessDrawWrapper = this._thicknessEffectWrapper._drawWrapper;
        const thicknessEffect = thicknessDrawWrapper.effect!;

        this._engine.setAlphaMode(BABYLON.Constants.ALPHA_ONEONE);
        this._engine.depthCullingState.depthMask = false;

        this._engine.enableEffect(thicknessDrawWrapper);
        this._engine.bindBuffers(this.vertexBuffers, this.indexBuffer, thicknessEffect);

        thicknessEffect.setMatrix("view", this._scene.getViewMatrix());
        thicknessEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        thicknessEffect.setFloat("particleAlpha", this.particleThicknessAlpha);
        thicknessEffect.setFloat2("size", this._particleSize * 2, this._particleSize * 2);

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
