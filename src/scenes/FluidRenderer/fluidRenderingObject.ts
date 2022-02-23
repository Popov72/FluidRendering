import * as BABYLON from "@babylonjs/core";

export abstract class FluidRenderingObject {

    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;

    public priority: number = 0;

    public diffuseColor: BABYLON.Color3 = new BABYLON.Color3(1, 1, 1);

    public particleSize: number = 0.75;

    public particleThicknessAlpha: number = 0.075;

    public generateDiffuseTexture: boolean = false;

    public dirLight: BABYLON.Vector3 = new BABYLON.Vector3(-2, -1, 1).normalize();

    public get useInstancing() {
        return !this.indexBuffer;
    }

    constructor(scene: BABYLON.Scene, public readonly vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, public readonly indexBuffer: BABYLON.Nullable<BABYLON.DataBuffer>) {
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
