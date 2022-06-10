import * as BABYLON from "@babylonjs/core";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";

export class FluidSimulationDemoMeshSDF extends FluidSimulationDemoBase {
    private _mesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _sceneRenderObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.Scene>
    >;

    constructor(scene: BABYLON.Scene) {
        super(scene);

        this._mesh = null;
        this._sceneRenderObserver = null;
        this._numParticles = 7500;

        this.addCollisionPlane(new BABYLON.Vector3(0, 1, 0), 0.5, 0.3);

        this.addCollisionMesh(
            new BABYLON.Vector3(-0.2, -0.5, -0.6),
            new BABYLON.Vector3(0, -1.2, 0),
            "Dragon_50k.obj",
            "Dragon_50k.sdf",
            3
        );
        //this.addCollisionMesh(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0), "sphere.obj", "sphere.sdf", 0.8);
    }

    public async _run() {
        // Get collision meshes
        this._mesh = this._collisionObjects[1][0];

        // Reset camera
        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 3.12;
            (camera as BABYLON.ArcRotateCamera).beta = 1.19;
            (camera as BABYLON.ArcRotateCamera).radius = 8.4;
        }

        // Simulation parameters
        this._fluidRenderObject.object.particleSize = 0.08;

        this._fluidSim!.smoothingRadius = 0.04;
        this._fluidSim!.densityReference = 20000;
        this._fluidSim!.pressureConstant = 4;
        this._fluidSim!.viscosity = 0.01;
        this._fluidSim!.maxVelocity = 10;
        this._fluidSim!.maxAcceleration = 2000;

        this._shapeCollisionRestitution = 0.8;

        this._particleGenerator!.position.x = 0.0;
        this._particleGenerator!.position.y = 1.8;
        this._particleGenerator!.position.z = -0.1;

        // Move meshes
        this._sceneRenderObserver = this._scene.onBeforeRenderObservable.add(
            () => {
                if (!this._paused && this._mesh) {
                    this._mesh.rotation.y +=
                        (this._engine.getDeltaTime() / 1000) * 3;
                }
            }
        );

        super._run();
    }

    public dispose(): void {
        super.dispose();

        this._scene.onBeforeRenderObservable.remove(this._sceneRenderObserver);
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            restart: () => {
                this._generateParticles();
            },
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "restart").name("Restart");
    }
}
