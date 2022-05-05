import * as BABYLON from "@babylonjs/core";

import * as LiLGUI from 'lil-gui'; 

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";

import marbleBaseColor from "../assets/materials/Marble08_1K_BaseColor.png";

export class FluidSimulationDemoBoxSphere extends FluidSimulationDemoBase {

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
    private _autoRotateBox: boolean;
    private _sphereCollisionRestitution: number;
    private _boxCollisionRestitution: number;

    constructor(scene: BABYLON.Scene) {
        super(scene);

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
        this._sphereCollisionRestitution = 0.95;
        this._boxCollisionRestitution = 0.92;
        this._angleX = 0;
        this._angleY = 0;
        this._prevTransfo = BABYLON.Matrix.Identity();
        this._autoRotateBox = false;

        this._particleGenerator.yBaseEmitter = 0.5;
        this._fluidSim.viscosity = 0.005;
    }

    public run(): void {
        super.run();

        this._fluidRenderObject.targetRenderer.blurThicknessFilterSize = 8;
        this._fluidRenderObject.targetRenderer.blurThicknessNumIterations = 2;
        this._fluidRenderObject.targetRenderer.density = 2.2;

        // Create materials
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

        // Create meshes
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

        // Keyboard handling
        let arrowLeftDown = false;
        let arrowRightDown = false;
        let arrowUpDown = false;
        let arrowDownDown = false;

        this._scene.onKeyboardObservable.add((kbInfo) => {
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

        // Main loop
        this._scene.onBeforeRenderObservable.add(() => {
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
        });

    }

    public dispose(): void {
        this._sphereMesh?.dispose();
        this._boxMesh?.dispose();
        this._sphereMaterial?.dispose();
        this._boxMaterial?.dispose();
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            checkXZBounds: true,
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
        };

        const mainMenu = this._gui!;

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

    protected _checkCollisions(particleRadius: number): void {
        const sx = this._sphereMesh!.position.x;
        const sy = this._sphereMesh!.position.y;
        const sz = this._sphereMesh!.position.z;
        const sr = this._sphereRadius + particleRadius;
        const positions = this._fluidSim.positions;
        const velocities = this._fluidSim.velocities;
        const collisionsPlanes = this._checkXZBounds ? this._collisionPlanes : this._collisionPlanesFloorOnly;
        for (let a = 0; a < this._fluidSim.currentNumParticles; ++a) {
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
