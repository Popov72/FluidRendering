import * as BABYLON from "@babylonjs/core";

import * as LiLGUI from "lil-gui";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";
import { ICollisionShape } from "./Utils/sdfHelper";

export class FluidSimulationDemoBoxSphere extends FluidSimulationDemoBase {
    private _checkXZBounds: boolean;
    private _sphereMesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _boxMin: BABYLON.Vector3;
    private _boxMax: BABYLON.Vector3;
    private _boxMesh: BABYLON.Nullable<BABYLON.Mesh>;
    private _boxMaterial: BABYLON.Nullable<BABYLON.PBRMaterial>;
    private _boxMeshFront: BABYLON.Nullable<BABYLON.Mesh>;
    private _boxMaterialFront: BABYLON.Nullable<BABYLON.PBRMaterial>;
    private _origCollisionPlanes: Array<BABYLON.Plane>;
    private _collisionPlanes: Array<
        [BABYLON.Nullable<BABYLON.Mesh>, ICollisionShape]
    >;
    private _angleX: number;
    private _angleY: number;
    private _prevTransfo: BABYLON.Matrix;
    private _autoRotateBox: boolean;
    private _wallMesh: BABYLON.Mesh;
    private _passPP: BABYLON.PostProcess;
    private _sceneRenderObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.Scene>
    >;
    private _sceneAfterCameraRenderObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.Camera>
    >;
    private _sceneKeyboardObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.KeyboardInfo>
    >;
    private _onEngineResizeObserver: BABYLON.Nullable<
        BABYLON.Observer<BABYLON.Engine>
    >;

    constructor(scene: BABYLON.Scene) {
        super(scene);

        this._boxMin = new BABYLON.Vector3(-0.3, -0.3, -0.7);
        this._boxMax = new BABYLON.Vector3(0.3, 1.2, 0.7);
        this._boxMesh = null;
        this._boxMaterial = null;
        this._boxMeshFront = null;
        this._boxMaterialFront = null;

        this._checkXZBounds = true;
        this._origCollisionPlanes = [
            new BABYLON.Plane(0, 0, -1, Math.abs(this._boxMax.z)),
            new BABYLON.Plane(0, 0, 1, Math.abs(this._boxMin.z)),
            new BABYLON.Plane(1, 0, 0, Math.abs(this._boxMin.x)),
            new BABYLON.Plane(-1, 0, 0, Math.abs(this._boxMax.x)),
            new BABYLON.Plane(0, -1, 0, Math.abs(this._boxMax.y)),
            new BABYLON.Plane(0, 1, 0, Math.abs(this._boxMin.y)),
            new BABYLON.Plane(0, 1, 0, Math.abs(this._boxMin.y)),
        ];
        this._collisionPlanes = [];
        for (let i = 0; i < this._origCollisionPlanes.length; ++i) {
            const plane = this._origCollisionPlanes[i];
            this._collisionPlanes[i] = this.addCollisionPlane(
                plane.normal,
                plane.d,
                i === this._origCollisionPlanes.length - 1 ? 0.98 : undefined
            );
        }
        this._collisionPlanes[this._collisionPlanes.length - 1][1].disabled =
            true;

        this._angleX = 0;
        this._angleY = 0;
        this._prevTransfo = BABYLON.Matrix.Identity();
        this._autoRotateBox = false;

        this._sceneRenderObserver = null;
        this._sceneAfterCameraRenderObserver = null;
        this._sceneKeyboardObserver = null;
        this._onEngineResizeObserver = null;

        this._passPP = new BABYLON.PassPostProcess(
            "pass",
            1,
            null,
            undefined,
            this._engine
        );
        this._passPP.externalTextureSamplerBinding = true;

        const sphereRadius = 0.16;

        this._sphereMesh = this.addCollisionSphere(
            new BABYLON.Vector3(
                (this._boxMin.x + this._boxMax.x) / 2,
                this._boxMin.y + sphereRadius,
                (this._boxMin.z + this._boxMax.z) / 2 - 0.1
            ),
            sphereRadius
        )[0]!;

        this._wallMesh = this.addCollisionBox(
            new BABYLON.Vector3(0.0, 0.0, 0.3),
            new BABYLON.Vector3((90 * Math.PI) / 180, 0, 0),
            new BABYLON.Vector3(0.32, 0.05, 0.3),
            new BABYLON.Vector3(1, 0, 0)
        )[0]!;
    }

    public async run() {
        // Reset camera
        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 3.06;
            (camera as BABYLON.ArcRotateCamera).beta = 1.14;
            (camera as BABYLON.ArcRotateCamera).radius = 2.96;

            camera.outputRenderTarget = new BABYLON.RenderTargetTexture(
                "rttFinal",
                {
                    width: this._engine.getRenderWidth(),
                    height: this._engine.getRenderHeight(),
                },
                this._scene
            );
        }

        // Simulation parameters
        this._fluidRenderObject.object.particleSize = 0.08;

        this._fluidSim!.smoothingRadius = 0.04;
        this._fluidSim!.densityReference = 20000;
        this._fluidSim!.pressureConstant = 4;
        this._fluidSim!.viscosity = 0.01;
        this._fluidSim!.maxVelocity = 3;
        this._fluidSim!.maxAcceleration = 2000;

        // Create materials
        this._boxMaterial = new BABYLON.PBRMaterial("BoxMeshMat", this._scene);
        this._boxMaterial.metallic = 0.3;
        this._boxMaterial.roughness = 0;
        this._boxMaterial.alpha = 0.2;
        this._boxMaterial.backFaceCulling = true;
        this._boxMaterial.cullBackFaces = false;

        this._boxMaterialFront = this._boxMaterial.clone("BoxMeshFrontMat");
        this._boxMaterialFront.cullBackFaces = true;

        // Create meshes
        this._boxMesh = BABYLON.MeshBuilder.CreateBox(
            "boxMesh",
            {
                width: this._boxMax.x - this._boxMin.x,
                height: this._boxMax.y - this._boxMin.y,
                depth: this._boxMax.z - this._boxMin.z,
            },
            this._scene
        );
        this._boxMesh.material = this._boxMaterial;
        this._boxMesh.position.x = (this._boxMin.x + this._boxMax.x) / 2;
        this._boxMesh.position.y = (this._boxMin.y + this._boxMax.y) / 2;
        this._boxMesh.position.z = (this._boxMin.z + this._boxMax.z) / 2;
        this._boxMesh.isPickable = false;

        this._boxMeshFront = this._boxMesh.clone("boxMeshFront");
        this._boxMeshFront.material = this._boxMaterialFront;
        this._boxMeshFront.layerMask = 0x10000000; // make sure the mesh is not displayed by the camera - we will display it ourselves by a direct call to render()

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

        // Render the front side of the box
        this._passPP.onApplyObservable.add((effect) => {
            effect.setTexture("textureSampler", camera!.outputRenderTarget);
        });

        let depthIsShared = false;
        this._sceneAfterCameraRenderObserver =
            this._scene.onAfterCameraRenderObservable.add(() => {
                const firstPP = camera?._getFirstPostProcess();
                if (
                    firstPP &&
                    firstPP.inputTexture.depthStencilTexture &&
                    !depthIsShared
                ) {
                    firstPP.inputTexture._shareDepth(
                        camera!.outputRenderTarget!.renderTarget!
                    );
                    depthIsShared = true;
                }
                if (depthIsShared) {
                    this._boxMeshFront?.render(
                        this._boxMeshFront.subMeshes[0],
                        true
                    );
                    this._scene.postProcessManager.directRender(
                        [this._passPP!],
                        null
                    );
                }
            });

        this._onEngineResizeObserver = this._engine.onResizeObservable.add(
            () => {
                camera?.outputRenderTarget?.resize({
                    width: this._engine.getRenderWidth(true),
                    height: this._engine.getRenderHeight(true),
                });
                depthIsShared = false;
            }
        );

        // Move meshes
        this._sceneRenderObserver = this._scene.onBeforeRenderObservable.add(
            () => {
                if (arrowLeftDown) {
                    this._angleX += (2 * 30) / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }
                if (arrowRightDown) {
                    this._angleX -= (2 * 30) / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }
                if (arrowUpDown) {
                    this._angleY -= (2 * 30) / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }
                if (arrowDownDown) {
                    this._angleY += (2 * 30) / 60;
                    this._rotateMeshes(this._angleX, this._angleY);
                }

                if (this._autoRotateBox) {
                    const fps = this._engine.getFps();
                    this._angleX += 20 / fps;
                    this._angleY += 30 / fps;
                    this._rotateMeshes(this._angleX, this._angleY);
                }
            }
        );

        super.run();
    }

    public dispose(): void {
        super.dispose();

        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            camera.outputRenderTarget?.dispose();
            camera.outputRenderTarget = null;
        }

        this._scene.onBeforeRenderObservable.remove(this._sceneRenderObserver);
        this._scene.onAfterCameraRenderObservable.remove(
            this._sceneAfterCameraRenderObserver
        );
        this._scene.onKeyboardObservable.remove(this._sceneKeyboardObserver);

        this._passPP.dispose();
        this._boxMesh?.dispose();
        this._boxMeshFront?.dispose();
        this._boxMaterial?.dispose();
        this._engine.onResizeObservable.remove(this._onEngineResizeObserver);
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
            boxOpacity: this._boxMaterial!.alpha,
        };

        const mainMenu = this._gui!;

        let autoRotateBoxCtrl: BABYLON.Nullable<LiLGUI.Controller> = null;

        mainMenu.add(params, "restart").name("Restart");

        mainMenu
            .add(params, "checkXZBounds")
            .name("Check box bounds")
            .onChange((value: boolean) => {
                this._checkXZBounds = value;
                this._boxMesh?.setEnabled(value);
                this._boxMeshFront?.setEnabled(value);
                for (let i = 0; i < this._collisionPlanes.length; ++i) {
                    this._collisionPlanes[i][1].disabled =
                        (!value && i < this._collisionPlanes.length - 1) ||
                        (value && i === this._collisionPlanes.length - 1);
                }
                if (!value) {
                    this._autoRotateBox = false;
                    autoRotateBoxCtrl?.setValue(false);
                }
            });

        autoRotateBoxCtrl = mainMenu
            .add(params, "autoRotateBox")
            .name("Auto rotate box")
            .onChange((value: boolean) => {
                this._autoRotateBox = value;
            });

        mainMenu
            .add(params, "boxOpacity", 0, 1, 0.01)
            .name("Box opacity")
            .onChange((value: any) => {
                this._boxMaterial!.alpha = value;
                this._boxMaterialFront!.alpha = value;
            });
    }

    protected _onPaused(value: boolean) {
        super._onPaused(value);

        if (value) {
            this._autoRotateBox = false;
        }
    }

    protected _rotateMeshes(angleX: number, angleY: number): void {
        const transfo = BABYLON.Matrix.RotationYawPitchRoll(
            0,
            (angleX * Math.PI) / 180,
            (angleY * Math.PI) / 180
        );

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
            const v = BABYLON.Vector3.TransformCoordinates(
                boxVertices[i],
                transfo
            );
            ymin = Math.min(ymin, v.y);
        }

        this._collisionPlanes[
            this._origCollisionPlanes.length - 1
        ][1].params[1] = Math.abs(ymin) + 0.02;

        for (let i = 0; i < this._origCollisionPlanes.length - 1; ++i) {
            const plane = this._origCollisionPlanes[i].transform(transfo);
            this._collisionPlanes[i][1].params = [plane.normal, plane.d];
        }

        const quat = BABYLON.Quaternion.FromRotationMatrix(transfo);

        this._prevTransfo.invert();

        if (this._sphereMesh) {
            const tmp = BABYLON.Vector3.TransformCoordinates(
                this._sphereMesh.position,
                this._prevTransfo
            );

            this._sphereMesh.rotationQuaternion = quat;
            this._sphereMesh.position = BABYLON.Vector3.TransformCoordinates(
                tmp,
                transfo
            );
        }

        if (this._wallMesh) {
            const tmp = BABYLON.Vector3.TransformCoordinates(
                this._wallMesh.position,
                this._prevTransfo
            );

            const m = BABYLON.Matrix.RotationYawPitchRoll(
                0,
                (90 * Math.PI) / 180,
                0
            );
            const t = BABYLON.Matrix.Translation(tmp.x, tmp.y, tmp.z);

            m.multiplyToRef(t, m).multiplyToRef(transfo, m);
            const qf =
                this._wallMesh.rotationQuaternion ?? new BABYLON.Quaternion();

            m.decompose(undefined, qf, this._wallMesh.position);

            this._wallMesh.rotationQuaternion = qf;
        }

        if (this._boxMesh && this._boxMeshFront) {
            this._boxMesh.rotationQuaternion =
                this._boxMeshFront.rotationQuaternion = quat;
            this._boxMesh.position.x = (this._boxMin.x + this._boxMax.x) / 2;
            this._boxMesh.position.y = (this._boxMin.y + this._boxMax.y) / 2;
            this._boxMesh.position.z = (this._boxMin.z + this._boxMax.z) / 2;
            this._boxMesh.position = BABYLON.Vector3.TransformCoordinates(
                this._boxMesh.position,
                transfo
            );
            this._boxMeshFront.position = this._boxMesh.position;
        }

        this._prevTransfo.copyFrom(transfo);
    }
}
