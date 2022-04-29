import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

import "./FluidRenderer/fluidRendererSceneComponent";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidSimulator, IFluidParticle } from "./FluidSimulator2/fluidSimulator";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";
import { IFluidRenderingRenderObject } from "./FluidRenderer/fluidRenderer";
import { FluidRenderingTargetRenderer } from "./FluidRenderer/fluidRenderingTargetRenderer";

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

        (window as any).BABYLON = BABYLON;

        scene.createDefaultSkybox(scene.environmentTexture);

        const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 3.06, 1.14, 2.96, new BABYLON.Vector3(0, 0, 0), scene);
        camera.fov = 60 * Math.PI/180;
        camera.attachControl(canvas, true);
        camera.minZ = cameraMin;
        camera.maxZ = cameraMax;
        camera.wheelPrecision = 50;

        const cameraFront = new BABYLON.ArcRotateCamera("ArcRotateCameraGUI", 0, 0, 1, new BABYLON.Vector3(0, 0, 0), scene);
        cameraFront.layerMask = 0x10000000;

        scene.activeCameras = [camera, cameraFront];

        if (showObstacle) {
            const plane = BABYLON.MeshBuilder.CreatePlane("plane", { size: 15 }, scene);
            plane.position.z = -3;
        }

        if (liquidRendering) {
            const fluidRenderer = scene.enableFluidRenderer();

            scene.activeCamera = camera;

            const numX = 10, numY = 10, numZ = 10 * 2.5;

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
                                velocityZ: (Math.random() - 1.0) * 0.03 - 2.4,
                                mass: 1,
                            });
                        }
                    }
                }

                currNumParticles = 0;
                t = 0;

                fluidRendererGUI?.dispose();

                let currentTargetRenderer: FluidRenderingTargetRenderer | undefined = undefined;

                if (fluidRenderObject) {
                    currentTargetRenderer = fluidRenderObject.targetRenderer;
                    fluidRenderer?.removeRenderObject(fluidRenderObject, false);
                }

                fluidSim?.dispose();

                fluidSim = new FluidSimulator(particles, engine, positions);

                fluidSim.smoothingRadius = particleRadius * 2;
                fluidSim.currentNumParticles = currNumParticles;
                fluidSim.checkXZBounds = checkBounds;

                (window as any).fsim = fluidSim;

                const vbPositions = new BABYLON.VertexBuffer(engine, fluidSim.positions, BABYLON.VertexBuffer.PositionKind, true, false, 3, true);
                const vbVelocities = new BABYLON.VertexBuffer(engine, fluidSim.velocities, "velocity", true, false, 3, true);

                fluidRenderObject = fluidRenderer?.addVertexBuffer({ position: vbPositions, velocity: vbVelocities }, currNumParticles, false, currentTargetRenderer, camera);

                if (fluidRenderObject) {
                    if (!currentTargetRenderer) {
                        fluidRenderObject.targetRenderer.enableBlurDepth = true;
                        fluidRenderObject.targetRenderer.blurDepthFilterSize = 8;
                        fluidRenderObject.targetRenderer.blurDepthNumIterations = 3;
                        fluidRenderObject.targetRenderer.blurDepthDepthScale = 5;
                        //fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(0.011126082368383245*5*3, 0.05637409755197975*5*3, 1);
                        fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(1 - 0.5, 1 - 0.2, 1 - 0.05);
                        fluidRenderObject.targetRenderer.density = 2;
                        fluidRenderObject.targetRenderer.specularPower = 200;
                        fluidRenderObject.targetRenderer.thicknessMapSize = 256;
                        fluidRenderObject.targetRenderer.dirLight = new BABYLON.Vector3(2, -1, 1);
                    }
                    fluidRenderObject.object.particleSize = particleRadius * 2.0 * 2;
                    fluidRenderObject.object.particleThicknessAlpha = particleRadius;
                    fluidRenderObject.object.useVelocity = fluidRenderObject.targetRenderer.useVelocity;
                }

                fluidRendererGUI = new FluidRendererGUI(this._scene, false);
            }

            createSimulator();

            scene.onBeforeRenderObservable.add(() => {
                if (fluidSim && fluidRenderObject) {
                    if (currNumParticles === 0) {
                        currNumParticles += numX * numY;
                    } else if (currNumParticles < numParticles) {
                        const px1 = fluidSim.positions[currNumParticles * 3 + 0];
                        const py1 = fluidSim.positions[currNumParticles * 3 + 1];
                        const pz1 = fluidSim.positions[currNumParticles * 3 + 2];

                        const px2 = fluidSim.positions[(currNumParticles - numX * numY) * 3 + 0];
                        const py2 = fluidSim.positions[(currNumParticles - numX * numY) * 3 + 1];
                        const pz2 = fluidSim.positions[(currNumParticles - numX * numY) * 3 + 2];

                        const dist = Math.sqrt((px1 - px2) * (px1 - px2) + (py1 - py2) * (py1 - py2) + (pz1 - pz2) * (pz1 - pz2));

                        if (dist > fluidSim.smoothingRadius) {
                            currNumParticles += numX * numY;
                        }
                    }
                    fluidSim.currentNumParticles = currNumParticles;
                    (fluidRenderObject.object as FluidRenderingObjectVertexBuffer).setNumParticles(currNumParticles);
                
                    fluidSim.update(8 / 1000/*this._engine.getDeltaTime() / 1000*/);
                    if (fluidRenderObject) {
                        fluidRenderObject.object.vertexBuffers["position"].updateDirectly(fluidSim.positions, 0);
                        fluidRenderObject.object.vertexBuffers["velocity"].updateDirectly(fluidSim.velocities, 0);
                    }
                }
            });

            const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
            advancedTexture.layer!.layerMask = 0x10000000;

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
