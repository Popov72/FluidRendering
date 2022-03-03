import * as BABYLON from "@babylonjs/core";

import { FluidRenderingObject } from "./fluidRenderingObject";

export class FluidRenderingObjectVertexBuffer extends FluidRenderingObject {

    private _numParticles: number;
    private _disposeVBOffset: boolean;
    private _diffuseEffectWrapper: BABYLON.Nullable<BABYLON.EffectWrapper>;

    constructor(scene: BABYLON.Scene, vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, numParticles: number) {
        super(scene, vertexBuffers, null);

        this._numParticles = numParticles;
        this._disposeVBOffset = false;
        this._diffuseEffectWrapper = null;

        if (!vertexBuffers["offset"]) {
            vertexBuffers["offset"] = new BABYLON.VertexBuffer(this._engine, [0, 0, 1, 0, 0, 1, 1, 1], "offset", false, false, 2);
            this._disposeVBOffset = true;
        }
    }

    protected _createEffects(): void {
        super._createEffects();

        const uniformNames = ["view", "projection"];
        const attributeNames = ["position", "offset", "color"];
        const defines = [];

        if (this._particleSize === null) {
            attributeNames.push("size");
            defines.push("#define FLUIDRENDERING_PARTICLESIZE_FROM_ATTRIBUTE");
        } else {
            uniformNames.push("size");
        }

        this._diffuseEffectWrapper = new BABYLON.EffectWrapper({
            engine: this._engine,
            useShaderStore: true,
            vertexShader: "fluidParticleDiffuse",
            fragmentShader: "fluidParticleDiffuse",
            attributeNames,
            uniformNames,
            samplerNames: [],
            defines,
        });
    }

    public isReady(): boolean {
        return super.isReady() && (this._diffuseEffectWrapper?.effect!.isReady() ?? false);
    }

    public numParticles(): number {
        return this._numParticles;
    }

    public renderDiffuseTexture(): void {
        if (!this._diffuseEffectWrapper) {
            return;
        }

        const diffuseDrawWrapper = this._diffuseEffectWrapper._drawWrapper;
        const diffuseEffect = diffuseDrawWrapper.effect!;

        this._engine.enableEffect(diffuseDrawWrapper);
        this._engine.bindBuffers(this.vertexBuffers, this.indexBuffer, diffuseEffect);

        diffuseEffect.setMatrix("view", this._scene.getViewMatrix());
        diffuseEffect.setMatrix("projection", this._scene.getProjectionMatrix());
        if (this._particleSize !== null) {
            diffuseEffect.setFloat2("size", this._particleSize, this._particleSize);
        }

        const numParticles = this.numParticles();

        if (this.useInstancing) {
            this._engine.drawArraysType(BABYLON.Constants.MATERIAL_TriangleStripDrawMode, 0, 4, numParticles);
        } else {
            this._engine.drawElementsType(BABYLON.Constants.MATERIAL_TriangleFillMode, 0, numParticles);
        }
    }

    public dispose(): void {
        super.dispose();

        this._diffuseEffectWrapper?.dispose();

        if (this._disposeVBOffset) {
            this.vertexBuffers["offset"].dispose();
        }
    }
}
