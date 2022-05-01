import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";

import "./FluidRenderer/fluidRendererSceneComponent";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidSimulator } from "./FluidSimulator/fluidSimulator";

const cameraMin = 0.1;
const cameraMax = 100;

export class FluidRendering implements CreateSceneClass {

    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.TargetCamera;

    constructor() {
        this._engine = null as any;
        this._scene = null as any;
        this._camera = null as any;
    }

    public async createScene(
        engine: BABYLON.Engine,
        canvas: HTMLCanvasElement
    ): Promise<BABYLON.Scene> {

        const scene = new BABYLON.Scene(engine);

        this._engine = engine;
        this._scene = scene;

        const liquidRendering = true;
        const showObstacle = false;

        // Setup environment
        const dirLight = new BABYLON.Vector3(-2, -1, 1).normalize();
        new BABYLON.DirectionalLight("dirLight", dirLight, scene);        

        scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.env", scene);
        //scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);
        //scene.environmentTexture = new BABYLON.HDRCubeTexture("temp/uffizi_probe.hdr", scene, 512, false, true, false, true);

        scene.createDefaultSkybox(scene.environmentTexture);

        const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, Math.PI/2.4, 2.5, new BABYLON.Vector3(0, 0, 0), scene);
        camera.fov = 60 * Math.PI/180;
        camera.attachControl(canvas, true);
        camera.minZ = cameraMin;
        camera.maxZ = cameraMax;
        camera.wheelPrecision = 50;

        if (showObstacle) {
            const plane = BABYLON.MeshBuilder.CreatePlane("plane", { size: 15 }, scene);
            plane.position.z = -3;
        }

        if (liquidRendering) {
            const fluidRenderer = scene.enableFluidRenderer();

            scene.activeCamera = camera;

            const ppFXAA = new BABYLON.FxaaPostProcess("Fxaa", 1, camera);
            ppFXAA.autoClear = false;

            const numX = 7, numY = 8 * 5, numZ = 7;

            const numParticles = numX * numY * numZ;
            const positions = new Float32Array(numParticles * 3);

            const particleRadius = 0.02;
            let idx = 0;
            for (let x = 0; x < numX; ++x) {
                for (let y = 0; y < numY; ++y) {
                    for (let z = 0; z < numZ; ++z) {
                        //positions[idx * 3 + 0] = (Math.random() - 0.5) * numX * particleRadius * 2;
                        //positions[idx * 3 + 1] = Math.random() * numY * particleRadius * 2;
                        //positions[idx * 3 + 2] = (Math.random() - 0.5) * numZ * particleRadius * 2 + ofsZ;
                        positions[idx * 3 + 0] = (x - numX / 2) * particleRadius * 2;
                        positions[idx * 3 + 1] = y * particleRadius * 2 + 1;
                        positions[idx * 3 + 2] = (z - numZ / 2) * particleRadius * 2;
                        idx++;
                    }
                }
            }

            const fluidSim = new FluidSimulator(numParticles, engine, positions);

            fluidSim.smoothingRadius = particleRadius * 2;

            (window as any).fsim = fluidSim;

            const entity = fluidRenderer?.addVertexBuffer({ position: fluidSim.positionVertexBuffer }, numParticles, false);

            if (entity) {
                entity.targetRenderer.enableBlurDepth = true;
                entity.targetRenderer.blurDepthFilterSize = 8;
                entity.targetRenderer.blurDepthDepthScale = 5;
                entity.targetRenderer.fresnelClamp = 0.2;
                entity.targetRenderer.fluidColor = new BABYLON.Color3(0.011126082368383245*5*3, 0.05637409755197975*5*3, 0.09868919754109445*5*3);
                entity.targetRenderer.fluidColor = new BABYLON.Color3(1 - 0.5, 1 - 0.2, 1 - 0.05);
                entity.targetRenderer.density = 2;
                entity.targetRenderer.specularPower = 200;
                entity.targetRenderer.thicknessMapSize = 1024;
                entity.targetRenderer.blurThicknessFilterSize = 10;
                entity.targetRenderer.blurThicknessNumIterations = 2;
                entity.object.particleSize = particleRadius * 2.0 * 2;
                entity.object.particleThicknessAlpha = particleRadius * 2 * 2;
            }

            (window as any).doit = () => {
                scene.onBeforeRenderObservable.add(() => {
                    const numIter = 1;
                    const delta = 3.5 / 1000 / 1;
                    for (let i = 0; i < numIter; ++i) {
                        fluidSim.update(delta);
                    }
                });
            };

            new FluidRendererGUI(this._scene, false);

            scene.activeCamera = camera;
        }

        return scene;
    }

}

export default new FluidRendering();
