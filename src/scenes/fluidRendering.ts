import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { FluidRenderer } from "./fluidRenderer";

import flareImg from "../assets/flare32bits.png";

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

        //const numParticles = 30*30*15-3780;//20000*4;
        //const numParticlesEmitRate = 30*30*15-3780;//1500*4;
        const numParticles = 20000*4;
        const numParticlesEmitRate = 1500*4;
        const particleAlpha = 0.075;
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
            const plane = BABYLON.MeshBuilder.CreatePlane("plane", { size: 10 }, scene);
            plane.position.z = -3;
        }

        // Create a particle system
        var particleSystem = new BABYLON.ParticleSystem("particles", numParticles, scene);

        //Texture of each particle
        //particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
        particleSystem.particleTexture = new BABYLON.Texture(flareImg, scene);

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

        if (liquidRendering) {
            const fluidRenderer = new FluidRenderer(scene, particleSystem, dirLight, particleAlpha);
        }

        return scene;
    }

}

export default new FluidRendering();
