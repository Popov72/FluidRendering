import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";

import "./FluidRenderer/fluidRendererSceneComponent";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidSimulator } from "./FluidSimulator/fluidSimulator";

const cameraMin = 0.2;
const cameraMax = 2.1;

declare module "@babylonjs/core/Particles/IParticleSystem" {
    export interface IParticleSystem {
        renderAsFluid: boolean;
    }
}

declare module "@babylonjs/core/Particles/ParticleSystem" {
    export interface ParticleSystem {
        /** @hidden (Backing field) */
        _renderAsFluid: boolean;

        renderAsFluid: boolean;
    }
}

Object.defineProperty(BABYLON.ParticleSystem.prototype, "renderAsFluid", {
    get: function (this: BABYLON.ParticleSystem) {
        return this._renderAsFluid;
    },
    set: function (this: BABYLON.ParticleSystem, value: boolean) {
        this._renderAsFluid = value;
        this._scene?.fluidRenderer?.collectParticleSystems();
    },
    enumerable: true,
    configurable: true
});

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

        const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, Math.PI/2.4, 30/20, new BABYLON.Vector3(0, 0, 0), scene);
        camera.fov = 60 * Math.PI/180;
        camera.attachControl(canvas, true);
        camera.minZ = cameraMin;
        camera.maxZ = cameraMax;

        if (showObstacle) {
            const plane = BABYLON.MeshBuilder.CreatePlane("plane", { size: 15 }, scene);
            plane.position.z = -3;
        }

        if (liquidRendering) {
            const fluidRenderer = scene.enableFluidRenderer();

            scene.activeCamera = camera;

            new BABYLON.FxaaPostProcess("Fxaa", 1, camera);

            const numX = 7, numY = 7 * 3, numZ = 7;

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
                        positions[idx * 3 + 1] = y * particleRadius * 2;
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
                entity.targetRenderer.enableBlur = true;
                entity.targetRenderer.checkMaxLengthThreshold = false;
                entity.targetRenderer.useMinZDiff = true;
                entity.targetRenderer.checkNonBlurredDepth = false;
                entity.targetRenderer.useLinearZ = true;
                entity.targetRenderer.blurKernel = 40;
                entity.targetRenderer.blurScale = 0.1;
                entity.targetRenderer.blurDepthScale = 1.575;
                entity.object.particleSize = particleRadius * 2;
                entity.object.particleThicknessAlpha = 0.3;//0.066;
            }

            (window as any).doit = () => {
                scene.onBeforeRenderObservable.add(() => {
                    const numIter = 10;
                    const delta = 1 / 2000;
                    for (let i = 0; i < numIter; ++i) {
                        fluidSim.update(delta);
                    }
                });
            };

            new FluidRendererGUI(this._scene);

            scene.activeCamera = camera;
        }

        return scene;
    }

}

export default new FluidRendering();
