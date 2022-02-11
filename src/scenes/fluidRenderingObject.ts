import * as BABYLON from "@babylonjs/core";

interface FluidRenderingObject {
    object: BABYLON.VertexBuffer | BABYLON.ParticleSystem;
    diffuseColor?: BABYLON.Color3;
    particleSize?: number | BABYLON.VertexBuffer;
    particleThicknessAlpha?: number;
    dirLight?: BABYLON.Vector3;
    priority?: number;
    /** @hidden */
    _mesh: BABYLON.Mesh;
}
