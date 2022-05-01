import { CreateSceneClass } from "../createScene";

import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

import "./FluidRenderer/fluidRendererSceneComponent";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";

const cameraMin = 0.1;
const cameraMax = 1000;

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

        scene.clearColor = new BABYLON.Color4(0.8, 0.8, 0.8, 1.0);

        // Setup environment
        const dirLight = new BABYLON.Vector3(-2, -1, 1).normalize();
        new BABYLON.DirectionalLight("dirLight", dirLight, scene);        

        scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.env", scene);
        //scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://assets.babylonjs.com/environments/studio.env", scene);
        //scene.environmentTexture = new BABYLON.HDRCubeTexture("temp/uffizi_probe.hdr", scene, 512, false, true, false, true);

        (window as any).BABYLON = BABYLON;

        scene.createDefaultSkybox(scene.environmentTexture);

        const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, Math.PI/2.4, 2, new BABYLON.Vector3(0, 0, 0), scene);
        //const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0.93, 0.47, -1.51), scene);
        //const camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, Math.PI/2.4, 30/20, new BABYLON.Vector3(0, 0, 0), scene);
        camera.fov = 58.31 * Math.PI/180;
        camera.attachControl(canvas, true);
        camera.minZ = cameraMin;
        camera.maxZ = cameraMax;
        camera.wheelPrecision = 50;

        const cameraFront = new BABYLON.ArcRotateCamera("ArcRotateCameraGUI", 0, 0, 1, new BABYLON.Vector3(0, 0, 0), scene);
        cameraFront.layerMask = 0x10000000;

        scene.activeCameras = [camera, cameraFront];

        const fluidRenderer = scene.enableFluidRenderer();

        scene.activeCamera = camera;

        (scene.activeCamera as BABYLON.ArcRotateCamera).setTarget(new BABYLON.Vector3(0.42, 0.07, -0.54));

        const numFrames = 160;
        const positionBuffers: Array<Float32Array> = [];
        
        let numParticles = 0;
        //let particleRadius = 0;

        for (let i = 0; i < numFrames; ++i) {
            const num = "000" + (i + 1);
            const buffer = await (await fetch("assets/particles/SphereDropGround/frame." + num.substring(num.length - 4) + ".pos")).arrayBuffer();
            const buffer32 = new Uint32Array(buffer);
            const bufferFloat = new Float32Array(buffer);

            numParticles = buffer32[0];
            //particleRadius = bufferFloat[1];

            const positions = new Float32Array(numParticles * 3);

            for (let i = 0; i < numParticles; ++i) {
                const x = bufferFloat[2 + i * 3 + 0];
                const y = bufferFloat[2 + i * 3 + 1];
                const z = bufferFloat[2 + i * 3 + 2];

                positions[i * 3 + 0] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = -z;
            }

            positionBuffers.push(positions);
        }

        const vertexBuffers: { [key: string]: BABYLON.VertexBuffer } = {};
        const isInstanced = true;

        vertexBuffers["position"] = new BABYLON.VertexBuffer(this._engine, positionBuffers[0], "position", true, false, 3, isInstanced);

        const entity = fluidRenderer?.addVertexBuffer(vertexBuffers, numParticles, false);

        if (entity) {
            entity.object.particleSize = 0.03;
            entity.object.particleThicknessAlpha = 0.007;
            entity.targetRenderer.enableBlurDepth = true;
            entity.targetRenderer.fluidColor = new BABYLON.Color3(1 - 0.5, 1 - 0.2, 1 - 0.05);
            entity.targetRenderer.blurDepthFilterSize = 8;
            entity.targetRenderer.blurDepthNumIterations = 3;
            entity.targetRenderer.blurDepthDepthScale = 10;
            entity.targetRenderer.thicknessMapSize = 256;
            entity.targetRenderer.density = 3;
        }

        new FluidRendererGUI(this._scene, false);

        let t = 0;
        let deltaT = 0.5;

        scene.onBeforeRenderObservable.add(() => {
            vertexBuffers["position"].updateDirectly(positionBuffers[Math.floor(t)], 0);
            t += deltaT;
            if (t >= numFrames) {
                t = 0;
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
    
        const header = new GUI.TextBlock();
        header.text = "Animation speed";
        header.height = "30px";
        header.color = "white";
        panel.addControl(header); 
    
        const slider = new GUI.Slider();
        slider.minimum = 0;
        slider.maximum = 1;
        slider.value = 0.5;
        slider.step = 0.1;
        slider.height = "20px";
        slider.width = "200px";
        slider.onValueChangedObservable.add((value) => {
            deltaT = value;
        });
        panel.addControl(slider);    
    
        return scene;
    }

}

export default new FluidRendering();
