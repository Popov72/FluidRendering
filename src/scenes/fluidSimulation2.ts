import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";
import * as LiLGUI from 'lil-gui'; 

import "./FluidRenderer/fluidRendererSceneComponent";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidSimulator } from "./FluidSimulator2/fluidSimulator";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";
import { FluidRenderer, IFluidRenderingRenderObject } from "./FluidRenderer/fluidRenderer";

import marbleBaseColor from "../assets/materials/Marble08_1K_BaseColor.png";
import { ParticleGenerator } from "./particleGenerator";

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
    private _prevTransfo: BABYLON.Matrix;
    private _gui: BABYLON.Nullable<LiLGUI.GUI>;
    private _particleGenerator: ParticleGenerator;
    private _fluidSim: FluidSimulator;
    private _numMaxParticles: number;
    private _fluidRenderer: BABYLON.Nullable<FluidRenderer>;
    private _fluidRenderObject: IFluidRenderingRenderObject;
    private _paused: boolean;
    private _autoRotateBox: boolean;
    private _sphereCollisionRestitution: number;
    private _boxCollisionRestitution: number;

    constructor() {
        this._engine = null as any;
        this._scene = null as any;
        this._camera = null as any;
        this._checkXZBounds = true;
        this._sphereRadius = 0.2;
        this._sphereMesh = null;
        this._sphereMaterial = null;
        this._particleGenerator = null as any;
        this._fluidSim = null as any;
        this._fluidRenderer = null;
        this._fluidRenderObject = null as any;
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
        this._sphereCollisionRestitution = 0.95;
        this._boxCollisionRestitution = 0.92;
        this._angleX = 0;
        this._angleY = 0;
        this._prevTransfo = BABYLON.Matrix.Identity();
        this._numMaxParticles = 2700;
        this._paused = false;
        this._autoRotateBox = false;
        this._gui = null;
    }

    public async createScene(
        engine: BABYLON.Engine,
        canvas: HTMLCanvasElement
    ): Promise<BABYLON.Scene> {

        const scene = new BABYLON.Scene(engine);

        this._engine = engine;
        this._scene = scene;

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

        scene.activeCamera = camera;

        (camera.inputs as BABYLON.ArcRotateCameraInputsManager).removeByType("ArcRotateCameraKeyboardMoveInput");

        const cameraFront = new BABYLON.ArcRotateCamera("ArcRotateCameraGUI", 3.06, 1.14, 2.96, new BABYLON.Vector3(0, 0, 0), scene);
        cameraFront.layerMask = 0x10000000;

        scene.activeCameras = [camera, cameraFront];

        this._scene.cameraToUseForPointers = camera;

        this._fluidRenderer = scene.enableFluidRenderer();

        if (!this._fluidRenderer) {
            return scene;
        }

        const particleRadius = 0.02;

        this._createMeshes();

        // Setup the fluid renderer object
        const vertexBuffers: { [name: string]: BABYLON.VertexBuffer } = {};

        this._fluidRenderObject = this._fluidRenderer.addVertexBuffer(vertexBuffers, 0, false, undefined, camera);

        this._fluidRenderObject.targetRenderer.enableBlurDepth = true;
        this._fluidRenderObject.targetRenderer.blurDepthFilterSize = 8;
        this._fluidRenderObject.targetRenderer.blurDepthNumIterations = 3;
        this._fluidRenderObject.targetRenderer.blurDepthDepthScale = 5;
        //this._fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(0.011126082368383245*5*3, 0.05637409755197975*5*3, 1);
        this._fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(1 - 0.5, 1 - 0.2, 1 - 0.05);
        this._fluidRenderObject.targetRenderer.density = 2.2;
        this._fluidRenderObject.targetRenderer.refractionStrength = 0.04;
        this._fluidRenderObject.targetRenderer.specularPower = 200;
        //this._fluidRenderObject.targetRenderer.thicknessMapSize = 1024;
        this._fluidRenderObject.targetRenderer.blurThicknessFilterSize = 10;
        this._fluidRenderObject.targetRenderer.blurThicknessNumIterations = 2;
        this._fluidRenderObject.targetRenderer.dirLight = new BABYLON.Vector3(2, -1, 1);
        this._fluidRenderObject.object.particleSize = particleRadius * 2 * 2;
        this._fluidRenderObject.object.particleThicknessAlpha = this._fluidRenderObject.object.particleSize;
        this._fluidRenderObject.object.useVelocity = this._fluidRenderObject.targetRenderer.useVelocity;

        new FluidRendererGUI(this._scene, false);

        // Setup the fluid simulator / particle generator
        this._fluidSim = new FluidSimulator();

        this._fluidSim.smoothingRadius = particleRadius * 2;
        this._fluidSim.maxVelocity = 3;

        (window as any).fsim = this._fluidSim;

        this._particleGenerator = new ParticleGenerator(this._scene);
        this._particleGenerator.particleRadius = this._fluidSim.smoothingRadius / 2;

        this._generateParticles();

        this._makeGUI();

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

            if (this._autoRotateBox) {
                const fps = this._engine.getFps();
                this._angleX += 20 / fps;
                this._angleY += 30 / fps;
                this._rotateMeshes(this._angleX, this._angleY);
            }

            this._fluidSim.currentNumParticles = Math.min(this._numMaxParticles, this._particleGenerator.currNumParticles);
            (this._fluidRenderObject.object as FluidRenderingObjectVertexBuffer).setNumParticles(this._fluidSim.currentNumParticles);
        
            if (!this._paused) {
                this._fluidSim.update(8 / 1000/*this._engine.getDeltaTime() / 1000*/);
                this._checkCollisions(this._fluidSim, this._fluidSim.smoothingRadius);
            }

            if (this._fluidRenderObject) {
                this._fluidRenderObject.object.vertexBuffers["position"].updateDirectly(this._fluidSim.positions, 0);
                this._fluidRenderObject.object.vertexBuffers["velocity"].updateDirectly(this._fluidSim.velocities, 0);
            }
        });

        return scene;
    }

    protected _generateParticles(regenerateAll = true): void {
        this._particleGenerator.generateParticles(this._numMaxParticles, regenerateAll);

        if (this._fluidSim.positions !== this._particleGenerator.positions) {
            this._fluidSim.setParticleData(this._particleGenerator.positions, this._particleGenerator.velocities);

            this._fluidRenderObject.object.vertexBuffers["position"]?.dispose();
            this._fluidRenderObject.object.vertexBuffers["velocity"]?.dispose();

            this._fluidRenderObject.object.vertexBuffers["position"] = new BABYLON.VertexBuffer(this._engine, this._fluidSim.positions, BABYLON.VertexBuffer.PositionKind, true, false, 3, true);
            this._fluidRenderObject.object.vertexBuffers["velocity"] = new BABYLON.VertexBuffer(this._engine, this._fluidSim.velocities, "velocity", true, false, 3, true);
        }
    }

    protected _makeGUI(): void {
        this._gui = new LiLGUI.GUI();
        this._gui.domElement.style.marginTop = "60px";
        this._gui.domElement.style.left = "20px";
        this._gui.domElement.id = "simGUI";

        const params = {
            checkXZBounds: true,
            paused: false,
            autoRotateBox: false,
            restart: () => {
                this._angleX = this._angleY = 0;
                this._autoRotateBox = false;
                autoRotateBoxCtrl?.setValue(false);
                this._rotateMeshes(0, 0);
                this._generateParticles();
            },
            sphereCollisionRestitution: this._sphereCollisionRestitution,
            boxCollisionRestitution: this._boxCollisionRestitution,
            numParticles: this._numMaxParticles,
            smoothingRadius: this._fluidSim.smoothingRadius,
            densityReference: this._fluidSim.densityReference,
            pressureConstant: this._fluidSim.pressureConstant,
            viscosity: this._fluidSim.viscosity,
            minTimeStep: this._fluidSim.minTimeStep,
            maxVelocity: this._fluidSim.maxVelocity,
            maxAcceleration: this._fluidSim.maxAcceleration,
        };

        const mainMenu = this._gui;

        let autoRotateBoxCtrl: BABYLON.Nullable<LiLGUI.Controller> = null;

        mainMenu.add(params, "restart").name("Restart");

        mainMenu.add(params, "checkXZBounds")
            .name("Check box bounds")
            .onChange((value: boolean) => {
                this._checkXZBounds = value;
                this._boxMesh?.setEnabled(value);
                if (!value) {
                    this._autoRotateBox = false;
                    autoRotateBoxCtrl?.setValue(false);
                }
            });

        mainMenu.add(params, "paused")
            .name("Pause animation")
            .onChange((value: boolean) => {
                this._paused = value;
            });        

        autoRotateBoxCtrl = mainMenu.add(params, "autoRotateBox")
            .name("Auto rotate box")
            .onChange((value: boolean) => {
                this._autoRotateBox = value;
            });

        mainMenu.add(params, "sphereCollisionRestitution", 0, 1, 0.01)
            .name("Sphere collision restitution")
            .onChange((value: any) => {
                this._sphereCollisionRestitution = value;
            });

        mainMenu.add(params, "boxCollisionRestitution", 0, 1, 0.01)
            .name("Box collision restitution")
            .onChange((value: any) => {
                this._boxCollisionRestitution = value;
            });

        const menuFluidSim = this._gui.addFolder("Fluid Simulator");

        menuFluidSim.$title.style.fontWeight = "bold";

        menuFluidSim.add(params, "numParticles", 0, 10000, 88)
            .name("Num particles")
            .onChange((value: any) => {
                this._numMaxParticles = value;
                this._generateParticles(false);
            });

        menuFluidSim.add(params, "smoothingRadius", 0, 1, 0.001)
            .name("Smoothing radius")
            .onChange((value: any) => {
                this._fluidSim.smoothingRadius = value || 0.04;
                this._particleGenerator.particleRadius = this._fluidSim.smoothingRadius / 2;
            });

        menuFluidSim.add(params, "densityReference", 0, 50000, 100)
            .name("Density reference")
            .onChange((value: any) => {
                this._fluidSim.densityReference = value;
            });

        menuFluidSim.add(params, "pressureConstant", 0, 100, 1)
            .name("Pressure constant")
            .onChange((value: any) => {
                this._fluidSim.pressureConstant = value;
            });

        menuFluidSim.add(params, "viscosity", 0, 0.05, 0.001)
            .name("Viscosity")
            .onChange((value: any) => {
                this._fluidSim.viscosity = value;
            });

        menuFluidSim.add(params, "maxVelocity", 0, 200, 1)
            .name("Max velocity")
            .onChange((value: any) => {
                this._fluidSim.maxVelocity = value;
            });

        menuFluidSim.add(params, "maxAcceleration", 0, 10000, 10)
            .name("Max acceleration")
            .onChange((value: any) => {
                this._fluidSim.maxAcceleration = value;
            });

        menuFluidSim.add(params, "minTimeStep", 0, 0.01, 0.00001)
            .name("Min time step")
            .onChange((value: any) => {
                this._fluidSim.minTimeStep = value;
            });

        menuFluidSim.open();
    
    }

    protected _createMeshes(): void {
        this._sphereMesh = BABYLON.MeshBuilder.CreateSphere("collisionMesh", { diameter: this._sphereRadius * 2, segments: 16 }, this._scene);
        this._sphereMesh.material = this._sphereMaterial;
        this._sphereMesh.position = this._spherePos.clone();

        const pointerDragBehavior = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 1, 0) });

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
            this._prevTransfo.invert();
            const tmp = BABYLON.Vector3.TransformCoordinates(this._sphereMesh.position, this._prevTransfo);
            this._sphereMesh.rotationQuaternion = quat;
            this._sphereMesh.position = BABYLON.Vector3.TransformCoordinates(tmp, transfo);
        }

        if (this._boxMesh) {
            this._boxMesh.rotationQuaternion = quat;
            this._boxMesh.position.x = (this._boxMin.x + this._boxMax.x) / 2;
            this._boxMesh.position.y = (this._boxMin.y + this._boxMax.y) / 2;
            this._boxMesh.position.z = (this._boxMin.z + this._boxMax.z) / 2;
            this._boxMesh.position = BABYLON.Vector3.TransformCoordinates(this._boxMesh.position, transfo);
        }

        this._prevTransfo.copyFrom(transfo);
    }

    protected _checkCollisions(fluidSim: FluidSimulator, particleRadius: number): void {
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

            // Check collision with sphere
            const d = nx * nx + ny * ny + nz * nz;
            if (d < sr * sr) {
                const l = Math.sqrt(d);
                nx /= l;
                ny /= l;
                nz /= l;

                const dotvn = velocities[a * 3 + 0] * nx + velocities[a * 3 + 1] * ny + velocities[a * 3 + 2] * nz;

                velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * nx) * this._sphereCollisionRestitution;
                velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * ny) * this._sphereCollisionRestitution;
                velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * nz) * this._sphereCollisionRestitution;

                positions[a * 3 + 0] = nx * sr + sx;
                positions[a * 3 + 1] = ny * sr + sy;
                positions[a * 3 + 2] = nz * sr + sz;
            }

            // Check collisions with planes
            for (let i = 0; i < collisionsPlanes.length; ++i) {
                const plane = collisionsPlanes[i];
                const dist = plane.normal.x * positions[a * 3 + 0] + plane.normal.y * positions[a * 3 + 1] + plane.normal.z * positions[a * 3 + 2] + plane.d - particleRadius;
                if (dist < 0) {
                    const dotvn = velocities[a * 3 + 0] * plane.normal.x + velocities[a * 3 + 1] * plane.normal.y + velocities[a * 3 + 2] * plane.normal.z;

                    velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * plane.normal.x) * this._boxCollisionRestitution;
                    velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * plane.normal.y) * this._boxCollisionRestitution;
                    velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * plane.normal.z) * this._boxCollisionRestitution;
    
                    positions[a * 3 + 0] -= plane.normal.x * dist;
                    positions[a * 3 + 1] -= plane.normal.y * dist;
                    positions[a * 3 + 2] -= plane.normal.z * dist;
    
                }
            }
        }
    }
}

export default new FluidRendering();
