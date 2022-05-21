import * as BABYLON from "@babylonjs/core";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";
import { ParticleGenerator } from "./Utils/particleGenerator";
import { ICollisionShape } from "./Utils/sdfHelper";

export class FluidSimulationDemoHeightMap extends FluidSimulationDemoBase {
    private _particleGeneratorName: string;
    private _sphere: BABYLON.Mesh;
    private _box: BABYLON.Mesh;
    private _heightMap: [BABYLON.Nullable<BABYLON.Mesh>, BABYLON.Nullable<ICollisionShape>];
    private _ground: BABYLON.Mesh;
    private _groundCollision: ICollisionShape;
    private _time: number;
    private _showHeightmap: boolean;

    constructor(scene: BABYLON.Scene) {
        super(scene, false);

        this._numParticles = 10000;
        this._particleGeneratorName = "Water jet";
        this._time = 0;
        this._showHeightmap = true;

        const terrainSize = 2.85;

        this._sphere = this.addCollisionSphere(
            new BABYLON.Vector3(0, 0.2, 0),
            0.2,
            null
        )[0]!;
        this._box = this.addCollisionBox(
            new BABYLON.Vector3(-0.7, 0.249, -0.7),
            new BABYLON.Vector3(0, 0, (90 * Math.PI) / 180),
            new BABYLON.Vector3(0.2, 0.05, 0.5)
        )[0]!;

        this._heightMap = this.addCollisionTerrain(terrainSize);

        this.addCollisionPlane(new BABYLON.Vector3(0, 0, -1), terrainSize / 2);
        this.addCollisionPlane(new BABYLON.Vector3(0, 0, 1), terrainSize / 2);
        this.addCollisionPlane(new BABYLON.Vector3(1, 0, 0), terrainSize / 2);
        this.addCollisionPlane(new BABYLON.Vector3(-1, 0, 0), terrainSize / 2);
        this._groundCollision = this.addCollisionPlane(new BABYLON.Vector3(0, 1, 0), 0)[1]!;
        this._groundCollision.disabled = true;

        this._ground = BABYLON.MeshBuilder.CreateGround("ground", { width: terrainSize, height: terrainSize }, this._scene);
        this._ground.material = this._heightMap[0]!.material;
        this._ground.setEnabled(false);
    }

    public async run() {
        const camera =
            this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 4.65;
            (camera as BABYLON.ArcRotateCamera).beta = 1.12;
            (camera as BABYLON.ArcRotateCamera).radius = 3.9;
        }

        this._fluidRenderObject.targetRenderer.blurThicknessFilterSize = 12;
        this._fluidRenderObject.targetRenderer.blurThicknessNumIterations = 3;
        this._fluidRenderObject.targetRenderer.specularPower = 50;
        this._fluidRenderObject.targetRenderer.refractionStrength = 0.02;
        this._fluidRenderObject.targetRenderer.density = 5;

        this._createParticleGenerator();

        super.run();
    }

    private _createParticleGenerator(): void {
        this._particleGenerator?.dispose();

        let particleSize = "";

        switch (this._particleGeneratorName) {
            case "Water jet":
                this._fluidRenderObject.object.particleSize = 0.08;

                this._fluidSim!.smoothingRadius = 0.04;
                this._fluidSim!.densityReference = 20000;
                this._fluidSim!.pressureConstant = 3;
                this._fluidSim!.viscosity = 0.01;
                this._fluidSim!.maxVelocity = 3;
                this._fluidSim!.maxAcceleration = 2000;
                this._fluidSim!.minTimeStep = 0.1;
                this._fluidSim!.gravity.y = -9.81;
                break;
            case "Dragon 0.04":
            case "Dude 0.04":
                this._fluidRenderObject.object.particleSize = 0.08;

                this._fluidSim!.smoothingRadius = 0.08;
                this._fluidSim!.densityReference = 6000;
                this._fluidSim!.pressureConstant = 10;
                this._fluidSim!.viscosity = 0.01;
                this._fluidSim!.maxVelocity = 4;
                this._fluidSim!.maxAcceleration = 2000;
                this._fluidSim!.minTimeStep = 0.1;
                this._fluidSim!.gravity.y = -9.81;

                particleSize = "04";
                break;
            case "Dragon 0.03":
            case "Dude 0.03":
                this._fluidRenderObject.object.particleSize = 0.06;

                this._fluidSim!.smoothingRadius = 0.06;
                this._fluidSim!.densityReference = 17000;
                this._fluidSim!.pressureConstant = 15;
                this._fluidSim!.viscosity = 0.01;
                this._fluidSim!.maxVelocity = 4;
                this._fluidSim!.maxAcceleration = 2000;
                this._fluidSim!.minTimeStep = 0.1;
                this._fluidSim!.gravity.y = -9.81;

                particleSize = "03";
                break;
        }

        this._particleGenerator = new ParticleGenerator(
            this._scene,
            particleSize === ""
                ? undefined
                : this._particleGeneratorName.indexOf("Dragon") >= 0
                ? "dragon_" + particleSize
                : "dude_" + particleSize
        );

        this._particleGenerator!.position.y = 2;
        this._particleGenerator!.position.z = 0.3;
        this._particleGenerator.particleRadius =
            this._fluidSim!.smoothingRadius / 2;
    }

    public dispose() {
        super.dispose();

        this._ground.dispose();
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            restart: () => {
                this._generateParticles();
            },
            particleGeneratorName: this._particleGeneratorName,
            showHeightmap: this._showHeightmap,
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "restart").name("Restart");

        mainMenu
            .add(params, "particleGeneratorName", [
                "Water jet",
                "Dragon 0.04",
                "Dude 0.04",
                "Dragon 0.03",
                "Dude 0.03",
            ])
            .name("Particle generator")
            .onChange(async (value: any) => {
                this._particleGeneratorName = value;
                this._createParticleGenerator();
                await this._generateParticles();
                if (value !== "Water jet") {
                    this._numParticles =
                        this._particleGenerator!.currNumParticles;
                }
            });

            mainMenu
            .add(params, "showHeightmap")
            .name("Show height map")
            .onChange((value: boolean) => {
                this._showHeightmap = value;
                this._ground.setEnabled(!value);
                this._groundCollision.disabled = value;
                this._heightMap[0]!.setEnabled(value);
                this._heightMap[1]!.disabled = !value;
            });
    }

    protected _checkCollisions(particleRadius: number): void {
        this._sphere.position.x = Math.cos((2 * this._time) / 3.3) * 1.1;
        this._sphere.position.z = Math.sin((5 * this._time) / 3.3) * 1.1;

        this._box.rotation.y = this._time * 2;

        this._time += 0.02;

        super._checkCollisions(particleRadius);
    }
}
