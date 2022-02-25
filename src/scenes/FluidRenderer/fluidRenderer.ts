import * as BABYLON from "@babylonjs/core";

import { Scene } from "@babylonjs/core/scene";
import { FluidRenderingObject } from "./fluidRenderingObject";

import particleDepthVertex from "../../assets/particleDepth.vertex.glsl";
import particleDepthFragment from "../../assets/particleDepth.fragment.glsl";

import particleThicknessVertex from "../../assets/particleThickness.vertex.glsl";
import particleThicknessFragment from "../../assets/particleThickness.fragment.glsl";

import bilateralBlurFragment from "../../assets/bilateralBlur.fragment.glsl";
import standardBlurFragment from "../../assets/standardBlur.fragment.glsl";

import renderFluidFragment from "../../assets/renderFluid.fragment.glsl";

import { FluidRenderingObjectParticleSystem } from "./fluidRenderingObjectParticleSystem";
import { FluidRenderingOutput } from "./fluidRenderingOutput";
import { FluidRenderingObjectVertexBuffer } from "./fluidRenderingObjectVertexBuffer";

export interface IFluidRenderingEntity {
    object: FluidRenderingObject;
    output: FluidRenderingOutput;
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
    private _outputs: FluidRenderingOutput[];

    constructor(scene: BABYLON.Scene) {
        this._scene = scene;
        this._engine = scene.getEngine();
        this._onEngineResizeObserver = null as any;
        this._renderingObjects = [];
        this._outputs = [];

        FluidRenderer._SceneComponentInitialization(this._scene);

        this.collectParticleSystems();
    }

    public getRenderingObjectParticleSystem(ps: BABYLON.IParticleSystem): BABYLON.Nullable<FluidRenderingObjectParticleSystem> {
        const index = this._getParticleSystemIndex(ps);
        return index !== -1 ? this._renderingObjects[index].object as FluidRenderingObjectParticleSystem : null;
    }

    public addParticleSystem(ps: BABYLON.IParticleSystem): IFluidRenderingEntity {
        const renderingObject = new FluidRenderingObjectParticleSystem(this._scene, ps);
        const output = new FluidRenderingOutput(this._scene);

        output.generateDiffuseTexture = true;

        const entity = { object: renderingObject, output };

        this._renderingObjects.push(entity);
        this._outputs.push(output);

        this._onEngineResizeObserver = this._engine.onResizeObservable.add(() => {
            this._initialize();
        });

        this._sortRenderingObjects();

        return entity;
    }

    public addVertexBuffer(vertexBuffers: { [key: string]: BABYLON.VertexBuffer }, numParticles: number): IFluidRenderingEntity {
        const renderingObject = new FluidRenderingObjectVertexBuffer(this._scene, vertexBuffers, numParticles);
        const output = new FluidRenderingOutput(this._scene);

        output.generateDiffuseTexture = false;

        const entity = { object: renderingObject, output };

        this._renderingObjects.push(entity);
        this._outputs.push(output);

        this._onEngineResizeObserver = this._engine.onResizeObservable.add(() => {
            this._initialize();
        });

        this._sortRenderingObjects();

        return entity;
    }

    private _sortRenderingObjects(): void {
        this._renderingObjects.sort((a, b) => {
            return a.object.priority < b.object.priority ? -1 : a.object.priority > b.object.priority ? 1 : 0;
        });

        for (let i = 0; i < this._outputs.length; ++i) {
            const output = this._outputs[i];
            output.isFirstOutput = i === 0;//this._outputs.length - 1;
        }
    }

    public collectParticleSystems(): void {
        for (let i = 0; i < this._scene.particleSystems.length; ++i) {
            const ps = this._scene.particleSystems[i];
            const index = this._getParticleSystemIndex(ps);
            if (index === -1) {
                if (ps.renderAsFluid) {
                    this.addParticleSystem(ps);
                }
            } else if (!ps.renderAsFluid) {
                const renderingObject = this._renderingObjects[index];
                renderingObject.object.dispose();
                renderingObject.output.dispose();
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
            this._renderingObjects[i].output.initialize();
        }
    }

    /** @hidden */
    public _prepareRendering(): void {
        for (let i = 0; i < this._outputs.length; ++i) {
            this._outputs[i]._prepareRendering();
        }
    }

    /** @hidden */
    public _render(): void {
        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const renderingObject = this._renderingObjects[i];
            renderingObject.output.render(renderingObject.object);
        }
    }

    public dispose(): void {
        this._engine.onResizeObservable.remove(this._onEngineResizeObserver);
        this._onEngineResizeObserver = null;

        for (let i = 0; i < this._renderingObjects.length; ++i) {
            const renderingObject = this._renderingObjects[i];
            renderingObject.object.dispose();
            renderingObject.output.dispose();
        }

        this._renderingObjects = [];
    }
}

BABYLON.Effect.ShadersStore["fluidParticleDepthVertexShader"] = particleDepthVertex;
BABYLON.Effect.ShadersStore["fluidParticleDepthFragmentShader"] = particleDepthFragment;

BABYLON.Effect.ShadersStore["fluidParticleThicknessVertexShader"] = particleThicknessVertex;
BABYLON.Effect.ShadersStore["fluidParticleThicknessFragmentShader"] = particleThicknessFragment;

BABYLON.Effect.ShadersStore["bilateralBlurFragmentShader"] = bilateralBlurFragment;

BABYLON.Effect.ShadersStore["standardBlurFragmentShader"] = standardBlurFragment;

BABYLON.Effect.ShadersStore["renderFluidFragmentShader"] = renderFluidFragment;
