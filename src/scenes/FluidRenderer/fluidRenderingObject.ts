import * as BABYLON from "@babylonjs/core";
import { FluidRenderingOutput } from "./fluidRenderingOutput";

export abstract class FluidRenderingObject {

    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;

    public priority: number = 0;

    /** @hidden */
    public _output: BABYLON.Nullable<FluidRenderingOutput> = null;

    protected _generateDiffuseTexture: boolean = false;

    public get generateDiffuseTexture() {
        return this._generateDiffuseTexture;
    }

    public set generateDiffuseTexture(generate: boolean) {
        if (generate === this._generateDiffuseTexture) {
            return;
        }
        this._generateDiffuseTexture = generate;
        this._output?.initialize();
    }

    constructor(scene: BABYLON.Scene, public readonly vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, public readonly indexBuffer: BABYLON.DataBuffer, public readonly useInstancing: boolean) {
        this._scene = scene;
        this._engine = scene.getEngine();
    }

    public isReady(): boolean {
        return true;
    }

    public numParticles(): number {
        return 0;
    }

    public renderDiffuseTexture(): void {

    }

    public dispose(): void {
    }
}
