import * as BABYLON from "@babylonjs/core";

import { FluidRenderingObject } from "./fluidRenderingObject";

export class FluidRenderingObjectVertexBuffer extends FluidRenderingObject {

    constructor(scene: BABYLON.Scene, vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, indexBuffer: BABYLON.DataBuffer) {
        super(scene, vertexBuffers, indexBuffer, true);
    }

    public isReady(): boolean {
        return true;
    }

    public numParticles(): number {
        return this.vertexBuffers["position"].getSize();
    }

    public renderDiffuseTexture(): void {
    }
}
