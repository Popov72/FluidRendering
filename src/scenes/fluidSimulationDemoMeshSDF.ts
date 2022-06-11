import * as BABYLON from "@babylonjs/core";
//import * as BABYLONSER from "@babylonjs/serializers";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";

// High heels model by cebraVFX found on Sketchfab (https://sketchfab.com/3d-models/high-heels-1561c09fc45349d680e48e3e007b64e0)
export class FluidSimulationDemoMeshSDF extends FluidSimulationDemoBase {
    private _sceneRenderObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.Scene>
    >;
    private _meshName: string;

    constructor(scene: BABYLON.Scene) {
        super(scene);

        this._environmentFile = "Parking";
        this._meshName = null as any;

        this._sceneRenderObserver = null;
        this._numParticles = 7500;

        this.addCollisionPlane(new BABYLON.Vector3(0, 1, 0), 0.5, 0.3);

        this._addMesh("High heels");
    }

    protected async _addMesh(name: string, waitForReadiness = false) {
        this._meshName = name;

        switch (name) {
            case "High heels":
                this.addCollisionMesh(
                    new BABYLON.Vector3(0.85, -0.5, 0),
                    new BABYLON.Vector3(0, 0, 0),
                    "high_heels.obj",
                    "high_heels.sdf",
                    false,
                    0.03
                );
                break;
            case "Dragon":
                this.addCollisionMesh(
                    new BABYLON.Vector3(-0.1, -0.5, -2.4),
                    new BABYLON.Vector3(0, -1.0, 0),
                    "Dragon_50k.obj",
                    "Dragon_50k.sdf",
                    true,
                    3
                );
                break;
        }

        if (waitForReadiness) {
            this._collisionObjects = await Promise.all(
                this._collisionObjectPromises
            );
        }
    }

    public async _run() {
        /*for (let i = 2; i <= 17; ++i) {
            const m = this._scene.meshes[i] as BABYLON.Mesh;
            m.bakeCurrentTransformIntoVertices();
            m.parent = null;
            m.scaling.setAll(10);
            m.bakeCurrentTransformIntoVertices();
        }

        const mm = BABYLON.Mesh.MergeMeshes([
            this._scene.meshes[2] as BABYLON.Mesh,
            this._scene.meshes[3] as BABYLON.Mesh,
            this._scene.meshes[4] as BABYLON.Mesh,
            this._scene.meshes[5] as BABYLON.Mesh,
            this._scene.meshes[6] as BABYLON.Mesh,
            this._scene.meshes[7] as BABYLON.Mesh,
            this._scene.meshes[8] as BABYLON.Mesh,
            this._scene.meshes[9] as BABYLON.Mesh,
            this._scene.meshes[10] as BABYLON.Mesh,
            this._scene.meshes[11] as BABYLON.Mesh,
            this._scene.meshes[12] as BABYLON.Mesh,
            this._scene.meshes[13] as BABYLON.Mesh,
            this._scene.meshes[14] as BABYLON.Mesh,
            this._scene.meshes[15] as BABYLON.Mesh,
            this._scene.meshes[16] as BABYLON.Mesh,
            this._scene.meshes[17] as BABYLON.Mesh,
        ], false, true, undefined, false, false);

        console.log(BABYLONSER.OBJExport.OBJ([mm!]));

        mm?.dispose();*/

        // Reset camera
        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 2.62;
            (camera as BABYLON.ArcRotateCamera).beta = 1.11;
            (camera as BABYLON.ArcRotateCamera).radius = 8.4;
        }

        // Simulation parameters
        this._fluidRenderObject.object.particleSize = 0.08;

        this._fluidSim!.smoothingRadius = 0.04;
        this._fluidSim!.densityReference = 20000;
        this._fluidSim!.pressureConstant = 4;
        this._fluidSim!.viscosity = 0.005;
        this._fluidSim!.maxVelocity = 10;
        this._fluidSim!.maxAcceleration = 2000;

        this._shapeCollisionRestitution = 0.99;

        this._particleGenerator!.position.x = 0.2;
        this._particleGenerator!.position.y = 2.8;
        this._particleGenerator!.position.z = -1.5;

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
            meshname: this._meshName,
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "restart").name("Restart");

        mainMenu
            .add(params, "meshname", ["Dragon", "High heels"])
            .name("Name")
            .onChange((value: any) => {
                this.disposeCollisionObject(this._collisionObjects.length - 1);
                this._addMesh(value, true);
            });
    }
}
