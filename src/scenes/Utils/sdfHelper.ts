import * as BABYLON from "@babylonjs/core";

// Textures from https://freepbr.com/materials/sulphuric-rock/
import rockBaseColor from "../../assets/materials/sulphuric-rock_albedo.png";
import rockRoughness from "../../assets/materials/sulphuric-rock_roughness.png";
import rockNormal from "../../assets/materials/sulphuric-rock_normal-ogl.png";

import marbleBaseColor from "../../assets/materials/Marble08_1K_BaseColor.png";

const eps = 0.0001;

const eps1 = new BABYLON.Vector3(eps, -eps, -eps);
const eps2 = new BABYLON.Vector3(-eps, -eps, eps);
const eps3 = new BABYLON.Vector3(-eps, eps, -eps);
const eps4 = new BABYLON.Vector3(eps, eps, eps);

const dir1 = new BABYLON.Vector3(1, -1, -1);
const dir2 = new BABYLON.Vector3(-1, -1, 1);
const dir3 = new BABYLON.Vector3(-1, 1, -1);
const dir4 = new BABYLON.Vector3(1, 1, 1);

export interface SDFArray {
    origin: BABYLON.Vector3;
    dimX: number;
    dimY: number;
    dimZ: number;
    step: number;
    data: number[];
}

export interface ICollisionShape {
    params: Array<any>;
    sdEvaluate: (p: BABYLON.Vector3, ...args: any[]) => number;
    computeNormal: (
        pos: BABYLON.Vector3,
        shape: ICollisionShape,
        normal: BABYLON.Vector3
    ) => void;
    createMesh?: (
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        ...args: any[]
    ) => Promise<BABYLON.Mesh>;
    transf: BABYLON.Matrix;
    invTransf: BABYLON.Matrix;
    scale: number;
    position?: BABYLON.Vector3;
    rotation?: BABYLON.Vector3;
    rotationQuaternion?: BABYLON.Quaternion;
    mesh?: BABYLON.Mesh;
    dragPlane: BABYLON.Nullable<BABYLON.Vector3>;
    disabled?: boolean;
    collisionRestitution?: number;
}

export class SDFHelper {
    public static CreateBox(
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        extents: BABYLON.Vector3
    ) {
        const box = BABYLON.MeshBuilder.CreateBox(
            "box",
            {
                width: extents.x * 2,
                height: extents.y * 2,
                depth: extents.z * 2,
            },
            scene
        );

        const material = new BABYLON.PBRMaterial("boxMat", scene);

        material.metallic = 0;
        material.roughness = 0.9;
        material.albedoTexture = new BABYLON.Texture(
            "https://playground.babylonjs.com/textures/wood.jpg",
            scene
        );
        material.cullBackFaces = true;

        box.material = material;

        return Promise.resolve(box);
    }

    public static CreateSphere(
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        s: number
    ) {
        const sphere = BABYLON.MeshBuilder.CreateSphere(
            "sphere",
            { diameter: s * 2, segments: 16 },
            scene
        );

        const material = new BABYLON.PBRMaterial("sphereMat", scene);

        material.metallic = 1;
        material.roughness = 0.05;
        material.albedoTexture = new BABYLON.Texture(marbleBaseColor, scene);
        material.cullBackFaces = true;

        sphere.material = material;

        return Promise.resolve(sphere);
    }

    public static CreateCutHollowSphere(
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        radius: number,
        planeDist: number,
        thickness: number,
        segments: number
    ) {
        thickness = thickness / radius;

        const sphere = BABYLON.MeshBuilder.CreateSphere(
            "sphere",
            { diameter: radius * 2, segments },
            scene
        );
        const plane = BABYLON.MeshBuilder.CreatePlane(
            "plane",
            { size: radius * 2 },
            scene
        );

        plane.rotation.y = Math.PI / 2;
        plane.position.x = planeDist;

        const csg1 = BABYLON.CSG.FromMesh(sphere);
        const csgp = BABYLON.CSG.FromMesh(plane);

        sphere.dispose();
        plane.dispose();

        csg1.subtractInPlace(csgp);

        const mesh = csg1.toMesh("sppl");

        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo();

        mesh.scaling.setAll(1 - thickness);
        mesh.position.x =
            mesh.getBoundingInfo().boundingBox.maximumWorld.x * thickness;

        const csg2 = BABYLON.CSG.FromMesh(mesh);

        mesh.dispose();

        csg1.subtractInPlace(csg2);

        const meshFinal = csg1.toMesh("cutHollowSphere");

        meshFinal.rotation.z = Math.PI / 2;
        meshFinal.bakeCurrentTransformIntoVertices();

        const material = new BABYLON.PBRMaterial("cutHollowSphereMat", scene);

        material.metallic = 1;
        material.roughness = 0.05;
        material.albedoTexture = new BABYLON.Texture(marbleBaseColor, scene);
        material.cullBackFaces = true;

        meshFinal.material = material;

        return Promise.resolve(meshFinal);
    }

    public static CreateVerticalCylinder(
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        r: number,
        h: number,
        segments: number
    ) {
        const cylinder = BABYLON.MeshBuilder.CreateCylinder(
            "cylinder",
            { diameter: r * 2, height: h, tessellation: segments },
            scene
        );

        const material = new BABYLON.PBRMaterial("cylinderMat", scene);

        material.metallic = 1;
        material.roughness = 0.05;
        material.albedoTexture = new BABYLON.Texture(marbleBaseColor, scene);
        material.cullBackFaces = true;

        cylinder.material = material;

        return Promise.resolve(cylinder);
    }

    public static CreateTerrain(
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        size: number
    ) {
        const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
            "terrain",
            "https://playground.babylonjs.com/textures/heightMap.png",
            {
                width: size,
                height: size,
                subdivisions: 128,
                maxHeight: size / 5,
                onReady: () => ground!.updateCoordinateHeights(),
            },
            scene
        );

        const mat = new BABYLON.PBRMaterial("mat", scene);

        mat.metallicTexture = new BABYLON.Texture(rockRoughness, scene);
        mat.albedoTexture = new BABYLON.Texture(rockBaseColor, scene);
        mat.bumpTexture = new BABYLON.Texture(rockNormal, scene);
        mat.useRoughnessFromMetallicTextureGreen = true;
        mat.metallic = 0;
        mat.roughness = 1;

        ground.material = mat;

        shape.params.push(ground);

        return Promise.resolve(ground);
    }

    protected static _ParseSDFData(textData: string): SDFArray {
        const lines = textData.replace("\r", "").split("\n");

        const dimLine = lines[0].split(" ");

        const dimX = parseFloat(dimLine[0]);
        const dimY = parseFloat(dimLine[1]);
        const dimZ = parseFloat(dimLine[2]);

        const originLine = lines[1].split(" ");

        const origin = new BABYLON.Vector3(
            parseFloat(originLine[0]),
            parseFloat(originLine[1]),
            parseFloat(originLine[2])
        );

        const step = parseFloat(lines[2]);

        const data: number[] = [];

        for (let i = 3; i < lines.length; ++i) {
            const val = lines[i];
            if (val.length === 0) {
                continue;
            }
            data.push(parseFloat(val));
        }

        return {
            dimX,
            dimY,
            dimZ,
            origin,
            step,
            data,
        };
    }

    public static CreateMesh(
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        meshFilename: string,
        sdfFilename: string
    ): Promise<BABYLON.Mesh> {
        return new Promise((resolve) => {
            const promises = [
                BABYLON.SceneLoader.ImportMeshAsync(
                    "",
                    "assets/scenes/",
                    meshFilename,
                    scene
                ),
                new Promise((resolve) => {
                    fetch("assets/sdf/" + sdfFilename).then((response) => {
                        response.text().then((text) => {
                            shape.params.push(SDFHelper._ParseSDFData(text));
                            resolve(void 0);
                        });
                    });
                }),
            ];

            Promise.all(promises).then((results) => {
                const meshes = results[0] as BABYLON.ISceneLoaderAsyncResult;
                const mesh = meshes.meshes[0] as BABYLON.Mesh;
                if (!mesh.material) {
                    const material = new BABYLON.PBRMaterial(
                        "sphereMat",
                        scene
                    );

                    material.metallic = 1;
                    material.roughness = 0.05;
                    material.albedoTexture = new BABYLON.Texture(
                        rockBaseColor,
                        scene
                    );
                    material.cullBackFaces = true;

                    mesh.material = material;
                    mesh.createNormals(false);
                    mesh.scaling.setAll(shape.scale);
                }
                resolve(mesh);
            });
        });
    }

    // SD functions from https://iquilezles.org/articles/distfunctions/
    public static SDBox(p: BABYLON.Vector3, b: BABYLON.Vector3) {
        const q = BABYLON.TmpVectors.Vector3[0];
        q.copyFromFloats(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
        q.subtractInPlace(b);

        const tmp = Math.min(Math.max(q.x, q.y, q.z), 0);

        q.maximizeInPlaceFromFloats(0, 0, 0);

        return q.length() + tmp;
    }

    public static SDSphere(p: BABYLON.Vector3, s: number) {
        return p.length() - s;
    }

    public static SDPlane(p: BABYLON.Vector3, n: BABYLON.Vector3, h: number) {
        return BABYLON.Vector3.Dot(p, n) + h;
    }

    public static SDCutHollowSphere(
        p: BABYLON.Vector3,
        r: number,
        h: number,
        t: number
    ) {
        // sampling independent computations (only depend on shape)
        const w = Math.sqrt(r * r - h * h);

        // sampling dependant computations
        const qx = Math.sqrt(p.x * p.x + p.z * p.z);
        const qy = p.y;

        if (h * qx < w * qy) {
            return Math.sqrt((qx - w) * (qx - w) + (qy - h) * (qy - h));
        }

        return Math.abs(Math.sqrt(qx * qx + qy * qy) - r) - t;
    }

    public static SDVerticalCylinder(p: BABYLON.Vector3, r: number, h: number) {
        const dx = Math.abs(Math.sqrt(p.x * p.x + p.z * p.z)) - r;
        const dy = Math.abs(p.y) - h;
        const dx2 = Math.max(dx, 0);
        const dy2 = Math.max(dy, 0);

        return (
            Math.min(Math.max(dx, dy), 0.0) + Math.sqrt(dx2 * dx2 + dy2 * dy2)
        );
    }

    public static SDTerrain(
        p: BABYLON.Vector3,
        size: number,
        terrain: BABYLON.GroundMesh
    ) {
        return p.y - terrain.getHeightAtCoordinates(p.x, p.z);
    }

    public static SDMesh(
        p: BABYLON.Vector3,
        meshFilename: string,
        sdfFilename: string,
        sdf: SDFArray
    ) {
        const x = (p.x - sdf.origin.x) / sdf.step;
        const y = (p.y - sdf.origin.y) / sdf.step;
        const z = (p.z - sdf.origin.z) / sdf.step;

        let gx = Math.floor(x);
        let gy = Math.floor(y);
        let gz = Math.floor(z);

        gx = Math.max(Math.min(gx, sdf.dimX - 2), 0);
        gy = Math.max(Math.min(gy, sdf.dimY - 2), 0);
        gz = Math.max(Math.min(gz, sdf.dimZ - 2), 0);

        // trilinear filtering
        const fx = x - gx;
        const fy = y - gy;
        const fz = z - gz;

        const a00 = sdf.data[gz * sdf.dimY * sdf.dimX + gy * sdf.dimX + gx];
        const a10 = sdf.data[gz * sdf.dimY * sdf.dimX + gy * sdf.dimX + gx + 1];
        const a11 =
            sdf.data[gz * sdf.dimY * sdf.dimX + (gy + 1) * sdf.dimX + gx + 1];
        const a01 =
            sdf.data[gz * sdf.dimY * sdf.dimX + (gy + 1) * sdf.dimX + gx];

        const a0 = a00 * (1 - fx) + a10 * fx;
        const a1 = a01 * (1 - fx) + a11 * fx;
        const a = a0 * (1 - fy) + a1 * fy;

        const b00 =
            sdf.data[(gz + 1) * sdf.dimY * sdf.dimX + gy * sdf.dimX + gx];
        const b10 =
            sdf.data[(gz + 1) * sdf.dimY * sdf.dimX + gy * sdf.dimX + gx + 1];
        const b11 =
            sdf.data[
                (gz + 1) * sdf.dimY * sdf.dimX + (gy + 1) * sdf.dimX + gx + 1
            ];
        const b01 =
            sdf.data[(gz + 1) * sdf.dimY * sdf.dimX + (gy + 1) * sdf.dimX + gx];

        const b0 = b00 * (1 - fx) + b10 * fx;
        const b1 = b01 * (1 - fx) + b11 * fx;
        const b = b0 * (1 - fy) + b1 * fy;

        const d = a * (1 - fz) + b * fz;
        //const d = sdf.data[gz * sdf.dimY * sdf.dimX + gy * sdf.dimX + gx];

        return d;
    }

    // normal computed with the Tetrahedron technique, see https://iquilezles.org/articles/normalsSDF/
    public static ComputeSDFNormal(
        pos: BABYLON.Vector3,
        shape: ICollisionShape,
        normal: BABYLON.Vector3
    ) {
        const posTemp = BABYLON.TmpVectors.Vector3[5];
        const dir = BABYLON.TmpVectors.Vector3[6];

        normal.copyFromFloats(0, 0, 0);

        posTemp.copyFrom(pos);
        dir.copyFrom(dir1);
        normal.addInPlace(
            dir.scaleInPlace(
                shape.sdEvaluate(posTemp.addInPlace(eps1), ...shape.params)
            )
        );

        posTemp.copyFrom(pos);
        dir.copyFrom(dir2);
        normal.addInPlace(
            dir.scaleInPlace(
                shape.sdEvaluate(posTemp.addInPlace(eps2), ...shape.params)
            )
        );

        posTemp.copyFrom(pos);
        dir.copyFrom(dir3);
        normal.addInPlace(
            dir.scaleInPlace(
                shape.sdEvaluate(posTemp.addInPlace(eps3), ...shape.params)
            )
        );

        posTemp.copyFrom(pos);
        dir.copyFrom(dir4);
        normal.addInPlace(
            dir.scaleInPlace(
                shape.sdEvaluate(posTemp.addInPlace(eps4), ...shape.params)
            )
        );

        BABYLON.Vector3.TransformNormalToRef(normal, shape.transf, normal);

        normal.normalize();
    }

    public static ComputeTerrainNormal(
        pos: BABYLON.Vector3,
        shape: ICollisionShape,
        normal: BABYLON.Vector3
    ) {
        const terrain = shape.params[1] as BABYLON.GroundMesh;

        terrain.getNormalAtCoordinatesToRef(pos.x, pos.z, normal);
    }
}
