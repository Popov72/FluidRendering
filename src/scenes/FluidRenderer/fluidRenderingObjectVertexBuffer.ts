import * as BABYLON from "@babylonjs/core";

import { FluidRenderingObject } from "./fluidRenderingObject";

export class FluidRenderingObjectVertexBuffer extends FluidRenderingObject {

    private _numParticles: number;
    private _disposeVBOffset: boolean;

    constructor(scene: BABYLON.Scene, vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, numParticles: number) {
        super(scene, vertexBuffers, null);

        this._numParticles = numParticles;
        this._disposeVBOffset = false;

        if (!vertexBuffers["offset"]) {
            vertexBuffers["offset"] = new BABYLON.VertexBuffer(this._engine, [0, 0, 1, 0, 0, 1, 1, 1], "offset", false, false, 2);
            this._disposeVBOffset = true;
        }
    }

    public numParticles(): number {
        return this._numParticles;
    }

    public renderDiffuseTexture(): void {
    }

    public dispose(): void {
        super.dispose();

        if (this._disposeVBOffset) {
            this.vertexBuffers["offset"].dispose();
        }
    }
}
