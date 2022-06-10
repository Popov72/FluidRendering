import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";

import "./FluidRenderer/fluidRendererSceneComponent";

import { FluidSimulationDemoBoxSphere } from "./fluidSimulationDemoBoxSphere";
import { FluidSimulationDemoHeightMap } from "./fluidSimulationDemoHeightMap";
import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";
import { FluidSimulationDemoPrecomputeRendering } from "./fluidSimulationDemoPrecomputeRendering";
import { FluidSimulationDemoParticleSystem } from "./fluidSimulationDemoParticleSystem";
import { FluidSimulationDemoParticleCustomShape } from "./fluidSimulationDemoParticleCustomShape";
import { FluidSimulationDemoGlass } from "./fluidSimulationDemoGlass";
import { FluidSimulationDemoMeshSDF } from "./fluidSimulationDemoMeshSDF";

const cameraMin = 0.1;
const cameraMax = 1000;

export class FluidRendering implements CreateSceneClass {
    private _scene: BABYLON.Scene;

    constructor() {
        this._scene = null as any;
    }

    public async createScene(
        engine: BABYLON.Engine,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        canvas: HTMLCanvasElement
    ): Promise<BABYLON.Scene> {
        const scene = new BABYLON.Scene(engine);

        this._scene = scene;

        (window as any).BABYLON = BABYLON;

        const createCamera = () => {
            const camera = new BABYLON.ArcRotateCamera(
                "ArcRotateCamera",
                3.06,
                1.14,
                2.96,
                new BABYLON.Vector3(0, 0, 0),
                scene
            );
            camera.fov = (60 * Math.PI) / 180;
            camera.attachControl();
            camera.minZ = cameraMin;
            camera.maxZ = cameraMax;
            camera.wheelPrecision = 50;
            camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

            return camera;
        };

        const camera = createCamera();

        scene.activeCamera = camera;

        FluidSimulationDemoBase.AddDemo(
            "Particle system",
            () => new FluidSimulationDemoParticleSystem(scene)
        );
        FluidSimulationDemoBase.AddDemo(
            "Particle custom shape",
            () => new FluidSimulationDemoParticleCustomShape(scene)
        );
        FluidSimulationDemoBase.AddDemo(
            "Precomputed particles - rendering only",
            () => new FluidSimulationDemoPrecomputeRendering(scene)
        );
        FluidSimulationDemoBase.AddDemo(
            "Box, sphere and wall",
            () => new FluidSimulationDemoBoxSphere(scene)
        );
        FluidSimulationDemoBase.AddDemo(
            "Height map",
            () => new FluidSimulationDemoHeightMap(scene)
        );
        FluidSimulationDemoBase.AddDemo(
            "Glass",
            () => new FluidSimulationDemoGlass(scene)
        );
        FluidSimulationDemoBase.AddDemo(
            "Mesh SDF",
            () => new FluidSimulationDemoMeshSDF(scene)
        );

        FluidSimulationDemoBase.StartDemo(3);

        return scene;
    }
}

export default new FluidRendering();
