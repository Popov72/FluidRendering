import * as BABYLON from "@babylonjs/core";

import * as LiLGUI from "lil-gui";

import {
    FluidRenderer,
    IFluidRenderingRenderObject,
} from "./FluidRenderer/fluidRenderer";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";
import { FluidSimulator } from "./FluidSimulator2/fluidSimulator";
import { ParticleGenerator } from "./Utils/particleGenerator";
import { ICollisionShape, SDFHelper } from "./Utils/sdfHelper";

export class FluidSimulationDemoBase {
    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;
    protected _gui: BABYLON.Nullable<LiLGUI.GUI>;

    protected _fluidRenderer: FluidRenderer;
    protected _fluidRenderObject: IFluidRenderingRenderObject;
    protected _fluidRendererGUI: BABYLON.Nullable<FluidRendererGUI>;
    protected _fluidSim: BABYLON.Nullable<FluidSimulator>;
    protected _particleGenerator: BABYLON.Nullable<ParticleGenerator>;
    protected _numParticles: number;
    protected _paused: boolean;
    protected _sceneObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    protected _loadParticlesFromFile: boolean;
    protected _shapeCollisionRestitution: number;
    protected _collisionShapes: Array<ICollisionShape>;

    protected static _DemoList: Array<{
        name: string;
        factory: () => FluidSimulationDemoBase;
    }> = [];
    protected static _CurrentDemo: FluidSimulationDemoBase;
    protected static _CurrentDemoIndex: number;

    public static AddDemo(
        name: string,
        factory: () => FluidSimulationDemoBase
    ): void {
        FluidSimulationDemoBase._DemoList.push({ name, factory });
    }

    public static StartDemo(index: number): void {
        FluidSimulationDemoBase._CurrentDemo?.dispose();
        FluidSimulationDemoBase._CurrentDemoIndex = index;
        FluidSimulationDemoBase._CurrentDemo =
            FluidSimulationDemoBase._DemoList[index].factory();
        FluidSimulationDemoBase._CurrentDemo.run();
    }

    constructor(
        scene: BABYLON.Scene,
        noFluidSimulation = false,
        particleFileName?: string
    ) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._fluidRenderer = scene.enableFluidRenderer()!;
        this._numParticles = 6000;
        this._paused = false;
        this._gui = null;
        this._fluidRendererGUI = null;
        this._sceneObserver = null;
        this._fluidSim = null;
        this._particleGenerator = null;
        this._loadParticlesFromFile = particleFileName !== undefined;
        this._shapeCollisionRestitution = 0.999;
        this._collisionShapes = [];

        const particleRadius = 0.02;
        const camera = scene.activeCameras?.[0] ?? scene.activeCamera!;

        camera.storeState();

        // Setup the fluid renderer object
        const vertexBuffers: { [name: string]: BABYLON.VertexBuffer } = {};

        this._fluidRenderObject = this._fluidRenderer.addVertexBuffer(
            vertexBuffers,
            0,
            false,
            undefined,
            camera
        );

        this._fluidRenderObject.targetRenderer.enableBlurDepth = true;
        this._fluidRenderObject.targetRenderer.blurDepthFilterSize = 20;
        this._fluidRenderObject.targetRenderer.blurDepthNumIterations = 5;
        this._fluidRenderObject.targetRenderer.blurDepthDepthScale = 10;
        this._fluidRenderObject.targetRenderer.fluidColor = new BABYLON.Color3(
            1 - 0.5,
            1 - 0.2,
            1 - 0.05
        );
        this._fluidRenderObject.targetRenderer.density = 2.2;
        this._fluidRenderObject.targetRenderer.refractionStrength = 0.04;
        this._fluidRenderObject.targetRenderer.specularPower = 150;
        this._fluidRenderObject.targetRenderer.blurThicknessFilterSize = 10;
        this._fluidRenderObject.targetRenderer.blurThicknessNumIterations = 2;
        this._fluidRenderObject.targetRenderer.dirLight = new BABYLON.Vector3(
            2,
            -1,
            1
        );
        this._fluidRenderObject.object.particleSize = particleRadius * 2 * 2;
        this._fluidRenderObject.object.particleThicknessAlpha =
            this._fluidRenderObject.object.particleSize;
        this._fluidRenderObject.object.useVelocity =
            this._fluidRenderObject.targetRenderer.useVelocity;
        this._fluidRenderObject.targetRenderer.minimumThickness = this._fluidRenderObject.object.particleThicknessAlpha;

        // Setup the fluid simulator / particle generator
        if (!noFluidSimulation) {
            this._fluidSim = new FluidSimulator();

            this._fluidSim.smoothingRadius = particleRadius * 2;
            this._fluidSim.maxVelocity = 3;

            (window as any).fsim = this._fluidSim;

            this._particleGenerator = new ParticleGenerator(
                this._scene,
                particleFileName
            );
            this._particleGenerator.particleRadius =
                this._fluidSim.smoothingRadius / 2;
            this._particleGenerator.position.y = 0.5;

            this._sceneObserver = scene.onBeforeRenderObservable.add(() => {
                this._fluidSim!.currentNumParticles = Math.min(
                    this._numParticles,
                    this._particleGenerator!.currNumParticles
                );
                (
                    this._fluidRenderObject
                        .object as FluidRenderingObjectVertexBuffer
                ).setNumParticles(this._fluidSim!.currentNumParticles);

                if (!this._paused) {
                    this._fluidSim!.update(1 / 100);
                    this._checkCollisions(
                        this._fluidRenderObject.object.particleSize / 2
                    );
                }

                if (
                    this._fluidRenderObject &&
                    this._fluidRenderObject.object.vertexBuffers["position"]
                ) {
                    this._fluidRenderObject.object.vertexBuffers[
                        "position"
                    ].updateDirectly(this._fluidSim!.positions, 0);
                    this._fluidRenderObject.object.vertexBuffers[
                        "velocity"
                    ].updateDirectly(this._fluidSim!.velocities, 0);
                }
            });
        }
    }

    public async run() {
        await this._generateParticles();

        if (this._particleGenerator && this._loadParticlesFromFile) {
            this._numParticles = this._particleGenerator.currNumParticles;
        }

        this._fluidRendererGUI = new FluidRendererGUI(this._scene, false);

        this._makeGUI();
    }

    public dispose(): void {
        for (let i = 0; i < this._collisionShapes.length; ++i) {
            const shape = this._collisionShapes[i];

            shape.mesh?.material?.dispose();
            shape.mesh?.dispose();
        }

        this._scene.onBeforeRenderObservable.remove(this._sceneObserver);
        this._fluidRendererGUI?.dispose();
        this._gui?.destroy();
        this._fluidSim?.dispose();
        this._particleGenerator?.dispose();
        this._fluidRenderer.removeRenderObject(this._fluidRenderObject);

        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera!;

        (camera as BABYLON.ArcRotateCamera)._restoreStateValues();
    }

    public addCollisionSphere(
        position: BABYLON.Vector3,
        radius: number,
        dragPlane: BABYLON.Nullable<BABYLON.Vector3> = new BABYLON.Vector3(
            0,
            1,
            0
        )
    ) {
        this._collisionShapes.push({
            params: [radius],
            createMesh: SDFHelper.CreateSphere,
            sdEvaluate: SDFHelper.SDSphere,
            computeNormal: SDFHelper.ComputeSDFNormal,
            position: position.clone(),
            mesh: null as any,
            transf: new BABYLON.Matrix(),
            invTransf: new BABYLON.Matrix(),
            dragPlane,
        });

        return this._createMeshForCollision(
            this._collisionShapes[this._collisionShapes.length - 1]
        );
    }

    public addCollisionBox(
        position: BABYLON.Vector3,
        rotation: BABYLON.Vector3,
        extents: BABYLON.Vector3,
        dragPlane: BABYLON.Nullable<BABYLON.Vector3> = new BABYLON.Vector3(
            0,
            1,
            0
        )
    ) {
        this._collisionShapes.push({
            params: [extents.clone()],
            createMesh: SDFHelper.CreateBox,
            sdEvaluate: SDFHelper.SDBox,
            computeNormal: SDFHelper.ComputeSDFNormal,
            rotation: rotation.clone(),
            position: position.clone(),
            mesh: null as any,
            transf: new BABYLON.Matrix(),
            invTransf: new BABYLON.Matrix(),
            dragPlane,
        });

        return this._createMeshForCollision(
            this._collisionShapes[this._collisionShapes.length - 1]
        );
    }

    public addCollisionPlane(normal: BABYLON.Vector3, d: number, collisionRestitution?: number): [BABYLON.Nullable<BABYLON.Mesh>, ICollisionShape] {
        this._collisionShapes.push({
            params: [normal.clone(), d],
            sdEvaluate: SDFHelper.SDPlane,
            computeNormal: SDFHelper.ComputeSDFNormal,
            mesh: null as any,
            position: new BABYLON.Vector3(0, 0, 0),
            rotation: new BABYLON.Vector3(0, 0, 0),
            transf: BABYLON.Matrix.Identity(),
            invTransf: BABYLON.Matrix.Identity(),
            dragPlane: null,
            collisionRestitution,
        });

        return [null, this._collisionShapes[this._collisionShapes.length - 1]];
    }

    public addCollisionTerrain(size: number) {
        this._collisionShapes.push({
            params: [size],
            createMesh: SDFHelper.CreateTerrain,
            sdEvaluate: SDFHelper.SDTerrain,
            computeNormal: SDFHelper.ComputeTerrainNormal,
            mesh: null as any,
            transf: new BABYLON.Matrix(),
            invTransf: new BABYLON.Matrix(),
            dragPlane: null,
        });

        return this._createMeshForCollision(
            this._collisionShapes[this._collisionShapes.length - 1]
        );
    }

    protected _createMeshForCollision(
        shape: ICollisionShape
    ): [BABYLON.Nullable<BABYLON.Mesh>, BABYLON.Nullable<ICollisionShape>] {
        const mesh = shape.createMesh?.(this._scene, shape, ...shape.params);

        shape.position = shape.position ?? new BABYLON.Vector3(0, 0, 0);
        if (!shape.rotation && !shape.rotationQuaternion) {
            shape.rotation = new BABYLON.Vector3(0, 0, 0);
        }

        if (!mesh) {
            return [null, null];
        }

        mesh.position = shape.position;
        if (shape.rotation) {
            mesh.rotation = shape.rotation;
        } else {
            mesh.rotationQuaternion = shape.rotationQuaternion!;
        }

        shape.mesh = mesh;

        if (shape.dragPlane) {
            const camera =
                this._scene.activeCameras?.[0] ?? this._scene.activeCamera!;

            const pointerDragBehavior = new BABYLON.PointerDragBehavior({
                dragPlaneNormal: shape.dragPlane,
            });
            pointerDragBehavior.useObjectOrientationForDragging = false;

            pointerDragBehavior.onDragStartObservable.add(() => {
                camera.detachControl();
            });

            pointerDragBehavior.onDragEndObservable.add(() => {
                camera.attachControl();
            });

            mesh.addBehavior(pointerDragBehavior);
        }

        return [mesh, shape];
    }

    protected async _generateParticles(regenerateAll = true) {
        await this._particleGenerator?.generateParticles(
            this._numParticles,
            regenerateAll
        );

        if (
            this._fluidSim &&
            this._particleGenerator &&
            this._fluidSim.positions !== this._particleGenerator.positions
        ) {
            this._fluidSim.setParticleData(
                this._particleGenerator.positions,
                this._particleGenerator.velocities
            );

            this._fluidRenderObject.object.vertexBuffers["position"]?.dispose();
            this._fluidRenderObject.object.vertexBuffers["velocity"]?.dispose();

            this._fluidRenderObject.object.vertexBuffers["position"] =
                new BABYLON.VertexBuffer(
                    this._engine,
                    this._fluidSim.positions,
                    BABYLON.VertexBuffer.PositionKind,
                    true,
                    false,
                    3,
                    true
                );
            this._fluidRenderObject.object.vertexBuffers["velocity"] =
                new BABYLON.VertexBuffer(
                    this._engine,
                    this._fluidSim.velocities,
                    "velocity",
                    true,
                    false,
                    3,
                    true
                );
        }
    }

    protected _makeGUIMainMenu(): void {
        // empty
    }

    protected _makeGUI(): void {
        this._gui = new LiLGUI.GUI({ title: "Demo" });
        this._gui.domElement.style.marginTop = "60px";
        this._gui.domElement.style.left = "20px";
        this._gui.domElement.id = "simGUI";

        const params = {
            demo: FluidSimulationDemoBase._DemoList[
                FluidSimulationDemoBase._CurrentDemoIndex
            ].name,
            paused: false,
            numParticles: this._numParticles,
            smoothingRadius: this._fluidSim?.smoothingRadius,
            densityReference: this._fluidSim?.densityReference,
            pressureConstant: this._fluidSim?.pressureConstant,
            viscosity: this._fluidSim?.viscosity,
            minTimeStep: this._fluidSim?.minTimeStep,
            maxVelocity: this._fluidSim?.maxVelocity,
            maxAcceleration: this._fluidSim?.maxAcceleration,
            shapeCollisionRestitution: this._shapeCollisionRestitution,
        };

        const demoList: string[] = [];
        for (const demo of FluidSimulationDemoBase._DemoList) {
            demoList.push(demo.name);
        }

        this._gui
            .add(params, "demo", demoList)
            .name("Name")
            .onChange((value: any) => {
                for (
                    let i = 0;
                    i < FluidSimulationDemoBase._DemoList.length;
                    ++i
                ) {
                    if (FluidSimulationDemoBase._DemoList[i].name === value) {
                        FluidSimulationDemoBase.StartDemo(i);
                        break;
                    }
                }
            });

        this._makeGUIMainMenu();

        if (this._fluidSim && this._particleGenerator) {
            const menuFluidSim = this._gui.addFolder("Fluid Simulator");

            menuFluidSim.$title.style.fontWeight = "bold";

            menuFluidSim
                .add(params, "numParticles", 0, 40000, 88)
                .name("Num particles")
                .onChange((value: any) => {
                    this._numParticles = value;
                    this._generateParticles(false);
                });

            menuFluidSim
                .add(params, "smoothingRadius", 0, 2, 0.001)
                .name("Smoothing radius")
                .onChange((value: any) => {
                    this._fluidSim!.smoothingRadius = value || 0.04;
                    this._particleGenerator!.particleRadius =
                        this._fluidSim!.smoothingRadius / 2;
                });

            menuFluidSim
                .add(params, "densityReference", 0, 50000, 100)
                .name("Density reference")
                .onChange((value: any) => {
                    this._fluidSim!.densityReference = value;
                });

            menuFluidSim
                .add(params, "pressureConstant", 0, 100, 1)
                .name("Pressure constant")
                .onChange((value: any) => {
                    this._fluidSim!.pressureConstant = value;
                });

            menuFluidSim
                .add(params, "viscosity", 0, 0.1, 0.001)
                .name("Viscosity")
                .onChange((value: any) => {
                    this._fluidSim!.viscosity = value;
                });

            menuFluidSim
                .add(params, "maxVelocity", 0, 20, 1)
                .name("Max velocity")
                .onChange((value: any) => {
                    this._fluidSim!.maxVelocity = value;
                });

            menuFluidSim
                .add(params, "maxAcceleration", 0, 100000, 10)
                .name("Max acceleration")
                .onChange((value: any) => {
                    this._fluidSim!.maxAcceleration = value;
                });

            menuFluidSim
                .add(params, "minTimeStep", 0, 0.1, 0.00001)
                .name("Min time step")
                .onChange((value: any) => {
                    this._fluidSim!.minTimeStep = value;
                });

            menuFluidSim
                .add(params, "shapeCollisionRestitution", 0, 1, 0.001)
                .name("Collision restitution")
                .onChange((value: any) => {
                    this._shapeCollisionRestitution = value;
                });

            menuFluidSim
                .add(params, "paused")
                .name("Pause")
                .onChange((value: boolean) => {
                    this._onPaused(value);
                });

            menuFluidSim.open();
        }
    }

    protected _onPaused(value: boolean) {
        this._paused = value;
    }

    protected _checkCollisions(particleRadius: number): void {
        if (this._collisionShapes.length === 0) {
            return;
        }

        const positions = this._fluidSim!.positions;
        const velocities = this._fluidSim!.velocities;

        const tmpQuat = BABYLON.TmpVectors.Quaternion[0];
        const tmpScale = BABYLON.TmpVectors.Vector3[0];

        tmpScale.copyFromFloats(1, 1, 1);

        for (let i = 0; i < this._collisionShapes.length; ++i) {
            const shape = this._collisionShapes[i];

            const quat =
                shape.mesh?.rotationQuaternion ??
                shape.rotationQuaternion ??
                BABYLON.Quaternion.FromEulerAnglesToRef(
                    shape.mesh?.rotation.x ?? shape.rotation!.x,
                    shape.mesh?.rotation.y ?? shape.rotation!.y,
                    shape.mesh?.rotation.z ?? shape.rotation!.z,
                    tmpQuat
                );
            BABYLON.Matrix.ComposeToRef(
                tmpScale,
                quat,
                shape.mesh?.position ?? shape.position!,
                shape.transf
            );

            shape.transf.invertToRef(shape.invTransf);
        }

        const pos = BABYLON.TmpVectors.Vector3[4];
        const normal = BABYLON.TmpVectors.Vector3[7];

        for (let a = 0; a < this._fluidSim!.currentNumParticles; ++a) {
            const px = positions[a * 3 + 0];
            const py = positions[a * 3 + 1];
            const pz = positions[a * 3 + 2];

            for (let i = 0; i < this._collisionShapes.length; ++i) {
                const shape = this._collisionShapes[i];
                if (shape.disabled) {
                    continue;
                }

                pos.copyFromFloats(px, py, pz);
                BABYLON.Vector3.TransformCoordinatesToRef(
                    pos,
                    shape.invTransf,
                    pos
                );
                const dist =
                    shape.sdEvaluate(pos, ...shape.params) - particleRadius;
                if (dist < 0) {
                    shape.computeNormal(pos, shape, normal);

                    const restitution = shape.collisionRestitution ?? this._shapeCollisionRestitution;

                    const dotvn =
                        velocities[a * 3 + 0] * normal.x +
                        velocities[a * 3 + 1] * normal.y +
                        velocities[a * 3 + 2] * normal.z;

                    velocities[a * 3 + 0] =
                        (velocities[a * 3 + 0] - 2 * dotvn * normal.x) *
                        restitution;
                    velocities[a * 3 + 1] =
                        (velocities[a * 3 + 1] - 2 * dotvn * normal.y) *
                        restitution;
                    velocities[a * 3 + 2] =
                        (velocities[a * 3 + 2] - 2 * dotvn * normal.z) *
                        restitution;

                    positions[a * 3 + 0] -= normal.x * dist;
                    positions[a * 3 + 1] -= normal.y * dist;
                    positions[a * 3 + 2] -= normal.z * dist;
                }
            }
        }
    }
}
