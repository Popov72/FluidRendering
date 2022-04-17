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

export interface IFluidRenderingRenderObject {
    object: FluidRenderingObject;
    targetRenderer: FluidRenderingTargetRenderer;
}

export class FluidRenderer {
    /** @hidden */
    public static _SceneComponentInitialization: (scene: Scene) => void = (/*_*/) => {
        throw `FluidRendererSceneComponent needs to be imported before as it contains a side-effect required by your code.`;        
    };

    private _scene: BABYLON.Scene;
    private _engine: BABYLON.Engine;
    private _onEngineResizeObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Engine>>;
    private _renderObjects: Array<IFluidRenderingRenderObject>;
    private _targetRenderers: FluidRenderingTargetRenderer[];

    public get renderObjects() {
        return this._renderObjects;
    }

    public get targetRenderers() {
        return this._targetRenderers;
    }

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._onEngineResizeObserver = null;
        this._renderObjects = [];
        this._targetRenderers = [];

        FluidRenderer._SceneComponentInitialization(this._scene);

        this._onEngineResizeObserver = this._engine.onResizeObservable.add(() => {
            this._initialize();
        });

        this.collectParticleSystems();
    }

    public recreate(): void {
        this._sortRenderingObjects();
        this._initialize();
    }

    public getRenderObjectFromParticleSystem(ps: BABYLON.ParticleSystem): BABYLON.Nullable<IFluidRenderingRenderObject> {
        const index = this._getParticleSystemIndex(ps);
        return index !== -1 ? this._renderObjects[index] : null;
    }

    public getRenderObjectFromVertexBuffer(vb: BABYLON.VertexBuffer): BABYLON.Nullable<IFluidRenderingRenderObject> {
        const index = this._getVertexBufferIndex(vb);
        return index !== -1 ? this._renderObjects[index] : null;
    }

    public addParticleSystem(ps: BABYLON.ParticleSystem, generateDiffuseTexture?: boolean, targetRenderer?: FluidRenderingTargetRenderer, camera?: BABYLON.Camera): IFluidRenderingRenderObject {
        const object = new FluidRenderingObjectParticleSystem(this._scene, ps);

        object.onParticleSizeChanged.add(this._setParticleSizeForRenderTargets.bind(this));

        if (!targetRenderer) {
            targetRenderer = new FluidRenderingTargetRenderer(this._scene, camera);
            this._targetRenderers.push(targetRenderer);
        }

        if (generateDiffuseTexture !== undefined) {
            targetRenderer.generateDiffuseTexture = generateDiffuseTexture;
        }

        const renderObject = { object, targetRenderer };

        this._renderObjects.push(renderObject);

        this._sortRenderingObjects();

        this._setParticleSizeForRenderTargets();

        return renderObject;
    }

    public addVertexBuffer(vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, numParticles: number, generateDiffuseTexture?: boolean, targetRenderer?: FluidRenderingTargetRenderer, camera?: BABYLON.Camera): IFluidRenderingRenderObject {
        const object = new FluidRenderingObjectVertexBuffer(this._scene, vertexBuffers, numParticles);

        object.onParticleSizeChanged.add(this._setParticleSizeForRenderTargets.bind(this));

        if (!targetRenderer) {
            targetRenderer = new FluidRenderingTargetRenderer(this._scene, camera);
            this._targetRenderers.push(targetRenderer);
        }

        if (generateDiffuseTexture !== undefined) {
            targetRenderer.generateDiffuseTexture = generateDiffuseTexture;
        }

        const renderObject = { object, targetRenderer };

        this._renderObjects.push(renderObject);

        this._sortRenderingObjects();

        this._setParticleSizeForRenderTargets();

        return renderObject;
    }

    public removeRenderObject(renderObject: IFluidRenderingRenderObject): boolean {
        const index = this._renderObjects.indexOf(renderObject);
        if (index === -1) {
            return false;
        }

        renderObject.object.dispose();

        this._renderObjects.splice(index, 1);

        if (this._removeUnusedTargetRenderers()) {
            this._initialize();
        } else {
            this._setParticleSizeForRenderTargets();
        }

        return true;
    }

    private _sortRenderingObjects(): void {
        this._renderObjects.sort((a, b) => {
            return a.object.priority < b.object.priority ? -1 : a.object.priority > b.object.priority ? 1 : 0;
        });
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
                this._renderObjects[index].object.dispose();
                this._renderObjects.splice(index, 1);
            }
        }
        this._removeUnusedTargetRenderers();
        this._initialize();
    }

    private _removeUnusedTargetRenderers(): boolean {
        const indexes: { [id: number]: boolean } = {};

        for (let i = 0; i < this._renderObjects.length; ++i) {
            const targetRenderer = this._renderObjects[i].targetRenderer;
            indexes[this._targetRenderers.indexOf(targetRenderer)] = true;
        }

        let removed = false;
        const newList: Array<FluidRenderingTargetRenderer> = [];
        for (let i = 0; i < this._targetRenderers.length; ++i) {
            if (!indexes[i]) {
                this._targetRenderers[i].dispose();
                removed = true;
            } else {
                newList.push(this._targetRenderers[i]);
            }
        }

        if (removed) {
            this._targetRenderers.length = 0;
            this._targetRenderers.push(...newList);
        }

        return removed;
    }

    private static _IsParticleSystemObject(obj: FluidRenderingObject): obj is FluidRenderingObjectParticleSystem {
        return !!(obj as FluidRenderingObjectParticleSystem).particleSystem;
    }

    private static _IsVertexBufferObject(obj: FluidRenderingObject): obj is FluidRenderingObjectVertexBuffer {
        return (obj as FluidRenderingObjectVertexBuffer).getClassName() === "FluidRenderingObjectVertexBuffer";
    }

    private _getParticleSystemIndex(ps: BABYLON.IParticleSystem): number {
        for (let i = 0; i < this._renderObjects.length; ++i) {
            const obj = this._renderObjects[i].object;
            if (FluidRenderer._IsParticleSystemObject(obj) && obj.particleSystem === ps) {
                return i;
            }
        }

        return -1;
    }

    private _getVertexBufferIndex(vb: BABYLON.VertexBuffer): number {
        for (let i = 0; i < this._renderObjects.length; ++i) {
            const obj = this._renderObjects[i].object;
            if (FluidRenderer._IsVertexBufferObject(obj) && obj.vertexBuffers[BABYLON.VertexBuffer.PositionKind] === vb) {
                return i;
            }
        }

        return -1;
    }

    private _initialize(): void {
        for (let i = 0; i < this._targetRenderers.length; ++i) {
            this._targetRenderers[i].dispose();
        }

        const cameras = new Map<BABYLON.Camera, Array<FluidRenderingTargetRenderer>>();
        for (let i = 0; i < this._targetRenderers.length; ++i) {
            const targetRenderer = this._targetRenderers[i];

            targetRenderer.initialize();

            if (targetRenderer.camera && targetRenderer.renderPostProcess) {
                let list = cameras.get(targetRenderer.camera);
                if (!list) {
                    list = [];
                    cameras.set(targetRenderer.camera, list);
                }
                list.push(targetRenderer);
                targetRenderer.camera.attachPostProcess(targetRenderer.renderPostProcess, i);
            }
        }

        for (const [camera, list] of cameras) {
            const firstPostProcess = camera._getFirstPostProcess();
            if (firstPostProcess) {
                firstPostProcess.onSizeChangedObservable.add(() => {
                    if (!firstPostProcess.inputTexture.depthStencilTexture) {
                        firstPostProcess.inputTexture.createDepthStencilTexture(0, true, this._engine.isStencilEnable, 1);
                    }
                    for (const targetRenderer of list) {
                        if (targetRenderer.thicknessRenderTarget?.renderTarget) {
                            firstPostProcess.inputTexture._shareDepth(targetRenderer.thicknessRenderTarget.renderTarget);
                        }
                    }
                });
            }
        }

        this._setParticleSizeForRenderTargets();
    }

    private _setParticleSizeForRenderTargets(): void {
        const particleSizes = new Map<FluidRenderingTargetRenderer, number>();

        for (let i = 0; i < this._renderObjects.length; ++i) {
            const renderingObject = this._renderObjects[i];
            let curSize = particleSizes.get(renderingObject.targetRenderer);
            if (curSize === undefined) {
                curSize = 0;
            }
            particleSizes.set(renderingObject.targetRenderer, Math.max(curSize, renderingObject.object.particleSize));
        }

        for (const [targetRenderer, particuleSize] of particleSizes) {
            if (targetRenderer.depthRenderTarget) {
                targetRenderer.depthRenderTarget.particuleSize = particuleSize;
            }
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
        for (let i = 0; i < this._targetRenderers.length; ++i) {
            this._targetRenderers[i].clearTargets();
        }

        for (let i = 0; i < this._renderObjects.length; ++i) {
            const renderingObject = this._renderObjects[i];
            renderingObject.targetRenderer.render(renderingObject.object);
        }
    }

    public dispose(): void {
        this._engine.onResizeObservable.remove(this._onEngineResizeObserver);
        this._onEngineResizeObserver = null;

        for (let i = 0; i < this._renderObjects.length; ++i) {
            this._renderObjects[i].object.dispose();
        }

        for (let i = 0; i < this._targetRenderers.length; ++i) {
            this._targetRenderers[i].dispose();
        }

        this._renderObjects = [];
        this._targetRenderers = [];
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
