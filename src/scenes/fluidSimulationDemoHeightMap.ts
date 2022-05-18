import * as BABYLON from "@babylonjs/core";

import { FluidSimulationDemoBase } from "./fluidSimulationDemoBase";
import { ParticleGenerator } from "./particleGenerator";

// Textures from https://freepbr.com/materials/sulphuric-rock/
import rockBaseColor from "../assets/materials/sulphuric-rock_albedo.png";
import rockRoughness from "../assets/materials/sulphuric-rock_roughness.png";
import rockNormal from "../assets/materials/sulphuric-rock_normal-ogl.png";

const eps = 0.0001;

const eps1 = new BABYLON.Vector3(eps, -eps, -eps);
const eps2 = new BABYLON.Vector3(-eps, -eps, eps);
const eps3 = new BABYLON.Vector3(-eps, eps, -eps);
const eps4 = new BABYLON.Vector3(eps, eps, eps);

const dir1 = new BABYLON.Vector3(1, -1, -1);
const dir2 = new BABYLON.Vector3(-1, -1, 1);
const dir3 = new BABYLON.Vector3(-1, 1, -1);
const dir4 = new BABYLON.Vector3(1, 1, 1);

const showTerrain = true;

let t = 0;

export class FluidSimulationDemoHeightMap extends FluidSimulationDemoBase {

    private _terrainCollisionRestitution: number;
    private _boxCollisionRestitution: number;
    private _ground: BABYLON.Nullable<BABYLON.GroundMesh>;
    private _groundMaterial: BABYLON.Nullable<BABYLON.PBRMaterial>;
    private _normal = new BABYLON.Vector3();
    private _terrainSize: number;
    private _collisionPlanes: Array<BABYLON.Plane>;
    private _collisionBoxes: Array<{ extends: BABYLON.Vector3, transf: BABYLON.Matrix, invTransf: BABYLON.Matrix, mesh: BABYLON.Mesh }>;
    private _particleGeneratorName: string;

    constructor(scene: BABYLON.Scene) {
        super(scene, false);

        this._numParticles = 10000;
        this._terrainCollisionRestitution = 0.999;
        this._boxCollisionRestitution = 0.999;
        this._particleGeneratorName = "Water jet";
        this._ground = null;
        this._groundMaterial = null;
        this._terrainSize = 5;
        this._collisionPlanes = [];
        this._collisionBoxes = [{
            extends: new BABYLON.Vector3(0.3, 0.08, 0.5),
            transf: BABYLON.Matrix.Compose(new BABYLON.Vector3(1, 1, 1), BABYLON.Quaternion.FromEulerAngles(-20 * Math.PI / 180, 0, 0), new BABYLON.Vector3(0, 0.75, 0)),
            invTransf: BABYLON.Matrix.Identity(),
            mesh: null as any,
        }, {
            extends: new BABYLON.Vector3(0.3, 0.08, 0.5),
            transf: BABYLON.Matrix.Compose(new BABYLON.Vector3(1, 1, 1), BABYLON.Quaternion.FromEulerAngles(50 * Math.PI / 180, 0, 0), new BABYLON.Vector3(0, 0.5, -0.90)),
            invTransf: BABYLON.Matrix.Identity(),
            mesh: null as any,
        }];

        for (let i = 0; i < this._collisionBoxes.length; ++i) {
            const box = this._collisionBoxes[i];
            box.invTransf = new BABYLON.Matrix();
            box.transf.invertToRef(box.invTransf);
        }

        this._collisionBoxes = [];

        this._createCollisionPlanes();
    }

    private _createCollisionPlanes(): void {
        this._collisionPlanes = [
            new BABYLON.Plane(0, 0, -1, this._terrainSize / 2),
            new BABYLON.Plane(0, 0, 1, this._terrainSize / 2),
            new BABYLON.Plane(1, 0, 0, this._terrainSize / 2),
            new BABYLON.Plane(-1, 0, 0, this._terrainSize / 2),
        ];

        if (!showTerrain) {
            this._collisionPlanes.push(new BABYLON.Plane(0, 1, 0, 0));
        }
    }

    public async run() {
        const mat = new BABYLON.PBRMaterial("mat", this._scene);

        mat.metallicTexture = new BABYLON.Texture(rockRoughness, this._scene);
        mat.albedoTexture = new BABYLON.Texture(rockBaseColor, this._scene);
        mat.bumpTexture = new BABYLON.Texture(rockNormal, this._scene);
        mat.useRoughnessFromMetallicTextureGreen = true;
        mat.metallic = 0;
        mat.roughness = 1;

        this._groundMaterial = mat;

        const camera = this._scene.activeCameras?.[0] ?? this._scene.activeCamera;

        if (camera) {
            (camera as BABYLON.ArcRotateCamera).alpha = 4.38;
            (camera as BABYLON.ArcRotateCamera).beta = 1.16;
            (camera as BABYLON.ArcRotateCamera).radius = 3.9;
        }

        this._fluidRenderObject.targetRenderer.blurThicknessFilterSize = 12;
        this._fluidRenderObject.targetRenderer.blurThicknessNumIterations = 3;
        this._fluidRenderObject.targetRenderer.specularPower = 50;
        this._fluidRenderObject.targetRenderer.density = 5;

        this._createParticleGenerator();

        for (let i = 0; i < this._collisionBoxes.length; ++i) {
            const box = this._collisionBoxes[i];
            const boxMesh = BABYLON.MeshBuilder.CreateBox("box" + i, { width: box.extends.x * 2, height: box.extends.y * 2, depth: box.extends.z * 2 }, this._scene);

            if (i === 0) {
                boxMesh.position.x = box.transf.m[12];
                boxMesh.position.y = box.transf.m[13];
                boxMesh.position.z = box.transf.m[14];
            } else {
                boxMesh.bakeTransformIntoVertices(box.transf);
            }

            box.mesh = boxMesh;
        }

        if (this._collisionBoxes.length > 0) {
            new BABYLON.DirectionalLight("dirl", new BABYLON.Vector3(-1, -1, 1), this._scene);
            new BABYLON.DirectionalLight("dirl", new BABYLON.Vector3(-1, -1, -1), this._scene);
        }

        super.run();
    }

    private _createParticleGenerator(): void {
        this._ground?.dispose();

        this._terrainSize = 2.85;

        if (showTerrain) {
            this._ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap("gdhm", "https://playground.babylonjs.com/textures/heightMap.png", { width: this._terrainSize, height: this._terrainSize, subdivisions: 128, maxHeight: this._terrainSize / 5, onReady: () => this._ground!.updateCoordinateHeights() }, this._scene);
            this._ground.material = this._groundMaterial;
        } else {
            (this._ground as BABYLON.Mesh) = BABYLON.MeshBuilder.CreatePlane("terrain", { width: this._terrainSize, height: this._terrainSize }, this._scene);
            this._ground!.rotation.x = Math.PI / 2;
            this._ground!.material = this._groundMaterial;
        }

        this._createCollisionPlanes();

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

        this._particleGenerator = new ParticleGenerator(this._scene, particleSize === "" ? undefined : this._particleGeneratorName.indexOf("Dragon") >= 0 ? "dragon_" + particleSize : "dude_" + particleSize);

        this._particleGenerator!.position.y = 2;
        this._particleGenerator!.position.z = 0.3;
        this._particleGenerator.particleRadius = this._fluidSim!.smoothingRadius / 2;
    }

    public dispose(): void {
        super.dispose();

        this._ground?.dispose();
    }

    protected _makeGUIMainMenu(): void {
        const params = {
            restart: () => {
                this._generateParticles();
            },
            terrainCollisionRestitution: this._terrainCollisionRestitution,
            particleGeneratorName: this._particleGeneratorName,
        };

        const mainMenu = this._gui!;

        mainMenu.add(params, "restart").name("Restart");

        mainMenu.add(params, "terrainCollisionRestitution", 0, 1, 0.01)
            .name("Terrain collision restitution")
            .onChange((value: any) => {
                this._terrainCollisionRestitution = value;
            });

        mainMenu.add(params, "particleGeneratorName", ["Water jet", "Dragon 0.04", "Dude 0.04", "Dragon 0.03", "Dude 0.03"])
            .name("Particle generator")
            .onChange(async (value: any) => {
                this._particleGeneratorName = value;
                this._createParticleGenerator();
                await this._generateParticles();
                if (value !== "Water jet") {
                    this._numParticles = this._particleGenerator!.currNumParticles;
                }
            });
    }

    protected _sdBox(p: BABYLON.Vector3, b: BABYLON.Vector3) {
        const q = BABYLON.TmpVectors.Vector3[0];
        q.copyFromFloats(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
        q.subtractInPlace(b);

        const tmp = Math.min(Math.max(q.x, q.y, q.z), 0);

        q.maximizeInPlaceFromFloats(0, 0, 0);

        return q.length() + tmp;
    }

    protected _checkCollisions(particleRadius: number): void {
        const positions = this._fluidSim!.positions;
        const velocities = this._fluidSim!.velocities;

        if (this._collisionBoxes.length > 0) {
            BABYLON.Matrix.ComposeToRef(new BABYLON.Vector3(1, 1, 1), BABYLON.Quaternion.FromEulerAngles(-t, 0, 0), new BABYLON.Vector3(0, 0.75, 0), this._collisionBoxes[0].transf);
            this._collisionBoxes[0].transf.invertToRef(this._collisionBoxes[0].invTransf);

            this._collisionBoxes[0].mesh.rotation.x = -t;
        }

        t += 0.02;

        for (let a = 0; a < this._fluidSim!.currentNumParticles; ++a) {
            const px = positions[a * 3 + 0];
            const py = positions[a * 3 + 1];
            const pz = positions[a * 3 + 2];
            
            // Check collisions with terrain
            if (showTerrain) {
                const yTerrain = this._ground!.getHeightAtCoordinates(px, pz);
                if (py - particleRadius <= yTerrain) {
                    const dist = py - particleRadius - yTerrain;

                    this._ground!.getNormalAtCoordinatesToRef(px, pz, this._normal);

                    const dotvn = velocities[a * 3 + 0] * this._normal.x + velocities[a * 3 + 1] * this._normal.y + velocities[a * 3 + 2] * this._normal.z;

                    velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * this._normal.x) * this._terrainCollisionRestitution;
                    velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * this._normal.y) * this._terrainCollisionRestitution;
                    velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * this._normal.z) * this._terrainCollisionRestitution;

                    positions[a * 3 + 0] -= this._normal.x * dist;
                    positions[a * 3 + 1] -= this._normal.y * dist;
                    positions[a * 3 + 2] -= this._normal.z * dist;
                }
            }

            // Check collisions with planes
            for (let i = 0; i < this._collisionPlanes.length; ++i) {
                const plane = this._collisionPlanes[i];
                const dist = plane.normal.x * positions[a * 3 + 0] + plane.normal.y * positions[a * 3 + 1] + plane.normal.z * positions[a * 3 + 2] + plane.d - particleRadius;
                if (dist < 0) {
                    const dotvn = velocities[a * 3 + 0] * plane.normal.x + velocities[a * 3 + 1] * plane.normal.y + velocities[a * 3 + 2] * plane.normal.z;

                    velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * plane.normal.x) * this._terrainCollisionRestitution;
                    velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * plane.normal.y) * this._terrainCollisionRestitution;
                    velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * plane.normal.z) * this._terrainCollisionRestitution;
    
                    positions[a * 3 + 0] -= plane.normal.x * dist;
                    positions[a * 3 + 1] -= plane.normal.y * dist;
                    positions[a * 3 + 2] -= plane.normal.z * dist;
                }
            }

            // Check collisions with boxes
            const pos = BABYLON.TmpVectors.Vector3[4];
            const posTemp = BABYLON.TmpVectors.Vector3[5];
            const dir = BABYLON.TmpVectors.Vector3[6];
            const normal = BABYLON.TmpVectors.Vector3[7];

            for (let i = 0; i < this._collisionBoxes.length; ++i) {
                const box = this._collisionBoxes[i];
                pos.copyFromFloats(px, py, pz);
                BABYLON.Vector3.TransformCoordinatesToRef(pos, box.invTransf, pos);
                const dist = this._sdBox(pos, box.extends) - particleRadius;
                if (dist < 0) {
                    normal.copyFromFloats(0, 0, 0);

                    posTemp.copyFrom(pos);
                    dir.copyFrom(dir1);
                    normal.addInPlace(dir.scaleInPlace(this._sdBox(posTemp.addInPlace(eps1), box.extends)));

                    posTemp.copyFrom(pos);
                    dir.copyFrom(dir2);
                    normal.addInPlace(dir.scaleInPlace(this._sdBox(posTemp.addInPlace(eps2), box.extends)));

                    posTemp.copyFrom(pos);
                    dir.copyFrom(dir3);
                    normal.addInPlace(dir.scaleInPlace(this._sdBox(posTemp.addInPlace(eps3), box.extends)));

                    posTemp.copyFrom(pos);
                    dir.copyFrom(dir4);
                    normal.addInPlace(dir.scaleInPlace(this._sdBox(posTemp.addInPlace(eps4), box.extends)));

                    normal.normalize();

                    const dotvn = velocities[a * 3 + 0] * normal.x + velocities[a * 3 + 1] * normal.y + velocities[a * 3 + 2] * normal.z;

                    velocities[a * 3 + 0] = (velocities[a * 3 + 0] - 2 * dotvn * normal.x) * this._boxCollisionRestitution;
                    velocities[a * 3 + 1] = (velocities[a * 3 + 1] - 2 * dotvn * normal.y) * this._boxCollisionRestitution;
                    velocities[a * 3 + 2] = (velocities[a * 3 + 2] - 2 * dotvn * normal.z) * this._boxCollisionRestitution;
    
                    positions[a * 3 + 0] -= normal.x * dist;
                    positions[a * 3 + 1] -= normal.y * dist;
                    positions[a * 3 + 2] -= normal.z * dist;
                }
            }
        }
    }
}
