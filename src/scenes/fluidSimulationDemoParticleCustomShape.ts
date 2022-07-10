import * as BABYLON from "@babylonjs/core";
//import * as BABYLONSER from "@babylonjs/serializers";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";

export class FluidSimulationDemoParticleCustomShape extends FluidSimulationDemoBase {
    private _initParticles: boolean;
    private _started: boolean;
    private _meshPCS: BABYLON.Nullable<BABYLON.Mesh>;
    private _pcs: BABYLON.Nullable<BABYLON.PointsCloudSystem>;

    constructor(scene: BABYLON.Scene) {
        super(scene, true);

        this._initParticles = true;
        this._started = false;
        this._meshPCS = null;
        this._pcs = null;
    }

    protected async _run() {
        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 1.593 - Math.PI / 8;
            (camera as BABYLON.ArcRotateCamera).beta = 1.3;
            (camera as BABYLON.ArcRotateCamera).radius = 9.633;
            (camera as BABYLON.ArcRotateCamera).computeWorldMatrix();
            (camera as BABYLON.ArcRotateCamera).setTarget(
                new BABYLON.Vector3(0, 3, 0)
            );
            (camera as BABYLON.ArcRotateCamera).beta = 1.3;
            (camera as BABYLON.ArcRotateCamera).computeWorldMatrix();
        }

        await BABYLON.SceneLoader.AppendAsync(
            "https://assets.babylonjs.com/meshes/Dude/",
            "dude.babylon",
            this._scene
        );

        this._scene.getCameraByName("Default camera")?.dispose();

        if (this._scene.activeCameras && this._scene.activeCameras.length > 0) {
            this._scene.activeCameras[0] = camera!;
        } else {
            this._scene.activeCamera = camera;
        }

        this._pcs = new BABYLON.PointsCloudSystem("pcs", 3, this._scene);

        this._scene
            .getMeshByName("him")!
            .getChildMeshes()
            .forEach((m) => {
                m.setEnabled(false);
                m.scaling.setAll(0.1);
                m.rotation.y = Math.PI / 8;
                //m.rotation.y = Math.PI;
                //(m as BABYLON.Mesh).bakeCurrentTransformIntoVertices();
                (m.material as any).disableLighting = true;
                (m.material as any).emissiveTexture = (
                    m.material as any
                ).diffuseTexture;
                this._pcs!.addSurfacePoints(
                    m as BABYLON.Mesh,
                    5000,
                    BABYLON.PointColor.Color,
                    0
                );
            });

        /*this._scene.useRightHandedSystem = true;
        console.log(BABYLONSER.OBJExport.OBJ(this._scene.getMeshByName("him")!.getChildMeshes()));
        this._scene.useRightHandedSystem = false;*/

        this._meshPCS = await this._pcs.buildMeshAsync();

        this._meshPCS.setEnabled(false);

        const positions: Float32Array = this._pcs.positions;
        const origPositions = positions.slice(0);
        const numParticles = positions.length / 3;

        this._fluidRenderObject.object.vertexBuffers["position"] =
            new BABYLON.VertexBuffer(
                this._engine,
                positions,
                BABYLON.VertexBuffer.PositionKind,
                true,
                false,
                3,
                true
            );
        this._fluidRenderObject.object.vertexBuffers["color"] =
            new BABYLON.VertexBuffer(
                this._engine,
                this._pcs.colors,
                "color",
                false,
                false,
                4,
                true
            );

        (
            this._fluidRenderObject.object as FluidRenderingObjectVertexBuffer
        ).setNumParticles(numParticles);

        this._fluidRenderObject.object.particleSize = 0.15;
        this._fluidRenderObject.object.particleThicknessAlpha = 0.1;
        this._fluidRenderObject.targetRenderer.minimumThickness = 0;
        this._fluidRenderObject.targetRenderer.blurDepthFilterSize = 15;
        this._fluidRenderObject.targetRenderer.blurDepthNumIterations = 8;
        this._fluidRenderObject.targetRenderer.blurDepthDepthScale = 50;
        this._fluidRenderObject.targetRenderer.thicknessMapSize = 1024;
        this._fluidRenderObject.targetRenderer.density = 0.63;
        this._fluidRenderObject.targetRenderer.generateDiffuseTexture = true;
        this._fluidRenderObject.targetRenderer.fresnelClamp = 0.1;

        const velocity: number[] = [];
        const accel: number[] = [];
        const stopped: number[] = [];

        const initParticles = () => {
            const min = new BABYLON.Vector3(1e10, 1e10, 1e10),
                max = new BABYLON.Vector3(-1e10, -1e10, -1e10);
            for (let i = 0; i < numParticles; ++i) {
                min.x = Math.min(positions[i * 3 + 0], min.x);
                min.y = Math.min(positions[i * 3 + 1], min.y);
                min.z = Math.min(positions[i * 3 + 2], min.z);
                max.x = Math.max(positions[i * 3 + 0], max.x);
                max.y = Math.max(positions[i * 3 + 1], max.y);
                max.z = Math.max(positions[i * 3 + 2], max.z);
            }

            velocity.length = 0;
            accel.length = 0;
            stopped.length = 0;

            for (let i = 0; i < numParticles; ++i) {
                const f = Math.random() * 0.005;
                const g = Math.random() * 0.001;
                const h = Math.random() * 0.005;

                accel.push((-0.5 + Math.random()) * Math.random() * f);
                accel.push(Math.random() * (Math.random() + 1.0) * g);
                accel.push((-0.5 + Math.random()) * Math.random() * h);

                velocity.push(0, 0, 0);

                stopped.push(0);
            }

            this._initParticles = false;
        };

        const dt = 1 / 60 / 1000;
        this._sceneObserver = this._scene.onBeforeRenderObservable.add(() => {
            if (!this._started) {
                return;
            }

            if (this._initParticles) {
                positions.set(origPositions);
                initParticles();
                this._fluidRenderObject.object.vertexBuffers[
                    "position"
                ].updateDirectly(positions, 0);
            }

            if (this._paused) {
                return;
            }

            let numStopped = 0;
            for (let i = 0; i < numParticles; ++i) {
                if (stopped[i]) {
                    numStopped++;
                    continue;
                }
                accel[i * 3 + 1] += -9.81 * dt;
                velocity[i * 3 + 0] += accel[i * 3 + 0];
                velocity[i * 3 + 1] += accel[i * 3 + 1];
                velocity[i * 3 + 2] += accel[i * 3 + 2];
                positions[i * 3 + 0] += velocity[i * 3 + 0];
                positions[i * 3 + 1] += velocity[i * 3 + 1];
                positions[i * 3 + 2] += velocity[i * 3 + 2];
                if (positions[i * 3 + 1] <= -2) {
                    //velocity[i * 3 + 0] *= Math.random() / 10 + 0.8;
                    velocity[i * 3 + 1] *= -(Math.random() / 10 + 0.4);
                    //velocity[i * 3 + 2] *= Math.random() / 10 + 0.8;
                    if (positions[i * 3 + 1] + velocity[i * 3 + 1] < -2) {
                        stopped[i] = 1;
                    }
                    positions[i * 3 + 1] = -2;
                }
            }

            this._started == numStopped < numParticles;

            this._fluidRenderObject.object.vertexBuffers[
                "position"
            ].updateDirectly(positions, 0);
        });

        super._run();
    }

    public dispose() {
        super.dispose();

        this._scene.getMeshByName("him")!.dispose(false, true);
        /*this._scene.getMeshByName("him")!.getChildMeshes().forEach((m) => {
            m.dispose();
        });*/

        this._pcs?.dispose();
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            paused: this._paused,
            start: () => {
                this._initParticles = true;
                this._started = true;
            },
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "start").name("Start");

        mainMenu
            .add(params, "paused")
            .name("Pause")
            .onChange((value: boolean) => {
                this._paused = value;
            });
    }
}
