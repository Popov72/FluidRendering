import * as BABYLON from "@babylonjs/core";

import { FluidRenderingObject } from "./fluidRenderingObject";

export class FluidRenderingObjectVertexBuffer extends FluidRenderingObject {

    private _disposeVBOffset: boolean;

    constructor(scene: BABYLON.Scene, vertexBuffers: { [key: string]: BABYLON.VertexBuffer }) {
        super(scene, vertexBuffers, null);

        this._disposeVBOffset = false;

        if (!vertexBuffers["offset"]) {
            vertexBuffers["offset"] = new BABYLON.VertexBuffer(this._engine, [0, 0, 1, 0, 0, 1, 1, 1], "offset", false, false, 2 * 4)
            this._disposeVBOffset = true;
        }
    }

    public isReady(): boolean {
        return true;
    }

    public numParticles(): number {
        return this.vertexBuffers["position"].getSize();
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
