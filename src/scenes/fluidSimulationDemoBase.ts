import * as BABYLON from "@babylonjs/core";

import * as LiLGUI from 'lil-gui'; 

import { FluidRenderer, IFluidRenderingRenderObject } from "./FluidRenderer/fluidRenderer";
import { FluidRendererGUI } from "./FluidRenderer/fluidRendererGUI";
import { FluidRenderingObjectVertexBuffer } from "./FluidRenderer/fluidRenderingObjectVertexBuffer";
import { FluidSimulator } from "./FluidSimulator2/fluidSimulator";
import { ParticleGenerator } from "./particleGenerator";

export class FluidSimulationDemoBase {

    protected _scene: BABYLON.Scene;
    protected _engine: BABYLON.Engine;
    protected _gui: BABYLON.Nullable<LiLGUI.GUI>;

    protected _fluidRenderer: FluidRenderer;
    protected _fluidRenderObject: IFluidRenderingRenderObject;
    protected _fluidRendererGUI: BABYLON.Nullable<FluidRendererGUI>;
    protected _fluidSim: FluidSimulator;
    protected _particleGenerator: ParticleGenerator;
    protected _numMaxParticles: number;
    protected _paused: boolean;

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._fluidRenderer = scene.enableFluidRenderer()!;
        this._numMaxParticles = 2700;
        this._paused = false;
        this._gui = null;
        this._fluidRendererGUI = null;

        const particleRadius = 0.02;
        const camera = scene.activeCamera ?? scene.activeCameras?.[0];

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

        // Setup the fluid simulator / particle generator
        this._fluidSim = new FluidSimulator();

        this._fluidSim.smoothingRadius = particleRadius * 2;
        this._fluidSim.maxVelocity = 3;

        (window as any).fsim = this._fluidSim;

        this._particleGenerator = new ParticleGenerator(this._scene);
        this._particleGenerator.particleRadius = this._fluidSim.smoothingRadius / 2;

        scene.onBeforeRenderObservable.add(() => {
            this._fluidSim.currentNumParticles = Math.min(this._numMaxParticles, this._particleGenerator.currNumParticles);
            (this._fluidRenderObject.object as FluidRenderingObjectVertexBuffer).setNumParticles(this._fluidSim.currentNumParticles);
        
            if (!this._paused) {
                this._fluidSim.update(8 / 1000/*this._engine.getDeltaTime() / 1000*/);
                this._checkCollisions(this._fluidRenderObject.object.particleSize / 2);
            }

            if (this._fluidRenderObject) {
                this._fluidRenderObject.object.vertexBuffers["position"].updateDirectly(this._fluidSim.positions, 0);
                this._fluidRenderObject.object.vertexBuffers["velocity"].updateDirectly(this._fluidSim.velocities, 0);
            }
        });
    }

    public run(): void {
        this._generateParticles();

        this._fluidRendererGUI = new FluidRendererGUI(this._scene, false);

        this._makeGUI();
    }

    public dispose(): void {
        this._fluidRendererGUI?.dispose();
        this._gui?.destroy();
        this._fluidSim.dispose();
        this._particleGenerator.dispose();
        this._fluidRenderer.removeRenderObject(this._fluidRenderObject);
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

    protected _makeGUIMainMenu(): void {
        // empty
    }

    protected _makeGUI(): void {
        this._gui = new LiLGUI.GUI({ title: "Demo" });
        this._gui.domElement.style.marginTop = "60px";
        this._gui.domElement.style.left = "20px";
        this._gui.domElement.id = "simGUI";

        const params = {
            paused: false,
            numParticles: this._numMaxParticles,
            smoothingRadius: this._fluidSim.smoothingRadius,
            densityReference: this._fluidSim.densityReference,
            pressureConstant: this._fluidSim.pressureConstant,
            viscosity: this._fluidSim.viscosity,
            minTimeStep: this._fluidSim.minTimeStep,
            maxVelocity: this._fluidSim.maxVelocity,
            maxAcceleration: this._fluidSim.maxAcceleration,
        };

        this._makeGUIMainMenu();

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

            menuFluidSim.add(params, "paused")
            .name("Pause")
            .onChange((value: boolean) => {
                this._paused = value;
            });        

        menuFluidSim.open();
    }

    protected _checkCollisions(particleRadius: number): void {
        // empty
    }
}