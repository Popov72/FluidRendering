import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

import "./FluidRenderer/fluidRendererSceneComponent";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidSimulator, IFluidParticle } from "./FluidSimulator2/fluidSimulator";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";
import { IFluidRenderingRenderObject } from "./FluidRenderer/fluidRenderer";

const cameraMin = 0.1;
const cameraMax = 100;

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

        (window as any).BABYLON = BABYLON;

        scene.createDefaultSkybox(scene.environmentTexture);

        const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, Math.PI/3.0, 30/20, new BABYLON.Vector3(0, 0, 0), scene);
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

            new BABYLON.FxaaPostProcess("Fxaa", 1, camera);

            const numX = 10, numY = 10, numZ = 10 * 5;

            const numParticles = numX * numY * numZ;

            let currNumParticles = 0;
            let fluidSim: BABYLON.Nullable<FluidSimulator> = null;
            let fluidRenderObject: IFluidRenderingRenderObject | undefined = undefined;
            let fluidRendererGUI: FluidRendererGUI | undefined = undefined;
            let checkBounds = true;
            let t = 0;

            const createSimulator = () => {
                const positions = new Float32Array(numParticles * 3);

                const particles: IFluidParticle[] = [];
                const particleRadius = 0.02;
                let idx = 0;
                for (let z = 0; z < numZ; ++z) {
                    for (let y = 0; y < numY; ++y) {
                        for (let x = 0; x < numX; ++x) {
                            positions[idx * 3 + 0] = (x - numX / 2) * particleRadius * 2;
                            positions[idx * 3 + 1] = (y - numY / 2) * particleRadius * 2 + 0.5;
                            positions[idx * 3 + 2] = 0.49;//z * particleRadius * 2;
                            idx++;
                            particles.push({
                                density: 0,
                                pressure: 0,
                                accelX: 0,
                                accelY: 0,
                                accelZ: 0,
                                velocityX: (Math.random() - 0.5) * 0.03,
                                velocityY: (Math.random() - 0.5) * 0.03,
                                velocityZ: (Math.random() - 1.0) * 0.03 - 1.4,
                                mass: 1,
                            });
                        }
                    }
                }

                currNumParticles = 0;
                t = 0;

                fluidRendererGUI?.dispose();

                if (fluidRenderObject) {
                    fluidRenderer?.removeRenderObject(fluidRenderObject);
                }

                fluidSim?.dispose();

                fluidSim = new FluidSimulator(particles, engine, positions);

                fluidSim.smoothingRadius = particleRadius * 2;
                fluidSim.currentNumParticles = currNumParticles;
                fluidSim.checkXZBounds = checkBounds;

                (window as any).fsim = fluidSim;

                fluidRenderObject = fluidRenderer?.addVertexBuffer({ position: fluidSim.positionVertexBuffer }, currNumParticles, false);

                if (fluidRenderObject) {
                    fluidRenderObject.targetRenderer.enableBlur = true;
                    fluidRenderObject.targetRenderer.blurFilterSize = 10;
                    fluidRenderObject.targetRenderer.blurDepthScale = 5;
                    //fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(0.011126082368383245*5*3, 0.05637409755197975*5*3, 1);
                    fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(1 - 0.5, 1 - 0.2, 1 - 0.05);
                    fluidRenderObject.targetRenderer.density = 2;
                    fluidRenderObject.targetRenderer.specularPower = 200;
                    fluidRenderObject.object.particleSize = particleRadius * 2.0 * 2;
                    fluidRenderObject.object.particleThicknessAlpha = particleRadius;
                }

                fluidRendererGUI = new FluidRendererGUI(this._scene, false);
            }

            createSimulator();

            scene.onBeforeRenderObservable.add(() => {
                if (fluidSim && fluidRenderObject) {
                    if (currNumParticles < numParticles && (t++ % 8) === 0) {
                        currNumParticles += 100;
                    }
                    fluidSim.currentNumParticles = currNumParticles;
                    (fluidRenderObject.object as FluidRenderingObjectVertexBuffer).setNumParticles(currNumParticles);
                
                    const numIter = 1;
                    const delta = 3.5 / 1000;
                    for (let i = 0; i < numIter; ++i) {
                        fluidSim.update(delta);
                    }
                }
            });

            const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

            const panel = new GUI.StackPanel();
            panel.width = "200px";
            panel.isVertical = true;
            panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
            advancedTexture.addControl(panel);
        
            const btnRestart = GUI.Button.CreateSimpleButton("btnRestart", "Restart");
            btnRestart.width = "150px"
            btnRestart.height = "40px";
            btnRestart.color = "white";
            btnRestart.cornerRadius = 20;
            btnRestart.background = "green";
            btnRestart.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            btnRestart.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
            btnRestart.onPointerUpObservable.add(function() {
                createSimulator();
            });
            panel.addControl(btnRestart);

            const stkCheckBounds = GUI.Checkbox.AddCheckBoxWithHeader("Check bounds", (v) => {
                checkBounds = v;
                if (fluidSim) {
                    fluidSim.checkXZBounds = v;
                }
            });
            stkCheckBounds.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            stkCheckBounds.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

            panel.addControl(stkCheckBounds);
        }

        return scene;
    }

}

export default new FluidRendering();
