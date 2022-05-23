import * as BABYLON from "@babylonjs/core";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";

// Table from YouniqueĪdeaStudio (https://sketchfab.com/3d-models/simple-round-table-obj-6083c7dd80034ed5a6425a5fe7bcdf9a)
import tableScene from "../assets/scenes/simple_round_table.glb";

export class FluidSimulationDemoGlass extends FluidSimulationDemoBase {
    private _boxMesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _boxMaterial: BABYLON.Nullable<BABYLON.PBRMaterial>;
    private _cylMesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _cylMeshOfst: BABYLON.Vector3;
    private _footMesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _footMeshOfst: BABYLON.Vector3;
    private _sceneRenderObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.Scene>
    >;

    constructor(scene: BABYLON.Scene) {
        super(scene);

        this._environmentFile = "Country";
        this._sceneRenderObserver = null;
        this._boxMesh = null;
        this._boxMaterial = null;

        this.addCollisionVerticalCylinder(
            new BABYLON.Vector3(0.0, -(1.9 + 0.04 - 0.2 + 0.15), 0.0),
            new BABYLON.Vector3(0, 0, 0),
            2.2,
            0.12,
            16,
            null,
            0.3,
            true
        );

        this.addCollisionPlane(new BABYLON.Vector3(0, 1, 0), 6, 0.3);

        this._boxMesh = this.addCollisionCutHollowSphere(
            new BABYLON.Vector3(0.0, 0.2, 0.0),
            new BABYLON.Vector3(0, 0, 0),
            0.5,
            0.2,
            0.02,
            16,
            new BABYLON.Vector3(0, 1, 0)
        )[0]!;

        this._footMeshOfst = new BABYLON.Vector3(0, -1.9, 0);
        this._footMesh = this.addCollisionVerticalCylinder(
            new BABYLON.Vector3(0.0, -1.7 - 0.04 / 2, 0.0),
            new BABYLON.Vector3(0, 0, 0),
            0.4,
            0.04,
            16,
            null,
            0.6
        )[0]!;

        this._cylMeshOfst = new BABYLON.Vector3(0, -1.2, 0);
        this._cylMesh = this.addCollisionVerticalCylinder(
            new BABYLON.Vector3(0.0, -1.0, 0.0),
            new BABYLON.Vector3(0, 0, 0),
            0.05,
            1.4,
            16,
            null,
            0.6
        )[0]!;
    }

    public async run() {
        // Reset camera
        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 3.09;
            (camera as BABYLON.ArcRotateCamera).beta = 1.41;
            (camera as BABYLON.ArcRotateCamera).radius = 6.42;
        }

        // Simulation parameters
        this._fluidRenderObject.object.particleSize = 0.08;
        this._fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(
            251 / 255,
            218 / 255,
            218 / 255
        );

        this._fluidSim!.smoothingRadius = 0.04;
        this._fluidSim!.densityReference = 20000;
        this._fluidSim!.pressureConstant = 4;
        this._fluidSim!.viscosity = 0.01;
        this._fluidSim!.maxVelocity = 10;
        this._fluidSim!.maxAcceleration = 2000;
        this._fluidSim!.minTimeStep = 0.1;
        this._fluidSim!.gravity.y = -9.81;

        this._shapeCollisionRestitution = 0.95;

        this._particleGenerator!.position.x = 0.15;
        this._particleGenerator!.position.y = 0.8;
        this._particleGenerator!.position.z = -0.1;

        // Create materials
        this._boxMaterial = new BABYLON.PBRMaterial("BoxMeshMat", this._scene);
        this._boxMaterial.metallic = 0.3;
        this._boxMaterial.roughness = 0;
        this._boxMaterial.alpha = 0.2;
        this._boxMaterial.backFaceCulling = false;

        this._boxMesh!.material = this._boxMaterial;
        this._cylMesh!.material = this._boxMaterial.clone("cloned");
        this._cylMesh!.material.alpha = 1;
        this._footMesh!.material = this._cylMesh!.material;

        this._sceneRenderObserver = this._scene.onBeforeRenderObservable.add(
            () => {
                this._cylMesh!.position.copyFrom(this._boxMesh!.position);
                this._cylMesh!.position.addInPlace(this._cylMeshOfst);
                this._footMesh!.position.copyFrom(this._boxMesh!.position);
                this._footMesh!.position.addInPlace(this._footMeshOfst);
            }
        );

        super.run();

        await BABYLON.SceneLoader.AppendAsync("", tableScene, this._scene);

        const table = this._scene.getMeshByName("Object_3")!;

        table.scaling.setAll(6);
        table.position.set(-2.3, -2, -5.54);
    }

    public dispose(): void {
        super.dispose();

        this._scene.onBeforeRenderObservable.remove(this._sceneRenderObserver);

        this._scene.getMeshByName("__root__")?.dispose(false, true);

        this._boxMesh?.dispose();
        this._boxMaterial?.dispose();
        this._cylMesh?.material?.dispose();
        this._cylMesh?.dispose();
        this._footMesh?.dispose();
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            restart: () => {
                this._generateParticles();
            },
            boxOpacity: this._boxMaterial!.alpha,
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "restart").name("Restart");

        mainMenu
            .add(params, "boxOpacity", 0, 1, 0.01)
            .name("Box opacity")
            .onChange((value: any) => {
                this._boxMaterial!.alpha = value;
            });
    }
}
