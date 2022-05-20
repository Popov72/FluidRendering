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
    ) => BABYLON.Mesh;
    transf: BABYLON.Matrix;
    invTransf: BABYLON.Matrix;
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

        const material = new BABYLON.PBRMaterial("collisionMeshMat", scene);

        material.metallic = 0;
        material.roughness = 0.9;
        material.albedoTexture = new BABYLON.Texture(
            "https://playground.babylonjs.com/textures/wood.jpg",
            scene
        );
        material.cullBackFaces = true;

        box.material = material;

        return box;
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

        const material = new BABYLON.PBRMaterial("collisionMeshMat", scene);

        material.metallic = 1;
        material.roughness = 0.05;
        material.albedoTexture = new BABYLON.Texture(marbleBaseColor, scene);
        material.cullBackFaces = true;

        sphere.material = material;

        return sphere;
    }

    public static CreateTerrain(
        scene: BABYLON.Scene,
        shape: ICollisionShape,
        size: number
    ) {
        const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
            "gdhm",
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

        return ground;
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

    public static SDTerrain(
        p: BABYLON.Vector3,
        size: number,
        terrain: BABYLON.GroundMesh
    ) {
        return p.y - terrain.getHeightAtCoordinates(p.x, p.z);
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
