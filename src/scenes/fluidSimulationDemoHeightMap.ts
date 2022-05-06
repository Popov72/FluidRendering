import * as BABYLON from "@babylonjs/core";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";

// Textures from https://freepbr.com/materials/sulphuric-rock/
import rockBaseColor from "../assets/materials/sulphuric-rock_albedo.png";
import rockRoughness from "../assets/materials/sulphuric-rock_roughness.png";
import rockNormal from "../assets/materials/sulphuric-rock_normal-ogl.png";

export class FluidSimulationDemoHeightMap extends FluidSimulationDemoBase {

    private _terrainCollisionRestitution: number;
    private _ground: BABYLON.GroundMesh;
    private _normal = new BABYLON.Vector3();
    private _terrainSize: number;
    private _collisionPlanes: Array<BABYLON.Plane>;

    constructor(scene: BABYLON.Scene) {
        super(scene);

        this._terrainCollisionRestitution = 0.98;
        this._ground = null as any;
        this._terrainSize = 5;
        this._collisionPlanes = [
            new BABYLON.Plane(0, 0, -1, this._terrainSize / 2),
            new BABYLON.Plane(0, 0, 1, this._terrainSize / 2),
            new BABYLON.Plane(1, 0, 0, this._terrainSize / 2),
            new BABYLON.Plane(-1, 0, 0, this._terrainSize / 2),
        ];

        this._particleGenerator.yBaseEmitter = 1.0;
        this._fluidSim.viscosity = 0.05;
    }

    public run(): void {
        this._ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap("gdhm", "https://playground.babylonjs.com/textures/heightMap.png", { width: this._terrainSize, height: this._terrainSize, subdivisions: 128, maxHeight: 1, onReady: () => this._ground.updateCoordinateHeights() }, this._scene);

        const mat = new BABYLON.PBRMaterial("mat", this._scene);

        mat.metallicTexture = new BABYLON.Texture(rockRoughness, this._scene);
        mat.albedoTexture = new BABYLON.Texture(rockBaseColor, this._scene);
        mat.bumpTexture = new BABYLON.Texture(rockNormal, this._scene);
        mat.useRoughnessFromMetallicTextureGreen = true;
        mat.metallic = 0;
        mat.roughness = 1;

        this._ground.material = mat;

        const camera = this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 4.38;
            (camera as BABYLON.ArcRotateCamera).beta = 1.16;
            (camera as BABYLON.ArcRotateCamera).radius = 4.9;
        }

        this._fluidRenderObject.targetRenderer.blurThicknessFilterSize = 12;
        this._fluidRenderObject.targetRenderer.blurThicknessNumIterations = 4;
        this._fluidRenderObject.targetRenderer.density = 5;

        super.run();
    }

    public dispose(): void {
        super.dispose();

        this._ground?.dispose();
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            restart: () => {
                this._generateParticles();
            },
            terrainCollisionRestitution: this._terrainCollisionRestitution,
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "restart").name("Restart");

        mainMenu.add(params, "terrainCollisionRestitution", 0, 1, 0.01)
            .name("Terrain collision restitution")
            .onChange((value: any) => {
                this._terrainCollisionRestitution = value;
            });
    }

    protected _checkCollisions(particleRadius: number): void {
        const positions = this._fluidSim.positions;
        const velocities = this._fluidSim.velocities;
        for (let a = 0; a < this._fluidSim.currentNumParticles; ++a) {
            const px = positions[a * 3 + 0];
            const py = positions[a * 3 + 1];
            const pz = positions[a * 3 + 2];
            
            const yTerrain = this._ground.getHeightAtCoordinates(px, pz);
            if (py - particleRadius * 2 <= yTerrain) {
                this._ground.getNormalAtCoordinatesToRef(px, pz, this._normal);

                const dotvn = velocities[a * 3 + 0] * this._normal.x + velocities[a * 3 + 1] * this._normal.y + velocities[a * 3 + 2] * this._normal.z;

                velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * this._normal.x) * this._terrainCollisionRestitution;
                velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * this._normal.y) * this._terrainCollisionRestitution;
                velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * this._normal.z) * this._terrainCollisionRestitution;

                positions[a * 3 + 1] = yTerrain + particleRadius;
            }

            // Check collisions with planes
            for (let i = 0; i < this._collisionPlanes.length; ++i) {
                const plane = this._collisionPlanes[i];
                const dist = plane.normal.x * positions[a * 3 + 0] + plane.normal.y * positions[a * 3 + 1] + plane.normal.z * positions[a * 3 + 2] + plane.d - particleRadius;
                if (dist < 0) {
                    const dotvn = velocities[a * 3 + 0] * plane.normal.x + velocities[a * 3 + 1] * plane.normal.y + velocities[a * 3 + 2] * plane.normal.z;

                    velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * plane.normal.x) * this._terrainCollisionRestitution;
                    velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * plane.normal.y) * this._terrainCollisionRestitution;
                    velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * plane.normal.z) * this._terrainCollisionRestitution;
    
                    positions[a * 3 + 0] -= plane.normal.x * dist;
                    positions[a * 3 + 1] -= plane.normal.y * dist;
                    positions[a * 3 + 2] -= plane.normal.z * dist;
                }
            }
        }
    }
}
