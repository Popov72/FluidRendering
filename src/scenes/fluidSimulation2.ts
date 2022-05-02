import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

import "./FluidRenderer/fluidRendererSceneComponent";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidSimulator, IFluidParticle } from "./FluidSimulator2/fluidSimulator";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";
import { IFluidRenderingRenderObject } from "./FluidRenderer/fluidRenderer";
import { FluidRenderingTargetRenderer } from "./FluidRenderer/fluidRenderingTargetRenderer";

import marbleBaseColor from "../assets/materials/Marble08_1K_BaseColor.png";

const cameraMin = 0.1;
const cameraMax = 100;

export class FluidRendering implements CreateSceneClass {

    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.TargetCamera;
    private _checkXZBounds: boolean;
    private _spherePos: BABYLON.Vector3;
    private _sphereRadius: number;
    private _sphereMesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _sphereMaterial: BABYLON.Nullable<BABYLON.PBRMaterial>;
    private _boxMin: BABYLON.Vector3;
    private _boxMax: BABYLON.Vector3;
    private _boxMesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _boxMaterial: BABYLON.Nullable<BABYLON.PBRMaterial>;
    private _origCollisionPlanes: Array<BABYLON.Plane>;
    private _collisionPlanes: Array<BABYLON.Plane>;
    private _collisionPlanesFloorOnly: Array<BABYLON.Plane>;
    private _angleX: number;
    private _angleY: number;

    constructor() {
        this._engine = null as any;
        this._scene = null as any;
        this._camera = null as any;
        this._checkXZBounds = true;
        this._sphereRadius = 0.2;
        this._sphereMesh = null;
        this._sphereMaterial = null;
        this._boxMin = new BABYLON.Vector3(-0.3, -0.3, -0.7);
        this._boxMax = new BABYLON.Vector3( 0.3,  1.2,  0.7);
        this._spherePos = new BABYLON.Vector3((this._boxMin.x + this._boxMax.x) / 2, this._boxMin.y + this._sphereRadius, (this._boxMin.z + this._boxMax.z) / 2 - 0.1);
        this._boxMesh = null;
        this._boxMaterial = null;
        this._origCollisionPlanes = [
            new BABYLON.Plane(0, 0, -1, Math.abs(this._boxMax.z)),
            new BABYLON.Plane(0, 0, 1, Math.abs(this._boxMin.z)),
            new BABYLON.Plane(1, 0, 0, Math.abs(this._boxMin.x)),
            new BABYLON.Plane(-1, 0, 0, Math.abs(this._boxMax.x)),
            new BABYLON.Plane(0, -1, 0, Math.abs(this._boxMax.y)),
            new BABYLON.Plane(0, 1, 0, Math.abs(this._boxMin.y)),
        ];
        this._collisionPlanes = [];
        for (let i = 0; i < this._origCollisionPlanes.length; ++i) {
            this._collisionPlanes[i] = this._origCollisionPlanes[i].clone();
        }
        this._collisionPlanesFloorOnly = [
            this._origCollisionPlanes[5].clone(),
        ];
        this._angleX = 0;
        this._angleY = 0;
    }

    public async createScene(
        engine: BABYLON.Engine,
        canvas: HTMLCanvasElement
    ): Promise<BABYLON.Scene> {

        const scene = new BABYLON.Scene(engine);

        this._engine = engine;
        this._scene = scene;

        const liquidRendering = true;

        this._sphereMaterial = new BABYLON.PBRMaterial("collisionMeshMat", this._scene);
        this._sphereMaterial.metallic = 1;
        this._sphereMaterial.roughness = 0.05;
        this._sphereMaterial.albedoTexture = new BABYLON.Texture(marbleBaseColor, this._scene);
        this._sphereMaterial.cullBackFaces = true;

        this._boxMaterial = new BABYLON.PBRMaterial("BoxMeshMat", this._scene);
        this._boxMaterial.metallic = 0.3;
        this._boxMaterial.roughness = 0;
        this._boxMaterial.alpha = 0.2;
        this._boxMaterial.backFaceCulling = false;

        // Setup environment
        scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.env", scene);
        //scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);

        (window as any).BABYLON = BABYLON;

        scene.createDefaultSkybox(scene.environmentTexture);

        const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 3.06, 1.14, 2.96, new BABYLON.Vector3(0, 0, 0), scene);
        camera.fov = 60 * Math.PI/180;
        camera.attachControl();
        camera.minZ = cameraMin;
        camera.maxZ = cameraMax;
        camera.wheelPrecision = 50;

        (camera.inputs as BABYLON.ArcRotateCameraInputsManager).removeByType("ArcRotateCameraKeyboardMoveInput");

        const cameraFront = new BABYLON.ArcRotateCamera("ArcRotateCameraGUI", 3.06, 1.14, 2.96, new BABYLON.Vector3(0, 0, 0), scene);
        cameraFront.layerMask = 0x10000000;

        scene.activeCameras = [camera, cameraFront];

        this._scene.cameraToUseForPointers = camera;

        if (liquidRendering) {
            const fluidRenderer = scene.enableFluidRenderer();

            scene.activeCamera = camera;

            const dimX = 12, dimY = 12;
            const numMaxParticles = 2700;
            const particleRadius = 0.02;

            let numParticles = 0;
            let numCrossSection = 0;

            let fluidSim: BABYLON.Nullable<FluidSimulator> = null;
            let fluidRenderObject: IFluidRenderingRenderObject | undefined = undefined;
            let fluidRendererGUI: FluidRendererGUI | undefined = undefined;

            let currNumParticles = 0;
            let paused = false;

            this._createMesh();

            const createSimulator = () => {
                const particlePos = [];
                const particles: IFluidParticle[] = [];

                numParticles = 0;

                const distance = particleRadius * 2;
                const jitter = distance * 0.1;
                const getJitter = () => Math.random() * jitter - jitter / 2;

                while (numParticles <= numMaxParticles - numCrossSection) {
                    let yCoord = 0.5 + (dimY / 2) * distance;

                    numCrossSection = 0;
                    for (let y = 1; y < dimY - 1; ++y) {
                        const angle = y * Math.PI / (dimY - 1);

                        let x2 = Math.sin(angle) * dimX / 2 * distance;
                        if (x2 < 0) { x2 = 0; }

                        let xCoord = -x2;
                        while (xCoord <= x2) {
                            const xc = xCoord === -x2 || xCoord + distance > x2 ? xCoord : xCoord + getJitter();
                            const yc = xCoord === -x2 || xCoord + distance > x2 ? yCoord : yCoord + getJitter();
                            const zCoord = xCoord === -x2 || xCoord + distance > x2 ? 0.49 : 0.49 + getJitter();
                            particlePos.push(xc, yc, zCoord);
                            particles.push({
                                density: 0,
                                pressure: 0,
                                accelX: 0,
                                accelY: 0,
                                accelZ: 0,
                                velocityX: (Math.random() - 0.5) * 0.03,
                                velocityY: (Math.random() - 0.5) * 0.03,
                                velocityZ: (Math.random() - 1.0) * 0.03 - 1.5,
                                mass: 1,
                            });
                            xCoord += distance;
                            numCrossSection++;
                            numParticles++;
                        }

                        yCoord += distance;
                    }
                }

                currNumParticles = 0;

                fluidRendererGUI?.dispose();

                let currentTargetRenderer: FluidRenderingTargetRenderer | undefined = undefined;

                if (fluidRenderObject) {
                    currentTargetRenderer = fluidRenderObject.targetRenderer;
                    fluidRenderer?.removeRenderObject(fluidRenderObject, false);
                }

                fluidSim?.dispose();

                const positions = new Float32Array(particlePos);

                fluidSim = new FluidSimulator(particles, engine, positions);

                fluidSim.smoothingRadius = particleRadius * 2;
                fluidSim.currentNumParticles = currNumParticles;

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
                        fluidRenderObject.targetRenderer.density = 2.2;
                        fluidRenderObject.targetRenderer.refractionStrength = 0.04;
                        fluidRenderObject.targetRenderer.specularPower = 200;
                        //fluidRenderObject.targetRenderer.thicknessMapSize = 1024;
                        fluidRenderObject.targetRenderer.blurThicknessFilterSize = 10;
                        fluidRenderObject.targetRenderer.blurThicknessNumIterations = 2;
                        fluidRenderObject.targetRenderer.dirLight = new BABYLON.Vector3(2, -1, 1);
                    }
                    fluidRenderObject.object.particleSize = particleRadius * 2 * 2;
                    fluidRenderObject.object.particleThicknessAlpha = fluidRenderObject.object.particleSize;
                    fluidRenderObject.object.useVelocity = fluidRenderObject.targetRenderer.useVelocity;
                }

                fluidRendererGUI = new FluidRendererGUI(this._scene, false);
            }

            createSimulator();

            let arrowLeftDown = false;
            let arrowRightDown = false;
            let arrowUpDown = false;
            let arrowDownDown = false;

            scene.onKeyboardObservable.add((kbInfo) => {
                switch (kbInfo.type) {
                    case BABYLON.KeyboardEventTypes.KEYDOWN:
                        if (kbInfo.event.code === "ArrowLeft") {
                            arrowLeftDown = true;
                        } else if (kbInfo.event.code === "ArrowRight") {
                            arrowRightDown = true;
                        } else if (kbInfo.event.code === "ArrowUp") {
                            arrowUpDown = true;
                        } else if (kbInfo.event.code === "ArrowDown") {
                            arrowDownDown = true;
                        }
                        break;
                    case BABYLON.KeyboardEventTypes.KEYUP:
                        if (kbInfo.event.code === "ArrowLeft") {
                            arrowLeftDown = false;
                        } else if (kbInfo.event.code === "ArrowRight") {
                            arrowRightDown = false;
                        } else if (kbInfo.event.code === "ArrowUp") {
                            arrowUpDown = false;
                        } else if (kbInfo.event.code === "ArrowDown") {
                            arrowDownDown = false;
                        }
                        break;
                }
            });

            scene.onBeforeRenderObservable.add(() => {
                if (arrowLeftDown) {
                    this._angleX += 30 / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }
                if (arrowRightDown) {
                    this._angleX -= 30 / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }
                if (arrowUpDown) {
                    this._angleY -= 30 / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }
                if (arrowDownDown) {
                    this._angleY += 30 / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }

                if (fluidSim && fluidRenderObject) {
                    if (currNumParticles === 0) {
                        currNumParticles += numCrossSection;
                    } else if (currNumParticles < numParticles) {
                        const px1 = fluidSim.positions[currNumParticles * 3 + 0];
                        const py1 = fluidSim.positions[currNumParticles * 3 + 1];
                        const pz1 = fluidSim.positions[currNumParticles * 3 + 2];

                        const px2 = fluidSim.positions[(currNumParticles - numCrossSection) * 3 + 0];
                        const py2 = fluidSim.positions[(currNumParticles - numCrossSection) * 3 + 1];
                        const pz2 = fluidSim.positions[(currNumParticles - numCrossSection) * 3 + 2];

                        const dist = Math.sqrt((px1 - px2) * (px1 - px2) + (py1 - py2) * (py1 - py2) + (pz1 - pz2) * (pz1 - pz2));

                        if (dist > fluidSim.smoothingRadius) {
                            currNumParticles += numCrossSection;
                        }
                    }
                    fluidSim.currentNumParticles = currNumParticles;
                    (fluidRenderObject.object as FluidRenderingObjectVertexBuffer).setNumParticles(currNumParticles);
                
                    if (!paused) {
                        fluidSim.update(8 / 1000/*this._engine.getDeltaTime() / 1000*/);
                        this._checkCollisions(fluidSim, fluidSim.smoothingRadius);
                    }
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
            btnRestart.onPointerUpObservable.add(() => {
                this._angleX = this._angleY = 0;
                this._rotateMeshes(0, 0);
                createSimulator();
            });
            panel.addControl(btnRestart);

            const stkCheckBounds = GUI.Checkbox.AddCheckBoxWithHeader("Check bounds", (v) => {
                this._checkXZBounds = v;
                this._boxMesh?.setEnabled(v);
            });
            stkCheckBounds.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            stkCheckBounds.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

            panel.addControl(stkCheckBounds);

            const stkPauseAnimation = GUI.Checkbox.AddCheckBoxWithHeader("Pause animation", (v) => {
                paused = v;
            });
            (stkPauseAnimation.children[0] as GUI.Checkbox).isChecked = paused;
            stkPauseAnimation.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            stkPauseAnimation.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

            panel.addControl(stkPauseAnimation);
        }

        return scene;
    }

    protected _createMesh(): void {
        this._sphereMesh?.dispose();

        this._sphereMesh = BABYLON.MeshBuilder.CreateSphere("collisionMesh", { diameter: this._sphereRadius * 2, segments: 16 }, this._scene);
        this._sphereMesh.material = this._sphereMaterial;
        this._sphereMesh.position = this._spherePos.clone();

        const pointerDragBehavior = new BABYLON.PointerDragBehavior({dragPlaneNormal: new BABYLON.Vector3(0, 1, 0)});

        pointerDragBehavior.onDragStartObservable.add(() => {
            this._scene.cameras[0].detachControl();
        });

        pointerDragBehavior.onDragEndObservable.add(() => {
            this._scene.cameras[0].attachControl();
        });

        this._sphereMesh.addBehavior(pointerDragBehavior);

        this._boxMesh = BABYLON.MeshBuilder.CreateBox("boxMesh", { width: this._boxMax.x - this._boxMin.x, height: this._boxMax.y - this._boxMin.y, depth: this._boxMax.z - this._boxMin.z }, this._scene);
        this._boxMesh.material = this._boxMaterial;
        this._boxMesh.position.x = (this._boxMin.x + this._boxMax.x) / 2;
        this._boxMesh.position.y = (this._boxMin.y + this._boxMax.y) / 2;
        this._boxMesh.position.z = (this._boxMin.z + this._boxMax.z) / 2;
        this._boxMesh.isPickable = false;
    }

    protected _rotateMeshes(angleX: number, angleY: number): void {
        const transfo = BABYLON.Matrix.RotationYawPitchRoll(0, angleX * Math.PI / 180, angleY * Math.PI / 180);

        const boxVertices = [
            new BABYLON.Vector3(this._boxMin.x, this._boxMin.y, this._boxMin.z),
            new BABYLON.Vector3(this._boxMin.x, this._boxMax.y, this._boxMin.z),
            new BABYLON.Vector3(this._boxMin.x, this._boxMax.y, this._boxMax.z),
            new BABYLON.Vector3(this._boxMin.x, this._boxMin.y, this._boxMax.z),
            new BABYLON.Vector3(this._boxMax.x, this._boxMin.y, this._boxMin.z),
            new BABYLON.Vector3(this._boxMax.x, this._boxMax.y, this._boxMin.z),
            new BABYLON.Vector3(this._boxMax.x, this._boxMax.y, this._boxMax.z),
            new BABYLON.Vector3(this._boxMax.x, this._boxMin.y, this._boxMax.z),
        ];

        let ymin = 1e10;
        for (let i = 0; i < boxVertices.length; ++i) {
            const v = BABYLON.Vector3.TransformCoordinates(boxVertices[i], transfo);
            ymin = Math.min(ymin, v.y);
        }

        this._collisionPlanesFloorOnly[0].d = Math.abs(ymin);

        for (let i = 0; i < this._origCollisionPlanes.length; ++i) {
            this._collisionPlanes[i] = this._origCollisionPlanes[i].transform(transfo);
        }

        const quat = BABYLON.Quaternion.FromRotationMatrix(transfo);

        if (this._sphereMesh) {
            this._sphereMesh.rotationQuaternion = quat;
            this._sphereMesh.position = BABYLON.Vector3.TransformCoordinates(this._spherePos.clone(), transfo);
        }

        if (this._boxMesh) {
            this._boxMesh.rotationQuaternion = quat;
            this._boxMesh.position.x = (this._boxMin.x + this._boxMax.x) / 2;
            this._boxMesh.position.y = (this._boxMin.y + this._boxMax.y) / 2;
            this._boxMesh.position.z = (this._boxMin.z + this._boxMax.z) / 2;
            this._boxMesh.position = BABYLON.Vector3.TransformCoordinates(this._boxMesh.position, transfo);
        }
    }

    protected _checkCollisions(fluidSim: FluidSimulator, particleRadius: number): void {
        const elastic = 0.92;
        const meshCollisionRestitution = 0.95;
        const sx = this._sphereMesh!.position.x;
        const sy = this._sphereMesh!.position.y;
        const sz = this._sphereMesh!.position.z;
        const sr = this._sphereRadius + particleRadius;
        const positions = fluidSim.positions;
        const velocities = fluidSim.velocities;
        const collisionsPlanes = this._checkXZBounds ? this._collisionPlanes : this._collisionPlanesFloorOnly;
        for (let a = 0; a < fluidSim.currentNumParticles; ++a) {
            let nx = positions[a * 3 + 0] - sx;
            let ny = positions[a * 3 + 1] - sy;
            let nz = positions[a * 3 + 2] - sz;

            const d = nx * nx + ny * ny + nz * nz;
            if (d < sr * sr) {
                const l = Math.sqrt(d);
                nx /= l;
                ny /= l;
                nz /= l;

                const dotvn = velocities[a * 3 + 0] * nx + velocities[a * 3 + 1] * ny + velocities[a * 3 + 2] * nz;

                velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * nx) * meshCollisionRestitution;
                velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * ny) * meshCollisionRestitution;
                velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * nz) * meshCollisionRestitution;

                positions[a * 3 + 0] = nx * sr + sx;
                positions[a * 3 + 1] = ny * sr + sy;
                positions[a * 3 + 2] = nz * sr + sz;
            }

            for (let i = 0; i < collisionsPlanes.length; ++i) {
                const plane = collisionsPlanes[i];
                const dist = plane.normal.x * positions[a * 3 + 0] + plane.normal.y * positions[a * 3 + 1] + plane.normal.z * positions[a * 3 + 2] + plane.d - particleRadius;
                if (dist < 0) {
                    const dotvn = velocities[a * 3 + 0] * plane.normal.x + velocities[a * 3 + 1] * plane.normal.y + velocities[a * 3 + 2] * plane.normal.z;

                    velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * plane.normal.x) * elastic;
                    velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * plane.normal.y) * elastic;
                    velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * plane.normal.z) * elastic;
    
                    positions[a * 3 + 0] -= plane.normal.x * dist;
                    positions[a * 3 + 1] -= plane.normal.y * dist;
                    positions[a * 3 + 2] -= plane.normal.z * dist;
    
                }
            }
        }
    }
}

export default new FluidRendering();
