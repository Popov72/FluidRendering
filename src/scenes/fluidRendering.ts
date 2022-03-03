import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";

import flareImg from "../assets/flare32bits.png";

import "./FluidRenderer/fluidRendererSceneComponent";

const cameraMax = 10000;

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

        //const numParticles = 30*30*15-3780;//20000*4;
        //const numParticlesEmitRate = 30*30*15-3780;//1500*4;
        const numParticles = 20000*4;
        const numParticlesEmitRate = 1500*4;
        const particleAlpha = 0.075;//0.075;
        const animate = true;
        const liquidRendering = true;
        const showObstacle = false;

        // Setup environment
        const dirLight = new BABYLON.Vector3(-2, -1, 1).normalize();
        var light = new BABYLON.DirectionalLight("dirLight", dirLight, scene);        

        scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.env", scene);
        //scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);
        //scene.environmentTexture = new BABYLON.HDRCubeTexture("temp/uffizi_probe.hdr", scene, 512, false, true, false, true);

        scene.createDefaultSkybox(scene.environmentTexture);

        var camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, Math.PI/2.4, 30, new BABYLON.Vector3(0, 0, 0), scene);
        camera.fov = 60 * Math.PI/180;
        camera.attachControl(canvas, true);
        //camera.minZ = 0.1;
        camera.maxZ = cameraMax;

        // Ground
        /*var ground = BABYLON.Mesh.CreatePlane("ground", 50.0, scene);
        ground.position = new BABYLON.Vector3(0, -10, 0);
        ground.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);

        const mat = new BABYLON.StandardMaterial("groundMat", scene);
        ground.material = mat;
        mat.backFaceCulling = false;
        mat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 1);*/

        if (showObstacle) {
            const plane = BABYLON.MeshBuilder.CreatePlane("plane", { size: 15 }, scene);
            plane.position.z = -3;
        }

        // Create a particle system
        var particleSystem = new BABYLON.ParticleSystem("particles", numParticles, scene);

        //Texture of each particle
        particleSystem.particleTexture = new BABYLON.Texture(flareImg, scene);
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        // Where the particles come from
        particleSystem.createConeEmitter(4, Math.PI / 2);

        // Colors of all particles
        particleSystem.color1 = new BABYLON.Color4(0.4, 1.0, 0.3, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.4, 1.0, 0.3, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        particleSystem.colorDead = new BABYLON.Color4(0.4, 1.0, 0.3, 1.0);

        // Size of each particle (random between...
        particleSystem.minSize = 0.5*1.5;
        particleSystem.maxSize = 0.5*1.5;

        // Life time of each particle (random between...
        particleSystem.minLifeTime = 2.0;
        particleSystem.maxLifeTime = 2.5;

        // Emission rate
        particleSystem.emitRate = numParticlesEmitRate;

        // Set the gravity of all particles
        particleSystem.gravity = new BABYLON.Vector3(0, -10.81, 0);

        // Speed
        particleSystem.minEmitPower = 2.5;
        particleSystem.maxEmitPower = 6.5;
        particleSystem.updateSpeed = 0.02;

        // Start the particle system
        particleSystem.preWarmCycles = 60 * 8;

        particleSystem.start();

        (window as any).ps = particleSystem;

        if (!animate) {
            particleSystem.updateSpeed = 0;
        }

        particleSystem.renderAsFluid = liquidRendering;

        if (liquidRendering) {
            const fluidRenderer = scene.enableFluidRenderer();

            const loadModel = async () => {
                await BABYLON.SceneLoader.AppendAsync("https://assets.babylonjs.com/meshes/Dude/", "dude.babylon", scene);
            };

            await loadModel();

            var pcs = new BABYLON.PointsCloudSystem("pcs", 3, scene);

            scene.getMeshByName("him")!.getChildMeshes().forEach((m) => {
                m.setEnabled(false);
                m.scaling.setAll(0.1);
                m.rotation.y = Math.PI / 2;
                (m.material as any).disableLighting = true;
                (m.material as any).emissiveTexture = (m.material as any).diffuseTexture;
                m.position.z += 15;
                //pcs.addVolumePoints(m as BABYLON.Mesh, 5000, BABYLON.PointColor.Color, 0);
                pcs.addSurfacePoints(m as BABYLON.Mesh, 20000, BABYLON.PointColor.Color, 0);
            });
    
            scene.activeCamera = camera;

            new BABYLON.FxaaPostProcess("Fxaa", 1, camera);

            pcs.buildMeshAsync().then((mesh) => {
                const vertexBuffers: { [key: string]: BABYLON.VertexBuffer } = {};

                const positions: Float32Array = (pcs as any)._positions32;
                const numParticles = positions.length / 3;

                vertexBuffers["position"] = new BABYLON.VertexBuffer(this._engine, positions, "position", true, false, 3, true);
                vertexBuffers["color"] = new BABYLON.VertexBuffer(this._engine, (pcs as any)._colors32, "color", false, false, 4, true);

                const entity = fluidRenderer?.addVertexBuffer(vertexBuffers, numParticles, true);

                if (entity) {
                    entity.object.particleSize = 0.1;
                    entity.object.particleThicknessAlpha = 0.1;
                    entity.targetRenderer.blurKernel = 10;
                    entity.targetRenderer.blurScale = 0.1;
                    entity.targetRenderer.blurDepthScale = 50;
                }

                mesh.setEnabled(false);

                scene.activeCamera = camera;

                const velocity: number[] = [];
                const accel: number[] = [];
                const stopped: number[] = [];

                const min = new BABYLON.Vector3(1e10, 1e10, 1e10), max = new BABYLON.Vector3(-1e10, -1e10, -1e10);
                for (let i = 0; i < numParticles; ++i) {
                    min.x = Math.min(positions[i * 3 + 0], min.x);
                    min.y = Math.min(positions[i * 3 + 1], min.y);
                    min.z = Math.min(positions[i * 3 + 2], min.z);
                    max.x = Math.max(positions[i * 3 + 0], max.x);
                    max.y = Math.max(positions[i * 3 + 1], max.y);
                    max.z = Math.max(positions[i * 3 + 2], max.z);
                }
                const center = min.add(max).scaleInPlace(0.5);
                const diag = BABYLON.Vector3.Distance(center, min);

                const pos = new BABYLON.Vector3();
                for (let i = 0; i < numParticles; ++i) {
                    pos.copyFromFloats(positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]);
                    //const dist = BABYLON.Vector3.Distance(pos, center);
                    const f = Math.random() * 0.005;//Math.abs(diag - dist) / diag * 0.001;
                    const g = Math.random() * 0.001;//Math.abs(diag - dist) / diag * 0.001;
                    const h = Math.random() * 0.005;//Math.abs(diag - dist) / diag * 0.001;
                    accel.push((-0.5 + Math.random()) * Math.random() * f);
                    accel.push(Math.random() * (Math.random() + 1.0) * g);
                    accel.push((-0.5 + Math.random()) * Math.random() * h);
                    velocity.push(0, 0, 0);
                    stopped.push(0);
                }

                let dt = 1 / 60 / 1000;
                (window as any).doit = () => {
                    scene.onBeforeRenderObservable.add(() => {
                        for (let i = 0; i < numParticles; ++i) {
                            if (stopped[i]) continue;
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
                        vertexBuffers["position"].updateDirectly(positions, 0);
                    });
                };
            });
        }

        return scene;
    }

}

export default new FluidRendering();
