import * as BABYLON from "@babylonjs/core";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";

// Pre-computed frames come from https://github.com/ttnghia/RealTimeFluidRendering/releases/tag/Datasets
export class FluidSimulationDemoPrecomputeRendering extends FluidSimulationDemoBase {

    private _animSpeed: number;

    constructor(scene: BABYLON.Scene) {
        super(scene, true);

        this._animSpeed = 0.5;
    }

    public async run() {
        const camera = this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = -0.600;
            (camera as BABYLON.ArcRotateCamera).beta = 1.254;
            (camera as BABYLON.ArcRotateCamera).radius = 2.347;
        }

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

        this._fluidRenderObject.object.vertexBuffers["position"] = new BABYLON.VertexBuffer(this._engine, positionBuffers[0], BABYLON.VertexBuffer.PositionKind, true, false, 3, true);

        (this._fluidRenderObject.object as FluidRenderingObjectVertexBuffer).setNumParticles(numParticles);

        this._fluidRenderObject.object.particleSize = 0.03;
        this._fluidRenderObject.object.particleThicknessAlpha = 0.007;
        this._fluidRenderObject.targetRenderer.minimumThickness = 0;
        this._fluidRenderObject.targetRenderer.blurDepthFilterSize = 10;
        this._fluidRenderObject.targetRenderer.blurDepthDepthScale = 10;
        this._fluidRenderObject.targetRenderer.thicknessMapSize = 256;
        this._fluidRenderObject.targetRenderer.refractionStrength = 0.1;
        this._fluidRenderObject.targetRenderer.blurThicknessFilterSize = 5;
        this._fluidRenderObject.targetRenderer.blurThicknessNumIterations = 1;
        this._fluidRenderObject.targetRenderer.density = 3;
        this._fluidRenderObject.targetRenderer.specularPower = 250;

        let t = 0;

        this._sceneObserver = this._scene.onBeforeRenderObservable.add(() => {
            this._fluidRenderObject.object.vertexBuffers["position"].updateDirectly(positionBuffers[Math.floor(t)], 0);
            t += this._animSpeed;
            if (t >= numFrames) {
                t = 0;
            }
        });

        super.run();
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            animSpeed: this._animSpeed,
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "animSpeed", 0, 1, 0.1)
            .name("Animation speed")
            .onChange((value: any) => {
                this._animSpeed = value;
            });
    }
}
