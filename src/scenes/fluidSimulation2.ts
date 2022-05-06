import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";

import "./FluidRenderer/fluidRendererSceneComponent";

import { FluidSimulationDemoBoxSphere } from "./fluidSimulationDemoBoxSphere";
import { FluidSimulationDemoHeightMap } from "./fluidSimulationDemoHeightMap";
import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";
import { FluidSimulationDemoPrecomputeRendering } from "./fluidSimulationPrecomputeRendering";

const cameraMin = 0.1;
const cameraMax = 100;

export class FluidRendering implements CreateSceneClass {

    private _scene: BABYLON.Scene;

    constructor() {
        this._scene = null as any;
    }

    public async createScene(
        engine: BABYLON.Engine,
        canvas: HTMLCanvasElement
    ): Promise<BABYLON.Scene> {

        const scene = new BABYLON.Scene(engine);

        this._scene = scene;

        // Setup environment
        scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.env", scene);
        //scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);

        (window as any).BABYLON = BABYLON;

        scene.createDefaultSkybox(scene.environmentTexture);

        const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 3.06, 1.14, 2.96, new BABYLON.Vector3(0, 0, 0), scene);
        camera.fov = 60 * Math.PI / 180;
        camera.attachControl();
        camera.minZ = cameraMin;
        camera.maxZ = cameraMax;
        camera.wheelPrecision = 50;

        scene.activeCamera = camera;

        (camera.inputs as BABYLON.ArcRotateCameraInputsManager).removeByType("ArcRotateCameraKeyboardMoveInput");

        /*const cameraFront = new BABYLON.ArcRotateCamera("ArcRotateCameraGUI", 3.06, 1.14, 2.96, new BABYLON.Vector3(0, 0, 0), scene);
        cameraFront.layerMask = 0x10000000;

        scene.activeCameras = [camera, cameraFront];

        this._scene.cameraToUseForPointers = camera;*/

        FluidSimulationDemoBase.AddDemo("Precomputed particles - rendering only", () => new FluidSimulationDemoPrecomputeRendering(scene));
        FluidSimulationDemoBase.AddDemo("Box and sphere", () => new FluidSimulationDemoBoxSphere(scene));
        FluidSimulationDemoBase.AddDemo("Height map", () => new FluidSimulationDemoHeightMap(scene));

        FluidSimulationDemoBase.StartDemo(0);

        return scene;
    }

}

export default new FluidRendering();
