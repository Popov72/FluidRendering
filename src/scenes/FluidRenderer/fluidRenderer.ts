import * as BABYLON from "@babylonjs/core";

import { Scene } from "@babylonjs/core/scene";
import { FluidRenderingObject } from "./fluidRenderingObject";

import particleDepthVertex from "../../assets/particleDepth.vertex.glsl";
import particleDepthFragment from "../../assets/particleDepth.fragment.glsl";

import particleThicknessVertex from "../../assets/particleThickness.vertex.glsl";
import particleThicknessFragment from "../../assets/particleThickness.fragment.glsl";

import particleDiffuseVertex from "../../assets/particleDiffuse.vertex.glsl";
import particleDiffuseFragment from "../../assets/particleDiffuse.fragment.glsl";

import bilateralBlurFragment from "../../assets/bilateralBlur.fragment.glsl";
import standardBlurFragment from "../../assets/standardBlur.fragment.glsl";

import renderFluidFragment from "../../assets/renderFluid.fragment.glsl";

import { FluidRenderingObjectParticleSystem } from "./fluidRenderingObjectParticleSystem";
import { FluidRenderingTargetRenderer } from "./fluidRenderingTargetRenderer";
import { FluidRenderingObjectVertexBuffer } from "./fluidRenderingObjectVertexBuffer";

export interface IFluidRenderingEntity {
    object: FluidRenderingObject;
    targetRenderer: FluidRenderingTargetRenderer;
}

export class FluidRenderer {
    /** @hidden */
    public static _SceneComponentInitialization: (scene: Scene) => void = (_) => {
        throw `FluidRendererSceneComponent needs to be imported before as it contains a side-effect required by your code.`;        
    };

    private _scene: BABYLON.Scene;
    private _engine: BABYLON.Engine;
    private _onEngineResizeObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Engine>>;
    private _renderingObjects: Array<IFluidRenderingEntity>;
    private _targetRenderers: FluidRenderingTargetRenderer[];

    public get renderingObjects() {
        return this._renderingObjects;
    }

    public get targetRenderers() {
        return this._targetRenderers;
    }

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._onEngineResizeObserver = null;
        this._renderingObjects = [];
        this._targetRenderers = [];

        FluidRenderer._SceneComponentInitialization(this._scene);

        this._onEngineResizeObserver = this._engine.onResizeObservable.add(() => {
            this._initialize();
        });

        this.collectParticleSystems();
    }

    public getRenderingObjectParticleSystem(ps: BABYLON.ParticleSystem): BABYLON.Nullable<FluidRenderingObjectParticleSystem> {
        const index = this._getParticleSystemIndex(ps);
        return index !== -1 ? this._renderingObjects[index].object as FluidRenderingObjectParticleSystem : null;
    }

    public addParticleSystem(ps: BABYLON.ParticleSystem, generateDiffuseTexture?: boolean, targetRenderer?: FluidRenderingTargetRenderer): IFluidRenderingEntity {
        const renderingObject = new FluidRenderingObjectParticleSystem(this._scene, ps);

        if (!targetRenderer) {
            targetRenderer = new FluidRenderingTargetRenderer(this._scene);
            this._targetRenderers.push(targetRenderer);
        }

        if (generateDiffuseTexture !== undefined) {
            targetRenderer.generateDiffuseTexture = generateDiffuseTexture;
        }

        const entity = { object: renderingObject, targetRenderer };

        this._renderingObjects.push(entity);

        this._sortRenderingObjects();

        return entity;
    }

    public addVertexBuffer(vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, numParticles: number, generateDiffuseTexture?: boolean, targetRenderer?: FluidRenderingTargetRenderer): IFluidRenderingEntity {
        const renderingObject = new FluidRenderingObjectVertexBuffer(this._scene, vertexBuffers, numParticles);

        if (!targetRenderer) {
            targetRenderer = new FluidRenderingTargetRenderer(this._scene);
            this._targetRenderers.push(targetRenderer);
        }

        if (generateDiffuseTexture !== undefined) {
            targetRenderer.generateDiffuseTexture = generateDiffuseTexture;
        }

        const entity = { object: renderingObject, targetRenderer };

        this._renderingObjects.push(entity);

        this._sortRenderingObjects();

        return entity;
    }

    private _sortRenderingObjects(): void {
        this._renderingObjects.sort((a, b) => {
            return a.object.priority < b.object.priority ? -1 : a.object.priority > b.object.priority ? 1 : 0;
        });

        for (let i = 0; i < this._targetRenderers.length; ++i) {
            const targetRenderer = this._targetRenderers[i];
            targetRenderer.positionOrder = i;
            targetRenderer.needPostProcessChaining = i === this._targetRenderers.length - 1;
        }
    }

    public collectParticleSystems(): void {
        for (let i = 0; i < this._scene.particleSystems.length; ++i) {
            const ps = this._scene.particleSystems[i];
            const index = this._getParticleSystemIndex(ps);
            if (index === -1) {
                if (ps.renderAsFluid && ps.getClassName() === "ParticleSystem") {
                    this.addParticleSystem(ps as BABYLON.ParticleSystem, true);
                }
            } else if (!ps.renderAsFluid) {
                const renderingObject = this._renderingObjects[index];
                renderingObject.object.dispose();
                renderingObject.targetRenderer.dispose();
                this._renderingObjects.splice(index, 1);
            }
        }
    }

    private static _IsParticleSystemObject(obj: FluidRenderingObject): obj is FluidRenderingObjectParticleSystem {
        return !!(obj as FluidRenderingObjectParticleSystem).particleSystem;
    }
    
    private _getParticleSystemIndex(ps: BABYLON.IParticleSystem): number {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const obj = this._renderingObjects[i].object;
            if (FluidRenderer._IsParticleSystemObject(obj) && obj.particleSystem === ps) {
                return i;
            }
        }

        return -1;
    }

    private _initialize(): void {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            this._renderingObjects[i].targetRenderer.initialize();
        }
    }

    /** @hidden */
    public _prepareRendering(): void {
        let needInitialization = false;
        for (let i = 0; i < this._targetRenderers.length; ++i) {
            needInitialization = needInitialization || this._targetRenderers[i].needInitialization;
        }
        if (needInitialization) {
            this._initialize();
        }
    }

    /** @hidden */
    public _render(): void {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const renderingObject = this._renderingObjects[i];
            renderingObject.targetRenderer.render(renderingObject.object);
        }
    }

    public dispose(): void {
        this._engine.onResizeObservable.remove(this._onEngineResizeObserver);
        this._onEngineResizeObserver = null;

        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const renderingObject = this._renderingObjects[i];
            renderingObject.object.dispose();
            renderingObject.targetRenderer.dispose();
        }

        this._renderingObjects = [];
    }
}

BABYLON.Effect.ShadersStore["fluidParticleDepthVertexShader"] = particleDepthVertex;
BABYLON.Effect.ShadersStore["fluidParticleDepthFragmentShader"] = particleDepthFragment;

BABYLON.Effect.ShadersStore["fluidParticleThicknessVertexShader"] = particleThicknessVertex;
BABYLON.Effect.ShadersStore["fluidParticleThicknessFragmentShader"] = particleThicknessFragment;

BABYLON.Effect.ShadersStore["fluidParticleDiffuseVertexShader"] = particleDiffuseVertex;
BABYLON.Effect.ShadersStore["fluidParticleDiffuseFragmentShader"] = particleDiffuseFragment;

BABYLON.Effect.ShadersStore["bilateralBlurFragmentShader"] = bilateralBlurFragment;

BABYLON.Effect.ShadersStore["standardBlurFragmentShader"] = standardBlurFragment;

BABYLON.Effect.ShadersStore["renderFluidFragmentShader"] = renderFluidFragment;
